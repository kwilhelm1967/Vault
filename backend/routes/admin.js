const express = require('express');
const db = require('../database/db');
const { stripe, getCheckoutSession } = require('../services/stripe');
const { sendPurchaseEmail, sendBundleEmail } = require('../services/email');
const logger = require('../utils/logger');
const router = express.Router();

// Simple API key authentication middleware
// In production, use a more secure method (e.g., JWT, OAuth)
function requireAdminAuth(req, res, next) {
  const apiKey = req.headers['x-admin-api-key'] || req.query.apiKey;
  const expectedKey = process.env.ADMIN_API_KEY;
  
  if (!expectedKey) {
    logger.warn('Admin API key not configured', {
      operation: 'admin_auth',
    });
    return res.status(500).json({ 
      success: false, 
      error: 'Admin API not configured' 
    });
  }
  
  if (apiKey !== expectedKey) {
    logger.warn('Invalid admin API key attempt', {
      operation: 'admin_auth',
      ip: req.ip,
    });
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized' 
    });
  }
  
  next();
}

// Apply auth to all admin routes
router.use(requireAdminAuth);

/**
 * GET /api/admin/webhooks/failed
 * List all failed webhook events
 */
router.get('/webhooks/failed', async (req, res) => {
  try {
    const failedWebhooks = await db.webhookEvents.findFailed();
    
    res.json({
      success: true,
      count: failedWebhooks.length,
      webhooks: failedWebhooks.map(wh => ({
        id: wh.id,
        stripeEventId: wh.stripe_event_id,
        eventType: wh.event_type,
        errorMessage: wh.error_message,
        createdAt: wh.created_at,
        processed: wh.processed,
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch failed webhooks', error, {
      operation: 'admin_failed_webhooks',
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch failed webhooks' 
    });
  }
});

/**
 * POST /api/admin/webhooks/retry/:eventId
 * Retry processing a failed webhook event
 */
router.post('/webhooks/retry/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const webhookEvent = await db.webhookEvents.findByEventId(eventId);
    if (!webhookEvent) {
      return res.status(404).json({ 
        success: false, 
        error: 'Webhook event not found' 
      });
    }
    
    if (webhookEvent.processed) {
      return res.status(400).json({ 
        success: false, 
        error: 'Webhook event already processed' 
      });
    }
    
    // Parse the payload
    let eventData;
    try {
      eventData = JSON.parse(webhookEvent.payload);
    } catch (parseError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid webhook payload format' 
      });
    }
    
    // Re-process the webhook
    const { handleCheckoutCompleted } = require('../routes/webhooks');
    
    if (webhookEvent.event_type === 'checkout.session.completed') {
      await handleCheckoutCompleted(eventData.object);
      await db.webhookEvents.markProcessed(eventId);
      
      logger.info('Webhook retry successful', {
        eventId,
        eventType: webhookEvent.event_type,
        operation: 'admin_webhook_retry',
      });
      
      res.json({
        success: true,
        message: 'Webhook processed successfully',
        eventId,
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: `Event type ${webhookEvent.event_type} not supported for retry` 
      });
    }
  } catch (error) {
    logger.error('Webhook retry failed', error, {
      eventId: req.params.eventId,
      operation: 'admin_webhook_retry',
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retry webhook: ' + error.message 
    });
  }
});

/**
 * POST /api/admin/licenses/resend-email
 * Resend license key email to customer
 */
