# Backend Setup Checklist

Quick checklist to get your backend running for the admin dashboard.

## ✅ What You Already Have

- ✅ `ADMIN_API_KEY` - Already configured

## 🔧 Required Environment Variables

To start the backend server, you need these in `backend/.env`:

### 1. Server Configuration
```env
NODE_ENV=development  # or 'production'
PORT=3001
```

### 2. Supabase (Database)
```env
SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...YOUR-SERVICE-ROLE-KEY
```
**Where to find:**
- Supabase Dashboard → Settings → API
- Use the **service_role** key (NOT the anon key)

### 3. License Signing Secret
```env
LICENSE_SIGNING_SECRET=your-64-character-hex-string
```
**Generate with:**
```bash
openssl rand -hex 32
```
**Important:** This same secret must also be set in your frontend `VITE_LICENSE_SIGNING_SECRET`

### 4. Stripe
```env
STRIPE_SECRET_KEY=sk_live_xxxxx  # or sk_test_xxxxx for testing
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_PERSONAL=price_xxxxx
STRIPE_PRICE_FAMILY=price_xxxxx
STRIPE_PRICE_LLV_PERSONAL=price_xxxxx
STRIPE_PRICE_LLV_FAMILY=price_xxxxx
```
**Where to find:**
- Stripe Dashboard → API Keys
- Stripe Dashboard → Products → [Your Product] → Pricing

### 5. Brevo Email
```env
BREVO_API_KEY=xkeysib-xxxxx
FROM_EMAIL=noreply@localpasswordvault.com
SUPPORT_EMAIL=support@localpasswordvault.com
```
**Where to find:**
- Brevo Dashboard → Settings → SMTP & API → API Keys

### 6. Website URL
```env
WEBSITE_URL=https://localpasswordvault.com
```

### 7. Admin API Key (Already Set)
```env
ADMIN_API_KEY=XOhYqZH1sCM70dWIyjzrgLQVGxnfePRv4JK2ATNklDEi39SFwop8t6acB5Uumb
```

## 🚀 Quick Start (Development)

For **testing the admin dashboard only**, you can temporarily use minimal config:

1. Set `NODE_ENV=development` (makes some validations less strict)
2. Use test Stripe keys (`sk_test_...`)
3. Use placeholder values for non-critical items

However, some endpoints may not work without full configuration.

## ✅ Verify Configuration

After setting up your `.env` file, test if the backend can start:

```bash
cd backend
npm start
```

The server will validate all environment variables on startup and tell you what's missing or invalid.

## 📊 Using Admin Dashboard

Once backend is running:

1. Open `admin-dashboard.html` in your browser
2. Enter:
   - **API Key**: `XOhYqZH1sCM70dWIyjzrgLQVGxnfePRv4JK2ATNklDEi39SFwop8t6acB5Uumb`
   - **API URL**: `http://localhost:3001`
3. Click Login

## 🆘 Need Help?

If you're missing credentials or need help finding them:
- **Supabase**: Check your Supabase project dashboard
- **Stripe**: Check your Stripe account dashboard
- **Brevo**: Check your Brevo account settings
- **License Secret**: Generate new one with `openssl rand -hex 32`
