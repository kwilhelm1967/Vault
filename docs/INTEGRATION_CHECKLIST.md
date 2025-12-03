# Integration Checklist for Backend Developer

## Quick Reference: Your Stack

| Service | What It Does | Credentials Needed |
|---------|--------------|-------------------|
| **Linode** | Hosts Node.js API | SSH access, IP address |
| **Supabase** | PostgreSQL database | Project URL, Service Role Key |
| **Stripe** | Payments | Secret Key, Publishable Key, Webhook Secret |
| **Brevo** | Email delivery | SMTP User, SMTP Password |
| **GitHub** | Code + Releases | Already configured |

---

## Step-by-Step Integration

### STEP 1: Database (Supabase) - 15 minutes

1. Log into Supabase Dashboard
2. Go to SQL Editor
3. Run this SQL:

```sql
-- Create licenses table
CREATE TABLE IF NOT EXISTS licenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_key VARCHAR(25) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  plan_type VARCHAR(20) NOT NULL DEFAULT 'personal',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  hardware_hash VARCHAR(255),
  activated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  stripe_payment_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  family_group_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  plan_type VARCHAR(20) NOT NULL,
  amount_cents INTEGER NOT NULL,
  stripe_session_id VARCHAR(255),
  stripe_payment_intent VARCHAR(255),
  license_keys TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(email);
CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_purchases_email ON purchases(email);
```

4. Get credentials from Settings → API:
   - Project URL: `https://YOUR-PROJECT.supabase.co`
   - Service Role Key: `eyJhbGc...` (NOT the anon key!)

✅ **Done when:** Tables appear in Table Editor

---

### STEP 2: Stripe Products - 10 minutes

1. Log into Stripe Dashboard
2. Go to Products → Add Product

**Product 1: Personal Vault**
- Name: `Personal Vault`
- Price: `$49.00` (one-time)
- Save and copy the Price ID (starts with `price_`)

**Product 2: Family Vault**
- Name: `Family Vault`
- Price: `$79.00` (one-time)
- Save and copy the Price ID (starts with `price_`)

3. Go to Developers → API Keys
   - Copy Secret Key (`sk_live_...`)
   - Copy Publishable Key (`pk_live_...`)

✅ **Done when:** Both products show in Products list

---

### STEP 3: Deploy API to Linode - 30 minutes

1. SSH into your Linode server
2. Create the API directory:

```bash
mkdir -p /var/www/lpv-api
cd /var/www/lpv-api
```

3. Copy `server.js` from `docs/BACKEND_SETUP_GUIDE.md`

4. Create `.env` file:

```bash
nano .env
```

Add:
```
PORT=3000
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_KEY=YOUR-SERVICE-ROLE-KEY
STRIPE_SECRET_KEY=sk_live_YOUR-KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR-SECRET
BREVO_SMTP_USER=YOUR-BREVO-LOGIN
BREVO_SMTP_PASS=YOUR-BREVO-KEY
JWT_SECRET=generate-a-random-32-char-string
```

5. Install and start:

```bash
npm install
pm2 start server.js --name lpv-api
pm2 save
pm2 startup
```

6. Test it:

```bash
curl http://localhost:3000/
# Should return: {"status":"ok","service":"Local Password Vault API"...}
```

✅ **Done when:** API responds on localhost:3000

---

### STEP 4: Nginx + SSL - 20 minutes

1. Create Nginx config:

```bash
nano /etc/nginx/sites-available/lpv-api
```

Add:
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

2. Enable and restart:

```bash
ln -s /etc/nginx/sites-available/lpv-api /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

3. Get SSL certificate:

```bash
certbot --nginx -d server.localpasswordvault.com
```

✅ **Done when:** `https://server.localpasswordvault.com/` returns API response

---

### STEP 5: Stripe Webhook - 10 minutes

1. In Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://server.localpasswordvault.com/stripe-webhook`
4. Events to select: `checkout.session.completed`
5. Click "Add endpoint"
6. Copy the Signing Secret (`whsec_...`)
7. Update `.env` on Linode with this secret
8. Restart API: `pm2 restart lpv-api`

✅ **Done when:** Webhook shows "Active" in Stripe Dashboard

---

### STEP 6: Brevo Email - 10 minutes

1. Log into Brevo
2. Go to SMTP & API
3. Copy SMTP credentials:
   - Login (email)
   - SMTP Key (password)
4. Update `.env` on Linode
5. Restart API: `pm2 restart lpv-api`

✅ **Done when:** Test email sends successfully

---

### STEP 7: DNS Configuration - 5 minutes

Add A record in your DNS provider:

| Type | Name | Value |
|------|------|-------|
| A | server | YOUR-LINODE-IP |

✅ **Done when:** `server.localpasswordvault.com` resolves to your Linode IP

---

### STEP 8: Frontend Configuration

Update the frontend to use your API:

1. Create/update `.env` in the LocalPasswordVault project root:

```
VITE_API_URL=https://server.localpasswordvault.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR-KEY
```

2. Rebuild the app:

```bash
npm run build
```

✅ **Done when:** App connects to your API

---

## Complete User Flow Verification

### Test 1: Trial Flow
1. User visits website → clicks "Start Free Trial"
2. Enter email → Get trial license
3. Download installer → Run it
4. Enter trial key → App activates
5. Floating icon appears after vault unlock
6. After 7 days → Trial expires → Floating icon hidden

### Test 2: Purchase Flow
1. User visits website → clicks "Buy Now"
2. Select plan → Redirect to Stripe
3. Complete payment → Webhook fires
4. License key generated → Stored in Supabase
5. Email sent via Brevo with key + download links
6. User downloads, installs, enters key
7. App validates key → Binds to hardware
8. Full access granted

### Test 3: Floating Icon
1. Unlock vault with valid license
2. Floating icon should appear in corner
3. Click icon → Mini Vault panel opens
4. Can copy passwords from panel
5. Close panel → Icon stays visible
6. Lock vault → Icon disappears

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/trial/start` | POST | Start 7-day trial |
| `/api/licenses/validate` | POST | Validate license key |
| `/api/checkout/create` | POST | Create Stripe checkout |
| `/stripe-webhook` | POST | Handle Stripe events |

---

## Troubleshooting

### "License already activated"
- Check `hardware_hash` in Supabase licenses table
- User may need device reset (clear hardware_hash in DB)

### Floating icon not showing
- Check trial-info.json in app data folder
- Verify `hasValidLicense: true` or trial not expired
- Check Electron console for errors

### Webhook not working
- Verify webhook URL is HTTPS
- Check signing secret matches
- Review Stripe webhook logs

### Email not sending
- Verify Brevo SMTP credentials
- Check spam folder
- Review PM2 logs: `pm2 logs lpv-api`

---

## Files You'll Need to Modify

| File | What to Change |
|------|----------------|
| `docs/BACKEND_SETUP_GUIDE.md` | Contains full server.js code |
| `.env` (create in project root) | Frontend environment vars |
| Linode `.env` | Backend environment vars |

---

## Contact

If stuck, the key files are:
- `src/utils/licenseService.ts` - License validation
- `src/utils/trialService.ts` - Trial management
- `electron/main.js` - Floating icon logic
- `electron/preload.js` - IPC channels

---

*Estimated total setup time: 2-3 hours*

