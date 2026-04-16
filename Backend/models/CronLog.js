// models/CronLog.js
const mongoose = require('mongoose');

const cronLogSchema = new mongoose.Schema({
    jobName: { type: String, required: true },
    status: { type: String, enum: ['success', 'failed'], required: true },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    duration: Number,
    error: String,
    details: mongoose.Schema.Types.Mixed,
    metadata: {
        schoolsProcessed: Number,
        emailsSent: Number,
        subscriptionsAffected: Number
    }
}, { timestamps: true });

cronLogSchema.index({ jobName: 1, createdAt: -1 });

module.exports = mongoose.model('CronLog', cronLogSchema);
