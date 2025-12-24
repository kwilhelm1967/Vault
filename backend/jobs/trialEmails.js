/**
 * Trial Email Automation Job
 * 
 * Runs daily to send:
 * - 24-hour warning emails (trial expiring tomorrow)
 * - Trial expired emails (with 10% discount offer)
 * 
 * Usage:
 *   node jobs/trialEmails.js
 * 
 * Or with PM2 cron:
 *   pm2 start jobs/trialEmails.js --cron "0 9 * * *" --no-autorestart
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const db = require('../database/db');
const { sendEmail } = require('../services/email');
const fs = require('fs');
const path = require('path');

/**
 * Load and process HTML email template
 */
function loadTemplate(templateName, variables = {}) {
  const templatePath = path.join(__dirname, '..', 'templates', 'brevo', `${templateName}.html`);
  let html = fs.readFileSync(templatePath, 'utf-8');
  
  // Replace Brevo-style variables {{ params.X }}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{\\s*params\\.${key}\\s*\\}\\}`, 'g');
    html = html.replace(regex, value);
  }
  
  return html;
}

/**
 * Format date for display
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Send trial expiring email (24-hour warning)
 */
async function sendTrialExpiringEmail(email, expiresAt) {
  const html = loadTemplate('trial-expiring', {
    EXPIRES_AT: formatDate(expiresAt),
  });

  const text = `Your Local Password Vault trial expires tomorrow (${formatDate(expiresAt)}). Upgrade now to keep your passwords secure: https://localpasswordvault.com/pricing`;

  await sendEmail({
    to: email,
    subject: '⏰ Your trial expires tomorrow - Local Password Vault',
    html,
    text,
  });

  console.log(`✓ Expiring email sent to ${email}`);
}

/**
 * Send trial expired email (with discount)
 */
async function sendTrialExpiredEmail(email, expiredDate) {
  const html = loadTemplate('trial-expired', {
    EXPIRED_DATE: formatDate(expiredDate),
    EMAIL: email,
  });

  const text = `Your Local Password Vault trial has ended. Your passwords are still safe! Use code COMEBACK10 for 10% off: https://localpasswordvault.com/pricing?code=COMEBACK10`;

  await sendEmail({
    to: email,
    subject: 'Your trial ended - Here\'s 10% off to come back',
    html,
    text,
  });

  console.log(`✓ Expired email sent to ${email}`);
}

/**
 * Main job function
 */
async function checkTrialEmails() {
  console.log('\n========================================');
  console.log('Trial Email Job Started:', new Date().toISOString());
  console.log('========================================\n');

  const now = new Date();
  
  // Calculate time windows
  const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  let expiringCount = 0;
  let expiredCount = 0;
  let errorCount = 0;

  try {
    // =========================================================================
    // EXPIRING TRIALS (24-hour warning)
    // =========================================================================
    
    const expiringTrials = db.db.prepare(`
      SELECT * FROM trials 
      WHERE expires_at BETWEEN ? AND ?
      AND is_converted = 0
      AND (expiring_email_sent IS NULL OR expiring_email_sent = 0)
    `).all(in23Hours.toISOString(), in25Hours.toISOString());

    console.log(`Found ${expiringTrials.length} trials expiring in ~24 hours`);

    for (const trial of expiringTrials) {
      try {
        await sendTrialExpiringEmail(trial.email, trial.expires_at);
        
        db.db.prepare(`
          UPDATE trials SET expiring_email_sent = 1 WHERE id = ?
        `).run(trial.id);
        
        expiringCount++;
      } catch (error) {
        console.error(`✗ Failed to send expiring email to ${trial.email}:`, error.message);
        errorCount++;
      }
    }

    // =========================================================================
    // EXPIRED TRIALS (with discount offer)
    // =========================================================================
    
    const expiredTrials = db.db.prepare(`
      SELECT * FROM trials 
      WHERE expires_at BETWEEN ? AND ?
      AND is_converted = 0
      AND (expired_email_sent IS NULL OR expired_email_sent = 0)
    `).all(twoDaysAgo.toISOString(), oneDayAgo.toISOString());

    console.log(`Found ${expiredTrials.length} trials that expired recently`);

    for (const trial of expiredTrials) {
      try {
        await sendTrialExpiredEmail(trial.email, trial.expires_at);
        
        db.db.prepare(`
          UPDATE trials SET expired_email_sent = 1 WHERE id = ?
        `).run(trial.id);
        
        expiredCount++;
      } catch (error) {
        console.error(`✗ Failed to send expired email to ${trial.email}:`, error.message);
        errorCount++;
      }
    }

  } catch (error) {
    console.error('Job error:', error);
    errorCount++;
  }

  // Summary
  console.log('\n========================================');
  console.log('Job Complete:', new Date().toISOString());
  console.log(`  Expiring emails sent: ${expiringCount}`);
  console.log(`  Expired emails sent: ${expiredCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log('========================================\n');

  return { expiringCount, expiredCount, errorCount };
}

// Run if called directly
if (require.main === module) {
  checkTrialEmails()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { checkTrialEmails };