router.post('/licenses/resend-email', async (req, res) => {
  try {
    const { licenseKey, email } = req.body;
    
    if (!licenseKey && !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Either licenseKey or email is required' 
      });
    }
    
    let license;
    if (licenseKey) {
      license = await db.licenses.findByKey(licenseKey);
    } else {
      const licenses = await db.licenses.findAllByEmail(email);
      if (!licenses || licenses.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'No licenses found for email' 
        });
      }
      license = licenses[0]; // Use first license
    }
    
    if (!license) {
      return res.status(404).json({ 
        success: false, 
        error: 'License not found' 
      });
    }
    
    // Check if this is part of a bundle
    const sessionId = license.stripe_checkout_session_id;
    if (sessionId) {
      const allLicenses = await db.licenses.findAllBySessionId(sessionId);
      if (allLicenses && allLicenses.length > 1) {
        // Bundle purchase - send bundle email
        const licenses = allLicenses.map(l => ({
          keys: [l.license_key],
          planType: l.plan_type,
          productName: `${l.product_type === 'lpv' ? 'Local Password Vault' : 'Local Legacy Vault'} ${l.plan_type === 'personal' ? 'Personal' : 'Family'}`,
          amount: l.amount_paid,
          maxDevices: l.max_devices,
        }));
        
        const session = await getCheckoutSession(sessionId);
        await sendBundleEmail({
          to: license.email,
          licenses: licenses,
          totalAmount: session.amount_total,
          orderId: sessionId,
        });
        
        logger.info('Bundle email resent', {
          email: logger.maskEmail(license.email),
          sessionId,
          licenseCount: licenses.length,
          operation: 'admin_resend_email',
        });
        
        return res.json({
          success: true,
          message: 'Bundle email resent successfully',
          email: logger.maskEmail(license.email),
          licenseCount: licenses.length,
        });
      }
    }
    
    // Single purchase - send single email
    await sendPurchaseEmail({
      to: license.email,
      licenseKey: license.license_key,
      planType: license.plan_type,
      amount: license.amount_paid,
    });
    
    logger.info('Purchase email resent', {
      email: logger.maskEmail(license.email),
      licenseKey: license.license_key,
      planType: license.plan_type,
      operation: 'admin_resend_email',
    });
    
    res.json({
      success: true,
      message: 'Email resent successfully',
      email: logger.maskEmail(license.email),
      licenseKey: license.license_key,
    });
  } catch (error) {
    logger.error('Failed to resend email', error, {
      operation: 'admin_resend_email',
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to resend email: ' + error.message 
    });
  }
});

/**
 * GET /api/admin/licenses/search
 * Search licenses by email, license key, or session ID
 */
router.get('/licenses/search', async (req, res) => {
  try {
    const { email, licenseKey, sessionId } = req.query;
    
    let licenses = [];
    
    if (email) {
      licenses = await db.licenses.findAllByEmail(email);
    } else if (licenseKey) {
      const license = await db.licenses.findByKey(licenseKey);
      if (license) licenses = [license];
    } else if (sessionId) {
      licenses = await db.licenses.findAllBySessionId(sessionId);
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Must provide email, licenseKey, or sessionId' 
      });
    }
    
    res.json({
      success: true,
      count: licenses.length,
      licenses: licenses.map(l => ({
        id: l.id,
        licenseKey: l.license_key,
        planType: l.plan_type,
        productType: l.product_type,
        email: logger.maskEmail(l.email),
        maxDevices: l.max_devices,
        status: l.status,
        createdAt: l.created_at,
        sessionId: l.stripe_checkout_session_id,
      })),
    });
  } catch (error) {
    logger.error('Failed to search licenses', error, {
      operation: 'admin_search_licenses',
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search licenses' 
    });
  }
});

/**
 * GET /api/admin/stats/overview
 * Get comprehensive business statistics
 */
