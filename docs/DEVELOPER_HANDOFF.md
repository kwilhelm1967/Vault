# Developer Handoff: Deployment & Activation

## Overview

This document outlines exactly what needs to be done to deploy the current system and get it ready for users. All core features are complete - this focuses on deployment, configuration, and verification.

**Key Architecture:** The system uses **signed license files** (HMAC-SHA256) for offline validation. When a license is activated or transferred, the backend returns a signed license file that is stored locally and validated offline without any network calls.

---

## ✅ What's Already Complete

### Backend (100% Complete)
- License key generation (all product types)
- Stripe integration (single and bundle purchases)
- Database schema (Supabase PostgreSQL)
- API endpoints (activation, transfer, status, trial)
- Signed license file generation (HMAC-SHA256)
- Email service integration (Brevo)
- Webhook handling for purchases

### Frontend (100% Complete)
- Device fingerprint generation
- License service (activation, transfer, validation)
- UI components (activation screen, transfer dialog, error handling)
- Device management screen (100% offline)
- Bundle purchase handling (fetches all keys from session)
- License status dashboard
- Trial activation and expiration handling
- 100% offline operation after activation

**Key Files:**
- `backend/routes/lpv-licenses.js` - Activation endpoints
- `backend/services/licenseSigner.js` - HMAC-SHA256 signing
- `src/utils/licenseService.ts` - License logic
- `src/utils/licenseValidator.ts` - Offline validation
- `src/components/LicenseScreen.tsx` - Activation UI
- `src/components/PurchaseSuccessPage.tsx` - Bundle purchase handling

---

## 🎯 What's Left to Do

**⚠️ IMPORTANT: See `docs/ACTIVATION_AND_FIRST_USER.md` for complete step-by-step deployment guide.**

This section lists the specific tasks that must be completed to deploy the system.

---

## Phase 1: Backend Deployment

### 1.1 Deploy Backend to Server

**Required Steps:**
1. SSH into production server (Linode/VPS)
2. Clone or upload backend code to `/var/www/lpv-api`
3. Install dependencies: `npm install`
4. Create `.env` file with all required variables (see `backend/env.example`)
5. Start with PM2: `pm2 start server.js --name lpv-api`
6. Enable auto-start: `pm2 startup` and `pm2 save`

**Required Environment Variables:**
```env
NODE_ENV=production
PORT=3001
LICENSE_SIGNING_SECRET=<64-character-hex-string>
SUPABASE_URL=<supabase-project-url>
SUPABASE_SERVICE_KEY=<service-role-key>
STRIPE_SECRET_KEY=<live-key>
STRIPE_PUBLISHABLE_KEY=<live-key>
STRIPE_WEBHOOK_SECRET=<webhook-secret>
BREVO_API_KEY=<brevo-api-key>
FROM_EMAIL=<sender-email>
SUPPORT_EMAIL=<support-email>
WEBSITE_URL=<website-url>
API_URL=<api-url>
```

**Generate LICENSE_SIGNING_SECRET:**
```bash
openssl rand -hex 32
```

**Files Needed:**
- `backend/server.js`
- `backend/.env` (create from `backend/env.example`)
- PM2 configuration

**Reference:** `docs/PRODUCTION_LAUNCH_GUIDE.md` - Step 2

---

### 1.2 Configure Nginx & SSL

