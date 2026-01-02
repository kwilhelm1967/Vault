# Developer Onboarding Guide

**Welcome!** This document covers essential information you need to know before starting work on the Local Password Vault project. This supplements the existing documentation (`DEVELOPER_HANDOFF.md`, `DEVELOPER_SKILLS_REQUIREMENTS.md`) with practical, day-to-day knowledge.

---

## 📋 Quick Reference

**Start Here:**
1. Read `DEVELOPER_HANDOFF.md` - Your main task list
2. Read `DEVELOPER_SKILLS_REQUIREMENTS.md` - Skills assessment
3. Read this document - Practical knowledge
4. Review `docs/ARCHITECTURE.md` - System design
5. Review `docs/CODE_QUALITY_STANDARDS.md` - Coding standards

---

## 🎯 Project Overview

**What is Local Password Vault?**
- Offline-first password manager (Electron + React + TypeScript)
- One-time purchase (no subscriptions)
- 100% offline after activation (critical requirement)
- Backend API for license management and payments

**Current Status:**
- ✅ Code is complete and tested
- ✅ Frontend and backend implemented
- ⚠️ **Your job**: Deploy, configure services, test, and launch

**You are NOT:**
- Writing new features
- Fixing bugs (unless discovered during deployment)
- Refactoring code
- Learning new technologies

**You ARE:**
- Deploying existing code to production
- Configuring third-party services (Stripe, Supabase, Brevo)
- Testing end-to-end flows
- Building installers
- Creating GitHub releases

---

## 🚨 Critical Requirements (DO NOT VIOLATE)

### 1. **100% Offline After Activation**
- **CRITICAL**: After license activation, the app must work completely offline
- **NO** network calls after activation (except during activation/transfer)
- **NO** analytics, telemetry, or data collection
- **NO** error reporting to external services from the app
- **Backend** can use Sentry (server-side only)

**How to Verify:**
- Activate license
- Disconnect internet
- Use app for 30+ minutes
- Check browser DevTools → Network tab → **ZERO requests**

### 2. **License System Uses HMAC-SHA256 (Not JWT)**
- License files are signed with HMAC-SHA256
- Same `LICENSE_SIGNING_SECRET` must be in backend AND frontend
- Frontend validates licenses offline using signature verification
- **DO NOT** change the license validation logic

### 3. **Privacy Promise**
- User's vault data never leaves their device
- Only license keys and device hashes sent to server (for activation)
- No user passwords, entries, or vault data stored on server
- This is a **marketing promise** - must be maintained

---

## 🛠️ Development Environment Setup

### Prerequisites
```bash
# Required versions
Node.js: 18+ (check with: node --version)
npm: 9+ (check with: npm --version)
Git: Latest
```

### Initial Setup
```bash
# Clone repository
git clone https://github.com/kwilhelm1967/Vault.git
cd Vault

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Copy environment files
cp backend/env.example backend/.env
# Edit backend/.env with your values (see DEVELOPER_SETUP.md)
```

### Development Commands

**Frontend (Web):**
```bash
npm run dev:vite        # Start Vite dev server (web only)
```

**Frontend (Electron):**
```bash
npm run dev             # Start Electron + Vite (full desktop app)
```

**Backend:**
```bash
cd backend
npm run dev             # Start with nodemon (auto-restart)
npm start               # Start production server
```

**Building:**
```bash
npm run build           # Build web version
npm run dist:win        # Build Windows installer
npm run dist:mac        # Build macOS installer (requires macOS)
npm run dist:linux      # Build Linux installer (requires Linux)
```

**Testing:**
```bash
npm test                # Run unit tests
npm run test:e2e        # Run E2E tests (Playwright)
cd backend && npm test  # Run backend tests
```

---

## 📁 Key Files & Directories

### Frontend Structure
```
src/
├── components/         # React components
│   ├── MainVault.tsx   # Main vault interface
│   ├── LoginScreen.tsx # License/trial activation
│   └── Dashboard.tsx   # Overview screen
├── utils/
│   ├── storage.ts      # Encrypted storage service
│   ├── licenseService.ts # License activation/validation
│   ├── encryption.ts   # AES-256-GCM encryption
│   └── memorySecurity.ts # Memory clearing utilities
└── hooks/              # Custom React hooks
```

### Backend Structure
```
backend/
├── server.js           # Main Express server
├── routes/             # API endpoints
│   ├── licenses.js     # License validation
│   ├── trial.js        # Trial signup
│   ├── checkout.js     # Stripe checkout
│   └── webhooks.js     # Stripe webhook handler
├── services/
│   ├── stripe.js       # Stripe integration
│   ├── email.js        # Brevo email service
│   └── licenseGenerator.js # License key generation
└── database/
    ├── db.js           # Supabase connection
    └── schema.sql      # Database schema
```

### Important Configuration Files
- `package.json` - Frontend dependencies and scripts
- `backend/package.json` - Backend dependencies
- `backend/env.example` - Environment variable template
- `electron-builder.json` - Electron build configuration
- `vite.config.ts` - Vite build configuration
- `tsconfig.json` - TypeScript configuration

