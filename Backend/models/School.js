const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'School name is required'],
        unique: true,
        trim: true,
        minlength: [3, 'School name must be at least 3 characters'],
        maxlength: [100, 'School name cannot exceed 100 characters']
    },
    registrationNumber: {
        type: String,
        unique: true,
        sparse: true // Allows null/undefined values
    },
    type: {
        type: String,
        enum: ['secondary', 'primary', 'both'],
        default: 'secondary'
    },

    // Contact Information
    phone: {
        type: String,
        required: [true, 'School phone is required'],
        match: [/^(\+250|250|0)?7[2389]\d{7}$/, 'Please enter a valid Rwanda phone number']
    },
    email: {
        type: String,
        required: [true, 'School email is required'],
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    website: {
        type: String,
        match: [/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/, 'Please enter a valid URL']
    },

    // Address
    address: {
        sector: { type: String, required: true },
        province: { type: String, required: true },
        district: { type: String },
        country: { type: String, required: true, default: 'Rwanda' },
    },

    // Branding
    logo: {
        url: { type: String, default: '' },
        publicId: String
    },

    // Settings
    settings: {
        timezone: { type: String, default: 'Africa/Douala' },
        dateFormat: { type: String, default: 'DD/MM/YYYY' },
        timeFormat: { type: String, enum: ['12h', '24h'], default: '24h' },
        weekStartsOn: { type: String, enum: ['monday', 'sunday'], default: 'monday' },
        language: { type: String, enum: ['en', 'fr'], default: 'en' },

        // Card defaults
        cardDefaults: {
            template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
            prefix: { type: String, default: 'STD' },
            expiryPeriod: { type: Number, default: 365 } // days
        }
    },

    // Relations
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Stats (updated via aggregation/cron)
    stats: {
        totalStudents: { type: Number, default: 0 },
        totalStaff: { type: Number, default: 0 },
        totalCards: { type: Number, default: 0 },
        totalTemplates: { type: Number, default: 0 },
        lastStudentAdded: Date,
        lastCardGenerated: Date
    },

    // Status
    isActive: { type: Boolean, default: true },
    verifiedAt: Date

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for full address
schoolSchema.virtual('fullAddress').get(function () {
    const parts = [this.address.street, this.address.city];
    if (this.address.state) parts.push(this.address.state);
    parts.push(this.address.country);
    if (this.address.postalCode) parts.push(this.address.postalCode);
    return parts.join(', ');
});

// Generate registration number before save
schoolSchema.pre('save', async function (next) {
    if (!this.registrationNumber) {
        const year = new Date().getFullYear();
        const count = await mongoose.model('School').countDocuments();
        this.registrationNumber = `SCH-${year}-${(count + 1).toString().padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('School', schoolSchema);