**Required Steps:**
1. Install Nginx (if not installed)
2. Configure SSL certificate (Let's Encrypt)
3. Set up reverse proxy for API domain (api.localpasswordvault.com)
4. Test health endpoint: `curl https://api.localpasswordvault.com/health`

**Files Needed:**
- Nginx configuration file
- SSL certificate files

**Reference:** `docs/PRODUCTION_LAUNCH_GUIDE.md` - Step 2

---

### 1.3 Database Setup

**Required Steps:**
1. Verify Supabase project exists
2. Run database schema: Execute `backend/database/schema.sql` in Supabase SQL Editor
3. Get connection details:
   - Project URL (from Supabase Settings → API)
   - Service Role Key (NOT anon key)
4. Add to backend `.env` file
5. Test connection from backend server

**Files Needed:**
- `backend/database/schema.sql` - Database schema
- Supabase project URL and Service Role Key

**Reference:** `docs/PRODUCTION_LAUNCH_GUIDE.md` - Step 1

---

## Phase 2: Payment & Email Configuration

### 2.1 Stripe Configuration

**Required Steps:**
1. Create Stripe products (if not done):
   - Personal Vault ($49) - Get Price ID
   - Family Vault ($79) - Get Price ID
   - LLV Personal ($49) - Get Price ID
   - LLV Family ($129) - Get Price ID

2. Configure Stripe Webhook:
   - Add endpoint: `https://api.localpasswordvault.com/api/webhooks/stripe`
   - Select event: `checkout.session.completed`
   - Copy webhook signing secret
   - Add to backend `.env` as `STRIPE_WEBHOOK_SECRET`

3. Switch to Live Mode:
   - Replace test keys with live keys in backend `.env`
   - Update frontend environment with live publishable key

4. Test Webhook:
   - Send test event from Stripe dashboard
   - Verify webhook received and processed
   - Check backend logs for webhook processing

**Files to Update:**
- `backend/.env` - Add Stripe live keys and webhook secret
- Frontend environment config - Add Stripe live publishable key

**Reference:** `docs/PRODUCTION_LAUNCH_GUIDE.md` - Step 3

---

### 2.2 Email Service (Brevo)

**Required Steps:**
1. Create/verify Brevo account
2. Generate API key with "Send emails" permission
3. Verify sender email address in Brevo
4. Add API key to backend `.env` as `BREVO_API_KEY`
5. Test email sending

**Files to Update:**
- `backend/.env` - Add `BREVO_API_KEY`, `FROM_EMAIL`, `SUPPORT_EMAIL`

**Reference:** `docs/PRODUCTION_LAUNCH_GUIDE.md` - Step 4

---

## Phase 3: Application Builds

### 3.1 Build Applications

**Required Steps:**

**Windows:**
1. Run: `npm run dist:win`
2. Test installer on clean Windows machine
3. (Optional) Code sign installer if certificate available

**macOS:**
1. Run: `npm run dist:mac`
2. Test DMG on clean macOS machine
3. (Optional) Code sign and notarize if Apple Developer account available

**Linux:**
1. Run: `npm run dist:linux`
2. Test AppImage on clean Linux machine

**Files Generated:**
- Windows: `dist/Local Password Vault Setup X.X.X.exe`
- macOS: `dist/Local Password Vault-X.X.X.dmg`
- Linux: `dist/Local Password Vault-X.X.X.AppImage`

**Reference:** `docs/PRODUCTION_LAUNCH_GUIDE.md` - Step 5

---

### 3.2 Create Download Packages

**Required Steps:**
1. Create ZIP package for each platform containing:
   - Installer file (`.exe`, `.dmg`, or `.AppImage`)
   - `README.txt` (if available)
   - Documentation files (if available)

2. Host packages:
   - Upload to GitHub Releases (or alternative hosting)
   - Get download URLs
   - Update email templates with download URLs

**Files to Update:**
- Email templates in `backend/templates/` - Update download links

**Reference:** `docs/PRODUCTION_LAUNCH_GUIDE.md` - Step 6

---

## Phase 4: Testing & Verification

### 4.1 End-to-End Purchase Test

**Required Test Steps:**

1. **Single Purchase Test:**
   - [ ] Go to pricing page
   - [ ] Click "Buy Now" for Personal Vault
   - [ ] Complete Stripe checkout
   - [ ] Verify webhook received and processed
   - [ ] Verify license key generated in database
   - [ ] Verify email received with license key
   - [ ] Verify email contains correct download links
   - [ ] Download and install application
   - [ ] Enter license key in app
   - [ ] Verify activation successful
   - [ ] Disconnect internet
   - [ ] Verify app works offline

2. **Bundle Purchase Test:**
   - [ ] Purchase bundle (2 products)
   - [ ] Verify multiple license keys in email
   - [ ] Verify success page shows all keys
   - [ ] Activate first key
   - [ ] Activate second key
   - [ ] Verify both keys work independently

3. **Trial Flow Test:**
   - [ ] Sign up for trial on website
   - [ ] Verify trial key received in email
   - [ ] Activate trial key in app
   - [ ] Verify trial works
   - [ ] Verify trial expiration detected offline

**Files to Test:**
- `src/utils/licenseService.ts` - License activation
- `src/utils/licenseValidator.ts` - Offline validation
- `src/components/LicenseScreen.tsx` - Activation UI
- `src/components/PurchaseSuccessPage.tsx` - Bundle handling
- `backend/routes/lpv-licenses.js` - Backend activation endpoint
- `backend/routes/webhooks.js` - Stripe webhook handling

---

### 4.2 Error Scenario Testing

**Required Test Scenarios:**

1. **Invalid License Key:**
   - [ ] Enter invalid format key
   - [ ] Enter non-existent key
   - [ ] Verify appropriate error message shown

2. **Network Failure:**
   - [ ] Disable network connection
   - [ ] Attempt license activation
   - [ ] Verify network error message shown
   - [ ] Re-enable network and verify retry works

3. **Device Transfer:**
   - [ ] Activate license on Device A
   - [ ] Enter same key on Device B
   - [ ] Verify transfer dialog appears
   - [ ] Complete transfer
   - [ ] Verify Device B works after transfer
   - [ ] Verify Device A no longer works

4. **Transfer Limit:**
   - [ ] Perform 3 transfers
   - [ ] Attempt 4th transfer
   - [ ] Verify transfer limit message shown

---

### 4.3 Offline Operation Verification

**Required Verification:**

1. **After Activation:**
   - [ ] Activate license successfully
   - [ ] Disconnect internet completely
   - [ ] Use app for 30+ minutes
   - [ ] Verify zero network requests (check DevTools Network tab)
   - [ ] Verify all app features work offline
   - [ ] Verify license validation works offline

2. **App Restart Offline:**
   - [ ] Activate license
   - [ ] Disconnect internet
   - [ ] Close application completely
   - [ ] Reopen application
   - [ ] Verify app loads without network calls
   - [ ] Verify license validated from local file

**Verification Method:**
- Open browser DevTools → Network tab
- Filter by "Fetch/XHR" or "WS"
- Disconnect internet
- Use app for extended period
- Verify Network tab shows ZERO requests

---

## Phase 5: Pre-Launch Checklist

**Complete before accepting first real customer:**

### Infrastructure
- [ ] Backend API deployed and accessible
- [ ] Health endpoint responds: `curl https://api.localpasswordvault.com/health`
- [ ] SSL certificate valid
- [ ] Database connected and schema executed
- [ ] All environment variables set correctly

### Payment & Email
- [ ] Stripe products created and configured
- [ ] Stripe webhook endpoint active and tested
- [ ] Brevo email service configured and tested
- [ ] Test purchase email received successfully

### Application
- [ ] At least one platform built (Windows recommended)
- [ ] Installer tested on clean machine
- [ ] Download package created and hosted
- [ ] Download URLs working

### Testing
- [ ] End-to-end purchase tested successfully
- [ ] License activation tested successfully
- [ ] Offline operation verified
- [ ] Error scenarios tested

---

## 📝 Architecture Reference

### Current Implementation

**Backend:**
- Supabase (PostgreSQL) for data storage
- Stripe for payments
- Brevo for emails
- HMAC-SHA256 signed license files for offline validation
- License activation endpoints return signed license files

**Frontend:**
- Electron app
- Local signed license file storage and validation
- Device fingerprint for binding
- Offline-first design (zero network calls after activation)
- All validation happens locally using Web Crypto API

### Key Design Principles

1. **Offline-First:** App works 100% offline after activation
2. **Device Binding:** License tied to device fingerprint (SHA-256 hash)
3. **Transfer Support:** 3 transfers per year allowed
4. **Privacy-First:** No user data transmitted, only license key + device hash at activation
5. **Signed Files:** All validation uses HMAC-SHA256 signed license files

### Security Model

- Device fingerprint is SHA-256 hash (one-way, cannot be reversed)
- License files signed with HMAC-SHA256 using backend secret
- License files verified locally using Web Crypto API (no server calls)
- License keys validated against database only at initial activation
- Zero network traffic after activation (100% offline operation)

### Family Plan Model

- Family plan purchase generates 5 separate license keys
- Each key can be activated on 1 device only
- Keys cannot be shared or reused on multiple devices
- Each key behaves like a personal license (single device binding)

---

## 📞 Reference Documents

- **`docs/ACTIVATION_AND_FIRST_USER.md`** - ⭐ **START HERE** - Complete step-by-step deployment guide
- `docs/PRODUCTION_LAUNCH_GUIDE.md` - Detailed production setup guide
- `docs/PRODUCTION_CHECKLIST.md` - Comprehensive production checklist
- `backend/README.md` - API documentation
- `backend/database/schema.sql` - Database structure
- `backend/env.example` - Environment variables reference

---

**Last Updated:** January 2025  
**Status:** Core features complete - Deployment tasks remaining
