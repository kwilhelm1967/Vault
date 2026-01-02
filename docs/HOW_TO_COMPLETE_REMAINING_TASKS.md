# How to Complete Remaining Tasks - Step-by-Step Guide

This guide provides detailed, actionable steps for completing each remaining task.

---

## 📋 Task 1: Deploy Backend Code - Update Email Templates on Server

### What This Does
Updates the email templates on your production server so they use `.exe` download links instead of `.zip` links.

### Step-by-Step Instructions

#### Option A: Using Git (Recommended - Fastest)

1. **Open PowerShell on your computer**

2. **Connect to your server via SSH**:
   ```powershell
   ssh root@YOUR-SERVER-IP
   ```
   (Replace `YOUR-SERVER-IP` with your actual server IP address)

3. **Navigate to backend directory**:
   ```bash
   cd /var/www/lpv-api/backend
   ```
   (Or wherever your backend code is located)

4. **Check current status**:
   ```bash
   git status
   ```
   (This shows if there are any local changes)

5. **Pull latest code from GitHub**:
   ```bash
   git pull origin main
   ```
   (This downloads the updated template files)

6. **Verify files were updated** (optional):
   ```bash
   grep -n "Local.Password.Vault.Setup.1.2.0.exe" templates/trial-welcome-email.html
   ```
   (Should show line 214 with the .exe link)

7. **Restart the backend server**:
   ```bash
   pm2 restart lpv-api
   ```

8. **Verify server is running**:
   ```bash
   pm2 status
   ```
   (Should show `lpv-api` as "online" with green status)

9. **Check server logs** (optional):
   ```bash
   pm2 logs lpv-api --lines 20
   ```
   (Look for "Server running" or any error messages)

10. **Exit SSH**:
    ```bash
    exit
    ```

#### Option B: Manual Upload (If Git Not Available on Server)

1. **On your local computer**, locate these 3 files:
   - `backend/templates/trial-welcome-email.html`
   - `backend/templates/purchase-confirmation-email.html`
   - `backend/templates/bundle-email.html`

2. **Connect to server via SFTP** (using FileZilla, WinSCP, or similar):
   - Host: Your server IP address
   - Username: `root`
   - Password: Your server password
   - Port: `22`

3. **Navigate to**: `/var/www/lpv-api/backend/templates/`

4. **Backup old files first** (in case you need to revert):
   - Rename `trial-welcome-email.html` to `trial-welcome-email.html.backup`
   - Rename `purchase-confirmation-email.html` to `purchase-confirmation-email.html.backup`
   - Rename `bundle-email.html` to `bundle-email.html.backup`

5. **Upload the 3 new files** from your local computer to the server

6. **SSH into server** and restart:
   ```bash
   ssh root@YOUR-SERVER-IP
   pm2 restart lpv-api
   pm2 status
   ```

### How to Verify It Worked

1. **Send a test trial email** (if you have access to trigger one)
2. **Check the email** and verify the Windows download link points to:
   ```
   https://github.com/kwilhelm1967/Vault/releases/download/V1.2.0/Local.Password.Vault.Setup.1.2.0.exe
   ```
3. **Click the link** to ensure it downloads the `.exe` file (not a `.zip` file)

---

## 🧪 Task 2: End-to-End Testing

### What This Tests
Verifies the complete user journey from purchase to app activation works correctly.

### Step-by-Step Instructions

#### Test 1: Complete Purchase Flow

1. **Go to your website**: `https://localpasswordvault.com`

2. **Navigate to pricing page**

3. **Click "Buy Now" for Personal Vault** (or any product)

4. **Complete Stripe checkout**:
   - Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

5. **After payment completes**, verify:
   - ✅ You're redirected to success page
   - ✅ License key is displayed
   - ✅ Download links are shown

6. **Check your email**:
   - ✅ Email is received (may take a few seconds)
   - ✅ Email contains license key
   - ✅ Email contains download links
   - ✅ Windows download link points to `.exe` file (not `.zip`)

7. **Download and install the app**:
   - Click the Windows download link in the email
   - Save the `.exe` file
   - Run the installer
   - Complete installation

8. **Open the installed app**

9. **Activate license**:
   - Enter the license key from email
   - Click "Activate"
   - ✅ Verify activation succeeds (no error messages)

10. **Test offline operation**:
    - Disconnect your internet (unplug Ethernet or disable WiFi)
    - Use the app for 30+ minutes
    - Add/edit/delete passwords
    - ✅ Verify everything works without internet

#### Test 2: Trial Flow

1. **Go to website**: `https://localpasswordvault.com`

2. **Click "Start Free Trial"** (or similar button)

3. **Enter your email address**

4. **Submit trial request**