---

## 🔑 Environment Variables

### Backend (`.env` file)
**Required:**
- `LICENSE_SIGNING_SECRET` - Generate with: `openssl rand -hex 32`
- `STRIPE_SECRET_KEY` - From Stripe Dashboard
- `STRIPE_WEBHOOK_SECRET` - From Stripe webhook configuration
- `STRIPE_PRICE_PERSONAL`, `STRIPE_PRICE_FAMILY`, etc. - Stripe Price IDs
- `BREVO_API_KEY` - From Brevo dashboard
- `SUPABASE_URL` - From Supabase dashboard
- `SUPABASE_SERVICE_KEY` - Service role key (NOT anon key)
- `FROM_EMAIL`, `SUPPORT_EMAIL` - Email addresses

**Optional:**
- `SENTRY_DSN` - Error tracking (backend only)

### Frontend (Build-time)
The frontend uses Vite environment variables. Check `vite.config.ts` for:
- `VITE_LICENSE_SIGNING_SECRET` - Must match backend `LICENSE_SIGNING_SECRET`
- `VITE_API_URL` - Backend API URL (for activation only)

**Important:** Frontend env vars are baked into the build. Change requires rebuild.

---

## 🔄 Common Workflows

### Testing License Activation
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `npm run dev`
3. Open app, go to license activation
4. Enter test license key (check database for valid keys)
5. Verify activation succeeds
6. Disconnect internet
7. Verify app works offline

### Testing Purchase Flow
1. Use Stripe test mode keys in `.env`
2. Go to pricing page
3. Click "Buy Now"
4. Complete Stripe checkout (use test card: 4242 4242 4242 4242)
5. Verify webhook received (check backend logs)
6. Verify email sent (check Brevo dashboard)
7. Verify license key in database
8. Activate license in app

### Building Installers
```bash
# Windows (can build on Windows)
npm run dist:win

# macOS (requires macOS system)
npm run dist:mac

# Linux (requires Linux system)
npm run dist:linux
```

**Output location:** `dist/` directory

---

## 🐛 Common Issues & Solutions

### Issue: Backend won't start
**Symptoms:** `Error: Cannot find module` or port already in use

**Solutions:**
- Run `cd backend && npm install` to ensure dependencies installed
- Check if port 3001 is in use: `lsof -i :3001` (Mac/Linux) or `netstat -ano | findstr :3001` (Windows)
- Kill process using port or change `PORT` in `.env`

### Issue: License activation fails
**Symptoms:** "Invalid license key" or "Network error"

**Solutions:**
- Verify `LICENSE_SIGNING_SECRET` matches in backend `.env` and frontend build
- Check backend is running and accessible
- Verify API URL is correct in frontend config
- Check backend logs for error details

### Issue: Email not sending
**Symptoms:** No email received after purchase/trial signup

**Solutions:**
- Verify `BREVO_API_KEY` is correct in `.env`
- Check Brevo dashboard for API key status
- Verify sender email is verified in Brevo
- Check backend logs for email errors
- Test with Brevo API directly (see Brevo docs)

### Issue: Webhook not firing
**Symptoms:** Purchase completes but no license generated

**Solutions:**
- Verify webhook endpoint URL in Stripe dashboard matches your server
- Check `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`
- Check backend logs for webhook errors
- Verify SSL certificate is valid (for production)

### Issue: Build fails
**Symptoms:** `electron-builder` errors or missing dependencies

**Solutions:**
- Ensure all dependencies installed: `npm install`
- Check Node.js version: `node --version` (must be 18+)
- Clear cache: `rm -rf node_modules package-lock.json && npm install`
- Check `electron-builder.json` for platform-specific requirements

### Issue: App works in dev but not in production build
**Symptoms:** Features work in `npm run dev` but fail in built app

**Solutions:**
- Check environment variables are set at build time (Vite env vars)
- Verify `LICENSE_SIGNING_SECRET` is in build config
- Check for `console.log` statements (should use `devLog` instead)
- Verify all assets are included in build (check `dist/` folder)

---

## 🔐 Security Considerations

### Secrets Management
- **NEVER** commit `.env` files to git
- **NEVER** share `LICENSE_SIGNING_SECRET` publicly
- **NEVER** use production keys in development
- Use different Stripe keys for test vs production

### Code Review Checklist
Before deploying:
- [ ] No hardcoded secrets in code
- [ ] No `console.log` in production code (use `devLog`)
- [ ] No network calls after activation (except activation/transfer)
- [ ] Input validation on all user inputs
- [ ] Error messages don't expose sensitive data

---

## 📊 Testing Strategy

### What to Test

**Critical Paths (Must Test):**
1. ✅ Trial signup → Email received → Activation works
2. ✅ Purchase flow → Webhook → Email → License activation
3. ✅ License activation → App works offline
4. ✅ License transfer → Works on new device
5. ✅ Bundle purchase → Multiple licenses generated

**Error Scenarios:**
1. Invalid license key format
2. Network failure during activation
3. Expired trial
4. Transfer limit exceeded
5. Invalid device hash

