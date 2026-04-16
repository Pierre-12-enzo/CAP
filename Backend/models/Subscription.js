const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    schoolId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'School', 
        required: true,
        index: true 
    },
    planId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Plan', 
        required: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    }, // The admin who subscribed
    
    // Status
    status: { 
        type: String, 
        enum: ['trial', 'active', 'expired', 'cancelled', 'past_due', 'pending'],
        default: 'trial',
        index: true
    },
    
    // Dates
    trialStart: { type: Date },
    trialEnd: { type: Date },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    cancelledAt: { type: Date },
    expiresAt: { type: Date },
    
    // Payment details
    paymentMethod: {
        type: { type: String, enum: ['momo', 'stripe', 'bank', 'free'] },
        provider: String, // 'mtn', 'orange', 'stripe', etc.
        last4: String,
        momoNumber: String,
        
        // For bank transfers
        bankReference: String,
        bankName: String,
        
        // For Stripe
        stripePaymentMethodId: String,
        stripeSubscriptionId: String
    },
    
    // Invoices
    invoices: [{
        invoiceNumber: { type: String, required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'XAF' },
        status: { 
            type: String, 
            enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
            default: 'draft'
        },
        paidAt: Date,
        dueDate: Date,
        paidAmount: Number,
        paymentMethod: String,
        transactionId: String,
        pdfUrl: String,
        
        // Line items
        items: [{
            description: String,
            quantity: Number,
            unitPrice: Number,
            total: Number
        }]
    }],
    
    // History of status changes
    statusHistory: [{
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String
    }],
    
    // Metadata
    metadata: {
        lastPaymentAttempt: Date,
        paymentAttempts: { type: Number, default: 0 },
        failureReason: String,
        notes: String
    }
    
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for checking if subscription is active
subscriptionSchema.virtual('isActive').get(function() {
    const now = new Date();
    return (this.status === 'active' || this.status === 'trial') && 
           this.currentPeriodEnd > now;
});

// Virtual for days remaining
subscriptionSchema.virtual('daysRemaining').get(function() {
    const now = new Date();
    const diff = this.currentPeriodEnd - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Update status based on dates (run this via cron job)
subscriptionSchema.methods.updateStatus = async function() {
    const now = new Date();
    
    if (this.status === 'trial' && this.trialEnd < now) {
        this.status = 'expired';
        this.statusHistory.push({
            status: 'expired',
            reason: 'Trial period ended'
        });
    }
    
    if ((this.status === 'active' || this.status === 'trial') && 
        this.currentPeriodEnd < now) {
        this.status = 'expired';
        this.statusHistory.push({
            status: 'expired',
            reason: 'Subscription period ended'
        });
    }
    
    return this.save();
};

module.exports = mongoose.model('Subscription', subscriptionSchema);