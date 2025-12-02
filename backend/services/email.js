/**
 * Email Service
 * Sends transactional emails using Nodemailer
 * Supports SendGrid, Mailgun, or SMTP
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Create transporter based on environment configuration
let transporter;

function initializeTransporter() {
  const provider = process.env.EMAIL_PROVIDER || 'smtp';
  
  switch (provider.toLowerCase()) {
    case 'sendgrid':
      transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });
      break;
      
    case 'mailgun':
      transporter = nodemailer.createTransport({
        host: 'smtp.mailgun.org',
        port: 587,
        auth: {
          user: process.env.MAILGUN_USER,
          pass: process.env.MAILGUN_PASSWORD,
        },
      });
      break;
      
    case 'smtp':
    default:
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
      break;
  }
  
  console.log(`✓ Email service initialized (${provider})`);
}

// Initialize on module load
initializeTransporter();

/**
 * Load and process HTML email template
 * 
 * @param {string} templateName - Template filename (without extension)
 * @param {Object} variables - Variables to replace in template
 * @returns {string} Processed HTML
 */
function loadTemplate(templateName, variables = {}) {
  const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
  let html = fs.readFileSync(templatePath, 'utf-8');
  
  // Replace all {{variable}} placeholders
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, value);
  }
  
  return html;
}

/**
 * Send purchase confirmation email with license key
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.licenseKey - The license key
 * @param {string} options.planType - 'personal' or 'family'
 * @param {number} options.amount - Amount paid in cents
 */
async function sendPurchaseEmail({ to, licenseKey, planType, amount }) {
  const planNames = {
    personal: 'Personal Vault',
    family: 'Family Vault',
  };
  
  const planName = planNames[planType] || 'License';
  const amountFormatted = `$${(amount / 100).toFixed(2)}`;
  const maxDevices = planType === 'family' ? '5' : '1';
  
  const html = loadTemplate('purchase-email', {
    licenseKey,
    planName,
    amount: amountFormatted,
    maxDevices,
    date: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    supportEmail: process.env.SUPPORT_EMAIL || 'support@localpasswordvault.com',
    websiteUrl: process.env.WEBSITE_URL || 'https://localpasswordvault.com',
  });
  
  await transporter.sendMail({
    from: `"Local Password Vault" <${process.env.FROM_EMAIL || 'noreply@localpasswordvault.com'}>`,
    to,
    subject: `Your ${planName} License Key - Local Password Vault`,
    html,
    text: `
Thank you for purchasing Local Password Vault ${planName}!

Your License Key: ${licenseKey}

This license allows you to activate on ${maxDevices} device(s).

To get started:
1. Download the app from https://localpasswordvault.com/download
2. Install and launch the application
3. Enter your license key when prompted

Your license is valid for lifetime use.

If you have any questions, contact us at ${process.env.SUPPORT_EMAIL || 'support@localpasswordvault.com'}

Thank you for choosing Local Password Vault!
    `.trim(),
  });
  
  console.log(`✓ Purchase email sent to ${to}`);
}

/**
 * Send trial welcome email with trial key
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.trialKey - The trial key
 * @param {Date} options.expiresAt - Trial expiration date
 */
async function sendTrialEmail({ to, trialKey, expiresAt }) {
  const expiresFormatted = expiresAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const html = loadTemplate('trial-email', {
    trialKey,
    expiresAt: expiresFormatted,
    daysRemaining: '7',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@localpasswordvault.com',
    websiteUrl: process.env.WEBSITE_URL || 'https://localpasswordvault.com',
    purchaseUrl: `${process.env.WEBSITE_URL || 'https://localpasswordvault.com'}/pricing`,
  });
  
  await transporter.sendMail({
    from: `"Local Password Vault" <${process.env.FROM_EMAIL || 'noreply@localpasswordvault.com'}>`,
    to,
    subject: 'Your 7-Day Free Trial - Local Password Vault',
    html,
    text: `
Welcome to Local Password Vault!

Your 7-Day Free Trial has started.

Your Trial Key: ${trialKey}

Trial expires: ${expiresFormatted}

To get started:
1. Download the app from https://localpasswordvault.com/download
2. Install and launch the application
3. Enter your trial key when prompted

During your trial, you have full access to all features:
• Unlimited password storage
• Password generator
• Secure notes
• Auto-fill support
• Cross-platform sync

Ready to keep your passwords secure forever?
Upgrade to a lifetime license: https://localpasswordvault.com/pricing

If you have any questions, contact us at ${process.env.SUPPORT_EMAIL || 'support@localpasswordvault.com'}

Enjoy your trial!
    `.trim(),
  });
  
  console.log(`✓ Trial email sent to ${to}`);
}

/**
 * Send a generic email
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content
 */
async function sendEmail({ to, subject, html, text }) {
  await transporter.sendMail({
    from: `"Local Password Vault" <${process.env.FROM_EMAIL || 'noreply@localpasswordvault.com'}>`,
    to,
    subject,
    html,
    text,
  });
  
  console.log(`✓ Email sent to ${to}: ${subject}`);
}

/**
 * Verify email service connection
 */
async function verifyConnection() {
  try {
    await transporter.verify();
    console.log('✓ Email service connection verified');
    return true;
  } catch (error) {
    console.error('✗ Email service connection failed:', error.message);
    return false;
  }
}

module.exports = {
  sendPurchaseEmail,
  sendTrialEmail,
  sendEmail,
  verifyConnection,
  loadTemplate,
};

