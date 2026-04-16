// models/RegistrationProgress.js
const mongoose = require('mongoose');

const registrationProgressSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true,
        lowercase: true,
        unique: true
    },
    step: { 
        type: Number, 
        default: 1 
    },
    data: {
        personal: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        school: {
            type: mongoose.Schema.Types.Mixed,  // 👈 This should be Mixed, not String
            default: {}
        },
        plan: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        payment: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    expiresAt: { 
        type: Date, 
        default: () => new Date(+new Date() + 24*60*60*1000),
        index: { expires: 0 }
    }
}, { timestamps: true });

module.exports = mongoose.model('RegistrationProgress', registrationProgressSchema);