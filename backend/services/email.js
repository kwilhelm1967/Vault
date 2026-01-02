const brevo = require('@getbrevo/brevo');
const fs = require('fs');
const path = require('path');
const performanceMonitor = require('../utils/performanceMonitor');
const logger = require('../utils/logger');

let apiInstance;

function initializeBrevoClient() {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is required');
  }

  try {
    // Brevo v3+ initialization (per official documentation)
    apiInstance = new brevo.TransactionalEmailsApi();
    
    // Set API key in authentications.apiKey.apiKey (Brevo v3 way)
    apiInstance.authentications.apiKey.apiKey = process.env.BREVO_API_KEY;
    
    logger.info('Email service initialized', {
      operation: 'email_init',
      service: 'brevo',
    });
  } catch (error) {
    // More detailed error for debugging
    throw new Error(`Brevo initialization failed: ${error.message}. Make sure @getbrevo/brevo package is installed correctly.`);
  }
}

// Initialize Brevo client, but don't fail if logger isn't ready yet
try {
  initializeBrevoClient();
} catch (error) {
  // Only log if logger is fully initialized
  if (logger && typeof logger.error === 'function') {
    const errorCode = logger.ERROR_CODES?.EMAIL_INIT_ERROR || 'ERR_EMAIL_001';
    logger.error('Email service initialization failed', error, {
      operation: 'email_init',
      service: 'brevo',
    }, errorCode);
  } else {
    // Fallback for when logger isn't ready (e.g., during test setup)
    console.error('Email service initialization failed:', error.message);
  }
}

