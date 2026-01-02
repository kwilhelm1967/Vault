# How to Get Your Stripe Secret Key

## 🔍 If You Can't See the Full Key

Stripe masks secret keys for security. Here are ways to get the full key:

---

## Method 1: Click the Key Entry

1. **Click directly on the key entry** (the row showing `sk_live_...sCr7`)
2. This might open a modal or expand the row
3. Look for a **copy icon** (📋) or **"Copy"** button
4. The full key might be revealed when you click

---

## Method 2: Check for Copy Button

1. **Hover over the key entry** - sometimes a copy icon appears
2. **Right-click** on the key value - might show "Copy" option
3. **Look for a clipboard icon** next to the masked key

---

## Method 3: Create a New Secret Key (Recommended)

If you can't reveal the existing key, create a new one:

1. **Go to:** https://dashboard.stripe.com/apikeys
2. **Click "Create secret key"** or **"Add secret key"**
3. **Give it a name:** e.g., "Backend API" or "Local Password Vault"
4. **Click "Create"**
5. **Copy the key immediately** - Stripe will show it once, then mask it
6. **Save it securely** - you won't be able to see it again!

**Important:** After creating, copy it immediately - you only see it once!

---

## Method 4: Check Your Records

- Check your password manager (if you saved it)
- Check your `.env` files or configuration files
- Check your notes/documentation
- Check with your team if you have one

---

## Method 5: Use Test Key First (For Development)

If you're setting up for development/testing:

1. **Toggle to Test Mode** in Stripe Dashboard (top right)
2. **Go to API Keys** in test mode
3. **Create or reveal test secret key** (`sk_test_...`)
4. **Use test key for now** - you can switch to live key later

---

## ✅ Once You Have the Key

The full key will look like:
```
sk_live_51ABC123xyz789...verylongstring...sCr7
```

It's typically **100+ characters long** and starts with `sk_live_` or `sk_test_`.

---

## 🚨 Security Note

- **Never share secret keys publicly**
- **Never commit them to git**
- **Store them securely** (password manager, secure notes)
- **Rotate them** if you think they might be compromised

---

## 📞 Still Can't Find It?

If none of these methods work:
1. **Create a new secret key** (Method 3)** - This is the easiest solution
2. **Contact Stripe support** if you need help accessing your account
3. **Use test mode** for now and switch to live later

---

**Last Updated:** 2025
