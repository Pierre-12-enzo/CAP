const nodemailer = require('nodemailer');
const fs = require('fs').promises; // 👈 USE PROMISES VERSION
const path = require('path');
const handlebars = require('handlebars');

// Create transporter based on environment
const createTransporter = () => {
    // For development/testing - use ethereal.email (fake SMTP)
    if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_HOST) {
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: process.env.ETHEREAL_EMAIL || 'your-ethereal-email',
                pass: process.env.ETHEREAL_PASSWORD || 'your-ethereal-password'
            }
        });
    }

    // Production - use real SMTP (Gmail, SendGrid, etc.)
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
    });
};

// Create transporter instance
let transporter = createTransporter();

// Verify transporter connection
const verifyConnection = async () => {
    try {
        await transporter.verify();
        console.log('✅ Email service ready');
    } catch (error) {
        console.error('❌ Email service error:', error);

        // Fallback to ethereal for development
        if (process.env.NODE_ENV === 'development') {
            console.log('⚠️ Falling back to ethereal.email for testing');
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.ETHEREAL_EMAIL || 'your-ethereal-email',
                    pass: process.env.ETHEREAL_PASSWORD || 'your-ethereal-password'
                }
            });
        }
    }
};

// Call verification on startup
verifyConnection();

/**
 * Load and compile email template
 * @param {string} templateName - Name of template file
 * @param {Object} context - Data to inject into template
 * @returns {string} Compiled HTML
 */
const compileTemplate = async (templateName, context) => {
    try {
        const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
        console.log('📁 Reading template from:', templatePath);

        // ✅ This now works because we're using fs.promises
        const source = await fs.readFile(templatePath, 'utf-8');

        const template = handlebars.compile(source);
        return template(context);
    } catch (error) {
        console.error(`❌ Template error for ${templateName}:`, error.message);
        console.error('📁 Template path attempted:', path.join(__dirname, '../templates/emails', `${templateName}.html`));

        // Fallback to a simple HTML template
        return `
        <html>
            <body>
                <h1>${templateName}</h1>
                <p>Template could not be loaded. Please check server logs.</p>
                <pre>${JSON.stringify(context, null, 2)}</pre>
            </body>
        </html>`;
    }
};

// Register Handlebars helpers
handlebars.registerHelper('eq', function (a, b) {
    return a === b;
});

handlebars.registerHelper('gt', function (a, b) {
    return a > b;
});

handlebars.registerHelper('includes', function (array, value) {
    return array && array.includes(value);
});

handlebars.registerHelper('formatDate', function (date) {
    return new Date(date).toLocaleDateString();
});

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.template - Template name
 * @param {Object} options.context - Template data
 * @param {Array} options.attachments - File attachments
 * @returns {Promise<Object>} Nodemailer response
 */
const sendEmail = async ({ to, subject, template, context, attachments = [], bcc = [] }) => {
    try {
        console.log(`📧 Preparing to send email to: ${to}`);
        console.log('📋 Template:', template);

        // Add common context variables
        const fullContext = {
            ...context,
            currentYear: new Date().getFullYear(),
            supportEmail: process.env.SUPPORT_EMAIL || 'support@cap.com',
            websiteUrl: process.env.WEBSITE_URL || 'https://cap.com',
            privacyPolicyUrl: process.env.PRIVACY_URL || 'https://cap.com/privacy',
            termsUrl: process.env.TERMS_URL || 'https://cap.com/terms',
            companyAddress: process.env.COMPANY_ADDRESS || '123 Education St, City, Country'
        };

        // Compile HTML template
        const html = await compileTemplate(template, fullContext);

        // Log a preview of the HTML (first 200 chars)
        console.log('📄 HTML preview:', html.substring(0, 200) + '...');

        const mailOptions = {
            from: `"CAP System" <${process.env.EMAIL_FROM || 'noreply@cap.com'}>`,
            to,
            bcc: [...bcc, process.env.ADMIN_EMAIL].filter(Boolean),
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);

        console.log(`✅ Email sent successfully to ${to}`);
        if (process.env.NODE_ENV === 'development') {
            console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
        }

        return {
            success: true,
            messageId: info.messageId,
            preview: nodemailer.getTestMessageUrl(info)
        };
    } catch (error) {
        console.error('❌ Send email error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send bulk emails
 * @param {Array} emails - Array of email options
 * @returns {Promise<Array>} Results
 */
const sendBulkEmails = async (emails) => {
    const results = [];

    for (const email of emails) {
        try {
            const result = await sendEmail(email);
            results.push({ ...email, ...result });

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            results.push({ ...email, success: false, error: error.message });
        }
    }

    return results;
};

/**
 * Test email configuration
 * @param {string} testEmail - Email to send test to
 * @returns {Promise<Object>} Test result
 */
const testEmailConfig = async (testEmail) => {
    try {
        const result = await sendEmail({
            to: testEmail,
            subject: 'CAP - Test Email',
            template: 'welcome',
            context: {
                name: 'Test User',
                schoolName: 'Test School',
                plan: 'Trial',
                loginUrl: 'http://localhost:3000/login',
                setupGuide: 'http://localhost:3000/guides',
                email: testEmail
            }
        });

        return {
            success: true,
            message: 'Email sent successfully',
            preview: result.preview,
            config: {
                host: transporter.options.host,
                port: transporter.options.port,
                secure: transporter.options.secure,
                auth: {
                    user: transporter.options.auth?.user ? '****' : 'not set'
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            config: {
                host: transporter.options.host,
                port: transporter.options.port
            }
        };
    }
};

module.exports = {
    sendEmail,
    sendBulkEmails,
    testEmailConfig,
    verifyConnection
};