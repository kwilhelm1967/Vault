/**
 * Email Service Diagnostic Script
 * 
 * Checks email service configuration and tests sending
 * Run with: node scripts/diagnose-email.js [your-email@example.com]
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

console.log('=== Email Service Diagnostic ===\n');

// Check environment variables
console.log('1. Checking Environment Variables...');
const requiredVars = ['BREVO_API_KEY', 'FROM_EMAIL', 'SUPPORT_EMAIL'];
let allSet = true;

requiredVars.forEach(varName => {
  if (process.env[varName]) {
    const value = varName === 'BREVO_API_KEY' 
      ? `${process.env[varName].substring(0, 20)}...` 
      : process.env[varName];
    console.log(`   ✅ ${varName}: ${value}`);
  } else {
    console.log(`   ❌ ${varName}: NOT SET`);
    allSet = false;
  }
});

if (!allSet) {
  console.log('\n❌ Missing required environment variables!');
  console.log('   Please check backend/.env file\n');
  process.exit(1);
}

console.log('\n2. Testing Brevo Package...');
try {
  const brevo = require('@getbrevo/brevo');
  console.log('   ✅ Brevo package loaded');
  
  const api = new brevo.TransactionalEmailsApi();
  console.log('   ✅ TransactionalEmailsApi created');
  
  if (api.authentications && api.authentications.apiKey) {
    console.log('   ✅ Authentications object available');
    api.authentications.apiKey.apiKey = process.env.BREVO_API_KEY;
    console.log('   ✅ API key set in authentications');
  } else {
    console.log('   ❌ Authentications object not available');
    console.log('   Available properties:', Object.keys(api).join(', '));
  }
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
  console.log('   Stack:', error.stack);
  process.exit(1);
}

async function runDiagnostics() {
  console.log('\n3. Testing Email Service Initialization...');
  try {
    const { verifyConnection } = require('../services/email');
    const isConnected = await verifyConnection();
    if (isConnected) {
      console.log('   ✅ Email service connection verified');
    } else {
      console.log('   ⚠️  Email service connection failed');
    }
  } catch (error) {
    console.log(`   ⚠️  Warning: ${error.message}`);
  }

  console.log('\n4. Testing Email Sending...');
  const testEmail = process.argv[2];
  if (!testEmail) {
    console.log('   ⚠️  No test email provided');
    console.log('   Usage: node scripts/diagnose-email.js your-email@example.com');
    console.log('\n✅ Diagnostic complete - all checks passed!');
    console.log('   If emails still not sending, check:');
    console.log('   1. Backend server is restarted');
    console.log('   2. Check backend console for errors');
    console.log('   3. Check Brevo dashboard for email status');
    console.log('   4. Check spam folder');
    process.exit(0);
  }

  console.log(`   Sending test email to: ${testEmail}`);

  try {
    const { sendTrialEmail } = require('../services/email');
    const { generateTrialKey } = require('../services/licenseGenerator');
    
    const trialKey = generateTrialKey();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const result = await sendTrialEmail({
      to: testEmail,
      trialKey,
      expiresAt,
    });
    
    console.log('   ✅ Email sent successfully!');
    console.log(`   Message ID: ${result.body?.messageId || 'N/A'}`);
    console.log(`   Check inbox (and spam) at: ${testEmail}`);
    console.log(`   Trial key: ${trialKey}`);
    
  } catch (error) {
    console.log(`   ❌ Failed to send email: ${error.message}`);
    
    if (error.response) {
      console.log('   Brevo API Response:');
      console.log('   Status:', error.response.status);
      console.log('   Body:', JSON.stringify(error.response.body, null, 2));
    }
    
    if (error.stack) {
      console.log('\n   Full error:');
      console.log(error.stack);
    }
    
    console.log('\n   Troubleshooting:');
    console.log('   1. Verify BREVO_API_KEY is correct');
    console.log('   2. Check API key has "Send emails" permission');
    console.log('   3. Verify sender domain in Brevo dashboard');
    console.log('   4. Check Brevo account status');
    
    process.exit(1);
  }

  console.log('\n✅ All tests passed!');
}

runDiagnostics().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
