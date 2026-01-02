# How to Find Your Stripe Price IDs

This guide helps you find the Stripe Price IDs needed for backend configuration.

---

## 📋 What You Need

Your backend needs **4 Price IDs**:

1. `STRIPE_PRICE_PERSONAL` - Local Password Vault Personal Plan
2. `STRIPE_PRICE_FAMILY` - Local Password Vault Family Plan  
3. `STRIPE_PRICE_LLV_PERSONAL` - Local Legacy Vault Personal Plan
4. `STRIPE_PRICE_LLV_FAMILY` - Local Legacy Vault Family Plan (you have payment link for this one)

**Format:** All Price IDs start with `price_` (e.g., `price_1ABC123xyz...`)

---

## 🔍 Step-by-Step Instructions

### Method 1: From Stripe Dashboard (Recommended)

1. **Log in to Stripe Dashboard**
   - Go to: https://dashboard.stripe.com/
   - Make sure you're in the correct mode (Live or Test)

2. **Navigate to Products**
   - Click **"Products"** in the left sidebar
   - Or go directly to: https://dashboard.stripe.com/products

3. **Find Your Product**
   - Look for your product (e.g., "Local Legacy Vault Family Plan")
   - Click on the product name to open it

4. **Get the Price ID**
   - Scroll down to the **"Pricing"** section
   - You'll see your price(s) listed
   - Next to each price, you'll see a **Price ID** starting with `price_`
   - Click the **copy icon** (📋) next to the Price ID to copy it
   - The Price ID looks like: `price_1ABC123xyz789...`

5. **Repeat for All 4 Products**
   - Do this for all 4 products:
     - Local Password Vault → Personal Plan
     - Local Password Vault → Family Plan
     - Local Legacy Vault → Personal Plan
     - Local Legacy Vault → Family Plan

---

### Method 2: From Payment Link (Alternative)

If you have a payment link but need to find the Price ID:

1. **Go to Payment Links**
   - Stripe Dashboard → **"Payment links"** in left sidebar
   - Or: https://dashboard.stripe.com/payment-links

2. **Find Your Payment Link**
   - Look for the payment link URL (e.g., `buy.stripe.com/9B66oH22LflTfOx18p4ZG0n`)
   - Click on the payment link

3. **View Payment Link Details**
   - Click on the payment link to open details
   - Look for the **"Product"** or **"Price"** section
   - The Price ID will be listed there

**Note:** Payment links can use either:
- A specific Price ID (what we need)
- Or custom pricing (which won't work with backend)

If it's custom pricing, you'll need to create a proper Price in Stripe first.

---

## ✅ Verify You Have the Right Price IDs

After collecting all 4 Price IDs, verify:

- [ ] All 4 Price IDs start with `price_`
- [ ] All 4 Price IDs are from the same Stripe mode (all Live OR all Test)
- [ ] Each Price ID corresponds to the correct product:
  - `STRIPE_PRICE_PERSONAL` → LPV Personal
  - `STRIPE_PRICE_FAMILY` → LPV Family
  - `STRIPE_PRICE_LLV_PERSONAL` → LLV Personal
  - `STRIPE_PRICE_LLV_FAMILY` → LLV Family

---

## 📝 Quick Reference: Expected Products

Based on your setup, you should have these products in Stripe:

| Product Name | Plan Type | Price ID Variable |
|--------------|-----------|-------------------|
| Local Password Vault | Personal | `STRIPE_PRICE_PERSONAL` |
| Local Password Vault | Family | `STRIPE_PRICE_FAMILY` |
| Local Legacy Vault | Personal | `STRIPE_PRICE_LLV_PERSONAL` |
| Local Legacy Vault | Family | `STRIPE_PRICE_LLV_FAMILY` |

---

## 🚨 Important Notes

### Live vs Test Mode

- **Test Mode:** Price IDs start with `price_` but are for testing
- **Live Mode:** Price IDs start with `price_` and are for real payments
- **Important:** Use the same mode (Live or Test) for all 4 Price IDs

### One-Time vs Recurring

- Your products should be **one-time payments** (not subscriptions)
- The backend expects one-time payment Price IDs

### Multiple Prices Per Product

- If a product has multiple prices (e.g., different currencies, different amounts)
- Use the price that matches your payment link
- Usually, you'll have one active price per product

---

## 🔧 Adding Price IDs to Backend

Once you have all 4 Price IDs, add them to `backend/.env`:

```env
STRIPE_PRICE_PERSONAL=price_1ABC123...
STRIPE_PRICE_FAMILY=price_1XYZ789...
STRIPE_PRICE_LLV_PERSONAL=price_1DEF456...
STRIPE_PRICE_LLV_FAMILY=price_1GHI012...
```

Replace the `...` with your actual full Price IDs.

---

## 🆘 Troubleshooting

### "Can't find Price ID in Payment Link"

If your payment link doesn't show a Price ID:
1. The payment link might be using custom pricing
2. Create a proper Price in Stripe Dashboard first
3. Then create a new payment link using that Price

### "Price ID doesn't start with price_"

- Make sure you're copying the **Price ID**, not the Product ID
- Product IDs start with `prod_`
- Price IDs start with `price_`
- We need Price IDs, not Product IDs

### "Backend says Price ID is unknown"

- Verify the Price ID is correct (copy-paste to avoid typos)
- Verify you're using Price IDs from the same Stripe mode (all Live or all Test)
- Check the Price is active (not archived) in Stripe Dashboard

---

## 📞 Need Help?

If you can't find a Price ID:
1. Check Stripe Dashboard → Products → [Your Product] → Pricing
2. Look for the active price (usually the only one)
3. The Price ID is next to the price amount
4. Copy the entire Price ID (it's quite long, starting with `price_`)

---

**Last Updated:** 2025
**Version:** 1.0.0
