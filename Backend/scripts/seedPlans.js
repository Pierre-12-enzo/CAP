require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
// scripts/seedPlans.js
const mongoose = require('mongoose');
const Plan = require('../models/Plans');

// Debug: Check if env loaded
console.log('🔍 Checking environment:');
console.log('📁 Current directory:', __dirname);
console.log('🌍 MONGODB_URI:', process.env.MONGO_URI ? '✅ Found' : '❌ Not found');
console.log('🌍 NODE_ENV:', process.env.NODE_ENV || 'not set');


const plans = [
  {
    name: 'Free Trial',
    code: 'TRIAL',
    type: 'trial',
    trialDays: 30,
    price: {
      monthly: 0,
      yearly: 0,
      currency: 'USD'
    },
    features: [
      { name: '30 Days Free Access', description: 'Full access for 30 days', included: true, highlight: true },
      { name: 'Student Management', description: 'Manage up to 700 students', included: true },
      { name: 'ID Card Generation', description: 'Generate up to 700 cards', included: true },
      { name: 'Basic Templates', description: '1 template included', included: true },
      { name: 'Email Support', description: 'Basic email support', included: true },
      { name: 'SMS Notifications', description: 'Unlimited SMS', included: true },
      { name: 'Advanced Analytics', description: 'Basic analytics only', included: false },
      { name: 'Priority Support', description: '24/7 priority support', included: false }
    ],
    limits: {
      maxStudents: 700,
      maxStaff: 10,
      maxTemplates: 1,
      maxCards: 700,
      storageMB: 500,
      apiCallsPerDay: 100,
      canCustomizeCards: true,
      canExportData: true,
      canUseAPI: false,
      hasAdvancedAnalytics: false,
      hasPrioritySupport: false
    },
    isPopular: false,
    sortOrder: 1,
    description: 'Perfect for schools to try out our platform risk-free for 30 days',
    badgeText: 'Free Trial'
  },
  {
    name: 'Basic Plan',
    code: 'BASIC',
    type: 'paid',
    price: {
      monthly: 19,
      yearly: 250,
      currency: 'USD'
    },
    features: [
      { name: 'Student Management', description: 'Manage up to 700 students', included: true },
      { name: 'Student Photos', description: 'Upload up to 700 student photos', included: true },
      { name: 'ID Card Generation', description: 'Generate up to 700 cards', included: true },
      { name: 'Templates', description: '1 template included', included: true },
      { name: 'SMS Notifications', description: 'Unlimited SMS', included: true },
      { name: 'Email Support', description: 'Priority email support', included: true },
      { name: 'Advanced Analytics', description: 'Basic analytics included', included: false },
      { name: 'API Access', description: 'No API access', included: false },
      { name: 'Custom Branding', description: 'No custom branding', included: false }
    ],
    limits: {
      maxStudents: 700,
      maxStudentsPhotos: 700,
      maxCards: 700,
      maxStaff: 20,
      maxTemplates: 1,
      maxSmsNotifications: -1, // -1 means unlimited
      storageMB: 1000,
      apiCallsPerDay: 0,
      canCustomizeCards: true,
      canExportData: true,
      canUseAPI: false,
      hasAdvancedAnalytics: false,
      hasPrioritySupport: false
    },
    isPopular: true,
    sortOrder: 2,
    description: 'Best value for growing schools with essential features',
    badgeText: 'Most Popular'
  },
  {
    name: 'Pro Plan',
    code: 'PRO',
    type: 'paid',
    price: {
      monthly: 25,
      yearly: 290,
      currency: 'USD'
    },
    features: [
      { name: 'Unlimited Students', description: 'No student limits', included: true, highlight: true },
      { name: 'Unlimited Photos', description: 'No photo upload limits', included: true },
      { name: 'Unlimited Cards', description: 'Generate unlimited cards', included: true },
      { name: 'Unlimited Templates', description: 'Create unlimited templates', included: true },
      { name: 'Advanced Analytics', description: 'Full analytics dashboard', included: true },
      { name: 'API Access', description: 'Full API access', included: true },
      { name: 'Priority Support', description: '24/7 priority support', included: true },
      { name: 'Custom Branding', description: 'Remove CAP branding', included: true },
      { name: 'SMS Notifications', description: 'Unlimited SMS', included: true }
    ],
    limits: {
      maxStudents: -1, // Unlimited
      maxStudentsPhotos: -1, // Unlimited
      maxCards: -1, // Unlimited
      maxStaff: -1, // Unlimited
      maxTemplates: -1, // Unlimited
      maxSmsNotifications: -1, // Unlimited
      storageMB: 5000,
      apiCallsPerDay: 10000,
      canCustomizeCards: true,
      canExportData: true,
      canUseAPI: true,
      hasAdvancedAnalytics: true,
      hasPrioritySupport: true
    },
    isPopular: false,
    sortOrder: 3,
    description: 'For large schools needing unlimited access and advanced features',
    badgeText: 'Best Value'
  }
];

async function seedPlans() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 Connected to MongoDB');

    // Clear existing plans
    await Plan.deleteMany({});
    console.log('🗑️ Cleared existing plans');

    // Insert new plans
    const inserted = await Plan.insertMany(plans);
    console.log(`✅ Inserted ${inserted.length} plans:`);
    inserted.forEach(plan => {
      console.log(`   - ${plan.name} (${plan.code})`);
    });

  } catch (error) {
    console.error('❌ Error seeding plans:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

seedPlans();