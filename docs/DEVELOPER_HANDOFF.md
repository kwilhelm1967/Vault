# Local Password Vault - Developer Handoff Guide

## Complete Integration Checklist for Backend Developer

This document provides everything needed to connect the frontend Electron app to your backend services and get the full purchase → license → download flow working.

---

## 🏗️ Your Tech Stack

| Service | Purpose | Status |
|---------|---------|--------|
| **Linode** | Node.js API server | Needs API deployment |
| **Supabase** | PostgreSQL database for licenses | Needs tables created |
| **Stripe** | Payment processing | Needs products & webhook |
| **Brevo** | Transactional email (SMTP) | Needs email templates |
| **GitHub** | Code repository & releases | ✅ Ready |

---

## 📋 Complete User Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER JOURNEY                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. LANDING PAGE (localpasswordvault.com)                                   │
│     ├── User clicks "Start Free Trial" OR "Buy Now"                         │
│     │                                                                        │
│  2. TRIAL PATH                          │  PURCHASE PATH                     │
│     ├── Generate trial license key      │  ├── Redirect to Stripe Checkout  │
│     ├── Store in Supabase (7-day exp)   │  ├── User completes payment       │
│     ├── Return JWT token to frontend    │  ├── Stripe webhook fires         │
│     ├── Show download options           │  ├── Generate license key(s)      │
│     └── User downloads & activates      │  ├── Store in Supabase            │
│                                          │  ├── Send email via Brevo         │
│  3. DOWNLOAD                             │  ├── Redirect to success page     │
│     ├── User selects OS (Win/Mac/Linux) │  └── Show keys + download links   │
│     ├── Downloads installer (.exe/.dmg) │                                    │
│     └── Installer is NOT zipped         │                                    │
│                                                                              │
│  4. ACTIVATION                                                               │
│     ├── User runs installer                                                  │
│     ├── App opens to License Screen                                          │
│     ├── User enters license key                                              │
│     ├── App calls /api/licenses/validate                                     │
│     ├── Backend validates & binds to hardware hash                           │
│     ├── Returns JWT token with license info                                  │
│     └── User creates master password & starts using app                      │
│                                                                              │
│  5. FLOATING ICON (Mini Vault)                                               │
│     ├── After unlock, floating icon appears in system tray                   │
│     ├── Click to open Mini Vault panel                                       │
│     └── Quick access to passwords without full app                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Backend API Endpoints Required

### Base URL: `https://server.localpasswordvault.com`

### 1. Health Check
```
GET /api/health
Response: { "status": "ok", "timestamp": "2024-12-03T..." }
```

### 2. Start Trial
```
POST /api/trial/start
Body: {
  "email": "user@example.com",
  "hardwareHash": "abc123..."
}
Response: {
  "success": true,
  "licenseKey": "TRIAL-XXXX-XXXX-XXXX",
  "token": "eyJhbGc...",  // JWT with trial expiry
  "expiresAt": "2024-12-10T12:00:00Z"
}
```

### 3. Validate License
```
POST /api/licenses/validate
Body: {
  "licenseKey": "LPV4-XXXX-XXXX-XXXX-XXXX",
  "hardwareHash": "abc123..."
}
Response (success): {
  "success": true,
  "valid": true,
  "licenseType": "personal" | "family",
  "activated": true,
  "token": "eyJhbGc..."  // JWT for offline validation
}
Response (error): {
  "success": false,
  "error": "License already activated on another device"
}
```

### 4. Stripe Webhook
```
POST /stripe-webhook
Headers: { "stripe-signature": "..." }
Body: Raw Stripe event

Handles: checkout.session.completed
Actions:
  1. Generate license key(s)
  2. Store in Supabase
  3. Send email via Brevo
```

