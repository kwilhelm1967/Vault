# Backend Completion Guide for Local Password Vault

## For Developers: What You Need to Know & Complete

**Application URL:** https://www.app.localpasswordvault.com/  
**Status:** Backend integrations (Brevo, Stripe, Supabase) are partially configured but need completion

---

## 🎯 What is Local Password Vault?

**Local Password Vault (LPV)** is an **offline-first password manager** application that:

- ✅ **Stores passwords 100% locally** on the user's device (no cloud sync)
- ✅ **Uses AES-256-GCM encryption** - military-grade security
- ✅ **Works completely offline** after initial license activation
- ✅ **Sells lifetime licenses** - Personal Plan ($49) and Family Plan ($79)
- ✅ **Offers bundle discounts** - Family Protection Bundle (LPV + LLV) saves $29
- ✅ **Offers 7-day free trials** before purchase

### Key Business Model:
1. User purchases license via Stripe checkout
2. Backend generates license key **instantly** after payment
3. Email sent with license key via Brevo
4. User downloads app, enters license key (ONE internet call)
5. App validates license and binds to device hardware fingerprint
6. App works **100% offline forever** after activation

---

## 🔧 What the Backend Needs to Do

The backend API serves **ONE primary purpose**: **License Management**

### Core Functions:

1. **License Key Generation & Validation**
   - Generate unique license keys after Stripe payment
   - Validate license keys when users activate the app
   - Bind licenses to device hardware fingerprints
   - Track device activations (1 device for Personal, 5 for Family)

2. **Payment Processing (Stripe)**
   - Receive Stripe webhook events (`checkout.session.completed`)
   - Generate license key immediately after successful payment
   - Store purchase records in database

3. **Email Delivery (Brevo)**
   - Send purchase confirmation emails with license keys
   - Send trial welcome emails
   - Professional HTML email templates included

4. **Trial Management**
   - Create 7-day trial signups
   - Track trial activations
   - Mark trials as "converted" when user purchases

---

## 📊 Current Backend Status

### ✅ What's Already Implemented:

- **Backend Structure**: Express.js server with routes organized
- **Database**: Supabase (PostgreSQL) configured
- **Stripe Integration**: Service file exists (`services/stripe.js`)
- **Brevo Email**: Service file exists (`services/email.js`)
- **License Generator**: Service exists (`services/licenseGenerator.js`)
- **Routes**: All route files exist:
  - `/api/licenses/validate` - License activation
  - `/api/webhooks/stripe` - Payment webhooks
  - `/api/checkout/session` - Create Stripe checkout
  - `/api/trial/signup` - Trial signups

### ❌ What Needs to Be Completed:

1. **Database Connection** - Supabase (configure connection)
2. **Environment Variables** - Configure all API keys
3. **Stripe Webhook Endpoint** - Test and verify webhook handling
4. **Email Templates** - Verify Brevo templates are working
5. **Error Handling** - Add proper error logging and monitoring
6. **Testing** - End-to-end testing of purchase flow

---

## 🗄️ Database: Supabase

**The backend uses Supabase** (PostgreSQL database)

- ✅ Managed PostgreSQL database
- ✅ Automatic backups
- ✅ Web dashboard for data viewing
- ✅ Service role key required for API access

---

## 🔑 Required Integrations & Configuration

### 1. Stripe Configuration

**What You Need:**
- Stripe Secret Key (`sk_live_...` or `sk_test_...`)
- Stripe Webhook Secret (`whsec_...`)
- Stripe Publishable Key (for frontend - `pk_live_...`)

**Where to Get:**
1. Go to https://dashboard.stripe.com
2. Developers → API Keys
3. Copy Secret Key and Publishable Key
4. Developers → Webhooks → Add endpoint
   - URL: `https://your-api-domain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`
   - Copy Signing Secret

**Environment Variables:**
```env
STRIPE_SECRET_KEY=sk_live_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
STRIPE_PRICE_PERSONAL=price_xxx
STRIPE_PRICE_FAMILY=price_xxx
STRIPE_PRICE_LLV_PERSONAL=price_xxx
STRIPE_PRICE_LLV_FAMILY=price_xxx
```

**Stripe Products to Create:**
1. **Local Password Vault**
   - Personal Vault: $49.00 (one-time)
   - Family Vault: $79.00 (one-time)
2. **Local Legacy Vault**
   - Personal: $49.00 (one-time)
   - Family: $129.00 (one-time)

**Bundle Support:**
- The backend automatically applies discounts when products are bundled
- Family Protection Bundle (LPV Family + LLV Family): $29 discount (was $208, now $179)
- Personal Bundle (LPV Personal + LLV Personal): $19 discount (was $98, now $79)
- Use `POST /api/checkout/bundle` endpoint with multiple products

