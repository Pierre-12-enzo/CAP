const express = require('express');
const router = express.Router();
const User = require('../models/User');
const School = require('../models/School');
const AuditLog = require('../models/AuditLog');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../utilis/emailService');

// ============================================
// STAFF MANAGEMENT (Admin Only)
// ============================================

/**
 * @desc    Get all staff for admin's school
 * @route   GET /api/staff
 * @access  Private (Admin)
 */
router.get('/',
    authMiddleware,
    roleMiddleware(['admin', 'super_admin']),
    async (req, res) => {
        try {
            const query = { role: 'staff' };

            // If admin, only show their school's staff
            if (req.user.role === 'admin') {
                query.schoolId = req.user.schoolId;
            }

            // If super_admin, allow filtering by schoolId
            if (req.user.role === 'super_admin' && req.query.schoolId) {
                query.schoolId = req.query.schoolId;
            }

            const staff = await User.find(query)
                .populate('schoolId', 'name')
                .populate('createdBy', 'firstName lastName email')
                .select('-password')
                .sort({ createdAt: -1 });

                

            // Add computed fields
            const enhancedStaff = staff.map(member => ({
                ...member.toObject(),
                fullName: member.fullName,
                initials: member.initials,
                status: member.isActive ? 'active' : 'inactive',
                lastLogin: member.lastLogin?.at,
                creatorName: member.createdBy ?
                    `${member.createdBy.firstName} ${member.createdBy.lastName}` : null
            }));
            console.log('Staff SCHOOL:', enhancedStaff[0]?.schoolId);

            res.json({
                success: true,
                count: enhancedStaff.length,
                staff: enhancedStaff
            });

        } catch (error) {
            console.error('Get staff error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

/**
 * @desc    Get single staff member
 * @route   GET /api/staff/:id
 * @access  Private (Admin)
 */
router.get('/:id',
    authMiddleware,
    roleMiddleware(['admin', 'super_admin']),
    async (req, res) => {
        try {
            const staff = await User.findOne({
                _id: req.params.id,
                role: 'staff'
            })
                .populate('schoolId', 'name address phone email')
                .populate('createdBy', 'firstName lastName email')
                .select('-password');

            if (!staff) {
                return res.status(404).json({
                    success: false,
                    error: 'Staff member not found'
                });
            }

            // Check permission (admin can only see their school's staff)
            if (req.user.role === 'admin' &&
                staff.schoolId._id.toString() !== req.user.schoolId.toString()) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            // Get additional stats
            const stats = {
                totalActions: await AuditLog.countDocuments({ userId: staff._id }),
                lastActions: await AuditLog.find({ userId: staff._id })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .select('action details createdAt')
            };

            res.json({
                success: true,
                staff: {
                    ...staff.toObject(),
                    fullName: staff.fullName,
                    initials: staff.initials,
                    stats
                }
            });

        } catch (error) {
            console.error('Get staff error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

/**
 * @desc    Create new staff member
 * @route   POST /api/staff
 * @access  Private (Admin)
 */
router.post('/',
    authMiddleware,
    roleMiddleware(['admin', 'super_admin']),
    async (req, res) => {
        try {
            const {
                firstName,
                lastName,
                email,
                phoneNumber,
                permissions,
                schoolId // Only super_admin can specify schoolId
            } = req.body;

            // Validate required fields
            if (!firstName || !lastName || !email) {
                return res.status(400).json({
                    success: false,
                    error: 'First name, last name, and email are required'
                });
            }

            // Check if user already exists
            const existingUser = await User.findOne({
                email: email.toLowerCase()
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'User with this email already exists'
                });
            }

            // Determine schoolId (admin uses their own, super_admin can specify)
            let targetSchoolId = req.user.schoolId;
            if (req.user.role === 'super_admin' && schoolId) {
                targetSchoolId = schoolId;
            } else if (req.user.role === 'admin') {
                targetSchoolId = req.user.schoolId;
            }

            // Verify school exists
            const school = await School.findById(targetSchoolId);
            if (!school) {
                return res.status(404).json({
                    success: false,
                    error: 'School not found'
                });
            }

            // Check staff limit based on subscription
            const staffCount = await User.countDocuments({
                schoolId: targetSchoolId,
                role: 'staff'
            });

            // You might want to check against subscription limits here
            // const subscription = await Subscription.findOne({ schoolId: targetSchoolId });
            // if (staffCount >= subscription.planId.limits.maxStaff) {
            //     return res.status(400).json({ error: 'Staff limit reached' });
            // }

            // Generate username and temporary password
            const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
            const username = await generateUniqueUsername(baseUsername);

            const tempPassword = generateTemporaryPassword();

            // Create staff
            const staff = await User.create({
                firstName,
                lastName,
                username,
                email: email.toLowerCase(),
                phoneNumber,
                password: await bcrypt.hash(tempPassword, 10),
                role: 'staff',
                schoolId: targetSchoolId,
                createdBy: req.user._id,
                permissions: {
                    canViewAnalytics: permissions?.canViewAnalytics || false,
                    canGenerateCards: permissions?.canGenerateCards || false,
                    canManageStudents: permissions?.canManageStudents || false,
                    canManageTemplates: permissions?.canManageTemplates || false,
                    canViewAuditLogs: permissions?.canViewAuditLogs || false,
                    canMarkAttendance: permissions?.canMarkAttendance || false,
                    canUploadCSV: permissions?.canUploadCSV || false,
                    canUploadPhotos: permissions?.canUploadPhotos || false
                },
                metadata: {
                    registrationCompleted: true,
                    needsPasswordChange: true
                },
                isEmailVerified: false
            });

            // Send staff invite email
            await sendEmail({
                to: staff.email,
                subject: `🏫 You've been added to ${school.name}`,
                template: 'staff-invite',
                context: {
                    firstName: staff.firstName,
                    schoolName: school.name,
                    adminName: `${req.user.firstName} ${req.user.lastName}`,
                    email: staff.email,
                    tempPassword: tempPassword,
                    loginUrl: `${process.env.FRONTEND_URL}/login`,
                    changePasswordUrl: `${process.env.FRONTEND_URL}/change-password`,
                    permissions: Object.entries(staff.permissions)
                        .filter(([_, value]) => value)
                        .map(([key]) => {
                            return key.replace('can', '')
                                .replace(/([A-Z])/g, ' $1')
                                .trim();
                        }),
                    helpUrl: `${process.env.FRONTEND_URL}/help`,
                    privacyPolicyUrl: `${process.env.FRONTEND_URL}/privacy`,
                    termsUrl: `${process.env.FRONTEND_URL}/terms`
                }
            });

            // Log the action
            await AuditLog.create({
                action: 'CREATE_STAFF',
                userId: req.user._id,
                schoolId: targetSchoolId,
                details: {
                    staffId: staff._id,
                    staffEmail: staff.email,
                    permissions: staff.permissions
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.status(201).json({
                success: true,
                message: 'Staff created successfully',
                staff: {
                    id: staff._id,
                    firstName: staff.firstName,
                    lastName: staff.lastName,
                    email: staff.email,
                    phoneNumber: staff.phoneNumber,
                    permissions: staff.permissions,
                    school: {
                        id: school._id,
                        name: school.name
                    }
                }
            });

        } catch (error) {
            console.error('Create staff error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

/**
 * @desc    Update staff member
 * @route   PUT /api/staff/:id
 * @access  Private (Admin)
 */
router.put('/:id',
    authMiddleware,
    roleMiddleware(['admin', 'super_admin']),
    async (req, res) => {
        try {
            const { firstName, lastName, phoneNumber, permissions, isActive } = req.body;

            // Find staff
            const staff = await User.findOne({
                _id: req.params.id,
                role: 'staff'
            });

            if (!staff) {
                return res.status(404).json({
                    success: false,
                    error: 'Staff member not found'
                });
            }

            // Check permission (admin can only update their school's staff)

            if (req.user.role === 'admin' &&
                staff.schoolId.toString() !== req.schoolId.toString()) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            // Track changes for audit log
            const changes = {};

            // Update fields
            if (firstName) {
                changes.firstName = { from: staff.firstName, to: firstName };
                staff.firstName = firstName;
            }
            if (lastName) {
                changes.lastName = { from: staff.lastName, to: lastName };
                staff.lastName = lastName;
            }
            if (phoneNumber) {
                changes.phoneNumber = { from: staff.phoneNumber, to: phoneNumber };
                staff.phoneNumber = phoneNumber;
            }
            if (isActive !== undefined) {
                changes.isActive = { from: staff.isActive, to: isActive };
                staff.isActive = isActive;
            }

            // Update permissions
            if (permissions) {
                const oldPermissions = { ...staff.permissions };
                Object.keys(permissions).forEach(key => {
                    if (staff.permissions[key] !== undefined) {
                        staff.permissions[key] = permissions[key];
                    }
                });
                changes.permissions = { from: oldPermissions, to: permissions };
            }

            await staff.save();

            // Log the action
            await AuditLog.create({
                action: 'UPDATE_STAFF',
                userId: req.user._id,
                schoolId: staff.schoolId,
                details: {
                    staffId: staff._id,
                    staffEmail: staff.email,
                    changes
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            // If deactivated, send email notification
            if (isActive === false) {
                await sendEmail({
                    to: staff.email,
                    subject: `⚠️ Your CAP Account Has Been Deactivated`,
                    template: 'account-deactivated', // You might want to create this
                    context: {
                        firstName: staff.firstName,
                        schoolName: (await School.findById(staff.schoolId)).name,
                        adminName: `${req.user.firstName} ${req.user.lastName}`,
                        supportEmail: process.env.SUPPORT_EMAIL
                    }
                });
            }

            res.json({
                success: true,
                message: 'Staff updated successfully',
                staff: {
                    id: staff._id,
                    firstName: staff.firstName,
                    lastName: staff.lastName,
                    email: staff.email,
                    phoneNumber: staff.phoneNumber,
                    permissions: staff.permissions,
                    isActive: staff.isActive
                }
            });

        } catch (error) {
            console.error('Update staff error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

/**
 * @desc    Update staff permissions only
 * @route   PATCH /api/staff/:id/permissions
 * @access  Private (Admin)
 */
router.patch('/:id/permissions',
    authMiddleware,
    roleMiddleware(['admin', 'super_admin']),
    async (req, res) => {
        try {
            const { permissions } = req.body;

            const staff = await User.findOne({
                _id: req.params.id,
                role: 'staff'
            });

            if (!staff) {
                return res.status(404).json({
                    success: false,
                    error: 'Staff member not found'
                });
            }

            // Check permission
            if (req.user.role === 'admin' &&
                staff.schoolId.toString() !== req.user.schoolId.toString()) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            const oldPermissions = { ...staff.permissions };

            // Update permissions
            Object.keys(permissions).forEach(key => {
                if (staff.permissions[key] !== undefined) {
                    staff.permissions[key] = permissions[key];
                }
            });

            await staff.save();

            // Log permission change
            await AuditLog.create({
                action: 'UPDATE_STAFF_PERMISSIONS',
                userId: req.user._id,
                schoolId: staff.schoolId,
                details: {
                    staffId: staff._id,
                    staffEmail: staff.email,
                    oldPermissions,
                    newPermissions: permissions
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            // Send email notification about permission changes
            await sendEmail({
                to: staff.email,
                subject: `🔑 Your CAP Permissions Have Been Updated`,
                template: 'permissions-updated', // You might want to create this
                context: {
                    firstName: staff.firstName,
                    schoolName: (await School.findById(staff.schoolId)).name,
                    adminName: `${req.user.firstName} ${req.user.lastName}`,
                    oldPermissions: Object.keys(oldPermissions)
                        .filter(key => oldPermissions[key])
                        .map(key => key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()),
                    newPermissions: Object.keys(permissions)
                        .filter(key => permissions[key])
                        .map(key => key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()),
                    loginUrl: `${process.env.FRONTEND_URL}/login`
                }
            });

            res.json({
                success: true,
                message: 'Permissions updated',
                permissions: staff.permissions
            });

        } catch (error) {
            console.error('Update permissions error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

/**
 * @desc    Delete staff member (soft delete or hard delete)
 * @route   DELETE /api/staff/:id
 * @access  Private (Admin)
 */
router.delete('/:id',
    authMiddleware,
    roleMiddleware(['admin', 'super_admin']),
    async (req, res) => {
        try {
            const { permanent } = req.query; // ?permanent=true for hard delete

            const staff = await User.findOne({
                _id: req.params.id,
                role: 'staff'
            });

            if (!staff) {
                return res.status(404).json({
                    success: false,
                    error: 'Staff member not found'
                });
            }

            // Check permission
            if (req.user.role === 'admin' &&
                staff.schoolId.toString() !== req.schoolId.toString()) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            if (permanent === 'true') {
                // Permanent delete (use with caution!)
                await User.findByIdAndDelete(staff._id);

                await AuditLog.create({
                    action: 'DELETE_STAFF',
                    userId: req.user._id,
                    schoolId: staff.schoolId,
                    details: {
                        staffId: staff._id,
                        staffEmail: staff.email,
                        staffName: `${staff.firstName} ${staff.lastName}`
                    },
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                });

                res.json({
                    success: true,
                    message: 'Staff permanently deleted'
                });
            } else {
                // Soft delete (deactivate)
                staff.isActive = false;
                await staff.save();

                // Send goodbye email
                await sendEmail({
                    to: staff.email,
                    subject: `👋 Account Deactivated - ${(await School.findById(staff.schoolId)).name}`,
                    template: 'account-deactivated',
                    context: {
                        firstName: staff.firstName,
                        schoolName: (await School.findById(staff.schoolId)).name,
                        adminName: `${req.user.firstName} ${req.user.lastName}`,
                        supportEmail: process.env.SUPPORT_EMAIL,
                        reactivateUrl: `${process.env.FRONTEND_URL}/contact-support`
                    }
                });

                await AuditLog.create({
                    action: 'DEACTIVATE_STAFF',
                    userId: req.user._id,
                    schoolId: staff.schoolId,
                    details: {
                        staffId: staff._id,
                        staffEmail: staff.email
                    },
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                });

                res.json({
                    success: true,
                    message: 'Staff deactivated successfully'
                });
            }

        } catch (error) {
            console.error('Delete staff error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

/**
 * @desc    Resend staff invitation email
 * @route   POST /api/staff/:id/resend-invite
 * @access  Private (Admin)
 */
router.post('/:id/resend-invite',
    authMiddleware,
    roleMiddleware(['admin', 'super_admin']),
    async (req, res) => {
        try {
            const staff = await User.findOne({
                _id: req.params.id,
                role: 'staff'
            }).populate('schoolId');

            if (!staff) {
                return res.status(404).json({
                    success: false,
                    error: 'Staff member not found'
                });
            }

            // Check permission
            if (req.user.role === 'admin' &&
                staff.schoolId._id.toString() !== req.schoolId.toString()) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            // Generate new temporary password
            const tempPassword = generateTemporaryPassword();
            staff.password = await bcrypt.hash(tempPassword, 10);
            staff.metadata.needsPasswordChange = true;
            await staff.save();

            // Resend invitation
            await sendEmail({
                to: staff.email,
                subject: `🏫 Reminder: You've been added to ${staff.schoolId.name}`,
                template: 'staff-invite',
                context: {
                    firstName: staff.firstName,
                    schoolName: staff.schoolId.name,
                    adminName: `${req.user.firstName} ${req.user.lastName}`,
                    email: staff.email,
                    tempPassword: tempPassword,
                    loginUrl: `${process.env.FRONTEND_URL}/login`,
                    changePasswordUrl: `${process.env.FRONTEND_URL}/change-password`,
                    permissions: Object.entries(staff.permissions)
                        .filter(([_, value]) => value)
                        .map(([key]) => key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()),
                    helpUrl: `${process.env.FRONTEND_URL}/help`
                }
            });

            await AuditLog.create({
                action: 'RESEND_STAFF_INVITE',
                userId: req.user._id,
                schoolId: staff.schoolId._id,
                details: {
                    staffId: staff._id,
                    staffEmail: staff.email
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.json({
                success: true,
                message: 'Invitation resent successfully'
            });

        } catch (error) {
            console.error('Resend invite error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

/**
 * @desc    Bulk create staff from CSV
 * @route   POST /api/staff/bulk
 * @access  Private (Admin)
 */
router.post('/bulk',
    authMiddleware,
    roleMiddleware(['admin', 'super_admin']),
    async (req, res) => {
        try {
            const { staffList } = req.body; // Array of staff objects

            if (!Array.isArray(staffList) || staffList.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Please provide an array of staff members'
                });
            }

            const results = {
                success: [],
                failed: []
            };

            const school = await School.findById(req.user.schoolId);

            for (const staffData of staffList) {
                try {
                    const { firstName, lastName, email, permissions } = staffData;

                    // Check if exists
                    const existing = await User.findOne({ email: email.toLowerCase() });
                    if (existing) {
                        results.failed.push({
                            email,
                            reason: 'User already exists'
                        });
                        continue;
                    }

                    // Generate username
                    const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
                    const username = await generateUniqueUsername(baseUsername);

                    const tempPassword = generateTemporaryPassword();

                    const staff = await User.create({
                        firstName,
                        lastName,
                        username,
                        email: email.toLowerCase(),
                        password: await bcrypt.hash(tempPassword, 10),
                        role: 'staff',
                        schoolId: req.user.schoolId,
                        createdBy: req.user._id,
                        permissions: {
                            canViewAnalytics: permissions?.canViewAnalytics || false,
                            canGenerateCards: permissions?.canGenerateCards || false,
                            canManageStudents: permissions?.canManageStudents || false,
                            canManageTemplates: permissions?.canManageTemplates || false,
                            canViewAuditLogs: permissions?.canViewAuditLogs || false,
                            canMarkAttendance: permissions?.canMarkAttendance || false,
                            canUploadCSV: permissions?.canUploadCSV || false,
                            canUploadPhotos: permissions?.canUploadPhotos || false
                        }
                    });

                    // Send email
                    await sendEmail({
                        to: staff.email,
                        subject: `🏫 You've been added to ${school.name}`,
                        template: 'staff-invite',
                        context: {
                            firstName: staff.firstName,
                            schoolName: school.name,
                            adminName: `${req.user.firstName} ${req.user.lastName}`,
                            email: staff.email,
                            tempPassword: tempPassword,
                            loginUrl: `${process.env.FRONTEND_URL}/login`,
                            changePasswordUrl: `${process.env.FRONTEND_URL}/change-password`,
                            permissions: Object.entries(staff.permissions)
                                .filter(([_, value]) => value)
                                .map(([key]) => key.replace('can', '').replace(/([A-Z])/g, ' $1').trim())
                        }
                    });

                    results.success.push({
                        id: staff._id,
                        email: staff.email,
                        name: `${staff.firstName} ${staff.lastName}`
                    });

                } catch (error) {
                    results.failed.push({
                        email: staffData.email,
                        reason: error.message
                    });
                }
            }

            await AuditLog.create({
                action: 'BULK_CREATE_STAFF',
                userId: req.user._id,
                schoolId: req.user.schoolId,
                details: {
                    total: staffList.length,
                    success: results.success.length,
                    failed: results.failed.length,
                    failures: results.failed
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.status(201).json({
                success: true,
                message: `Created ${results.success.length} staff members`,
                results
            });

        } catch (error) {
            console.error('Bulk create staff error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// ============================================
// HELPER FUNCTIONS
// ============================================

async function generateUniqueUsername(baseUsername) {
    let username = baseUsername;
    let counter = 1;

    while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
    }

    return username;
}

function generateTemporaryPassword() {
    const length = 10;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password + "A1!"; // Ensure it meets complexity requirements
}

module.exports = router;