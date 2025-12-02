# Developer Setup Guide: Local Password Vault Backend

## Stack

| Component | Service |
|-----------|---------|
| Server | Linode |
| Email | Brevo |
| Payments | Stripe |
| Database | SQLite (included) |

---

## Step 1: Deploy to Linode

```bash
# SSH into Linode
ssh root@[LINODE_IP]

# Clone repository
git clone https://github.com/kwilhelm1967/Vault.git
cd Vault/backend

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install dependencies
npm install

# Create environment file
cp env.example .env
nano .env
```

---

## Step 2: Configure `.env`

```
NODE_ENV=production
PORT=3001

# Generate random string (run: openssl rand -base64 32)
JWT_SECRET=[PASTE_RANDOM_STRING]

# Stripe (from Stripe Dashboard → Developers → API keys)
STRIPE_SECRET_KEY=[YOUR_STRIPE_SECRET_KEY]
STRIPE_WEBHOOK_SECRET=[YOUR_WEBHOOK_SECRET]

# Brevo (from Brevo → Settings → SMTP & API)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=[YOUR_BREVO_LOGIN_EMAIL]
SMTP_PASSWORD=[YOUR_BREVO_SMTP_KEY]

# Sender info
FROM_EMAIL=noreply@localpasswordvault.com
SUPPORT_EMAIL=support@localpasswordvault.com

# Website
WEBSITE_URL=https://localpasswordvault.com
```

---

## Step 3: Configure Stripe Webhook

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Enter URL: `https://api.localpasswordvault.com/api/webhooks/stripe`
4. Select event: `checkout.session.completed`
5. Click **Add endpoint**
6. Copy **Signing secret** → paste into `.env` as `STRIPE_WEBHOOK_SECRET`

---

## Step 4: Create Stripe Products

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Create two products:

| Product | Price | Type |
|---------|-------|------|
| Personal Vault | $49.00 | One-time |
| Family Vault | $79.00 | One-time |

---

## Step 5: Start the Server

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server.js --name vault-api

# Auto-restart on reboot
pm2 save
pm2 startup
```

---

## Step 6: Configure Domain

Add DNS A record:
```
api.localpasswordvault.com → [LINODE_IP]
```

Install SSL certificate:
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d api.localpasswordvault.com
```

Configure Nginx (`/etc/nginx/sites-available/vault-api`):
```nginx
server {
    listen 80;
    server_name api.localpasswordvault.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name api.localpasswordvault.com;

    ssl_certificate /etc/letsencrypt/live/api.localpasswordvault.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.localpasswordvault.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and restart:
```bash
ln -s /etc/nginx/sites-available/vault-api /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## Step 7: Test

```bash
# Health check
curl https://api.localpasswordvault.com/health

# Test trial signup
curl -X POST https://api.localpasswordvault.com/api/trial/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Check Brevo sent the email
```

---

## Step 8: Connect Landing Page Trial Form

In the landing page, the trial form should POST to:
```
POST https://api.localpasswordvault.com/api/trial/signup
Body: { "email": "user@example.com" }
```

---

## API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/licenses/validate` | POST | Activate license key |
| `/api/trial/signup` | POST | Start 7-day trial |
| `/api/checkout/session` | POST | Create Stripe checkout |
| `/api/webhooks/stripe` | POST | Handle Stripe payments |
| `/health` | GET | Server status check |

---

## Request/Response Examples

### License Validation

```bash
curl -X POST https://api.localpasswordvault.com/api/licenses/validate \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "PERS-XXXX-XXXX-XXXX",
    "hardwareHash": "device-fingerprint-hash"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "planType": "personal",
    "token": "jwt-token",
    "isNewActivation": true,
    "maxDevices": 1
  }
}
```

### Trial Signup

```bash
curl -X POST https://api.localpasswordvault.com/api/trial/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

Response:
```json
{
  "success": true,
  "message": "Trial key sent to your email",
  "expiresAt": "2025-12-09T00:00:00.000Z"
}
```

### Create Checkout Session

```bash
curl -X POST https://api.localpasswordvault.com/api/checkout/session \
  -H "Content-Type: application/json" \
  -d '{
    "planType": "personal",
    "email": "user@example.com"
  }'
```

Response:
```json
{
  "success": true,
  "sessionId": "cs_xxx",
  "url": "https://checkout.stripe.com/..."
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Email not sending | Verify Brevo SMTP key in `.env` |
| Webhook failing | Check `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard |
| 502 Bad Gateway | Run `pm2 status` to check if server is running |
| SSL error | Run `certbot renew` |
| Database error | Check `database/vault.db` exists and is writable |

---

## Files Reference

```
backend/
├── server.js              # Main server
├── .env                   # Your configuration (create from env.example)
├── routes/
│   ├── licenses.js        # License validation
│   ├── trial.js           # Trial signup
│   ├── checkout.js        # Stripe checkout
│   └── webhooks.js        # Stripe webhooks
├── services/
│   ├── stripe.js          # Stripe integration
│   ├── email.js           # Brevo email sending
│   └── licenseGenerator.js
├── database/
│   ├── db.js              # SQLite database
│   └── schema.sql         # Table definitions
└── templates/
    ├── purchase-email.html
    └── trial-email.html
```

---

## Pricing

| Plan | Price | Devices |
|------|-------|---------|
| Free Trial | $0 | 1 (7 days) |
| Personal Vault | $49 | 1 (lifetime) |
| Family Vault | $79 | 5 (lifetime) |

---

---

## Step 9: Set Up Trial Email Automation

The system sends automated emails:
- **24-hour warning** — "Your trial expires tomorrow"
- **Trial expired** — "Come back, here's 10% off"

### Option A: Cron Job

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 9 AM)
0 9 * * * cd /path/to/Vault/backend && /usr/bin/node jobs/trialEmails.js >> /var/log/trial-emails.log 2>&1
```

### Option B: PM2 Cron

```bash
pm2 start jobs/trialEmails.js --name trial-emails --cron "0 9 * * *" --no-autorestart
pm2 save
```

### Option C: Run Manually

```bash
npm run job:trial-emails
```

### Create Stripe Discount Code

1. Go to [Stripe → Coupons](https://dashboard.stripe.com/coupons)
2. Click **+ New**
3. Configure:
   - Name: `COMEBACK10`
   - Type: Percentage off
   - Discount: 10%
   - Duration: Once
4. Save

---

## Support

Contact: support@localpasswordvault.com

