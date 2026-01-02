const express = require('express');
const db = require('../database/db');
const { generateTrialKey } = require('../services/licenseGenerator');
const { sendTrialEmail } = require('../services/email');
const logger = require('../utils/logger');

const router = express.Router();
const TRIAL_DURATION_DAYS = 7;

router.post('/signup', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check for missing email
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }
    
    // Normalize email first (trim and lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    
    // Check for empty string after trimming
    if (!normalizedEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }
    
    // Validate normalized email - stricter regex that prevents double dots, requires valid TLD
    const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }
    const existingTrial = await db.trials.findByEmail(normalizedEmail);
    
    // Resend trial key if still valid
    if (existingTrial) {
      const expiresAt = new Date(existingTrial.expires_at);
      const now = new Date();
      
      if (now < expiresAt) {
        try {
          await sendTrialEmail({
            to: normalizedEmail,
            trialKey: existingTrial.trial_key,
            expiresAt,
          });
          logger.email('trial_resent', normalizedEmail, {
            trialKey: existingTrial.trial_key,
            operation: 'trial_resend',
          });
        } catch (emailError) {
          logger.emailError('trial_resend', normalizedEmail, emailError, {
            trialKey: existingTrial.trial_key,
            operation: 'trial_resend',
          });
        }
        
        return res.json({
          success: true,
          message: 'Trial key resent to your email',
          expiresAt: expiresAt.toISOString(),
          ...(process.env.NODE_ENV === 'development' && { trialKey: existingTrial.trial_key }),
        });
      } else {
        return res.status(400).json({ 
          success: false, 
          error: 'Trial has expired. Please purchase a license to continue.',
          expired: true,
        });
      }
    }
    
    // Prevent trial if customer already has a license
    const existingLicense = await db.licenses.findByEmail(normalizedEmail);
    if (existingLicense && existingLicense.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'You already have a license. Please use your existing license key.',
        hasLicense: true,
      });
    }
    
    const trialKey = generateTrialKey();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TRIAL_DURATION_DAYS);
    
    try {
      await db.trials.create({
        email: normalizedEmail,
        trial_key: trialKey,
        expires_at: expiresAt.toISOString(),
      });
    } catch (dbError) {
      if (dbError.code === '23505' || dbError.message?.includes('unique')) {
        return res.status(400).json({ 
          success: false, 
          error: 'Trial already exists for this email' 
        });
      }
      throw dbError;
    }
    
    try {
      await sendTrialEmail({
        to: normalizedEmail,
        trialKey,
        expiresAt,
      });
      logger.email('trial_sent', normalizedEmail, {
        trialKey,
        expiresAt: expiresAt.toISOString(),
        operation: 'trial_signup',
      });
    } catch (emailError) {
      logger.emailError('trial_send', normalizedEmail, emailError, {
        trialKey,
        operation: 'trial_signup',
      });
    }
    
    res.json({
      success: true,
      message: 'Trial key sent to your email',
      expiresAt: expiresAt.toISOString(),
      ...(process.env.NODE_ENV === 'development' && { trialKey }),
    });
    
  } catch (error) {
    logger.error('Trial signup error', error, {
      email: req.body.email,
      operation: 'trial_signup',
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create trial. Please try again.' 
    });
  }
});

router.get('/status/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    
    const trial = await db.trials.findByEmail(email);
    
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
    logger.error('Trial status check error', error, {
      email: req.params.email,
      operation: 'trial_status_check',
    });
    res.status(500).json({ error: 'Failed to check trial status' });
  }
});

module.exports = router;

