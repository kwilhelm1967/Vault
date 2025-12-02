# Local Password Vault - Backend API

Backend server for Local Password Vault that handles license key management, trial signups, and Stripe payment processing.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
# Copy example config
cp env.example .env

# Edit .env with your values
```

### 3. Set Up Stripe

1. Create a [Stripe account](https://dashboard.stripe.com/register)
2. Get your API keys from [Dashboard > Developers > API keys](https://dashboard.stripe.com/apikeys)
3. Add keys to `.env`:
   - `STRIPE_SECRET_KEY` - Your secret key (starts with `sk_test_` or `sk_live_`)
   - `STRIPE_WEBHOOK_SECRET` - Created when you set up webhooks

### 4. Set Up Email

Choose one of these options in `.env`:

**SendGrid (Recommended)**
```
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_api_key
```

**Mailgun**
```
EMAIL_PROVIDER=mailgun
MAILGUN_USER=postmaster@your-domain.mailgun.org
MAILGUN_PASSWORD=your_password
```

**Gmail SMTP**
```
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Use App Password, not regular password
```

### 5. Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:3001`

---

## API Endpoints

### License Validation

**POST `/api/licenses/validate`**

Validates and activates a license key on a device.

```bash
curl -X POST http://localhost:3001/api/licenses/validate \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "PERS-XXXX-XXXX-XXXX",
    "hardwareHash": "sha256-device-fingerprint"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "planType": "personal",
    "token": "jwt-token-for-offline-validation",
    "isNewActivation": true,
    "maxDevices": 1
  }
}
```

---

### Trial Signup

**POST `/api/trial/signup`**

Creates a 7-day free trial and emails the trial key.

```bash
curl -X POST http://localhost:3001/api/trial/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

Response:
```json
{
  "success": true,
  "message": "Trial key sent to your email",
  "expiresAt": "2025-12-09T..."
}
```

---

### Stripe Checkout

**POST `/api/checkout/session`**

Creates a Stripe Checkout session for purchasing a license.

```bash
curl -X POST http://localhost:3001/api/checkout/session \
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

### Stripe Webhook

**POST `/api/webhooks/stripe`**

Handles Stripe webhook events. Configure in Stripe Dashboard.

**Events handled:**
- `checkout.session.completed` → Generates license key and sends email

---

## Stripe Setup

### 1. Create Products in Stripe Dashboard

Go to [Products](https://dashboard.stripe.com/products) and create:

| Product | Price | Description |
|---------|-------|-------------|
| Personal Vault | $49.00 (one-time) | Lifetime license for 1 device |
| Family Vault | $79.00 (one-time) | Lifetime license for 5 devices |

### 2. Configure Webhook

Go to [Webhooks](https://dashboard.stripe.com/webhooks) and:

1. Click "Add endpoint"
2. Enter your endpoint URL: `https://api.localpasswordvault.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded` (optional)
   - `payment_intent.payment_failed` (optional)
4. Copy the webhook signing secret to `.env`

### 3. Test with Stripe CLI (Development)

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Windows: scoop install stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Copy the webhook secret it displays to .env
```

---

## Database

Uses SQLite for simplicity. Database file is created automatically at `./database/vault.db`.

### Tables

- `customers` - Customer records (synced from Stripe)
- `licenses` - License keys and activation status
- `trials` - Trial signups
- `device_activations` - For family plans (multiple devices)
- `webhook_events` - Stripe webhook log

### Reset Database (Development)

```bash
rm database/vault.db
npm start  # Recreates tables
```

---

## Deployment

### Option 1: Railway (Easiest)

1. Push code to GitHub
2. Go to [Railway](https://railway.app)
3. "New Project" → "Deploy from GitHub repo"
4. Add environment variables
5. Railway provides a URL like `your-app.railway.app`

### Option 2: Vercel

```bash
npm i -g vercel
vercel
```

Note: Vercel is serverless, so SQLite won't persist. Use PostgreSQL instead.

### Option 3: DigitalOcean App Platform

1. Create a new App
2. Connect GitHub repo
3. Set environment variables
4. Deploy

### Option 4: VPS (Full Control)

```bash
# On your server
git clone your-repo
cd backend
npm install
cp env.example .env
# Edit .env

# Run with PM2
npm install -g pm2
pm2 start server.js --name vault-api
pm2 save
```

---

## Security Checklist

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Use `sk_live_` Stripe key in production
- [ ] Set up HTTPS (required for Stripe)
- [ ] Configure CORS for your domains only
- [ ] Set `NODE_ENV=production`
- [ ] Enable rate limiting (already configured)
- [ ] Backup database regularly

---

## Troubleshooting

### "License key not found"
- Check the key format is correct (XXXX-XXXX-XXXX-XXXX)
- Verify the key exists in the database
- Keys are case-insensitive

### "Webhook signature verification failed"
- Make sure `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe Dashboard
- The webhook endpoint must receive the raw body (not parsed JSON)

### "Email not sending"
- Verify email provider credentials
- Check spam folder
- For Gmail, use an App Password (not your regular password)

### Trial not creating
- Check if email already has a trial or license
- Verify database is writable

---

## File Structure

```
backend/
├── server.js              # Express server entry point
├── package.json           # Dependencies
├── env.example            # Environment template
├── routes/
│   ├── licenses.js        # /api/licenses/*
│   ├── trial.js           # /api/trial/*
│   ├── checkout.js        # /api/checkout/*
│   └── webhooks.js        # /api/webhooks/*
├── services/
│   ├── stripe.js          # Stripe integration
│   ├── email.js           # Email sending
│   └── licenseGenerator.js # Key generation
├── database/
│   ├── db.js              # Database connection
│   └── schema.sql         # Table definitions
└── templates/
    ├── purchase-email.html # Purchase confirmation
    └── trial-email.html    # Trial welcome email
```

---

## Support

Questions? Contact: support@localpasswordvault.com

