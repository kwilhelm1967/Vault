# Deployment Tasks

**📚 READ FIRST:** Before starting work, please read:
1. `docs/DEVELOPER_ONBOARDING.md` - Essential practical knowledge
2. `DEVELOPER_SKILLS_REQUIREMENTS.md` - Skills assessment
3. `docs/ARCHITECTURE.md` - System design overview

**Note:** This system uses HMAC-SHA256 signed license files (not JWT tokens) for offline validation.

**100% Offline Promise:** After license activation, the user's application sends ZERO data to any external service. No APIs, no tracking, no telemetry, no data collection. All validation is local.

---

## Phase 1: Backend Deployment

### 1.1 Deploy Backend to Server
- [ ] SSH into production server (Linode/VPS)
- [ ] Clone or upload backend code to `/var/www/lpv-api`
- [ ] Install dependencies: `npm install`
- [ ] Create `.env` file with all required variables (see `backend/env.example`)
- [ ] Start with PM2: `pm2 start server.js --name lpv-api`
- [ ] Enable auto-start: `pm2 startup` and `pm2 save`

**Environment Variables Needed:**
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
SENTRY_DSN=<sentry-dsn-optional>
```

**Generate LICENSE_SIGNING_SECRET:**
```bash
openssl rand -hex 32
```

---

### 1.2 Configure Cloudflare
- [ ] Set up Cloudflare DNS for API domain (api.localpasswordvault.com)
- [ ] Configure SSL/TLS in Cloudflare (Full or Full Strict mode)
- [ ] Set up Cloudflare proxy/load balancer if needed
- [ ] Test health endpoint: `curl https://api.localpasswordvault.com/health`

---

### 1.3 Database Setup
- [ ] Verify Supabase project exists
- [ ] Run database schema: Execute `backend/database/schema.sql` in Supabase SQL Editor
- [ ] Get connection details:
  - Project URL (from Supabase Settings → API)
  - Service Role Key (NOT anon key)
- [ ] Add to backend `.env` file
- [ ] Test connection from backend server

---

## Phase 2: Payment and Email Configuration

### 2.1 Stripe Configuration
- [ ] Create Stripe products:
  - Personal Vault ($49) - Get Price ID
  - Family Vault ($79) - Get Price ID
  - LLV Personal ($49) - Get Price ID
  - LLV Family ($129) - Get Price ID
- [ ] Configure Stripe Webhook:
  - Add endpoint: `https://api.localpasswordvault.com/api/webhooks/stripe`
  - Select event: `checkout.session.completed`
  - Copy webhook signing secret
  - Add to backend `.env` as `STRIPE_WEBHOOK_SECRET`
- [ ] Switch to Live Mode:
  - Replace test keys with live keys in backend `.env`
  - Update frontend environment with live publishable key
- [ ] Test Webhook:
  - Send test event from Stripe dashboard
  - Verify webhook received and processed
  - Check backend logs for webhook processing

---

### 2.2 Email Service (Brevo)
- [ ] Create/verify Brevo account
- [ ] Generate API key with "Send emails" permission
- [ ] Verify sender email address in Brevo
- [ ] Add API key to backend `.env` as `BREVO_API_KEY`
- [ ] Test email sending

---

## Phase 3: Application Builds

### 3.1 Build Applications

**Windows:**
- [ ] Run: `npm run dist:win`
- [ ] Test installer on clean Windows machine
- [ ] (Optional) Code sign installer if certificate available

**macOS:**
- [ ] Run: `npm run dist:mac`
- [ ] Test DMG on clean macOS machine
- [ ] (Optional) Code sign and notarize if Apple Developer account available

**Linux:**
- [ ] Run: `npm run dist:linux`
- [ ] Test AppImage on clean Linux machine

---

### 3.2 Create Download Packages

**Package Location:** All download packages are stored in the `download-packages/` directory at the project root.

**Package Script:** `scripts/create-download-packages.ps1` - Automatically creates ZIP packages for all available installers.

