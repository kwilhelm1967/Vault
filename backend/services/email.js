/**
 * Email Service
 * Sends transactional emails using Brevo Transactional API
 * Professional, secure, and reliable email delivery
 */

const brevo = require('@getbrevo/brevo');
const fs = require('fs');
const path = require('path');

// Initialize Brevo API client
let apiInstance;

function initializeBrevoClient() {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is required. Get it from: Brevo → Settings → SMTP & API → API Keys');
  }

  const defaultClient = brevo.ApiClient.instance;
  const apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.BREVO_API_KEY;

  apiInstance = new brevo.TransactionalEmailsApi();
  
  console.log('✓ Email service initialized (Brevo Transactional API)');
}

// Initialize on module load
try {
  initializeBrevoClient();
} catch (error) {
  console.error('✗ Email service initialization failed:', error.message);
  console.error('  Please set BREVO_API_KEY in your .env file');
}

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
 * Send email via Brevo Transactional API
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content
 * @returns {Promise<Object>} Brevo API response
 */
async function sendEmailViaBrevo({ to, subject, html, text }) {
  if (!apiInstance) {
    throw new Error('Brevo API client not initialized. Check BREVO_API_KEY in .env');
  }

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  
  sendSmtpEmail.sender = {
    name: 'Local Password Vault',
    email: process.env.FROM_EMAIL || 'noreply@localpasswordvault.com',
  };
  
  sendSmtpEmail.to = [{ email: to }];
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = html;
  sendSmtpEmail.textContent = text;

  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    return response;
  } catch (error) {
    // Brevo API returns detailed error information
    const errorMessage = error.response?.body?.message || error.message || 'Unknown error';
    const errorCode = error.response?.body?.code || error.status || 'UNKNOWN';
    
    console.error(`✗ Brevo API error (${errorCode}):`, errorMessage);
    
    // Re-throw with more context
    throw new Error(`Email send failed: ${errorMessage} (Code: ${errorCode})`);
  }
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

  const text = `
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
  `.trim();

  try {
    const response = await sendEmailViaBrevo({
      to,
      subject: `Your ${planName} License Key - Local Password Vault`,
      html,
      text,
    });
    
    console.log(`✓ Purchase email sent to ${to} (Message ID: ${response.messageId || 'N/A'})`);
    return response;
  } catch (error) {
    console.error(`✗ Failed to send purchase email to ${to}:`, error.message);
    throw error;
  }
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

  const text = `
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
  `.trim();

  try {
    const response = await sendEmailViaBrevo({
      to,
      subject: 'Your 7-Day Free Trial - Local Password Vault',
      html,
      text,
    });
    
    console.log(`✓ Trial email sent to ${to} (Message ID: ${response.messageId || 'N/A'})`);
    return response;
  } catch (error) {
    console.error(`✗ Failed to send trial email to ${to}:`, error.message);
    throw error;
  }
}

/**
 * Send bundle purchase email with multiple license keys
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {Array} options.licenses - Array of { key, planType, productName, amount, maxDevices }
 * @param {number} options.totalAmount - Total amount paid in cents
 */
async function sendBundleEmail({ to, licenses, totalAmount }) {
  const totalFormatted = `$${(totalAmount / 100).toFixed(2)}`;
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  // Build license keys HTML
  const licensesHtml = licenses.map((license, index) => `
    <div style="background-color: #0f172a; border-radius: 12px; border: 2px solid #334155; padding: 24px; margin-bottom: 16px;">
      <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
        ${license.productName}
      </p>
      <p style="margin: 0 0 8px; color: #5B82B8; font-size: 24px; font-weight: 700; font-family: 'Courier New', Courier, monospace; letter-spacing: 2px; word-break: break-all;">
        ${license.key}
      </p>
      <p style="margin: 0; color: #64748b; font-size: 13px;">
        Valid for ${license.maxDevices} device(s) • Lifetime access
      </p>
    </div>
  `).join('');
  
  // Build simple HTML email (you can create a proper template later)
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #ffffff; }
        .container { max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; padding: 40px; }
        h1 { color: #ffffff; font-size: 28px; margin: 0 0 16px; }
        p { color: #94a3b8; line-height: 1.6; }
        .total { background: linear-gradient(135deg, #5B82B8 0%, #4A6FA5 100%); padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0; }
        .total-amount { font-size: 32px; font-weight: 700; color: #ffffff; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Thank You for Your Bundle Purchase!</h1>
        <p>Your Family Protection Bundle licenses are ready. You've received ${licenses.length} license key(s):</p>
        ${licensesHtml}
        <div class="total">
          <p style="margin: 0 0 8px; color: rgba(255,255,255,0.9); font-size: 14px;">Total Paid</p>
          <p class="total-amount" style="margin: 0;">${totalFormatted}</p>
        </div>
        <p style="margin-top: 24px;">Order Date: ${date}</p>
        <p>Questions? Contact us at ${process.env.SUPPORT_EMAIL || 'support@localpasswordvault.com'}</p>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Thank you for purchasing the Family Protection Bundle!

You've received ${licenses.length} license key(s):

${licenses.map((l, i) => `${i + 1}. ${l.productName}: ${l.key}`).join('\n')}

Total Paid: ${totalFormatted}
Order Date: ${date}

To get started:
1. Download the apps from https://localpasswordvault.com
2. Install and launch each application
3. Enter the corresponding license key when prompted

Your licenses are valid for lifetime use.

If you have any questions, contact us at ${process.env.SUPPORT_EMAIL || 'support@localpasswordvault.com'}

Thank you for choosing Local Password Vault!
  `.trim();
  
  try {
    const response = await sendEmailViaBrevo({
      to,
      subject: `Your Bundle Purchase - ${licenses.length} License Key(s)`,
      html,
      text,
    });
    
    console.log(`✓ Bundle email sent to ${to} (Message ID: ${response.messageId || 'N/A'})`);
    return response;
  } catch (error) {
    console.error(`✗ Failed to send bundle email to ${to}:`, error.message);
    throw error;
  }
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
  try {
    const response = await sendEmailViaBrevo({
      to,
      subject,
      html,
      text,
    });
    
    console.log(`✓ Email sent to ${to}: ${subject} (Message ID: ${response.messageId || 'N/A'})`);
    return response;
  } catch (error) {
    console.error(`✗ Failed to send email to ${to}:`, error.message);
    throw error;
  }
}

/**
 * Verify email service connection
 * Tests the Brevo API connection by attempting to get account info
 */
async function verifyConnection() {
  if (!apiInstance) {
    console.error('✗ Email service connection failed: Brevo API client not initialized');
    return false;
  }

  try {
    // Use the Account API to verify connection
    const accountApi = new brevo.AccountApi();
    const accountInfo = await accountApi.getAccount();
    
    console.log('✓ Email service connection verified');
    console.log(`  Account: ${accountInfo.email || 'N/A'}`);
    console.log(`  Plan: ${accountInfo.plan?.type || 'N/A'}`);
    return true;
  } catch (error) {
    const errorMessage = error.response?.body?.message || error.message || 'Unknown error';
    console.error('✗ Email service connection failed:', errorMessage);
    return false;
  }
}

module.exports = {
  sendPurchaseEmail,
  sendBundleEmail,
  sendTrialEmail,
  sendEmail,
  verifyConnection,
  loadTemplate,
};
