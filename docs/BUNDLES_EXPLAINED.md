# How Bundles Work - No Additional Price IDs Needed!

## ✅ Good News: Bundles Use Your Existing Price IDs

Bundles **don't require separate Price IDs**. The bundle system automatically combines your existing individual product Price IDs.

---

## 🔧 How Bundles Work

### Bundle System Architecture

1. **Uses Existing Price IDs**
   - Bundles combine 2+ products into a single checkout
   - Each product uses its existing Price ID (the 4 you already configured)
   - Example: Personal Bundle uses `STRIPE_PRICE_PERSONAL` + `STRIPE_PRICE_LLV_PERSONAL`

2. **Automatic Discount Calculation**
   - System automatically applies 13.94% discount to bundles
   - Discount is added as a negative line item in Stripe checkout
   - No separate bundle Price IDs needed

3. **Backend Processing**
   - Bundle checkout creates a Stripe session with multiple line items
   - Each line item uses one of your 4 Price IDs
   - Discount is applied automatically as a separate line item

---

## 📦 Available Bundle Types

The system supports 4 bundle combinations:

| Bundle Name | Products Included | Uses These Price IDs |
|------------|-------------------|---------------------|
| **Personal Bundle** | LPV Personal + LLV Personal | `STRIPE_PRICE_PERSONAL` + `STRIPE_PRICE_LLV_PERSONAL` |
| **Family Protection Bundle** | LPV Family + LLV Family | `STRIPE_PRICE_FAMILY` + `STRIPE_PRICE_LLV_FAMILY` |
| **Mixed Bundle (Type 1)** | LPV Personal + LLV Family | `STRIPE_PRICE_PERSONAL` + `STRIPE_PRICE_LLV_FAMILY` |
| **Mixed Bundle (Type 2)** | LPV Family + LLV Personal | `STRIPE_PRICE_FAMILY` + `STRIPE_PRICE_LLV_PERSONAL` |

---

## 💰 Bundle Pricing Example

**Personal Bundle (LPV Personal + LLV Personal):**
- LPV Personal: $49 (uses `STRIPE_PRICE_PERSONAL`)
- LLV Personal: $49 (uses `STRIPE_PRICE_LLV_PERSONAL`)
- Subtotal: $98
- Bundle Discount (13.94%): -$13.66
- **Final Price: $84.34**

The discount is automatically calculated and applied by the backend.

---

## 🔌 API Endpoint

Bundles use a separate endpoint but use the same Price IDs:

**Endpoint:** `POST /api/checkout/bundle`

**Request Body:**
```json
{
  "items": [
    { "productKey": "personal", "quantity": 1 },
    { "productKey": "llv_personal", "quantity": 1 }
  ],
  "email": "customer@example.com"
}
```

**Product Keys:**
- `"personal"` → Uses `STRIPE_PRICE_PERSONAL`
- `"family"` → Uses `STRIPE_PRICE_FAMILY`
- `"llv_personal"` → Uses `STRIPE_PRICE_LLV_PERSONAL`
- `"llv_family"` → Uses `STRIPE_PRICE_LLV_FAMILY`

---

## ✅ What You Already Have

Since you've configured all 4 Price IDs:
- ✅ `STRIPE_PRICE_PERSONAL`
- ✅ `STRIPE_PRICE_FAMILY`
- ✅ `STRIPE_PRICE_LLV_PERSONAL`
- ✅ `STRIPE_PRICE_LLV_FAMILY`

**Bundles are already fully configured!** 🎉

No additional Price IDs needed. The bundle system will work automatically.

---

## 🔍 How It Works Behind the Scenes

1. **Bundle Checkout Request**
   - Frontend sends bundle items: `[{productKey: "personal"}, {productKey: "llv_personal"}]`

2. **Backend Processing** (`createBundleCheckoutSession`)
   - Looks up Price IDs from `PRODUCTS` object (which uses your `.env` variables)
   - Creates Stripe checkout session with multiple line items
   - Each line item uses the corresponding Price ID
   - Calculates 13.94% discount
   - Adds discount as negative line item

3. **Stripe Checkout**
   - Customer sees both products in checkout
   - Discount is automatically applied
   - Payment processes normally

4. **Webhook Processing**
   - Stripe sends `checkout.session.completed` event
   - Backend processes each line item separately
   - Generates license keys for each product
   - Sends email with all license keys

---

## 🎯 Summary

**✅ You're all set!** Your 4 Price IDs support:
- ✅ Individual product purchases
- ✅ All 4 bundle combinations
- ✅ Automatic discount calculation
- ✅ Proper license generation

**No additional configuration needed for bundles!**

---

**Last Updated:** 2025
**Version:** 1.0.0
