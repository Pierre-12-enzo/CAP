// routes/plans.js
const express = require('express');
const router = express.Router();
const Plan = require('../models/Plans');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const AuditLog = require('../models/AuditLog');

// ============================================
// PUBLIC PLANS ROUTES
// ============================================

/**
 * @desc    Get all active plans (public)
 * @route   GET /api/plans
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { type, includeInactive } = req.query;
    
    const query = {};
    
    // Filter by type if provided
    if (type) query.type = type;
    
    // Only show active plans unless explicitly requested otherwise
    if (includeInactive !== 'true') {
      query.isActive = true;
    }

    const plans = await Plan.find(query)
      .sort({ sortOrder: 1, 'price.monthly': 1 });

    res.json({
      success: true,
      count: plans.length,
      plans
    });

  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @desc    Get single plan by ID
 * @route   GET /api/plans/:id
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    res.json({
      success: true,
      plan
    });

  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @desc    Get plan by code (TRIAL, BASIC, PRO, ENTERPRISE)
 * @route   GET /api/plans/code/:code
 * @access  Public
 */
router.get('/code/:code', async (req, res) => {
  try {
    const plan = await Plan.findOne({ 
      code: req.params.code.toUpperCase(),
      isActive: true 
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    res.json({
      success: true,
      plan
    });

  } catch (error) {
    console.error('Get plan by code error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @desc    Compare plans
 * @route   GET /api/plans/compare
 * @access  Public
 */
router.get('/compare/all', async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true })
      .sort({ sortOrder: 1 });

    // Format for comparison view
    const comparison = {
      headers: plans.map(p => ({ name: p.name, code: p.code, popular: p.isPopular })),
      features: {
        // Student limits
        students: plans.map(p => p.limits.maxStudents === -1 ? 'Unlimited' : p.limits.maxStudents),
        staff: plans.map(p => p.limits.maxStaff === -1 ? 'Unlimited' : p.limits.maxStaff),
        templates: plans.map(p => p.limits.maxTemplates === -1 ? 'Unlimited' : p.limits.maxTemplates),
        cards: plans.map(p => p.limits.maxCards === -1 ? 'Unlimited' : p.limits.maxCards),
        storage: plans.map(p => `${p.limits.storageMB}MB`),
        
        // Feature flags
        apiAccess: plans.map(p => p.limits.canUseAPI ? '✓' : '✗'),
        advancedAnalytics: plans.map(p => p.limits.hasAdvancedAnalytics ? '✓' : '✗'),
        prioritySupport: plans.map(p => p.limits.hasPrioritySupport ? '✓' : '✗'),
        customBranding: plans.map(p => p.limits.canCustomizeCards ? '✓' : '✗'),
        exportData: plans.map(p => p.limits.canExportData ? '✓' : '✗'),
        
        // Pricing
        monthlyPrice: plans.map(p => p.price.monthly === 0 ? 'Free' : `$${p.price.monthly}`),
        yearlyPrice: plans.map(p => p.price.yearly === 0 ? 'Free' : `$${p.price.yearly}`)
      }
    };

    res.json({
      success: true,
      comparison
    });

  } catch (error) {
    console.error('Compare plans error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ADMIN PLANS ROUTES (Super Admin only)
// ============================================

/**
 * @desc    Create new plan
 * @route   POST /api/plans
 * @access  Super Admin
 */
router.post('/', 
  authMiddleware, 
  roleMiddleware(['super_admin']), 
  async (req, res) => {
    try {
      const {
        name,
        code,
        type,
        price,
        trialDays,
        features,
        limits,
        isPopular,
        sortOrder,
        description,
        badgeText
      } = req.body;

      // Check if plan with same code exists
      const existingPlan = await Plan.findOne({ code: code.toUpperCase() });
      if (existingPlan) {
        return res.status(400).json({
          success: false,
          error: 'Plan with this code already exists'
        });
      }

      const plan = await Plan.create({
        name,
        code: code.toUpperCase(),
        type,
        price,
        trialDays: type === 'trial' ? trialDays : undefined,
        features,
        limits,
        isPopular: isPopular || false,
        sortOrder: sortOrder || 0,
        description,
        badgeText,
        isActive: true
      });

      // Log the action
      await AuditLog.create({
        userId: req.user._id,
        action: 'CREATE_PLAN',
        details: {
          planId: plan._id,
          planName: plan.name,
          planCode: plan.code
        },
        importance: 'high'
      });

      res.status(201).json({
        success: true,
        message: 'Plan created successfully',
        plan
      });

    } catch (error) {
      console.error('Create plan error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @desc    Update plan
 * @route   PUT /api/plans/:id
 * @access  Super Admin
 */
router.put('/:id', 
  authMiddleware, 
  roleMiddleware(['super_admin']), 
  async (req, res) => {
    try {
      const {
        name,
        price,
        trialDays,
        features,
        limits,
        isPopular,
        isActive,
        sortOrder,
        description,
        badgeText
      } = req.body;

      const plan = await Plan.findById(req.params.id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      // Store old values for audit
      const oldValues = {
        name: plan.name,
        price: plan.price,
        isActive: plan.isActive,
        isPopular: plan.isPopular
      };

      // Update fields
      if (name) plan.name = name;
      if (price) plan.price = price;
      if (trialDays !== undefined) plan.trialDays = trialDays;
      if (features) plan.features = features;
      if (limits) plan.limits = limits;
      if (isPopular !== undefined) plan.isPopular = isPopular;
      if (isActive !== undefined) plan.isActive = isActive;
      if (sortOrder !== undefined) plan.sortOrder = sortOrder;
      if (description) plan.description = description;
      if (badgeText) plan.badgeText = badgeText;

      await plan.save();

      // Log the action
      await AuditLog.create({
        userId: req.user._id,
        action: 'UPDATE_PLAN',
        details: {
          planId: plan._id,
          planName: plan.name,
          changes: {
            from: oldValues,
            to: {
              name: plan.name,
              price: plan.price,
              isActive: plan.isActive,
              isPopular: plan.isPopular
            }
          }
        },
        importance: 'high'
      });

      res.json({
        success: true,
        message: 'Plan updated successfully',
        plan
      });

    } catch (error) {
      console.error('Update plan error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @desc    Delete plan (soft delete by deactivating)
 * @route   DELETE /api/plans/:id
 * @access  Super Admin
 */
router.delete('/:id', 
  authMiddleware, 
  roleMiddleware(['super_admin']), 
  async (req, res) => {
    try {
      const { permanent } = req.query;
      
      const plan = await Plan.findById(req.params.id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      // Check if any active subscriptions use this plan
      const Subscription = require('../models/Subscription');
      const activeSubscriptions = await Subscription.countDocuments({
        planId: plan._id,
        status: { $in: ['active', 'trial'] }
      });

      if (activeSubscriptions > 0 && !permanent) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete plan with ${activeSubscriptions} active subscriptions. Deactivate it instead.`
        });
      }

      if (permanent === 'true') {
        // Permanent delete (use with caution!)
        await Plan.findByIdAndDelete(plan._id);
        
        await AuditLog.create({
          userId: req.user._id,
          action: 'DELETE_PLAN_PERMANENT',
          details: {
            planId: plan._id,
            planName: plan.name,
            planCode: plan.code
          },
          importance: 'critical'
        });

        res.json({
          success: true,
          message: 'Plan permanently deleted'
        });
      } else {
        // Soft delete (deactivate)
        plan.isActive = false;
        await plan.save();

        await AuditLog.create({
          userId: req.user._id,
          action: 'DEACTIVATE_PLAN',
          details: {
            planId: plan._id,
            planName: plan.name
          },
          importance: 'high'
        });

        res.json({
          success: true,
          message: 'Plan deactivated successfully'
        });
      }

    } catch (error) {
      console.error('Delete plan error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @desc    Toggle plan popularity
 * @route   PATCH /api/plans/:id/toggle-popular
 * @access  Super Admin
 */
router.patch('/:id/toggle-popular', 
  authMiddleware, 
  roleMiddleware(['super_admin']), 
  async (req, res) => {
    try {
      const plan = await Plan.findById(req.params.id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      // If setting this as popular, remove popular from others
      if (!plan.isPopular) {
        await Plan.updateMany(
          { _id: { $ne: plan._id } },
          { isPopular: false }
        );
      }

      plan.isPopular = !plan.isPopular;
      await plan.save();

      await AuditLog.create({
        userId: req.user._id,
        action: 'TOGGLE_PLAN_POPULAR',
        details: {
          planId: plan._id,
          planName: plan.name,
          isPopular: plan.isPopular
        },
        importance: 'medium'
      });

      res.json({
        success: true,
        message: `Plan ${plan.isPopular ? 'marked as popular' : 'removed from popular'}`,
        plan
      });

    } catch (error) {
      console.error('Toggle plan popular error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @desc    Reorder plans
 * @route   POST /api/plans/reorder
 * @access  Super Admin
 */
router.post('/reorder', 
  authMiddleware, 
  roleMiddleware(['super_admin']), 
  async (req, res) => {
    try {
      const { order } = req.body; // Array of { id, sortOrder }

      if (!Array.isArray(order)) {
        return res.status(400).json({
          success: false,
          error: 'Order must be an array'
        });
      }

      // Update each plan's sort order
      const updates = order.map(item => 
        Plan.findByIdAndUpdate(item.id, { sortOrder: item.sortOrder })
      );

      await Promise.all(updates);

      await AuditLog.create({
        userId: req.user._id,
        action: 'REORDER_PLANS',
        details: { order },
        importance: 'medium'
      });

      res.json({
        success: true,
        message: 'Plans reordered successfully'
      });

    } catch (error) {
      console.error('Reorder plans error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @desc    Duplicate plan
 * @route   POST /api/plans/:id/duplicate
 * @access  Super Admin
 */
router.post('/:id/duplicate', 
  authMiddleware, 
  roleMiddleware(['super_admin']), 
  async (req, res) => {
    try {
      const sourcePlan = await Plan.findById(req.params.id);
      if (!sourcePlan) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      // Create duplicate with new name and code
      const duplicateData = sourcePlan.toObject();
      delete duplicateData._id;
      delete duplicateData.createdAt;
      delete duplicateData.updatedAt;
      
      duplicateData.name = `${sourcePlan.name} (Copy)`;
      duplicateData.code = `${sourcePlan.code}_COPY_${Date.now()}`;
      duplicateData.isPopular = false;
      duplicateData.sortOrder = sourcePlan.sortOrder + 1;

      const newPlan = await Plan.create(duplicateData);

      await AuditLog.create({
        userId: req.user._id,
        action: 'DUPLICATE_PLAN',
        details: {
          sourcePlanId: sourcePlan._id,
          sourcePlanName: sourcePlan.name,
          newPlanId: newPlan._id,
          newPlanName: newPlan.name
        },
        importance: 'medium'
      });

      res.status(201).json({
        success: true,
        message: 'Plan duplicated successfully',
        plan: newPlan
      });

    } catch (error) {
      console.error('Duplicate plan error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @desc    Get plan statistics
 * @route   GET /api/plans/stats/overview
 * @access  Super Admin
 */
router.get('/stats/overview', 
  authMiddleware, 
  roleMiddleware(['super_admin']), 
  async (req, res) => {
    try {
      const Subscription = require('../models/Subscription');

      const plans = await Plan.find({});
      
      const stats = await Promise.all(plans.map(async (plan) => {
        const totalSubscriptions = await Subscription.countDocuments({ planId: plan._id });
        const activeSubscriptions = await Subscription.countDocuments({ 
          planId: plan._id,
          status: { $in: ['active', 'trial'] }
        });
        
        // Calculate revenue (simplified)
        const subscriptions = await Subscription.find({ 
          planId: plan._id,
          status: 'active'
        });
        
        const monthlyRevenue = subscriptions.reduce((sum, sub) => {
          return sum + (plan.price.monthly || 0);
        }, 0);

        return {
          planId: plan._id,
          planName: plan.name,
          planCode: plan.code,
          totalSubscriptions,
          activeSubscriptions,
          monthlyRevenue,
          isActive: plan.isActive
        };
      }));

      res.json({
        success: true,
        stats
      });

    } catch (error) {
      console.error('Get plan stats error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

module.exports = router;