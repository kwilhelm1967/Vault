# Production Launch Guide - Local Password Vault
## Complete Step-by-Step Guide to Get Ready to Sell

**Version:** 1.2.0  
**Last Updated:** December 2024

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Database Setup](#step-1-database-setup)
4. [Step 2: Backend API Deployment](#step-2-backend-api-deployment)
5. [Step 3: Stripe Configuration](#step-3-stripe-configuration)
6. [Step 4: Email Service Setup](#step-4-email-service-setup)
7. [Step 5: Build & Package Creation](#step-5-build--package-creation)
8. [Step 6: Download Hosting](#step-6-download-hosting)
9. [Step 7: Testing All Scenarios](#step-7-testing-all-scenarios)
10. [Step 8: Code Signing](#step-8-code-signing)
11. [Step 9: Production Checklist](#step-9-production-checklist)
12. [Troubleshooting](#troubleshooting)

---

## Overview

This guide walks you through setting up Local Password Vault for production sale. The system is designed to:

✅ **Instant License Key Delivery** - Keys generated and emailed immediately after payment  
✅ **Zero Internet After Activation** - App works 100% offline after initial license activation  
✅ **All Scenarios Covered** - Purchase, trial, activation, transfer, expiration  
✅ **Professional Email Templates** - All templates included and ready to use  

### System Architecture

```
User Purchase Flow:
1. User clicks "Buy Now" on website
2. Stripe Checkout → Payment
3. Stripe Webhook → Backend API
4. License Key Generated (INSTANT)
5. Email Sent with Key + Download Links
6. User Downloads ZIP Package
7. User Installs App
8. User Enters License Key (ONE internet call)
9. App Generates Device Fingerprint (SHA-256 hash)
10. API Validates & Binds License to Device
11. App Works 100% OFFLINE Forever
```

**Key Security Features:**
- ✅ **Device Binding** - License tied to hardware fingerprint (prevents sharing)
- ✅ **Transfer System** - Users can move license to new device (3 transfers/year)
- ✅ **100% Offline After Activation** - ZERO internet calls after initial activation
- ✅ **Privacy First** - No user data transmitted, only license key + device hash
- ✅ **No Analytics** - Analytics service is NO-OP (no tracking, no telemetry)
- ✅ **No Periodic Checks** - Trial expiration checked locally (JWT token parsing)
- ✅ **No Update Checks** - App never checks for updates automatically
- ✅ **No Background Sync** - All operations are local-only

**Network Calls Guarantee:**
- ✅ **ONLY 2 possible network calls:**
  1. License activation (`POST /api/lpv/license/activate`) - ONE TIME during activation
  2. License transfer (`POST /api/lpv/license/transfer`) - ONLY when transferring to new device
- ❌ **NO other network calls:**
  - No trial expiration checks (uses local JWT token)
  - No periodic validation
  - No update checks
  - No analytics/telemetry
  - No background sync
  - No user data transmission

---

## Prerequisites

Before starting, ensure you have:

- [ ] **Linode Server** - API hosting (or alternative VPS)
- [ ] **Supabase Account** - Database
- [ ] **Stripe Account** - Payment processing
- [ ] **Brevo Account** - Email delivery
- [ ] **GitHub Account** - Code repository
- [ ] **Domain Name** - For API endpoint (e.g., api.localpasswordvault.com)
- [ ] **SSL Certificate** - For HTTPS (Let's Encrypt free)
- [ ] **Windows Code Signing Certificate** (SSL.com or similar)
- [ ] **Apple Developer Account** - For Mac code signing ($99/year)

**Credentials Needed:**
- Linode SSH access
- Supabase database connection string
- Stripe API keys (test + live)
- Brevo SMTP credentials
- GitHub repository access

---

## Step 1: Database Setup (Supabase)

1. **Log into Supabase Dashboard:** https://app.supabase.com

2. **Create a new project** (if you don't have one):
   - Click "New Project"
   - Choose organization
   - Enter project name: `local-password-vault`
   - Set database password (save this securely!)
   - Choose region closest to your server
   - Click "Create new project"

3. **Wait for project to be ready** (2-3 minutes)

4. **Go to SQL Editor** in Supabase Dashboard

5. **Run the database schema:**
   - Open `backend/database/schema.sql` from the repository
   - The schema is already in PostgreSQL format for Supabase
   - Paste and execute in SQL Editor

6. **Get connection details:**
   - Go to Settings → API
   - Copy:
     - **Project URL** (e.g., `https://xxxxx.supabase.co`)
     - **Service Role Key** (starts with `eyJhbGc...`) - Use this for backend, NOT the anon key
   - Save these for `.env` file

---

## Step 2: Backend API Deployment

### 2.1: Server Setup

1. **SSH into Linode server:**
   ```bash
   ssh root@your-server-ip
   ```

2. **Install Node.js 18+:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
   apt-get install -y nodejs
   node --version  # Should show v18.x or higher
   ```

3. **Install PM2 (process manager):**
   ```bash
   npm install -g pm2
   ```

4. **Install Nginx:**
   ```bash
   apt-get update
   apt-get install -y nginx
   ```

### 2.2: Deploy Backend Code

1. **Create application directory:**
   ```bash
   mkdir -p /var/www/lpv-api
   cd /var/www/lpv-api
   ```

2. **Clone or upload backend files:**
   ```bash
   # Option 1: Clone from GitHub
   git clone https://github.com/kwilhelm1967/Vault.git temp
   cp -r temp/backend/* .
   rm -rf temp
   
   # Option 2: Upload via SCP
   # scp -r backend/* root@your-server:/var/www/lpv-api/
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Create `.env` file:**
   ```bash
   nano .env
   ```

   **Add these variables:**
   ```env
   # Server
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=your-64-character-random-string-here-generate-with-openssl-rand-hex-32
   
   # Supabase (Database)
   SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGc...YOUR-SERVICE-ROLE-KEY
   
   # Stripe
   STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   
   # Brevo Email
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_USER=your-brevo-email@example.com
   SMTP_PASSWORD=your-brevo-smtp-key
   FROM_EMAIL=noreply@localpasswordvault.com
   SUPPORT_EMAIL=support@localpasswordvault.com
   
   # Website
   WEBSITE_URL=https://localpasswordvault.com
   API_URL=https://api.localpasswordvault.com
   ```

5. **Generate JWT_SECRET:**
   ```bash
   openssl rand -hex 32
   # Copy the output to JWT_SECRET in .env
   ```

6. **Test the server:**
   ```bash
   npm start
   # Should see: "Server running on port 3001"
   # Press Ctrl+C to stop
   ```

7. **Start with PM2:**
   ```bash
   pm2 start server.js --name lpv-api
   pm2 save
   pm2 startup  # Follow instructions to enable auto-start
   ```

8. **Check status:**
   ```bash
   pm2 status
   pm2 logs lpv-api
   ```

### 2.3: Configure Nginx

1. **Create Nginx config:**
   ```bash
   nano /etc/nginx/sites-available/lpv-api
   ```

2. **Add configuration:**
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
       
       # SSL certificates (will add after Let's Encrypt)
       ssl_certificate /etc/letsencrypt/live/api.localpasswordvault.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/api.localpasswordvault.com/privkey.pem;
       
       # Security headers
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;
       
       # API proxy
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

3. **Enable the site:**
   ```bash
   ln -s /etc/nginx/sites-available/lpv-api /etc/nginx/sites-enabled/
   nginx -t  # Test configuration
   systemctl reload nginx
   ```

### 2.4: SSL Certificate (Let's Encrypt)

1. **Install Certbot:**
   ```bash
   apt-get install -y certbot python3-certbot-nginx
   ```

2. **Get certificate:**
   ```bash
   certbot --nginx -d api.localpasswordvault.com
   # Follow prompts, enter email, agree to terms
   ```

3. **Test auto-renewal:**
   ```bash
   certbot renew --dry-run
   ```

4. **Reload Nginx:**
   ```bash
   systemctl reload nginx
   ```

### 2.5: Verify API is Live

1. **Test health endpoint:**
   ```bash
   curl https://api.localpasswordvault.com/health
   # Should return: {"status":"ok","service":"Local Password Vault API","version":"1.0.0"}
   ```

2. **Test from browser:**
   Visit: `https://api.localpasswordvault.com/health`

---

## Step 3: Stripe Configuration

### 3.1: Create Products

1. **Log into Stripe Dashboard:** https://dashboard.stripe.com

2. **Go to Products → Add Product**

3. **Create Personal Vault:**
   - **Name:** `Personal Vault`
   - **Description:** `Lifetime license for 1 device`
   - **Pricing:** 
     - Type: `One-time`
     - Amount: `$49.00`
   - **Save** and note the **Price ID** (starts with `price_`)

4. **Create Family Vault:**
   - **Name:** `Family Vault`
   - **Description:** `Lifetime license for 5 devices`
   - **Pricing:**
     - Type: `One-time`
     - Amount: `$79.00`
   - **Save** and note the **Price ID**

5. **Update backend `services/stripe.js` with Price IDs:**
   ```javascript
   const PRODUCTS = {
     personal: {
       name: 'Personal Vault',
       priceId: 'price_xxxxxxxxxxxxx',  // Your Personal Price ID
       price: 4900,  // $49.00 in cents
       maxDevices: 1,
     },
     family: {
       name: 'Family Vault',
       priceId: 'price_xxxxxxxxxxxxx',  // Your Family Price ID
       price: 7900,  // $79.00 in cents
       maxDevices: 5,
     },
   };
   ```

### 3.2: Get API Keys

1. **In Stripe Dashboard → Developers → API Keys**

2. **Copy:**
   - **Publishable Key** (starts with `pk_live_`)
   - **Secret Key** (starts with `sk_live_`)

3. **Add to backend `.env`:**
   ```env
   STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
   ```

### 3.3: Set Up Webhook

1. **In Stripe Dashboard → Developers → Webhooks**

2. **Click "Add endpoint"**

3. **Endpoint URL:**
   ```
   https://api.localpasswordvault.com/api/webhooks/stripe
   ```

4. **Select events to listen to:**
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded` (optional)
   - ✅ `payment_intent.payment_failed` (optional)

5. **Click "Add endpoint"**

6. **Copy the Signing Secret** (starts with `whsec_`)

7. **Add to backend `.env`:**
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

8. **Restart backend:**
   ```bash
   pm2 restart lpv-api
   ```

9. **Test webhook:**
   - In Stripe webhook settings, click "Send test webhook"
   - Select `checkout.session.completed`
   - Check backend logs: `pm2 logs lpv-api`
   - Should see webhook received and processed

---

## Step 4: Email Service Setup

### 4.1: Brevo Configuration

1. **Log into Brevo:** https://app.brevo.com

2. **Go to Settings → SMTP & API**

3. **Copy SMTP credentials:**
   - **SMTP Server:** `smtp-relay.brevo.com`
   - **Port:** `587`
   - **Login:** Your Brevo login email
   - **SMTP Key:** Generate or copy existing

4. **Add to backend `.env`:**
   ```env
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_USER=your-email@example.com
   SMTP_PASSWORD=your-smtp-key-here
   ```

### 4.2: Create Email Templates in Brevo

**Template 1: Purchase Confirmation**

1. **Go to Transactional → Email Templates**
2. **Click "New Template"**
3. **Choose "Code your own"**
4. **Name:** `purchase_confirmation`
5. **Subject:** `🔐 Your Local Password Vault License Key`
6. **Paste HTML from `docs/EMAIL_TEMPLATES.md` (Template 1)**
7. **Replace variables:**
   - `{{ params.planName }}` → Use in code
   - `{{ params.licenseKeys }}` → Use in code
   - `{{ params.numKeys }}` → Use in code
8. **Save** and note **Template ID**

**Template 2: Trial Started**

1. **Create new template**
2. **Name:** `trial_started`
3. **Subject:** `🎉 Your 7-Day Free Trial Has Started!`
4. **Paste HTML from `docs/EMAIL_TEMPLATES.md` (Template 2)**
5. **Replace variables:**
   - `{{ params.trialKey }}` → Use in code
   - `{{ params.expiryDate }}` → Use in code
6. **Save** and note **Template ID**

**Template 3: Trial Expiring**

1. **Create new template**
2. **Name:** `trial_expiring`
3. **Subject:** `⏰ Your Trial Expires in 3 Days`
4. **Paste HTML from `docs/EMAIL_TEMPLATES.md` (Template 3)**
5. **Save** and note **Template ID**

**Template 4: Trial Expired**

1. **Create new template**
2. **Name:** `trial_expired`
3. **Subject:** `😢 Your Trial Has Expired`
4. **Paste HTML from `docs/EMAIL_TEMPLATES.md` (Template 4)**
5. **Save** and note **Template ID**

### 4.3: Update Email Service Code

**File:** `backend/services/email.js`

Update to use Brevo template IDs if using their template system, OR use the HTML templates directly (current implementation).

**Current implementation uses HTML files in `backend/templates/`:**

1. **Copy email templates:**
   ```bash
   # From docs/EMAIL_TEMPLATES.md, extract HTML and save as:
   backend/templates/purchase-email.html
   backend/templates/trial-email.html
   backend/templates/trial-expiring.html
   backend/templates/trial-expired.html
   ```

2. **Update template variables in `email.js`** to match your templates

### 4.4: Test Email Sending

1. **SSH into server:**
   ```bash
   ssh root@your-server-ip
   cd /var/www/lpv-api
   ```

2. **Test email connection:**
   ```bash
   node -e "require('./services/email').verifyConnection()"
   ```

3. **Send test email:**
   ```bash
   node -e "
   const { sendTrialEmail } = require('./services/email');
   sendTrialEmail({
     to: 'your-email@example.com',
     trialKey: 'TRIA-TEST-1234-5678',
     expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
   }).then(() => console.log('Email sent!'));
   "
   ```

---

## Step 5: Build & Package Creation

### 5.1: Build Installers

1. **On your development machine, clone repo:**
   ```bash
   git clone https://github.com/kwilhelm1967/Vault.git
   cd Vault
   npm install
   ```

2. **Build Windows installer:**
   ```bash
   npm run dist:win
   # Output: release/Local Password Vault-Setup-1.2.0.exe
   ```

3. **Build macOS installer:**
   ```bash
   npm run dist:mac
   # Output: release/Local Password Vault-1.2.0.dmg
   ```

4. **Build Linux installer:**
   ```bash
   npm run dist:linux
   # Output: release/Local Password Vault-1.2.0.AppImage
   ```

### 5.2: Generate Documentation PDFs

**Option 1: Using Pandoc (Recommended)**

1. **Install Pandoc:**
   ```bash
   # macOS
   brew install pandoc wkhtmltopdf
   
   # Windows
   # Download from: https://pandoc.org/installing.html
   ```

2. **Convert to PDF:**
   ```bash
   pandoc docs/USER_MANUAL.md -o "User Manual.pdf" --pdf-engine=wkhtmltopdf
   pandoc docs/PRIVACY_POLICY.md -o "Privacy Policy.pdf" --pdf-engine=wkhtmltopdf
   pandoc docs/TERMS_OF_SERVICE.md -o "Terms of Service.pdf" --pdf-engine=wkhtmltopdf
   ```

**Option 2: Online Converter**

1. Visit: https://www.markdowntopdf.com/
2. Upload each markdown file
3. Download PDFs

### 5.3: Create Package Files

1. **Create `README.txt`:**
   ```text
   ===============================================
      LOCAL PASSWORD VAULT - QUICK START
   ===============================================

   Thank you for choosing Local Password Vault!

   INSTALLATION:
   1. Run the installer (Setup.exe / .dmg / .AppImage)
   2. Follow the on-screen prompts
   3. When asked, enter your license key
   4. Create your master password
   5. Start adding your passwords!

   YOUR LICENSE KEY:
   (You received this in your purchase confirmation email)

   NEED HELP?
   - Read the User Manual.pdf included in this package
   - Visit: https://localpasswordvault.com/help
   - Email: support@localpasswordvault.com

   IMPORTANT:
   - Your master password CANNOT be recovered if lost
   - Write down your recovery phrase and store it safely
   - Your data is stored locally on YOUR device only

   ===============================================
      © 2024 Local Password Vault
      https://localpasswordvault.com
   ===============================================
   ```

2. **Create `Quick Start Guide.pdf`** (1-page PDF):
   - See `docs/DOWNLOAD_PACKAGE_GUIDE.md` for template

3. **Create `License.txt`:**
   ```text
   LOCAL PASSWORD VAULT - SOFTWARE LICENSE

   Copyright © 2024 Local Password Vault. All rights reserved.

   This software is licensed, not sold. By installing or using this 
   software, you agree to the following terms:

   LICENSE GRANT:
   - Personal Vault: Licensed for use on ONE (1) device
   - Family Vault: Licensed for use on up to FIVE (5) devices

   RESTRICTIONS:
   - You may not redistribute, sell, or sublicense this software
   - You may not reverse engineer or modify the software
   - One license key = one device (Personal) or five devices (Family)

   DATA OWNERSHIP:
   - All data you store remains YOUR property
   - Your data is stored locally on YOUR device only
   - We have no access to your passwords or data

   WARRANTY DISCLAIMER:
   This software is provided "as is" without warranty of any kind.

   For full terms, see Terms of Service.pdf or visit:
   https://localpasswordvault.com/terms

   Contact: support@localpasswordvault.com
   ```

### 5.4: Create ZIP Packages

**Windows Package:**

```powershell
$version = "1.2.0"
$packageDir = "LocalPasswordVault-Windows"

New-Item -ItemType Directory -Force -Path $packageDir
Copy-Item "release/Local Password Vault-Setup-$version.exe" "$packageDir/Local Password Vault Setup.exe"
Copy-Item "README.txt" $packageDir
Copy-Item "User Manual.pdf" $packageDir
Copy-Item "Quick Start Guide.pdf" $packageDir
Copy-Item "Privacy Policy.pdf" $packageDir
Copy-Item "Terms of Service.pdf" $packageDir
Copy-Item "License.txt" $packageDir

Compress-Archive -Path $packageDir -DestinationPath "LocalPasswordVault-Windows-v$version.zip" -Force
Remove-Item -Recurse -Force $packageDir
```

**macOS Package:**

```bash
VERSION="1.2.0"
mkdir -p LocalPasswordVault-macOS
cp "release/Local Password Vault-$VERSION.dmg" "LocalPasswordVault-macOS/Local Password Vault.dmg"
cp README.txt "User Manual.pdf" "Quick Start Guide.pdf" "Privacy Policy.pdf" "Terms of Service.pdf" "License.txt" LocalPasswordVault-macOS/
zip -r "LocalPasswordVault-macOS-v$VERSION.zip" LocalPasswordVault-macOS
rm -rf LocalPasswordVault-macOS
```

**Linux Package:**

```bash
VERSION="1.2.0"
mkdir -p LocalPasswordVault-Linux
cp "release/Local Password Vault-$VERSION.AppImage" "LocalPasswordVault-Linux/Local Password Vault.AppImage"
chmod +x "LocalPasswordVault-Linux/Local Password Vault.AppImage"
cp README.txt "User Manual.pdf" "Quick Start Guide.pdf" "Privacy Policy.pdf" "Terms of Service.pdf" "License.txt" LocalPasswordVault-Linux/
zip -r "LocalPasswordVault-Linux-v$VERSION.zip" LocalPasswordVault-Linux
rm -rf LocalPasswordVault-Linux
```

---

## Step 6: Download Hosting

### Option 1: GitHub Releases (Recommended)

1. **Go to GitHub repo → Releases**
2. **Click "Draft a new release"**
3. **Tag version:** `v1.2.0`
4. **Release title:** `Local Password Vault v1.2.0`
5. **Description:**
   ```markdown
   ## Local Password Vault v1.2.0
   
   Complete password management solution with offline-first architecture.
   
   ### Downloads
   - [Windows](https://github.com/kwilhelm1967/Vault/releases/download/v1.2.0/LocalPasswordVault-Windows-v1.2.0.zip)
   - [macOS](https://github.com/kwilhelm1967/Vault/releases/download/v1.2.0/LocalPasswordVault-macOS-v1.2.0.zip)
   - [Linux](https://github.com/kwilhelm1967/Vault/releases/download/v1.2.0/LocalPasswordVault-Linux-v1.2.0.zip)
   ```

6. **Upload all three ZIP files**
7. **Click "Publish release"**

**Download URLs:**
- Windows: `https://github.com/kwilhelm1967/Vault/releases/download/v1.2.0/LocalPasswordVault-Windows-v1.2.0.zip`
- macOS: `https://github.com/kwilhelm1967/Vault/releases/download/v1.2.0/LocalPasswordVault-macOS-v1.2.0.zip`
- Linux: `https://github.com/kwilhelm1967/Vault/releases/download/v1.2.0/LocalPasswordVault-Linux-v1.2.0.zip`

### Option 2: Your Web Server

1. **Upload ZIPs to your web server:**
   ```bash
   scp LocalPasswordVault-*.zip user@your-server:/var/www/html/downloads/
   ```

2. **Create download routes on your website:**
   - `/download/windows` → Redirect to Windows ZIP
   - `/download/macos` → Redirect to macOS ZIP
   - `/download/linux` → Redirect to Linux ZIP

### Update Email Templates

Update download links in email templates to point to your hosted ZIPs:

```html
<!-- In purchase-email.html and trial-email.html -->
<a href="https://github.com/kwilhelm1967/Vault/releases/download/v1.2.0/LocalPasswordVault-Windows-v1.2.0.zip">Windows</a>
<a href="https://github.com/kwilhelm1967/Vault/releases/download/v1.2.0/LocalPasswordVault-macOS-v1.2.0.zip">macOS</a>
<a href="https://github.com/kwilhelm1967/Vault/releases/download/v1.2.0/LocalPasswordVault-Linux-v1.2.0.zip">Linux</a>
```

---

## Step 7: Testing All Scenarios

### Scenario 1: Purchase Flow (Personal Vault)

1. **Go to your website pricing page**
2. **Click "Buy Now" for Personal Vault ($49)**
3. **Stripe Checkout opens**
4. **Use test card:** `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
5. **Complete payment**
6. **Verify:**
   - ✅ Redirected to success page
   - ✅ Email received with license key
   - ✅ License key format: `PERS-XXXX-XXXX-XXXX`
   - ✅ License appears in database
   - ✅ Email contains download links

7. **Download and install app**
8. **Enter license key**
9. **Verify:**
   - ✅ App connects to API (ONE internet call)
   - ✅ License activates successfully
   - ✅ App works offline after activation

### Scenario 2: Purchase Flow (Family Vault)

1. **Repeat Scenario 1 with Family Vault ($79)**
2. **Verify:**
   - ✅ License key format: `FMLY-XXXX-XXXX-XXXX`
   - ✅ Email shows "5 devices"
   - ✅ License in database shows `max_devices: 5`

### Scenario 3: Trial Signup

1. **Go to website trial signup**
2. **Enter email address**
3. **Submit**
4. **Verify:**
   - ✅ Email received with trial key
   - ✅ Trial key format: `TRIA-XXXX-XXXX-XXXX`
   - ✅ Trial in database with 7-day expiration
   - ✅ Email contains download links

5. **Download and install app**
6. **Enter trial key**
7. **Verify:**
   - ✅ App connects to API (ONE internet call)
   - ✅ Trial activates successfully
   - ✅ App shows trial expiration date
   - ✅ App works offline after activation

### Scenario 4: License Activation (First Time)

1. **Use license key from Scenario 1**
2. **Install app on clean device**
3. **Enter license key**
4. **Verify:**
   - ✅ API call to `/api/lpv/license/activate`
   - ✅ Request includes `device_id` (64-char SHA-256 hash)
   - ✅ Response: `{ "status": "activated", "mode": "first_activation" }`
   - ✅ License in database shows `is_activated: true`
   - ✅ `hardware_hash` stored in database
   - ✅ `current_device_id` stored in database
   - ✅ App unlocks and works offline
   - ✅ Device ID cached locally in app

### Scenario 5: License Activation (Same Device)

1. **Reinstall app on same device**
2. **Enter same license key**
3. **Verify:**
   - ✅ API call succeeds
   - ✅ Response: `{ "status": "activated", "mode": "same_device" }`
   - ✅ No transfer required

### Scenario 6: License Transfer (Different Device)

1. **Install app on different device**
2. **Enter license key from Scenario 1**
3. **Verify:**
   - ✅ API call returns: `{ "status": "device_mismatch", "requires_transfer": true }`
   - ✅ App shows transfer dialog explaining device change
   - ✅ User confirms transfer
   - ✅ API call to `/api/lpv/license/transfer` with `new_device_id`
   - ✅ Response: `{ "status": "transferred" }`
   - ✅ License in database shows:
     - `hardware_hash` updated to new device
     - `current_device_id` updated
     - `transfer_count` incremented
     - `last_transfer_at` timestamp updated
   - ✅ License now bound to new device
   - ✅ Old device can no longer activate (if checked)
   - ✅ App works offline

**Note:** Transfer limit is 3 per year (configurable in `backend/routes/lpv-licenses.js`)

### Scenario 7: Trial Expiration

1. **Wait for trial to expire (or manually set expiration in database)**
2. **Open app with expired trial**
3. **Verify:**
   - ✅ App shows expiration screen
   - ✅ Prompts to purchase license
   - ✅ No internet calls (works offline, checks local expiration)

### Scenario 8: Offline Operation (CRITICAL TEST)

1. **After successful activation, disconnect internet completely**
2. **Verify:**
   - ✅ App opens normally
   - ✅ Vault unlocks with master password
   - ✅ Can add/edit/delete entries
   - ✅ Password generator works
   - ✅ All features work without internet
   - ✅ No network errors
   - ✅ No failed fetch requests in DevTools Network tab
   - ✅ Trial expiration checks work (uses local JWT token)
   - ✅ License validation works (uses local license file)
   - ✅ App can run indefinitely offline

**Network Monitoring Test:**
1. Open browser DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Activate license (should see ONE call to `/api/lpv/license/activate`)
4. Disconnect internet
5. Use app for 10+ minutes
6. Verify: **ZERO network requests** in Network tab
7. Check trial expiration (if applicable) - should work offline

### Scenario 9: Email Delivery (All Templates)

**Test each email template:**

1. **Purchase Confirmation:**
   - Make test purchase
   - Verify email received
   - Check all links work
   - Verify license key displayed correctly

2. **Trial Started:**
   - Sign up for trial
   - Verify email received
   - Check trial key displayed
   - Verify expiration date shown

3. **Trial Expiring:**
   - Manually trigger (or wait for cron job)
   - Verify email received
   - Check days remaining shown

4. **Trial Expired:**
   - Manually trigger (or wait for cron job)
   - Verify email received
   - Check upgrade CTA works

---

## Step 7.5: Device Binding Deep Dive

### How Device Binding Works

**Device Fingerprinting:**
The app generates a unique device ID using hardware characteristics:

1. **Components Collected:**
   - Operating system and platform
   - CPU cores (hardware concurrency)
   - Screen resolution and color depth
   - Timezone
   - System language
   - WebGL renderer (GPU information)
   - Device memory (if available)
   - Max touch points

2. **Hash Generation:**
   - All components combined into a string
   - SHA-256 hashed to create 64-character hex string
   - This is the `device_id` sent to the API

3. **Storage:**
   - Device ID cached locally in `localStorage`
   - License key bound to device ID in database
   - Both stored for validation

### Device Binding Security

**Why Device Binding:**
- Prevents license key sharing across multiple devices
- Enforces "1 device" (Personal) or "5 devices" (Family) limits
- Protects against unauthorized usage

**What Gets Sent:**
- ✅ License key (format: `PERS-XXXX-XXXX-XXXX`)
- ✅ Device ID (64-char SHA-256 hash)
- ❌ NO user data
- ❌ NO passwords
- ❌ NO vault content
- ❌ NO personal information

**Privacy:**
- Device fingerprint is anonymous
- Cannot identify user from device ID
- Only hardware characteristics (no personal data)

### Device Binding Flow

**First Activation:**
```
1. User enters license key
2. App generates device_id (SHA-256 hash)
3. API call: POST /api/lpv/license/activate
   {
     "license_key": "PERS-XXXX-XXXX-XXXX",
     "device_id": "a1b2c3d4e5f6..."
   }
4. Backend stores hardware_hash = device_id
5. Backend stores current_device_id = device_id
6. Backend sets is_activated = true
7. App caches device_id locally
8. App works offline forever
```

**Same Device Re-activation:**
```
1. User enters license key
2. App generates device_id (same as before)
3. API call: POST /api/lpv/license/activate
4. Backend checks: device_id matches hardware_hash
5. Response: { "status": "activated", "mode": "same_device" }
6. App unlocks (no transfer needed)
```

**Different Device (Transfer Required):**
```
1. User enters license key on NEW device
2. App generates NEW device_id (different hash)
3. API call: POST /api/lpv/license/activate
4. Backend checks: device_id ≠ hardware_hash
5. Response: { "status": "device_mismatch", "requires_transfer": true }
6. App shows transfer confirmation dialog
7. User confirms transfer
8. API call: POST /api/lpv/license/transfer
   {
     "license_key": "PERS-XXXX-XXXX-XXXX",
     "new_device_id": "f6e5d4c3b2a1..."
   }
9. Backend updates:
   - hardware_hash = new_device_id
   - current_device_id = new_device_id
   - transfer_count += 1
   - last_transfer_at = now()
10. Response: { "status": "transferred" }
11. App unlocks on new device
```

### Transfer Limits

**Configuration:**
- Default: 3 transfers per year
- Configurable in `backend/routes/lpv-licenses.js`:
  ```javascript
  const MAX_TRANSFERS_PER_YEAR = 3;  // Set to 0 for unlimited
  ```

**Transfer Limit Logic:**
- Counts transfers within last 12 months
- Resets after 1 year from last transfer
- If limit reached, returns: `{ "status": "transfer_limit_reached" }`

**Why Transfer Limits:**
- Prevents abuse (sharing license across many devices)
- Encourages legitimate use (device upgrades, replacements)
- 3 per year is reasonable for most users

### Testing Device Binding

**Test 1: Device ID Generation**
```bash
# In browser console or app DevTools
import { getLPVDeviceFingerprint } from './utils/deviceFingerprint';
const deviceId = await getLPVDeviceFingerprint();
console.log('Device ID:', deviceId);
// Should be 64-character hex string
```

**Test 2: Same Device Re-activation**
1. Activate license on Device A
2. Uninstall app
3. Reinstall app on same Device A
4. Enter same license key
5. Should activate without transfer

**Test 3: Different Device Transfer**
1. Activate license on Device A
2. Install app on Device B (different computer)
3. Enter same license key
4. Should require transfer
5. Confirm transfer
6. Should activate on Device B
7. Try activating on Device A again
8. Should require transfer again (license moved to Device B)

**Test 4: Transfer Limit**
1. Activate license
2. Transfer to Device B
3. Transfer to Device C
4. Transfer to Device D
5. Try transferring to Device E
6. Should show "transfer limit reached" (if limit is 3)

### Database Schema for Device Binding

**licenses table:**
```sql
hardware_hash TEXT,           -- SHA-256 device fingerprint
current_device_id TEXT,       -- Current active device
is_activated BOOLEAN,         -- Has been activated at least once
activated_at DATETIME,        -- First activation timestamp
activation_count INTEGER,     -- Number of activations
transfer_count INTEGER,       -- Number of transfers
last_activated_at DATETIME,   -- Last activation timestamp
last_transfer_at DATETIME,    -- Last transfer timestamp
```

**device_activations table (for Family plans):**
```sql
license_id INTEGER,           -- Foreign key to licenses
hardware_hash TEXT,           -- Device fingerprint
device_name TEXT,             -- Optional device name
activated_at DATETIME,        -- When activated
last_seen_at DATETIME,        -- Last check-in
is_active BOOLEAN,            -- Currently active
UNIQUE(license_id, hardware_hash)  -- One activation per device
```

### Troubleshooting Device Binding

**Issue: Device ID Changes on Same Machine**

**Symptoms:** License requires transfer even on same device

**Causes:**
- Screen resolution changed
- GPU driver updated
- Timezone changed
- OS major update

**Solutions:**
1. Device fingerprint is designed to be stable, but major changes can affect it
2. Users can transfer license (within limit)
3. Consider allowing "same device" if device_id is close (future enhancement)

**Issue: Transfer Limit Reached**

**Symptoms:** User can't transfer license to new device

**Solutions:**
1. Check transfer count in database:
   ```sql
   SELECT transfer_count, last_transfer_at FROM licenses WHERE license_key = 'PERS-XXXX-XXXX-XXXX';
   ```
2. If legitimate (device upgrade), manually reset:
   ```sql
   UPDATE licenses SET transfer_count = 0 WHERE license_key = 'PERS-XXXX-XXXX-XXXX';
   ```
3. Or increase limit in code for specific cases

**Issue: Device ID Not Generating**

**Symptoms:** App can't generate device fingerprint

**Solutions:**
1. Check browser/Electron supports Web Crypto API
2. Verify WebGL is available (for GPU fingerprint)
3. Check console for errors
4. Fallback: Use simpler fingerprint (OS + CPU only)

---

## Step 8: Code Signing

### Windows Code Signing

1. **Obtain certificate:**
   - Purchase from SSL.com, DigiCert, or similar
   - Receive `.pfx` file and password

2. **Add to `.env`:**
   ```env
   CSC_LINK=C:/path/to/certificate.pfx
   CSC_KEY_PASSWORD=your-certificate-password
   ```

3. **Rebuild:**
   ```bash
   npm run dist:win
   ```

4. **Verify signature:**
   - Right-click `.exe` → Properties → Digital Signatures
   - Should show your company name

### macOS Code Signing

1. **Log into Apple Developer:** https://developer.apple.com

2. **Create App-Specific Password:**
   - Go to https://appleid.apple.com
   - Sign in → App-Specific Passwords
   - Generate password for "Local Password Vault"

3. **Get Team ID:**
   - In Apple Developer portal → Membership
   - Copy 10-character Team ID

4. **Add to `.env`:**
   ```env
   APPLE_ID=your-apple-id@email.com
   APPLE_ID_PASSWORD=app-specific-password
   APPLE_TEAM_ID=YOUR_TEAM_ID
   ```

5. **Rebuild:**
   ```bash
   npm run dist:mac
   ```

6. **Verify:**
   - App should notarize automatically
   - Check build logs for "Notarization complete"

---

## Step 9: Production Checklist

### Pre-Launch Checklist

- [ ] **Backend API:**
  - [ ] Server deployed and running
  - [ ] SSL certificate installed
  - [ ] Health endpoint responds
  - [ ] Database tables created
  - [ ] Environment variables set
  - [ ] PM2 auto-start configured

- [ ] **Stripe:**
  - [ ] Products created (Personal $49, Family $79)
  - [ ] API keys configured (LIVE keys, not test)
  - [ ] Webhook endpoint configured
  - [ ] Webhook secret added to `.env`
  - [ ] Test purchase successful

- [ ] **Email Service:**
  - [ ] Brevo SMTP configured
  - [ ] All 4 email templates created
  - [ ] Test emails sent successfully
  - [ ] Email links point to correct download URLs

- [ ] **Downloads:**
  - [ ] All three installers built
  - [ ] ZIP packages created with all docs
  - [ ] Packages uploaded to hosting (GitHub Releases)
  - [ ] Download links tested and working

- [ ] **Code Signing:**
  - [ ] Windows certificate installed and tested
  - [ ] macOS notarization working
  - [ ] Signed installers verified

- [ ] **Testing:**
  - [ ] Purchase flow tested (Personal)
  - [ ] Purchase flow tested (Family)
  - [ ] Trial signup tested
  - [ ] License activation tested
  - [ ] License transfer tested
  - [ ] Offline operation verified
  - [ ] All email templates tested

- [ ] **Documentation:**
  - [ ] User Manual PDF generated
  - [ ] Quick Start Guide created
  - [ ] Privacy Policy included
  - [ ] Terms of Service included
  - [ ] License.txt included

- [ ] **Website:**
  - [ ] Pricing page links to Stripe checkout
  - [ ] Download page working
  - [ ] All links tested

### Launch Day

1. **Switch Stripe to Live Mode:**
   - Update `.env` with live API keys
   - Restart backend: `pm2 restart lpv-api`

2. **Monitor:**
   - Check PM2 logs: `pm2 logs lpv-api`
   - Monitor Stripe webhooks
   - Check email delivery

3. **Announce:**
   - Update website
   - Social media posts
   - Email to mailing list (if any)

---

## Troubleshooting

### Issue: Webhook Not Receiving Events

**Symptoms:** Payments complete but no license keys generated

**Solutions:**
1. Check webhook URL is correct in Stripe dashboard
2. Verify webhook secret matches `.env`
3. Check Nginx logs: `tail -f /var/log/nginx/error.log`
4. Check backend logs: `pm2 logs lpv-api`
5. Test webhook manually in Stripe dashboard

### Issue: Emails Not Sending

**Symptoms:** License keys generated but emails not received

**Solutions:**
1. Test SMTP connection: `node -e "require('./services/email').verifyConnection()"`
2. Check Brevo SMTP credentials
3. Verify sender email is verified in Brevo
4. Check spam folder
5. Review email service logs

### Issue: License Activation Fails

**Symptoms:** App can't activate license key

**Solutions:**
1. Verify API endpoint is accessible: `curl https://api.localpasswordvault.com/health`
2. Check license exists in database
3. Verify device_id format (64-char hex SHA-256)
4. Check device fingerprint generation in app
5. Verify device_id is being sent in request body
6. Check backend logs for errors: `pm2 logs lpv-api`
7. Verify JWT_SECRET is set
8. Check database connection

### Issue: Device Binding Not Working

**Symptoms:** License activates on multiple devices without transfer

**Solutions:**
1. Verify device_id is being generated correctly
2. Check database: `SELECT hardware_hash, current_device_id FROM licenses WHERE license_key = 'PERS-XXXX-XXXX-XXXX';`
3. Verify device_id matches hardware_hash on same device
4. Check activation endpoint logic in `backend/routes/lpv-licenses.js`
5. Test with different devices to ensure binding works

### Issue: Transfer Not Working

**Symptoms:** Can't transfer license to new device

**Solutions:**
1. Check transfer limit hasn't been reached
2. Verify new device_id is different from hardware_hash
3. Check transfer endpoint: `POST /api/lpv/license/transfer`
4. Verify database update: `UPDATE licenses SET hardware_hash = ? WHERE license_key = ?`
5. Check transfer_count in database
6. Review transfer limit configuration

### Issue: App Makes Internet Calls After Activation

**Symptoms:** App tries to connect to internet when it shouldn't

**Solutions:**
1. **Check Network Tab in DevTools:**
   - Open DevTools → Network tab
   - Filter by "Fetch/XHR"
   - After activation, should see ZERO requests
   - If you see requests, identify the source

2. **Verify License Service:**
   - Check `src/utils/licenseService.ts`
   - `activateLicense()` - ONLY called during activation (line 300)
   - `transferLicense()` - ONLY called during transfer (line 401)
   - `getLicenseInfo()` - Should be 100% local (no fetch)

3. **Verify Trial Service:**
   - Check `src/utils/trialService.ts`
   - `getTrialInfo()` - Uses local JWT token parsing (NO fetch)
   - `checkAndHandleExpiration()` - Local date calculations (NO fetch)
   - Periodic checks in App.tsx are LOCAL only (checking localStorage)

4. **Verify Analytics:**
   - Check `src/utils/analyticsService.ts`
   - All methods are NO-OP (empty functions)
   - Should never make network calls

5. **Check for Hidden Calls:**
   - Search codebase for `fetch(`, `axios.`, `XMLHttpRequest`
   - Should only find in `licenseService.ts` (activation/transfer)
   - No other files should have network calls

6. **Verify Environment Config:**
   - Check `src/config/environment.ts`
   - `analyticsEnabled` should be `false`
   - `enableCloudSync` should be `false` (in features)

7. **Test with Network Monitor:**
   - Use browser DevTools Network tab
   - Monitor for 30+ minutes after activation
   - Should see ZERO network requests

### Issue: Downloads Not Working

**Symptoms:** Users can't download ZIP packages

**Solutions:**
1. Verify GitHub Releases are public
2. Check download URLs in email templates
3. Test download links manually
4. Verify ZIP files are not corrupted
5. Check file sizes are reasonable

---

## Support & Maintenance

### Daily Tasks

- Monitor Stripe webhooks for failures
- Check email delivery rates
- Review error logs: `pm2 logs lpv-api --lines 100`

### Weekly Tasks

- Review license activations
- Check trial conversion rates
- Backup database

### Monthly Tasks

- Update dependencies: `npm audit`
- Review server resources
- Check SSL certificate expiration

### Database Backup

Supabase automatically backs up your database. You can also:

1. **Manual backup via Supabase Dashboard:**
   - Go to Database → Backups
   - Click "Download backup"

2. **Automated backups:**
   - Supabase Pro plan includes daily backups
   - Or use pg_dump via cron job:
   ```bash
   0 2 * * * pg_dump $DATABASE_URL > /backup/vault-$(date +\%Y\%m\%d).sql
   ```

---

## Offline Operation Verification

### How to Verify 100% Offline Operation

**Test Procedure:**

1. **Install and activate app with valid license key**
2. **Open browser DevTools → Network tab**
3. **Filter by "Fetch/XHR" or "WS" (WebSocket)**
4. **Disconnect internet completely**
5. **Use app for 30+ minutes:**
   - Open/close app multiple times
   - Add/edit/delete entries
   - Generate passwords
   - Check trial status (if applicable)
   - Export/import data
   - Use all features

6. **Verify Network Tab:**
   - Should show ZERO network requests
   - No failed requests
   - No pending requests

**Expected Behavior:**
- ✅ App works normally offline
- ✅ All features functional
- ✅ No network errors
- ✅ No "connection failed" messages
- ✅ Trial expiration checks work (local JWT parsing)
- ✅ License validation works (local license file)

**Code Verification:**

Search codebase for network calls:
```bash
# Should only find fetch in licenseService.ts (activation/transfer)
grep -r "fetch(" src/
grep -r "axios" src/
grep -r "XMLHttpRequest" src/
```

**Files That Should Have Network Calls:**
- ✅ `src/utils/licenseService.ts` - Lines 300, 401 (activation/transfer ONLY)

**Files That Should NOT Have Network Calls:**
- ❌ `src/utils/trialService.ts` - All local (JWT parsing, localStorage)
- ❌ `src/utils/analyticsService.ts` - All NO-OP (empty functions)
- ❌ `src/utils/storage.ts` - All local (localStorage, IndexedDB)
- ❌ `src/App.tsx` - Periodic checks are local only
- ❌ All component files - No network calls

**Periodic Checks (Local Only):**

The app has periodic checks every 30 seconds for trial expiration, but these are:
- ✅ **100% LOCAL** - Uses JWT token parsing
- ✅ **NO network calls** - Checks localStorage and date calculations
- ✅ **Works offline** - No internet required

**Trial Expiration Check Flow (Offline):**
```
1. App calls trialService.checkAndHandleExpiration()
2. Reads JWT token from localStorage
3. Parses JWT payload (local, no network)
4. Extracts expiry date from token
5. Compares with current date (local calculation)
6. Updates UI if expired (local state)
7. NO network call made
```

---

## Summary

After completing all steps, you will have:

✅ **Fully functional backend API** - Handles purchases, trials, activations  
✅ **Instant license key delivery** - Generated and emailed immediately  
✅ **Professional email templates** - All scenarios covered  
✅ **Complete download packages** - Installers + documentation  
✅ **100% offline operation** - App works without internet after activation  
✅ **All scenarios tested** - Purchase, trial, activation, transfer  

**Your product is ready to sell!** 🚀

---

**Questions?** Contact: support@localpasswordvault.com

**Last Updated:** December 2024