5. **Check your email**:
   - ✅ Trial welcome email is received
   - ✅ Email contains trial key (format: `TRIA-XXXX-XXXX-XXXX-XXXX`)

6. **Download and install the app** (if not already installed)

7. **Open the app and activate trial**:
   - Enter the trial key from email
   - Click "Activate"
   - ✅ Verify trial activation succeeds

8. **Verify trial works**:
   - Create passwords
   - Access vault
   - ✅ Everything works

9. **Test offline with trial**:
   - Disconnect internet
   - Use app for 30+ minutes
   - ✅ App works offline

#### Test 3: Error Scenarios

1. **Invalid License Key Format**:
   - Open app
   - Enter invalid key: `INVALID-123`
   - Click "Activate"
   - ✅ Verify appropriate error message is shown

2. **Non-existent License Key**:
   - Enter valid format but non-existent key: `PERS-0000-0000-0000`
   - Click "Activate"
   - ✅ Verify error message says key not found

3. **Network Failure**:
   - Disconnect internet
   - Try to activate a license key
   - ✅ Verify network error message is shown

#### Test 4: Offline Operation Verification (Critical)

1. **Activate a license** (purchase or trial)

2. **Disconnect internet completely**:
   - Unplug Ethernet cable, OR
   - Turn off WiFi, OR
   - Disable network adapter in Windows

3. **Open browser DevTools** (in the Electron app):
   - Press `F12` or `Ctrl+Shift+I`
   - Go to "Network" tab
   - Make sure it's recording (red circle button should be active)

4. **Use the app for 30+ minutes**:
   - Create passwords
   - Edit passwords
   - Delete passwords
   - Search passwords
   - Export passwords
   - Import passwords
   - Change settings

5. **Check Network tab**:
   - ✅ Should show ZERO requests (no Fetch, XHR, or WS requests)
   - If you see any network requests, note what they are

6. **Restart the app while offline**:
   - Close the app completely
   - Reopen the app
   - ✅ App should load without errors
   - ✅ All passwords should be accessible

7. **Reconnect internet**:
   - ✅ App should continue working (no change)

---

## 📦 Task 3: Build and Test Application Installers

### What This Does
Creates the Windows installer file that users will download and install.

### Step-by-Step Instructions

#### Build Windows Installer

1. **Open PowerShell in your project directory**:
   ```powershell
   cd C:\Users\kelly\OneDrive\Desktop\Vault-Main\LocalPasswordVault
   ```

2. **Ensure dependencies are installed**:
   ```powershell
   npm install
   ```

3. **Build the production bundle**:
   ```powershell
   npm run build:prod
   ```
   (This creates optimized production files in `dist/` folder)

4. **Build Windows installer**:
   ```powershell
   npm run dist:win
   ```
   (This may take several minutes - be patient)

5. **Find the installer**:
   - Location: `release/` folder in your project
   - Filename should be: `Local Password Vault Setup 1.2.0-x64.exe` or similar
   - Note: Based on `electron-builder.json`, it may create a portable `.exe` instead

6. **Check electron-builder.json configuration**:
   - Open `electron-builder.json`
   - Look at line 84-90 (Windows configuration)
   - Check if it says `"target": "portable"` or `"target": "nsis"`
   - If you need an installer (NSIS), you may need to change this to `"nsis"`

#### Test Installer on Clean Machine

1. **Option A: Use a VM (Recommended)**:
   - Create a Windows VM (Hyper-V, VirtualBox, or VMware)
   - Install a fresh Windows instance
   - Copy the installer to the VM
   - Run the installer

2. **Option B: Use a different Windows computer**:
   - Copy installer to USB drive
   - Transfer to clean Windows machine
   - Run installer

3. **During installation, verify**:
   - ✅ Installer runs without errors
   - ✅ Installation completes successfully
   - ✅ Shortcuts are created on desktop/start menu
   - ✅ App appears in Start Menu under "Local Password Vault"

4. **After installation, verify**:
   - ✅ App launches when clicked
   - ✅ App opens without errors
   - ✅ You can create a vault/master password
   - ✅ License activation screen appears
   - ✅ Activation flow works (use test license key)

#### Upload to GitHub Releases

1. **Go to GitHub**:
   - Navigate to: https://github.com/kwilhelm1967/Vault/releases

2. **Create or Edit Release**:
   - Click "Draft a new release" (or edit existing V1.2.0 release)
   - Tag: `v1.2.0` (must match exactly)
   - Title: `Version 1.2.0` (or similar)

3. **Upload Installer**:
   - Click "Attach binaries by dropping them here or selecting them"
   - Select the installer file from `release/` folder
   - Wait for upload to complete

