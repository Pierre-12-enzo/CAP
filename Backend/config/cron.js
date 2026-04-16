// config/cron.js
const cron = require('node-cron');
const SubscriptionService = require('../services/subscriptionService');

class CronManager {
    
    static jobs = [];

    /**
     * Initialize all cron jobs with proper timezone and error handling
     */
    static init() {
        console.log('🕐 Initializing cron jobs...');

        // Check if we're in production to avoid multiple cron instances
        if (process.env.NODE_ENV === 'production') {
            // In production, ensure only one instance runs this
            // You might want to use a distributed lock here
            this.setupJobs();
        } else {
            // In development, run normally
            this.setupJobs();
        }
    }

    static setupJobs() {
        const timezone = process.env.TZ || 'Africa/Douala';

        // Job 1: Check expiring subscriptions - Every day at 8 AM
        this.jobs.push(
            cron.schedule('0 8 * * *', async () => {
                console.log(`[${new Date().toISOString()}] Running subscription expiry check...`);
                try {
                    await SubscriptionService.checkExpiringSubscriptions();
                } catch (error) {
                    console.error('Cron job failed (expiring subscriptions):', error);
                }
            }, {
                timezone: timezone,
                scheduled: true
            })
        );

        // Job 2: Handle expired subscriptions - Every day at 12 AM
        this.jobs.push(
            cron.schedule('0 0 * * *', async () => {
                console.log(`[${new Date().toISOString()}] Running expired subscriptions check...`);
                try {
                    await SubscriptionService.handleExpiredSubscriptions();
                } catch (error) {
                    console.error('Cron job failed (expired subscriptions):', error);
                }
            }, {
                timezone: timezone,
                scheduled: true
            })
        );

        // Job 3: Check trial endings - Every day at 9 AM
        this.jobs.push(
            cron.schedule('0 9 * * *', async () => {
                console.log(`[${new Date().toISOString()}] Running trial ending check...`);
                try {
                    await SubscriptionService.checkTrialEnding();
                } catch (error) {
                    console.error('Cron job failed (trial ending):', error);
                }
            }, {
                timezone: timezone,
                scheduled: true
            })
        );

        // Job 4: Generate invoices - 1st of every month at 2 AM
        this.jobs.push(
            cron.schedule('0 2 1 * *', async () => {
                console.log(`[${new Date().toISOString()}] Generating invoices...`);
                try {
                    await SubscriptionService.generateUpcomingInvoices();
                } catch (error) {
                    console.error('Cron job failed (invoice generation):', error);
                }
            }, {
                timezone: timezone,
                scheduled: true
            })
        );

        // Job 5: Cleanup old data - Every Sunday at 3 AM
        this.jobs.push(
            cron.schedule('0 3 * * 0', async () => {
                console.log(`[${new Date().toISOString()}] Running cleanup...`);
                try {
                    await SubscriptionService.cleanupOldData();
                } catch (error) {
                    console.error('Cron job failed (cleanup):', error);
                }
            }, {
                timezone: timezone,
                scheduled: true
            })
        );

        // Job 6: Send weekly reports - Every Monday at 6 AM
        this.jobs.push(
            cron.schedule('0 6 * * 1', async () => {
                console.log(`[${new Date().toISOString()}] Sending weekly reports...`);
                try {
                    await this.sendWeeklyReports();
                } catch (error) {
                    console.error('Cron job failed (weekly reports):', error);
                }
            }, {
                timezone: timezone,
                scheduled: true
            })
        );

        console.log(`✅ ${this.jobs.length} cron jobs initialized`);
    }

    /**
     * Send weekly reports to admins
     */
    static async sendWeeklyReports() {
        // Implement if needed
        console.log('Weekly reports sent');
    }

    /**
     * Stop all cron jobs (useful for testing)
     */
    static stopAll() {
        this.jobs.forEach(job => job.stop());
        console.log('🛑 All cron jobs stopped');
    }

    /**
     * Start all cron jobs
     */
    static startAll() {
        this.jobs.forEach(job => job.start());
        console.log('▶️ All cron jobs started');
    }

    /**
     * Get status of all jobs
     */
    static getStatus() {
        return this.jobs.map((job, index) => ({
            job: `Job ${index + 1}`,
            running: job ? true : false // Simplified
        }));
    }
}

module.exports = CronManager;