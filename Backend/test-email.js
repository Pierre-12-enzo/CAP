require('dotenv').config();
const { testEmailConfig, sendEmail } = require('./utilis/emailService');

async function test() {
    // Test configuration
    const configTest = await testEmailConfig(process.env.EMAIL_USER);
    console.log('Config test:', configTest);

    // Send a real email
    const result = await sendEmail({
        to: 'enzodusenge@gmail.com',
        subject: 'Test Email from CAP',
        template: 'welcome',
        context: {
            name: 'John Doe',
            schoolName: 'Test School',
            plan: 'Trial',
            loginUrl: 'http://localhost:3000/login',
            setupGuide: 'http://localhost:3000/guides',
            email: 'test@example.com'
        }
    });

    console.log('Send result:', result);
}

test();