**Platform Testing:**
- Windows installer works
- macOS installer works (if built)
- Linux installer works (if built)
- App works on each platform

### Testing Tools
- **Backend API:** Use `curl` or Postman
- **Frontend:** Browser DevTools (Network tab, Console)
- **E2E:** Playwright tests (`npm run test:e2e`)
- **Unit Tests:** Jest (`npm test`)

---

## 📝 Git Workflow

### Branch Strategy
- **Main branch:** `main` (production-ready code)
- **Feature branches:** `feature/description` (for new work)
- **Hotfix branches:** `hotfix/description` (for urgent fixes)

### Commit Messages
Use clear, descriptive commit messages:
```
feat: Add bundle purchase support
fix: Resolve webhook signature validation issue
docs: Update deployment instructions
test: Add E2E tests for license activation
```

### Before Committing
- [ ] Code follows `CODE_QUALITY_STANDARDS.md`
- [ ] No `console.log` statements
- [ ] No `.env` files committed
- [ ] Tests pass: `npm test`
- [ ] Linter passes: `npm run lint`

---

## 🚀 Deployment Checklist

Before deploying to production:

### Backend
- [ ] All environment variables set in `.env`
- [ ] Database schema executed in Supabase
- [ ] Stripe products created and Price IDs configured
- [ ] Stripe webhook endpoint configured
- [ ] Brevo API key configured and tested
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] PM2 configured for auto-restart
- [ ] Cron job set up for trial emails
- [ ] Health endpoint responds: `curl https://api.localpasswordvault.com/health`

### Frontend
- [ ] `LICENSE_SIGNING_SECRET` matches backend
- [ ] API URL points to production backend
- [ ] Build succeeds: `npm run build`
- [ ] Installers built and tested
- [ ] Download packages created
- [ ] GitHub release created with installers

### Testing
- [ ] End-to-end purchase flow tested
- [ ] License activation tested
- [ ] Offline operation verified
- [ ] Email delivery verified
- [ ] Error scenarios tested

---

## 📞 Communication & Support

### Key Contacts
- **Project Owner:** Kelly (via hiring platform/email)
- **Support Email:** support@localpasswordvault.com
- **GitHub Issues:** https://github.com/kwilhelm1967/Vault/issues

### When to Ask for Help
- **Blocked:** Can't proceed without information/access
- **Unclear Requirements:** Documentation doesn't cover your situation
- **Critical Issues:** Security vulnerabilities or data loss risks

### What to Document
- Configuration changes made
- Issues encountered and solutions
- Test results
- Deployment steps taken
- Any deviations from documentation

---

## 🎓 Learning Resources

### Project-Specific
- `docs/ARCHITECTURE.md` - System design
- `docs/CODE_QUALITY_STANDARDS.md` - Coding standards
- `backend/README.md` - Backend API docs
- `README.md` - Project overview

### Technology-Specific
- **Electron:** https://www.electronjs.org/docs
- **React:** https://react.dev
- **TypeScript:** https://www.typescriptlang.org/docs
- **Stripe:** https://stripe.com/docs
- **Supabase:** https://supabase.com/docs
- **Brevo:** https://developers.brevo.com

---

## ⚠️ Important Notes

### What NOT to Change
- **License validation logic** - Uses HMAC-SHA256, don't change
- **Encryption implementation** - AES-256-GCM is correct
- **Offline-first architecture** - Core requirement
- **Database schema** - Already defined in `schema.sql`

### What You CAN Change
- Configuration values (env vars)
- Email templates (if needed)
- Build configuration (if needed)
- Documentation (improvements welcome)

### Performance Expectations
- License activation: < 2 seconds
- Vault unlock: < 1 second
- Entry save: < 500ms
- App startup: < 3 seconds

---

## ✅ Success Criteria

You'll know you're done when:

1. ✅ Backend API is live and accessible
2. ✅ Health endpoint responds: `https://api.localpasswordvault.com/health`
3. ✅ Test purchase completes successfully
4. ✅ License key generated and emailed
5. ✅ License activates in app
6. ✅ App works completely offline after activation
7. ✅ Installers built and available for download
8. ✅ All documentation updated with actual values/URLs

---

## 🆘 Emergency Contacts

If something critical breaks:
1. Check backend logs: `pm2 logs lpv-api` (on server)
2. Check Stripe webhook logs in Stripe dashboard
3. Check Brevo email logs in Brevo dashboard
4. Check Supabase logs in Supabase dashboard
5. Contact project owner if issue is blocking

---

## 📚 Additional Resources

- **Stripe Test Cards:** https://stripe.com/docs/testing
- **Supabase SQL Editor:** https://app.supabase.com/project/_/sql
- **Brevo API Docs:** https://developers.brevo.com
- **Let's Encrypt:** https://letsencrypt.org/docs
- **PM2 Docs:** https://pm2.keymetrics.io/docs

---

**Version:** 1.0.0

**Remember:** The code is complete. Your job is deployment, configuration, and testing. When in doubt, refer to `DEVELOPER_HANDOFF.md` for the complete task list.
