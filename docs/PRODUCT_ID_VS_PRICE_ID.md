# Product ID vs Price ID - Important Distinction

## 🔑 Key Difference

**Product ID** (`prod_...`)
- Identifies the **product** (e.g., "Local Legacy Vault Personal Plan")
- Starts with `prod_`
- Example: `prod_TgopWLAAjzQ1Z3`

**Price ID** (`price_...`)
- Identifies a specific **price** for that product
- Starts with `price_`
- Example: `price_1ABC123xyz789...`
- **This is what the backend needs!**

## 📊 Why We Need Price IDs

A single product can have multiple prices:
- Different currencies (USD, EUR, etc.)
- Different amounts
- Different billing intervals (one-time, monthly, yearly)
- Different tiers or variants

The backend needs to know **which specific price** was purchased to:
- Generate the correct license
- Match the price to the right product type
- Process payments correctly

## 🔍 How to Find Price ID from Product ID

You have: `prod_TgopWLAAjzQ1Z3` (Local Legacy Vault Personal Plan)

**Steps:**

1. **Go to Stripe Dashboard**
   - https://dashboard.stripe.com/products

2. **Find Your Product**
   - Look for "Local Legacy Vault Personal Plan"
   - Or search for the Product ID: `prod_TgopWLAAjzQ1Z3`
   - Click on the product name

3. **View Pricing Section**
   - Scroll down to the **"Pricing"** section
   - You'll see one or more prices listed

4. **Copy the Price ID**
   - Look for the Price ID (starts with `price_`)
   - Click the **copy icon** (📋) next to it
   - Copy the entire Price ID (it's quite long)

5. **Verify It's Active**
   - Make sure the price is **active** (not archived)
   - Usually, there's one active price per product

## ✅ What You Need for Backend

For each product, provide:

| Product | Product ID (you have) | Price ID (needed) |
|---------|----------------------|-------------------|
| LLV Personal | `prod_TgopWLAAjzQ1Z3` | `price_??????` ⬅️ **Need this** |
| LLV Family | `prod_??????` | `price_??????` |
| LPV Personal | `prod_??????` | `price_??????` |
| LPV Family | `prod_??????` | `price_??????` |

## 🚨 Common Mistake

❌ **Wrong:** Using Product ID in `.env`
```env
STRIPE_PRICE_LLV_PERSONAL=prod_TgopWLAAjzQ1Z3  # ❌ This won't work!
```

✅ **Correct:** Using Price ID in `.env`
```env
STRIPE_PRICE_LLV_PERSONAL=price_1ABC123xyz789...  # ✅ This is correct!
```

## 📝 Quick Reference

- **Product ID** = What you're selling (the product itself)
- **Price ID** = How much and how it's priced (the pricing option)
- **Backend needs** = Price IDs (not Product IDs)

---

**Need help finding it?** The Price ID is always visible in the product's Pricing section in Stripe Dashboard.