router.get('/stats/overview', async (req, res) => {
  try {
    // Get all active licenses
    const allLicenses = await db.licenses.findAll();
    const activeLicenses = allLicenses.filter(l => l.status === 'active');
    
    // Calculate statistics
    const stats = {
      licenses: {
        total: activeLicenses.length,
        activated: activeLicenses.filter(l => l.is_activated).length,
        unactivated: activeLicenses.filter(l => !l.is_activated).length,
        revoked: allLicenses.filter(l => l.status === 'revoked').length,
      },
      revenue: {
        total: activeLicenses.reduce((sum, l) => sum + (l.amount_paid || 0), 0) / 100,
        lpv: activeLicenses
          .filter(l => l.product_type === 'lpv')
          .reduce((sum, l) => sum + (l.amount_paid || 0), 0) / 100,
        llv: activeLicenses
          .filter(l => l.product_type === 'llv')
          .reduce((sum, l) => sum + (l.amount_paid || 0), 0) / 100,
      },
      products: {
        lpv: {
          total: activeLicenses.filter(l => l.product_type === 'lpv').length,
          personal: activeLicenses.filter(l => l.product_type === 'lpv' && l.plan_type === 'personal').length,
          family: activeLicenses.filter(l => l.product_type === 'lpv' && l.plan_type === 'family').length,
        },
        llv: {
          total: activeLicenses.filter(l => l.product_type === 'llv').length,
          personal: activeLicenses.filter(l => l.product_type === 'llv' && l.plan_type === 'llv_personal').length,
          family: activeLicenses.filter(l => l.product_type === 'llv' && l.plan_type === 'llv_family').length,
        },
      },
      plans: {
        personal: activeLicenses.filter(l => l.plan_type === 'personal' || l.plan_type === 'llv_personal').length,
        family: activeLicenses.filter(l => l.plan_type === 'family' || l.plan_type === 'llv_family').length,
      },
    };
    
    // Calculate activation rate
    stats.licenses.activationRate = stats.licenses.total > 0
      ? Math.round((stats.licenses.activated / stats.licenses.total) * 100)
      : 0;
    
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Failed to fetch overview statistics', error, {
      operation: 'admin_stats_overview',
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch statistics' 
    });
  }
});

/**
 * GET /api/admin/stats/trials
 * Get trial statistics
 */
router.get('/stats/trials', async (req, res) => {
  try {
    const allTrials = await db.trials.findAll();
    
    const stats = {
      total: allTrials.length,
      activated: allTrials.filter(t => t.is_activated).length,
      converted: allTrials.filter(t => t.is_converted).length,
      expired: allTrials.filter(t => {
        if (!t.expires_at) return false;
        return new Date(t.expires_at) < new Date();
      }).length,
    };
    
    stats.conversionRate = stats.total > 0
      ? Math.round((stats.converted / stats.total) * 100)
      : 0;
    
    stats.activationRate = stats.total > 0
      ? Math.round((stats.activated / stats.total) * 100)
      : 0;
    
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Failed to fetch trial statistics', error, {
      operation: 'admin_stats_trials',
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch trial statistics' 
    });
  }
});

/**
 * GET /api/admin/stats/recent
 * Get recent licenses (last 30 days)
 */
router.get('/stats/recent', async (req, res) => {
  try {
    const allLicenses = await db.licenses.findAll();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recent = allLicenses
      .filter(l => new Date(l.created_at) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 50)
      .map(l => ({
        licenseKey: l.license_key,
        productType: l.product_type,
        planType: l.plan_type,
        email: logger.maskEmail(l.email),
        amount: (l.amount_paid || 0) / 100,
        isActivated: l.is_activated,
        createdAt: l.created_at,
      }));
    
    res.json({
      success: true,
      count: recent.length,
      licenses: recent,
    });
  } catch (error) {
    logger.error('Failed to fetch recent licenses', error, {
      operation: 'admin_stats_recent',
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch recent licenses' 
    });
  }
});

/**
 * GET /api/admin/stats/customers
 * Get customer statistics
 */
router.get('/stats/customers', async (req, res) => {
  try {
    const allCustomers = await db.customers.findAll();
    const allLicenses = await db.licenses.findAll();
    
    // Calculate customer lifetime value
    const customerStats = allCustomers.map(customer => {
      const customerLicenses = allLicenses.filter(
        l => l.email === customer.email && l.status === 'active'
      );
      
      return {
        email: logger.maskEmail(customer.email),
        name: customer.name || 'N/A',
        licenseCount: customerLicenses.length,
        totalSpent: customerLicenses.reduce((sum, l) => sum + (l.amount_paid || 0), 0) / 100,
        products: [...new Set(customerLicenses.map(l => l.product_type))],
        createdAt: customer.created_at,
      };
    })
    .filter(c => c.licenseCount > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 50);
    
    const stats = {
      totalCustomers: allCustomers.length,
      customersWithLicenses: customerStats.length,
      topCustomers: customerStats,
    };
    
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Failed to fetch customer statistics', error, {
      operation: 'admin_stats_customers',
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch customer statistics' 
    });
  }
});

module.exports = router;

