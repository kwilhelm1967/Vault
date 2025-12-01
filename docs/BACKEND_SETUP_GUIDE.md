# Local Password Vault - Backend Setup Guide

## For Developers: Complete Backend API Setup

This guide walks through setting up the backend API for Local Password Vault to handle:
- License key generation and validation
- Stripe payment webhook processing
- Email delivery via Brevo

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Linode API    │────▶│    Supabase     │
│   (Electron)    │     │   (Node.js)     │     │   (Database)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │     Stripe      │
                        │   (Payments)    │
                        └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │     Brevo       │
                        │    (Email)      │
                        └─────────────────┘
```

---

## Step 1: Supabase Database Setup

### 1.1 Create Tables

Go to Supabase Dashboard → SQL Editor and run:

```sql
-- Licenses table
CREATE TABLE IF NOT EXISTS licenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_key VARCHAR(25) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  plan_type VARCHAR(20) NOT NULL DEFAULT 'personal',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  hardware_hash VARCHAR(255),
  activated_at TIMESTAMP WITH TIME ZONE,
  stripe_payment_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  family_group_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  plan_type VARCHAR(20) NOT NULL,
  amount_cents INTEGER NOT NULL,
  stripe_session_id VARCHAR(255),
  stripe_payment_intent VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(email);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_purchases_email ON purchases(email);
```

### 1.2 Get Supabase Credentials

From Supabase Dashboard → Settings → API:
- **Project URL**: `https://YOUR-PROJECT.supabase.co`
- **Service Role Key**: `eyJhbGc...` (use the service_role key, NOT anon key)

---

## Step 2: Linode Server Setup

### 2.1 Server Requirements

- **OS**: Ubuntu 22.04 LTS
- **Node.js**: v18+ (already installed: v24.11.0)
- **PM2**: Process manager (already installed)
- **Nginx**: Reverse proxy

### 2.2 Install Dependencies (if needed)

```bash
# Update system
apt update && apt upgrade -y

# Install Nginx (if not installed)
apt install nginx -y

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install nodejs -y

# Install PM2 globally
npm install -g pm2
```

### 2.3 Create API Directory

```bash
mkdir -p /var/www/lpv-api
cd /var/www/lpv-api
```

### 2.4 Create package.json

```bash
nano package.json
```

Paste this content:

```json
{
  "name": "lpv-api",
  "version": "1.0.0",
  "description": "Local Password Vault License API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "nodemailer": "^6.9.7",
    "stripe": "^14.10.0"
  }
}
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### 2.5 Create server.js

```bash
nano server.js
```

Paste this content:

```javascript
// Local Password Vault - Backend API
// server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Email transporter (Brevo SMTP)
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'https://localpasswordvault.com',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true
}));

// Stripe webhook needs raw body
app.use('/stripe-webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// ============================================
// HELPER: Generate License Key
// Format: LPV4-XXXX-XXXX-XXXX-XXXX
// ============================================
function generateLicenseKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = 'LPV4-';
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 3) key += '-';
  }
  return key;
}

// ============================================
// ENDPOINT: Health Check
// GET /
// ============================================
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Local Password Vault API',
    version: '1.0.0'
  });
});

