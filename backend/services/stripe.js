const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

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
  llv_personal: {
    name: 'Local Legacy Vault - Personal',
    description: 'Lifetime license for 1 device',
    price: 4900,
    priceId: process.env.STRIPE_PRICE_LLV_PERSONAL,
    maxDevices: 1,
    productType: 'llv',
  },
  llv_family: {
    name: 'Local Legacy Vault - Family',
    description: 'Lifetime license for up to 5 devices',
    price: 12900,
    priceId: process.env.STRIPE_PRICE_LLV_FAMILY,
    maxDevices: 5,
    productType: 'llv',
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
  
  if (!product.priceId) {
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

async function getCheckoutSession(sessionId) {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['customer', 'payment_intent'],
  });
}

function verifyWebhookSignature(payload, signature) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }
  
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

async function getCustomer(customerId) {
  return stripe.customers.retrieve(customerId);
}

async function createOrRetrieveCustomer(email, name = null) {
  const existingCustomers = await stripe.customers.list({
    email: email,
    limit: 1,
  });
  
  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }
  
  return stripe.customers.create({
    email: email,
    name: name,
  });
}

async function createBundleCheckoutSession(items, customerEmail, successUrl, cancelUrl) {
  const lineItems = items.map(({ productKey, quantity = 1 }) => {
    const product = PRODUCTS[productKey];
    if (!product) {
      throw new Error(`Invalid product key: ${productKey}`);
    }
    
    // Fallback to price_data if Stripe price ID not configured
    if (!product.priceId) {
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
    
    return {
      price: product.priceId,
      quantity: quantity,
    };
  });
  
  // Apply 13.94% bundle discount
  let discountAmount = 0;
  if (items.length > 1) {
    const totalPrice = items.reduce((sum, item) => {
      const product = PRODUCTS[item.productKey];
      return sum + (product.price * (item.quantity || 1));
    }, 0);
    discountAmount = Math.round(totalPrice * 0.1394);
  }
  
  const sessionConfig = {
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: customerEmail,
    line_items: lineItems,
    metadata: {
      is_bundle: 'true',
      bundle_discount: discountAmount.toString(),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  };
  
  if (discountAmount > 0) {
    sessionConfig.line_items.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Bundle Discount',
          description: 'Bundle Savings',
        },
        unit_amount: -discountAmount,
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

