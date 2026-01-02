# Remaining Developer Tasks

## 🚨 CRITICAL: Connection Error (Red Box) Issue

### Problem Description
Users are seeing a red error box with the message: **"Activation Error: Unable to connect to license server"** when attempting to activate license keys or trial keys. This error appears even when the user has internet connectivity.

### Root Cause Analysis
The error occurs in the license activation flow when the application cannot successfully connect to the backend license server. The current implementation has the following potential issues:

1. **Electron HTTP Request Handler**: The custom HTTP request handler in `electron/main.js` (lines ~1869-2083) attempts to use Electron's `net` module to make requests that bypass browser CORS restrictions. However, there may be:
   - SSL/TLS certificate validation issues
   - Network timeout configurations that are too aggressive
   - Error handling that doesn't properly surface the underlying connection problem
   - DNS resolution failures that aren't being caught or reported correctly

2. **API Client Fallback Logic**: The `apiClient.ts` checks for Electron API availability but may fail to properly fallback to standard `fetch` when Electron API is unavailable, or the Electron API itself may be failing silently.

3. **Error Message Propagation**: While error messages have been improved to show specific network errors (DNS, connection refused, timeout), the underlying connection failures may not be reaching the error handlers properly.

4. **Backend Server Configuration**: The backend server URL configuration may be incorrect, or the backend server may not be properly accessible from the Electron app.

### What Needs Investigation
1. **Verify Backend Server is Running**: Check if `https://server.localpasswordvault.com` (or the configured license server URL) is accessible and responding to health checks
2. **Check SSL Certificate**: Verify the backend SSL certificate is valid and trusted by Electron
3. **Test Network Connection**: Verify the Electron app can actually reach the backend server from a user's machine (not just from development environment)
4. **Review Timeout Settings**: Current timeout is 30 seconds in `apiClient.ts` and 30 seconds in `electron/main.js` - may need adjustment
5. **Error Logging**: Add more detailed logging in `electron/main.js` HTTP handler to capture what's actually failing (currently uses `devError` which may not be visible in production)
6. **Certificate Validation**: Electron's `net` module may be rejecting self-signed certificates or certificates from certain CAs - may need to configure certificate validation bypass or proper certificate chain

### Files to Review
- `electron/main.js` (lines ~1869-2083) - HTTP request handler
- `src/utils/apiClient.ts` - API client with Electron API detection
- `src/utils/licenseService.ts` - License activation logic
- `src/utils/trialService.ts` - Trial activation logic
- `src/config/environment.ts` - License server URL configuration

### Potential Solutions to Try
1. **Add Certificate Validation Override**: In `electron/main.js`, configure `session.defaultSession.setCertificateVerifyProc()` to handle certificate validation
2. **Improve Error Reporting**: Add detailed error logging that works in production (not just dev mode)
3. **Network Diagnostics**: Add a network diagnostic feature to test connectivity before attempting activation
4. **User-Friendly Error Messages**: Provide more actionable error messages (e.g., "Check your firewall settings" or "Your network may be blocking HTTPS connections")
5. **Retry Logic**: Implement exponential backoff retry logic for network failures
6. **Offline Detection**: Detect if the user is actually offline and show a different message

### Status
**NOT FIXED** - The error handling has been improved, but the root cause of why connections are failing has not been identified or resolved.

---

## 📋 Backend Server Deployment - Deploy Updated Code

### What Are "Backend Templates"?
The **backend templates** are the email HTML files that the backend server uses to send emails to users:
- `backend/templates/trial-welcome-email.html` - Email sent when user signs up for trial
- `backend/templates/purchase-confirmation-email.html` - Email sent after purchase
- `backend/templates/bundle-email.html` - Email sent for bundle purchases

### What Was Already Fixed (in Code)
✅ These files have already been updated in the code repository to use `.exe` download links instead of `.zip` links.

