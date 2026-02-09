#!/usr/bin/env node
/**
 * Check that LPV trial email can be sent (BREVO_API_KEY set and initialized).
 * Run from backend folder: node scripts/check-lpv-email.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { isLpvEmailReady } = require('../services/lpvEmail');

if (isLpvEmailReady()) {
  console.log('LPV email: OK (BREVO_API_KEY set, ready to send trial emails)');
  process.exit(0);
} else {
  console.error('LPV email: NOT READY. Set BREVO_API_KEY in .env and restart the server.');
  process.exit(1);
}
