// services/subscriptionService.js
const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const School = require('../models/School');
const Plan = require('../models/Plans');
const { sendEmail } = require('../utilis/emailService');
const AuditLog = require('../models/AuditLog');

class SubscriptionService {
    
    /**
     * Initialize all cron jobs
     */
    static init() {
        console.log('🕐 Initializing subscription cron jobs...');
        
        // Check expiring subscriptions every day at 8 AM
        cron.schedule('0 8 * * *', () => {
            this.checkExpiringSubscriptions();
        });
        
        // Check expired subscriptions every day at 12 AM
        cron.schedule('0 0 * * *', () => {
            this.handleExpiredSubscriptions();
        });
        
        // Send trial ending soon emails every day at 9 AM
        cron.schedule('0 9 * * *', () => {
            this.checkTrialEnding();
        });
        
        // Generate invoices for upcoming payments every 1st of month at 2 AM
        cron.schedule('0 2 1 * *', () => {
            this.generateUpcomingInvoices();
        });
        
        // Clean up old data every Sunday at 3 AM
        cron.schedule('0 3 * * 0', () => {
            this.cleanupOldData();
        });
        
        console.log('✅ Subscription cron jobs initialized');
    }

    /**
     * Check and send reminders for expiring subscriptions
     */
    static async checkExpiringSubscriptions() {
        console.log('🔍 Checking for expiring subscriptions...');
        
        try {
            const now = new Date();
            const sevenDaysFromNow = new Date(now);
            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
            
            const threeDaysFromNow = new Date(now);
            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
            
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Find all active subscriptions
            const expiringSubs = await Subscription.find({
                status: { $in: ['active', 'trial'] },
                currentPeriodEnd: { $gte: now },
                $or: [
                    // 7-day reminder (not sent yet)
                    {
                        currentPeriodEnd: { $lte: sevenDaysFromNow },
                        'reminders.7day': { $ne: true }
                    },
                    // 3-day reminder (not sent yet)
                    {
                        currentPeriodEnd: { $lte: threeDaysFromNow },
                        'reminders.3day': { $ne: true }
                    },
                    // 1-day reminder (not sent yet)
                    {
                        currentPeriodEnd: { $lte: tomorrow },
                        'reminders.1day': { $ne: true }
                    }
                ]
            }).populate('userId schoolId planId');

            console.log(`Found ${expiringSubs.length} subscriptions needing reminders`);

            for (const sub of expiringSubs) {
                const daysRemaining = Math.ceil(
                    (sub.currentPeriodEnd - now) / (1000 * 60 * 60 * 24)
                );

                // Determine reminder type
                let reminderType = null;
                if (daysRemaining <= 1 && !sub.reminders?.get('1day')) {
                    reminderType = '1day';
                } else if (daysRemaining <= 3 && !sub.reminders?.get('3day')) {
                    reminderType = '3day';
                } else if (daysRemaining <= 7 && !sub.reminders?.get('7day')) {
                    reminderType = '7day';
                }

                if (!reminderType) continue;

                // Send email
                await this.sendExpirationReminder(sub, daysRemaining, reminderType);

                // Mark reminder as sent
                await Subscription.updateOne(
                    { _id: sub._id },
                    { 
                        $set: { 
                            [`reminders.${reminderType}`]: true,
                            [`reminders.${reminderType}SentAt`]: new Date()
                        }
                    }
                );

                // Log the action
                await AuditLog.create({
                    userId: sub.userId._id,
                    schoolId: sub.schoolId._id,
                    action: 'SUBSCRIPTION_REMINDER_SENT',
                    details: {
                        subscriptionId: sub._id,
                        daysRemaining,
                        reminderType
                    },
                    importance: 'high'
                });

                console.log(`✅ Sent ${reminderType} reminder to ${sub.userId.email}`);
            }

        } catch (error) {
            console.error('❌ Error checking expiring subscriptions:', error);
        }
    }

    /**
     * Handle expired subscriptions
     */
    static async handleExpiredSubscriptions() {
        console.log('🔍 Checking for expired subscriptions...');
        
        try {
            const now = new Date();
            
            // Find recently expired (within last 7 days)
            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const expiredSubs = await Subscription.find({
                status: { $in: ['active', 'trial'] },
                currentPeriodEnd: { $lt: now, $gte: sevenDaysAgo }
            }).populate('userId schoolId planId');

            console.log(`Found ${expiredSubs.length} recently expired subscriptions`);

            for (const sub of expiredSubs) {
                // Update subscription status
                sub.status = 'expired';
                sub.expiredAt = now;
                await sub.save();

                // Update user's subscription status
                await User.findByIdAndUpdate(sub.userId._id, {
                    'subscription.status': 'expired',
                    'subscription.expiredAt': now
                });

                // Send expiration email
                await this.sendExpirationEmail(sub);

                // Log the action
                await AuditLog.create({
                    userId: sub.userId._id,
                    schoolId: sub.schoolId._id,
                    action: 'SUBSCRIPTION_EXPIRED',
                    details: {
                        subscriptionId: sub._id,
                        planName: sub.planId.name,
                        expiredAt: now
                    },
                    importance: 'critical'
                });

                console.log(`⚠️ Subscription expired for ${sub.schoolId.name}`);
            }

            // Handle long-expired subscriptions (more than 7 days)
            const longExpired = await Subscription.find({
                status: 'expired',
                currentPeriodEnd: { $lt: sevenDaysAgo },
                dataRetained: { $ne: false }
            });

            for (const sub of longExpired) {
                // Option 1: Mark for data archival
                // Option 2: Send final warning before deletion
                // Option 3: Keep data but restrict access
                
                // For now, just mark as archived
                sub.dataRetained = false;
                sub.archivedAt = now;
                await sub.save();

                // Notify super admin
                await this.notifySuperAdmin({
                    type: 'LONG_EXPIRED',
                    school: sub.schoolId,
                    subscription: sub
                });
            }

        } catch (error) {
            console.error('❌ Error handling expired subscriptions:', error);
        }
    }