### What You Need to Do
**Deploy the updated code to your production server** so the server uses the fixed templates:

1. **SSH into Production Server**:
   ```bash
   ssh root@YOUR-SERVER-IP
   ```

2. **Update Code on Server**:
   ```bash
   cd /var/www/lpv-api  # or wherever your backend is deployed
   git pull  # This will get the updated templates
   ```

3. **Restart Backend Server**:
   ```bash
   pm2 restart lpv-api
   pm2 status  # Verify it's running
   ```

**That's it!** Once you pull the latest code and restart, the server will use the updated templates with `.exe` links.

**Note**: If you're not using git on the server, you'll need to manually upload the 3 template files from `backend/templates/` to your server.

---

## 🧪 Testing & Verification - End-to-End Testing

### Task: Complete End-to-End Testing

**What Needs to be Done**:

1. **End-to-End Purchase Flow**:
   - Test complete purchase flow from website to app activation
   - Verify payment processes through Stripe
   - Verify webhook creates license key in database
   - Verify email is sent with license key and download links
   - Verify download links in email work (point to `.exe` files, not `.zip`)
   - Download and install application from email link
   - Activate license key in app
   - Verify activation succeeds
   - Disconnect internet and verify app works completely offline

2. **Trial Flow Testing**:
   - Request trial on website
   - Verify trial key is received in email
   - Activate trial key in app
   - Verify trial works
   - Verify trial expiration detection works offline

3. **Error Scenario Testing**:
   - Test with invalid license key format
   - Test with non-existent license key
   - Test network failure scenarios (should show appropriate error message)
   - Test device transfer flow
   - Test transfer limit enforcement

4. **Offline Operation Verification** (Critical):
   - After activation, disconnect internet completely
   - Use app for extended period (30+ minutes)
   - Open browser DevTools → Network tab
   - Verify ZERO network requests (check for any Fetch/XHR/WS requests)
   - Restart app while offline
   - Verify app loads and works completely offline

5. **Cross-Platform Testing** (if applicable):
   - Test on Windows (primary platform)
   - Test on macOS (if built)
   - Test on Linux (if built)

---

## 📦 Application Builds - Build and Test Installers

### Task: Build and Verify Application Installers

**What Needs to be Done**:

1. **Windows Build**:
   - Run: `npm run dist:win`
   - Test installer on clean Windows machine (not your development machine)
   - Verify installer creates proper shortcuts
   - Verify app launches correctly after installation
   - Test activation flow with the built installer
   - (Optional) Code sign installer if certificate is available

2. **macOS Build** (if needed):
   - Run: `npm run dist:mac` (requires macOS system or CI/CD)
   - Test DMG on clean macOS machine
   - (Optional) Code sign and notarize if Apple Developer account available

3. **Linux Build** (if needed):
   - Run: `npm run dist:linux` (requires Linux system or CI/CD)
   - Test AppImage on clean Linux machine

4. **Upload to GitHub Releases**:
   - Go to: https://github.com/kwilhelm1967/Vault/releases
   - Create or edit release with tag: `v1.2.0`
   - Upload installer files
   - Verify download links work
   - Test download from different network locations

**Note**: Windows installer filename should be: `Local.Password.Vault.Setup.1.2.0.exe`

---

## 📧 Email Service Verification - Test Email Delivery

### Task: Verify Email Service is Working Correctly

**What Needs to be Done**:

1. **Brevo Configuration Verification**:
   - Verify Brevo API key is correct in backend `.env` file
   - Verify sender email address is verified in Brevo dashboard
   - Test email sending from backend (check backend logs)

2. **Email Template Testing**:
   - Send test trial welcome email
   - Send test purchase confirmation email
   - Verify email content is correct
   - Verify download links in emails work (click them)
   - **Critical**: Verify links point to `.exe` files (not `.zip`) - this confirms templates were deployed correctly

