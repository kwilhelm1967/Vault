const express = require('express');
const db = require('../database/db');
const { 
  generatePersonalKey, 
  generateFamilyKey, 
  generateLLVPersonalKey, 
  generateLLVFamilyKey 
} = require('../services/licenseGenerator');
const { sendPurchaseEmail, sendBundleEmail, sendTrialEmail } = require('../services/email');
const logger = require('../utils/logger');
const router = express.Router();

// Simple API key authentication for test endpoints
// Only available in development or with ADMIN_API_KEY
function requireTestAuth(req, res, next) {
  // Allow in development without auth
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  // In production, require admin API key
  const apiKey = req.headers['x-admin-api-key'] || req.query.apiKey;
  const expectedKey = process.env.ADMIN_API_KEY;
  
  if (!expectedKey) {
    return res.status(500).json({ 
      success: false, 
      error: 'Test endpoints not configured' 
    });
  }
  
  if (apiKey !== expectedKey) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized' 
    });
  }
  
  next();
}

router.use(requireTestAuth);

/**
 * POST /api/test/generate-license
 * Generate a test license key (for testing purposes only)
 */
router.post('/generate-license', async (req, res) => {
  try {
    const { planType = 'personal', productType = 'lpv', email } = req.body;
    
    let licenseKey;
    let keyGenerator;
    
    if (productType === 'llv') {
      if (planType === 'family') {
        keyGenerator = generateLLVFamilyKey;
      } else {
        keyGenerator = generateLLVPersonalKey;
      }
    } else {
      if (planType === 'family') {
        keyGenerator = generateFamilyKey;
      } else {
        keyGenerator = generatePersonalKey;
      }
    }
    
    licenseKey = keyGenerator();
    
    // Optionally create license in database
    if (email) {
      let customer = await db.customers.findByEmail(email);
      if (!customer) {
        customer = await db.customers.create({
          email,
          stripe_customer_id: null,
          name: null,
        });
      }
      
      await db.licenses.create({
        license_key: licenseKey,
        plan_type: planType,
        product_type: productType,
        customer_id: customer.id,
        email: email,
        stripe_payment_id: 'test_payment',
        stripe_checkout_session_id: 'test_session',
        amount_paid: 0,
        max_devices: planType === 'family' ? 5 : 1,
      });
      
      logger.info('Test license created', {
        licenseKey,
        email: logger.maskEmail(email),
        planType,
        productType,
        operation: 'test_license_generation',
      });
    }
    
    res.json({
      success: true,
      licenseKey,
      planType,
      productType,
      message: 'Test license generated. Use this for testing only.',
    });
  } catch (error) {
    logger.error('Failed to generate test license', error, {
      operation: 'test_license_generation',
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate test license: ' + error.message 
    });
  }
});

/**
 * POST /api/test/send-email
 * Send a test email (for testing email templates)
 */
router.post('/send-email', async (req, res) => {
  try {
    const { type, email, licenseKey, planType } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }
    
    if (type === 'purchase' && licenseKey && planType) {
      await sendPurchaseEmail({
        to: email,
        licenseKey,
        planType,
        amount: 4900, // $49.00
      });
      
      res.json({
        success: true,
        message: 'Purchase email sent',
        email: logger.maskEmail(email),
      });
    } else if (type === 'bundle') {
      const licenses = [
        {
          keys: [generatePersonalKey()],
          planType: 'personal',
          productName: 'Local Password Vault Personal',
          amount: 4900,
          maxDevices: 1,
        },
        {
          keys: [generateLLVPersonalKey()],
          planType: 'personal',
          productName: 'Local Legacy Vault Personal',
          amount: 4900,
          maxDevices: 1,
        },
      ];
      
      await sendBundleEmail({
        to: email,
        licenses,
        totalAmount: 9800,
        orderId: 'test_order',
      });
      
      res.json({
        success: true,
        message: 'Bundle email sent',
        email: logger.maskEmail(email),
      });
    } else if (type === 'trial') {
      const { generateTrialKey } = require('../services/licenseGenerator');
      
      const trialKey = generateTrialKey();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      await sendTrialEmail({
        to: email,
        trialKey,
        expiresAt,
      });
      
      res.json({
        success: true,
        message: 'Trial email sent',
        email: logger.maskEmail(email),
        trialKey: process.env.NODE_ENV === 'development' ? trialKey : undefined,
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email type. Use "purchase", "bundle", or "trial"' 
      });
    }
  } catch (error) {
    logger.error('Failed to send test email', error, {
      operation: 'test_email',
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send test email: ' + error.message 
    });
  }
});

/**
 * GET /api/test/health
 * Extended health check for testing
 */
router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {
      database: 'unknown',
      email: 'unknown',
    },
  };
  
  // Check database
  try {
    await db.customers.findByEmail('test@test.local');
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'degraded';
    health.databaseError = error.message;
  }
  
  // Check email service (Brevo)
  try {
    // Just check if API key is configured
    if (process.env.BREVO_API_KEY) {
      health.checks.email = 'configured';
    } else {
      health.checks.email = 'not_configured';
      health.status = 'degraded';
    }
  } catch (error) {
    health.checks.email = 'error';
    health.status = 'degraded';
  }
  
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;

