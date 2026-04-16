// models/Template.js - FIXED FOR CLOUDINARY
const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    frontSide: {
        filename: { type: String, required: true },
        filepath: { type: String, required: true },
        url: { type: String },
        secure_url: { type: String },
        public_id: { type: String }
    },
    backSide: {
        filename: { type: String, required: true },
        filepath: { type: String, required: true },
        url: { type: String },
        secure_url: { type: String },
        public_id: { type: String }
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Template', templateSchema);