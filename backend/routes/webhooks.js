/**
 * Stripe Webhook Handler
 * 
 * POST /api/webhooks/stripe - Handle Stripe events
 */

const express = require('express');
const db = require('../database/db');
const { stripe, verifyWebhookSignature, getCheckoutSession, PRODUCTS, getProductByPriceId } = require('../services/stripe');
const { 
  generatePersonalKey, 
  generateFamilyKey, 
  generateLLVPersonalKey, 
  generateLLVFamilyKey 
} = require('../services/licenseGenerator');
const { sendPurchaseEmail, sendBundleEmail } = require('../services/email');

const router = express.Router();

/**
 * POST /api/webhooks/stripe
 * 
 * Handles Stripe webhook events, primarily checkout.session.completed
 * 
 * This endpoint:
 * 1. Verifies the webhook signature
 * 2. Processes completed payments
 * 3. Generates license keys
 * 4. Sends confirmation emails
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  let event;
  
  try {
    // Verify webhook signature
    event = verifyWebhookSignature(req.body, signature);
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }
  
  // Check for duplicate events
  const existingEvent = db.webhookEvents.exists.get(event.id);
  if (existingEvent) {
    console.log(`Duplicate webhook event ignored: ${event.id}`);
    return res.json({ received: true, duplicate: true });
  }
  
  // Log the event
  try {
    db.webhookEvents.create.run({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: JSON.stringify(event.data),
    });
  } catch (logError) {
    console.error('Failed to log webhook event:', logError);
  }
  
  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
        
      case 'payment_intent.succeeded':
        // Could be used for additional payment tracking
        console.log('Payment succeeded:', event.data.object.id);
        break;
        
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object.id);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    // Mark event as processed
    db.webhookEvents.markProcessed.run(event.id);
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    db.webhookEvents.markError.run(error.message, event.id);
    // Return 200 anyway to prevent Stripe from retrying
    // The error is logged for manual review
  }
  
  res.json({ received: true });
});

/**
 * Handle successful checkout session
 * Supports both single product and bundle purchases (multiple line items)
 * 
 * @param {Object} session - Stripe Checkout Session object
 */
async function handleCheckoutCompleted(session) {
  console.log('Processing checkout session:', session.id);
  
  // Check if we already processed this session
  const existingLicense = db.licenses.findBySessionId.get(session.id);
  if (existingLicense) {
    console.log('License already exists for session:', session.id);
    return;
  }
  
  // Get session details with expanded customer and line items
  const fullSession = await getCheckoutSession(session.id);
  
  // Retrieve line items to determine what was purchased
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ['data.price.product'],
  });
  
  const customerEmail = fullSession.customer_email || fullSession.customer_details?.email;
  if (!customerEmail) {
    throw new Error('No customer email found in checkout session');
  }
  
  // Get or create customer record
  let customer = db.customers.findByEmail.get(customerEmail);
  if (!customer) {
    db.customers.create.run({
      email: customerEmail,
      stripe_customer_id: fullSession.customer || null,
      name: fullSession.customer_details?.name || null,
    });
    customer = db.customers.findByEmail.get(customerEmail);
  } else if (fullSession.customer && !customer.stripe_customer_id) {
    db.customers.updateStripeId.run({
      email: customerEmail,
      stripe_customer_id: fullSession.customer,
    });
  }
  
  const licenses = [];
  const isBundle = lineItems.data.length > 1 || fullSession.metadata?.is_bundle === 'true';
  
  // Process each line item (supports bundles)
  for (const lineItem of lineItems.data) {
    const priceId = lineItem.price.id;
    const product = getProductByPriceId(priceId);
    
    if (!product) {
      console.warn(`Unknown price ID in checkout: ${priceId}`);
      continue;
    }
    
    // Determine plan type and generate appropriate license key
    let licenseKey;
    let planType;
    
    if (product.key === 'personal') {
      licenseKey = generatePersonalKey();
      planType = 'personal';
    } else if (product.key === 'family') {
      licenseKey = generateFamilyKey();
      planType = 'family';
    } else if (product.key === 'llv_personal') {
      licenseKey = generateLLVPersonalKey();
      planType = 'llv_personal';
    } else if (product.key === 'llv_family') {
      licenseKey = generateLLVFamilyKey();
      planType = 'llv_family';
    } else {
      console.warn(`Unknown product key: ${product.key}`);
      continue;
    }
    
    // Calculate amount for this line item
    const lineItemAmount = lineItem.amount_total || (product.price * lineItem.quantity);
    
    // Create license record
    db.licenses.create.run({
      license_key: licenseKey,
      plan_type: planType,
      product_type: product.productType || 'lpv',
      customer_id: customer?.id || null,
      email: customerEmail,
      stripe_payment_id: fullSession.payment_intent?.id || null,
      stripe_checkout_session_id: session.id,
      amount_paid: lineItemAmount,
      max_devices: product.maxDevices,
    });
    
    licenses.push({
      key: licenseKey,
      planType: planType,
      productName: product.name,
      amount: lineItemAmount,
      maxDevices: product.maxDevices,
    });
    
    console.log(`License created: ${licenseKey} (${product.name}) for ${customerEmail}`);
  }
  
  if (licenses.length === 0) {
    throw new Error('No valid products found in checkout session');
  }
  
  // Mark any existing trial as converted
  const existingTrial = db.trials.findByEmail.get(customerEmail);
  if (existingTrial && licenses.length > 0) {
    const firstLicense = db.licenses.findByKey.get(licenses[0].key);
    db.trials.markConverted.run({
      email: customerEmail,
      license_id: firstLicense?.id || null,
    });
    console.log(`Trial converted for ${customerEmail}`);
  }
  
  // Send email (bundle email if multiple licenses, single email if one)
  try {
    if (isBundle || licenses.length > 1) {
      await sendBundleEmail({
        to: customerEmail,
        licenses: licenses,
        totalAmount: fullSession.amount_total,
      });
      console.log(`Bundle purchase email sent to ${customerEmail}`);
    } else {
      await sendPurchaseEmail({
        to: customerEmail,
        licenseKey: licenses[0].key,
        planType: licenses[0].planType,
        amount: licenses[0].amount,
      });
      console.log(`Purchase email sent to ${customerEmail}`);
    }
  } catch (emailError) {
    console.error('Failed to send purchase email:', emailError);
    // Don't throw - licenses were created successfully
  }
}

module.exports = router;

