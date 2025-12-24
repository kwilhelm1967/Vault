# Local Password Vault - Backend API

Backend server for Local Password Vault. Handles license key management, trial signups, and Stripe payment processing.

## Stack

| Component | Service |
|-----------|---------|
| Server | Linode |
| Email | Brevo |
| Payments | Stripe |
| Database | SQLite |

## Quick Start

```bash
cd backend
npm install
cp env.example .env
# Edit .env with your values
npm start
```

## Configuration

See `DEVELOPER_SETUP.md` for complete setup instructions.

### Required Environment Variables

```
NODE_ENV=production
PORT=3001
JWT_SECRET=[64-char-random-string]

# Stripe
STRIPE_SECRET_KEY=[your-stripe-secret-key]
STRIPE_WEBHOOK_SECRET=[your-webhook-secret]
STRIPE_PRICE_PERSONAL=[price_id_for_personal]
STRIPE_PRICE_FAMILY=[price_id_for_family]
STRIPE_PRICE_LLV_PERSONAL=[price_id_for_llv_personal]
STRIPE_PRICE_LLV_FAMILY=[price_id_for_llv_family]

# Brevo (Transactional API - Recommended)
# Get API key from: Brevo → Settings → SMTP & API → API Keys
BREVO_API_KEY=xkeysib-your-api-key-here

# Email addresses
FROM_EMAIL=noreply@localpasswordvault.com
SUPPORT_EMAIL=support@localpasswordvault.com

# Website
WEBSITE_URL=https://localpasswordvault.com
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/licenses/validate` | POST | Activate license key |
| `/api/trial/signup` | POST | Start 7-day trial |
| `/api/checkout/session` | POST | Create Stripe checkout (single product) |
| `/api/checkout/bundle` | POST | Create Stripe checkout (bundle with discount) |
| `/api/checkout/products` | GET | List available products |
| `/api/webhooks/stripe` | POST | Handle Stripe payments |
| `/health` | GET | Server status |

## File Structure

```
backend/
├── server.js              # Main server
├── package.json           
├── env.example            # Environment template
├── DEVELOPER_SETUP.md     # Full setup guide
├── routes/
│   ├── licenses.js        # License validation
│   ├── trial.js           # Trial signup
│   ├── checkout.js        # Stripe checkout
│   └── webhooks.js        # Stripe webhooks
├── services/
│   ├── stripe.js          # Stripe integration
│   ├── email.js           # Brevo email
│   └── licenseGenerator.js
├── database/
│   ├── db.js              # SQLite connection
│   └── schema.sql         # Tables
└── templates/
    ├── purchase-email.html
    └── trial-email.html
```

## Pricing

| Plan | Price | Devices |
|------|-------|---------|
| Free Trial | $0 | 1 (7 days) |
| Personal Vault | $49 | 1 (lifetime) |
| Family Vault | $79 | 5 (lifetime) |
| **Family Protection Bundle** | **$179** | **5 devices (both products)** |
| *Save $29 when buying LPV Family + LLV Family together* | | |

## Support

Contact: support@localpasswordvault.com