### 5. Create Checkout Session (for website)
```
POST /api/checkout/create
Body: {
  "planType": "personal" | "family",
  "email": "user@example.com"
}
Response: {
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

---

## 🗄️ Supabase Database Schema

### licenses table
```sql
CREATE TABLE licenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_key VARCHAR(25) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  plan_type VARCHAR(20) NOT NULL DEFAULT 'personal',  -- 'personal', 'family', 'trial'
  status VARCHAR(20) NOT NULL DEFAULT 'pending',       -- 'pending', 'active', 'expired', 'revoked'
  hardware_hash VARCHAR(255),                          -- Bound device fingerprint
  activated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,                 -- For trials
  stripe_payment_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  family_group_id UUID,                                -- Links family keys together
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_licenses_email ON licenses(email);
CREATE INDEX idx_licenses_key ON licenses(license_key);
CREATE INDEX idx_licenses_status ON licenses(status);
```

### purchases table
```sql
CREATE TABLE purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  plan_type VARCHAR(20) NOT NULL,
  amount_cents INTEGER NOT NULL,
  stripe_session_id VARCHAR(255),
  stripe_payment_intent VARCHAR(255),
  license_keys TEXT[],  -- Array of generated keys
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 💳 Stripe Configuration

### Products to Create

| Product | Price | Stripe Price ID |
|---------|-------|-----------------|
| Personal Vault | $49 (one-time) | price_personal_xxx |
| Family Vault | $79 (one-time) | price_family_xxx |

### Checkout Session Metadata
When creating checkout session, include:
```javascript
metadata: {
  plan_type: 'personal' | 'family',
  user_email: email
}
```

### Webhook Events to Handle
- `checkout.session.completed` - Generate license, send email

### Success/Cancel URLs
```
success_url: https://localpasswordvault.com/purchase-success?session_id={CHECKOUT_SESSION_ID}
cancel_url: https://localpasswordvault.com/#plans
```

---

## 📧 Brevo Email Templates

### License Delivery Email
**Trigger:** After successful Stripe payment
**Subject:** Your Local Password Vault License Key

**Content should include:**
1. Thank you message
2. License key(s) in monospace font
3. Download links for each OS
4. Getting started instructions
5. Support contact

See `BACKEND_SETUP_GUIDE.md` for full HTML template.

---

## 🔐 License Key Format

```
Trial:    TRIAL-XXXX-XXXX-XXXX
Personal: LPV4-XXXX-XXXX-XXXX-XXXX
Family:   LPV4-XXXX-XXXX-XXXX-XXXX (5 keys with same family_group_id)
```

**Generation Algorithm:**
```javascript
function generateLicenseKey(prefix = 'LPV4') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = prefix + '-';
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 3) key += '-';
  }
  return key;
}
```

---

## 🖥️ Floating Icon (Mini Vault) - Current Status

### What Exists
- `FloatingPanel.tsx` - Web-based floating panel
- `ElectronFloatingPanel.tsx` - Electron-specific panel
- `MiniVaultButton.tsx` - Floating action button

### What Needs to Work
The floating icon should:
1. Appear in system tray after vault is unlocked
2. Click to open Mini Vault panel (quick password access)
3. Stay on top of other windows
4. Show timer until auto-lock

### Electron Main Process Requirements
In `electron/main.js`:
```javascript
// Create tray icon
const tray = new Tray(path.join(__dirname, 'tray-icon.png'));
tray.setContextMenu(Menu.buildFromTemplate([
  { label: 'Open Vault', click: () => mainWindow.show() },
  { label: 'Mini Vault', click: () => floatingWindow.show() },
  { label: 'Lock', click: () => lockVault() },
  { type: 'separator' },
  { label: 'Quit', click: () => app.quit() }
]));

// Floating panel window
let floatingWindow = new BrowserWindow({
  width: 400,
  height: 600,
  frame: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: false,
  // ... other options
});
```

---

## 📦 Build & Distribution