    /**
     * Check trial periods ending soon
     */
    static async checkTrialEnding() {
        console.log('🔍 Checking for trials ending soon...');
        
        try {
            const now = new Date();
            const threeDaysFromNow = new Date(now);
            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
            
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Find trials ending in 3 days or tomorrow
            const endingTrials = await Subscription.find({
                status: 'trial',
                trialEnd: { $lte: threeDaysFromNow, $gte: now }
            }).populate('userId schoolId planId');

            for (const sub of endingTrials) {
                const daysLeft = Math.ceil(
                    (sub.trialEnd - now) / (1000 * 60 * 60 * 24)
                );

                // Send trial ending email if not already sent
                if (!sub.reminders?.get('trialEnding')) {
                    await this.sendTrialEndingEmail(sub, daysLeft);
                    
                    await Subscription.updateOne(
                        { _id: sub._id },
                        { 
                            $set: { 
                                'reminders.trialEnding': true,
                                'reminders.trialEndingSentAt': now
                            }
                        }
                    );
                }
            }

        } catch (error) {
            console.error('❌ Error checking trial endings:', error);
        }
    }

    /**
     * Send expiration reminder email
     */
    static async sendExpirationReminder(subscription, daysRemaining, reminderType) {
        const subject = reminderType === '1day' 
            ? '🚨 URGENT: Your CAP Subscription Expires Tomorrow!'
            : `⚠️ Your CAP Subscription Expires in ${daysRemaining} Days`;

        const template = reminderType === '1day' 
            ? 'subscription-expiring-urgent' 
            : 'subscription-expiring';

        await sendEmail({
            to: subscription.userId.email,
            subject,
            template,
            context: {
                firstName: subscription.userId.firstName,
                schoolName: subscription.schoolId.name,
                planName: subscription.planId.name,
                daysRemaining,
                expiryDate: subscription.currentPeriodEnd.toLocaleDateString(),
                renewalUrl: `${process.env.FRONTEND_URL}/billing/renew?subscription=${subscription._id}`,
                upgradeUrl: `${process.env.FRONTEND_URL}/plans`,
                billingUrl: `${process.env.FRONTEND_URL}/billing`,
                supportEmail: process.env.SUPPORT_EMAIL,
                isUrgent: reminderType === '1day'
            }
        });
    }

    /**
     * Send expiration email
     */
    static async sendExpirationEmail(subscription) {
        await sendEmail({
            to: subscription.userId.email,
            subject: '⏸️ Your CAP Subscription Has Expired',
            template: 'subscription-expired',
            context: {
                firstName: subscription.userId.firstName,
                schoolName: subscription.schoolId.name,
                planName: subscription.planId.name,
                expiredDate: new Date().toLocaleDateString(),
                reactivateUrl: `${process.env.FRONTEND_URL}/billing/reactivate?subscription=${subscription._id}`,
                contactUrl: `${process.env.FRONTEND_URL}/contact`,
                gracePeriod: '7 days', // Configurable
                dataRetention: 'Your data will be retained for 30 days'
            }
        });
    }

    /**
     * Send trial ending email
     */
    static async sendTrialEndingEmail(subscription, daysLeft) {
        await sendEmail({
            to: subscription.userId.email,
            subject: `⏰ Your CAP Trial Ends in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}`,
            template: 'trial-ending',
            context: {
                firstName: subscription.userId.firstName,
                schoolName: subscription.schoolId.name,
                daysLeft,
                trialEndDate: subscription.trialEnd.toLocaleDateString(),
                subscribeUrl: `${process.env.FRONTEND_URL}/plans`,
                features: subscription.planId.features,
                supportEmail: process.env.SUPPORT_EMAIL
            }
        });
    }

