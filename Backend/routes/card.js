// routes/card.js - COMPLETE APPROACH A (All-in-one with Cloudinary)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createCanvas, loadImage, registerFont } = require('canvas');
const cloudinary = require('cloudinary').v2;
const Student = require('../models/Student');
const Template = require('../models/Template');
const School = require('../models/School');
const authMiddleware = require('../middleware/authMiddleware');
const archiver = require('archiver');

//Progress tracking store (in-memory, for production use Redis)
const progressStore = new Map();

// Import utilities
const { parseCSVFromBuffer } = require('../utilis/csvParser');
const { extractAndUploadPhotosToCloudinary, uploadToCloudinaryWithRetry } = require('../utilis/cloudinaryUpload');

const { loadImageFromUrl } = require('../utilis/imageLoader');

// Configure Cloudinary (use same config as templates.js)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  timeout: 300000 // 30 seconds timeout
});


// Multer memory storage (NO DISK STORAGE)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB for large ZIP files
  }
});

// ==================== FONT REGISTRATION ====================
// ==================== FONT REGISTRATION ====================
const fontPath = require.resolve('@canvas-fonts/arial');

try {
  registerFont(fontPath, { family: 'Arial' });
  registerFont(fontPath, { family: 'Arial', weight: 'bold' });
  console.log('✅ Arial font registered successfully');
} catch (error) {
  console.warn('⚠️ Could not register Arial font:', error.message);
}
// ==================== FONT REGISTRATION ====================


// ✅ 1. SINGLE CARD GENERATION

