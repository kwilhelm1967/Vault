# Activation & First User Guide

**Version:** 1.0.0  
**Last Updated:** January 2025  
**Purpose:** Clear, actionable steps to activate the system and get the first paying customer

---

## 📋 Overview

This document outlines exactly what needs to be done to:
1. **Activate the system** - Get everything running in production
2. **Get the first user** - Complete the purchase flow end-to-end

---

## 🎯 What's Left to Do

### Phase 1: Infrastructure Activation (Required)

**Estimated Time:** 2-4 hours

#### 1.1 Backend Deployment
- [ ] **Deploy backend to production server**
  - [ ] SSH into Linode server
  - [ ] Clone/upload backend code
  - [ ] Install dependencies: `npm install`
  - [ ] Create `.env` file with all required variables
  - [ ] Start with PM2: `pm2 start server.js --name lpv-api`
  - [ ] Enable auto-start: `pm2 startup` and `pm2 save`

- [ ] **Configure Nginx reverse proxy**
  - [ ] Set up SSL certificate (Let's Encrypt)
  - [ ] Configure domain (api.localpasswordvault.com)
  - [ ] Test health endpoint: `curl https://api.localpasswordvault.com/health`

**Files Needed:**
- `backend/.env` - Environment variables (see `backend/env.example`)
- `backend/server.js` - Main server file
- Nginx configuration file

**Reference:** `docs/PRODUCTION_LAUNCH_GUIDE.md` - Step 2

---

#### 1.2 Database Setup
- [ ] **Supabase Configuration**
  - [ ] Verify Supabase project exists
  - [ ] Run database schema: `backend/database/schema.sql`
  - [ ] Get connection details (URL and Service Role Key)
  - [ ] Test connection from backend server

**Files Needed:**
- `backend/database/schema.sql` - Database schema
- Supabase project URL and Service Role Key

**Reference:** `docs/PRODUCTION_LAUNCH_GUIDE.md` - Step 1

---

#### 1.3 Environment Variables
- [ ] **Create `.env` file on server with:**
  ```env
  NODE_ENV=production
  PORT=3001
  
  # License Signing (REQUIRED - generate: openssl rand -hex 32)
  LICENSE_SIGNING_SECRET=your-64-character-hex-secret-here
  
  # Supabase
  SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
  SUPABASE_SERVICE_KEY=eyJhbGc...YOUR-SERVICE-ROLE-KEY
  
  # Stripe (LIVE keys, not test)
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_PUBLISHABLE_KEY=pk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  
  # Brevo Email
  BREVO_API_KEY=your-brevo-api-key
  FROM_EMAIL=noreply@localpasswordvault.com
  SUPPORT_EMAIL=support@localpasswordvault.com
  
  # URLs
  WEBSITE_URL=https://localpasswordvault.com
  API_URL=https://api.localpasswordvault.com
  ```

**Critical:** Generate `LICENSE_SIGNING_SECRET`:
```bash
openssl rand -hex 32
```

**Reference:** `backend/env.example` for complete list

---

### Phase 2: Payment & Email Setup (Required)

**Estimated Time:** 1-2 hours

#### 2.1 Stripe Configuration
- [ ] **Create Stripe Products (if not done)**
  - [ ] Personal Vault ($49) - Get Price ID
  - [ ] Family Vault ($79) - Get Price ID
  - [ ] LLV Personal ($49) - Get Price ID
  - [ ] LLV Family ($129) - Get Price ID

- [ ] **Configure Stripe Webhook**
  - [ ] Add webhook endpoint: `https://api.localpasswordvault.com/api/webhooks/stripe`
  - [ ] Select events: `checkout.session.completed`
  - [ ] Copy webhook signing secret to `.env`
  - [ ] Test webhook (send test event from Stripe dashboard)

- [ ] **Switch to Live Mode**
  - [ ] Replace test keys with live keys in `.env`
  - [ ] Update frontend environment with live publishable key

**Reference:** `docs/PRODUCTION_LAUNCH_GUIDE.md` - Step 3

---

#### 2.2 Email Service (Brevo)
- [ ] **Brevo Account Setup**
  - [ ] Create/verify Brevo account
  - [ ] Generate API key with "Send emails" permission
  - [ ] Verify sender email address
  - [ ] Add API key to backend `.env`
  - [ ] Test email sending

**Reference:** `docs/PRODUCTION_LAUNCH_GUIDE.md` - Step 4

---

### Phase 3: Application Builds (Required)

**Estimated Time:** 2-3 hours

#### 3.1 Build Applications
- [ ] **Windows Build**
  - [ ] Run: `npm run dist:win`
  - [ ] Test installer on clean Windows machine
  - [ ] (Optional) Code sign installer

- [ ] **macOS Build**
  - [ ] Run: `npm run dist:mac`
  - [ ] Test DMG on clean macOS machine
  - [ ] (Optional) Code sign and notarize

- [ ] **Linux Build**
  - [ ] Run: `npm run dist:linux`
  - [ ] Test AppImage on clean Linux machine

**Reference:** `docs/PRODUCTION_LAUNCH_GUIDE.md` - Step 5

---

#### 3.2 Create Download Packages
- [ ] **Package Contents for Each Platform:**
  - [ ] Installer file (`.exe`, `.dmg`, or `.AppImage`)
  - [ ] `README.txt`
  - [ ] `User Manual.pdf` (if generated)
  - [ ] `Quick Start Guide.pdf` (if generated)
  - [ ] `Privacy Policy.pdf` (if generated)
  - [ ] `Terms of Service.pdf` (if generated)

- [ ] **Create ZIP Files:**
  - [ ] Windows ZIP package
  - [ ] macOS ZIP package
  - [ ] Linux ZIP package

- [ ] **Host Packages:**
  - [ ] Upload to GitHub Releases (or alternative hosting)
  - [ ] Get download URLs
  - [ ] Update email templates with download URLs

**Reference:** `docs/PRODUCTION_LAUNCH_GUIDE.md` - Step 6

---

### Phase 4: Testing & Verification (Required)

**Estimated Time:** 2-3 hours

#### 4.1 End-to-End Purchase Test
- [ ] **Test Single Purchase:**
  1. [ ] Go to pricing page
  2. [ ] Click "Buy Now" for Personal Vault
  3. [ ] Complete Stripe checkout (use test card or real card)
  4. [ ] Verify webhook received and processed
  5. [ ] Verify license key generated in database
  6. [ ] Verify email received with license key
  7. [ ] Verify email contains correct download links
  8. [ ] Download and install application
  9. [ ] Enter license key in app
  10. [ ] Verify activation successful
  11. [ ] Disconnect internet
  12. [ ] Verify app works offline

- [ ] **Test Bundle Purchase:**
  1. [ ] Purchase bundle (2 products)
  2. [ ] Verify multiple license keys in email
  3. [ ] Verify success page shows all keys
  4. [ ] Activate first key
  5. [ ] Activate second key (different device or same device)
  6. [ ] Verify both keys work independently

- [ ] **Test Trial Flow:**
  1. [ ] Sign up for trial on website
  2. [ ] Verify trial key received in email
  3. [ ] Activate trial key in app
  4. [ ] Verify trial works
  5. [ ] Verify trial expiration detected offline

**Reference:** `docs/PRODUCTION_LAUNCH_GUIDE.md` - Step 7

---

#### 4.2 Error Scenarios Testing
- [ ] **Test Error Handling:**
  - [ ] Invalid license key format
  - [ ] Non-existent license key
  - [ ] Network failure during activation
  - [ ] Device mismatch (transfer required)
  - [ ] Transfer limit reached

**Reference:** `docs/DEVELOPER_HANDOFF.md` - Task 1

---

### Phase 5: Optional Enhancements (Nice to Have)

**Estimated Time:** 4-8 hours (optional)

#### 5.1 Implementation Tasks (From DEVELOPER_HANDOFF.md)
- [ ] **Task 4.1:** Concurrent activation prevention
- [ ] **Task 4.2:** Retry button for network errors
- [ ] **Task 4.3:** Device mismatch check on app startup
- [ ] **Task 4.4:** Improve loading state management
- [ ] **Task 4.5:** License file storage error handling

**Note:** These are optional improvements. The system works without them, but they improve user experience.

**Reference:** `docs/DEVELOPER_HANDOFF.md` - Task 4

---

#### 5.2 Code Signing (Optional but Recommended)
- [ ] **Windows Code Signing:**
  - [ ] Obtain code signing certificate (SSL.com or similar)
  - [ ] Configure signing in build process
  - [ ] Sign installer

- [ ] **macOS Code Signing:**
  - [ ] Apple Developer account ($99/year)
  - [ ] Configure signing in build process
  - [ ] Sign and notarize DMG

**Reference:** `docs/PRODUCTION_LAUNCH_GUIDE.md` - Step 8

---

## 🚀 Quick Start: Get First User in 24 Hours

### Minimum Viable Setup (Fastest Path)

**If you need to get the first user quickly, focus on these essentials:**

1. **Backend Deployment (2 hours)**
   - Deploy backend to server
   - Set up `.env` with all required variables
   - Start with PM2
   - Configure Nginx and SSL

2. **Stripe & Email (1 hour)**
   - Configure Stripe webhook
   - Set up Brevo email
   - Test one purchase end-to-end

3. **Build & Package (1 hour)**
   - Build one platform (Windows recommended)
   - Create simple ZIP with installer
   - Host on GitHub Releases or simple hosting

4. **Test Purchase (30 minutes)**
   - Make test purchase
   - Verify email received
   - Test activation

**Total Time:** ~4.5 hours for minimum viable setup

---

## 📋 Pre-Launch Checklist

Use this checklist before accepting first real customer:

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

### Documentation
- [ ] User documentation included in packages (optional but recommended)
- [ ] Support email address configured
- [ ] Website links working

---

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue:** Webhook not receiving events
- **Solution:** Verify webhook URL is accessible, check Stripe dashboard for webhook status

**Issue:** License key not generated
- **Solution:** Check backend logs, verify database connection, check webhook processing

**Issue:** Email not received
- **Solution:** Check Brevo dashboard, verify API key, check spam folder

**Issue:** Activation fails
- **Solution:** Check backend logs, verify `LICENSE_SIGNING_SECRET` is set, check device fingerprint generation

### Getting Help

- **Backend Issues:** Check `backend/README.md` and `docs/BACKEND_SETUP_GUIDE.md`
- **Deployment Issues:** Check `docs/PRODUCTION_LAUNCH_GUIDE.md`
- **Testing Issues:** Check `docs/DEVELOPER_HANDOFF.md` - Task 1
- **Code Issues:** Check `docs/DEVELOPER_HANDOFF.md` for implementation details

---

## 📝 Next Steps After First User

Once you have the first paying customer:

1. **Monitor closely** - Watch logs, Stripe dashboard, email delivery
2. **Verify everything works** - Confirm activation, offline operation
3. **Gather feedback** - Ask user about experience
4. **Fix any issues** - Address problems immediately
5. **Scale gradually** - Add more platforms, improve documentation

---

## 📚 Reference Documents

- **`docs/PRODUCTION_LAUNCH_GUIDE.md`** - Complete production setup guide
- **`docs/PRODUCTION_CHECKLIST.md`** - Detailed production checklist
- **`docs/DEVELOPER_HANDOFF.md`** - Technical implementation details
- **`backend/README.md`** - Backend API documentation
- **`backend/env.example`** - Environment variables reference

---

**Last Updated:** January 2025

