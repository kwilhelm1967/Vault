/**
 * LPV Email Service
 * 
 * LPV-SPECIFIC: Handles emails that need license file attachments.
 * Does NOT modify the shared email.js used by LLV.
 * 
 * Uses the same Brevo API key but its own client instance.
 */

const brevo = require('@getbrevo/brevo');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

let apiInstance;

function initBrevo() {
  if (!process.env.BREVO_API_KEY) {
    console.warn('[LPV Email] ⚠️  BREVO_API_KEY not set. LPV emails will not be sent.');
    return;
  }
  try {
    apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.authentications.apiKey.apiKey = process.env.BREVO_API_KEY;
    console.log('[LPV Email] ✅ LPV email service initialized');
  } catch (error) {
    console.error('[LPV Email] ❌ Initialization failed:', error.message);
  }
}

initBrevo();

function loadTemplate(templateName, variables = {}) {
  const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
  let html = fs.readFileSync(templatePath, 'utf-8');
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{\\s*params\\.${key}\\s*\\}\\}`, 'g');
    html = html.replace(regex, value);
  }
  return html;
}

/**
 * Send LPV trial email with signed license file attached.
 * 
 * The attached .license file is the customer's proof-of-trial.
 * They import it into the app — no server call needed from the app.
 */
async function sendLpvTrialEmail({ to, trialKey, expiresAt, licenseFileContent }) {
  if (!apiInstance) {
    throw new Error('LPV email service not initialized (check BREVO_API_KEY)');
  }

  const expiresFormatted = expiresAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let html;
  try {
    html = loadTemplate('lpv-trial-license-email', {
      TRIAL_KEY: trialKey,
      EXPIRES_AT: expiresFormatted,
      SIGNUP_DATE: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    });
  } catch {
    // Fallback if template doesn't exist yet — use plain HTML
    html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0b1120;">
  <!-- Header with Logo -->
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center; border: 1px solid rgba(6, 182, 212, 0.15); border-bottom: none;">
    <div style="display: inline-block; width: 56px; height: 56px; background: #0f172a; border-radius: 14px; box-shadow: 0 4px 16px rgba(6, 182, 212, 0.2), inset 0 0 0 1px rgba(6, 182, 212, 0.3); margin-bottom: 16px; line-height: 56px; text-align: center;">
      <img src="https://localpasswordvault.com/android-chrome-192x192.png" alt="LPV" width="32" height="32" style="display: inline-block; vertical-align: middle;" />
    </div>
    <h1 style="margin: 0 0 6px; font-size: 22px; font-weight: 700; color: #f1f5f9; font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.3px;">Local Password Vault</h1>
    <p style="margin: 0; color: #06b6d4; font-size: 14px; font-weight: 600; letter-spacing: 0.5px;">Your 7-Day Free Trial</p>
  </div>

  <!-- Body -->
  <div style="background: #1e293b; border-radius: 0 0 16px 16px; padding: 32px; border: 1px solid rgba(6, 182, 212, 0.15); border-top: 1px solid rgba(255,255,255,0.05);">
    <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">Welcome! Your trial license file is attached to this email.</p>

    <!-- License Code Box -->
    <div style="background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.25); border-radius: 12px; padding: 20px; margin: 0 0 24px; text-align: center;">
      <p style="margin: 0 0 6px; color: #06b6d4; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Your License Code</p>
      <p style="margin: 0; color: #f1f5f9; font-size: 20px; font-weight: 700; font-family: 'Space Grotesk', monospace; letter-spacing: 3px;">${trialKey}</p>
    </div>

    <h3 style="color: #f1f5f9; margin: 0 0 12px; font-size: 15px; font-weight: 600;">Getting Started</h3>
    <ol style="color: #94a3b8; font-size: 14px; line-height: 2; padding-left: 20px; margin: 0 0 20px;">
      <li>Download the app from <a href="https://localpasswordvault.com/download" style="color: #06b6d4; text-decoration: none; font-weight: 600;">localpasswordvault.com</a></li>
      <li>Install and launch the app</li>
      <li><strong style="color: #cbd5e1;">Import the attached .license file</strong> when prompted</li>
    </ol>

    <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px 16px; margin: 0 0 20px;">
      <p style="color: #64748b; font-size: 13px; margin: 0;">Trial expires: <strong style="color: #94a3b8;">${expiresFormatted}</strong></p>
      <p style="color: #64748b; font-size: 13px; margin: 6px 0 0;">After importing, everything runs locally. No internet required.</p>
    </div>

    <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 20px; text-align: center;">
      <p style="color: #64748b; font-size: 13px; margin: 0 0 12px;">Ready to keep your passwords secure forever?</p>
      <a href="https://localpasswordvault.com/pricing" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #06b6d4, #0891b2); color: #0f172a; font-weight: 700; font-size: 14px; text-decoration: none; border-radius: 8px;">Upgrade to Lifetime License</a>
    </div>
  </div>

  <p style="color: #475569; font-size: 11px; text-align: center; margin-top: 16px;">
    Questions? <a href="mailto:support@localpasswordvault.com" style="color: #06b6d4;">support@localpasswordvault.com</a>
  </p>
</body></html>`;
  }

  const text = `Welcome to Local Password Vault!\n\nYour 7-Day Free Trial\n\nYour License Code: ${trialKey}\nExpires: ${expiresFormatted}\n\nGetting Started:\n1. Download the app from https://localpasswordvault.com/download\n2. Install and launch the app\n3. Import the attached .license file when prompted\n\nAfter importing, everything runs locally. No internet required.\n\nUpgrade to lifetime: https://localpasswordvault.com/pricing\nSupport: support@localpasswordvault.com`;

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = {
    name: 'Local Password Vault',
    email: process.env.FROM_EMAIL || 'noreply@localpasswordvault.com',
  };
  sendSmtpEmail.to = [{ email: to }];
  sendSmtpEmail.subject = 'Your Trial License — Local Password Vault';
  sendSmtpEmail.htmlContent = html;
  sendSmtpEmail.textContent = text;

  // Attach the signed license file
  if (licenseFileContent) {
    const base64Content = Buffer.from(licenseFileContent, 'utf8').toString('base64');
    sendSmtpEmail.attachment = [{
      name: 'LocalPasswordVault-Trial.license',
      content: base64Content,
    }];
  }

  try {
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    logger.email('lpv_trial_sent', to, {
      operation: 'lpv_trial_email',
      trialKey: trialKey.substring(0, 8) + '...',
    });
    return result;
  } catch (error) {
    const errorMessage = error.response?.body?.message || error.message || 'Unknown error';
    logger.emailError('lpv_trial', to, error, {
      operation: 'lpv_trial_email',
      brevoError: errorMessage,
    });
    throw new Error(`LPV trial email failed: ${errorMessage}`);
  }
}

module.exports = {
  sendLpvTrialEmail,
};