router.post('/generate-single-card', upload.none(), async (req, res) => {
  try {
    console.log('🎯 Starting single card generation...');
    console.log('📦 Request body:', req.body);

    const { studentId, templateId, coordinates } = req.body;

    // Input validation
    if (!studentId || !templateId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID and Template ID are required'
      });
    }

    // Parse coordinates
    let parsedCoordinates = {};
    try {
      parsedCoordinates = coordinates ? JSON.parse(coordinates) : {};
    } catch (parseError) {
      console.warn('⚠️ Could not parse coordinates:', parseError.message);
    }

    // Get template and student
    const template = await Template.findById(templateId);
    const student = await Student.findById(studentId);

    if (!template) throw new Error('Template not found');
    if (!student) throw new Error('Student not found');

    console.log(`🖼️ Generating card for: ${student.name}`);

    // Use student's Cloudinary photo
    const studentPhotoUrl = student.photo_url;

    // Generate card
    const { frontBuffer, backBuffer } = await generateCardsWithCloudinary(
      student,
      template,
      parsedCoordinates,
      studentPhotoUrl
    );

    // Create ZIP
    const zipBuffer = await createZipInMemory([
      { name: `${student.student_id}/front-side.png`, buffer: frontBuffer },
      { name: `${student.student_id}/back-side.png`, buffer: backBuffer }
    ]);

    // Update student tracking
    student.card_generated = true;
    student.card_generation_count = (student.card_generation_count || 0) + 1;
    student.last_card_generated = new Date();
    if (!student.first_card_generated) {
      student.first_card_generated = new Date();
    }
    await student.save();

    // Send response
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${student.student_id}-id-card.zip"`,
      'Content-Length': zipBuffer.length
    });

    res.send(zipBuffer);
    console.log(`📥 Card sent for ${student.name}`);

  } catch (error) {
    console.error('❌ Single card generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ✅ 10. BATCH PROGRESS TRACKING ENDPOINT
router.get('/batch-progress/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const progress = progressStore.get(batchId);

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Batch progress not found'
      });
    }

    res.json({
      success: true,
      progress
    });

  } catch (error) {
    console.error('❌ Progress tracking error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 2. BATCH PROCESSING - COMPLETE APPROACH A
router.post('/process-csv-generate', upload.fields([
  { name: 'csv', maxCount: 1 },
  { name: 'photoZip', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('🚀 Starting Approach A - All-in-one batch processing with Cloudinary...');

    // ==================== VALIDATION ====================
    if (!req.files || !req.files.csv) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is required'
      });
    }

    if (!req.body.templateId) {
      return res.status(400).json({
        success: false,
        error: 'Template ID is required'
      });
    }


    //Generate batch Id
    batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;



    console.log('📁 Files received:', {
      csvSize: `${(req.files.csv[0].size / 1024).toFixed(2)} KB`,
      hasPhotoZip: !!req.files.photoZip,
      templateId: req.body.templateId
    });


    //Initialize progress tracking
    progressStore.set(batchId, {
      batchId,
      status: 'starting',
      processed: 0,
      generated: 0,
      failed: 0,
      total: 0,
      currentStudent: null,
      percentage: 0,
      startTime: new Date()
    });

    // ==================== PARSE CSV ====================
    console.log('📊 Parsing CSV from buffer...');
    // Parse CSV
    const students = await parseCSVFromBuffer(req.files.csv[0].buffer);

    // Add schoolId to each student
    const studentsWithSchool = students.map(student => ({
      ...student,
      schoolId: req.user.schoolId // Add schoolId from auth
    }));
    console.log(`✅ Parsed ${studentsWithSchool.length} students from CSV`);

    // ===================== UPDATE PROGRESS =====================
    const progress = progressStore.get(batchId);
    progress.status = 'parsing_csv';
    progress.total = studentsWithSchool.length;
    progressStore.set(batchId, progress);

    // ==================== EXTRACT & UPLOAD PHOTOS TO CLOUDINARY ====================
    let photoCloudinaryMap = {}; // student_id -> { url, public_id, metadata }

    if (req.files.photoZip && req.files.photoZip[0]) {
      console.log('📦 Extracting photos from ZIP and uploading to Cloudinary...');
      photoCloudinaryMap = await extractAndUploadPhotosToCloudinary(req.files.photoZip[0].buffer);
      console.log(`✅ Uploaded ${Object.keys(photoCloudinaryMap).length} photos to Cloudinary`);
    }

    // ==================== SAVE STUDENTS WITH CLOUDINARY DATA ====================
    console.log('💾 Saving/updating students in database...');
    const savedStudents = [];

    for (const studentData of studentsWithSchool) {
      try {
        const existingStudent = await Student.findOne({ student_id: studentData.student_id });
        const cloudinaryPhoto = photoCloudinaryMap[studentData.student_id];

        if (existingStudent) {
          // Update existing student
          Object.assign(existingStudent, studentData);

          // Update Cloudinary photo if available
          if (cloudinaryPhoto) {
            existingStudent.photo_url = cloudinaryPhoto.secure_url;
            existingStudent.photo_public_id = cloudinaryPhoto.public_id;
            existingStudent.photo_metadata = {
              width: cloudinaryPhoto.width,
              height: cloudinaryPhoto.height,
              format: cloudinaryPhoto.format,
              bytes: cloudinaryPhoto.bytes
            };
            existingStudent.has_photo = true;
            existingStudent.photo_uploaded_at = new Date();
          }

          await existingStudent.save();
          savedStudents.push(existingStudent);

          console.log(`✅ Updated student: ${studentData.name} ${cloudinaryPhoto ? '(+photo)' : ''}`);
        } else {
          // Create new student with Cloudinary data
          const student = new Student({
            ...studentData,
            photo_url: cloudinaryPhoto ? cloudinaryPhoto.secure_url : null,
            photo_public_id: cloudinaryPhoto ? cloudinaryPhoto.public_id : null,
            photo_metadata: cloudinaryPhoto ? {
              width: cloudinaryPhoto.width,
              height: cloudinaryPhoto.height,
              format: cloudinaryPhoto.format,
              bytes: cloudinaryPhoto.bytes
            } : null,
            has_photo: !!cloudinaryPhoto,
            photo_uploaded_at: cloudinaryPhoto ? new Date() : null
          });

          await student.save();
          savedStudents.push(student);

          console.log(`✅ Created student: ${studentData.name} ${cloudinaryPhoto ? '(+photo)' : ''}`);
        }
      } catch (error) {
        console.error(`❌ Failed to save student ${studentData.student_id}:`, error.message);
      }
    }

    console.log(`✅ Total students saved: ${savedStudents.length}`);

    // ==================== GET TEMPLATE ====================
    const template = await Template.findById(req.body.templateId);
    if (!template) {

      progressStore.delete(batchId);
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    console.log(`🎨 Using template: ${template.name}`);

    // ==================== PARSE COORDINATES ====================
    const coordinates = req.body.coordinates ? JSON.parse(req.body.coordinates) : {};

    // ==================== GENERATE CARDS ====================
    console.log('🎨 Generating ID cards...');

    //Update Progress status
    progress.status = 'generating_cards';
    progress.percentage = 0;
    progressStore.set(batchId, progress);

    // Set response headers for ZIP stream
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="batch-id-cards-${Date.now()}.zip"`
    });

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    let generatedCount = 0;
    const totalStudents = savedStudents.length;

    // Generate and stream each card
    for (let i = 0; i < savedStudents.length; i++) {
      const student = savedStudents[i];

      try {
        //update progress for crrent student

        progress.currentStudent = {
          name: student.name,
          id: student.student_id,
          index: i + 1,
          total: totalStudents
        };
        progress.percentage = Math.round(((i + 1) / totalStudents) * 100)
        progressStore.set(batchId, progress);

        console.log(`🔄 Generating card ${i + 1}/${totalStudents}: ${student.name}`);


        // Use student's Cloudinary photo URL
        const studentPhotoUrl = student.photo_url;

        const { frontBuffer, backBuffer } = await generateCardsWithCloudinary(
          student,
          template,
          coordinates,
          studentPhotoUrl // Pass Cloudinary URL
        );

        // Add to ZIP stream
        archive.append(frontBuffer, { name: `${student.student_id}/front-side.png` });
        archive.append(backBuffer, { name: `${student.student_id}/back-side.png` });

        // Update student card generation stats
        student.card_generated = true;
        student.card_generation_count = (student.card_generation_count || 0) + 1;
        student.last_card_generated = new Date();
        if (!student.first_card_generated) {
          student.first_card_generated = new Date();
        }

        await student.save();

        generatedCount++;
        // =================== UPDATE PROGRESS ===================
        progress.processed = i + 1;
        progress.generated = generatedCount;
        progress.percentage = Math.round(((i + 1) / totalStudents) * 100);

        progressStore.set(batchId, progress);
        console.log(`✅ Generated card for ${student.name} (${progress.percentage}%)`);

      } catch (error) {
        console.error(`❌ Card generation failed for ${student.name}:`, error.message);
        progress.failed++;
        progressStore.set(batchId, progress);
      }
    }

    // ==========  Finalize ZIP ============ 
    progress.status = 'finalizing';
    progressStore.percentage = 100;
    progress.endTime = new Date();
    progress.duration = (progress.endTime - progress.startTime) / 1000; // in seconds

    progressStore.set(batchId, progress);
    archive.finalize();

    //SCHEDULE cleanup of progress data(5 minutes)
    setTimeout(() => {
      if (progressStore.has(batchId)) {
        progressStore.delete(batchId);
        console.log(`🧹 Cleaned up progress data for batch: ${batchId}`);
      }
    }, 5 * 60 * 1000);

    console.log(`📥 Streaming ${generatedCount} cards to download`);
    console.log('✅ Approach A - Batch processing completed successfully!');
  } catch (error) {
    console.error('❌ Batch processing error:', error);
    // Clean up progress on error
    if (batchId && progressStore.has(batchId)) {
      const progress = progressStore.get(batchId);
      progress.status = 'error';
      progress.error = error.message;
      progressStore.set(batchId, progress);

      // Clean up after 2 minutes on error
      setTimeout(() => {
        if (progressStore.has(batchId)) {
          progressStore.delete(batchId);
        }
      }, 2 * 60 * 1000);
    }

    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


// ✅ 3. GET CARD HISTORY - ADD SCHOOL FILTERING
router.get('/history', authMiddleware, async (req, res) => {
  try {
    console.log('📊 Getting card history...');
    console.log('👤 User role:', req.userRole);
    console.log('🏫 School ID from middleware:', req.schoolId);

    const matchQuery = {};

    // For admin, use the schoolId from middleware (already extracted)
    if (req.userRole === 'admin') {
      matchQuery.schoolId = req.schoolId;  // ✅ Use the pre-extracted ID
      console.log('🔍 Using schoolId for query:', matchQuery.schoolId);
    }

    // For super_admin, allow filtering by schoolId from query
    if (req.userRole === 'super_admin' && req.query.schoolId) {
      matchQuery.schoolId = req.query.schoolId;
    }

    console.log('🔍 Final match query:', matchQuery);

    const stats = await Student.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalStudentsWithCards: { $sum: 1 },
          totalCardsGenerated: { $sum: '$card_generation_count' },
          averageCardsPerStudent: { $avg: '$card_generation_count' },
          maxCardsGenerated: { $max: '$card_generation_count' }
        }
      }
    ]);

    console.log('📊 Aggregation result:', stats);

    const result = stats[0] || {
      totalStudentsWithCards: 0,
      totalCardsGenerated: 0,
      averageCardsPerStudent: 0,
      maxCardsGenerated: 0
    };

    res.json({
      success: true,
      statistics: {
        totalCards: result.totalCardsGenerated,
        totalStudents: result.totalStudentsWithCards,
        averageCardsPerStudent: Math.round(result.averageCardsPerStudent * 100) / 100,
        maxCardsByStudent: result.maxCardsGenerated,
        status: 'fulfilled'
      },
      summary: `Total ${result.totalCardsGenerated} cards generated by ${result.totalStudentsWithCards} students`
    });

  } catch (error) {
    console.error('❌ Card history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 4. GET STUDENT CARD HISTORY
router.get('/history/student/:studentId', authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId)
      .select('student_id name class level card_generation_count last_card_generated first_card_generated createdAt schoolId');

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Check if admin has access to this student
    if (req.user.role === 'admin' && student.schoolId?.toString() !== req.user.schoolId?.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({
      success: true,
      student: {
        _id: student._id,
        student_id: student.student_id,
        name: student.name,
        class: student.class,
        level: student.level,
        card_generation_count: student.card_generation_count,
        last_card_generated: student.last_card_generated,
        first_card_generated: student.first_card_generated,
        student_since: student.createdAt
      },
      statistics: {
        hasGeneratedCards: student.card_generated,
        totalCards: student.card_generation_count,
        lastGeneration: student.last_card_generated,
        firstGeneration: student.first_card_generated
      }
    });

  } catch (error) {
    console.error('❌ Student card history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});



// ✅ 6. GET ALL STUDENTS FOR DROPDOWN - ADD SCHOOL FILTERING
router.get('/students', authMiddleware, async (req, res) => {
  try {
    const query = {};

    // If admin, only show their school's students
    if (req.user.role === 'admin') {
      query.schoolId = req.user.schoolId;
    }

    // If super_admin, allow filtering by schoolId
    if (req.user.role === 'super_admin' && req.query.schoolId) {
      query.schoolId = req.query.schoolId;
    }

    const students = await Student.find(query).sort({ name: 1 });

    res.json({
      success: true,
      students: students
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ✅ 7. GET STUDENT PHOTO - ADD SCHOOL CHECK
router.get('/student-photo/:studentId', authMiddleware, async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if admin has access to this student
    if (req.user.role === 'admin' && student.schoolId?.toString() !== req.user.schoolId?.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!student.photo_url) {
      return res.status(404).json({ error: 'Student photo not found' });
    }

    // Redirect to Cloudinary URL
    res.redirect(student.photo_url);

  } catch (error) {
    console.error('❌ Student photo retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ 8. GET TEMPLATE DIMENSIONS FROM CLOUDINARY (updated with scaled dimensions)
router.get('/template-dimensions/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await Template.findById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Load image from Cloudinary
    const templateImage = await loadImageFromUrl(template.frontSide.secure_url || template.frontSide.url);
    const originalDimensions = {
      width: templateImage.width,
      height: templateImage.height
    };

    // Calculate scaled dimensions for final generation (850px width)
    const TARGET_WIDTH = 850;
    const scaledHeight = Math.round((TARGET_WIDTH * originalDimensions.height) / originalDimensions.width);
    const scaleFactor = TARGET_WIDTH / originalDimensions.width;

    const dimensions = {
      original: originalDimensions,
      scaled: {
        width: TARGET_WIDTH,
        height: scaledHeight,
        scaleFactor: scaleFactor.toFixed(4)
      },
      preview: {
        width: 800,  // For frontend preview
        height: Math.round((800 * originalDimensions.height) / originalDimensions.width),
        scaleFactor: (800 / originalDimensions.width).toFixed(4)
      }
    };

    console.log('📏 Template dimensions:', {
      original: `${originalDimensions.width}×${originalDimensions.height}`,
      scaled: `${TARGET_WIDTH}×${scaledHeight}`,
      scaleFactor
    });

    res.json({
      success: true,
      dimensions,
      template: {
        id: template._id,
        name: template.name,
        frontSideUrl: template.frontSide.secure_url || template.frontSide.url
      }
    });

  } catch (error) {
    console.error('❌ Error getting template dimensions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ 9. STUDENT PHOTO UPLOAD (Individual photo upload)
router.post('/upload-student-photo', upload.single('photo'), async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId || !req.file) {
      return res.status(400).json({
        success: false,
        error: 'Student ID and photo are required'
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    console.log(`📸 Uploading photo for ${student.name}...`);

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      {
        folder: 'student-cards/student-photos',
        public_id: `student-${student.student_id}-${Date.now()}`,
        overwrite: true,
        transformation: [
          { width: 500, height: 500, crop: "fill" },
          { quality: "auto:good" }
        ]
      }
    );

    // Update student record
    student.photo_url = uploadResult.secure_url;
    student.photo_public_id = uploadResult.public_id;
    student.photo_metadata = {
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      bytes: uploadResult.bytes
    };
    student.has_photo = true;
    student.photo_uploaded_at = new Date();

    await student.save();

    console.log(`✅ Photo uploaded for ${student.name}`);

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      photo_url: uploadResult.secure_url,
      student: {
        id: student._id,
        name: student.name,
        has_photo: true
      }
    });

  } catch (error) {
    console.error('❌ Photo upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});







// ==================== HELPER FUNCTIONS ====================



// ✅ GENERATE CARDS WITH CLOUDINARY (with Helvetica fonts)
async function generateCardsWithCloudinary(student, template, coordinates, studentPhotoUrl) {
  try {
    console.log(`🎨 Generating card for ${student.name} ${studentPhotoUrl ? '(with photo)' : '(no photo)'}`);

    // Load template from Cloudinary
    const templateImage = await loadImage(template.frontSide.secure_url);

    // ==================== OPTIMAL SCALING FOR ID CARDS ====================
    const ORIGINAL_WIDTH = templateImage.width;
    const ORIGINAL_HEIGHT = templateImage.height;

    console.log(`📏 Original template size: ${ORIGINAL_WIDTH}×${ORIGINAL_HEIGHT}`);

    // Optimal ID card size for printing
    const TARGET_WIDTH = 850;      // Best for ID card printing
    const TARGET_HEIGHT = Math.round((TARGET_WIDTH * ORIGINAL_HEIGHT) / ORIGINAL_WIDTH);

    // Scale factor: 850/1200 = 0.7083
    const scaleFactor = TARGET_WIDTH / ORIGINAL_WIDTH;

    console.log(`📐 Scaling to: ${TARGET_WIDTH}×${TARGET_HEIGHT} (scale factor: ${scaleFactor.toFixed(4)})`);

    // Create scaled canvas
    const canvas = createCanvas(TARGET_WIDTH, TARGET_HEIGHT);
    const ctx = canvas.getContext('2d');

    // Draw scaled template with high quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(templateImage, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

    // ✅ SCALE COORDINATES to match new size (0.7083 scale)
    const scaleCoordinate = (coord) => {
      if (!coord) return null;
      const scaled = { ...coord };
      scaled.x = Math.round(coord.x * scaleFactor);
      scaled.y = Math.round(coord.y * scaleFactor);
      if (coord.width) scaled.width = Math.round(coord.width * scaleFactor);
      if (coord.height) scaled.height = Math.round(coord.height * scaleFactor);
      if (coord.maxWidth) scaled.maxWidth = Math.round(coord.maxWidth * scaleFactor);
      return scaled;
    };

    const scaledCoordinates = {};
    for (const [field, coord] of Object.entries(coordinates)) {
      scaledCoordinates[field] = scaleCoordinate(coord);
    }

    // Photo design configuration 
    const photoConfig = {
      borderColor: '#005800', // Dark green
      borderWidth: 3,
      borderRadius: 10,
      borderOpacity: 1.0, // Full opacity
      backgroundColor: 'transparent', // No background
      placeholderBackground: 'rgba(16, 185, 129, 0.05)' // Very light green for placeholder
    };

    // ✅ ADD STUDENT PHOTO FROM CLOUDINARY URL (with retry mechanism)
    if (studentPhotoUrl && scaledCoordinates.photo) {
      try {
        console.log(`🔄 Loading Cloudinary photo for ${student.name}: ${studentPhotoUrl}`);

        // Try to load the photo with retry
        const studentPhoto = await loadImageFromUrl(studentPhotoUrl);

        const { x, y, width, height } = scaledCoordinates.photo;

        // Draw rounded photo with transparent background
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, photoConfig.borderRadius);
        ctx.clip();
        ctx.drawImage(studentPhoto, x, y, width, height);
        ctx.restore();

        // Draw subtle shadow first (optional)
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, width, height, photoConfig.borderRadius);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fill();
        ctx.restore();

        // Draw border with configurable style
        if (photoConfig.borderWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, width, height, photoConfig.borderRadius);
          ctx.strokeStyle = photoConfig.borderColor;
          ctx.lineWidth = photoConfig.borderWidth;
          ctx.globalAlpha = photoConfig.borderOpacity;
          ctx.shadowColor = 'rgba(0,0,0,0.35)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          ctx.stroke();
          ctx.restore();
        }

        console.log(`✅ Added Cloudinary photo for ${student.name}`);
      } catch (photoError) {
        console.warn(`⚠️ Could not load Cloudinary photo for ${student.name}:`, photoError.message);
        console.warn(`⚠️ Photo URL: ${studentPhotoUrl}`);
        drawPhotoPlaceholder(ctx, scaledCoordinates.photo, photoConfig);
      }
    } else if (scaledCoordinates.photo) {
      drawPhotoPlaceholder(ctx, scaledCoordinates.photo);
    }

    // ==================== HELVETICA FONTS (MOST UNIVERSAL) ====================
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // ✅ HELVETICA FONT CONFIG - MOST UNIVERSAL FONT
    const fontConfig = {
      name: {
        size: 22,           // Larger for prominence
        isBold: true,
        color: '#000000',
        fontFamily: 'Arial'  // Use Arial instead
      },
      class: {
        size: 22,
        isBold: false,       // Make class bold too
        color: '#000000',
        fontFamily: 'Arial'
      },
      level: {
        size: 22,           // Larger like name
        isBold: false,
        color: '#000000',
        fontFamily: 'Arial'
      },
      gender: {
        size: 22,
        isBold: false,       // Make gender bold
        color: '#000000',
        fontFamily: 'Arial'
      },
      residence: {
        size: 22,           // Slightly smaller
        isBold: false,
        color: '#000000',
        fontFamily: 'Arial'
      },
      academic_year: {
        size: 22,
        isBold: false,
        color: '#000000',
        fontFamily: 'Arial'
      }
    };

    // And simplify the font setting:
    const addText = (text, field, coord) => {
      if (!text || !coord || !coord.x || !coord.y) return;

      const config = fontConfig[field] || {
        size: 24,
        isBold: true,
        color: '#000000',
        fontFamily: 'Arial'
      };

      // Use 'top' baseline for predictable positioning
      ctx.textBaseline = 'top'; // This is crucial!
      ctx.textAlign = 'left';

      // Set font BEFORE measuring
      ctx.font = `${config.isBold ? 'bold ' : ''}${config.size}px ${config.fontFamily}`;
      ctx.fillStyle = config.color;

      // Clean and format text
      let displayText = String(text || '').trim();
      if (!displayText) return;

      // Adjust Y position based on font size
      // Since we're using 'top' baseline, no need for extra adjustment
      const drawY = coord.y;

      // Handle text width
      const maxWidth = coord.maxWidth;
      const measuredWidth = ctx.measureText(displayText).width;

      if (measuredWidth > maxWidth) {
        // Try to fit by reducing font size
        let currentSize = config.size;
        while (currentSize > 16 && ctx.measureText(displayText).width > maxWidth) {
          currentSize--;
          ctx.font = `${config.isBold ? 'bold ' : ''}${currentSize}px ${config.fontFamily}`;
        }

        // If still too wide, add ellipsis
        if (ctx.measureText(displayText).width > maxWidth) {
          const ellipsis = '...';
          let truncated = displayText;
          while (truncated.length > 3 && ctx.measureText(truncated + ellipsis).width > maxWidth) {
            truncated = truncated.slice(0, -1);
          }
          displayText = truncated + ellipsis;
        }
      }

      // Draw the text
      ctx.fillText(displayText, coord.x, drawY);

      console.log(`📝 ${field}: "${displayText}" at (${coord.x}, ${drawY}) with font: ${ctx.font}`);
    };

    // ✅ ADD ALL STUDENT DATA WITH HELVETICA
    addText(student.name, 'name', scaledCoordinates.name);
    addText(student.class, 'class', scaledCoordinates.class);
    addText(student.level, 'level', scaledCoordinates.level);
    addText(student.gender, 'gender', scaledCoordinates.gender);
    addText(student.residence, 'residence', scaledCoordinates.residence);
    addText(student.academic_year, 'academic_year', scaledCoordinates.academic_year);

    // Generate front buffer
    const frontBuffer = canvas.toBuffer('image/png');

    // Generate back buffer (also scaled with Helvetica)
    let backBuffer;
    try {
      if (template.backSide && template.backSide.secure_url) {
        const backTemplate = await loadImageFromUrl(template.backSide.secure_url);
        const backCanvas = createCanvas(TARGET_WIDTH, TARGET_HEIGHT);
        const backCtx = backCanvas.getContext('2d');

        // Scale back template
        backCtx.imageSmoothingEnabled = true;
        backCtx.imageSmoothingQuality = 'high';
        backCtx.drawImage(backTemplate, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
        backBuffer = backCanvas.toBuffer('image/png');
      } else {
        // Create simple back side at scaled size with Helvetica
        const backCanvas = createCanvas(TARGET_WIDTH, TARGET_HEIGHT);
        const backCtx = backCanvas.getContext('2d');

        // White background with border
        backCtx.fillStyle = '#FFFFFF';
        backCtx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

        // Green header
        backCtx.fillStyle = '#005800';
        backCtx.fillRect(0, 0, TARGET_WIDTH, 70);

        // School name in Helvetica
        backCtx.fillStyle = '#FFFFFF';
        backCtx.font = 'bold 26px "Helvetica", Arial, sans-serif';
        backCtx.textAlign = 'center';
        backCtx.fillText('MONTESSORI ACADEMY', TARGET_WIDTH / 2, 30);
        backCtx.font = '20px "Helvetica", Arial, sans-serif';
        backCtx.fillText('STUDENT ID CARD', TARGET_WIDTH / 2, 55);

        // Student info
        backCtx.fillStyle = '#333333';
        backCtx.font = 'bold 22px "Helvetica", Arial, sans-serif';
        backCtx.textAlign = 'left';
        backCtx.fillText('STUDENT INFORMATION', 40, 110);

        backCtx.font = '18px "Helvetica", Arial, sans-serif';
        backCtx.fillText(`Name: ${student.name}`, 40, 145);
        backCtx.fillText(`ID: ${student.student_id}`, 40, 175);
        backCtx.fillText(`Class: ${student.class}`, 40, 205);
        backCtx.fillText(`Level: ${student.level}`, 40, 235);

        // Validity dates
        backCtx.fillStyle = '#005800';
        backCtx.font = 'bold 20px "Helvetica", Arial, sans-serif';
        backCtx.fillText('VALIDITY', 40, 285);

        backCtx.fillStyle = '#333333';
        backCtx.font = '18px "Helvetica", Arial, sans-serif';
        backCtx.fillText('Valid From: 08/09/2025', 40, 315);
        backCtx.fillText('Valid Until: 08/09/2026', 40, 345);

        // Contact info
        backCtx.fillStyle = '#666666';
        backCtx.font = '16px "Helvetica", Arial, sans-serif';
        backCtx.textAlign = 'center';
        backCtx.fillText('For inquiries contact Dean Office: +250784716512', TARGET_WIDTH / 2, 400);
        backCtx.fillText('HTTPS://MONTFORTNYAMATA.COM', TARGET_WIDTH / 2, 425);

        // Border
        backCtx.strokeStyle = '#005800';
        backCtx.lineWidth = 2;
        backCtx.strokeRect(15, 15, TARGET_WIDTH - 30, TARGET_HEIGHT - 30);

        backBuffer = backCanvas.toBuffer('image/png');
      }
    } catch (backError) {
      console.warn('⚠️ Creating default back side:', backError.message);
      const backCanvas = createCanvas(TARGET_WIDTH, TARGET_HEIGHT);
      const backCtx = backCanvas.getContext('2d');
      backCtx.fillStyle = '#FFFFFF';
      backCtx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

      // Simple text with Helvetica
      backCtx.fillStyle = '#000000';
      backCtx.font = 'bold 24px "Helvetica", Arial, sans-serif';
      backCtx.textAlign = 'center';
      backCtx.fillText(student.name, TARGET_WIDTH / 2, 100);
      backCtx.font = '18px "Helvetica", Arial, sans-serif';
      backCtx.fillText(`ID: ${student.student_id}`, TARGET_WIDTH / 2, 140);

      backBuffer = backCanvas.toBuffer('image/png');
    }

    console.log(`✅ Card generation completed at ${TARGET_WIDTH}×${TARGET_HEIGHT} with Helvetica fonts`);
    return { frontBuffer, backBuffer };

  } catch (error) {
    console.error(`❌ Card generation failed for ${student.name}:`, error);
    throw error;
  }
}


// ✅ UPDATED PHOTO PLACEHOLDER (scaled version)
function drawPhotoPlaceholder(ctx, photoCoords) {
  const { x, y, width, height } = photoCoords;
  const borderRadius = 10; // Match the photo border radius
  const borderWidth = 3;

  ctx.save();

  // Draw subtle transparent background (very light green, almost transparent)
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, borderRadius);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.05)'; // Very subtle green, mostly transparent
  ctx.fill();

  // Draw green border
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, borderRadius);
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)'; // Green border with transparency
  ctx.lineWidth = borderWidth;
  ctx.stroke();

  // Draw camera icon (smaller and centered)
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 28px Arial'; // Slightly smaller
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📷', x + width / 2, y + height / 2);

  // Add "Add Photo" text below
  ctx.fillStyle = '#666666';
  ctx.font = '12px Arial';
  ctx.fillText('Add Photo', x + width / 2, y + height - 15);

  ctx.restore();
}

// Make sure to include createZipInMemory:
async function createZipInMemory(files) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];

    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    files.forEach(file => {
      archive.append(file.buffer, { name: file.name });
    });

    archive.finalize();
  });
}

module.exports = router;