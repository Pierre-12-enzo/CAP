const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        enum: ['Free Trial', 'Basic Plan', 'Pro Plan', 'Enterprise Plan']
    },
    code: { 
        type: String, 
        required: true,
        unique: true,
        enum: ['TRIAL', 'BASIC', 'PRO', 'ENTERPRISE']
    },
    type: { 
        type: String, 
        enum: ['trial', 'paid', 'custom'],
        required: true 
    },
    
    // Pricing
    price: {
        monthly: { type: Number, default: 0 },
        yearly: { type: Number, default: 0 },
        currency: { type: String, default: 'XAF' } // Central African CFA
    },
    
    // Trial specific (for TRIAL plan)
    trialDays: { type: Number, default: 30 },
    
    // Features (for UI display)
    features: [{
        name: String,
        description: String,
        included: Boolean,
        highlight: { type: Boolean, default: false }
    }],
    
    // Limits (for backend enforcement)
    limits: {
        maxStudents: { type: Number, default: 50 }, // Trial: 50, Basic: 200, Pro: unlimited
        maxStaff: { type: Number, default: 5 },
        maxTemplates: { type: Number, default: 3 },
        storageMB: { type: Number, default: 100 },
        apiCallsPerDay: { type: Number, default: 100 },
        
        // Features enabled
        canCustomizeCards: { type: Boolean, default: false },
        canExportData: { type: Boolean, default: false },
        canUseAPI: { type: Boolean, default: false },
        hasAdvancedAnalytics: { type: Boolean, default: false },
        hasPrioritySupport: { type: Boolean, default: false }
    },
    
    // Metadata
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    
    description: String,
    badgeText: String // e.g., "Most Popular", "Best Value"
    
}, { timestamps: true });

// Pre-save hook to set trial days for TRIAL plan
planSchema.pre('save', function(next) {
    if (this.code === 'TRIAL') {
        this.type = 'trial';
        this.trialDays = 14;
    }
    next();
});

module.exports = mongoose.model('Plan', planSchema);