- [x] Create ZIP package for Windows ✅ **COMPLETED**
  - **Location:** `download-packages/Local-Password-Vault-Windows-1.2.0.zip`
  - **Status:** Created and verified
  - **Contains:** 
    - `Local Password Vault Setup 1.2.0.exe` (installer)
    - `README.txt` (installation instructions)
    - `USER_MANUAL.md` (complete user guide)
    - `QUICK_START_GUIDE.md` (quick start instructions)
    - `TROUBLESHOOTING_GUIDE.md` (troubleshooting help)
  - **To recreate:** Run `.\scripts\create-download-packages.ps1` (requires installer in `release/` folder)

- [ ] Create ZIP package for macOS ⚠️ **REQUIRES macOS BUILD**
  - **Status:** Pending - Installer must be built on macOS system or via CI/CD
  - **Steps:**
    1. Build macOS installer: `npm run dist:mac` (on macOS system)
    2. Run package script: `.\scripts\create-download-packages.ps1`
    3. **Location:** `download-packages/Local-Password-Vault-macOS-1.2.0.zip`
  - **Note:** Cannot be built on Windows. Requires macOS system or GitHub Actions/CI.

- [ ] Create ZIP package for Linux ⚠️ **REQUIRES LINUX BUILD**
  - **Status:** Pending - Installer must be built on Linux system or via CI/CD
  - **Steps:**
    1. Build Linux installer: `npm run dist:linux` (on Linux system)
    2. Run package script: `.\scripts\create-download-packages.ps1`
    3. **Location:** `download-packages/Local-Password-Vault-Linux-1.2.0.zip`
  - **Note:** Cannot be built on Windows. Requires Linux system or GitHub Actions/CI.
- [ ] Host packages:
  - Upload ZIP files to GitHub Releases
    - Go to: https://github.com/kwilhelm1967/Vault/releases
    - Create new release (tag: `v1.2.0`)
    - Upload ZIP files as release assets
  - Get download URLs from GitHub Releases
  - Update email templates with download URLs:
    - `backend/templates/purchase-confirmation-email.html`
    - `backend/templates/bundle-email.html`
    - `backend/templates/trial-welcome-email.html`

---

## Phase 4: Testing and Verification

### 4.1 End-to-End Purchase Test

**Single Purchase Test:**
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

**Bundle Purchase Test:**
- [ ] Purchase bundle (2 products)
- [ ] Verify multiple license keys in email
- [ ] Verify success page shows all keys
- [ ] Activate first key
- [ ] Activate second key
- [ ] Verify both keys work independently

**Trial Flow Test:**
- [ ] Sign up for trial on website
- [ ] Verify trial key received in email
- [ ] Activate trial key in app
- [ ] Verify trial works
- [ ] Verify trial expiration detected offline

---

### 4.2 Error Scenario Testing

**Invalid License Key:**
- [ ] Enter invalid format key
- [ ] Enter non-existent key
- [ ] Verify appropriate error message shown

**Network Failure:**
- [ ] Disable network connection
- [ ] Attempt license activation
- [ ] Verify network error message shown
- [ ] Re-enable network and verify retry works

**Device Transfer:**
- [ ] Activate license on Device A
- [ ] Enter same key on Device B
- [ ] Verify transfer dialog appears
- [ ] Complete transfer
- [ ] Verify Device B works after transfer
- [ ] Verify Device A no longer works

**Transfer Limit:**
- [ ] Perform 3 transfers
- [ ] Attempt 4th transfer
- [ ] Verify transfer limit message shown

---

### 4.3 Offline Operation Verification

**After Activation:**
- [ ] Activate license successfully
- [ ] Disconnect internet completely
- [ ] Use app for 30+ minutes
- [ ] Verify zero network requests (check DevTools Network tab)
- [ ] Verify all app features work offline
- [ ] Verify license validation works offline

**App Restart Offline:**
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

**Before accepting first real customer:**

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

## Phase 6: Error Logging and Monitoring

### 6.1 Structured Error Logging (Backend)

**✅✅✅ COMPLETED - All 5 tasks implemented and working ✅✅✅**

1. ✅ **COMPLETED** - Implement structured error logging with error codes
   - Error codes defined in `backend/utils/logger.js` (ERROR_CODES constant)
   - Codes include: SERVER_ERROR, DATABASE_ERROR, EMAIL_ERROR, WEBHOOK_ERROR, LICENSE_ERROR, STRIPE_ERROR, AUTH_ERROR, VALIDATION_ERROR, etc.

