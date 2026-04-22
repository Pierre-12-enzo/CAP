const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // ===== BASIC INFO =====
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        minlength: [2, 'First name must be at least 2 characters'],
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        minlength: [2, 'Last name must be at least 2 characters'],
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        lowercase: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username cannot exceed 30 characters'],
        match: [/^[a-zA-Z0-9._-]+$/, 'Username can only contain letters, numbers, dots, underscores and hyphens']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phoneNumber: {
        type: String,
        trim: true,
        set: function (v) {
            if (!v) return v;
            // Remove all non-digit characters
            const digits = v.replace(/\D/g, '');

            // Standardize to +250XXXXXXXXX format
            if (digits.length === 9 && digits[0] === '7') {
                return '+250' + digits;
            }
            if (digits.length === 12 && digits.startsWith('2507')) {
                return '+' + digits;
            }
            if (digits.length === 13 && digits.startsWith('2507')) {
                return '+' + digits;
            }
            // If already has +, keep as is
            if (v.startsWith('+') && digits.length === 13 && digits.startsWith('2507')) {
                return v.replace(/\s/g, '');
            }
            return v;
        },
        validate: {
            validator: function (v) {
                if (!v) return true;
                // Remove all non-digit characters for validation
                const digits = v.replace(/\D/g, '');

                // Valid Rwanda formats:
                // 9 digits starting with 7 (e.g., 788123456)
                if (digits.length === 9 && digits[0] === '7') return true;
                // 12 digits starting with 2507 (e.g., 250788123456)
                if (digits.length === 12 && digits.startsWith('2507')) return true;
                // 13 digits starting with 2507 (e.g., 250788123456 with +)
                if (digits.length === 13 && digits.startsWith('2507')) return true;

                return false;
            },
            message: 'Please enter a valid Rwanda phone number (e.g., 0788123456, +250788123456, or 0788 123 456)'
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't return password by default in queries
    },

    // ===== PROFILE & AVATAR =====
    avatar: {
        url: { type: String, default: '' },
        publicId: { type: String }, // For cloud storage (Cloudinary)
        initials: { type: String } // Auto-generated from name
    },

    // ===== ROLE & ACCESS =====
    role: {
        type: String,
        enum: {
            values: ['super_admin', 'admin', 'staff'],
            message: '{VALUE} is not a valid role'
        },
        default: 'staff',
        index: true // For faster queries
    },

    // ===== SCHOOL ASSOCIATION =====
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: function () {
            if (this.role === 'super_admin') return false;

            // For admin/staff, only required AFTER registration is complete
            return this.metadata?.registrationCompleted === true;
        },
        index: true,
        validate: {
            validator: function (v) {
                // Super admin doesn't need schoolId
                if (this.role === 'super_admin') return true;

                // During registration, allow null
                if (!this.metadata?.registrationCompleted) {
                    return true;
                }

                // After registration, must have schoolId
                return v != null;
            },
            message: 'School ID is required for non-super admin users'
        }
    },

    // ===== CREATOR TRACKING =====
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function () {
            return this.role === 'staff';
        },
        index: true
    },

    // ===== STAFF PERMISSIONS (Only for staff) =====
    permissions: {
        canViewAnalytics: {
            type: Boolean,
            default: false,
            required: function () { return this.role === 'staff'; }
        },
        canGenerateCards: {
            type: Boolean,
            default: false,
            required: function () { return this.role === 'staff'; }
        },
        canManageStudents: {
            type: Boolean,
            default: false,
            required: function () { return this.role === 'staff'; }
        },
        canManageTemplates: {
            type: Boolean,
            default: false,
            required: function () { return this.role === 'staff'; }
        },
        canViewAuditLogs: {
            type: Boolean,
            default: false,
            required: function () { return this.role === 'staff'; }
        },
        canMarkAttendance: {
            type: Boolean,
            default: false,
            required: function () { return this.role === 'staff'; }
        },
        canUploadCSV: {
            type: Boolean,
            default: false,
            required: function () { return this.role === 'staff'; }
        },
        canUploadPhotos: {
            type: Boolean,
            default: false,
            required: function () { return this.role === 'staff'; }
        }
    },

    // ===== ADMIN SUBSCRIPTION (Only for admin) =====
    subscription: {
        status: {
            type: String,
            enum: ['trial', 'active', 'expired', 'cancelled', 'past_due'],
            default: 'trial'
        },
        trialEndsAt: {
            type: Date,
            default: function () {
                // 14 days trial by default
                if (this.role === 'admin') {
                    const date = new Date();
                    date.setDate(date.getDate() + 14);
                    return date;
                }
                return null;
            }
        },
        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Plan'
        },
        subscribedAt: Date,
        expiresAt: Date,
        cancelledAt: Date,

        // Payment info summary (not sensitive details)
        paymentMethod: {
            type: { type: String, enum: ['momo', 'stripe', 'bank'] },
            last4: String,
            provider: String
        }
    },

    // ===== ACCOUNT STATUS =====
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    // ===== PASSWORD RESET =====
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    // ===== LOGIN TRACKING =====
    lastLogin: {
        at: Date,
        ip: String,
        userAgent: String
    },
    loginHistory: [{
        at: Date,
        ip: String,
        userAgent: String,
        success: Boolean
    }],

    // ===== TWO FACTOR AUTH (Future) =====
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: String,

    // ===== PREFERENCES =====
    preferences: {
        language: { type: String, default: 'en', enum: ['en', 'fr'] },
        theme: { type: String, default: 'light', enum: ['light', 'dark', 'system'] },
        notifications: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            sms: { type: Boolean, default: false }
        },
        dashboardLayout: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },

    // ===== METADATA =====
    metadata: {
        registrationStep: { type: Number, default: 1 }, // For multi-step registration
        registrationCompleted: { type: Boolean, default: false },
        needsPasswordChange: { type: Boolean, default: true, required: function () { return this.role === 'staff'; } },
        lastActive: Date,
        notes: String,
        tags: [String]
    }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ===== VIRTUAL PROPERTIES =====
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('isTrialActive').get(function () {
    if (this.role !== 'admin') return false;
    return this.subscription.status === 'trial' &&
        this.subscription.trialEndsAt > new Date();
});