**What It Does:**
- Processes payments when users click "Buy Now"
- Generates license keys automatically after payment
- Sends webhook events to your backend

---

### 2. Brevo Email Configuration

**What You Need:**
- Brevo API Key (Transactional API)

**Where to Get:**
1. Go to https://app.brevo.com
2. Settings → SMTP & API → API Keys
3. Create new API key with "Send emails" permission
4. Copy the API key (starts with `xkeysib-...`)

**Environment Variables:**
```env
BREVO_API_KEY=xkeysib-YOUR_API_KEY_HERE
FROM_EMAIL=noreply@localpasswordvault.com
SUPPORT_EMAIL=support@localpasswordvault.com
```

**What It Does:**
- Sends purchase confirmation emails with license keys
- Sends trial welcome emails
- Professional HTML templates included in `backend/templates/`

**Email Templates Included:**
- `purchase-email.html` - Sent after payment
- `trial-email.html` - Sent for trial signups
- Templates use `{{variable}}` placeholders

---

### 3. Supabase Database Configuration

**The backend uses Supabase (PostgreSQL).**

**Environment Variables:**
```env
SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...YOUR-SERVICE-ROLE-KEY
```

**Where to Get:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Settings → API
4. Copy "Project URL" → paste as `SUPABASE_URL`
5. Copy "service_role" key (NOT anon key) → paste as `SUPABASE_SERVICE_KEY`

**Setup Steps:**
1. Create Supabase project at https://supabase.com
2. Go to SQL Editor
3. Run the schema from `backend/database/schema.sql` (convert to PostgreSQL syntax if needed)
4. Tables created: `licenses`, `customers`, `trials`, `device_activations`, `webhook_events`

---

### 4. JWT Secret (Required)

**What You Need:**
- Random 64-character string for signing JWT tokens

**Generate:**
```bash
openssl rand -base64 64
```

**Environment Variable:**
```env
JWT_SECRET=YOUR_GENERATED_SECRET_HERE
```

**What It Does:**
- Signs JWT tokens for offline license validation
- Tokens stored in app after activation
- App validates license offline using JWT

---

## 📝 Complete Environment Variables Checklist

Create `.env` file in `backend/` directory:

```env
# Server
NODE_ENV=production
PORT=3001

# Supabase Database
SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...YOUR-SERVICE-ROLE-KEY

# JWT Secret (REQUIRED)
JWT_SECRET=GENERATE_WITH_openssl_rand_base64_64

# Stripe (REQUIRED)
STRIPE_SECRET_KEY=sk_live_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
STRIPE_PRICE_PERSONAL=price_xxxxx
STRIPE_PRICE_FAMILY=price_xxxxx
STRIPE_PRICE_LLV_PERSONAL=price_xxxxx
STRIPE_PRICE_LLV_FAMILY=price_xxxxx

# Brevo Email (REQUIRED)
BREVO_API_KEY=xkeysib-YOUR_API_KEY_HERE
FROM_EMAIL=noreply@localpasswordvault.com
SUPPORT_EMAIL=support@localpasswordvault.com

# Website URLs
WEBSITE_URL=https://localpasswordvault.com
```

---

## 🚀 Step-by-Step Completion Checklist

### Step 1: Set Up Environment Variables
- [ ] Copy `backend/env.example` to `backend/.env`
- [ ] Fill in all required values (Stripe, Brevo, JWT_SECRET)
- [ ] Verify no values are missing

### Step 2: Test Supabase Connection
- [ ] Get Supabase URL and Service Key from Supabase Dashboard
- [ ] Add to `.env` file
- [ ] Run `npm install` in `backend/` directory
- [ ] Start server: `npm start`
- [ ] Check logs for successful database connection
- [ ] Verify tables exist in Supabase dashboard

### Step 3: Test Stripe Integration
- [ ] Verify Stripe keys are correct
- [ ] Test webhook endpoint (use Stripe CLI or Dashboard)
- [ ] Create test checkout session
- [ ] Verify license key generated after payment

### Step 4: Test Brevo Email
- [ ] Verify Brevo API key works
- [ ] Test sending purchase email
- [ ] Check email templates render correctly
- [ ] Verify emails arrive in inbox

### Step 5: Test License Validation
- [ ] Create test license key in database
- [ ] Test `/api/licenses/validate` endpoint
- [ ] Verify device binding works
- [ ] Test family plan (5 devices)

### Step 6: Test Trial Signup
- [ ] Test `/api/trial/signup` endpoint
- [ ] Verify trial email sent
- [ ] Test trial key validation

### Step 7: End-to-End Testing
- [ ] Complete purchase flow: Stripe → Webhook → License → Email
- [ ] Test license activation in app
- [ ] Verify offline validation works
- [ ] Test error scenarios (invalid key, expired trial, etc.)