2. ✅ **COMPLETED** - Add context information to error logs (request ID, user ID, timestamp)
   - All log entries include: timestamp, requestId, userId (when available), context object
   - Context automatically extracted from request objects

3. ✅ **COMPLETED** - Replace basic `console.error` with structured logging
   - Replaced in: `backend/services/email.js`, `backend/routes/licenses.js`, `backend/jobs/trialEmails.js`, `backend/database/db.js`, `backend/utils/performanceMonitor.js`
   - All errors now use `logger.error()` with error codes and context

4. ✅ **COMPLETED** - Log levels: ERROR, WARN, INFO, DEBUG
   - All log levels implemented with structured JSON output
   - Configurable via `LOG_LEVEL` environment variable

5. ✅ **COMPLETED** - Include stack traces for errors
   - All error objects include full stack traces in structured format
   - Stack traces automatically included in error log entries
### 6.1 Structured Error Logging (Backend) ✅ **COMPLETED**

**Status:** All tasks completed and implemented ✅

- [x] ✅ **Implement structured error logging with error codes** - **DONE**
  - Error codes defined in `backend/utils/logger.js` (ERROR_CODES constant)
  - Codes include: SERVER_ERROR, DATABASE_ERROR, EMAIL_ERROR, WEBHOOK_ERROR, LICENSE_ERROR, STRIPE_ERROR, AUTH_ERROR, VALIDATION_ERROR, etc.

- [x] ✅ **Add context information to error logs (request ID, user ID, timestamp)** - **DONE**
  - All log entries include: timestamp, requestId, userId (when available), context object
  - Context automatically extracted from request objects

- [x] ✅ **Replace basic `console.error` with structured logging** - **DONE**
  - Replaced in: `backend/services/email.js`, `backend/routes/licenses.js`, `backend/jobs/trialEmails.js`, `backend/database/db.js`, `backend/utils/performanceMonitor.js`
  - All errors now use `logger.error()` with error codes and context

- [x] ✅ **Log levels: ERROR, WARN, INFO, DEBUG** - **DONE**
  - All log levels implemented with structured JSON output
  - Configurable via `LOG_LEVEL` environment variable

- [x] ✅ **Include stack traces for errors** - **DONE**
  - All error objects include full stack traces in structured format
  - Stack traces automatically included in error log entries
>>>>>>> 8e6d0be (Improve visibility of completed items in DEVELOPER_HANDOFF.md section 6.1)

**Note:** Backend logging only. Does not affect 100% offline promise.

---

### 6.2 Error Tracking Service Integration (Sentry - Backend Only)
- [ ] Create Sentry account at https://sentry.io
- [ ] Create new project (Node.js/Express)
- [ ] Get DSN from Sentry project settings
- [ ] Add `SENTRY_DSN` to backend `.env` file
- [ ] Verify Sentry integration (errors automatically sent in production)
- [ ] Configure Sentry alerts/notifications (optional)
- [ ] Test error tracking by triggering a test error in production

**Environment Variable:**
```env
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

**CRITICAL NOTES:**
- **Backend Sentry ONLY** - Server-side error tracking. Does not affect app offline operation.
- **Frontend Sentry is DISABLED** - All frontend Sentry functions are no-ops. No data collection from user's app.
- **100% Offline Guarantee** - User's application sends ZERO data to any external service after activation.
- Sentry is already integrated in backend code. Only configuration needed.

---

### 6.3 Webhook Failure Alerts (Backend)
- [ ] Verify webhook failure alerting is working (already implemented)
- [ ] Test webhook failure scenario (3 consecutive failures trigger alert)
- [ ] Verify alert emails sent to `SUPPORT_EMAIL`
- [ ] Monitor webhook processing in production

**Note:** Backend monitoring only. Does not affect app offline operation.

---

### 6.4 Frontend Error Logging (Local Only - 100% Offline)
- [ ] Verify local error logging is working (already implemented)
- [ ] Test error log export from Settings → Help & Support
- [ ] Verify error logs persist in localStorage
- [ ] Confirm zero network calls for error logging

**Critical:** Frontend error logging must be 100% local. Zero network calls after activation.

---

## Reference Documents

- `backend/README.md` - API documentation
- `backend/database/schema.sql` - Database structure
- `backend/env.example` - Environment variables reference
