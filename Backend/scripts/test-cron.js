// scripts/test-cron.js
require('dotenv').config();
const mongoose = require('mongoose');
const SubscriptionService = require('../services/subscriptionService');

async function testCron() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📦 Connected to MongoDB');

        // Test specific job
        const jobToTest = process.argv[2] || 'expiring';
        
        console.log(`🧪 Testing ${jobToTest} job...`);
        
        switch(jobToTest) {
            case 'expiring':
                await SubscriptionService.checkExpiringSubscriptions();
                break;
            case 'expired':
                await SubscriptionService.handleExpiredSubscriptions();
                break;
            case 'trial':
                await SubscriptionService.checkTrialEnding();
                break;
            case 'invoices':
                await SubscriptionService.generateUpcomingInvoices();
                break;
            default:
                console.log('Unknown job');
        }

        console.log('✅ Test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

testCron();