# Production UAT - Quick Start Guide

## ✅ What's Already Fixed

- ✅ `.env` file configured for production
- ✅ Backend URL set to: `https://server.localpasswordvault.com`
- ✅ App mode set to: `production`
- ✅ All download URLs point to GitHub Releases
- ✅ All email templates use production URLs

---

## 📋 3 Steps to Start UAT

### Step 1: Deploy Backend to Production

**On your production server (Linode/VPS):**

```bash
# 1. SSH into server
ssh your-server

# 2. Go to backend directory
cd /var/www/lpv-api  # or your path

# 3. Update code
git pull  # or upload code

# 4. Install dependencies
npm install

# 5. Create/update .env file (see below)

# 6. Start with PM2
pm2 start server.js --name lpv-api
pm2 save

# 7. Verify it's running
curl https://server.localpasswordvault.com/health
```

**Backend `.env` file should have:**
```env
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://kzsbotkuhoigmoqinkiz.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
LICENSE_SIGNING_SECRET=your-64-char-secret
BREVO_API_KEY=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
FROM_EMAIL=noreply@localpasswordvault.com
SUPPORT_EMAIL=support@localpasswordvault.com
WEBSITE_URL=https://localpasswordvault.com
# ... all other production values
```

### Step 2: Build and Upload App

**On your local machine:**

```bash
# 1. Build for production
npm run build:prod
npm run dist:win  # For Windows installer

# 2. Go to GitHub Releases
# https://github.com/kwilhelm1967/Vault/releases

# 3. Create/edit release V1.2.0

# 4. Upload installer: Local.Password.Vault.Setup.1.2.0.exe

# 5. IMPORTANT: Click "Publish release" (not draft!)
```

### Step 3: Test as Real User

1. **Go to your website:** `https://localpasswordvault.com`
2. **Click "Start Free Trial"**
3. **Enter your email**
4. **Download the app** (from GitHub Releases)
5. **Install the app**
6. **Open the app**
7. **Request trial key** (if not already received)
8. **Check email** for trial key
9. **Activate trial** in the app
10. **Test the app**

---

## 🔍 Quick Verification

**Before starting UAT, verify:**

1. **Backend is running:**
   ```
   curl https://server.localpasswordvault.com/health
   ```
   Should return: `{"status": "ok"}`

2. **Download works:**
   ```
   https://github.com/kwilhelm1967/Vault/releases/download/V1.2.0/Local.Password.Vault.Setup.1.2.0.exe
   ```
   Should download the file

3. **Release is published:**
   - Go to GitHub Releases
   - Verify release says "Published" (not "Draft")

---

## 🚨 If Something Doesn't Work

### Backend not responding?
- Check PM2: `pm2 status`
- Check logs: `pm2 logs lpv-api`
- Verify DNS points to server
- Check SSL certificate

### Email not received?
- Check backend logs: `pm2 logs lpv-api`
- Check Brevo dashboard
- Check spam folder
- Verify `BREVO_API_KEY` in backend `.env`

### Download 404?
- Verify release is **Published** (not draft)
- Check filename matches exactly
- Test download link directly

---

**That's it!** Once backend is deployed and app is uploaded, you can test the full user flow.