4. **Verify Filename**:
   - GitHub will show the uploaded file
   - Make sure filename is correct (should be something like `Local.Password.Vault.Setup.1.2.0.exe`)

5. **Publish Release**:
   - Click "Publish release" (NOT "Save draft")
   - Wait for it to publish

6. **Test Download Link**:
   - After publishing, test the download URL:
   ```
   https://github.com/kwilhelm1967/Vault/releases/download/v1.2.0/FILENAME.exe
   ```
   (Replace `FILENAME.exe` with the actual filename shown on GitHub)

7. **Verify Direct Download**:
   - Open a new browser window (or incognito mode)
   - Paste the download URL
   - ✅ File should download immediately
   - ✅ No 404 error

---

## 📧 Task 4: Email Service Verification

### What This Tests
Verifies that emails are sent correctly and contain the right information.

### Step-by-Step Instructions

#### Verify Brevo Configuration

1. **Check backend `.env` file** (on your server):
   ```bash
   ssh root@YOUR-SERVER-IP
   cd /var/www/lpv-api/backend
   cat .env | grep BREVO
   ```
   (Should show `BREVO_API_KEY=xkeysib-...`)

2. **Verify in Brevo Dashboard**:
   - Go to: https://app.brevo.com
   - Login to your account
   - Go to: Settings → SMTP & API → API Keys
   - ✅ Verify API key exists and is active

3. **Verify Sender Email**:
   - In Brevo Dashboard: Settings → Senders & IP
   - ✅ Verify `noreply@localpasswordvault.com` is verified
   - If not verified, click "Verify" and follow instructions

#### Test Email Sending

1. **SSH into server**:
   ```bash
   ssh root@YOUR-SERVER-IP
   cd /var/www/lpv-api/backend
   ```

2. **Check backend logs** (to see if emails are being sent):
   ```bash
   pm2 logs lpv-api --lines 50
   ```
   (Look for email-related log messages)

3. **Trigger a test email** (options):

   **Option A: Request a trial**:
   - Go to website
   - Request a trial with your email
   - Check if email is received

   **Option B: Make a test purchase** (if using Stripe test mode):
   - Complete a test purchase
   - Check if purchase confirmation email is received

   **Option C: Use backend API directly** (advanced):
   ```bash
   curl -X POST https://api.localpasswordvault.com/api/trial/request \
     -H "Content-Type: application/json" \
     -d '{"email":"your-email@example.com"}'
   ```

#### Verify Email Content

1. **Check your email inbox** (not spam folder)

2. **Open the email** (trial welcome or purchase confirmation)

3. **Verify email content**:
   - ✅ Email is properly formatted (not broken HTML)
   - ✅ Images load correctly
   - ✅ Links are clickable
   - ✅ License key/trial key is clearly visible

4. **Verify download links**:
   - ✅ Windows download link exists
   - ✅ Link points to: `https://github.com/kwilhelm1967/Vault/releases/download/V1.2.0/Local.Password.Vault.Setup.1.2.0.exe`
   - ✅ Link is clickable and works
   - ✅ Download starts (not 404 error)

5. **Test from multiple email providers**:
   - Send to Gmail account
   - Send to Outlook account
   - ✅ Verify emails reach inbox (not spam)
   - ✅ Verify formatting looks correct in both

---

## 🌐 Task 5: DNS & Domain Verification

### What This Verifies
Ensures your domains are properly configured and accessible.

### Step-by-Step Instructions

#### Verify API Domain

1. **Test health endpoint from your computer**:
   ```powershell
   curl https://api.localpasswordvault.com/health
   ```
   (Should return: `{"status":"ok"}`)

2. **Or use browser**:
   - Go to: `https://api.localpasswordvault.com/health`
   - ✅ Should show: `{"status":"ok"}`

