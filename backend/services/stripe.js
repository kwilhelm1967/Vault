/**
 * Stripe Integration Service
 * Handles payment processing and checkout sessions
 */

const Stripe = require('stripe');

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

/**
 * Product/Price configuration
 * These should match your Stripe Dashboard product IDs
 */
const PRODUCTS = {
  personal: {
    name: 'Personal Vault',
    description: 'Lifetime license for 1 device',
    price: 4900, // $49.00 in cents
    priceId: process.env.STRIPE_PRICE_PERSONAL, // Set in .env
    maxDevices: 1,
  },
  family: {
    name: 'Family Vault',
    description: 'Lifetime license for up to 5 devices',
    price: 7900, // $79.00 in cents
    priceId: process.env.STRIPE_PRICE_FAMILY, // Set in .env
    maxDevices: 5,
  },
};

/**
 * Create a Stripe Checkout Session
 * 
 * @param {string} planType - 'personal' or 'family'
 * @param {string} customerEmail - Customer's email address
 * @param {string} successUrl - URL to redirect after successful payment
 * @param {string} cancelUrl - URL to redirect if payment is cancelled
 * @returns {Promise<Object>} Stripe Checkout Session
 */
async function createCheckoutSession(planType, customerEmail, successUrl, cancelUrl) {
  const product = PRODUCTS[planType];
  
  if (!product) {
    throw new Error(`Invalid plan type: ${planType}`);
  }
  
  // Check if we have the price ID configured
  if (!product.priceId) {
    // Create a one-time price on the fly (for development)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: product.price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        plan_type: planType,
        max_devices: product.maxDevices.toString(),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    
    return session;
  }
  
  // Use pre-configured price ID (production)
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: customerEmail,
    line_items: [
      {
        price: product.priceId,
        quantity: 1,
      },
    ],
    metadata: {
      plan_type: planType,
      max_devices: product.maxDevices.toString(),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  
  return session;
}

/**
 * Retrieve a Checkout Session by ID
 * 
 * @param {string} sessionId - Stripe Checkout Session ID
 * @returns {Promise<Object>} Checkout Session details
 */
async function getCheckoutSession(sessionId) {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['customer', 'payment_intent'],
  });
}

/**
 * Verify Stripe webhook signature
 * 
 * @param {Buffer} payload - Raw request body
 * @param {string} signature - Stripe signature header
 * @returns {Object} Verified Stripe event
 */
function verifyWebhookSignature(payload, signature) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }
  
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Get customer by ID
 * 
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<Object>} Customer details
 */
async function getCustomer(customerId) {
  return stripe.customers.retrieve(customerId);
}

/**
 * Create or retrieve a customer
 * 
 * @param {string} email - Customer email
 * @param {string} name - Customer name (optional)
 * @returns {Promise<Object>} Customer object
 */
async function createOrRetrieveCustomer(email, name = null) {
  // Search for existing customer
  const existingCustomers = await stripe.customers.list({
    email: email,
    limit: 1,
  });
  
  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }
  
  // Create new customer
  return stripe.customers.create({
    email: email,
    name: name,
  });
}

module.exports = {
  stripe,
  PRODUCTS,
  createCheckoutSession,
  getCheckoutSession,
  verifyWebhookSignature,
  getCustomer,
  createOrRetrieveCustomer,
};