---

## 🔍 Key API Endpoints to Complete

### 1. POST `/api/webhooks/stripe`
**Purpose:** Handle Stripe payment webhooks

**What It Does:**
- Receives `checkout.session.completed` events
- Generates license key immediately
- Saves to database
- Sends email with license key

**Status:** ✅ Code exists, needs testing

**Test:**
```bash
# Use Stripe CLI to test
stripe listen --forward-to localhost:3001/api/webhooks/stripe
stripe trigger checkout.session.completed
```

---

### 2. POST `/api/licenses/validate`
**Purpose:** Validate and activate license keys

**Request:**
```json
{
  "licenseKey": "LPV4-XXXX-XXXX-XXXX-XXXX",
  "hardwareHash": "sha256-device-fingerprint"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "planType": "personal",
    "token": "jwt-token-here",
    "isNewActivation": true,
    "activationTime": "2024-01-01T00:00:00Z",
    "maxDevices": 1
  }
}
```

**Status:** ✅ Code exists, needs testing

---

### 3. POST `/api/checkout/session`
**Purpose:** Create Stripe checkout session

**Request:**
```json
{
  "planType": "personal",
  "customerEmail": "user@example.com"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

**Status:** ✅ Code exists, needs testing

---

### 4. POST `/api/trial/signup`
**Purpose:** Create 7-day free trial

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "trialKey": "TRIAL-XXXX-XXXX-XXXX",
  "expiresAt": "2024-01-08T00:00:00Z"
}
```

**Status:** ✅ Code exists, needs testing

---

## 🐛 Common Issues & Solutions

### Issue 1: Stripe Webhook Not Receiving Events
**Solution:**
- Verify webhook URL is publicly accessible (use ngrok for local testing)
- Check webhook secret matches in `.env`
- Verify Stripe endpoint is configured correctly
- Check server logs for webhook errors

### Issue 2: Brevo Emails Not Sending
**Solution:**
- Verify API key is correct (starts with `xkeysib-`)
- Check Brevo account has email credits
- Verify sender email is verified in Brevo
- Check email templates exist in `backend/templates/`

### Issue 3: Supabase Database Errors
**Solution:**
- Verify SUPABASE_URL is correct (full URL with https://)
- Verify SUPABASE_SERVICE_KEY is the service_role key (NOT anon key)
- Check Supabase project is active
- Verify tables exist in Supabase SQL Editor
- Check for PostgreSQL syntax errors in queries

### Issue 4: License Validation Failing
**Solution:**
- Verify license key exists in database
- Check hardware hash format (SHA-256)
- Verify JWT_SECRET is set
- Check device limit for family plans

---

## 📚 Additional Resources

### Documentation Files:
- `backend/README.md` - Backend overview
- `backend/DEVELOPER_SETUP.md` - Setup instructions
- `docs/PRODUCTION_LAUNCH_GUIDE.md` - Production deployment
- `docs/BACKEND_SETUP_GUIDE.md` - Additional setup details

### Code Files to Review:
- `backend/server.js` - Main server file
- `backend/routes/webhooks.js` - Stripe webhook handler
- `backend/routes/licenses.js` - License validation
- `backend/services/stripe.js` - Stripe integration
- `backend/services/email.js` - Brevo email service
- `backend/database/schema.sql` - Database schema

---

## ✅ Final Checklist Before Going Live

- [ ] All environment variables configured
- [ ] Database initialized and tested
- [ ] Stripe webhook receiving events
- [ ] Brevo emails sending successfully
- [ ] License generation working
- [ ] License validation working
- [ ] Trial signup working
- [ ] Error handling in place
- [ ] Logging configured
- [ ] Server deployed and running
- [ ] SSL certificate installed (HTTPS)
- [ ] End-to-end purchase flow tested
- [ ] Test with real Stripe payment (use test mode first)

---

## 🎯 Summary: What the Developer Needs to Do

1. **Configure Environment Variables** - Get API keys from Stripe, Brevo
2. **Test Stripe Integration** - Verify webhooks work, license keys generate
4. **Test Brevo Email** - Verify emails send with license keys
5. **Test License Validation** - Verify app can activate licenses
6. **Deploy to Production** - Set up server, SSL, PM2
7. **End-to-End Testing** - Complete purchase flow from start to finish

**The backend code is 90% complete** - it mainly needs:
- Configuration (API keys)
- Testing
- Deployment

All the core logic, routes, and integrations are already implemented!

---

## 📞 Questions?

If you need clarification on any part of the backend:
- Review the code in `backend/` directory
- Check `backend/README.md` for API documentation
- See `docs/PRODUCTION_LAUNCH_GUIDE.md` for deployment steps

The intention of LPV is simple: **Generate license keys after payment, validate them when users activate, send emails. That's it!**

