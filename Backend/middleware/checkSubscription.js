// middleware/checkSubscription.js
const SubscriptionService = require('../services/subscriptionService');

const checkSubscription = async (req, res, next) => {
    // Skip for super_admin
    if (req.user.role === 'super_admin') {
        return next();
    }

    // Skip for auth routes
    if (req.path.startsWith('/auth/')) {
        return next();
    }

    try {
        const status = await SubscriptionService.checkSchoolSubscription(req.user.schoolId);
        
        if (!status || !status.isValid) {
            return res.status(403).json({
                success: false,
                error: 'Subscription expired',
                requiresSubscription: true,
                subscription: status
            });
        }

        // Add subscription info to request
        req.subscription = status;
        
        // Warn if less than 7 days left (frontend can show banner)
        if (status.daysRemaining <= 7) {
            res.set('X-Subscription-Warning', `Your subscription expires in ${status.daysRemaining} days`);
        }

        next();
    } catch (error) {
        console.error('Subscription check error:', error);
        next();
    }
};

module.exports = checkSubscription;
