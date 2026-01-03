const express = require('express');
const { createCheckoutSession, createBundleCheckoutSession, PRODUCTS } = require('../services/stripe');
const logger = require('../utils/logger');

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
    
    // Determine website URL based on product type
    const isLLV = planType.startsWith('llv_');
    const baseUrl = isLLV 
      ? (process.env.LLV_WEBSITE_URL || 'https://locallegacyvault.com')
      : (process.env.WEBSITE_URL || 'https://localpasswordvault.com');
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
    logger.error('Checkout session error', error, {
      planType: req.body?.planType,
      operation: 'checkout_session_creation',
    });
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
    logger.error('Get session error', error, {
      sessionId: req.params?.sessionId,
      operation: 'checkout_session_retrieval',
    });
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
    
    const seenProductKeys = new Set();
    const productTypes = new Set();
    
    for (const item of items) {
      if (!item.productKey || !PRODUCTS[item.productKey]) {
        return res.status(400).json({ 
          success: false, 
          error: `Invalid product key: ${item.productKey}. Valid keys: ${Object.keys(PRODUCTS).join(', ')}` 
        });
      }
      
      // Prevent duplicate products in bundle
      if (seenProductKeys.has(item.productKey)) {
        return res.status(400).json({ 
          success: false, 
          error: `Duplicate product in bundle: ${item.productKey}. Each product can only appear once in a bundle.` 
        });
      }
      seenProductKeys.add(item.productKey);
      
      // Track product types for validation
      const product = PRODUCTS[item.productKey];
      productTypes.add(product.productType || 'lpv');
    }
    
    // Business rule: Bundle must contain at least 2 different products
    if (items.length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Bundle must contain at least 2 products. For single product purchases, use the regular checkout.' 
      });
    }
    
    // Business rule: Bundle must contain products from both LPV and LLV
    if (!productTypes.has('lpv') || !productTypes.has('llv')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Bundle must contain products from both Local Password Vault and Local Legacy Vault.' 
      });
    }
    
    // Business rule: Validate specific bundle combinations
    const hasLPVPersonal = seenProductKeys.has('personal');
    const hasLPVFamily = seenProductKeys.has('family');
    const hasLLVPersonal = seenProductKeys.has('llv_personal');
    const hasLLVFamily = seenProductKeys.has('llv_family');
    
    // Valid combinations:
    // 1. LPV Personal + LLV Personal (Personal Bundle)
    // 2. LPV Family + LLV Family (Family Protection Bundle)
    // 3. LPV Personal + LLV Family (Mixed Bundle)
    // 4. LPV Family + LLV Personal (Mixed Bundle)
    const isValidCombination = 
      (hasLPVPersonal && hasLLVPersonal) ||
      (hasLPVFamily && hasLLVFamily) ||
      (hasLPVPersonal && hasLLVFamily) ||
      (hasLPVFamily && hasLLVPersonal);
    
    if (!isValidCombination) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid bundle combination. Valid bundles: Personal Bundle (LPV Personal + LLV Personal), Family Protection Bundle (LPV Family + LLV Family), or Mixed Bundles (LPV Personal + LLV Family, or LPV Family + LLV Personal).' 
      });
    }
    
    // Determine website URL based on products in bundle
    // If bundle contains LLV products, use LLV website; otherwise use LPV website
    const hasLLV = items.some(item => {
      const product = PRODUCTS[item.productKey];
      return product && product.productType === 'llv';
    });
    const baseUrl = hasLLV
      ? (process.env.LLV_WEBSITE_URL || 'https://locallegacyvault.com')
      : (process.env.WEBSITE_URL || 'https://localpasswordvault.com');
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
    logger.error('Bundle checkout session error', error, {
      items: req.body?.items,
      operation: 'bundle_checkout_session_creation',
    });
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

