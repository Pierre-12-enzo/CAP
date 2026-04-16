import React, { useState, useRef, useEffect } from 'react';
import { cardAPI, templateAPI } from '../../services/api';

const CardGeneration = () => {


    //================================== DECLARE STATES ==================================//
    const [activeStep, setActiveStep] = useState('upload');
    const [generationMode, setGenerationMode] = useState('batch');
    const [generationStatus, setGenerationStatus] = useState('idle');
    const [progress, setProgress] = useState(0);
    const [batchInfo, setBatchInfo] = useState(null);
    const [students, setStudents] = useState([]);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [uploadedPhoto, setUploadedPhoto] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [photoUploadStatus, setPhotoUploadStatus] = useState('idle');
    const [batchId, setBatchId] = useState(null);
    const [progressInterval, setProgressInterval] = useState(null);
    const [realProgress, setRealProgress] = useState({
        status: 'idle',
        percentage: 0,
        processed: 0,
        generated: 0,
        total: 0,
        failed: 0,
        currentStudent: null,
        estimatedTime: null
    });
    //Coordinates
    const [coordinates, setCoordinates] = useState({
        photo: { x: 50, y: 230, width: 250, height: 250 }, // Example
        name: { x: 580, y: 225, maxWidth: 500 },
        class: { x: 580, y: 270, maxWidth: 300 },
        level: { x: 580, y: 320, maxWidth: 500 },
        gender: { x: 580, y: 375, maxWidth: 300 },
        residence: { x: 620, y: 420, maxWidth: 300 },
        academic_year: { x: 670, y: 472, maxWidth: 300 }
    });
    const [templateDimensions, setTemplateDimensions] = useState({
        width: 1080,
        height: 607
    });

    // In CardGeneration component, add these states:
    const [csvFile, setCsvFile] = useState(null);
    const [photoZipFile, setPhotoZipFile] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [showStudentSelect, setShowStudentSelect] = useState(false);

    // filteredStudents logic inside the component:
    const filteredStudents = students.filter(student => {
        const searchLower = searchTerm.toLowerCase().trim();
        if (!searchLower) return true;

        return (
            (student.name?.toLowerCase() || '').includes(searchLower) ||
            (student.student_id?.toLowerCase() || '').includes(searchLower) ||
            (student.class?.toLowerCase() || '').includes(searchLower)
        );
    });


    //================================== DECLARE STATES ==================================//



    // UseEffect for Automatic Load Data
    useEffect(() => {
        loadTemplates();
        loadTemplateDimensions();

        if (generationMode === 'single') {
            loadStudents();
        }
    }, [generationMode, selectedTemplateId]);



    //=====================LOADING OR FETCHING====================//

    //Load students for single mode
    const loadStudents = async () => {
        try {
            const response = await cardAPI.getStudents();
            if (response.success) {
                setStudents(response.students);
            }
        } catch (error) {
            console.error('Failed to load students:', error);
        }
    };

    //Load templates
    const loadTemplates = async () => {
        try {
            const response = await templateAPI.getTemplates();
            if (response.success) {
                setTemplates(response.templates);
                // Auto-select default template
                const defaultTemplate = response.templates.find(t => t.isDefault);
                if (defaultTemplate) {
                    setSelectedTemplateId(defaultTemplate._id);
                    // Load template preview images
                    loadTemplatePreviews(defaultTemplate);
                }
            }
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    };

    // Load template preview URLs - UPDATED FOR CLOUDINARY
    const loadTemplatePreviews = async (template) => {
        try {
            // Use template.frontSideUrl if available (from GET /templates endpoint)
            if (template.frontSideUrl) {
                console.log('🖼️ Front preview URL (from API):', template.frontSideUrl);
            }
            // Fallback to using public_id
            else if (template.frontSide?.public_id) {
                const frontUrl = await templateAPI.previewTemplate(template.frontSide.public_id);
                console.log('🖼️ Front preview URL (from preview API):', frontUrl);
            }

            // Use template.backSideUrl if available
            if (template.backSideUrl) {
                console.log('🖼️ Back preview URL (from API):', template.backSideUrl);
            }
            // Fallback to using public_id
            else if (template.backSide?.public_id) {
                const backUrl = await templateAPI.previewTemplate(template.backSide.public_id);
                console.log('🖼️ Back preview URL (from preview API):', backUrl);
            }
        } catch (error) {
            console.error('Error loading template previews:', error);
        }
    };

    // lOADING  progress
    const fetchBatchProgress = async (batchId) => {
        try {
            const response = await cardAPI.getBatchProgress(batchId);
            if (response.success) {
                setRealProgress(response.progress);

                // Update the main progress bar
                setProgress(response.progress.percentage);

                // Update batch info
                setBatchInfo({
                    totalCards: response.progress.total,
                    processed: response.progress.processed,
                    generated: response.progress.generated,
                    failed: response.progress.failed,
                    currentStudent: response.progress.currentStudent
                });

                // If completed or errored, stop polling
                if (['completed', 'error', 'finalizing'].includes(response.progress.status)) {
                    if (progressInterval) {
                        clearInterval(progressInterval);
                        setProgressInterval(null);
                    }

                    // If error, update status
                    if (response.progress.status === 'error') {
                        setGenerationStatus('error');
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch progress:', error);
        }
    };

    // ✅ UPDATED: Default Template Card Component for Cloudinary
    const DefaultTemplateCard = ({ template, selected, onSelect }) => {
        const [frontPreview, setFrontPreview] = useState(null);
        const [backPreview, setBackPreview] = useState(null);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            const loadPreviews = async () => {
                setLoading(true);
                try {
                    console.log('🔍 Loading template:', template.name, {
                        frontSideUrl: template.frontSideUrl,
                        backSideUrl: template.backSideUrl,
                        frontPublicId: template.frontSide?.public_id,
                        backPublicId: template.backSide?.public_id
                    });

                    // Priority 1: Use direct URL from template API
                    if (template.frontSideUrl) {
                        setFrontPreview(template.frontSideUrl);
                    }
                    // Priority 2: Use public_id with preview API
                    else if (template.frontSide?.public_id) {
                        const frontUrl = await templateAPI.previewTemplate(template.frontSide.public_id);
                        setFrontPreview(frontUrl);
                    }

                    // Priority 1: Use direct URL from template API
                    if (template.backSideUrl) {
                        setBackPreview(template.backSideUrl);
                    }
                    // Priority 2: Use public_id with preview API
                    else if (template.backSide?.public_id) {
                        const backUrl = await templateAPI.previewTemplate(template.backSide.public_id);
                        setBackPreview(backUrl);
                    }
                } catch (error) {
                    console.error('Error loading template previews:', error);
                } finally {
                    setLoading(false);
                }
            };

            loadPreviews();
        }, [template]);

        return (
            <div
                onClick={onSelect}
                className={`border-2 rounded-2xl p-6 cursor-pointer transition-all duration-300 ${selected
                    ? 'border-emerald-500 bg-emerald-50 shadow-lg'
                    : 'border-gray-200 hover:border-emerald-300'
                    }`}
            >
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h4 className="text-lg font-bold text-gray-900">{template.name}</h4>
                        {template.description && (
                            <p className="text-sm text-gray-600">{template.description}</p>
                        )}
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-sm px-3 py-1 rounded-full font-medium">
                        Default Template
                    </span>
                </div>

                <div className="flex space-x-4">
                    {/* Front Side */}
                    <div className="flex-1">
                        <div className="text-sm font-medium text-gray-700 mb-2">Front Side</div>
                        <div className="aspect-[3/4] bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden border-2 border-gray-300">
                            {frontPreview ? (
                                <img
                                    src={frontPreview}
                                    alt={`${template.name} - Front`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        console.error('Failed to load front preview');
                                        e.target.style.display = 'none';
                                    }}
                                />
                            ) : loading ? (
                                <div className="text-center text-gray-400">
                                    <i className="pi pi-spinner pi-spin text-2xl mb-2"></i>
                                    <p className="text-xs">Loading...</p>
                                </div>
                            ) : (
                                <div className="text-center text-gray-400">
                                    <i className="pi pi-image text-2xl mb-2"></i>
                                    <p className="text-xs">No preview</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Back Side */}
                    <div className="flex-1">
                        <div className="text-sm font-medium text-gray-700 mb-2">Back Side</div>
                        <div className="aspect-[3/4] bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden border-2 border-gray-300">
                            {backPreview ? (
                                <img
                                    src={backPreview}
                                    alt={`${template.name} - Back`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        console.error('Failed to load back preview');
                                        e.target.style.display = 'none';
                                    }}
                                />
                            ) : loading ? (
                                <div className="text-center text-gray-400">
                                    <i className="pi pi-spinner pi-spin text-2xl mb-2"></i>
                                    <p className="text-xs">Loading...</p>
                                </div>
                            ) : (
                                <div className="text-center text-gray-400">
                                    <i className="pi pi-image text-2xl mb-2"></i>
                                    <p className="text-xs">No preview</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-4 text-center">
                    <p className="text-sm text-emerald-600 font-medium">
                        {selected ? '✓ Selected for generation' : 'Click to select this template'}
                    </p>
                </div>
            </div>
        );
    };

    // ✅ FIXED: Load template dimensions function
    const loadTemplateDimensions = async () => {
        if (selectedTemplateId) {
            try {
                console.log('📏 Loading template dimensions for:', selectedTemplateId);
                const response = await cardAPI.getTemplateDimensions(selectedTemplateId);

                if (response.success) {
                    console.log('📏 Template dimensions response:', response.dimensions);

                    // Use scaled dimensions for generation (850×478)
                    if (response.dimensions.scaled) {
                        setTemplateDimensions({
                            width: response.dimensions.scaled.width,
                            height: response.dimensions.scaled.height,
                            scaleFactor: response.dimensions.scaled.scaleFactor
                        });
                        console.log('✅ Using scaled dimensions:', response.dimensions.scaled);
                    } else {
                        // Fallback
                        setTemplateDimensions({
                            width: 850,
                            height: 478,
                            scaleFactor: 0.7083
                        });
                    }
                }
            } catch (error) {
                console.error('❌ Failed to load template dimensions:', error);
                // Default to 850×478
                setTemplateDimensions({
                    width: 850,
                    height: 478,
                    scaleFactor: 0.7083
                });
            }
        }
    };
    // Handle modal cancel with reset
    const handleModalCancel = () => {
        setShowPhotoModal(false);
        setUploadedPhoto(null);
        setPhotoUploadStatus('idle');
    };


    // ✅ FIXED: Single student selection with proper photo validation
    const handleSingleStudentSelect = (studentId) => {
        const student = students.find(s => s._id === studentId);
        if (!student) return;

        setSelectedStudent(student);

        // Check if template is selected
        if (!selectedTemplateId) {
            alert('Please select a template first');
            setActiveStep('template');
            return;
        }

        console.log('📸 Student photo status:', {
            name: student.name,
            has_photo: student.has_photo,
            photo_path: student.class
        });
        console.log(JSON.stringify(student, null, 2));

        // ✅ FIXED: Check if student has photo in database
        if (!student.has_photo) {
            console.log('📸 Student needs photo - showing modal');
            setShowPhotoModal(true);
        } else {
            // Student has photo and template is ready, proceed to process
            console.log('✅ Student has photo - proceeding to generation');
            setActiveStep('process');
        }
    };
    // ✅ FIXED: handleCSVProcessing using state files
    const handleCSVProcessing = async (e) => {
        e?.preventDefault();

        console.log('🟡 Starting batch processing with REAL progress...');

        // Validation
        if (!selectedTemplateId || !csvFile) {
            alert('Please select a template and CSV file');
            return;
        }

        setGenerationStatus('processing');
        setProgress(0);

        const formData = new FormData();
        formData.append('csv', csvFile);
        formData.append('templateId', selectedTemplateId);
        formData.append('coordinates', JSON.stringify(coordinates));

        if (photoZipFile) {
            formData.append('photoZip', photoZipFile);
        }

        try {
            console.log('📡 Making API request...');

            // Clear any existing interval
            if (progressInterval) {
                clearInterval(progressInterval);
                setProgressInterval(null);
            }

            // Start real progress polling
            const pollInterval = setInterval(async () => {
                try {
                    // Use the student count from CSV to estimate progress
                    // First, we need to know how many students are in the CSV
                    const csvText = await csvFile.text();
                    const lines = csvText.split('\n').filter(line => line.trim());
                    const totalStudents = Math.max(0, lines.length - 1); // Subtract header

                    if (totalStudents > 0) {
                        // Get progress from backend if endpoint exists
                        // For now, we'll estimate based on time
                        const elapsedSeconds = (Date.now() - startTime) / 1000;
                        const cardsPerSecond = 0.5; // Estimate 0.5 cards per second
                        const estimatedProcessed = Math.min(totalStudents, Math.floor(elapsedSeconds * cardsPerSecond));
                        const percentage = Math.min(95, Math.round((estimatedProcessed / totalStudents) * 100));

                        setRealProgress({
                            status: 'generating_cards',
                            percentage: percentage,
                            processed: estimatedProcessed,
                            generated: estimatedProcessed,
                            total: totalStudents,
                            failed: 0,
                            currentStudent: {
                                name: `Processing...`,
                                id: `#${estimatedProcessed}`,
                                index: estimatedProcessed,
                                total: totalStudents
                            }
                        });

                        setProgress(percentage);
                    }
                } catch (error) {
                    console.warn('Progress estimation error:', error.message);
                }
            }, 2000); // Update every 2 seconds

            setProgressInterval(pollInterval);
            const startTime = Date.now();

            // Make the API call
            const zipBlob = await cardAPI.processCSVAndGenerate(formData);

            // Clear polling
            clearInterval(pollInterval);
            setProgressInterval(null);

            setProgress(100);
            setGenerationStatus('completed');

            // Download
            const url = window.URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `batch-cards-${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                console.log('✅ Download complete!');
            }, 100);

            console.log('✅ Batch processing successful!');

        } catch (error) {
            console.error('❌ Batch processing error:', error);

            if (progressInterval) {
                clearInterval(progressInterval);
                setProgressInterval(null);
            }

            setGenerationStatus('error');

            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                alert('Processing is taking longer than expected. Cards are being generated in the backend.');
            } else {
                alert(`Error: ${error.message}`);
            }
        }
    };

    // ✅ FIXED: Single student generation with template
    const generateSingleStudentCard = async (student, photoFile) => {
        // Validate template
        if (!selectedTemplateId) {
            alert('Please select a template first');
            setActiveStep('template');
            return;
        }

        setGenerationStatus('processing');
        setProgress(0);

        try {
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 20;
                });
            }, 300);

            // ✅ Send as JSON instead of FormData
            const requestData = {
                studentId: student._id,
                templateId: selectedTemplateId,
                coordinates: JSON.stringify(coordinates)
            };

            console.log('📤 Generating single card with JSON...', requestData);

            // ✅ Use the simple endpoint
            const zipBlob = await cardAPI.generateSingleCardSimple(requestData);

            clearInterval(progressInterval);
            setProgress(100);
            setGenerationStatus('completed');

            // Create download
            const url = window.URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `id-card-${student.student_id}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            // Update batch info
            setBatchInfo({
                totalCards: 1,
                processed: 1,
                failed: 0,
                studentName: student.name
            });

        } catch (error) {
            setGenerationStatus('error');
            console.error('❌ Card generation error:', error);

            if (error.message && error.message.includes('PHOTO_REQUIRED')) {
                setShowPhotoModal(true);
            } else {
                alert(`Card generation failed: ${error.message || 'Unknown error'}`);
            }
        }
    };

    // ✅ NEW: Handle photo upload only (save to student profile)
    const handlePhotoUploadOnly = async () => {
        if (!uploadedPhoto || !selectedStudent) return;

        try {
            setGenerationStatus('processing');

            const formData = new FormData();
            formData.append('studentId', selectedStudent._id);
            formData.append('photo', uploadedPhoto);

            // Call API to save photo only
            const response = await cardAPI.uploadStudentPhoto(formData);

            if (response.success) {
                // ✅ Update local student data
                const updatedStudents = students.map(student =>
                    student._id === selectedStudent._id
                        ? {
                            ...student,
                            has_photo: true,
                            photo_path: response.photo_path
                        }
                        : student
                );

                setStudents(updatedStudents);

                // ✅ Update selected student
                setSelectedStudent(prev => ({
                    ...prev,
                    has_photo: true,
                    photo_path: response.photo_path
                }));

                // ✅ Close modal and show success
                setShowPhotoModal(false);
                setUploadedPhoto(null);

                // ✅ Move to process step automatically
                setActiveStep('process');

                alert('Photo uploaded successfully! You can now generate the card.');
            }
        } catch (error) {
            console.error('❌ Photo upload error:', error);
            alert('Photo upload failed. Please try again.');
        } finally {
            setGenerationStatus('idle');
        }
    };

    const handleCoordinateChange = (field, axis, value) => {
        setCoordinates(prev => ({
            ...prev,
            [field]: {
                ...prev[field],
                [axis]: parseInt(value) || 0
            }
        }));
    };

    // Status helpers
    const getStatusColor = (status) => {
        const colors = {
            idle: 'text-gray-500',
            processing: 'text-blue-600',
            validating: 'text-amber-600',
            generating: 'text-purple-600',
            finalizing: 'text-emerald-600',
            downloading: 'text-blue-600',
            completed: 'text-green-600',
            error: 'text-red-600'
        };
        return colors[status] || 'text-gray-500';
    };

    const getStatusIcon = (status) => {
        const icons = {
            idle: 'pi-clock',
            processing: 'pi-spinner pi-spin',
            validating: 'pi-check-circle',
            generating: 'pi-qrcode',
            finalizing: 'pi-cog',
            downloading: 'pi-download',
            completed: 'pi-check-circle',
            error: 'pi-times-circle'
        };
        return icons[status] || 'pi-clock';
    };

    // Get the selected template
    const selectedTemplate = templates.find(t => t._id === selectedTemplateId);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Card Generation Studio</h1>
                    <p className="text-gray-600 mt-2">Generate ID cards for single students or batch process</p>
                </div>

                {/* Generation Mode Selector */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Generation Mode</h2>
                        <i className="pi pi-sitemap text-emerald-600 text-xl"></i>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => setGenerationMode('batch')}
                            className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 ${generationMode === 'batch'
                                ? 'border-emerald-500 bg-emerald-50 shadow-lg'
                                : 'border-gray-200 bg-white hover:border-emerald-300'
                                }`}
                        >
                            <div className="flex items-center space-x-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${generationMode === 'batch' ? 'bg-emerald-500' : 'bg-gray-100'
                                    }`}>
                                    <i className={`pi pi-users text-lg ${generationMode === 'batch' ? 'text-white' : 'text-gray-600'
                                        }`}></i>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Batch Processing</h3>
                                    <p className="text-sm text-gray-600 mt-1">Upload CSV + photos to generate multiple cards</p>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => setGenerationMode('single')}
                            className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 ${generationMode === 'single'
                                ? 'border-emerald-500 bg-emerald-50 shadow-lg'
                                : 'border-gray-200 bg-white hover:border-emerald-300'
                                }`}
                        >
                            <div className="flex items-center space-x-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${generationMode === 'single' ? 'bg-emerald-500' : 'bg-gray-100'
                                    }`}>
                                    <i className={`pi pi-user text-lg ${generationMode === 'single' ? 'text-white' : 'text-gray-600'
                                        }`}></i>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Single Student</h3>
                                    <p className="text-sm text-gray-600 mt-1">Generate card for individual student</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
                    {/* Left Column - Controls */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* Step Navigation */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">Generation Workflow</h2>
                                <i className="pi pi-sitemap text-emerald-600 text-xl"></i>
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                                <WorkflowStep
                                    step="1"
                                    title={generationMode === 'batch' ? "Upload" : "Select"}
                                    description={generationMode === 'batch' ? "Data & Assets" : "Student"}
                                    active={activeStep === 'upload'}
                                    completed={['template', 'coordinates', 'process'].includes(activeStep)}
                                    icon={generationMode === 'batch' ? 'pi-cloud-upload' : 'pi-user'}
                                    onClick={() => setActiveStep('upload')}
                                />
                                <WorkflowStep
                                    step="2"
                                    title="Template"
                                    description="Design & Layout"
                                    active={activeStep === 'template'}
                                    completed={['coordinates', 'process'].includes(activeStep)}
                                    icon="pi-image"
                                    onClick={() => setActiveStep('template')}
                                />
                                <WorkflowStep
                                    step="3"
                                    title="Coordinates"
                                    description="Field Positioning"
                                    active={activeStep === 'coordinates'}
                                    completed={['process'].includes(activeStep)}
                                    icon="pi-arrows-alt"
                                    onClick={() => setActiveStep('coordinates')}
                                />
                                <WorkflowStep
                                    step="4"
                                    title="Process"
                                    description="Generate & Download"
                                    active={activeStep === 'process'}
                                    completed={false}
                                    icon="pi-cog"
                                    onClick={() => setActiveStep('process')}
                                />
                            </div>
                        </div>

                        {/* Dynamic Content */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            {/* BATCH UPLOAD STEP */}
                            {/* BATCH UPLOAD STEP - UPDATED */}
                            {activeStep === 'upload' && generationMode === 'batch' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold text-gray-900">Upload Student Data</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FileUploadCard
                                            title="Student Data (CSV)"
                                            description="Upload CSV file with student information"
                                            accept=".csv"
                                            icon="pi-file-excel"
                                            color="emerald"
                                            onFileSelect={(file) => setCsvFile(file)}
                                        />
                                        <FileUploadCard
                                            title="Student Photos (ZIP)"
                                            description="ZIP folder containing student photos"
                                            accept=".zip"
                                            icon="pi-images"
                                            color="blue"
                                            note="Supports JPG, JPEG, PNG - Optional"
                                            onFileSelect={(file) => setPhotoZipFile(file)}
                                        />
                                    </div>

                                    {/* File selection status */}
                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">CSV Status:</p>
                                                <p className={`text-sm ${csvFile ? 'text-emerald-600' : 'text-gray-500'}`}>
                                                    {csvFile ? `✓ ${csvFile.name}` : 'No file selected'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Photos Status:</p>
                                                <p className={`text-sm ${photoZipFile ? 'text-blue-600' : 'text-gray-500'}`}>
                                                    {photoZipFile ? `✓ ${photoZipFile.name}` : 'No file selected (optional)'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                        <div className="flex items-start space-x-3">
                                            <i className="pi pi-info-circle text-amber-600 text-lg mt-0.5"></i>
                                            <div>
                                                <p className="text-sm font-medium text-amber-800">Upload Requirements</p>
                                                <p className="text-xs text-amber-700 mt-1">
                                                    CSV must include: student_id, name, class, level, residence, gender, academic_year
                                                </p>
                                                <p className="text-xs text-amber-700">
                                                    Photos should be named matching student_id (e.g., STU001.jpg)
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Continue button */}
                                    <div className="pt-4 border-t border-gray-200">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm text-gray-600">
                                                    {csvFile ? 'Ready to process' : 'Select a CSV file to continue'}
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    if (!csvFile) {
                                                        alert('Please select a CSV file first');
                                                        return;
                                                    }

                                                    if (!selectedTemplateId) {
                                                        alert('Please select a template first');
                                                        setActiveStep('template');
                                                        return;
                                                    }

                                                    setActiveStep('process');
                                                }}
                                                disabled={!csvFile}
                                                className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <i className="pi pi-arrow-right mr-2"></i>
                                                Continue to Template
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SINGLE STUDENT SELECTION STEP */}
                            {activeStep === 'upload' && generationMode === 'single' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold text-gray-900">Select Student</h3>

                                    {/* Student Search Dropdown (like PermissionStudio) */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowStudentSelect(!showStudentSelect)}
                                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-left flex justify-between items-center hover:border-emerald-500 transition-colors"
                                        >
                                            <div>
                                                <span className="text-gray-700">
                                                    {selectedStudent ? selectedStudent.name : 'Select a student...'}
                                                </span>
                                                {selectedStudent && (
                                                    <span className="text-gray-500 text-sm ml-2">
                                                        {selectedStudent.student_id} • {selectedStudent.class}
                                                        {!selectedStudent.has_photo && ' 📸(Needs Photo)'}
                                                    </span>
                                                )}
                                            </div>
                                            <i className={`pi pi-chevron-${showStudentSelect ? 'up' : 'down'} text-gray-400`}></i>
                                        </button>

                                        {/* Student Search Dropdown */}
                                        {showStudentSelect && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-xl shadow-lg z-10 max-h-64 overflow-hidden">
                                                <div className="p-3 border-b border-gray-200">
                                                    <div className="relative">
                                                        <i className="pi pi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                                        <input
                                                            type="text"
                                                            placeholder="Search students by name, ID, or class..."
                                                            value={searchTerm}
                                                            onChange={(e) => setSearchTerm(e.target.value)}
                                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="mt-1 text-xs text-gray-500">
                                                        {!searchTerm.trim() ? 'Showing recent students' : `Searching for: "${searchTerm}"`}
                                                    </div>
                                                </div>
                                                <div className="overflow-y-auto max-h-48">
                                                    {filteredStudents.length > 0 ? (
                                                        <>
                                                            {/* Show limited results when no search */}
                                                            {!searchTerm.trim() && filteredStudents.length > 8 && (
                                                                <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-100">
                                                                    <div className="text-xs text-emerald-700 flex items-center">
                                                                        <i className="pi pi-info-circle mr-1"></i>
                                                                        Showing 8 of {filteredStudents.length} students. Type to search...
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Display students (limited if no search) */}
                                                            {(searchTerm.trim() ? filteredStudents : filteredStudents.slice(0, 8)).map(student => (
                                                                <button
                                                                    key={student._id}
                                                                    onClick={() => {
                                                                        handleSingleStudentSelect(student._id);
                                                                        setShowStudentSelect(false);
                                                                    }}
                                                                    className="w-full text-left p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 flex justify-between items-center"
                                                                >
                                                                    <div>
                                                                        <div className="font-medium text-gray-900">{student.name}</div>
                                                                        <div className="text-sm text-gray-500">
                                                                            {student.student_id} • {student.class}
                                                                        </div>
                                                                    </div>
                                                                    {!student.has_photo && (
                                                                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                                                                            Needs Photo
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            ))}

                                                            {/* Show "view all" option when no search */}
                                                            {!searchTerm.trim() && filteredStudents.length > 8 && (
                                                                <button
                                                                    onClick={() => setSearchTerm(' ')}
                                                                    className="w-full text-center p-3 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors border-t border-gray-200"
                                                                >
                                                                    <div className="flex items-center justify-center">
                                                                        <i className="pi pi-list mr-2"></i>
                                                                        View All Students ({filteredStudents.length})
                                                                    </div>
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="text-center py-6">
                                                            <i className="pi pi-user-slash text-2xl text-gray-300 mb-2"></i>
                                                            <p className="text-gray-500 font-medium">No matching students</p>
                                                            <p className="text-gray-400 text-sm mt-1">
                                                                {searchTerm.trim() ? `No results for "${searchTerm}"` : 'No students available'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {selectedStudent && (
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                            <div className="flex items-center space-x-3">
                                                <i className="pi pi-check-circle text-emerald-600 text-lg"></i>
                                                <div>
                                                    <p className="font-medium text-emerald-800">Student Selected</p>
                                                    <p className="text-sm text-emerald-700">
                                                        {selectedStudent.name} ({selectedStudent.student_id}) - {selectedStudent.class}
                                                    </p>
                                                    <p className="text-xs text-emerald-600 mt-1">
                                                        {selectedStudent.has_photo ? '✅ Photo available' : '📸 Photo required'}
                                                        {selectedStudent.card_generated && ` • ${selectedStudent.card_generation_count} cards generated`}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ✅ FIXED: TEMPLATE STEP - SHOW ONLY DEFAULT TEMPLATE */}
                            {activeStep === 'template' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold text-gray-900">Template Selection</h3>
                                    <p className="text-sm text-gray-600">Using default template for card generation</p>

                                    <div className="space-y-4">
                                        {templates.length === 0 ? (
                                            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl">
                                                <i className="pi pi-images text-gray-400 text-4xl mb-3"></i>
                                                <p className="text-gray-600">No templates available</p>
                                                <p className="text-sm text-gray-500 mt-1">Upload templates in Template Manager first</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {/* Show only default template */}
                                                {templates.filter(template => template.isDefault).map(template => (
                                                    <DefaultTemplateCard
                                                        key={template._id}
                                                        template={template}
                                                        selected={selectedTemplateId === template._id}
                                                        onSelect={() => setSelectedTemplateId(template._id)}
                                                    />
                                                ))}

                                                {/* Show message if no default template */}
                                                {templates.filter(template => template.isDefault).length === 0 && (
                                                    <div className="text-center py-8 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50">
                                                        <i className="pi pi-exclamation-triangle text-amber-500 text-4xl mb-3"></i>
                                                        <p className="text-amber-800 font-medium">No Default Template Set</p>
                                                        <p className="text-sm text-amber-700 mt-1">
                                                            Please set a default template in Template Manager
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>


                                    {selectedTemplateId && (
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => setActiveStep('coordinates')}
                                                className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-600 transition-colors"
                                            >
                                                Continue to Coordinates
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* COORDINATES STEP */}
                            {activeStep === 'coordinates' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold text-gray-900">Field Positioning</h3>
                                    <p className="text-sm text-gray-600">Adjust field positions on the card template</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.entries(coordinates).map(([field, coords]) => (
                                            <CoordinateControl
                                                key={field}
                                                field={field}
                                                coordinates={coords}
                                                onChange={handleCoordinateChange}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* PROCESS STEP */}
                            {activeStep === 'process' && generationMode === 'batch' && (
                                <ProcessStep
                                    onGenerate={handleCSVProcessing}
                                    generationStatus={generationStatus}
                                    progress={progress}
                                    batchInfo={batchInfo}
                                    mode="batch"
                                    realProgress={realProgress}
                                />
                            )}

                            {activeStep === 'process' && generationMode === 'single' && (
                                <ProcessStep
                                    onGenerate={() => selectedStudent && generateSingleStudentCard(selectedStudent, null)}
                                    generationStatus={generationStatus}
                                    progress={progress}
                                    batchInfo={batchInfo}
                                    mode="single"
                                    student={selectedStudent}
                                    realProgress={realProgress}
                                />
                            )}
                        </div>
                    </div>

                    {/* Right Column - Preview & Status */}
                    <div className="space-y-6">

                        {/* Live Preview - FIXED */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Live Preview</h3>
                                <i className="pi pi-eye text-emerald-600 text-xl"></i>
                            </div>

                            <div className="bg-gray-900 rounded-2xl p-4">
                                {selectedTemplate ? (
                                    <FixedSizeTemplatePreview
                                        template={selectedTemplate}
                                        coordinates={coordinates}
                                        student={selectedStudent}
                                    />
                                ) : (
                                    <div className="text-center text-white py-20">
                                        <i className="pi pi-image text-4xl mb-4 opacity-50"></i>
                                        <p>Select a template to preview</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 text-center">
                                <p className="text-sm text-emerald-600 font-medium">
                                    ✅ Live preview showing template
                                </p>
                            </div>
                        </div>

                        {/* Generation Status */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {generationMode === 'batch' ? 'Batch Status' : 'Generation Status'}
                                </h3>
                                <i className={`pi ${getStatusIcon(generationStatus)} ${getStatusColor(generationStatus)} text-xl`}></i>
                            </div>

                            <div className="space-y-4">
                                <StatusItem
                                    label="Current Status"
                                    value={generationStatus}
                                    valueClass={getStatusColor(generationStatus)}
                                    icon={getStatusIcon(generationStatus)}
                                />

                                {generationStatus !== 'idle' && generationStatus !== 'error' && (
                                    <>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Processing Progress</span>
                                                <span className="font-medium text-emerald-600">{Math.round(progress)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-gradient-to-r from-emerald-500 to-green-600 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {batchInfo && generationStatus === 'completed' && (
                                            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-emerald-600">{batchInfo.totalCards}</div>
                                                    <div className="text-xs text-gray-600">Total</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-green-600">{batchInfo.processed}</div>
                                                    <div className="text-xs text-gray-600">Processed</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-red-600">{batchInfo.failed}</div>
                                                    <div className="text-xs text-gray-600">Failed</div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {generationStatus === 'completed' && batchInfo && (
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                                        <i className="pi pi-check-circle text-green-500 text-2xl mb-2"></i>
                                        <p className="text-green-800 font-medium">Download Complete!</p>
                                        <p className="text-green-600 text-sm">
                                            {batchInfo.studentName
                                                ? `Card for ${batchInfo.studentName} downloaded`
                                                : 'Batch cards downloaded to your computer'
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Photo Upload Modal */}
            {showPhotoModal && selectedStudent && (
                <PhotoUploadModal
                    student={selectedStudent}
                    onPhotoSave={handlePhotoUploadOnly}
                    onCancel={handleModalCancel}
                    uploadedPhoto={uploadedPhoto}
                    setUploadedPhoto={setUploadedPhoto}
                    uploadStatus={photoUploadStatus}
                />
            )}
        </div>
    );
};

// ========== COMPONENTS ==========

// ✅ NEW: Default Template Card Component
const DefaultTemplateCard = ({ template, selected, onSelect }) => {
    const [frontPreview, setFrontPreview] = useState(null);
    const [backPreview, setBackPreview] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPreviews = async () => {
            setLoading(true);
            try {
                if (template.frontSide?.filename) {
                    const frontUrl = await templateAPI.previewTemplate(template.frontSide.filename);
                    setFrontPreview(frontUrl);
                }
                if (template.backSide?.filename) {
                    const backUrl = await templateAPI.previewTemplate(template.backSide.filename);
                    setBackPreview(backUrl);
                }
            } catch (error) {
                console.error('Error loading template previews:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPreviews();
    }, [template]);

    return (
        <div
            onClick={onSelect}
            className={`border-2 rounded-2xl p-6 cursor-pointer transition-all duration-300 ${selected
                ? 'border-emerald-500 bg-emerald-50 shadow-lg'
                : 'border-gray-200 hover:border-emerald-300'
                }`}
        >
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h4 className="text-lg font-bold text-gray-900">{template.name}</h4>
                    {template.description && (
                        <p className="text-sm text-gray-600">{template.description}</p>
                    )}
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-sm px-3 py-1 rounded-full font-medium">
                    Default Template
                </span>
            </div>

            <div className="flex space-x-4">
                {/* Front Side */}
                <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700 mb-2">Front Side</div>
                    <div className="aspect-[3/4] bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden border-2 border-gray-300">
                        {frontPreview ? (
                            <img
                                src={frontPreview}
                                alt={`${template.name} - Front`}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="text-center text-gray-400">
                                <i className="pi pi-image text-2xl mb-2"></i>
                                <p className="text-xs">Loading...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Back Side */}
                <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700 mb-2">Back Side</div>
                    <div className="aspect-[3/4] bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden border-2 border-gray-300">
                        {backPreview ? (
                            <img
                                src={backPreview}
                                alt={`${template.name} - Back`}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="text-center text-gray-400">
                                <i className="pi pi-image text-2xl mb-2"></i>
                                <p className="text-xs">Loading...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-4 text-center">
                <p className="text-sm text-emerald-600 font-medium">
                    {selected ? '✓ Selected for generation' : 'Click to select this template'}
                </p>
            </div>
        </div>
    );
};

// ✅ SIMPLE Template Preview - Just shows the image with overlays
const TemplatePreview = ({ template, coordinates, student }) => {
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const displayStudent = student || {};

    // Get the ACTUAL template image URL from Cloudinary
    const templateUrl = template?.frontSide?.secure_url ||
        template?.frontSide?.url ||
        template?.frontSide?.filepath ||
        template?.frontSideUrl;

    useEffect(() => {
        if (!templateUrl) return;

        // Get actual image dimensions
        const img = new Image();
        img.onload = () => {
            setImageSize({
                width: img.naturalWidth,
                height: img.naturalHeight
            });
        };
        img.src = templateUrl;
    }, [templateUrl]);

    if (!templateUrl) {
        return (
            <div className="text-center text-white py-10">
                <i className="pi pi-image text-4xl mb-2 opacity-50"></i>
                <p>No template selected</p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* The ACTUAL template image */}
            <img
                src={templateUrl}
                alt="Template Preview"
                className="max-w-full h-auto rounded-lg shadow-lg"
            />

            {/* Overlay coordinates - 1:1 mapping */}
            <div className="absolute top-0 left-0 w-full h-full">
                {/* Photo area */}
                {coordinates.photo && (
                    <div
                        className="absolute border-2 border-green-400 rounded-lg overflow-hidden"
                        style={{
                            left: coordinates.photo.x,
                            top: coordinates.photo.y,
                            width: coordinates.photo.width,
                            height: coordinates.photo.height,
                            backgroundColor: 'rgba(0, 255, 0, 0.1)'
                        }}
                    >
                        {displayStudent.photo_url ? (
                            <img
                                src={displayStudent.photo_url}
                                alt="Student"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-green-500 bg-opacity-20">
                                <i className="pi pi-user text-white"></i>
                            </div>
                        )}
                    </div>
                )}

                {/* Text fields - SIMPLE */}
                {Object.entries(coordinates).map(([field, coord]) => {
                    if (field === 'photo') return null;

                    const studentValue = displayStudent[field] || field.replace('_', ' ');

                    return (
                        <div
                            key={field}
                            className="absolute bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm font-medium"
                            style={{
                                left: coord.x,
                                top: coord.y,
                                maxWidth: coord.maxWidth || 'auto'
                            }}
                        >
                            {studentValue}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const FixedSizeTemplatePreview = ({ template, coordinates, student }) => {
    const containerRef = useRef(null);
    const [previewScale, setPreviewScale] = useState(1);
    const [containerSize, setContainerSize] = useState({ width: 800, height: 450 });
    const [imageLoaded, setImageLoaded] = useState(false);
    const [generationScale, setGenerationScale] = useState(0.7083); // 850/1200

    const displayStudent = student || {};

    const templateUrl = template?.frontSide?.secure_url ||
        template?.frontSide?.url ||
        template?.frontSide?.filepath;

    useEffect(() => {
        // Preview container size (800×450)
        const previewWidth = 800;
        const previewHeight = 450;

        setContainerSize({
            width: previewWidth,
            height: previewHeight
        });

        // Preview scale: 800/1200 = 0.6667
        // Generation scale: 850/1200 = 0.7083
        const previewScaleFactor = previewWidth / 1200;
        setPreviewScale(previewScaleFactor);

        console.log('📐 Scaling info:', {
            preview: `${previewScaleFactor.toFixed(4)} (800/1200)`,
            generation: `${generationScale.toFixed(4)} (850/1200)`,
            previewSize: `${previewWidth}×${previewHeight}`
        });
    }, []);

    const renderCoordinate = (field, coord) => {
        if (!coord || coord.x === undefined) return null;

        const studentValue = displayStudent[field] ||
            (field === 'academic_year' ? '2024' :
                field === 'name' ? 'Student Name' :
                    field.charAt(0).toUpperCase() + field.slice(1));

        // Scale coordinates for preview (0.6667 scale)
        const scaledX = coord.x * previewScale;
        const scaledY = coord.y * previewScale;
        const scaledWidth = coord.width ? coord.width * previewScale : 'auto';
        const scaledHeight = coord.height ? coord.height * previewScale : 'auto';
        const scaledMaxWidth = coord.maxWidth ? coord.maxWidth * previewScale : 'auto';

        const styles = {
            position: 'absolute',
            left: `${scaledX}px`,
            top: `${scaledY}px`,
            maxWidth: `${scaledMaxWidth}px`
        };

        if (field === 'photo') {
            return (
                <div
                    key="photo"
                    className="absolute border-2 border-emerald-400 rounded-lg overflow-hidden bg-emerald-500 bg-opacity-20"
                    style={{
                        ...styles,
                        width: `${scaledWidth}px`,
                        height: `${scaledHeight}px`
                    }}
                >
                    {displayStudent.photo_url ? (
                        <img
                            src={displayStudent.photo_url}
                            alt="Student"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <i className="pi pi-user text-white text-lg"></i>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div
                key={field}
                className="absolute bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm font-medium whitespace-nowrap"
                style={styles}
            >
                {studentValue}
            </div>
        );
    };

    if (!templateUrl) {
        return (
            <div className="flex items-center justify-center h-full text-white">
                <div className="text-center">
                    <i className="pi pi-image text-4xl mb-4 opacity-50"></i>
                    <p>No template selected</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-center">
            <div
                ref={containerRef}
                className="relative bg-gray-800 rounded-lg overflow-hidden"
                style={{
                    width: `${containerSize.width}px`,
                    height: `${containerSize.height}px`
                }}
            >
                <img
                    src={templateUrl}
                    alt="Template Preview"
                    className="w-full h-full object-contain"
                    onLoad={() => setImageLoaded(true)}
                />

                {imageLoaded && (
                    <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 text-center">
                        📏 Preview: 800×450px (scale: {previewScale.toFixed(3)}) |
                        🎨 Final: 850×478px (scale: {generationScale.toFixed(3)})
                    </div>
                )}

                <div className="absolute inset-0">
                    {Object.entries(coordinates).map(([field, coord]) =>
                        renderCoordinate(field, coord)
                    )}
                </div>
            </div>
        </div>
    );
};


// ✅ FIXED: WorkflowStep with disabled state
const WorkflowStep = ({ step, title, description, active, completed, icon, onClick, disabled = false }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`text-left p-4 rounded-2xl border-2 transition-all duration-300 ${active
            ? 'border-emerald-500 bg-emerald-50 shadow-lg'
            : completed
                ? 'border-green-400 bg-green-50'
                : disabled
                    ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50'
                    : 'border-gray-200 bg-white hover:border-emerald-300'
            }`}
    >
        <div className="flex items-center space-x-3 mb-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${active
                ? 'bg-emerald-500 text-white'
                : completed
                    ? 'bg-green-500 text-white'
                    : disabled
                        ? 'bg-gray-300 text-gray-600'
                        : 'bg-gray-200 text-gray-600'
                }`}>
                {completed ? <i className="pi pi-check text-xs"></i> : step}
            </div>
            <i className={`pi ${icon} ${active ? 'text-emerald-600' :
                completed ? 'text-green-600' :
                    disabled ? 'text-gray-400' : 'text-gray-400'
                }`}></i>
        </div>
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className={`text-xs ${active ? 'text-emerald-600' :
            completed ? 'text-green-600' :
                disabled ? 'text-gray-400' : 'text-gray-500'
            }`}>
            {description}
        </div>
    </button>
);



//File Upload
// ✅ FIXED: FileUploadCard component with working file selection
const FileUploadCard = ({ title, description, accept, icon, color, note, onFileSelect }) => {
    const [selectedFile, setSelectedFile] = useState(null);

    const colorClasses = {
        emerald: 'bg-emerald-500',
        blue: 'bg-blue-500',
        purple: 'bg-purple-500'
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            onFileSelect(file);
        }
    };

    return (
        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 hover:border-emerald-400 transition-all duration-300">
            <div className="text-center space-y-3">
                <div className={`w-16 h-16 ${colorClasses[color]} rounded-2xl flex items-center justify-center mx-auto`}>
                    <i className={`pi ${icon} text-white text-2xl`}></i>
                </div>
                <div>
                    <p className="font-semibold text-gray-900">{title}</p>
                    <p className="text-sm text-gray-600 mt-1">{description}</p>
                    {note && <p className="text-xs text-emerald-600 mt-1">{note}</p>}
                </div>

                <div>
                    <input
                        type="file"
                        accept={accept}
                        className="hidden"
                        id={`file-${title}`}
                        onChange={handleFileSelect}
                    />

                    <label
                        htmlFor={`file-${title}`}
                        className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors duration-200"
                    >
                        {selectedFile ? `Change ${selectedFile.name}` : 'Choose File'}
                    </label>

                    {selectedFile && (
                        <div className="mt-2 p-2 bg-emerald-50 rounded-lg">
                            <p className="text-xs text-emerald-800 font-medium truncate">
                                ✓ {selectedFile.name}
                            </p>
                            <p className="text-xs text-emerald-600">
                                {(selectedFile.size / 1024).toFixed(0)} KB
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const CoordinateControl = ({ field, coordinates, onChange }) => (
    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
        <p className="font-medium text-gray-900 capitalize mb-3">{field.replace('_', ' ')}</p>
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="text-xs text-gray-600 mb-1 block">X Position</label>
                <input
                    type="number"
                    value={coordinates.x}
                    onChange={(e) => onChange(field, 'x', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
            </div>
            <div>
                <label className="text-xs text-gray-600 mb-1 block">Y Position</label>
                <input
                    type="number"
                    value={coordinates.y}
                    onChange={(e) => onChange(field, 'y', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
            </div>
        </div>
    </div>
);

//Process Step
const ProcessStep = ({ onGenerate, generationStatus, batchInfo, mode, student, realProgress }) => (
    <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">
            {mode === 'batch' ? 'Generate ID Cards' : 'Generate Single Card'}
        </h3>

        {/* Show real progress for batch mode */}
        {mode === 'batch' && generationStatus === 'processing' && realProgress && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <RealProgressDisplay progress={realProgress} />
            </div>
        )}


        {mode === 'single' && student && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                    <i className="pi pi-info-circle text-blue-600 text-lg"></i>
                    <div>
                        <p className="font-medium text-blue-800">Ready to Generate</p>
                        <p className="text-sm text-blue-700">
                            {student.name} ({student.student_id})
                        </p>
                        {student.card_generated && (
                            <p className="text-xs text-blue-600 mt-1">
                                ⚠️ This student already has {student.card_generation_count} card(s)
                            </p>
                        )}
                    </div>
                </div>
            </div>
        )}



        <div className="text-center space-y-4">
            <button
                onClick={onGenerate}
                disabled={generationStatus === 'processing' || (mode === 'single' && !student)}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {generationStatus === 'processing' ? (
                    <span className="flex items-center justify-center">
                        <i className="pi pi-spinner pi-spin mr-3"></i>
                        Processing...
                    </span>
                ) : (
                    <span className="flex items-center justify-center">
                        <i className="pi pi-play mr-3"></i>
                        {mode === 'batch' ? 'Start Batch Generation' : 'Generate Card'}
                    </span>
                )}
            </button>
        </div>
    </div>
);

//Status Item
const StatusItem = ({ label, value, valueClass, icon }) => (
    <div className="flex items-center justify-between py-2">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="flex items-center space-x-2">
            <span className={`text-sm font-medium capitalize ${valueClass}`}>{value}</span>
            <i className={`pi ${icon} ${valueClass}`}></i>
        </span>
    </div>
);

//Photo Modal
const PhotoUploadModal = ({ student, onPhotoSave, onCancel, uploadedPhoto, setUploadedPhoto, uploadStatus }) => {
    const [photoPreview, setPhotoPreview] = useState(null);

    // Handle photo selection with preview
    const handlePhotoSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUploadedPhoto(file);
            // Create preview URL
            const previewUrl = URL.createObjectURL(file);
            setPhotoPreview(previewUrl);
        }
    };

    // Clean up preview URL when component unmounts
    useEffect(() => {
        return () => {
            if (photoPreview) {
                URL.revokeObjectURL(photoPreview);
            }
        };
    }, [photoPreview]);

    const getUploadButtonText = () => {
        switch (uploadStatus) {
            case 'uploading':
                return (
                    <>
                        <i className="pi pi-spinner pi-spin mr-2"></i>
                        Uploading...
                    </>
                );
            case 'error':
                return (
                    <>
                        <i className="pi pi-exclamation-triangle mr-2"></i>
                        Try Again
                    </>
                );
            default:
                return (
                    <>
                        <i className="pi pi-save mr-2"></i>
                        Save Photo
                    </>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                <div className="text-center mb-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${uploadStatus === 'error' ? 'bg-red-500' : 'bg-amber-500'
                        }`}>
                        <i className={`pi pi-camera text-white text-2xl ${uploadStatus === 'uploading' ? 'pi-spin' : ''
                            }`}></i>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                        {uploadStatus === 'uploading' ? 'Uploading Photo...' : 'Photo Required'}
                    </h3>
                    <p className="text-gray-600 mt-2">
                        {student.name} ({student.student_id}) needs a photo for ID card
                    </p>
                </div>

                {/* Photo Preview Section */}
                {uploadedPhoto && photoPreview && (
                    <div className="mb-4 text-center">
                        <p className="text-sm font-medium text-gray-700 mb-2">Photo Preview:</p>
                        <div className="w-32 h-32 mx-auto border-2 border-emerald-200 rounded-xl overflow-hidden bg-gray-100">
                            <img
                                src={photoPreview}
                                alt="Preview"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <p className="text-xs text-emerald-600 mt-1 truncate">
                            {uploadedPhoto.name}
                        </p>
                    </div>
                )}

                {/* Upload Area */}
                <div className={`border-2 border-dashed rounded-2xl p-6 text-center mb-6 transition-colors ${uploadedPhoto ? 'border-emerald-300 bg-emerald-50' : 'border-gray-300 bg-gray-50'
                    }`}>
                    <input
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={handlePhotoSelect}
                        className="hidden"
                        id="student-photo-upload"
                        disabled={uploadStatus === 'uploading'}
                    />
                    <label
                        htmlFor="student-photo-upload"
                        className={`inline-flex items-center px-6 py-3 rounded-xl font-medium cursor-pointer transition-colors ${uploadStatus === 'uploading'
                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                            : 'bg-emerald-500 text-white hover:bg-emerald-600'
                            }`}
                    >
                        <i className="pi pi-cloud-upload mr-2"></i>
                        {uploadedPhoto ? 'Change Photo' : 'Choose Photo'}
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                        Supports JPG, JPEG, PNG • Max 5MB
                    </p>
                </div>

                {/* Error Message */}
                {uploadStatus === 'error' && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                        <div className="flex items-center space-x-2">
                            <i className="pi pi-exclamation-circle text-red-500"></i>
                            <p className="text-sm text-red-700">Upload failed. Please try again.</p>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3">
                    <button
                        onClick={onCancel}
                        disabled={uploadStatus === 'uploading'}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                        <i className="pi pi-times mr-2"></i>
                        Cancel
                    </button>
                    <button
                        onClick={onPhotoSave}
                        disabled={!uploadedPhoto || uploadStatus === 'uploading'}
                        className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-center ${!uploadedPhoto || uploadStatus === 'uploading'
                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                            : uploadStatus === 'error'
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-emerald-500 text-white hover:bg-emerald-600'
                            }`}
                    >
                        {getUploadButtonText()}
                    </button>
                </div>
            </div>
        </div>
    );
};
// to show real-time progress
const RealProgressDisplay = ({ progress }) => {
    if (!progress || progress.status === 'idle') return null;

    const getStatusColor = (status) => {
        switch (status) {
            case 'starting': return 'text-blue-600';
            case 'parsing_csv': return 'text-purple-600';
            case 'uploading_photos': return 'text-indigo-600';
            case 'generating_cards': return 'text-emerald-600';
            case 'finalizing': return 'text-green-600';
            case 'completed': return 'text-green-600';
            case 'error': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <p className="font-medium text-gray-900">Real-time Progress</p>
                    <p className={`text-sm font-medium ${getStatusColor(progress.status)}`}>
                        {progress.status.replace('_', ' ').toUpperCase()}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600">{progress.percentage}%</p>
                    <p className="text-xs text-gray-500">
                        {progress.processed} of {progress.total} students
                    </p>
                </div>
            </div>

            {/* Detailed progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                    className="bg-gradient-to-r from-blue-500 via-emerald-500 to-green-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                ></div>
            </div>

            {/* Current student info */}
            {progress.currentStudent && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-800">Currently Processing:</p>
                            <p className="text-sm text-blue-700">
                                {progress.currentStudent.name} ({progress.currentStudent.id})
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-blue-600">
                                {progress.currentStudent.index}/{progress.currentStudent.total}
                            </p>
                            <p className="text-xs text-blue-500">
                                Card #{progress.generated}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                    <div className="text-xl font-bold text-emerald-600">{progress.generated}</div>
                    <div className="text-xs text-gray-600">Cards Generated</div>
                </div>
                <div className="text-center">
                    <div className="text-xl font-bold text-blue-600">{progress.processed}</div>
                    <div className="text-xs text-gray-600">Students Processed</div>
                </div>
                <div className="text-center">
                    <div className="text-xl font-bold text-red-600">{progress.failed}</div>
                    <div className="text-xs text-gray-600">Failed</div>
                </div>
            </div>

            {/* Estimated time */}
            {progress.duration && (
                <div className="text-center text-sm text-gray-500">
                    Process completed in {progress.duration.toFixed(1)} seconds
                </div>
            )}
        </div>
    );
};



export default CardGeneration;