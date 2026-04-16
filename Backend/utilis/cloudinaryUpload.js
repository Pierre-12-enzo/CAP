// utils/cloudinaryUtils.js
const cloudinary = require('cloudinary').v2;
const JSZip = require('jszip');
const path = require('path');

/**
 * Extract photos from ZIP and upload to Cloudinary
 * @param {Buffer} zipBuffer - ZIP file buffer
 * @returns {Promise<Object>} Map of student_id -> Cloudinary data
 */
async function extractAndUploadPhotosToCloudinary(zipBuffer) {
  const photoCloudinaryMap = {};
  
  try {
    const zip = new JSZip();
    const zipData = await zip.loadAsync(zipBuffer);
    
    console.log(`📦 Processing ZIP with ${Object.keys(zipData.files).length} items`);
    
    // Get all image files
    const files = Object.entries(zipData.files).filter(([fileName, file]) => 
      !file.dir && fileName.match(/\.(jpg|jpeg|png|gif|bmp)$/i)
    );
    
    console.log(`🎯 Found ${files.length} image files in ZIP`);
    
    // Process files sequentially with delay
    for (let i = 0; i < files.length; i++) {
      const [fileName, file] = files[i];
      
      try {
        // Extract student ID from filename
        const baseName = path.basename(fileName);
        const studentId = path.parse(baseName).name;
        
        if (!studentId || studentId.length < 2) {
          console.warn(`⚠️ Skipping invalid filename: ${fileName}`);
          continue;
        }
        
        // Read file
        const fileBuffer = await file.async('nodebuffer');
        
        if (fileBuffer.length === 0) {
          console.warn(`⚠️ Empty file: ${fileName}`);
          continue;
        }
        
        console.log(`📸 Processing photo ${i+1}/${files.length}: ${studentId} (${(fileBuffer.length/1024).toFixed(1)}KB)`);
        
        // Determine MIME type
        const ext = path.extname(fileName).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        if (ext === '.gif') mimeType = 'image/gif';
        if (ext === '.bmp') mimeType = 'image/bmp';
        
        // Upload to Cloudinary with retry
        const uploadResult = await uploadToCloudinaryWithRetry(
          fileBuffer,
          studentId,
          mimeType
        );
        
        // Store in map
        photoCloudinaryMap[studentId] = {
          secure_url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
          bytes: uploadResult.bytes
        };
        
        // Small delay to avoid rate limiting
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
      } catch (error) {
        console.error(`❌ Failed to process ${fileName}:`, error.message);
      }
    }
    
    console.log(`✅ Uploaded ${Object.keys(photoCloudinaryMap).length} photos to Cloudinary`);
    return photoCloudinaryMap;
    
  } catch (error) {
    console.error('❌ ZIP processing error:', error);
    return {};
  }
}

/**
 * Upload image to Cloudinary with retry logic
 * @param {Buffer} buffer - Image buffer
 * @param {string} studentId - Student ID for naming
 * @param {string} mimeType - MIME type
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise} Cloudinary upload result
 */
async function uploadToCloudinaryWithRetry(buffer, studentId, mimeType, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Cloudinary upload attempt ${attempt}/${maxRetries} for ${studentId}`);
      
      const uploadResult = await cloudinary.uploader.upload(
        `data:${mimeType};base64,${buffer.toString('base64')}`,
        {
          folder: 'student-cards/student-photos',
          public_id: `student-${studentId}-${Date.now()}`,
          overwrite: true,
          transformation: [
            { width: 500, height: 500, crop: "fill" },
            { quality: "auto:good" }
          ],
          timeout: 30000
        }
      );
      
      return uploadResult;
    } catch (error) {
      lastError = error;
      console.log(`⚠️ Upload attempt ${attempt} failed for ${studentId}: ${error.message}`);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`⏳ Waiting ${delay/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Upload single photo to Cloudinary
 * @param {Buffer} buffer - Image buffer
 * @param {string} studentId - Student ID
 * @returns {Promise} Cloudinary upload result
 */
async function uploadSinglePhotoToCloudinary(buffer, studentId) {
  const mimeType = 'image/jpeg'; // Default, adjust as needed
  return await uploadToCloudinaryWithRetry(buffer, studentId, mimeType);
}

module.exports = {
  extractAndUploadPhotosToCloudinary,
  uploadToCloudinaryWithRetry,
  uploadSinglePhotoToCloudinary
};