const express = require('express');
const router = express.Router();
const User = require('../models/User');
const School = require('../models/School');
const Plan = require('../models/Plans');
const Subscription = require('../models/Subscription');
const RegistrationProgress = require('../models/RegistrationProgress');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
    uploadAvatar,
    uploadSchoolLogo,
    deleteImage
} = require('../utilis/cloudinaryAuth'); // New simple uploader

const { sendEmail } = require('../utilis/emailService'); // We'll create this
const multer = require('multer');
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ============================================
// PUBLIC ROUTES (No Auth Required)
// ============================================

// ✅ CHECK email availability (you already have this - keep it!)
router.get('/check-email/:email', async (req, res) => {
    try {
        const exists = await User.findOne({ email: req.params.email.toLowerCase() });
        res.json({
            available: !exists,
            message: exists ? 'Email already registered' : 'Email available'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ CHECK school name availability (NEW)
router.get('/check-school/:name', async (req, res) => {
    try {
        const exists = await School.findOne({
            name: { $regex: new RegExp(`^${req.params.name}$`, 'i') }
        });

        // Generate suggestions if taken
        let suggestions = [];
        if (exists) {
            const baseName = req.params.name;
            suggestions = [
                `${baseName} Secondary School`,
                `${baseName} High School`,
                `${baseName} Academy`,
                `${baseName} College`
            ];
        }

        res.json({
            available: !exists,
            suggestions: exists ? suggestions : []
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ GET available plans (NEW)
router.get('/plans', async (req, res) => {
    try {
        const plans = await Plan.find({ isActive: true })
            .sort({ sortOrder: 1, price: 1 });

        res.json({
            success: true,
            plans
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// MULTI-STEP REGISTRATION (NEW Professional Flow)
// ============================================

// STEP 1: Save Personal Info
router.post('/register/step1/personal', async (req, res) => {
    try {
        console.log('Request body:', req.body);
        console.log('Request headers:', req.headers['content-type']);
        const { email, firstName, lastName, phoneNumber, password } = req.body;

        // Validate
        if (!email || !firstName || !lastName || !phoneNumber || !password) {
            console.log('All personal fields are required'); // Move this BEFORE the return
            return res.status(400).json({
                success: false,
                error: 'All personal fields are required'
            });
        }

        console.log('Received data:', { email, firstName, lastName, phoneNumber, password: '***' }); // Better logging

        // Check if email already registered
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // Check password strength
        const passwordStrength = checkPasswordStrength(password);
        if (passwordStrength.score < 50) {
            return res.status(400).json({
                success: false,
                error: 'Password is too weak',
                strength: passwordStrength
            });
        }

        // Save/Update progress
        const progress = await RegistrationProgress.findOneAndUpdate(
            { email: email.toLowerCase() },
            {
                step: 2,
                'data.personal': {
                    firstName,
                    lastName,
                    phoneNumber,
                    password: await bcrypt.hash(password, 10) // Hash immediately for security
                }
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            message: 'Personal info saved',
            nextStep: 'school',
            progressId: progress._id
        });

    } catch (error) {
        console.error('Step 1 error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// STEP 2: Save School Info (with Cloudinary for logo)
router.post('/register/step2/school',
    upload.single('logo'), // 👈 This handles the file upload
    async (req, res) => {
        try {
            console.log('📥 Step 2 - req.body:', req.body);
            console.log('📥 Step 2 - req.file:', req.file); // This contains the uploaded file

            // Extract fields from req.body
            const { email, schoolName, schoolType, schoolEmail, schoolPhone, province, district, sector, country } = req.body;

            // Handle address - it might be stringified or object
            const addressObj = {
                province: province || '',
                district: district || '',
                sector: sector || '',
                country: country || 'Rwanda'
            };

            console.log('📧 Email received:', email);

            // Validate required fields
            if (!email) {
                return res.status(400).json({
                    success: false,
                    error: 'Email is required'
                });
            }

            if (!schoolName || !schoolType || !schoolPhone || !schoolEmail) {
                return res.status(400).json({
                    success: false,
                    error: 'All school fields are required'
                });
            }

            // Check if school name exists
            const existingSchool = await School.findOne({
                name: { $regex: new RegExp(`^${schoolName}$`, 'i') }
            });

            if (existingSchool) {
                return res.status(400).json({
                    success: false,
                    error: 'School name already registered'
                });
            }

            // Upload logo to Cloudinary if file was uploaded
            let logoData = {};
            if (req.file) {
                try {
                    // Convert buffer to base64 for Cloudinary
                    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

                    // Upload using your cloudinaryAuth utility
                    logoData = await uploadSchoolLogo(base64Image, `school_${Date.now()}`);
                    console.log('✅ Logo uploaded:', logoData.url);
                } catch (uploadError) {
                    console.error('Logo upload error:', uploadError);
                    // Continue without logo if upload fails
                }
            }

            // Update progress
            const progress = await RegistrationProgress.findOneAndUpdate(
                { email: email.toLowerCase() },
                {
                    step: 3,
                    'data.school': {
                        name: schoolName,
                        type: schoolType,
                        phone: schoolPhone,
                        email: schoolEmail,
                        address: addressObj,  // Save the complete address object
                        logo: logoData
                    }
                },
                { new: true, upsert: true }
            );

            if (!progress) {
                return res.status(404).json({
                    success: false,
                    error: 'Registration session not found. Please start over.'
                });
            }

            res.json({
                success: true,
                message: 'School info saved',
                nextStep: 'plan',
                progressId: progress._id,
                logoPreview: logoData.url
            });

        } catch (error) {
            console.error('Step 2 error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to save school info'
            });
        }
    }
);

// STEP 3: Select Plan
router.post('/register/step3/plan', async (req, res) => {
    try {
        const { email, planId, billingCycle } = req.body;

        console.log('📥 Step 3 - Plan selection:', { email, planId, billingCycle });

        if (!planId) {
            return res.status(400).json({
                success: false,
                error: 'Plan selection is required'
            });
        }

        // Get plan details
        const plan = await Plan.findById(planId);
        if (!plan) {
            return res.status(400).json({
                success: false,
                error: 'Invalid plan selected'
            });
        }

        console.log('📦 Selected plan:', plan.name, 'type:', plan.type);

        // Update progress
        const progress = await RegistrationProgress.findOneAndUpdate(
            { email: email.toLowerCase() },
            {
                step: plan.type === 'trial' ? 5 : 4,
                'data.plan': {
                    planId,
                    billingCycle,
                    price: billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly,
                    planType: plan.type
                }
            },
            { new: true }
        );

        if (!progress) {
            return res.status(404).json({
                success: false,
                error: 'Registration session not found'
            });
        }

        res.json({
            success: true,
            message: 'Plan selected',
            nextStep: plan.type === 'trial' ? 'complete' : 'payment',
            requiresPayment: plan.type !== 'trial',
            plan: {
                name: plan.name,
                type: plan.type,
                price: billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly
            }
        });

    } catch (error) {
        console.error('Step 3 error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// STEP 4: Process Payment (We'll implement payment later)
router.post('/register/step4/payment', async (req, res) => {
    try {
        const { email, paymentMethod, paymentDetails } = req.body;

        // TODO: Integrate with MoMo/Stripe here
        // For now, just mark as pending
        const progress = await RegistrationProgress.findOneAndUpdate(
            { email: email.toLowerCase() },
            {
                'data.payment': {
                    method: paymentMethod,
                    status: 'pending',
                    reference: `PAY-${Date.now()}`,
                    ...paymentDetails
                }
            },
            { new: true }
        );

        res.json({
            success: true,
            message: 'Payment processing',
            nextStep: 'complete',
            paymentReference: progress.data.payment.reference
        });

        //send email for payment confirmation
        await sendEmail({
            to: user.email,
            subject: '💰 Payment Confirmed - CAP Subscription Active!',
            template: 'payment-confirmation',
            context: {
                firstName: user.firstName,
                planName: plan.name,
                amount: subscription.amount,
                currency: 'XAF',
                billingCycle: 'monthly',
                invoiceNumber: invoice.number,
                invoiceStatus: 'Paid',
                paymentDate: new Date().toLocaleDateString(),
                paymentMethod: 'Mobile Money',
                transactionId: transaction.id,
                periodStart: subscription.currentPeriodStart.toLocaleDateString(),
                periodEnd: subscription.currentPeriodEnd.toLocaleDateString(),
                nextBillingDate: subscription.currentPeriodEnd.toLocaleDateString(),
                features: [
                    { icon: '📊', name: 'Advanced Analytics' },
                    { icon: '👥', name: 'Unlimited Students' }
                ],
                invoiceUrl: `${FRONTEND_URL}/billing/invoice/${invoice.id}`,
                dashboardUrl: `${FRONTEND_URL}/dashboard`
            }
        });

    } catch (error) {
        console.error('Step 4 error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// STEP 5: Complete Registration (Create everything!)
router.post('/register/complete', async (req, res) => {
    try {
        const { email } = req.body;
        console.log('📥 Complete registration for:', email);

        // Get registration progress
        const progress = await RegistrationProgress.findOne({ email: email.toLowerCase() });

        if (!progress) {
            console.log('❌ No progress found for:', email);
            return res.status(404).json({
                success: false,
                error: 'Registration session not found'
            });
        }

        console.log('📦 Progress data:', JSON.stringify(progress.data, null, 2));

        const { personal, school: schoolData, plan: planData } = progress.data;

        // Validate required data
        if (!personal) {
            return res.status(400).json({
                success: false,
                error: 'Personal information is missing'
            });
        }

        if (!schoolData) {
            return res.status(400).json({
                success: false,
                error: 'School information is missing'
            });
        }
        if (schoolData.address) {
            console.log('4. address type:', typeof schoolData.address);
            console.log('5. address value:', schoolData.address);
            console.log('6. address keys:', Object.keys(schoolData.address || {}));
        } else {
            console.log('4. address is MISSING or UNDEFINED');
        }


        if (!planData) {
            return res.status(400).json({
                success: false,
                error: 'Plan selection is missing'
            });
        }

        // 1. Get plan
        const plan = await Plan.findById(planData.planId);
        if (!plan) {
            return res.status(400).json({
                success: false,
                error: 'Invalid plan selected'
            });
        }

        // 2. Generate unique username and clean phone number
        const cleanPersonalPhone = cleanPhoneNumber(personal.phoneNumber);
        const baseUsername = `${personal.firstName.toLowerCase()}.${personal.lastName.toLowerCase()}`;
        let username = baseUsername;
        let counter = 1;

        while (await User.findOne({ username })) {
            username = `${baseUsername}${counter}`;
            counter++;
        }

        // 3. Create User FIRST (Admin)
        console.log('👤 Creating admin user:', personal.firstName);

        const user = await User.create({
            firstName: personal.firstName,
            lastName: personal.lastName,
            username: username,
            email: email.toLowerCase(),
            phoneNumber: cleanPersonalPhone,
            password: personal.password, // Already hashed from step 1
            role: 'admin',
            // schoolId will be set after school creation

            avatar: {
                initials: `${personal.firstName[0]}${personal.lastName[0]}`.toUpperCase()
            },

            subscription: {
                status: plan.type === 'trial' ? 'trial' : 'active',
                trialEndsAt: plan.type === 'trial' ?
                    new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000) : null,
                planId: plan._id
            },
            schoolId: null,  // ✅ Works now!
            metadata: {
                registrationCompleted: false
            },

            isEmailVerified: false,
            isActive: true
        });

        console.log('✅ User created with ID:', user._id);

        // 4. Now create School with the adminId
        console.log('🏫 Creating school:', schoolData.name);

        // Ensure address has all fields
        const address = {
            province: schoolData.address?.province || schoolData.province || '',
            district: schoolData.address?.district || schoolData.district || '',
            sector: schoolData.address?.sector || schoolData.sector || '',
            country: schoolData.address?.country || schoolData.country || 'Rwanda'
        };

        // Clean phone number (remove spaces, +, etc.)
        const cleanSchoolPhone = schoolData.phone ? schoolData.phone.replace(/[\s+]/g, '') : '';

        const school = await School.create({
            name: schoolData.name,
            type: schoolData.type || 'secondary',
            phone: cleanSchoolPhone,
            email: schoolData.email,
            address: address,
            logo: schoolData.logo || {},
            adminId: user._id, // Now we have the user ID!
            settings: {
                timezone: 'Africa/Kigali',
                language: 'en'
            }
        });

        console.log('✅ School created with ID:', school._id);

        // 5. Update User with schoolId and mark registration completed
        user.schoolId = school._id;
        user.metadata.registrationCompleted = true;

        await user.save();
        console.log('✅ User updated with schoolId');

        // 6. Create Subscription record
        const subscription = await Subscription.create({
            schoolId: school._id,
            planId: plan._id,
            userId: user._id,
            status: plan.type === 'trial' ? 'trial' : 'active',
            trialStart: plan.type === 'trial' ? new Date() : null,
            trialEnd: plan.type === 'trial' ?
                new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000) : null,
            currentPeriodStart: new Date(),
            currentPeriodEnd: plan.type === 'trial' ?
                new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000) :
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            paymentMethod: progress.data.payment ? {
                type: progress.data.payment.method,
                status: 'pending'
            } : null
        });

        console.log('✅ Subscription created with ID:', subscription._id);

        // 7. Generate verification token
        const verificationToken = user.generateEmailVerificationToken();
        await user.save();

        // 8. Send welcome email (fire and forget - don't await)
        await sendEmail({
            to: user.email,
            subject: `🎓 Welcome to CAP, ${user.firstName}!`,
            template: 'welcome',
            context: {
                firstName: user.firstName,
                schoolName: school.name,
                planName: plan.name,
                studentLimit: plan.limits.maxStudents,
                staffLimit: plan.limits.maxStaff,
                storage: plan.limits.storageMB,
                isTrial: plan.type === 'trial',
                trialDays: plan.trialDays,
                trialEndDate: user.subscription.trialEndsAt?.toLocaleDateString(),
                dashboardUrl: `${FRONTEND_URL}/dashboard`,
                setupGuideUrl: `${FRONTEND_URL}/guides/setup`
            }
        }).catch(err => console.error('Welcome email failed:', err));

        // 9. Generate JWT for auto-login
        const token = jwt.sign(
            { id: user._id, role: user.role, schoolId: school._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 10. Delete registration progress
        await RegistrationProgress.deleteOne({ _id: progress._id });

        // Also clear from localStorage (frontend will handle this)
        console.log('✅ Registration progress deleted');

        // 11. Return success with user data
        res.status(201).json({
            success: true,
            message: 'Registration completed successfully!',
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                school: {
                    id: school._id,
                    name: school.name
                },
                subscription: {
                    status: user.subscription.status,
                    trialEndsAt: user.subscription.trialEndsAt,
                    plan: plan.name
                }
            },
            token,
            redirectTo: '/dashboard'
        });

    } catch (error) {
        console.error('❌ Complete registration error:', error);

        // If error occurs, try to clean up any partially created data
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: Object.values(error.errors).map(e => e.message).join(', ')
            });
        }

        res.status(500).json({
            success: false,
            error: error.message || 'Failed to complete registration'
        });
    }
});

// ============================================
// LOGIN (Enhanced with role-based redirect)
// ============================================

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('🔐 Login attempt for:', email);

        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user) {
            console.log('❌ User not found:', email);
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // ✅ Check if user needs to change password
        if (user.role === 'staff' && user.metadata?.needsPasswordChange) {
            console.log('⚠️ Staff user needs to change password at first login:', email);

            const needsPasswordChange = user.metadata?.needsPasswordChange
        }


        console.log('👤 User found:', {
            id: user._id,
            email: user.email,
            role: user.role,
            hasPassword: !!user.password
        });

        // Test password comparison
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('🔐 Password match result:', isMatch);

        if (!isMatch) {
            console.log('❌ Password mismatch for:', email);
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }



        // Check if account is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                error: 'Your account has been deactivated. Contact support.'
            });
        }

        // Update last login
        await user.updateLastLogin(req.ip, req.get('User-Agent'));

        // Generate token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Determine dashboard redirect based on role
        let redirectTo = '/dashboard';
        if (user.role === 'super_admin') {
            redirectTo = '/super-admin/dashboard';
        } else if (user.role === 'admin') {
            redirectTo = '/dashboard';
        } else if (user.role === 'staff') {
            redirectTo = '/staff/settings';
        }

        // Build response based on role
        const response = {
            success: true,
            message: 'Login successful',
            token,
            redirectTo,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                username: user.username,
                role: user.role,
                initials: user.initials,
                avatar: user.avatar.url,
                school: user.schoolId ? {
                    id: user.schoolId._id,
                    name: user.schoolId.name,
                    logo: user.schoolId.logo?.url
                } : undefined,
                permissions: user.role === 'staff' ? user.permissions : undefined,
                needsPasswordChange: user.role === 'staff' ? user.metadata?.needsPasswordChange || false : undefined
            }
        };

        // Add school info for non-super_admin
        if (user.role !== 'super_admin' && user.schoolId) {
            response.user.school = {
                id: user.schoolId._id,
                name: user.schoolId.name,
                logo: user.schoolId.logo?.url
            };

            // Add subscription status for admin
            if (user.role === 'admin') {
                response.user.subscription = {
                    status: user.subscription.status,
                    trialEndsAt: user.subscription.trialEndsAt,
                    isActive: user.isSubscriptionActive,
                    daysRemaining: user.subscription.trialEndsAt ?
                        Math.ceil((user.subscription.trialEndsAt - new Date()) / (1000 * 60 * 60 * 24)) : null
                };
            }
        }

        res.json(response);

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during login'
        });
    }
});

// ============================================
// EMAIL VERIFICATION
// ============================================

router.get('/verify-email/:token', async (req, res) => {
    try {
        const hashedToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired verification token'
            });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Email verified successfully! You can now login.'
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Resend verification email
router.post('/resend-verification', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (user.isEmailVerified) {
            return res.status(400).json({
                success: false,
                error: 'Email already verified'
            });
        }

        const verificationToken = user.generateEmailVerificationToken();
        await user.save();

        await sendEmail({
            to: user.email,
            subject: 'Verify Your Email - CAP',
            template: 'verify-email',
            context: {
                name: user.firstName,
                verifyUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
            }
        });

        res.json({
            success: true,
            message: 'Verification email sent'
        });

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// PROFILE & USER MANAGEMENT
// ============================================

// Get Profile (enhanced with virtuals)
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('schoolId')
            .select('-password');

        // Add computed properties
        const profileData = user.toObject();
        profileData.fullName = user.fullName;
        profileData.isSubscriptionActive = user.isSubscriptionActive;

        if (user.role === 'staff') {
            const creator = await User.findById(user.createdBy).select('firstName lastName');
            profileData.createdBy = creator ? `${creator.firstName} ${creator.lastName}` : null;
        }

        res.json({
            success: true,
            user: profileData
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// Update Profile (enhanced with Cloudinary for avatar)
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { firstName, lastName, username, phoneNumber, email, avatar } = req.body;

        // Check email uniqueness if provided
        if (email) {
            const existingUser = await User.findOne({
                email: email.toLowerCase(),
                _id: { $ne: req.user.id }
            });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already exists'
                });
            }
        }

        const updateData = {};
        if (username) updateData.username = username;
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (phoneNumber) updateData.phoneNumber = phoneNumber;
        if (email) updateData.email = email.toLowerCase();

        // Handle avatar upload if provided
        if (avatar && avatar.startsWith('data:image')) {
            try {
                // Delete old avatar if exists
                if (req.user.avatar?.publicId) {
                    await deleteImage(req.user.avatar.publicId);
                }

                // Upload new avatar using the simple uploader
                const uploadResult = await uploadAvatar(avatar, req.user.id);

                updateData.avatar = {
                    url: uploadResult.url,
                    publicId: uploadResult.publicId
                };
            } catch (uploadError) {
                console.error('Avatar upload error:', uploadError);
                // Don't fail the whole request if avatar upload fails
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password').populate('schoolId');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                ...user.toObject(),
                fullName: user.fullName,
                initials: user.initials
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Change Password (keep your existing - it's good!)
router.put('/change-password', authMiddleware, async (req, res) => {
    // Your existing code - it's solid!
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters long'
            });
        }

        const user = await User.findById(req.user.id).select('+password');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.metadata.needsPasswordChange = false; // Reset the flag if it was set
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all users (for super_admin only)
router.get('/',
    authMiddleware,
    roleMiddleware(['super_admin']),
    async (req, res) => {
        try {
            const users = await User.find()
                .populate('schoolId', 'name')
                .select('-password')
                .sort({ createdAt: -1 });

            // Add computed fields
            const enhancedUsers = users.map(user => ({
                ...user.toObject(),
                fullName: user.fullName,
                status: user.isActive ? 'active' : 'inactive'
            }));

            res.json({
                success: true,
                users: enhancedUsers,
                total: enhancedUsers.length
            });

        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// Get users by school (for admin to see their staff)
router.get('/school/:schoolId',
    authMiddleware,
    async (req, res) => {
        try {
            // Check if user has access to this school
            if (req.user.role !== 'super_admin' &&
                req.user.schoolId.toString() !== req.params.schoolId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            const users = await User.find({
                schoolId: req.params.schoolId,
                role: { $in: ['admin', 'staff'] }
            })
                .select('-password')
                .sort({ role: 1, createdAt: -1 });

            res.json({
                success: true,
                users,
                total: users.length
            });

        } catch (error) {
            console.error('Get school users error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);


// REQUEST password reset (user enters email)
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Don't reveal that user doesn't exist (security)
            return res.json({
                success: true,
                message: 'If email exists, reset link will be sent'
            });
        }

        // Generate reset token
        const resetToken = user.generatePasswordResetToken();
        await user.save();

        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${user.email}`;


        // Password reset email
        await sendEmail({
            to: user.email,
            subject: '🔐 Reset Your CAP Password',
            template: 'password-reset',
            context: {
                firstName: user.firstName,
                resetUrl: `${FRONTEND_URL}/reset-password?token=${resetToken}`,
                expiryHours: 1,
                supportEmail: 'support@cap.com'
            }
        });
        res.json({
            success: true,
            message: 'Password reset email sent'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ACTUALLY reset password (when user clicks link)
router.post('/reset-password', async (req, res) => {
    try {
        const { token, email, newPassword } = req.body;

        // Hash the token (since we stored hashed version)
        const crypto = require('crypto');
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Find user with valid token
        const user = await User.findOne({
            email: email.toLowerCase(),
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired reset token'
            });
        }

        // Update password
        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        // Optional: Send confirmation email
        await sendEmail({
            to: user.email,
            subject: '✅ Your Password Has Been Changed',
            template: 'password-changed', // You might want to create this
            context: {
                firstName: user.firstName,
                loginUrl: `${process.env.FRONTEND_URL}/login`,
                supportEmail: process.env.SUPPORT_EMAIL
            }
        });

        res.json({
            success: true,
            message: 'Password reset successful'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
















// ============================================
// HELPER FUNCTIONS
// ============================================

function checkPasswordStrength(password) {
    let score = 0;
    if (!password) return { score: 0, strength: 'No password' };

    // Length check
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 10;

    // Complexity checks
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 20;

    // No common patterns
    if (!/(123|abc|password|qwerty|admin)/i.test(password)) score += 10;

    const strength =
        score >= 90 ? 'Very Strong' :
            score >= 70 ? 'Strong' :
                score >= 50 ? 'Medium' :
                    score >= 25 ? 'Weak' : 'Very Weak';

    return { score, strength };
}

async function generateUniqueUsername(baseUsername) {
    let username = baseUsername;
    let counter = 1;

    while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
    }

    return username;
}
const cleanPhoneNumber = (phone) => {
    if (!phone) return '';
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    return digits;
};

module.exports = router;