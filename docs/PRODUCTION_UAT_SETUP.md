# Production UAT Setup - Test as a Real User

## 🎯 Goal

Test the complete user flow in production:
1. Download the app (as a real user would)
2. Request a trial key
3. Receive email with trial key
4. Activate trial in the app
5. Use the app

---

## ✅ What I Fixed (Technical)

1. **Updated `.env` file** for production:
   - `VITE_LICENSE_SERVER_URL=https://server.localpasswordvault.com`
   - `VITE_APP_MODE=production`

2. **All download URLs** point to GitHub Releases (production)

3. **All email templates** use production URLs

4. **All API calls** will use production backend URL

---

## 📋 What You Must Do

### Step 1: Deploy Backend to Production Server

**The backend MUST be running on your production server:**

1. **SSH into your production server** (Linode/VPS)

2. **Deploy backend code:**
   ```bash
   cd /var/www/lpv-api  # or wherever you deploy
   git pull  # or upload code
   npm install
   ```

3. **Create/update `backend/.env` file** with production values:
   ```env
   NODE_ENV=production
   PORT=3001
   
   # Database
   SUPABASE_URL=https://kzsbotkuhoigmoqinkiz.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   
   # License Signing
   LICENSE_SIGNING_SECRET=your-64-char-secret
   
   # Stripe (Production)
   STRIPE_SECRET_KEY=sk_live_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   STRIPE_PRICE_PERSONAL=price_1STRWdI1GYJUOJOHtK889VkU
   STRIPE_PRICE_FAMILY=price_1STRUEI1GYJUOJOHhe3o55tv
   STRIPE_PRICE_LLV_PERSONAL=price_1SjRBuI1GYJUOJOHXpFt4OwD
   STRIPE_PRICE_LLV_FAMILY=price_1SjRCVI1GYJUOJOHvpbaoM9U
   
   # Email
   BREVO_API_KEY=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
   FROM_EMAIL=noreply@localpasswordvault.com
   SUPPORT_EMAIL=support@localpasswordvault.com
   
   # Website
   WEBSITE_URL=https://localpasswordvault.com
   
   # Admin
   ADMIN_API_KEY=XOhYqZH1sCM70dWIyjzrgLQVGxnfePRv4JK2ATNklDEi39SFwop8t6acB5Uumb
   ```

4. **Start backend with PM2:**
   ```bash
   pm2 start server.js --name lpv-api
   pm2 save
   ```

5. **Verify backend is running:**
   ```bash
   curl https://server.localpasswordvault.com/health
   ```
   Should return: `{"status": "ok"}`

### Step 2: Configure Domain/DNS

**Make sure your domain points to the backend:**

1. **DNS Configuration:**
   - `server.localpasswordvault.com` → Your backend server IP
   - Or `api.localpasswordvault.com` → Your backend server IP

2. **SSL Certificate:**
   - Install SSL certificate (Let's Encrypt recommended)
   - Backend should be accessible via HTTPS

3. **Test the URL:**
   - Open: `https://server.localpasswordvault.com/health`
   - Should show: `{"status": "ok"}`

### Step 3: Build and Distribute the App

**For UAT, you need the app built with production config:**

1. **Build the app:**
   ```bash
   npm run build:prod
   npm run dist:win  # For Windows
   # Or npm run dist:all for all platforms
   ```

2. **Upload to GitHub Releases:**
   - Go to: https://github.com/kwilhelm1967/Vault/releases
   - Create/edit release `V1.2.0`
   - Upload the built installer: `Local.Password.Vault.Setup.1.2.0.exe`
   - **Publish the release** (not draft!)

3. **Verify download works:**
   - Test: `https://github.com/kwilhelm1967/Vault/releases/download/V1.2.0/Local.Password.Vault.Setup.1.2.0.exe`
   - Should download the installer

### Step 4: Test as a Real User

**Now test the complete flow:**

1. **Download the app:**
   - Go to your website: `https://localpasswordvault.com`
   - Click "Start Free Trial" or "Download"
   - Download the installer from GitHub

2. **Install the app:**
   - Run the installer
   - Install the app

3. **Request trial key:**
   - Open the app
   - Click "Start Free Trial"
   - Enter your email address
   - Submit

4. **Check email:**
   - Check inbox for email from `noreply@localpasswordvault.com`
   - Check spam folder if not in inbox
   - Copy the trial key from email

5. **Activate trial:**
   - Paste trial key in the app
   - Click "Activate"
   - Should activate successfully

6. **Use the app:**
   - Create master password
   - Add passwords
   - Test all features

---

## 🔍 Verification Checklist

Before starting UAT, verify:

- [ ] Backend is deployed and running on production server
- [ ] Backend health check works: `https://server.localpasswordvault.com/health`
- [ ] Backend `.env` has all production values
- [ ] Domain DNS points to backend server
- [ ] SSL certificate is installed (HTTPS works)
- [ ] App is built with production config
- [ ] Installer is uploaded to GitHub Releases
- [ ] GitHub release is **Published** (not draft)
- [ ] Download link works: `https://github.com/kwilhelm1967/Vault/releases/download/V1.2.0/Local.Password.Vault.Setup.1.2.0.exe`
- [ ] Email service is configured (Brevo API key)
- [ ] Frontend `.env` has production backend URL

---

## 🚨 Common Issues

### Issue 1: "Unable to connect to license server"

**Cause:** Backend not running or wrong URL

**Fix:**
1. Verify backend is running: `curl https://server.localpasswordvault.com/health`
2. Check DNS points to correct server
3. Check SSL certificate is valid
4. Check firewall allows port 443 (HTTPS)

### Issue 2: Trial email not received

**Cause:** Email service not configured or backend not running

**Fix:**
1. Check backend is running on production server
2. Verify `BREVO_API_KEY` is set in backend `.env`
3. Check Brevo dashboard for email status
4. Check spam folder

### Issue 3: Download 404 error

**Cause:** Release not published or wrong filename

**Fix:**
1. Go to GitHub Releases
2. Make sure release is **Published** (not draft)
3. Verify filename matches exactly: `Local.Password.Vault.Setup.1.2.0.exe`
4. Test download link directly

---

## 📝 Quick Test Commands

**Test backend health:**
```bash
curl https://server.localpasswordvault.com/health
```

**Test trial signup (from command line):**
```bash
curl -X POST https://server.localpasswordvault.com/api/trial/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Test license activation endpoint:**
```bash
curl -X POST https://server.localpasswordvault.com/api/lpv/license/activate \
  -H "Content-Type: application/json" \
  -d '{"license_key":"TEST-XXXX-XXXX-XXXX","device_id":"test-device"}'
```

---

## 🎯 UAT Test Scenarios

### Scenario 1: New User Trial Flow
1. Download app from website
2. Install app
3. Request trial key
4. Receive email
5. Activate trial
6. Use app for 7 days
7. Trial expires
8. Purchase license

### Scenario 2: Direct Purchase Flow
1. Go to pricing page
2. Click "Buy Now"
3. Complete Stripe checkout
4. Receive license key email
5. Download app
6. Activate license
7. Use app

### Scenario 3: Bundle Purchase Flow
1. Go to bundle page
2. Purchase Family Protection Bundle
3. Receive email with multiple keys
4. Download both apps
5. Activate LPV with one key
6. Activate LLV with another key

---

**Last Updated:** After configuring for production UAT
