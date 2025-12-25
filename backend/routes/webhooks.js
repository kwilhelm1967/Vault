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

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  let event;
  try {
    event = verifyWebhookSignature(req.body, signature);
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }
  
  // Prevent duplicate processing (idempotency)
  const existingEvent = await db.webhookEvents.exists(event.id);
  if (existingEvent) {
    console.log(`Duplicate webhook event ignored: ${event.id}`);
    return res.json({ received: true, duplicate: true });
  }
  
  try {
    await db.webhookEvents.create({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: JSON.stringify(event.data),
    });
  } catch (logError) {
    console.error('Failed to log webhook event:', logError);
  }
  
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'payment_intent.succeeded':
        console.log('Payment succeeded:', event.data.object.id);
        break;
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object.id);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    await db.webhookEvents.markProcessed(event.id);
  } catch (error) {
    console.error('Error processing webhook:', error);
    await db.webhookEvents.markError(event.id, error.message);
  }
  
  res.json({ received: true });
});

async function handleCheckoutCompleted(session) {
  console.log('Processing checkout session:', session.id);
  
  const existingLicenses = await db.licenses.findAllBySessionId(session.id);
  if (existingLicenses && existingLicenses.length > 0) {
    console.log(`License(s) already exist for session: ${session.id} (${existingLicenses.length} license(s))`);
    return;
  }
  
  const fullSession = await getCheckoutSession(session.id);
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ['data.price.product'],
  });
  
  const customerEmail = fullSession.customer_email || fullSession.customer_details?.email;
  if (!customerEmail) {
    throw new Error('No customer email found in checkout session');
  }
  
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
  
  // Process each line item and generate license keys
  for (const lineItem of lineItems.data) {
    const priceId = lineItem.price.id;
    const product = getProductByPriceId(priceId);
    
    if (!product) {
      console.warn(`Unknown price ID in checkout: ${priceId}`);
      continue;
    }
    
    // Determine plan type and key generator
    let planType, numKeys, keyGenerator;
    if (product.key === 'personal') {
      planType = 'personal';
      numKeys = 1;
      keyGenerator = generatePersonalKey;
    } else if (product.key === 'family') {
      planType = 'family';
      numKeys = 5;
      keyGenerator = generateFamilyKey;
    } else if (product.key === 'llv_personal') {
      planType = 'llv_personal';
      numKeys = 1;
      keyGenerator = generateLLVPersonalKey;
    } else if (product.key === 'llv_family') {
      planType = 'llv_family';
      numKeys = 5;
      keyGenerator = generateLLVFamilyKey;
    } else {
      console.warn(`Unknown product key: ${product.key}`);
      continue;
    }
    
    const lineItemAmount = lineItem.amount_total || (product.price * lineItem.quantity);
    const productKeys = [];
    
    // Generate keys (1 for personal, 5 for family)
    for (let i = 0; i < numKeys; i++) {
      const licenseKey = keyGenerator();
      
      await db.licenses.create({
        license_key: licenseKey,
        plan_type: planType,
        product_type: product.productType || 'lpv',
        customer_id: customer?.id || null,
        email: customerEmail,
        stripe_payment_id: fullSession.payment_intent?.id || null,
        stripe_checkout_session_id: session.id,
        amount_paid: lineItemAmount / numKeys,
        max_devices: 1,
      });
      
      productKeys.push(licenseKey);
      console.log(`License created: ${licenseKey} (${product.name}) for ${customerEmail}`);
    }
    
    licenses.push({
      keys: productKeys,
      planType: planType,
      productName: product.name,
      amount: lineItemAmount,
      maxDevices: product.maxDevices,
    });
  }
  
  if (licenses.length === 0) {
    throw new Error('No valid products found in checkout session');
  }
  
  // Mark trial as converted if customer had one
  const existingTrial = await db.trials.findByEmail(customerEmail);
  if (existingTrial && licenses.length > 0 && licenses[0].keys && licenses[0].keys.length > 0) {
    const firstLicense = await db.licenses.findByKey(licenses[0].keys[0]);
    await db.trials.markConverted({
      email: customerEmail,
      license_id: firstLicense?.id || null,
    });
    console.log(`Trial converted for ${customerEmail}`);
  }
  
  // Send appropriate email (bundle vs single purchase)
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
        planType: licenses[0].planType,
        amount: licenses[0].amount,
      });
      console.log(`Purchase email sent to ${customerEmail}`);
    }
  } catch (emailError) {
    console.error('Failed to send purchase email:', emailError);
  }
}

module.exports = router;

