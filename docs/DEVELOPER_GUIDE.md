# Developer Guide - First Paying Customer Setup

**Version:** 2.0.0  
**Last Updated:** Latest  
**Purpose:** Complete step-by-step technical guide for developer to get application ready for first paying customer

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Phase 1: Infrastructure Setup](#phase-1-infrastructure-setup)
3. [Phase 2: Backend Deployment](#phase-2-backend-deployment)
4. [Phase 3: Frontend Configuration](#phase-3-frontend-configuration)
5. [Phase 4: Code Signing Setup](#phase-4-code-signing-setup)
6. [Phase 5: Monitoring Setup](#phase-5-monitoring-setup)
7. [Phase 6: Testing & Verification](#phase-6-testing--verification)
8. [Phase 7: Launch Readiness](#phase-7-launch-readiness)
9. [Troubleshooting](#troubleshooting)
10. [Quick Reference](#quick-reference)

---

## Overview

This guide provides step-by-step instructions for deploying Local Password Vault to production and getting ready for the first paying customer.

**Prerequisites (Already Complete):**
- ✅ Linode server provisioned and configured
- ✅ Supabase database project created
- ✅ Stripe products created

---

## Phase 1: Infrastructure Setup (Day 1)

**Note:** Linode server and Supabase database are already set up. This phase focuses on verifying access and getting credentials.

### 1.1 Server Access & Verification

#### Step 1: Verify Server Access
- Get SSH access credentials from product owner
- SSH into server:
  ```bash
  ssh root@your-server-ip
  # or
  ssh user@your-server-ip
  ```

#### Step 2: Verify Base Software Installed
```bash
# Check Node.js version (should be 18+)
node --version

# Check PM2 installed
pm2 --version

# Check Nginx installed
nginx -v
```

If any are missing, install:
```bash
# Install Node.js 18+ (if needed)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 (if needed)
npm install -g pm2

# Install Nginx (if needed)
apt-get update
apt-get install -y nginx
```

#### Step 3: Verify SSL Certificate
```bash
# Check if SSL certificate exists
certbot certificates

# If not installed, install:
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d api.localpasswordvault.com
```

#### Step 4: Verify Domain Configuration
- Verify domain points to server: `nslookup api.localpasswordvault.com`
- Test health endpoint: `curl https://api.localpasswordvault.com/health` (may not work yet if backend not deployed)

**Reference:** `docs/PRODUCTION_DEPLOYMENT.md` - Section 2

---

### 1.2 Database Access & Verification

**Note:** Supabase project is already created. You need to get credentials and verify schema.

#### Step 1: Get Supabase Credentials
1. Ask product owner for Supabase access or credentials
2. Go to: https://app.supabase.com
3. Select existing project
4. Go to Settings → API
5. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Service Role Key**: `eyJhbGc...` (NOT anon key - use service role)
6. Save for `.env` file

#### Step 2: Verify Database Schema
1. Go to SQL Editor in Supabase Dashboard
2. Check if tables exist:
   - Go to Table Editor
   - Verify tables: `licenses`, `customers`, etc.
3. If tables don't exist:
   - Open `backend/database/schema.sql`
   - Copy entire schema
   - Paste into SQL Editor
   - Click "Run" or press F5
   - Verify tables created

**Reference:** `docs/PRODUCTION_LAUNCH_GUIDE.md` - Step 1

---

### 1.3 Payment Processing (Stripe)

**Note:** Products are already created in Stripe. You need to get API keys and set up webhook.

#### Step 1: Access Stripe Dashboard
1. Get Stripe account access from product owner
2. Go to: https://dashboard.stripe.com
3. Verify you're in **LIVE mode** (not test mode)
4. Switch to LIVE mode if needed (toggle in top right)

#### Step 2: Get Product Price IDs
1. Go to: Products
2. Find and copy Price IDs for:
   - **Personal Vault** ($49) → Price ID: `price_xxxxx`
   - **Family Vault** ($79) → Price ID: `price_xxxxx`
   - **Local Legacy Vault - Personal** ($49) → Price ID: `price_xxxxx`
   - **Local Legacy Vault - Family** ($129) → Price ID: `price_xxxxx`
3. Save all Price IDs for `.env` file

#### Step 3: Get API Keys
1. Go to: Developers → API keys
2. Copy:
   - **Secret Key**: `sk_live_xxxxx` (keep this secret!)
   - **Publishable Key**: `pk_live_xxxxx`
3. Save for `.env` file

#### Step 4: Set Up Webhook
1. Go to: Developers → Webhooks
2. Check if webhook endpoint already exists:
   - Look for: `https://api.localpasswordvault.com/api/webhooks/stripe`
3. If not exists, create:
   - Click "Add endpoint"
   - Endpoint URL: `https://api.localpasswordvault.com/api/webhooks/stripe`
   - Events to send:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
   - Click "Add endpoint"
4. Copy **Signing secret**: `whsec_xxxxx`
5. Save for `.env` file

**Reference:** `docs/PRODUCTION_LAUNCH_GUIDE.md` - Step 3

**Cost:** 2.9% + $0.30 per transaction

---

### 1.4 Email Service (Brevo)

**Note:** Brevo account is already set up. You need to get the API key and verify connection.

**Important:** The backend uses its own HTML templates from `backend/templates/` directory. **Do NOT use Brevo templates.** The backend sends HTML directly via Brevo API.

#### Step 1: Get Brevo API Key
1. Get Brevo account access from product owner
2. Go to: https://app.brevo.com
3. Navigate to: Settings → SMTP & API → API Keys
4. Find existing API key or create new one:
   - Click "Generate a new API key" (if needed)
   - Name: "Local Password Vault"
   - Permissions: "Send emails"
5. Copy key: `xkeysib-xxxxx`
6. Save for `.env` file

#### Step 2: Verify Sender Domain (If Not Already Done)
1. Go to: Senders & IP → Domains
2. Check if `localpasswordvault.com` is verified
3. If not verified:
   - Add domain: `localpasswordvault.com`
   - Add DNS records (SPF, DKIM) to your DNS provider
   - Wait for verification (up to 48 hours)

#### Step 3: Verify Email Addresses
- Confirm these email addresses are set up:
  - `noreply@localpasswordvault.com`
  - `support@localpasswordvault.com`

#### Step 4: Remove/Ignore Brevo Templates (Important!)

**The backend does NOT use Brevo templates.** It uses HTML files from `backend/templates/` directory.

**Action Required:**
1. Go to Brevo Dashboard → Email Templates
2. **Delete or ignore any templates** you see there
3. The backend will use its own templates:
   - `backend/templates/purchase-confirmation-email.html`
   - `backend/templates/trial-welcome-email.html`
   - `backend/templates/bundle-email.html`
   - `backend/templates/trial-expires-tomorrow-email.html`
   - `backend/templates/trial-expired-email.html`

**Why:** The backend loads HTML templates from the filesystem and sends them directly via Brevo API. Using Brevo templates would require code changes and is not recommended.

**Reference:** `docs/PRODUCTION_LAUNCH_GUIDE.md` - Step 4

**Cost:** Free tier (300/day), then ~$15/month

---

## Phase 2: Backend Deployment (Day 2)

### 2.1 Environment Configuration

#### Step 1: Create Backend Directory
```bash
mkdir -p /var/www/lpv-api
cd /var/www/lpv-api
```

#### Step 2: Upload Backend Code
- Use Git: `git clone <repo-url> backend`
- Or SCP: `scp -r backend/ root@server:/var/www/lpv-api/`
- Or deployment tool (GitHub Actions, etc.)

#### Step 3: Create `.env` File
```bash
cd /var/www/lpv-api/backend
nano .env
```

Copy from `backend/env.example` and fill in:

```bash
# Server
NODE_ENV=production
PORT=3001

# Database (from Supabase)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...

# Secrets (generate these)
JWT_SECRET=<generate: openssl rand -base64 64>
LICENSE_SIGNING_SECRET=<generate: openssl rand -hex 32>

# Stripe (LIVE keys from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_PERSONAL=price_xxxxx
STRIPE_PRICE_FAMILY=price_xxxxx
STRIPE_PRICE_LLV_PERSONAL=price_xxxxx
STRIPE_PRICE_LLV_FAMILY=price_xxxxx

# Email (from Brevo)
BREVO_API_KEY=xkeysib-xxxxx
FROM_EMAIL=noreply@localpasswordvault.com
SUPPORT_EMAIL=support@localpasswordvault.com

# Website
WEBSITE_URL=https://localpasswordvault.com

# Optional: Sentry
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

#### Step 4: Set File Permissions
```bash
chmod 600 .env
```

#### Step 5: Validate Environment
```bash
node scripts/validate-env.js
```

Should show: ✅ All environment variables valid

**Reference:** `backend/env.example` and `docs/PRODUCTION_QUICK_REFERENCE.md`

---

### 2.2 Deploy Backend Code

#### Step 1: Install Dependencies
```bash
cd /var/www/lpv-api/backend
npm install --production
```

#### Step 2: Test Server Starts
```bash
node server.js
```

Should see: "Server running on port 3001"

Press Ctrl+C to stop.

#### Step 3: Start with PM2
```bash
pm2 start server.js --name lpv-api
pm2 save
pm2 startup  # Enable auto-start on reboot
```

#### Step 4: Check Status
```bash
pm2 status
pm2 logs lpv-api
```

Should show: `online` status

---

### 2.3 Configure Nginx

#### Step 1: Create Nginx Config
```bash
nano /etc/nginx/sites-available/lpv-api
```

Add:
```nginx
server {
    listen 80;
    server_name api.localpasswordvault.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.localpasswordvault.com;

    ssl_certificate /etc/letsencrypt/live/api.localpasswordvault.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.localpasswordvault.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Step 2: Enable Site
```bash
ln -s /etc/nginx/sites-available/lpv-api /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl reload nginx
```

#### Step 3: Test Health Endpoint
```bash
curl https://api.localpasswordvault.com/health
```

Should return: `{"status":"ok"}`

**Reference:** `docs/PRODUCTION_DEPLOYMENT.md` - Section 7

---

## Phase 3: Frontend Configuration (Day 3)

### 3.1 Environment Configuration

#### Step 1: Create `.env.production` File
```bash
cd /path/to/LocalPasswordVault
nano .env.production
```

Add:
```bash
# License Server
VITE_LICENSE_SERVER_URL=https://api.localpasswordvault.com
VITE_LICENSE_SIGNING_SECRET=<same as backend LICENSE_SIGNING_SECRET>

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# Optional: Sentry
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# App
VITE_APP_MODE=production
VITE_APP_VERSION=1.2.0
```

**Important:** `VITE_LICENSE_SIGNING_SECRET` must match backend `LICENSE_SIGNING_SECRET`

---

### 3.2 Build Production Version

#### Step 1: Install Dependencies
```bash
npm install
```

#### Step 2: Build Production
```bash
npm run build:prod
```

This creates `dist/` folder with production build.

#### Step 3: Verify Build
```bash
ls -la dist/
```

Should see: `index.html`, `assets/` folder

---

### 3.3 Create Download Package

#### Step 1: Follow Package Guide
See: `docs/DOWNLOAD_PACKAGE_GUIDE.md`

#### Step 2: Create ZIP Package
Package should include:
- Installer (.exe / .dmg / .AppImage) - **Production build only, NO source code**
- `README.txt` (quick start)
- `User Manual.pdf`
- `Quick Start Guide.pdf`
- `Privacy Policy.pdf`
- `Terms of Service.pdf`
- `License.txt`

**Important:** Installers are prebuilt production builds with NO source code. See `docs/PACKAGE_SECURITY_VERIFICATION.md` for verification.

#### Step 3: Host Package
- Upload to website or CDN
- Update download links in email templates

**Reference:** `docs/DOWNLOAD_PACKAGE_GUIDE.md`

---

## Phase 4: Code Signing Setup

**Note:** Code signing certificates are available. This phase configures signing for Windows (SSL.com) and macOS (Apple Developer).

### 4.1 Windows Code Signing (SSL.com)

**Easiest Method: Use Automated Setup Script**

#### Step 1: Download Certificate from SSL.com
1. Go to: https://www.ssl.com/account/
2. Navigate to: My Certificates → Code Signing Certificates
3. Download certificate as **PKCS#12 (.pfx)** format
4. Save the password provided by SSL.com

#### Step 2: Run Setup Script
```powershell
.\scripts\setup-code-signing.ps1
```

**The script will:**
- Guide you through the process
- Ask for certificate file path (or drag and drop)
- Ask for certificate password
- Copy certificate to `certs/` folder
- Create/update `.env` file automatically

#### Step 3: Verify Setup
```powershell
.\scripts\verify-code-signing.ps1
```

Should show: ✅ All checks passed!

#### Step 4: Test Code Signing
```bash
npm run dist:win
```

The installer will be automatically signed.

**Verify signature:**
- Right-click installer → Properties → Digital Signatures tab
- Should show your SSL.com certificate name

**Alternative (Manual Setup):** See `docs/CODE_SIGNING_AUTOMATED_SETUP.md` for manual instructions.

**Reference:** `docs/CODE_SIGNING_AUTOMATED_SETUP.md` and `docs/SSL_COM_CERTIFICATE_SETUP.md`

---

### 4.2 macOS Code Signing (Apple Developer)

#### Step 1: Get Certificate Identity
1. Install certificate to Keychain:
   - Download from: https://developer.apple.com/account/resources/certificates/list
   - Double-click `.cer` file to install to Keychain

2. Find your identity:
   ```bash
   security find-identity -v -p codesigning
   ```

3. Look for output like:
   ```
   1) ABC123... "Developer ID Application: Your Name (TEAM_ID)"
   ```

4. Copy the identity (the part in quotes)

#### Step 2: Get App-Specific Password
1. Go to: https://appleid.apple.com
2. Sign in → App-Specific Passwords
3. Generate new password for "electron-builder"
4. Copy the password (you'll only see it once)

#### Step 3: Update Configuration
1. Add to `.env` file:
   ```env
   APPLE_ID=your@email.com
   APPLE_ID_PASSWORD=app-specific-password-from-step-2
   APPLE_TEAM_ID=YOUR_TEAM_ID
   ```

2. Update `electron-builder.json`:
   - Find the `mac` section
   - Add (if not already there):
   ```json
   "identity": "Developer ID Application: Your Name (TEAM_ID)",
   ```
   - Replace with your actual identity from Step 1

#### Step 4: Test Code Signing
```bash
npm run dist:mac
```

This will:
- Sign the app
- Notarize with Apple (requires internet)
- Staple notarization ticket

**Verify:**
```bash
codesign -dv --verbose=4 "release/Local Password Vault.app"
spctl -a -vvv -t install "release/Local Password Vault.app"
```

**Reference:** `docs/CODE_SIGNING_QUICK_START.md`

---

## Phase 5: Monitoring Setup

### 4.1 Sentry Error Tracking (Optional but Recommended)

#### Step 1: Create Sentry Account
1. Go to: https://sentry.io
2. Create account
3. Create project:
   - Platform: React (for frontend)
   - Platform: Node.js (for backend)

#### Step 2: Get DSN
1. Go to: Settings → Projects → Your Project → Client Keys (DSN)
2. Copy DSN: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`

#### Step 3: Add to Environment
- Backend: Add to `backend/.env` as `SENTRY_DSN`
- Frontend: Add to `.env.production` as `VITE_SENTRY_DSN`

#### Step 4: Verify
- Trigger test error
- Check Sentry dashboard for error

**Reference:** `docs/SENTRY_QUICK_START.md`

**Cost:** Free tier (5,000 events/month), then ~$26/month

---

### 4.2 Uptime Monitoring

#### Step 1: Create UptimeRobot Account
1. Go to: https://uptimerobot.com
2. Sign up (free)

#### Step 2: Add Monitor
1. Click "Add New Monitor"
2. Monitor Type: HTTP(s)
3. Friendly Name: "Local Password Vault API"
4. URL: `https://api.localpasswordvault.com/health`
5. Monitoring Interval: 5 minutes
6. Alert Contacts: Your email

#### Step 3: Test Alert
- Stop server temporarily
- Verify alert email received

**Reference:** `docs/MONITORING_SETUP.md`

**Cost:** Free (50 monitors)

---

## Phase 6: Testing & Verification

### 5.1 End-to-End Testing

#### Test 1: Purchase Flow
1. Go to website
2. Click "Buy Now"
3. Complete Stripe checkout (use test card: 4242 4242 4242 4242)
4. Verify email received with license key
5. Download package
6. Install app
7. Enter license key
8. Verify activation works
9. Verify app works offline

#### Test 2: License Transfer
1. Activate on Device A
2. Try to activate on Device B
3. Verify transfer dialog appears
4. Complete transfer
5. Verify Device B works
6. Verify Device A no longer works

#### Test 3: Error Scenarios
- Invalid license key → Should show error
- Expired trial → Should show expiration
- Network failure → Should show error, allow retry
- Corrupted license file → Should detect and reject

#### Test 4: Offline Operation
1. Activate license
2. Disconnect internet
3. Use app for 30+ minutes:
   - Add entries
   - Edit entries
   - Delete entries
   - Search entries
   - Export entries
4. Check DevTools Network tab → Should show ZERO requests

**Reference:** `docs/PRODUCTION_CHECKLIST.md` - Section 7

---

### 5.2 Production Verification

#### Verify All Endpoints
```bash
# Health check
curl https://api.localpasswordvault.com/health

# License activation (should require license_key and device_id)
curl -X POST https://api.localpasswordvault.com/api/lpv/license/activate
```

#### Check Logs
```bash
pm2 logs lpv-api
```

Look for:
- ✅ Server started successfully
- ✅ Database connected
- ✅ No errors

#### Verify Database
- Supabase Dashboard → Table Editor
- Check `licenses` table exists
- Check `customers` table exists

#### Verify Email
- Send test email
- Check Brevo dashboard for delivery

#### Verify Stripe Webhook
- Stripe Dashboard → Webhooks
- Check endpoint is receiving events

---

## Phase 7: Launch Readiness

### 6.1 Final Checks

#### Checklist
- [ ] All environment variables set
- [ ] All services configured (Stripe, Brevo, Supabase)
- [ ] SSL certificate valid
- [ ] Health endpoint responding
- [ ] Download package available
- [ ] Email templates tested
- [ ] Monitoring active
- [ ] Error tracking active (if using Sentry)
- [ ] End-to-end test passed
- [ ] Offline operation verified

---

### 6.2 Documentation

#### Verify Documentation Available
- [ ] User manual: `docs/user-manual.html`
- [ ] Quick start: `docs/quick-start.html`
- [ ] Troubleshooting: `docs/troubleshooting.html`
- [ ] Host on website or link from support pages

---

## Troubleshooting

### Server Won't Start

**Check environment:**
```bash
cd backend
node scripts/validate-env.js
```

**Check port:**
```bash
lsof -i :3001
```

**Check logs:**
```bash
pm2 logs lpv-api
```

---

### Database Connection Failed

**Check Supabase:**
1. Verify `SUPABASE_URL` is correct
2. Verify `SUPABASE_SERVICE_KEY` is service role key (not anon key)
3. Check Supabase dashboard for connection issues

---

### Stripe Webhook Not Working

**Check webhook:**
1. Stripe Dashboard → Webhooks
2. Check endpoint URL is correct
3. Check webhook secret matches `.env`
4. Test webhook manually

---

### Email Not Sending

**Check Brevo:**
1. Verify API key is correct
2. Check Brevo dashboard for delivery status
3. Verify sender domain (if using custom domain)
4. Check email limits (300/day free tier)

---

## Quick Reference

### Essential Commands

**Server Management:**
```bash
# Check status
pm2 status

# View logs
pm2 logs lpv-api

# Restart
pm2 restart lpv-api

# Check health
curl https://api.localpasswordvault.com/health
```

**Environment Validation:**
```bash
cd backend
node scripts/validate-env.js
```

**Build Frontend:**
```bash
npm run build:prod
```

---

### Essential Files

**Backend:**
- `backend/.env` - Environment variables
- `backend/server.js` - Main server file
- `backend/scripts/validate-env.js` - Environment validator

**Frontend:**
- `.env.production` - Production environment variables
- `dist/` - Production build output

---

### Essential Links

**Services:**
- Supabase: https://app.supabase.com
- Stripe: https://dashboard.stripe.com
- Brevo: https://app.brevo.com
- Sentry: https://sentry.io
- UptimeRobot: https://uptimerobot.com

**Documentation:**
- Production Deployment: `docs/PRODUCTION_DEPLOYMENT.md`
- Quick Reference: `docs/PRODUCTION_QUICK_REFERENCE.md`
- Monitoring: `docs/MONITORING_SETUP.md`

---

## Success Criteria

### Ready for First Paying Customer When:

- [x] Server access verified (Linode already set up)
- [x] Database credentials obtained (Supabase already set up)
- [x] Stripe API keys obtained (Products already created)
- [x] Email service configured
- [x] Backend API deployed and responding
- [x] Frontend built and packaged
- [x] End-to-end test passed
- [x] Offline operation verified
- [x] Monitoring active
- [x] Documentation available

---

## Quick Start (If Infrastructure Already Set Up)

**If Linode, Supabase, and Stripe products are already configured:**

1. **Get Credentials**
   - Get Supabase URL and Service Role Key
   - Get Stripe API keys and Price IDs
   - Get Stripe webhook signing secret
   - Get server SSH access

2. **Deploy Backend**
   - See Phase 2: Backend Deployment

3. **Build Frontend**
   - See Phase 3: Frontend Configuration

4. **Set Up Code Signing**
   - See Phase 4: Code Signing Setup

5. **Set Up Monitoring**
   - See Phase 5: Monitoring Setup

6. **Test Everything**
   - See Phase 6: Testing & Verification

---

**This guide provides complete technical steps for developer. For product owner management guide, see `PRODUCT_OWNER.md`.**

