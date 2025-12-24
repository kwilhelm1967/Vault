# Offline Operation & Purchasing Flow - Clarification

## ✅ YES: Minimal Internet Calls & 100% Offline

**Local Password Vault is designed to make ONLY 2 possible internet calls:**

### 1. License Activation (ONE TIME)
- **When:** User enters license key for the first time
- **Endpoint:** `POST /api/lpv/license/activate`
- **Data Sent:** License key + device fingerprint (SHA-256 hash)
- **Data Received:** JWT token for offline validation
- **Frequency:** Once per license activation

### 2. License Transfer (ONLY when transferring to new device)
- **When:** User moves license to a different computer
- **Endpoint:** `POST /api/lpv/license/transfer`
- **Data Sent:** License key + new device fingerprint
- **Frequency:** Only when transferring devices (limited to 3 transfers/year)

### After Activation: 100% Offline

Once activated, the app:
- ✅ **Works completely offline** - No internet required
- ✅ **Validates license locally** - Uses JWT token stored on device
- ✅ **No periodic checks** - No background validation calls
- ✅ **No update checks** - App never checks for updates automatically
- ✅ **No analytics** - Analytics service is NO-OP (does nothing)
- ✅ **No telemetry** - Zero data collection
- ✅ **No cloud sync** - All data stored locally

---

## ❌ NO: Purchasing is NOT in the App

**Package purchasing happens on the WEBSITE, not in the app.**

### Purchasing Flow:

1. **User visits website:** `https://localpasswordvault.com/#plans`
   - Can access from app via "Buy Now" button (opens external browser)
   - Or user goes directly to website

2. **User selects plan:**
   - Personal Vault: $49 (1 device)
   - Family Vault: $79 (5 devices)

3. **Stripe Checkout:**
   - Payment processed on Stripe's secure checkout page
   - User enters payment details
   - Payment completed

4. **Backend generates license key:**
   - Stripe webhook triggers backend
   - License key generated instantly
   - Email sent via Brevo with license key

5. **User receives email:**
   - License key in email
   - Download links for app

6. **User activates in app:**
   - Opens app
   - Enters license key
   - **ONE internet call** to activate
   - App works offline forever after

### Why Purchasing is on Website:

- ✅ **Better UX** - Stripe checkout is optimized for payments
- ✅ **Security** - Payment processing handled by Stripe (PCI compliant)
- ✅ **No app bloat** - App stays lightweight and focused
- ✅ **Offline-first** - App doesn't need payment processing code
- ✅ **Standard practice** - Most software works this way

---

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PURCHASING FLOW                         │
└─────────────────────────────────────────────────────────────┘

1. User clicks "Buy Now" in app
   ↓
2. Opens browser → https://localpasswordvault.com/#plans
   ↓
3. User selects plan (Personal $49 or Family $79)
   ↓
4. Stripe Checkout (on Stripe's secure page)
   ↓
5. Payment completed
   ↓
6. Stripe webhook → Backend API
   ↓
7. Backend generates license key
   ↓
8. Brevo sends email with license key
   ↓
9. User receives email
   ↓
10. User opens app and enters license key
    ↓
11. App makes ONE internet call: POST /api/lpv/license/activate
    ↓
12. App receives JWT token
    ↓
13. App saves license locally
    ↓
14. ✅ App works 100% OFFLINE forever
```

---

## 🔒 Security & Privacy Guarantees

### What Data is Transmitted:

**During License Activation:**
- License key (e.g., `LPV4-XXXX-XXXX-XXXX-XXXX`)
- Device fingerprint (SHA-256 hash of hardware info)
- **NO passwords**
- **NO vault data**
- **NO personal information**

**During License Transfer:**
- License key
- New device fingerprint
- **NO passwords**
- **NO vault data**

### What is NOT Transmitted:

- ❌ Passwords
- ❌ Vault data
- ❌ User accounts
- ❌ Personal information
- ❌ Analytics data
- ❌ Telemetry
- ❌ Usage statistics
- ❌ Device information (beyond fingerprint hash)

---

## 📱 App Features That Work Offline

After activation, ALL features work offline:

- ✅ **Password storage** - All passwords stored locally
- ✅ **Password generation** - Works offline
- ✅ **Search & filter** - Works offline
- ✅ **Categories** - Works offline
- ✅ **Secure notes** - Works offline
- ✅ **2FA/TOTP codes** - Generated locally
- ✅ **Password history** - Stored locally
- ✅ **Export/Import** - Works offline
- ✅ **Floating panel** - Works offline
- ✅ **Auto-lock** - Works offline
- ✅ **Password strength meter** - Works offline

**The ONLY thing that requires internet:**
- Initial license activation (one-time)
- License transfer (only when moving to new device)

---

## 🎯 Summary

### Internet Calls:
- ✅ **Minimal:** Only 2 possible calls (activation + transfer)
- ✅ **One-time:** Activation happens once per license
- ✅ **Optional:** Transfer only when moving to new device

### Offline Operation:
- ✅ **100% offline** after activation
- ✅ **No periodic checks**
- ✅ **No background sync**
- ✅ **No update checks**
- ✅ **No analytics**

### Purchasing:
- ❌ **NOT in app** - Happens on website
- ✅ **Website:** https://localpasswordvault.com/#plans
- ✅ **Stripe checkout** - Secure payment processing
- ✅ **Email delivery** - License key sent via email
- ✅ **App activation** - User enters key in app (one internet call)

---

## 📝 For Developers

If you're implementing the backend, understand:

1. **Purchasing happens on website** - Not your concern
2. **Your job:** Generate license keys after Stripe payment
3. **Your job:** Validate license keys when app activates
4. **That's it!** Simple and focused.

The app is designed to be **offline-first** - the backend is just a license key generator and validator. No complex features needed.

