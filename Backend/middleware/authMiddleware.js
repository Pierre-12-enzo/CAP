// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token, authorization denied'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add school population for better performance
        const user = await User.findById(decoded.id)
            .select('-password')
            .populate('schoolId');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Token is not valid'
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is deactivated. Contact support.'
            });
        }
        
        // ✅ Store BOTH versions
        req.user = user;                    // For frontend (has populated school)
        req.userId = user._id;               // Just the ID
        req.schoolId = user.schoolId?._id;
        req.userRole = user.role;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({
            success: false,
            message: 'Token is not valid'
        });
    }
};

module.exports = authMiddleware;