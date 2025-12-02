/**
 * Trial Signup Routes
 * 
 * POST /api/trial/signup - Start a free trial
 */

const express = require('express');
const db = require('../database/db');
const { generateTrialKey } = require('../services/licenseGenerator');
const { sendTrialEmail } = require('../services/email');

const router = express.Router();

// Trial duration: 7 days
const TRIAL_DURATION_DAYS = 7;

/**
 * POST /api/trial/signup
 * 
 * Creates a new trial account and sends the trial key via email.
 * 
 * Request body:
 * {
 *   "email": "user@example.com"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Trial key sent to your email",
 *   "trialKey": "TRIA-XXXX-XXXX-XXXX",  // Only in dev mode
 *   "expiresAt": "2025-12-09T..."
 * }
 */
router.post('/signup', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if email already has a trial
    const existingTrial = db.trials.findByEmail.get(normalizedEmail);
    
    if (existingTrial) {
      // Check if trial is still valid
      const expiresAt = new Date(existingTrial.expires_at);
      const now = new Date();
      
      if (now < expiresAt) {
        // Trial still active - resend the key
        try {
          await sendTrialEmail({
            to: normalizedEmail,
            trialKey: existingTrial.trial_key,
            expiresAt,
          });
        } catch (emailError) {
          console.error('Failed to resend trial email:', emailError);
        }
        
        return res.json({
          success: true,
          message: 'Trial key resent to your email',
          expiresAt: expiresAt.toISOString(),
          // Include key in dev mode for testing
          ...(process.env.NODE_ENV === 'development' && { trialKey: existingTrial.trial_key }),
        });
      } else {
        // Trial expired - they need to purchase
        return res.status(400).json({ 
          success: false, 
          error: 'Trial has expired. Please purchase a license to continue.',
          expired: true,
        });
      }
    }
    
    // Check if email already has a purchased license
    const existingLicense = db.licenses.findByEmail.get(normalizedEmail);
    
    if (existingLicense) {
      return res.status(400).json({ 
        success: false, 
        error: 'You already have a license. Please use your existing license key.',
        hasLicense: true,
      });
    }
    
    // Generate trial key
    const trialKey = generateTrialKey();
    
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TRIAL_DURATION_DAYS);
    
    // Save to database
    try {
      db.trials.create.run({
        email: normalizedEmail,
        trial_key: trialKey,
        expires_at: expiresAt.toISOString(),
      });
    } catch (dbError) {
      // Handle unique constraint violation (race condition)
      if (dbError.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ 
          success: false, 
          error: 'Trial already exists for this email' 
        });
      }
      throw dbError;
    }
    
    // Send trial email
    try {
      await sendTrialEmail({
        to: normalizedEmail,
        trialKey,
        expiresAt,
      });
    } catch (emailError) {
      console.error('Failed to send trial email:', emailError);
      // Don't fail the request - trial was created
    }
    
    // Success response
    res.json({
      success: true,
      message: 'Trial key sent to your email',
      expiresAt: expiresAt.toISOString(),
      // Include key in dev mode for testing
      ...(process.env.NODE_ENV === 'development' && { trialKey }),
    });
    
  } catch (error) {
    console.error('Trial signup error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create trial. Please try again.' 
    });
  }
});

/**
 * GET /api/trial/status/:email
 * 
 * Check trial status for an email
 */
router.get('/status/:email', (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    
    const trial = db.trials.findByEmail.get(email);
    
    if (!trial) {
      return res.json({
        hasTrial: false,
        canStartTrial: true,
      });
    }
    
    const expiresAt = new Date(trial.expires_at);
    const now = new Date();
    const isExpired = now >= expiresAt;
    
    res.json({
      hasTrial: true,
      isExpired,
      expiresAt: expiresAt.toISOString(),
      isActivated: trial.is_activated,
      isConverted: trial.is_converted,
      canStartTrial: false,
    });
    
  } catch (error) {
    console.error('Trial status check error:', error);
    res.status(500).json({ error: 'Failed to check trial status' });
  }
});

module.exports = router;

