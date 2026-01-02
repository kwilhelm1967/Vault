/**
 * Test Email Service
 * 
 * Quick script to test if email service is working.
 * Run with: node scripts/test-email.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sendTrialEmail } = require('../services/email');

async function testEmail() {
  console.log('=== Testing Email Service ===\n');
  
  // Check environment variables
  console.log('Checking environment variables...');
  if (!process.env.BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY is not set');
    process.exit(1);
  }
  console.log('✅ BREVO_API_KEY is set');
  
  if (!process.env.FROM_EMAIL) {
    console.log('⚠️  FROM_EMAIL is not set (will use default)');
  } else {
    console.log(`✅ FROM_EMAIL is set: ${process.env.FROM_EMAIL}`);
  }
  
  if (!process.env.SUPPORT_EMAIL) {
    console.log('⚠️  SUPPORT_EMAIL is not set (will use default)');
  } else {
    console.log(`✅ SUPPORT_EMAIL is set: ${process.env.SUPPORT_EMAIL}`);
  }
  
  console.log('\n---\n');
  
  // Get test email from command line or use default
  const testEmail = process.argv[2] || process.env.TEST_EMAIL || 'test@example.com';
  
  if (!testEmail || testEmail === 'test@example.com') {
    console.log('⚠️  No test email provided. Usage:');
    console.log('   node scripts/test-email.js your-email@example.com');
    console.log('\nOr set TEST_EMAIL in .env file\n');
  }
  
  console.log(`Sending test trial email to: ${testEmail}\n`);
  
  try {
    const trialKey = 'TEST-TRIAL-KEY-1234';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await sendTrialEmail({
      to: testEmail,
      trialKey,
      expiresAt,
    });
    
    console.log('✅ Email sent successfully!');
    console.log(`   Check your inbox (and spam folder) at: ${testEmail}`);
    console.log(`   Trial key in email: ${trialKey}`);
    
  } catch (error) {
    console.error('❌ Failed to send email:');
    console.error('   Error:', error.message);
    
    if (error.response) {
      console.error('   Brevo API Response:', error.response.body);
    }
    
    console.error('\nTroubleshooting:');
    console.error('  1. Check BREVO_API_KEY is correct');
    console.error('  2. Verify API key has "Send emails" permission');
    console.error('  3. Check if sender domain is verified in Brevo');
    console.error('  4. Check backend logs for more details');
    
    process.exit(1);
  }
}

testEmail();