    /**
     * Generate upcoming invoices
     */
    static async generateUpcomingInvoices() {
        console.log('📄 Generating upcoming invoices...');
        
        try {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            const subscriptions = await Subscription.find({
                status: 'active',
                currentPeriodEnd: {
                    $gte: new Date(),
                    $lte: nextMonth
                },
                'invoices.upcoming': { $ne: true }
            }).populate('userId schoolId planId');

            for (const sub of subscriptions) {
                // Create invoice
                const invoice = {
                    invoiceNumber: `INV-${Date.now()}-${sub._id.toString().slice(-4)}`,
                    amount: sub.planId.price.monthly,
                    currency: 'XAF',
                    status: 'upcoming',
                    dueDate: sub.currentPeriodEnd,
                    items: [
                        {
                            description: `${sub.planId.name} Plan - Monthly Subscription`,
                            quantity: 1,
                            unitPrice: sub.planId.price.monthly,
                            total: sub.planId.price.monthly
                        }
                    ]
                };

                // Add to subscription
                sub.invoices.push(invoice);
                sub.invoices.upcoming = true;
                await sub.save();

                // Send upcoming payment notification
                await sendEmail({
                    to: sub.userId.email,
                    subject: '📅 Upcoming Payment Notification',
                    template: 'upcoming-payment',
                    context: {
                        firstName: sub.userId.firstName,
                        schoolName: sub.schoolId.name,
                        amount: invoice.amount,
                        dueDate: invoice.dueDate.toLocaleDateString(),
                        planName: sub.planId.name,
                        billingUrl: `${process.env.FRONTEND_URL}/billing`
                    }
                });
            }

        } catch (error) {
            console.error('❌ Error generating invoices:', error);
        }
    }

    /**
     * Clean up old data
     */
    static async cleanupOldData() {
        console.log('🧹 Cleaning up old subscription data...');
        
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Archive old subscriptions
            await Subscription.updateMany(
                {
                    status: 'expired',
                    currentPeriodEnd: { $lt: thirtyDaysAgo },
                    archived: { $ne: true }
                },
                {
                    $set: {
                        archived: true,
                        archivedAt: new Date()
                    }
                }
            );

            // Remove old reminder flags (optional)
            // This keeps the collection clean

            console.log('✅ Cleanup completed');

        } catch (error) {
            console.error('❌ Error cleaning up data:', error);
        }
    }

    /**
     * Notify super admin about important events
     */
    static async notifySuperAdmin(data) {
        // Find all super admins
        const superAdmins = await User.find({ role: 'super_admin' });

        for (const admin of superAdmins) {
            await sendEmail({
                to: admin.email,
                subject: `🔔 CAP System Alert: ${data.type}`,
                template: 'admin-alert',
                context: {
                    firstName: admin.firstName,
                    alertType: data.type,
                    schoolName: data.school?.name,
                    details: data,
                    dashboardUrl: `${process.env.FRONTEND_URL}/super-admin`
                }
            });
        }
    }

    /**
     * Manually check subscription for a school
     */
    static async checkSchoolSubscription(schoolId) {
        const subscription = await Subscription.findOne({ schoolId })
            .populate('planId');

        if (!subscription) return null;

        const now = new Date();
        const status = {
            isValid: subscription.currentPeriodEnd > now,
            daysRemaining: Math.ceil((subscription.currentPeriodEnd - now) / (1000 * 60 * 60 * 24)),
            status: subscription.status,
            plan: subscription.planId.name
        };

        return status;
    }

    /**
     * Renew subscription
     */
    static async renewSubscription(subscriptionId, paymentDetails) {
        const subscription = await Subscription.findById(subscriptionId)
            .populate('planId userId');

        if (!subscription) {
            throw new Error('Subscription not found');
        }

        // Calculate new period
        const now = new Date();
        const newPeriodEnd = new Date(now);
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

        // Update subscription
        subscription.status = 'active';
        subscription.currentPeriodStart = now;
        subscription.currentPeriodEnd = newPeriodEnd;
        subscription.renewedAt = now;
        subscription.paymentMethod = paymentDetails.method;
        
        // Add invoice
        subscription.invoices.push({
            invoiceNumber: `INV-${Date.now()}`,
            amount: subscription.planId.price.monthly,
            currency: 'XAF',
            status: 'paid',
            paidAt: now,
            paymentMethod: paymentDetails.method,
            transactionId: paymentDetails.transactionId
        });

        // Reset reminders
        subscription.reminders = {};
        await subscription.save();

        // Update user
        await User.findByIdAndUpdate(subscription.userId._id, {
            'subscription.status': 'active',
            'subscription.expiresAt': newPeriodEnd
        });

        // Send confirmation
        await sendEmail({
            to: subscription.userId.email,
            subject: '✅ Your CAP Subscription Has Been Renewed',
            template: 'subscription-renewed',
            context: {
                firstName: subscription.userId.firstName,
                schoolName: subscription.schoolId.name,
                planName: subscription.planId.name,
                validUntil: newPeriodEnd.toLocaleDateString(),
                amount: subscription.planId.price.monthly,
                invoiceUrl: `${process.env.FRONTEND_URL}/billing/invoice/${subscription.invoices.slice(-1)[0].invoiceNumber}`
            }
        });

        return subscription;
    }
}

module.exports = SubscriptionService;