// ============================================
// ENDPOINT: API Health Check
// GET /api/health
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// ENDPOINT: Validate License
// POST /api/licenses/validate
// ============================================
app.post('/api/licenses/validate', async (req, res) => {
  try {
    const { licenseKey, hardwareHash } = req.body;
    
    if (!licenseKey) {
      return res.json({ success: false, error: 'License key required' });
    }

    // Look up license in Supabase
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', licenseKey.toUpperCase().trim())
      .single();

    if (error || !license) {
      return res.json({ success: false, error: 'Invalid license key' });
    }

    if (license.status === 'revoked') {
      return res.json({ success: false, error: 'License has been revoked' });
    }

    // Check device limit for family plans
    if (license.plan_type === 'family' && license.family_group_id) {
      const { count } = await supabase
        .from('licenses')
        .select('*', { count: 'exact', head: true })
        .eq('family_group_id', license.family_group_id)
        .not('hardware_hash', 'is', null);
      
      // Family plan allows 5 devices
      if (count >= 5 && !license.hardware_hash) {
        return res.json({ 
          success: false, 
          error: 'Maximum devices reached for this family plan' 
        });
      }
    }

    // Check if already activated on different device (for single licenses)
    if (license.plan_type === 'personal') {
      if (license.hardware_hash && license.hardware_hash !== hardwareHash) {
        return res.json({ 
          success: false, 
          error: 'License already activated on another device' 
        });
      }
    }

    // First-time activation
    if (!license.hardware_hash && hardwareHash) {
      await supabase
        .from('licenses')
        .update({ 
          hardware_hash: hardwareHash, 
          status: 'active',
          activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('license_key', licenseKey.toUpperCase().trim());
    }

    return res.json({
      success: true,
      valid: true,
      licenseType: license.plan_type,
      activated: true,
      email: license.email
    });

  } catch (err) {
    console.error('License validation error:', err);
    return res.json({ success: false, error: 'Validation failed' });
  }
});

// ============================================
// ENDPOINT: Stripe Webhook
// POST /stripe-webhook
// ============================================
app.post('/stripe-webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    const email = session.customer_email || session.customer_details?.email;
    const planType = session.metadata?.plan_type || 'personal';
    const amountCents = session.amount_total;
    
    // Determine number of keys based on plan
    const numKeys = planType === 'family' ? 5 : 1;
    const familyGroupId = planType === 'family' ? crypto.randomUUID() : null;
    
    // Generate license key(s)
    const licenseKeys = [];
    for (let i = 0; i < numKeys; i++) {
      const key = generateLicenseKey();
      licenseKeys.push(key);
      
      // Save to Supabase
      await supabase.from('licenses').insert({
        license_key: key,
        email: email,
        plan_type: planType,
        status: 'pending',
        stripe_payment_id: session.payment_intent,
        stripe_customer_id: session.customer,
        family_group_id: familyGroupId
      });
    }

    // Record purchase
    await supabase.from('purchases').insert({
      email: email,
      plan_type: planType,
      amount_cents: amountCents,
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent
    });

    // Send email with license key(s)
    const keysHtml = licenseKeys.map((key, i) => 
      `<div style="background:#1e293b;padding:12px 16px;border-radius:8px;margin:8px 0;font-family:monospace;font-size:16px;color:#5B82B8;letter-spacing:1px;">${numKeys > 1 ? `Key ${i+1}: ` : ''}${key}</div>`
    ).join('');

    const planName = planType === 'family' ? 'Family Vault (5 devices)' : 'Personal Vault (1 device)';

    try {
      await transporter.sendMail({
        from: '"Local Password Vault" <noreply@localpasswordvault.com>',
        to: email,
        subject: 'Your Local Password Vault License Key',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin:0;padding:0;background:#0a0a0a;">
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;border-radius:12px;overflow:hidden;">
              
              <!-- Header -->
              <div style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:40px 32px;text-align:center;">
                <h1 style="color:#fff;margin:0;font-size:28px;font-weight:600;">Thank You for Your Purchase!</h1>
                <p style="color:#94a3b8;margin:12px 0 0;font-size:16px;">${planName}</p>
              </div>
              
              <!-- Content -->
              <div style="padding:32px;">
                
                <!-- License Keys -->
                <div style="margin-bottom:32px;">
                  <h2 style="color:#fff;font-size:18px;margin:0 0 16px;font-weight:600;">Your License Key${numKeys > 1 ? 's' : ''}</h2>
                  ${keysHtml}
                  <p style="color:#64748b;font-size:13px;margin:12px 0 0;">Keep ${numKeys > 1 ? 'these keys' : 'this key'} safe. You'll need ${numKeys > 1 ? 'them' : 'it'} to activate your software.</p>
                </div>
                
                <!-- Download Section -->
                <div style="background:#1e293b;border-radius:8px;padding:24px;margin-bottom:32px;">
                  <h2 style="color:#fff;font-size:18px;margin:0 0 16px;font-weight:600;">Download Your App</h2>
                  <div style="display:flex;gap:12px;flex-wrap:wrap;">
                    <a href="https://localpasswordvault.com/download/windows" style="display:inline-block;background:#5B82B8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:500;font-size:14px;">Windows</a>
                    <a href="https://localpasswordvault.com/download/macos" style="display:inline-block;background:#5B82B8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:500;font-size:14px;">macOS</a>
                    <a href="https://localpasswordvault.com/download/linux" style="display:inline-block;background:#5B82B8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:500;font-size:14px;">Linux</a>
                  </div>
                </div>
                
                <!-- Instructions -->
                <div style="margin-bottom:32px;">
                  <h2 style="color:#fff;font-size:18px;margin:0 0 12px;font-weight:600;">Getting Started</h2>
                  <ol style="color:#94a3b8;margin:0;padding-left:20px;line-height:1.8;">
                    <li>Download the installer for your operating system</li>
                    <li>Run the installer and follow the prompts</li>
                    <li>When prompted, enter your license key</li>
                    <li>Create your master password and start securing your data!</li>
                  </ol>
                </div>
                
              </div>
              
              <!-- Footer -->
              <div style="background:#0f172a;border-top:1px solid #1e293b;padding:24px 32px;text-align:center;">
                <p style="color:#64748b;font-size:13px;margin:0;">
                  Need help? Contact <a href="mailto:support@localpasswordvault.com" style="color:#5B82B8;text-decoration:none;">support@localpasswordvault.com</a>
                </p>
                <p style="color:#475569;font-size:12px;margin:12px 0 0;">
                  © ${new Date().getFullYear()} Local Password Vault. All rights reserved.
                </p>
              </div>
              
            </div>
          </body>
          </html>
        `
      });
      console.log(`✅ Email sent to ${email}`);
    } catch (emailErr) {
      console.error('Email send error:', emailErr);
      // Don't fail the webhook if email fails
    }

    console.log(`✅ License(s) generated for ${email}: ${licenseKeys.join(', ')}`);
  }

  res.json({ received: true });
});

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// ============================================
// Error Handler
// ============================================
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 Local Password Vault API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/`);
});
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### 2.6 Create .env File

```bash
nano .env
```

Paste and fill in your values:

```env
PORT=3000

# Supabase (from Supabase Dashboard → Settings → API)
SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...YOUR-SERVICE-ROLE-KEY

# Stripe (from Stripe Dashboard → Developers → API keys)
STRIPE_SECRET_KEY=sk_live_YOUR-SECRET-KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR-WEBHOOK-SECRET

# Brevo SMTP (from Brevo → SMTP & API)
BREVO_SMTP_USER=YOUR-BREVO-LOGIN
BREVO_SMTP_PASS=YOUR-BREVO-SMTP-KEY
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### 2.7 Install Dependencies & Start

```bash
# Install Node packages
npm install

# Start with PM2
pm2 start server.js --name lpv-api

# Save PM2 process list (auto-restart on reboot)
pm2 save
pm2 startup
```

### 2.8 Verify API is Running

```bash
curl http://localhost:3000/
```

Should return:
```json
{"status":"ok","service":"Local Password Vault API","version":"1.0.0"}
```

---

## Step 3: Nginx Configuration

### 3.1 Create Nginx Config

```bash
nano /etc/nginx/sites-available/lpv-api
```

Paste:

```nginx
server {
    listen 80;
    server_name server.localpasswordvault.com;

    location / {
        proxy_pass http://localhost:3000;
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

Save: `Ctrl+X`, then `Y`, then `Enter`

### 3.2 Enable Site & Restart Nginx

```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/lpv-api /etc/nginx/sites-enabled/

# Test nginx config
nginx -t

# Restart nginx
systemctl restart nginx
```

### 3.3 Set Up SSL (HTTPS)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d server.localpasswordvault.com
```

Follow the prompts to complete SSL setup.

---

## Step 4: Stripe Webhook Setup

### 4.1 In Stripe Dashboard

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter URL: `https://server.localpasswordvault.com/stripe-webhook`
4. Select events:
   - `checkout.session.completed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Update `.env` file with this secret

### 4.2 Test Webhook

In Stripe Dashboard → Webhooks → Your endpoint → **Send test webhook**

---

## Step 5: DNS Configuration

Make sure `server.localpasswordvault.com` points to your Linode IP:

| Type | Name   | Value          |
|------|--------|----------------|
| A    | server | 96.126.126.18  |

---

## Step 6: Testing

### Test Health Check
```bash
curl https://server.localpasswordvault.com/
```

### Test License Validation
```bash
curl -X POST https://server.localpasswordvault.com/api/licenses/validate \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"TEST-1234-5678-9ABC"}'
```

Expected response (for invalid key):
```json
{"success":false,"error":"Invalid license key"}
```

---

## Monitoring & Logs

### View API Logs
```bash
pm2 logs lpv-api
```

### View Nginx Logs
```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Restart API
```bash
pm2 restart lpv-api
```

---

## Security Checklist

- [ ] SSL certificate installed (HTTPS)
- [ ] Firewall configured (only ports 80, 443, 22 open)
- [ ] Environment variables secured (not in git)
- [ ] PM2 running with auto-restart
- [ ] Regular backups of Supabase data

---

## Pricing Plans Reference

| Plan           | Price | License Keys | Devices |
|----------------|-------|--------------|---------|
| Personal Vault | $49   | 1            | 1       |
| Family Vault   | $79   | 5            | 5       |

---

## Support

For issues with this setup, contact the development team.

