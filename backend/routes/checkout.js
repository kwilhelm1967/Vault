/**
 * Stripe Checkout Routes
 * 
 * POST /api/checkout/session - Create a Stripe Checkout session
 */

const express = require('express');
const { createCheckoutSession, createBundleCheckoutSession, PRODUCTS } = require('../services/stripe');

const router = express.Router();

/**
 * POST /api/checkout/session
 * 
 * Creates a Stripe Checkout session for purchasing a license.
 * 
 * Request body:
 * {
 *   "planType": "personal" | "family",
 *   "email": "user@example.com" (optional)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "sessionId": "cs_xxx",
 *   "url": "https://checkout.stripe.com/..."
 * }
 */
router.post('/session', async (req, res) => {
  try {
    const { planType, email } = req.body;
    
    // Validate plan type
    if (!planType || !['personal', 'family'].includes(planType)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid plan type. Must be "personal" or "family".' 
      });
    }
    
    // Build success/cancel URLs
    const baseUrl = process.env.WEBSITE_URL || 'https://localpasswordvault.com';
    
    // Success URL includes session_id for retrieving the license key
    const successUrl = `${baseUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/pricing?cancelled=true`;
    
    // Create Stripe Checkout session
    const session = await createCheckoutSession(
      planType,
      email || null,
      successUrl,
      cancelUrl
    );
    
    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
    
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create checkout session' 
    });
  }
});

/**
 * GET /api/checkout/session/:sessionId
 * 
 * Retrieve checkout session details (for success page)
 * Returns the license key if payment was successful
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId || !sessionId.startsWith('cs_')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid session ID' 
      });
    }
    
    // Import db here to avoid circular dependency
    const db = require('../database/db');
    
    // Look up license by session ID
    const license = db.licenses.findBySessionId.get(sessionId);
    
    if (!license) {
      // License not yet created - webhook may still be processing
      return res.status(404).json({ 
        success: false, 
        error: 'License not found. Please wait a moment and refresh.',
        pending: true,
      });
    }
    
    // Return license details
    res.json({
      success: true,
      data: {
        licenseKey: license.license_key,
        planType: license.plan_type,
        email: license.email,
        maxDevices: license.max_devices,
        createdAt: license.created_at,
      },
    });
    
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve session' 
    });
  }
});

/**
 * POST /api/checkout/bundle
 * 
 * Creates a Stripe Checkout session for a bundle purchase (multiple products).
 * 
 * Request body:
 * {
 *   "items": [
 *     { "productKey": "personal", "quantity": 1 },
 *     { "productKey": "llv_personal", "quantity": 1 }
 *   ],
 *   "email": "user@example.com" (optional)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "sessionId": "cs_xxx",
 *   "url": "https://checkout.stripe.com/..."
 * }
 */
router.post('/bundle', async (req, res) => {
  try {
    const { items, email } = req.body;
    
    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid items. Must be a non-empty array of { productKey, quantity } objects.' 
      });
    }
    
    // Validate each item
    for (const item of items) {
      if (!item.productKey || !PRODUCTS[item.productKey]) {
        return res.status(400).json({ 
          success: false, 
          error: `Invalid product key: ${item.productKey}. Valid keys: ${Object.keys(PRODUCTS).join(', ')}` 
        });
      }
    }
    
    // Build success/cancel URLs
    const baseUrl = process.env.WEBSITE_URL || 'https://localpasswordvault.com';
    const successUrl = `${baseUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/pricing?cancelled=true`;
    
    // Create bundle checkout session
    const session = await createBundleCheckoutSession(
      items,
      email || null,
      successUrl,
      cancelUrl
    );
    
    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
    
  } catch (error) {
    console.error('Bundle checkout session error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create bundle checkout session' 
    });
  }
});

/**
 * GET /api/checkout/products
 * 
 * Returns available products and pricing
 */
router.get('/products', (req, res) => {
  res.json({
    success: true,
    products: Object.entries(PRODUCTS).map(([id, product]) => ({
      id,
      name: product.name,
      description: product.description,
      price: product.price,
      priceFormatted: `$${(product.price / 100).toFixed(2)}`,
      maxDevices: product.maxDevices,
      productType: product.productType,
    })),
  });
});

module.exports = router;

