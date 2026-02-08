const Stripe = require('stripe');

// Initialize Stripe - don't throw error on module load, check in functions instead
let stripe = null;

function getStripeInstance() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
  }
  
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }
  
  return stripe;
}

const PRODUCTS = {
  personal: {
    name: 'Personal Vault',
    description: 'Lifetime license for 1 device',
    price: 4900,
    priceId: process.env.STRIPE_PRICE_PERSONAL,
    maxDevices: 1,
    productType: 'lpv',
  },
  family: {
    name: 'Family Vault',
    description: 'Lifetime license for up to 5 devices',
    price: 7900,
    priceId: process.env.STRIPE_PRICE_FAMILY,
    maxDevices: 5,
    productType: 'lpv',
  },
  afterpassing_addon: {
    name: 'AfterPassing Guide Add-On',
    description: 'Guidance and templates add-on',
    price: 1900,
    priceId: process.env.STRIPE_PRICE_AFTERPASSING_ADDON,
    maxDevices: 1,
    productType: 'afterpassing',
  },
  afterpassing_standalone: {
    name: 'AfterPassing Guide',
    description: 'Standalone guidance and templates for end-of-life planning',
    price: 3900,
    priceId: process.env.STRIPE_PRICE_AFTERPASSING_STANDALONE,
    maxDevices: 1,
    productType: 'afterpassing',
  },
};

function getProductByPriceId(priceId) {
  for (const [key, product] of Object.entries(PRODUCTS)) {
    if (product.priceId === priceId) {
      return { ...product, key };
    }
  }
  return null;
}

async function createCheckoutSession(planType, customerEmail, successUrl, cancelUrl) {
  const product = PRODUCTS[planType];
  
  if (!product) {
    throw new Error(`Invalid plan type: ${planType}`);
  }
  
  const logger = require('../utils/logger');
  const stripeInstance = getStripeInstance();
  
  const lineItem = product.priceId
    ? { price: product.priceId, quantity: 1 }
    : {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: product.description,
          },
          unit_amount: product.price,
        },
        quantity: 1,
      };
  
  const sessionConfig = {
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [lineItem],
    metadata: {
      plan_type: planType,
      max_devices: product.maxDevices.toString(),
      product_name: product.name,
      product_price: product.price.toString(),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  };
  
  if (customerEmail && customerEmail.trim() && customerEmail.includes('@')) {
    sessionConfig.customer_email = customerEmail.trim();
  }
  
  const session = await stripeInstance.checkout.sessions.create(sessionConfig);
  
  logger.info('Stripe checkout session created', {
    sessionId: session.id,
    planType,
    productName: product.name,
    checkoutUrl: session.url,
    operation: 'stripe_checkout_created',
  });
  
  return session;
}

async function getCheckoutSession(sessionId) {
  const stripeInstance = getStripeInstance();
  return stripeInstance.checkout.sessions.retrieve(sessionId, {
    expand: ['customer', 'payment_intent'],
  });
}

function verifyWebhookSignature(payload, signature) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }
  
  const stripeInstance = getStripeInstance();
  return stripeInstance.webhooks.constructEvent(payload, signature, webhookSecret);
}

async function getCustomer(customerId) {
  const stripeInstance = getStripeInstance();
  return stripeInstance.customers.retrieve(customerId);
}

async function createOrRetrieveCustomer(email, name = null) {
  const stripeInstance = getStripeInstance();
  const existingCustomers = await stripeInstance.customers.list({
    email: email,
    limit: 1,
  });
  
  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }
  
  return stripeInstance.customers.create({
    email: email,
    name: name,
  });
}

async function createBundleCheckoutSession(items, customerEmail, successUrl, cancelUrl) {
  const BUNDLE_DISCOUNT_RATE = 0.1394; // 13.94% bundle discount
  
  // Calculate total price to determine per-item discount allocation
  const totalPrice = items.reduce((sum, item) => {
    const product = PRODUCTS[item.productKey];
    return sum + (product.price * (item.quantity || 1));
  }, 0);
  
  const discountAmount = items.length > 1 ? Math.round(totalPrice * BUNDLE_DISCOUNT_RATE) : 0;
  
  // Distribute discount proportionally across line items using price_data
  // (Stripe does not allow negative unit_amount line items)
  let remainingDiscount = discountAmount;
  
  const lineItems = items.map(({ productKey, quantity = 1 }, index) => {
    const product = PRODUCTS[productKey];
    if (!product) {
      throw new Error(`Invalid product key: ${productKey}`);
    }
    
    let adjustedPrice = product.price;
    
    if (discountAmount > 0) {
      // Proportional discount for this item
      const itemTotal = product.price * quantity;
      const itemDiscount = index === items.length - 1
        ? remainingDiscount // Last item gets any rounding remainder
        : Math.round((itemTotal / totalPrice) * discountAmount);
      remainingDiscount -= itemDiscount;
      adjustedPrice = Math.max(1, product.price - Math.round(itemDiscount / quantity)); // Stripe requires min 1 cent
    }
    
    // Always use price_data for bundles to apply discount
    return {
      price_data: {
        currency: 'usd',
        product_data: {
          name: product.name,
          description: discountAmount > 0
            ? `${product.description} (Bundle Price)`
            : product.description,
        },
        unit_amount: adjustedPrice,
      },
      quantity: quantity,
    };
  });
  
  const sessionConfig = {
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: lineItems,
    metadata: {
      is_bundle: 'true',
      bundle_discount: discountAmount.toString(),
      original_total: totalPrice.toString(),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  };
  
  if (customerEmail && customerEmail.trim() && customerEmail.includes('@')) {
    sessionConfig.customer_email = customerEmail.trim();
  }
  
  const stripeInstance = getStripeInstance();
  const session = await stripeInstance.checkout.sessions.create(sessionConfig);
  return session;
}

module.exports = {
  getStripeInstance,
  PRODUCTS,
  getProductByPriceId,
  createCheckoutSession,
  createBundleCheckoutSession,
  getCheckoutSession,
  verifyWebhookSignature,
  getCustomer,
  createOrRetrieveCustomer,
};

