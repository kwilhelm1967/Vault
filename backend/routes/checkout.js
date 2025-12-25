const express = require('express');
const { createCheckoutSession, createBundleCheckoutSession, PRODUCTS } = require('../services/stripe');

const router = express.Router();

router.post('/session', async (req, res) => {
  try {
    const { planType, email } = req.body;
    const validPlanTypes = ['personal', 'family', 'llv_personal', 'llv_family'];
    
    if (!planType || !validPlanTypes.includes(planType)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid plan type. Must be one of: ${validPlanTypes.join(', ')}` 
      });
    }
    
    const baseUrl = process.env.WEBSITE_URL || 'https://localpasswordvault.com';
    const successUrl = `${baseUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/pricing?cancelled=true`;
    
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

router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId || !sessionId.startsWith('cs_')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid session ID' 
      });
    }
    
    const db = require('../database/db');
    const licenses = await db.licenses.findAllBySessionId(sessionId);
    
    if (!licenses || licenses.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'License not found. Please wait a moment and refresh.',
        pending: true,
      });
    }
    
    // Single purchase
    if (licenses.length === 1) {
      res.json({
        success: true,
        data: {
          licenseKey: licenses[0].license_key,
          planType: licenses[0].plan_type,
          email: licenses[0].email,
          maxDevices: licenses[0].max_devices,
          createdAt: licenses[0].created_at,
        },
      });
    } else {
      // Bundle purchase
      res.json({
        success: true,
        isBundle: true,
        data: {
          licenses: licenses.map(license => ({
            licenseKey: license.license_key,
            planType: license.plan_type,
            productType: license.product_type,
            maxDevices: license.max_devices,
          })),
          email: licenses[0].email,
          totalKeys: licenses.length,
          createdAt: licenses[0].created_at,
        },
      });
    }
    
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve session' 
    });
  }
});

router.post('/bundle', async (req, res) => {
  try {
    const { items, email } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid items. Must be a non-empty array of { productKey, quantity } objects.' 
      });
    }
    
    for (const item of items) {
      if (!item.productKey || !PRODUCTS[item.productKey]) {
        return res.status(400).json({ 
          success: false, 
          error: `Invalid product key: ${item.productKey}. Valid keys: ${Object.keys(PRODUCTS).join(', ')}` 
        });
      }
    }
    
    const baseUrl = process.env.WEBSITE_URL || 'https://localpasswordvault.com';
    const successUrl = `${baseUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/pricing?cancelled=true`;
    
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