3. **Email Deliverability**:
   - Test emails reach inbox (not spam folder)
   - Test from multiple email providers (Gmail, Outlook, etc.)
   - Verify email formatting renders correctly
   - Check that all images/assets load correctly

---

## 🔍 Monitoring & Error Tracking - Sentry Configuration (Optional)

### Task: Set Up Production Monitoring (Optional but Recommended)

**What Needs to be Done**:

1. **Sentry Configuration**:
   - Create Sentry account at https://sentry.io
   - Create new Node.js project
   - Get DSN from Sentry project settings
   - Add `SENTRY_DSN` to backend `.env` file
   - Verify Sentry integration (test by triggering an error)

2. **Backend Log Monitoring** (if desired):
   - Set up log aggregation service (optional)
   - Verify structured logging is working
   - Monitor for errors in production

3. **Webhook Monitoring**:
   - Monitor Stripe webhook processing in production
   - Set up alerts for webhook failures (if using monitoring service)
   - Verify webhook failure emails are sent to support email

**Note**: This is optional but recommended for production. Backend Sentry does not affect the app's offline operation.

---

## 🌐 DNS & Domain Configuration - Verify Domain Setup

### Task: Verify Domain Configuration

**What Needs to be Done**:

1. **API Domain Verification**:
   - Verify `api.localpasswordvault.com` (or configured API domain) points to backend server
   - Verify SSL certificate is valid and not expired
   - Test health endpoint is accessible: `curl https://api.localpasswordvault.com/health`
   - Should return: `{"status":"ok"}`

2. **Website Domain Verification**:
   - Verify `localpasswordvault.com` is configured correctly
   - Verify SSL certificate is valid and not expired
   - Test website loads correctly

3. **DNS Propagation**:
   - Verify DNS changes have propagated (use DNS checker tools)
   - Test from multiple locations if possible
   - Verify no DNS errors in browser console

4. **Electron App Connection Test**:
   - Test that Electron app can reach the API domain
   - This relates directly to the connection error issue above

---

## ✅ CI/CD Verification - Ensure Tests Pass

### Task: Verify Automated Tests Pass in CI

**What Needs to be Done**:

1. **Check CI Test Results**:
   - Go to GitHub Actions (or your CI/CD platform)
   - Verify unit tests pass
   - Verify e2e tests pass
   - Fix any failing tests if they exist

2. **Review Test Coverage**:
   - Ensure critical paths are covered by tests
   - Add tests for any recent changes if needed

**Note**: Unit tests were recently fixed to properly mock `apiClient`. They should pass, but verify in CI environment.

---

## 🎯 Priority Summary

### Critical (Must Complete):
1. **Fix Connection Error** - Red box error when activating licenses (blocks user activation)
2. **Deploy Backend Code** - Pull latest code to server so updated email templates are used
3. **Verify Backend Server** - Ensure backend is accessible (required for connection error fix)

### High Priority:
4. **End-to-End Testing** - Test complete purchase and activation flow (verify everything works)
5. **Build Verification** - Test Windows installer on clean machine (verify users can install)

### Medium Priority:
6. **Email Service Testing** - Verify emails are sent and received correctly
7. **DNS & Domain Verification** - Ensure domains are properly configured
8. **CI/CD Verification** - Ensure automated tests pass

### Low Priority (Can Complete After Launch):
9. **Monitoring Setup** - Sentry configuration (optional but recommended)
10. **Cross-Platform Builds** - macOS/Linux builds (if needed)

---

## 📚 Reference Documents

- `docs/DEPLOY_TO_LINODE.md` - Backend deployment guide
- `docs/DEVELOPER_HANDOFF.md` - Complete deployment checklist
- `docs/PRODUCTION_UAT_QUICK_START.md` - Quick start for UAT testing
- `backend/env.example` - Environment variables reference
- `backend/README.md` - Backend API documentation

---

**Last Updated**: Based on current codebase state
**Note**: Focus on completing Critical and High Priority items before launch
