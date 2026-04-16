// routes/audit.js
const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Get audit logs with filtering
router.get('/logs', 
    authMiddleware, 
    roleMiddleware(['super_admin', 'admin']),
    async (req, res) => {
        try {
            const {
                page = 1,
                limit = 50,
                action,
                userId,
                schoolId,
                status,
                importance,
                startDate,
                endDate,
                search
            } = req.query;

            const query = {};
            
            // Filter by school (admin only sees their school)
            if (req.user.role === 'admin') {
                query.schoolId = req.user.schoolId;
            } else if (schoolId) {
                query.schoolId = schoolId;
            }
            
            if (action) query.action = action;
            if (userId) query.userId = userId;
            if (status) query.status = status;
            if (importance) query.importance = importance;
            
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }
            
            // Text search
            if (search) {
                query.$or = [
                    { 'userInfo.email': new RegExp(search, 'i') },
                    { 'userInfo.name': new RegExp(search, 'i') },
                    { 'schoolInfo.name': new RegExp(search, 'i') },
                    { errorMessage: new RegExp(search, 'i') }
                ];
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const [logs, total] = await Promise.all([
                AuditLog.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit))
                    .populate('userId', 'firstName lastName email')
                    .populate('schoolId', 'name'),
                AuditLog.countDocuments(query)
            ]);

            // Get summary stats
            const stats = await AuditLog.getStats({
                schoolId: query.schoolId,
                days: 30
            });

            res.json({
                success: true,
                logs,
                stats,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            });

        } catch (error) {
            console.error('Audit view error:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// Get audit trail for specific entity
router.get('/trail/:model/:id',
    authMiddleware,
    roleMiddleware(['super_admin', 'admin']),
    async (req, res) => {
        try {
            const { model, id } = req.params;
            
            const logs = await AuditLog.getAuditTrail(id, model, {
                limit: req.query.limit || 100,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            });

            res.json({
                success: true,
                logs,
                entityId: id,
                entityModel: model
            });

        } catch (error) {
            console.error('Audit trail error:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// Get user activity
router.get('/user/:userId',
    authMiddleware,
    roleMiddleware(['super_admin', 'admin']),
    async (req, res) => {
        try {
            const activity = await AuditLog.getUserActivity(req.params.userId, {
                limit: req.query.limit || 50,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            });

            res.json({
                success: true,
                activity
            });

        } catch (error) {
            console.error('User activity error:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// Get school activity summary
router.get('/school/:schoolId/summary',
    authMiddleware,
    roleMiddleware(['super_admin', 'admin']),
    async (req, res) => {
        try {
            const summary = await AuditLog.getSchoolActivity(req.params.schoolId, {
                days: req.query.days || 30,
                groupBy: req.query.groupBy || 'day'
            });

            res.json({
                success: true,
                summary
            });

        } catch (error) {
            console.error('School summary error:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

module.exports = router;