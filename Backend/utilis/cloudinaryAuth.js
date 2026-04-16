const cloudinary = require('cloudinary').v2;

// Configure Cloudinary (if not already configured elsewhere)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a single image to Cloudinary (for avatars, logos, etc.)
 * @param {string} imageData - Base64 image data or file path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Cloudinary upload result
 */
async function uploadImage(imageData, options = {}) {
    try {
        const defaultOptions = {
            folder: 'cap/users', // Default folder
            overwrite: true,
            timeout: 30000,
            transformation: [
                { width: 300, height: 300, crop: "limit" }, // Limit size
                { quality: "auto:good" }
            ]
        };

        const uploadOptions = { ...defaultOptions, ...options };
        
        const result = await cloudinary.uploader.upload(imageData, uploadOptions);
        
        return {
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes
        };
    } catch (error) {
        console.error('❌ Cloudinary upload error:', error);
        throw new Error(`Image upload failed: ${error.message}`);
    }
}

/**
 * Upload user avatar
 * @param {string} imageData - Base64 image
 * @param {string} userId - User ID for naming
 * @returns {Promise<Object>} Upload result
 */
async function uploadAvatar(imageData, userId) {
    return uploadImage(imageData, {
        folder: 'cap/users/avatars',
        public_id: `avatar-${userId}-${Date.now()}`,
        transformation: [
            { width: 150, height: 150, crop: "thumb", gravity: "face" },
            { quality: "auto:best" }
        ]
    });
}

/**
 * Upload school logo
 * @param {string} imageData - Base64 image
 * @param {string} schoolId - School ID for naming
 * @returns {Promise<Object>} Upload result
 */
async function uploadSchoolLogo(imageData, schoolId) {
    return uploadImage(imageData, {
        folder: 'cap/schools/logos',
        public_id: `logo-${schoolId}-${Date.now()}`,
        transformation: [
            { width: 200, height: 200, crop: "limit" },
            { quality: "auto" }
        ]
    });
}

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public_id
 * @returns {Promise<boolean>} Success status
 */
async function deleteImage(publicId) {
    try {
        if (!publicId) return false;
        
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === 'ok';
    } catch (error) {
        console.error('❌ Cloudinary delete error:', error);
        return false;
    }
}

/**
 * Extract public_id from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} public_id
 */
function extractPublicIdFromUrl(url) {
    if (!url) return null;
    
    // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/image.jpg
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)\./);
    return matches ? matches[1] : null;
}

module.exports = {
    uploadImage,
    uploadAvatar,
    uploadSchoolLogo,
    deleteImage,
    extractPublicIdFromUrl
};