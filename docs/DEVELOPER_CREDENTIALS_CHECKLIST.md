# Developer Credentials Checklist

A comprehensive list of credentials and access information to provide your developer for efficient setup.

---

## ✅ Already Configured

You've already provided:
- ✅ Supabase Project URL: `https://kzsbotkuhoigmoqinkiz.supabase.co`
- ✅ Supabase Service Role Key: `eyJhbGc...` (configured in `.env`)
- ✅ Admin API Key: `XOhYqZH1sCM70dWIyjzrgLQVGxnfePRv4JK2ATNklDEi39SFwop8t6acB5Uumb`
- ✅ License Signing Secret: Generated and configured

---

## 🔐 Additional Credentials to Provide

### 1. Supabase (Database)

**Already have:**
- ✅ Project URL
- ✅ Service Role Key

**Optional but helpful:**
- [ ] **Anon Key** (for frontend if needed)
  - Location: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`
  - Format: `eyJhbGc...` (long string)
  - Use: Frontend applications (if using Supabase client directly)
  
- [ ] **Database Schema Status**
  - Check: Has `backend/database/schema.sql` been run?
  - Location: Supabase Dashboard → SQL Editor
  - Status: Are tables created? (`licenses`, `trials`, `customers`, `webhook_events`, etc.)

- [ ] **Database Connection Pooling** (if configured)
  - Connection string (if using direct PostgreSQL connection)
  - Location: Supabase Dashboard → Settings → Database → Connection Pooling

---

### 2. Linode (Production Server)

**Critical for deployment:**

- [ ] **Server Access**
  - [ ] Server IP Address or Domain
  - [ ] SSH Username (usually `root` or specific user)
  - [ ] SSH Password OR SSH Private Key
  - [ ] SSH Port (usually 22)

- [ ] **Server Information**
  - [ ] Operating System (e.g., Ubuntu 22.04, Debian 11)
  - [ ] Node.js version installed (if any)
  - [ ] PM2 status (is backend already running?)
  - [ ] Server location/path where code is deployed (e.g., `/var/www/lpv-api`)

- [ ] **Domain & DNS**
  - [ ] API Domain: `api.localpasswordvault.com` (or your API domain)
  - [ ] Frontend Domain(s): `localpasswordvault.com`, `locallegacyvault.com`
  - [ ] DNS Provider (Cloudflare, Linode DNS, etc.)
  - [ ] Current DNS records (A records, CNAME records)

- [ ] **Web Server Configuration**
  - [ ] Nginx installed? (Location: `/etc/nginx/`)
  - [ ] Nginx config file location (usually `/etc/nginx/sites-available/`)
  - [ ] SSL Certificate type (Let's Encrypt, custom, etc.)
  - [ ] SSL Certificate location

- [ ] **Firewall/Network**
  - [ ] Firewall status (UFW, iptables, etc.)
  - [ ] Open ports (22, 80, 443, 3001?)
  - [ ] Cloudflare protection enabled? (if using Cloudflare)

**Nice to have:**
- [ ] Server monitoring setup (if any)
- [ ] Backup strategy (if configured)
- [ ] Server resource limits (RAM, CPU, disk space)

---

### 3. Brevo (Email Service)

**Required:**
- [ ] **API Key**
  - Location: Brevo Dashboard → Settings → SMTP & API → API Keys
  - Format: `xkeysib-...` (starts with `xkeysib-`)
  - Permission: Must have "Send emails" permission
  - Status: Already configured in `.env`? (Check `backend/.env`)

**Helpful to provide:**
- [ ] **Sender Email Verification Status**
  - Is `noreply@localpasswordvault.com` verified?
  - Is `support@localpasswordvault.com` verified?
  - Location: Brevo Dashboard → Senders & IP → Senders
  - Status: Verified/Unverified

- [ ] **Email Sending Limits**
  - Daily sending limit
  - Monthly sending limit
  - Current usage
  - Location: Brevo Dashboard → Settings → Account → Plan

- [ ] **Domain Authentication** (if using custom domain)
  - SPF records configured?
  - DKIM records configured?
  - Domain verification status
  - Location: Brevo Dashboard → Senders & IP → Domains

**Optional:**
- [ ] Email templates (if any custom templates exist)
- [ ] Email logs/reports access

---

### 4. Stripe (Payment Processing)

**Critical for payment functionality:**

- [ ] **API Keys**
  - [ ] Live Secret Key: `sk_live_...` (production)
  - [ ] Test Secret Key: `sk_test_...` (development)
  - [ ] Live Publishable Key: `pk_live_...` (frontend)
  - [ ] Test Publishable Key: `pk_test_...` (frontend)
  - [ ] Location: Stripe Dashboard → Developers → API keys

- [ ] **Webhook Configuration**
  - [ ] Webhook Endpoint URL: `https://api.localpasswordvault.com/api/webhooks/stripe`
  - [ ] Webhook Signing Secret: `whsec_...`
  - [ ] Events configured: `checkout.session.completed`
  - [ ] Location: Stripe Dashboard → Developers → Webhooks
  - [ ] Status: Is webhook endpoint active and receiving events?

