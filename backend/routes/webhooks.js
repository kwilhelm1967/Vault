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
  const existingEvent = await db.webhookEvents.exists(event.id);
  if (existingEvent) {
    console.log(`Duplicate webhook event ignored: ${event.id}`);
    return res.json({ received: true, duplicate: true });
  }
  
  // Log the event
  try {
    await db.webhookEvents.create({
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
    await db.webhookEvents.markProcessed(event.id);
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    await db.webhookEvents.markError(event.id, error.message);
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
  const existingLicense = await db.licenses.findBySessionId(session.id);
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
  let customer = await db.customers.findByEmail(customerEmail);
  if (!customer) {
    customer = await db.customers.create({
      email: customerEmail,
      stripe_customer_id: fullSession.customer || null,
      name: fullSession.customer_details?.name || null,
    });
  } else if (fullSession.customer && !customer.stripe_customer_id) {
    customer = await db.customers.updateStripeId({
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
    
    // Determine plan type and number of keys needed
    let planType;
    let numKeys;
    let keyGenerator;
    
    if (product.key === 'personal') {
      planType = 'personal';
      numKeys = 1;
      keyGenerator = generatePersonalKey;
    } else if (product.key === 'family') {
      planType = 'family';
      numKeys = 5; // Family plans get 5 separate keys
      keyGenerator = generateFamilyKey;
    } else if (product.key === 'llv_personal') {
      // Local Legacy Vault - Personal: Generates LLVP-XXXX-XXXX-XXXX keys
      // Uses same Supabase database as LPV, distinguished by product_type='llv'
      planType = 'llv_personal';
      numKeys = 1;
      keyGenerator = generateLLVPersonalKey;
    } else if (product.key === 'llv_family') {
      // Local Legacy Vault - Family: Generates LLVF-XXXX-XXXX-XXXX keys (5 keys)
      // Uses same Supabase database as LPV, distinguished by product_type='llv'
      planType = 'llv_family';
      numKeys = 5; // Family plans get 5 separate keys
      keyGenerator = generateLLVFamilyKey;
    } else {
      console.warn(`Unknown product key: ${product.key}`);
      continue;
    }
    
    // Calculate amount for this line item
    const lineItemAmount = lineItem.amount_total || (product.price * lineItem.quantity);
    
    // Generate all keys for this product (1 for personal, 5 for family)
    const productKeys = [];
    for (let i = 0; i < numKeys; i++) {
      const licenseKey = keyGenerator();
      
      // Create license record for each key
      await db.licenses.create({
        license_key: licenseKey,
        plan_type: planType,
        product_type: product.productType || 'lpv',
        customer_id: customer?.id || null,
        email: customerEmail,
        stripe_payment_id: fullSession.payment_intent?.id || null,
        stripe_checkout_session_id: session.id,
        amount_paid: lineItemAmount / numKeys, // Split amount across keys
        max_devices: 1, // Each key is for 1 device
      });
      
      productKeys.push(licenseKey);
      console.log(`License created: ${licenseKey} (${product.name}) for ${customerEmail}`);
    }
    
    // Add all keys for this product to licenses array
    licenses.push({
      keys: productKeys, // Array of keys for this product
      planType: planType,
      productName: product.name,
      amount: lineItemAmount,
      maxDevices: product.maxDevices,
    });
  }
  
  if (licenses.length === 0) {
    throw new Error('No valid products found in checkout session');
  }
  
  // Mark any existing trial as converted
  const existingTrial = await db.trials.findByEmail(customerEmail);
  if (existingTrial && licenses.length > 0 && licenses[0].keys && licenses[0].keys.length > 0) {
    const firstLicense = await db.licenses.findByKey(licenses[0].keys[0]);
    await db.trials.markConverted({
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
          orderId: session.id,
        });
        console.log(`Bundle purchase email sent to ${customerEmail}`);
      } else {
      await sendPurchaseEmail({
        to: customerEmail,
        licenseKey: licenses[0].keys[0],
        planName: licenses[0].productName,
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