3. **Check SSL certificate**:
   - In browser, click the padlock icon next to the URL
   - Click "Certificate" or "Connection is secure"
   - ✅ Verify certificate is valid
   - ✅ Verify it's not expired
   - ✅ Verify issuer is trusted (Let's Encrypt, etc.)

4. **Test from different network** (optional):
   - Use your phone's mobile data
   - Or use a different WiFi network
   - Try accessing: `https://api.localpasswordvault.com/health`
   - ✅ Should work from any network

#### Verify Website Domain

1. **Visit website**: `https://localpasswordvault.com`

2. **Verify site loads**:
   - ✅ Page loads without errors
   - ✅ No SSL warnings
   - ✅ All images/assets load

3. **Check SSL certificate**:
   - Click padlock icon in browser
   - ✅ Certificate is valid and not expired

#### Test DNS Propagation (If You Made Changes)

1. **Use online DNS checker**:
   - Go to: https://www.whatsmydns.net
   - Enter: `api.localpasswordvault.com`
   - Select record type: `A`
   - Check from multiple locations
   - ✅ All locations should resolve to your server IP

2. **Or use command line**:
   ```powershell
   nslookup api.localpasswordvault.com
   ```
   (Should show your server's IP address)

#### Test Electron App Connection (If Possible)

1. **Build and install the app** (see Task 3)

2. **Open the app**

3. **Try to activate a license key**

4. **Check if connection succeeds**:
   - ✅ Activation should work (if backend is accessible)
   - ❌ If it fails with connection error, this relates to Task 1 (Connection Error)

---

## ✅ Task 6: CI/CD Verification - Check Tests Pass

### What This Verifies
Ensures automated tests pass in the CI environment.

### Step-by-Step Instructions

1. **Go to GitHub**:
   - Navigate to: https://github.com/kwilhelm1967/Vault

2. **Check Actions Tab**:
   - Click "Actions" tab at the top
   - Look for recent workflow runs
   - Click on the most recent run

3. **Check Test Results**:
   - Look for workflow named "Tests & Quality" or similar
   - ✅ Unit tests should show green checkmark (passed)
   - ✅ E2E tests should show green checkmark (passed)

4. **If Tests Failed**:
   - Click on the failed workflow
   - Read the error messages
   - Note which test failed and why
   - Share this information with the developer

5. **Check Test Output** (optional):
   - Click on the test job (e.g., "unit-tests")
   - Expand the test output
   - Look for specific test failures
   - Note any error messages

### What to Look For

- ✅ All tests pass (green checkmarks)
- ❌ Any test failures (red X marks)
- ⚠️ Tests are running but taking a long time (may indicate performance issue)

---

## 🔍 Task 7: Monitoring Setup - Sentry Configuration (Optional)

### What This Does
Sets up error tracking for the backend so you can see errors in production.

### Step-by-Step Instructions

1. **Create Sentry Account**:
   - Go to: https://sentry.io/signup/
   - Sign up for a free account
   - Complete email verification

2. **Create New Project**:
   - After login, click "Create Project"
   - Select platform: **Node.js**
   - Project name: `Local Password Vault Backend`
   - Click "Create Project"

3. **Get DSN**:
   - After project creation, Sentry shows "Configure SDK"
   - Copy the DSN (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)
   - Save this somewhere safe

4. **Add DSN to Backend**:
   - SSH into server:
     ```bash
     ssh root@YOUR-SERVER-IP
     cd /var/www/lpv-api/backend
     nano .env
     ```
   - Add this line:
     ```env
     SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
     ```
     (Replace with your actual DSN)
   - Save: `Ctrl+X`, then `Y`, then `Enter`

5. **Restart Backend**:
   ```bash
   pm2 restart lpv-api
   ```

6. **Test Sentry** (optional - to verify it works):
   - In Sentry dashboard, go to your project
   - Try to trigger a test error (this requires backend access)
   - Or wait for a real error to occur
   - ✅ Errors should appear in Sentry dashboard

### Note
This is optional. The backend will work fine without Sentry, but it helps you see errors in production.

---

## 📝 Quick Checklist

Use this to track your progress:

- [ ] **Backend Templates Deployed**: Updated templates on server, server restarted
- [ ] **Purchase Flow Tested**: Complete purchase → email → download → install → activate → offline test
- [ ] **Trial Flow Tested**: Request trial → receive email → activate → use app → offline test
- [ ] **Error Scenarios Tested**: Invalid keys, network failures, etc.
- [ ] **Offline Operation Verified**: App works 30+ minutes offline, zero network requests
- [ ] **Windows Installer Built**: Installer created and tested on clean machine
- [ ] **Installer Uploaded to GitHub**: Release created, file uploaded, download link works
- [ ] **Email Service Verified**: Emails sent, received, links work, formatting correct
- [ ] **API Domain Verified**: Health endpoint works, SSL valid
- [ ] **Website Domain Verified**: Site loads, SSL valid
- [ ] **CI/CD Tests Verified**: All tests pass in GitHub Actions
- [ ] **Sentry Configured** (optional): DSN added, errors visible in dashboard

---

## 🚨 Important Notes

1. **Connection Error**: The red box connection error cannot be fixed by following steps - it requires code debugging and is documented separately.

2. **Backend Server Access**: Most tasks require SSH access to your server. If you don't have this, you'll need to coordinate with your developer.

3. **Testing Takes Time**: End-to-end testing can take several hours. Plan accordingly.

4. **Clean Machine Testing**: Testing on a clean machine is critical - your development machine may have cached data or configurations that mask issues.

5. **Save Your Work**: Before making changes on the server, always backup files first.

---

**Good luck!** If you encounter issues following these steps, note them down for the developer.
