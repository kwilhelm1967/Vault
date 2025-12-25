# Tasks to Complete

**Note:** This system uses HMAC-SHA256 signed license files (not JWT tokens) for offline validation.

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
```

**Generate LICENSE_SIGNING_SECRET:**
```bash
openssl rand -hex 32
```

---

### 1.2 Configure Nginx & SSL
- [ ] Install Nginx (if not installed)
- [ ] Configure SSL certificate (Let's Encrypt)
- [ ] Set up reverse proxy for API domain (api.localpasswordvault.com)
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

## Phase 2: Payment & Email Configuration

### 2.1 Stripe Configuration
- [ ] Create Stripe products (if not done):
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
- [ ] Create ZIP package for each platform containing:
  - Installer file (`.exe`, `.dmg`, or `.AppImage`)
  - `README.txt` (if available)
  - Documentation files (if available)
- [ ] Host packages:
  - Upload to GitHub Releases (or alternative hosting)
  - Get download URLs
  - Update email templates with download URLs

---

## Phase 4: Testing & Verification

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

## Phase 6: Error Logging & Monitoring

### 6.1 Structured Error Logging (Backend)
- [ ] Implement structured error logging with error codes
- [ ] Add context information to error logs (request ID, user ID, timestamp)
- [ ] Replace basic `console.error` with structured logging
- [ ] Log levels: ERROR, WARN, INFO, DEBUG
- [ ] Include stack traces for errors

**Note:** Backend logging only. Does not affect 100% offline promise.

---

### 6.2 Error Tracking Service Integration (Optional - Backend Only)
- [ ] Set up error tracking service (e.g., Sentry, Rollbar)
- [ ] Configure backend error reporting
- [ ] Set up error alerts/notifications
- [ ] Configure error grouping and filtering

**Note:** Backend only. Frontend must remain 100% offline after activation.

---

### 6.3 Webhook Failure Alerts (Backend)
- [ ] Monitor Stripe webhook processing
- [ ] Set up alerts for webhook failures
- [ ] Log webhook retry attempts
- [ ] Alert on repeated webhook failures
- [ ] Track webhook processing time

**Note:** Backend monitoring only. Does not affect app offline operation.

---

### 6.4 Frontend Error Logging (Local Only - 100% Offline)
- [ ] Implement local error logging (localStorage or local file)
- [ ] Log errors with context (user actions, license status)
- [ ] NO network calls for error logging (maintains 100% offline promise)
- [ ] Optional: Allow user to export error logs for support

**Critical:** Frontend error logging must be 100% local. Zero network calls after activation.

---

## Reference Documents

- `docs/PRODUCTION_LAUNCH_GUIDE.md` - Detailed production setup guide
- `docs/PRODUCTION_CHECKLIST.md` - Comprehensive production checklist
- `backend/README.md` - API documentation
- `backend/database/schema.sql` - Database structure
- `backend/env.example` - Environment variables reference
