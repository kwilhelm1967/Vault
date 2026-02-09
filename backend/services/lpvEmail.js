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
 * Model: app is downloaded from the website; license is only in this email (attachment).
 * Attachment is opaque base64 so the file contains no code or readable structure.
 * Filename .license is non-executable so gateways are less likely to flag it.
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
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background: #0b1120; font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background: #0b1120; padding: 32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width: 560px;">

  <!-- Header -->
  <tr><td style="background: #0f172a; border-radius: 16px 16px 0 0; padding: 40px 40px 28px; text-align: center; border: 1px solid rgba(6,182,212,0.12); border-bottom: none;">
    <img src="https://localpasswordvault.com/android-chrome-192x192.png" alt="Local Password Vault" width="48" height="48" style="display: block; margin: 0 auto 16px; border-radius: 12px;" />
    <h1 style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #f1f5f9; letter-spacing: -0.3px;">Local Password Vault</h1>
    <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">Offline by design. Your data stays on your device.</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="background: #1e293b; padding: 36px 40px; border-left: 1px solid rgba(6,182,212,0.12); border-right: 1px solid rgba(6,182,212,0.12);">

    <!-- Greeting + Confirmation -->
    <p style="margin: 0 0 4px; color: #cbd5e1; font-size: 15px;">Welcome.</p>
    <h2 style="margin: 0 0 4px; color: #f1f5f9; font-size: 22px; font-weight: 700;">Your trial has started.</h2>
    <p style="margin: 0 0 28px; color: #06b6d4; font-size: 14px; font-weight: 600;">7 days of full access.</p>

    <!-- License Instructions -->
    <div style="background: rgba(6,182,212,0.06); border: 1px solid rgba(6,182,212,0.18); border-radius: 10px; padding: 20px 24px; margin: 0 0 28px;">
      <p style="margin: 0 0 14px; color: #f1f5f9; font-size: 14px; font-weight: 600;">Your trial license is attached to this email.</p>
      <table cellpadding="0" cellspacing="0" style="margin: 0;">
        <tr>
          <td style="width: 24px; vertical-align: top; padding-top: 2px; color: #06b6d4; font-size: 13px; font-weight: 600;">1.</td>
          <td style="color: #cbd5e1; font-size: 13px; line-height: 1.6; padding-bottom: 8px;">Open Local Password Vault</td>
        </tr>
        <tr>
          <td style="width: 24px; vertical-align: top; padding-top: 2px; color: #06b6d4; font-size: 13px; font-weight: 600;">2.</td>
          <td style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">Choose <strong style="color: #f1f5f9;">Import License File</strong> or drag the attached file into the app</td>
        </tr>
      </table>
      <p style="margin: 14px 0 0; color: #64748b; font-size: 12px;">No copy or paste required.</p>
    </div>

    <!-- Download CTA -->
    <div style="text-align: center; margin: 0 0 28px;">
      <a href="https://localpasswordvault.com/trial-success.html" style="display: inline-block; padding: 14px 36px; background: #06b6d4; color: #0f172a; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 8px; letter-spacing: 0.2px;">Download Local Password Vault</a>
      <p style="margin: 10px 0 0; color: #64748b; font-size: 12px;">Windows &middot; macOS &middot; Linux</p>
    </div>

    <!-- Features -->
    <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 24px; margin: 0 0 24px;">
      <p style="margin: 0 0 12px; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">What you can do during your trial</p>
      <table cellpadding="0" cellspacing="0" style="margin: 0;">
        <tr><td style="padding: 4px 0; color: #cbd5e1; font-size: 13px; line-height: 1.6;">&#8226;&nbsp; Store unlimited passwords securely</td></tr>
        <tr><td style="padding: 4px 0; color: #cbd5e1; font-size: 13px; line-height: 1.6;">&#8226;&nbsp; Strong AES-256 encryption</td></tr>
        <tr><td style="padding: 4px 0; color: #cbd5e1; font-size: 13px; line-height: 1.6;">&#8226;&nbsp; Fully offline. No cloud. No syncing.</td></tr>
        <tr><td style="padding: 4px 0; color: #cbd5e1; font-size: 13px; line-height: 1.6;">&#8226;&nbsp; Local backup and restore</td></tr>
      </table>
    </div>

    <!-- Upgrade -->
    <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 20px;">
      <p style="margin: 0 0 4px; color: #94a3b8; font-size: 13px;">When you're ready, <a href="https://localpasswordvault.com/pricing" style="color: #06b6d4; text-decoration: none; font-weight: 600;">upgrade to a lifetime license</a>.</p>
      <p style="margin: 0; color: #64748b; font-size: 13px;">One payment. Yours forever.</p>
    </div>

  </td></tr>

  <!-- Footer -->
  <tr><td style="background: #0f172a; border-radius: 0 0 16px 16px; padding: 20px 40px; text-align: center; border: 1px solid rgba(6,182,212,0.12); border-top: none;">
    <p style="margin: 0; color: #475569; font-size: 12px; line-height: 1.6;">Questions? Just reply to this email. A real person will respond.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
  }

  const text = `Local Password Vault\nOffline by design. Your data stays on your device.\n\nWelcome.\n\nYour trial has started.\n7 days of full access.\n\nYour trial license is attached to this email.\n\n1. Open Local Password Vault\n2. Choose "Import License File" or drag the attached file into the app\n\nNo copy or paste required.\n\nDownload: https://localpasswordvault.com/trial-success.html\nWindows · macOS · Linux\n\nWhat you can do during your trial:\n• Store unlimited passwords securely\n• Strong AES-256 encryption\n• Fully offline. No cloud. No syncing.\n• Local backup and restore\n\nWhen you're ready, upgrade to a lifetime license:\nhttps://localpasswordvault.com/pricing\nOne payment. Yours forever.\n\nQuestions? Just reply to this email. A real person will respond.`;

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = {
    name: 'Local Password Vault',
    email: process.env.FROM_EMAIL || 'noreply@localpasswordvault.com',
  };
  sendSmtpEmail.to = [{ email: to }];
  sendSmtpEmail.subject = 'Your trial has started — Local Password Vault';
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

function isLpvEmailReady() {
  return !!apiInstance;
}

module.exports = {
  sendLpvTrialEmail,
  isLpvEmailReady,
};