- [ ] **Product & Price IDs**
  - [ ] LPV Personal Price ID: `price_...`
  - [ ] LPV Family Price ID: `price_...`
  - [ ] LLV Personal Price ID: `price_...`
  - [ ] LLV Family Price ID: `price_...`
  - [ ] Location: Stripe Dashboard → Products → [Product Name] → Pricing
  - [ ] Status: Are all products and prices created?

**Helpful:**
- [ ] Stripe account mode (Live vs Test)
- [ ] Payment method types enabled (Credit cards, etc.)
- [ ] Currency settings
- [ ] Tax configuration (if any)

---

### 5. Additional Services (If Applicable)

**Sentry (Error Tracking - Optional):**
- [ ] Sentry DSN URL
  - Format: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`
  - Location: Sentry Dashboard → Settings → Projects → [Project] → Client Keys (DSN)
  - Status: Project created?

**GitHub (Code Repository):**
- [ ] Repository URL: `https://github.com/kwilhelm1967/Vault.git`
- [ ] Access permissions (read-only vs read-write)
- [ ] Branch to deploy from (usually `main` or `master`)

**Domain Registrar:**
- [ ] Domain registrar account access (if developer needs DNS changes)
- [ ] Domain names: `localpasswordvault.com`, `locallegacyvault.com`

---

## 📋 Priority Checklist for Developer

### Immediate Needs (To Start Development):
1. ✅ Supabase credentials (already provided)
2. [ ] Brevo API Key (if not already in `.env`)
3. [ ] Stripe API Keys (test keys for development)
4. [ ] Stripe Price IDs (test prices)

### For Deployment (When Ready):
1. [ ] Linode server access (SSH credentials)
2. [ ] Server domain/IP address
3. [ ] Nginx configuration details
4. [ ] SSL certificate information
5. [ ] Stripe live keys (for production)
6. [ ] Domain DNS access (if needed)

---

## 🔒 Security Best Practices

**When sharing credentials:**

1. **Use secure communication** - Share via encrypted channels (password managers, encrypted email)
2. **Use environment variables** - Never hardcode credentials in code
3. **Share only what's needed** - Don't share full account passwords if API keys will work
4. **Rotate after sharing** - Consider rotating keys after developer setup is complete
5. **Use read-only access when possible** - For services that support it (Supabase, Stripe test mode)

**For the developer:**
- Store all credentials in `.env` files (never commit to git)
- Use `.gitignore` to exclude `.env` files
- Keep credentials secure and don't share publicly
- Rotate keys if exposed

---

## 📝 Quick Reference: Where to Find Credentials

| Service | Location | What to Look For |
|---------|----------|------------------|
| **Supabase** | Dashboard → Settings → API | Service Role Key, Anon Key |
| **Linode** | Linode Dashboard → Linodes | IP Address, SSH Access |
| **Brevo** | Dashboard → Settings → SMTP & API | API Key |
| **Stripe** | Dashboard → Developers → API keys | Secret Key, Publishable Key |
| **Stripe** | Dashboard → Developers → Webhooks | Webhook Signing Secret |
| **Stripe** | Dashboard → Products → [Product] | Price IDs |

---

## 🚀 Next Steps

Once you've gathered the credentials above:

1. **Share securely** with your developer
2. **Developer updates** `backend/.env` file with credentials
3. **Developer tests** connection to each service
4. **Developer deploys** to Linode server (when ready)
5. **Verify** all services are working correctly

---

**Last Updated:** 2025
**Version:** 1.0.0
