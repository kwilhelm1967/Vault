/**
 * Stripe Webhook Handler
 * 
 * POST /api/webhooks/stripe - Handle Stripe events
 */

const express = require('express');
const db = require('../database/db');
const { verifyWebhookSignature, getCheckoutSession, PRODUCTS } = require('../services/stripe');
const { generatePersonalKey, generateFamilyKey } = require('../services/licenseGenerator');
const { sendPurchaseEmail } = require('../services/email');

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
  
  // Get session details with expanded customer
  const fullSession = await getCheckoutSession(session.id);
  
  // Extract metadata
  const planType = fullSession.metadata?.plan_type || 'personal';
  const maxDevices = parseInt(fullSession.metadata?.max_devices || '1');
  const customerEmail = fullSession.customer_email || fullSession.customer_details?.email;
  
  if (!customerEmail) {
    throw new Error('No customer email found in checkout session');
  }
  
  // Generate license key based on plan type
  const licenseKey = planType === 'family' 
    ? generateFamilyKey() 
    : generatePersonalKey();
  
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
  
  // Get amount paid
  const amountPaid = fullSession.amount_total || PRODUCTS[planType]?.price || 4900;
  
  // Create license record
  db.licenses.create.run({
    license_key: licenseKey,
    plan_type: planType,
    customer_id: customer?.id || null,
    email: customerEmail,
    stripe_payment_id: fullSession.payment_intent?.id || null,
    stripe_checkout_session_id: session.id,
    amount_paid: amountPaid,
    max_devices: maxDevices,
  });
  
  console.log(`License created: ${licenseKey} for ${customerEmail}`);
  
  // Mark any existing trial as converted
  const existingTrial = db.trials.findByEmail.get(customerEmail);
  if (existingTrial) {
    const newLicense = db.licenses.findByKey.get(licenseKey);
    db.trials.markConverted.run({
      email: customerEmail,
      license_id: newLicense?.id || null,
    });
    console.log(`Trial converted for ${customerEmail}`);
  }
  
  // Send purchase confirmation email
  try {
    await sendPurchaseEmail({
      to: customerEmail,
      licenseKey,
      planType,
      amount: amountPaid,
    });
    console.log(`Purchase email sent to ${customerEmail}`);
  } catch (emailError) {
    console.error('Failed to send purchase email:', emailError);
    // Don't throw - license was created successfully
  }
}

module.exports = router;