function loadTemplate(templateName, variables = {}) {
  const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
  let html = fs.readFileSync(templatePath, 'utf-8');
  
  // Replace {{ params.KEY }} placeholders with actual values
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{\\s*params\\.${key}\\s*\\}\\}`, 'g');
    html = html.replace(regex, value);
  }
  
  return html;
}

async function sendEmailViaBrevo({ to, subject, html, text }) {
  if (!apiInstance) {
    throw new Error('Brevo API client not initialized');
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
    // Brevo v3: API key is set in authentications, just call the method
    return await apiInstance.sendTransacEmail(sendSmtpEmail);
  } catch (error) {
    const errorMessage = error.response?.body?.message || error.message || 'Unknown error';
    const errorCode = error.response?.body?.code || error.status || 'UNKNOWN';
    logger.error('Brevo API error', error, {
      operation: 'email_send',
      service: 'brevo',
      brevoErrorCode: errorCode,
      recipient: to,
      subject: subject,
    }, logger.ERROR_CODES?.EMAIL_SEND_ERROR || 'ERR_EMAIL_002');
    throw new Error(`Email send failed: ${errorMessage} (Code: ${errorCode})`);
  }
}
async function sendPurchaseEmail({ to, licenseKey, planType, amount }) {
  const planNames = {
    personal: 'Personal Vault',
    family: 'Family Vault',
    llv_personal: 'Local Legacy Vault - Personal',
    llv_family: 'Local Legacy Vault - Family',
  };
  
  const planName = planNames[planType] || 'License';
  const amountFormatted = `$${(amount / 100).toFixed(2)}`;
  const maxDevices = (planType === 'family' || planType === 'llv_family') ? '5' : '1';
  
  const html = loadTemplate('purchase-confirmation-email', {
    LICENSE_KEY: licenseKey,
    PLAN_NAME: planName,
    AMOUNT: amountFormatted,
    MAX_DEVICES: maxDevices,
    ORDER_DATE: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    ORDER_ID: `ORDER-${Date.now()}`,
  });

  const text = `Thank you for purchasing Local Password Vault ${planName}!\n\nYour License Key: ${licenseKey}\n\nThis license allows you to activate on ${maxDevices} device(s).\n\nTo get started:\n1. Download the app from https://localpasswordvault.com/download\n2. Install and launch the application\n3. Enter your license key when prompted\n\nYour license is valid for lifetime use.\n\nIf you have any questions, contact us at ${process.env.SUPPORT_EMAIL || 'support@localpasswordvault.com'}\n\nThank you for choosing Local Password Vault!`;

  try {
    const response = await sendEmailViaBrevo({
      to,
      subject: `Your ${planName} License Key - Local Password Vault`,
      html,
      text,
    });
    logger.email('sent', to, {
      operation: 'email_purchase',
      planType: planType,
      planName: planName,
      amount: amount,
    });
    performanceMonitor.trackEmail(true);
    return response;
  } catch (error) {
    logger.emailError('purchase', to, error, {
      operation: 'email_purchase',
      planType: planType,
      planName: planName,
    });
    performanceMonitor.trackEmail(false);
    throw error;
  }
}
async function sendTrialEmail({ to, trialKey, expiresAt }) {
  const expiresFormatted = expiresAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const html = loadTemplate('trial-welcome-email', {
    TRIAL_KEY: trialKey,
    EXPIRES_AT: expiresFormatted,
    SIGNUP_DATE: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  });

  const text = `Welcome to Local Password Vault!\n\nYour 7-Day Free Trial has started.\n\nYour Trial Key: ${trialKey}\n\nTrial expires: ${expiresFormatted}\n\nTo get started:\n1. Download the app from https://localpasswordvault.com/download\n2. Install and launch the application\n3. Enter your trial key when prompted\n\nDuring your trial, you have full access to all features.\n\nReady to keep your passwords secure forever?\nUpgrade to a lifetime license: https://localpasswordvault.com/pricing\n\nIf you have any questions, contact us at ${process.env.SUPPORT_EMAIL || 'support@localpasswordvault.com'}\n\nEnjoy your trial!`;

  try {
    const response = await sendEmailViaBrevo({
      to,
      subject: 'Your 7-Day Free Trial - Local Password Vault',
      html,
      text,
    });
    logger.email('sent', to, {
      operation: 'email_trial',
      expiresAt: expiresAt.toISOString(),
    });
    performanceMonitor.trackEmail(true);
    return response;
  } catch (error) {
    logger.emailError('trial', to, error, {
      operation: 'email_trial',
      expiresAt: expiresAt.toISOString(),
    });
    performanceMonitor.trackEmail(false);
    throw error;
  }
}
async function sendBundleEmail({ to, licenses, totalAmount, orderId = null }) {
  const totalFormatted = `$${(totalAmount / 100).toFixed(2)}`;
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const licensesHtml = licenses.map((license, index) => {
    const keys = license.keys || [license.key];
    const keyCount = keys.length;
    
    return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #e0f2fe; border-radius: 12px; border: 2px solid #1e293b; margin-bottom: 16px;">
      <tr>
        <td style="padding: 28px;">
          <p style="margin: 0 0 8px; color: #1e293b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; font-weight: 600;">
            ${license.productName}
          </p>
          ${keys.map((key, keyIndex) => {
            const keyId = `key-${index}-${keyIndex}`;
            return `
          <div style="margin: 0 0 8px; text-align: center; background-color: #e0f2fe; border-radius: 6px; padding: 12px; border: 2px solid #1e293b; position: relative;">
            <span id="${keyId}" style="color: #1e40af !important; font-size: 16px !important; font-weight: 600 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important; letter-spacing: 1px !important; word-break: break-all !important; text-decoration: none !important; display: inline-block !important; line-height: 1.5 !important; user-select: all !important; -webkit-user-select: all !important; -moz-user-select: all !important; cursor: text !important;">${key}</span>
          </div>
          `;
          }).join('')}
          <p style="margin: 12px 0 0; color: #1e293b; font-size: 13px; text-align: center; line-height: 1.5;">
            ${keyCount} license key${keyCount > 1 ? 's' : ''} • Lifetime access
          </p>
        </td>
      </tr>
    </table>
    `;
  }).join('');
  
  const totalKeyCount = licenses.reduce((sum, license) => {
    const keys = license.keys || [license.key];
    return sum + keys.length;
  }, 0);
  
  const html = loadTemplate('bundle-email', {
    LICENSE_COUNT: totalKeyCount.toString(),
    TOTAL_AMOUNT: totalFormatted,
    LICENSE_KEYS_HTML: licensesHtml,
    ORDER_DATE: date,
    ORDER_ID: orderId || `ORDER-${Date.now()}`,
  });
  
  const text = `
Thank you for purchasing the Family Protection Bundle!

You've received ${totalKeyCount} license key(s):

${licenses.map((l, i) => {
    const keys = l.keys || [l.key];
    return keys.map((key, j) => `${i + 1}.${j + 1} ${l.productName}: ${key}`).join('\n');
  }).join('\n')}

Total Paid: ${totalFormatted}
Order Date: ${date}

To get started:
1. Download the apps using the download button in this email or after trial signup
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
    
    logger.email('sent', to, {
      operation: 'email_bundle',
      licenseCount: licenses.length,
      totalAmount: totalAmount,
      orderId: orderId,
    });
    performanceMonitor.trackEmail(true);
    return response;
  } catch (error) {
    logger.emailError('bundle', to, error, {
      operation: 'email_bundle',
      licenseCount: licenses.length,
      totalAmount: totalAmount,
      orderId: orderId,
    });
    performanceMonitor.trackEmail(false);
    throw error;
  }
}

async function sendEmail({ to, subject, html, text }) {
  try {
    const response = await sendEmailViaBrevo({ to, subject, html, text });
    logger.email('sent', to, {
      operation: 'email_generic',
      subject: subject,
    });
    return response;
  } catch (error) {
    logger.emailError('generic', to, error, {
      operation: 'email_generic',
      subject: subject,
    });
    throw error;
  }
}

async function verifyConnection() {
  if (!apiInstance) {
    logger.error('Email service connection failed - API instance not initialized', null, {
      operation: 'email_verify',
      service: 'brevo',
    }, logger.ERROR_CODES?.EMAIL_INIT_ERROR || 'ERR_EMAIL_001');
    return false;
  }

  try {
    const accountApi = new brevo.AccountApi();
    const accountInfo = await accountApi.getAccount();
    logger.info('Email service connection verified', {
      operation: 'email_verify',
      service: 'brevo',
    });
    return true;
  } catch (error) {
    const errorMessage = error.response?.body?.message || error.message || 'Unknown error';
    logger.error('Email service connection failed', error, {
      operation: 'email_verify',
      service: 'brevo',
      errorMessage: errorMessage,
    }, logger.ERROR_CODES?.EMAIL_SEND_ERROR || 'ERR_EMAIL_002');
    return false;
  }
}

/**
 * Send alert email for system issues (webhook failures, etc.)
 */
async function sendAlertEmail({ subject, message }) {
  const supportEmail = process.env.SUPPORT_EMAIL || process.env.FROM_EMAIL || 'support@localpasswordvault.com';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .alert { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .details { background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0; }
        pre { background-color: #1f2937; color: #f3f4f6; padding: 15px; border-radius: 5px; overflow-x: auto; }
      </style>
    </head>
    <body>
      <div class="alert">
        <h2>⚠️ System Alert</h2>
        <p><strong>${subject}</strong></p>
      </div>
      <div class="details">
        <pre>${message}</pre>
      </div>
      <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
        This is an automated alert from Local Password Vault backend.
      </p>
    </body>
    </html>
  `;
  
  const text = `${subject}\n\n${message}\n\nThis is an automated alert from Local Password Vault backend.`;
  
  try {
    const response = await sendEmailViaBrevo({
      to: supportEmail,
      subject: `[ALERT] ${subject}`,
      html,
      text,
    });
    
    logger.email('sent', supportEmail, {
      operation: 'email_alert',
      subject: subject,
    });
    performanceMonitor.trackEmail(true);
    return response;
  } catch (error) {
    logger.emailError('alert', supportEmail, error, {
      operation: 'email_alert',
      subject: subject,
    });
    performanceMonitor.trackEmail(false);
    throw error;
  }
}

/**
 * Send ticket creation confirmation email to customer
 */
async function sendTicketCreatedEmail({ to, ticketNumber, subject }) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
        .ticket-info { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .ticket-number { font-size: 24px; font-weight: bold; color: #06b6d4; }
        .button { display: inline-block; padding: 12px 24px; background: #06b6d4; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Support Ticket Created</h1>
      </div>
      <div class="content">
        <p>Thank you for contacting Local Password Vault support!</p>
        
        <div class="ticket-info">
          <p><strong>Ticket Number:</strong></p>
          <p class="ticket-number">${ticketNumber}</p>
          <p><strong>Subject:</strong> ${subject}</p>
        </div>
        
        <p>We've received your support request and will respond as soon as possible. You can track your ticket status and add additional information by visiting our support page.</p>
        
        <p>If you need to add more information or check the status of your ticket, please use the ticket number above.</p>
        
        <p>We typically respond within 24-48 hours during business days.</p>
      </div>
      <div class="footer">
        <p>This is an automated email from Local Password Vault.</p>
        <p>If you didn't create this ticket, please ignore this email.</p>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Support Ticket Created

Thank you for contacting Local Password Vault support!

Ticket Number: ${ticketNumber}
Subject: ${subject}

We've received your support request and will respond as soon as possible. We typically respond within 24-48 hours during business days.

If you need to add more information or check the status of your ticket, please use the ticket number above.

This is an automated email from Local Password Vault.
  `.trim();
  
  try {
    const response = await sendEmailViaBrevo({
      to,
      subject: `Support Ticket Created: ${ticketNumber}`,
      html,
      text,
    });
    
    logger.email('sent', to, {
      operation: 'email_ticket_created',
      ticket_number: ticketNumber,
    });
    performanceMonitor.trackEmail(true);
    return response;
  } catch (error) {
    logger.emailError('ticket_created', to, error, {
      operation: 'email_ticket_created',
      ticket_number: ticketNumber,
    });
    performanceMonitor.trackEmail(false);
    throw error;
  }
}

/**
 * Send ticket response notification email
 */
async function sendTicketResponseEmail({ to, ticketNumber, customerEmail, customerName, message }) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
        .ticket-info { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .message { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0; white-space: pre-wrap; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>New Ticket Response</h2>
      </div>
      <div class="content">
        <div class="ticket-info">
          <p><strong>Ticket:</strong> ${ticketNumber}</p>
          <p><strong>Customer:</strong> ${customerName || customerEmail}</p>
          <p><strong>Email:</strong> ${customerEmail}</p>
        </div>
        
        <p><strong>New Message:</strong></p>
        <div class="message">${message}</div>
        
        <p>Please respond to this ticket through the support dashboard.</p>
      </div>
      <div class="footer">
        <p>Local Password Vault Support System</p>
      </div>
    </body>
    </html>
  `;
  
  const text = `
New Ticket Response

Ticket: ${ticketNumber}
Customer: ${customerName || customerEmail}
Email: ${customerEmail}

New Message:
${message}

Please respond to this ticket through the support dashboard.
  `.trim();
  
  try {
    const response = await sendEmailViaBrevo({
      to,
      subject: `[Ticket ${ticketNumber}] New Customer Response`,
      html,
      text,
    });
    
    logger.email('sent', to, {
      operation: 'email_ticket_response',
      ticket_number: ticketNumber,
    });
    performanceMonitor.trackEmail(true);
    return response;
  } catch (error) {
    logger.emailError('ticket_response', to, error, {
      operation: 'email_ticket_response',
      ticket_number: ticketNumber,
    });
    performanceMonitor.trackEmail(false);
    throw error;
  }
}

module.exports = {
  sendPurchaseEmail,
  sendBundleEmail,
  sendTrialEmail,
  sendEmail,
  sendAlertEmail,
  sendTicketCreatedEmail,
  sendTicketResponseEmail,
  verifyConnection,
  loadTemplate,
};