userSchema.virtual('isSubscriptionActive').get(function () {
    if (this.role !== 'admin') return false;
    return this.subscription.status === 'active' || this.isTrialActive;
});

userSchema.virtual('initials').get(function () {
    return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
});

// ===== INDEXES =====
userSchema.index({ email: 1, role: 1 });
userSchema.index({ schoolId: 1, role: 1 });
userSchema.index({ 'subscription.status': 1, subscriptionExpiresAt: 1 });
userSchema.index({ createdAt: -1 });

// ===== MIDDLEWARE =====

// Hash password before saving

userSchema.pre('save', async function (next) {
    // Only hash if password is modified
    if (!this.isModified('password')) return next();

    // Skip if password is already hashed (bcrypt hashes start with $2b$)
    if (this.password && this.password.startsWith('$2b$')) {
        console.log('✅ Password already hashed, skipping re-hash');
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});
// Auto-generate initials for avatar
userSchema.pre('save', function (next) {
    if (this.isModified('firstName') || this.isModified('lastName')) {
        this.avatar.initials = `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
    }
    next();
});

// ===== INSTANCE METHODS =====

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user has specific permission
userSchema.methods.hasPermission = function (permission) {
    if (this.role === 'super_admin') return true;
    if (this.role === 'admin') return true;
    return this.permissions && this.permissions[permission] === true;
};

// Check if user can access a specific school
userSchema.methods.canAccessSchool = function (schoolId) {
    if (this.role === 'super_admin') return true;
    return this.schoolId && this.schoolId.toString() === schoolId.toString();
};

// Update last login
userSchema.methods.updateLastLogin = async function (ip, userAgent) {
    this.lastLogin = {
        at: new Date(),
        ip,
        userAgent
    };

    // Keep only last 50 login attempts
    this.loginHistory.push({ at: new Date(), ip, userAgent, success: true });
    if (this.loginHistory.length > 50) {
        this.loginHistory = this.loginHistory.slice(-50);
    }

    await this.save();
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function () {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    return token;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour

    return token;
};

// ===== STATIC METHODS =====

// Find active users by school
userSchema.statics.findBySchool = function (schoolId, role = null) {
    const query = { schoolId, isActive: true };
    if (role) query.role = role;
    return this.find(query).select('-password');
};

// Get user with populated school
userSchema.statics.getWithSchool = function (userId) {
    return this.findById(userId)
        .populate('schoolId')
        .select('-password');
};

// Get dashboard data based on role
userSchema.statics.getDashboardData = async function (userId) {
    const user = await this.findById(userId)
        .populate('schoolId')
        .select('-password');

    if (!user) return null;

    const dashboardData = {
        user: {
            id: user._id,
            name: user.fullName,
            role: user.role,
            initials: user.initials,
            avatar: user.avatar.url
        }
    };

    // Add role-specific data
    if (user.role === 'admin') {
        const Student = mongoose.model('Student');
        const Staff = mongoose.model('User');
        const Card = mongoose.model('Card');

        const [studentCount, staffCount, cardCount] = await Promise.all([
            Student.countDocuments({ schoolId: user.schoolId }),
            Staff.countDocuments({ schoolId: user.schoolId, role: 'staff' }),
            Card.countDocuments({ schoolId: user.schoolId })
        ]);

        dashboardData.school = {
            id: user.schoolId._id,
            name: user.schoolId.name,
            stats: {
                students: studentCount,
                staff: staffCount,
                cards: cardCount
            },
            subscription: user.subscription
        };
    }

    if (user.role === 'staff') {
        dashboardData.permissions = user.permissions;
        dashboardData.school = {
            id: user.schoolId._id,
            name: user.schoolId.name
        };
    }

    return dashboardData;
};

module.exports = mongoose.model('User', userSchema);