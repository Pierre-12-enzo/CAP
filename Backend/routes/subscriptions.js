// routes/subscriptions.js
const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const School = require('../models/School');
const Plan = require('../models/Plans');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const AuditLog = require('../models/AuditLog');

// ============================================
// USER SUBSCRIPTION ROUTES
// ============================================

/**
 * @desc    Get current user's subscription
 * @route   GET /api/subscriptions/current
 * @access  Private
 */
router.get('/current', authMiddleware, async (req, res) => {
  try {
    let subscription;

    if (req.user.role === 'super_admin') {
      // Super admin doesn't have subscription
      return res.json({
        success: true,
        subscription: null,
        message: 'Super admin has no subscription'
      });
    }

    // For admin, get their school's subscription
    if (req.user.role === 'admin') {
      subscription = await Subscription.findOne({
        schoolId: req.user.schoolId,
        status: { $in: ['active', 'trial', 'expired'] }
      })
        .populate('planId')
        .populate('schoolId', 'name')
        .sort({ createdAt: -1 });
    }

    // For staff, get their school's subscription (read-only)
    if (req.user.role === 'staff') {
      subscription = await Subscription.findOne({
        schoolId: req.user.schoolId,
        status: { $in: ['active', 'trial', 'expired'] }
      })
        .populate('planId')
        .populate('schoolId', 'name')
        .select('-paymentMethod -invoices') // Hide sensitive data from staff
        .sort({ createdAt: -1 });
    }

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    // Get billing history (last 12 months)
    const billingHistory = subscription.invoices
      ?.filter(inv => inv.status === 'paid')
      .slice(-12)
      .map(inv => ({
        date: inv.paidAt || inv.createdAt,
        description: `${subscription.planId.name} Plan - ${inv.items?.[0]?.description || 'Monthly subscription'}`,
        amount: inv.amount,
        status: inv.status,
        invoiceNumber: inv.invoiceNumber
      })) || [];

    res.json({
      success: true,
      subscription: {
        id: subscription._id,
        status: subscription.status,
        plan: subscription.planId,
        billingCycle: subscription.planId?.price?.monthly ? 'monthly' : 'yearly',
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialStart: subscription.trialStart,
        trialEnd: subscription.trialEnd,
        daysRemaining: subscription.daysRemaining,
        isActive: subscription.isActive
      },
      billingHistory,
      school: subscription.schoolId
    });

  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


/**
 * @desc    Get billing history
 * @route   GET /api/subscriptions/billing/history
 * @access  Private
 */
router.get('/billing/history', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, year } = req.query;

    let subscription;
    if (req.user.role === 'admin') {
      subscription = await Subscription.findOne({ schoolId: req.user.schoolId });
    } else if (req.user.role === 'staff') {
      subscription = await Subscription.findOne({ schoolId: req.user.schoolId });
    } else if (req.user.role === 'super_admin' && req.query.schoolId) {
      subscription = await Subscription.findOne({ schoolId: req.query.schoolId });
    }

    if (!subscription) {
      return res.json({
        success: true,
        invoices: [],
        total: 0,
        page,
        totalPages: 0
      });
    }

    let invoices = subscription.invoices || [];

    // Filter by year if provided
    if (year) {
      invoices = invoices.filter(inv =>
        new Date(inv.createdAt).getFullYear() === parseInt(year)
      );
    }

    // Sort by date (newest first)
    invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedInvoices = invoices.slice(startIndex, endIndex);

    res.json({
      success: true,
      invoices: paginatedInvoices,
      total: invoices.length,
      page: parseInt(page),
      totalPages: Math.ceil(invoices.length / parseInt(limit))
    });

  } catch (error) {
    console.error('Get billing history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @desc    Get upcoming invoice
 * @route   GET /api/subscriptions/billing/upcoming
 * @access  Private
 */
router.get('/billing/upcoming', authMiddleware, async (req, res) => {
  try {
    let subscription;

    if (req.user.role === 'admin') {
      subscription = await Subscription.findOne({
        schoolId: req.user.schoolId,
        status: { $in: ['active', 'trial'] }
      }).populate('planId');
    }

    if (!subscription || subscription.status === 'trial') {
      return res.json({
        success: true,
        upcoming: null,
        message: subscription?.status === 'trial' ? 'Trial period - no upcoming invoice' : 'No active subscription'
      });
    }

    const upcomingInvoice = {
      amount: subscription.planId.price.monthly,
      currency: subscription.planId.price.currency || 'USD',
      dueDate: subscription.currentPeriodEnd,
      description: `${subscription.planId.name} Plan - Monthly subscription`,
      items: [
        {
          description: `${subscription.planId.name} Plan`,
          quantity: 1,
          unitPrice: subscription.planId.price.monthly,
          total: subscription.planId.price.monthly
        }
      ]
    };

    res.json({
      success: true,
      upcoming: upcomingInvoice
    });

  } catch (error) {
    console.error('Get upcoming invoice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @desc    Get invoice by ID
 * @route   GET /api/subscriptions/billing/invoice/:invoiceId
 * @access  Private
 */
router.get('/billing/invoice/:invoiceId', authMiddleware, async (req, res) => {
  try {
    let subscription;

    if (req.user.role === 'admin') {
      subscription = await Subscription.findOne({ schoolId: req.user.schoolId });
    } else if (req.user.role === 'staff') {
      subscription = await Subscription.findOne({ schoolId: req.user.schoolId });
    } else if (req.user.role === 'super_admin') {
      subscription = await Subscription.findOne({
        'invoices.invoiceNumber': req.params.invoiceId
      });
    }

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    const invoice = subscription.invoices.find(
      inv => inv.invoiceNumber === req.params.invoiceId
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      invoice: {
        ...invoice.toObject(),
        schoolName: subscription.schoolId?.name,
        schoolAddress: subscription.schoolId?.address
      }
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @desc    Download invoice PDF
 * @route   GET /api/subscriptions/billing/invoice/:invoiceId/download
 * @access  Private
 */
router.get('/billing/invoice/:invoiceId/download', authMiddleware, async (req, res) => {
  try {
    // This would generate a PDF invoice
    // For now, return a placeholder
    res.json({
      success: true,
      message: 'PDF generation would happen here',
      downloadUrl: `/api/subscriptions/billing/invoice/${req.params.invoiceId}/pdf`
    });

  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @desc    Update payment method
 * @route   POST /api/subscriptions/payment-method
 * @access  Private (Admin only)
 */
router.post('/payment-method',
  authMiddleware,
  roleMiddleware(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const { type, details } = req.body;

      if (!type || !details) {
        return res.status(400).json({
          success: false,
          error: 'Payment method type and details are required'
        });
      }

      let subscription;
      if (req.user.role === 'admin') {
        subscription = await Subscription.findOne({ schoolId: req.user.schoolId });
      }

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'No active subscription found'
        });
      }

      // Update payment method
      subscription.paymentMethod = {
        type,
        ...details,
        updatedAt: new Date()
      };

      await subscription.save();

      // Log the action
      await AuditLog.create({
        userId: req.user._id,
        schoolId: req.user.schoolId,
        action: 'UPDATE_PAYMENT_METHOD',
        details: { type },
        importance: 'high'
      });

      res.json({
        success: true,
        message: 'Payment method updated successfully',
        paymentMethod: subscription.paymentMethod
      });

    } catch (error) {
      console.error('Update payment method error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @desc    Get payment methods
 * @route   GET /api/subscriptions/payment-methods
 * @access  Private
 */
router.get('/payment-methods', authMiddleware, async (req, res) => {
  try {
    let subscription;

    if (req.user.role === 'admin') {
      subscription = await Subscription.findOne({ schoolId: req.user.schoolId });
    }

    if (!subscription || !subscription.paymentMethod) {
      return res.json({
        success: true,
        paymentMethods: []
      });
    }

    // Return as array for consistency
    const paymentMethods = [{
      id: 'default',
      type: subscription.paymentMethod.type,
      ...subscription.paymentMethod,
      isDefault: true
    }];

    res.json({
      success: true,
      paymentMethods
    });

  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @desc    Change plan
 * @route   POST /api/subscriptions/change-plan
 * @access  Private (Admin only)
 */
router.post('/change-plan',
  authMiddleware,
  roleMiddleware(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const { planId, billingCycle } = req.body;

      if (!planId) {
        return res.status(400).json({
          success: false,
          error: 'Plan ID is required'
        });
      }

      const plan = await Plan.findById(planId);
      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      let subscription;
      if (req.user.role === 'admin') {
        subscription = await Subscription.findOne({ schoolId: req.user.schoolId });
      }

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'No active subscription found'
        });
      }

      // Update subscription
      const oldPlanId = subscription.planId;
      subscription.planId = planId;
      subscription.status = 'active';

      // Calculate new period
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = periodEnd;

      await subscription.save();

      // Update user's subscription info
      await User.updateMany(
        { schoolId: req.user.schoolId, role: 'admin' },
        {
          'subscription.planId': planId,
          'subscription.status': 'active'
        }
      );

      // Log the action
      await AuditLog.create({
        userId: req.user._id,
        schoolId: req.user.schoolId,
        action: 'CHANGE_PLAN',
        details: {
          from: oldPlanId,
          to: planId,
          billingCycle
        },
        importance: 'high'
      });

      res.json({
        success: true,
        message: 'Plan changed successfully',
        subscription: {
          id: subscription._id,
          plan,
          currentPeriodEnd: subscription.currentPeriodEnd
        }
      });

    } catch (error) {
      console.error('Change plan error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @desc    Cancel subscription
 * @route   POST /api/subscriptions/cancel
 * @access  Private (Admin only)
 */
router.post('/cancel',
  authMiddleware,
  roleMiddleware(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const { reason } = req.body;

      let subscription;
      if (req.user.role === 'admin') {
        subscription = await Subscription.findOne({ schoolId: req.user.schoolId });
      }

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'No active subscription found'
        });
      }

      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date();
      subscription.cancellationReason = reason;

      // Keep access until end of period
      await subscription.save();

      // Update user
      await User.updateMany(
        { schoolId: req.user.schoolId, role: 'admin' },
        { 'subscription.status': 'cancelled' }
      );

      // Log the action
      await AuditLog.create({
        userId: req.user._id,
        schoolId: req.user.schoolId,
        action: 'CANCEL_SUBSCRIPTION',
        details: { reason },
        importance: 'critical'
      });

      res.json({
        success: true,
        message: 'Subscription cancelled successfully',
        validUntil: subscription.currentPeriodEnd
      });

    } catch (error) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @desc    Reactivate cancelled subscription
 * @route   POST /api/subscriptions/reactivate
 * @access  Private (Admin only)
 */
router.post('/reactivate',
  authMiddleware,
  roleMiddleware(['admin', 'super_admin']),
  async (req, res) => {
    try {
      let subscription;
      if (req.user.role === 'admin') {
        subscription = await Subscription.findOne({
          schoolId: req.user.schoolId,
          status: 'cancelled'
        });
      }

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'No cancelled subscription found'
        });
      }

      subscription.status = 'active';
      subscription.cancelledAt = null;
      subscription.cancellationReason = null;

      await subscription.save();

      // Update user
      await User.updateMany(
        { schoolId: req.user.schoolId, role: 'admin' },
        { 'subscription.status': 'active' }
      );

      // Log the action
      await AuditLog.create({
        userId: req.user._id,
        schoolId: req.user.schoolId,
        action: 'REACTIVATE_SUBSCRIPTION',
        importance: 'high'
      });

      res.json({
        success: true,
        message: 'Subscription reactivated successfully'
      });

    } catch (error) {
      console.error('Reactivate subscription error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @desc    Get available plans
 * @route   GET /api/subscriptions/plans
 * @access  Public
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true })
      .sort({ sortOrder: 1, price: 1 });

    res.json({
      success: true,
      plans
    });

  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @desc    Get usage statistics
 * @route   GET /api/subscriptions/usage
 * @access  Private
 */

router.get('/usage', authMiddleware, async (req, res) => {
  try {
    const Student = require('../models/Student');
    const User = require('../models/User');
    
    let usage = {
      students: { used: 0, limit: 0 },
      staff: { used: 0, limit: 0 },
      cards: { used: 0, limit: 0 },
      storage: { used: '0MB', limit: '0MB' }
    };

    if (req.user.role !== 'super_admin' && req.user.schoolId) {
      // Get subscription for this school
      const subscription = await Subscription.findOne({ 
        schoolId: req.user.schoolId,
        status: { $in: ['active', 'trial'] }
      }).populate('planId');

      if (subscription?.planId) {
        // Get counts from database
        const studentCount = await Student.countDocuments({ schoolId: req.user.schoolId });
        const staffCount = await User.countDocuments({ 
          schoolId: req.user.schoolId, 
          role: 'staff' 
        });
        
        // Calculate total cards generated from student records
        // Since you don't store cards, we sum card_generation_count from students
        const studentsWithCards = await Student.find({ 
          schoolId: req.user.schoolId,
          card_generation_count: { $gt: 0 }
        }).select('card_generation_count');
        
        const totalCardsGenerated = studentsWithCards.reduce(
          (sum, student) => sum + (student.card_generation_count || 0), 
          0
        );

        // Calculate storage used based on student photos
        const studentsWithPhotos = await Student.find({ 
          schoolId: req.user.schoolId,
          has_photo: true 
        }).select('photo_metadata');
        
        const totalPhotoBytes = studentsWithPhotos.reduce(
          (sum, student) => sum + (student.photo_metadata?.bytes || 0), 
          0
        );
        
        // Convert bytes to MB
        const storageUsedMB = (totalPhotoBytes / (1024 * 1024)).toFixed(1);
        
        usage = {
          students: {
            used: studentCount,
            limit: subscription.planId.limits.maxStudents === -1 ? 'Unlimited' : subscription.planId.limits.maxStudents
          },
          staff: {
            used: staffCount,
            limit: subscription.planId.limits.maxStaff === -1 ? 'Unlimited' : subscription.planId.limits.maxStaff
          },
          cards: {
            used: totalCardsGenerated,
            limit: subscription.planId.limits.maxCards === -1 ? 'Unlimited' : subscription.planId.limits.maxCards
          },
          storage: {
            used: storageUsedMB + 'MB',
            limit: subscription.planId.limits.storageMB + 'MB'
          }
        };

        console.log('📊 Usage stats:', {
          schoolId: req.user.schoolId,
          students: studentCount,
          staff: staffCount,
          cards: totalCardsGenerated,
          storage: storageUsedMB + 'MB'
        });
      }
    }

    res.json({
      success: true,
      usage
    });

  } catch (error) {
    console.error('❌ Get usage stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @desc    Get subscription by ID
 * @route   GET /api/subscriptions/:id
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate('planId')
      .populate('schoolId')
      .populate('userId', 'firstName lastName email');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    // Check permission
    if (req.user.role !== 'super_admin') {
      if (subscription.schoolId._id.toString() !== req.user.schoolId?.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      subscription
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================
// SUPER ADMIN ROUTES
// ============================================

/**
 * @desc    Get all subscriptions (super admin only)
 * @route   GET /api/subscriptions
 * @access  Super Admin
 */
router.get('/',
  authMiddleware,
  roleMiddleware(['super_admin']),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        schoolId,
        planId,
        startDate,
        endDate,
        search
      } = req.query;

      const query = {};

      if (status) query.status = status;
      if (schoolId) query.schoolId = schoolId;
      if (planId) query.planId = planId;

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      if (search) {
        // Search by school name through lookup
        // Will handle in aggregation
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const subscriptions = await Subscription.find(query)
        .populate('planId')
        .populate('schoolId', 'name email phone')
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Subscription.countDocuments(query);

      // Get summary statistics
      const stats = await Subscription.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalRevenue: { $sum: { $sum: '$invoices.amount' } }
          }
        }
      ]);

      res.json({
        success: true,
        subscriptions,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });

    } catch (error) {
      console.error('Get all subscriptions error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @desc    Admin update subscription (super admin only)
 * @route   PUT /api/subscriptions/admin/:id
 * @access  Super Admin
 */
router.put('/admin/:id',
  authMiddleware,
  roleMiddleware(['super_admin']),
  async (req, res) => {
    try {
      const { status, planId, currentPeriodEnd, notes } = req.body;

      const subscription = await Subscription.findById(req.params.id);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
      }

      const oldStatus = subscription.status;

      if (status) subscription.status = status;
      if (planId) subscription.planId = planId;
      if (currentPeriodEnd) subscription.currentPeriodEnd = new Date(currentPeriodEnd);
      if (notes) subscription.adminNotes = notes;

      await subscription.save();

      // Log the action
      await AuditLog.create({
        userId: req.user._id,
        action: 'ADMIN_UPDATE_SUBSCRIPTION',
        details: {
          subscriptionId: subscription._id,
          schoolId: subscription.schoolId,
          changes: { oldStatus, newStatus: status }
        },
        importance: 'critical'
      });

      res.json({
        success: true,
        message: 'Subscription updated successfully',
        subscription
      });

    } catch (error) {
      console.error('Admin update subscription error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @desc    Create manual invoice (super admin only)
 * @route   POST /api/subscriptions/admin/invoice
 * @access  Super Admin
 */
router.post('/admin/invoice',
  authMiddleware,
  roleMiddleware(['super_admin']),
  async (req, res) => {
    try {
      const { schoolId, amount, description, items } = req.body;

      if (!schoolId || !amount) {
        return res.status(400).json({
          success: false,
          error: 'School ID and amount are required'
        });
      }

      const subscription = await Subscription.findOne({ schoolId });
      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'No subscription found for this school'
        });
      }

      const invoice = {
        invoiceNumber: `INV-MAN-${Date.now()}`,
        amount,
        currency: 'USD',
        status: 'sent',
        createdAt: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: items || [
          {
            description: description || 'Manual invoice',
            quantity: 1,
            unitPrice: amount,
            total: amount
          }
        ]
      };

      subscription.invoices.push(invoice);
      await subscription.save();

      // Log the action
      await AuditLog.create({
        userId: req.user._id,
        action: 'CREATE_MANUAL_INVOICE',
        details: {
          schoolId,
          invoiceNumber: invoice.invoiceNumber,
          amount
        },
        importance: 'high'
      });

      res.json({
        success: true,
        message: 'Invoice created successfully',
        invoice
      });

    } catch (error) {
      console.error('Create manual invoice error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

module.exports = router;