### Installers (NOT zipped)
- **Windows:** `.exe` (NSIS installer)
- **macOS:** `.dmg` (disk image)
- **Linux:** `.AppImage` (portable)

### Build Commands
```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

### Auto-Updates
Using `electron-updater` with GitHub Releases:
- App checks for updates on startup
- Downloads and installs automatically
- Requires code signing for production

---

## 🔑 JWT Token Structure

The app stores a JWT token for offline license validation:

```javascript
// Payload structure
{
  "licenseKey": "LPV4-XXXX-XXXX-XXXX-XXXX",
  "planType": "personal",
  "email": "user@example.com",
  "hardwareHash": "abc123...",
  "activatedAt": "2024-12-03T12:00:00Z",
  "isTrial": false,
  "trialExpiryDate": null,  // Only for trials
  "iat": 1701612000,
  "exp": 1733148000  // 1 year from activation
}
```

**Storage Location:** `localStorage.license_token`

---

## 🔒 Hardware Fingerprint

The app generates a hardware hash to bind licenses to devices:

```javascript
// Generated from:
- CPU model
- Total memory
- OS platform
- Machine hostname
- MAC addresses (hashed)

// Result: SHA-256 hash string
```

**Location:** `src/utils/hardwareFingerprint.ts`

---

## ⚙️ Environment Variables

### Frontend (.env)
```env
VITE_API_URL=https://server.localpasswordvault.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### Backend (.env on Linode)
```env
PORT=3000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
BREVO_SMTP_USER=xxx
BREVO_SMTP_PASS=xxx
JWT_SECRET=your-secret-key
```

---

## ✅ Integration Checklist

### Supabase
- [ ] Create `licenses` table
- [ ] Create `purchases` table
- [ ] Get service role key
- [ ] Test database connection

### Stripe
- [ ] Create Personal Vault product ($49)
- [ ] Create Family Vault product ($79)
- [ ] Set up webhook endpoint
- [ ] Configure success/cancel URLs
- [ ] Test checkout flow

### Linode API
- [ ] Deploy server.js
- [ ] Configure Nginx reverse proxy
- [ ] Set up SSL certificate
- [ ] Configure environment variables
- [ ] Test all endpoints

### Brevo
- [ ] Configure SMTP credentials
- [ ] Test email delivery
- [ ] Verify sender domain

### Frontend Integration
- [ ] Update API URL in environment
- [ ] Test trial flow
- [ ] Test purchase flow
- [ ] Test license activation
- [ ] Test floating panel

### Electron
- [ ] Build installers for all platforms
- [ ] Test installation process
- [ ] Verify floating icon works
- [ ] Test auto-updates

---

## 🐛 Common Issues & Solutions

### "License already activated on another device"
- Check `hardware_hash` in database
- Allow device reset via support

### Floating panel not showing
- Check Electron IPC channels
- Verify window creation in main process
- Check `alwaysOnTop` setting

### Trial not working
- Verify JWT token is being stored
- Check `trial_expiry_time` in localStorage
- Ensure backend returns proper token

### Stripe webhook not firing
- Verify webhook URL is correct
- Check webhook signing secret
- Review Stripe Dashboard logs

---

## 📞 Support Contacts

- **Repository:** https://github.com/kwilhelm1967/Vault
- **Email:** support@localpasswordvault.com

---

## 📁 Key Files Reference

| File | Purpose |
|------|---------|
| `src/utils/licenseService.ts` | License validation logic |
| `src/utils/trialService.ts` | Trial management |
| `src/utils/hardwareFingerprint.ts` | Device fingerprinting |
| `src/components/LicenseScreen.tsx` | License/trial UI |
| `src/components/TrialStatusBanner.tsx` | Trial countdown banner |
| `src/components/FloatingPanel.tsx` | Mini Vault panel |
| `electron/main.js` | Electron main process |
| `docs/BACKEND_SETUP_GUIDE.md` | Full backend setup |

---

*Last Updated: December 3, 2024*

