# Environment Variables

Create a `.env` file in the project root with these values:

```env
# Local Password Vault - Environment Configuration

# Application Mode
# Options: development, production, test
VITE_APP_MODE=production

# Application Version (shown in About screen)
VITE_APP_VERSION=1.0.0

# License Server URL (your Linode API)
VITE_LICENSE_SERVER_URL=https://server.localpasswordvault.com

# Stripe Publishable Key (from Stripe Dashboard → Developers → API Keys)
# Use pk_test_ for testing, pk_live_ for production
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE

# Trial Mode (set to "true" to enable trial features)
VITE_TRIAL_MODE=true

# Analytics (optional)
VITE_ANALYTICS_ENABLED=false
```

## Backend Environment Variables (Linode Server)

Create a `.env` file in `/var/www/lpv-api/` with:

```env
# Server Port
PORT=3000

# Supabase Database
SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...YOUR-SERVICE-ROLE-KEY

# Stripe Payment Processing
STRIPE_SECRET_KEY=sk_live_YOUR-SECRET-KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR-WEBHOOK-SECRET

# Brevo Email (SMTP)
BREVO_SMTP_USER=your-brevo-login-email
BREVO_SMTP_PASS=your-brevo-smtp-key

# JWT Secret for token signing (generate a random 32+ character string)
JWT_SECRET=your-super-secret-jwt-key-here-32chars
```

## Getting These Values

### Supabase
1. Go to https://supabase.com/dashboard
2. Select your project
3. Settings → API
4. Copy "Project URL" and "service_role" key (NOT anon key)

### Stripe
1. Go to https://dashboard.stripe.com
2. Developers → API Keys
3. Copy "Secret key" (sk_live_...) and "Publishable key" (pk_live_...)
4. Developers → Webhooks → Your endpoint → Signing secret (whsec_...)

### Brevo
1. Go to https://app.brevo.com
2. SMTP & API
3. Copy your login email and SMTP key

