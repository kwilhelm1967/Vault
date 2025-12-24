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
 * 
 * Products are identified by their Stripe Price ID in line items.
 * The webhook handler will map price IDs to products and generate appropriate licenses.
 */
const PRODUCTS = {
  // Local Password Vault (LPV)
  personal: {
    name: 'Personal Vault',
    description: 'Lifetime license for 1 device',
    price: 4900, // $49.00 in cents
    priceId: process.env.STRIPE_PRICE_PERSONAL, // Set in .env
    maxDevices: 1,
    productType: 'lpv', // Product identifier
  },
  family: {
    name: 'Family Vault',
    description: 'Lifetime license for up to 5 devices',
    price: 7900, // $79.00 in cents
    priceId: process.env.STRIPE_PRICE_FAMILY, // Set in .env
    maxDevices: 5,
    productType: 'lpv',
  },
  // Local Legacy Vault (LLV)
  llv_personal: {
    name: 'Local Legacy Vault - Personal',
    description: 'Lifetime license for 1 device',
    price: 4900, // $49.00 in cents (adjust as needed)
    priceId: process.env.STRIPE_PRICE_LLV_PERSONAL, // Set in .env
    maxDevices: 1,
    productType: 'llv',
  },
  llv_family: {
    name: 'Local Legacy Vault - Family',
    description: 'Lifetime license for up to 5 devices',
    price: 12900, // $129.00 in cents
    priceId: process.env.STRIPE_PRICE_LLV_FAMILY, // Set in .env
    maxDevices: 5,
    productType: 'llv',
  },
};

/**
 * Map Stripe Price ID to product configuration
 * Used by webhook handler to identify which product was purchased
 */
function getProductByPriceId(priceId) {
  for (const [key, product] of Object.entries(PRODUCTS)) {
    if (product.priceId === priceId) {
      return { ...product, key };
    }
  }
  return null;
}

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

/**
 * Create a bundle checkout session (multiple products) with automatic discount
 * 
 * Bundle Discount: All bundles receive 13.94% discount for consistency
 * 
 * Available bundles:
 * 1. Personal Bundle: LPV Personal ($49) + LLV Personal ($49) = $98 → $84 (save $14)
 * 2. Family Protection Bundle: LPV Family ($79) + LLV Family ($129) = $208 → $179 (save $29)
 * 3. Mixed Bundle: LPV Personal ($49) + LLV Family ($129) = $178 → $153 (save $25)
 * 4. Mixed Bundle: LPV Family ($79) + LLV Personal ($49) = $128 → $110 (save $18)
 * 
 * @param {Array} items - Array of { productKey, quantity } objects
 * @param {string} customerEmail - Customer's email address
 * @param {string} successUrl - URL to redirect after successful payment
 * @param {string} cancelUrl - URL to redirect if payment is cancelled
 * @returns {Promise<Object>} Stripe Checkout Session
 */
async function createBundleCheckoutSession(items, customerEmail, successUrl, cancelUrl) {
  const lineItems = items.map(({ productKey, quantity = 1 }) => {
    const product = PRODUCTS[productKey];
    if (!product) {
      throw new Error(`Invalid product key: ${productKey}`);
    }
    
    if (!product.priceId) {
      // Development mode: create price on the fly
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: product.description,
          },
          unit_amount: product.price,
        },
        quantity: quantity,
      };
    }
    
    // Production: use pre-configured price ID
    return {
      price: product.priceId,
      quantity: quantity,
    };
  });
  
  // Calculate bundle discount - All bundles receive 13.94% discount for consistency
  // Bundle options:
  // 1. Personal Bundle: LPV Personal ($49) + LLV Personal ($49) = $98 → $84 (save $14)
  // 2. Family Protection Bundle: LPV Family ($79) + LLV Family ($129) = $208 → $179 (save $29)
  // 3. Mixed Bundle: LPV Personal ($49) + LLV Family ($129) = $178 → $153 (save $25)
  // 4. Mixed Bundle: LPV Family ($79) + LLV Personal ($49) = $128 → $110 (save $18)
  let discountAmount = 0;
  const productKeys = items.map(i => i.productKey).sort().join(',');
  
  // Only apply discount if this is actually a bundle (multiple products)
  if (items.length > 1) {
    // Calculate total price first
    const totalPrice = items.reduce((sum, item) => {
      const product = PRODUCTS[item.productKey];
      return sum + (product.price * (item.quantity || 1));
    }, 0);
    
    // Apply 13.94% discount to all bundles (rounding to nearest cent)
    discountAmount = Math.round(totalPrice * 0.1394);
  }
  
  // Build session config
  const sessionConfig = {
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: customerEmail,
    line_items: lineItems,
    metadata: {
      is_bundle: 'true',
      bundle_items: productKeys,
      bundle_discount: discountAmount.toString(),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  };
  
  // Apply discount if applicable
  if (discountAmount > 0) {
    // Option 1: Use Stripe discount code (if you create one in Stripe Dashboard)
    // sessionConfig.discounts = [{ coupon: 'FAMILYBUNDLE' }];
    
    // Option 2: Apply discount as a negative line item (more flexible)
    sessionConfig.line_items.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Bundle Discount',
          description: 'Family Protection Bundle Savings',
        },
        unit_amount: -discountAmount, // Negative amount = discount
      },
      quantity: 1,
    });
  }
  
  const session = await stripe.checkout.sessions.create(sessionConfig);
  
  return session;
}

module.exports = {
  stripe,
  PRODUCTS,
  getProductByPriceId,
  createCheckoutSession,
  createBundleCheckoutSession,
  getCheckoutSession,
  verifyWebhookSignature,
  getCustomer,
  createOrRetrieveCustomer,
};

