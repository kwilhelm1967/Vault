# Developer Instructions - Local Password Vault

## Hey Developer! Here's What I Need You To Do

I've built a desktop password manager app. The app itself is DONE. What I need YOU to do is connect it to the backend services so users can:

1. Buy a license through Stripe
2. Get their license key emailed to them
3. Download the app
4. Enter their key and start using it

**Everything you need is in the `/docs` folder.** Read this document first, then follow the steps below.

---

## THE BIG PICTURE

Here's what happens when someone buys my app:

```
User visits my website
        ↓
Clicks "Buy Now" ($49 Personal or $79 Family)
        ↓
Goes to Stripe checkout page
        ↓
Pays with credit card
        ↓
Stripe sends a "webhook" to our server saying "hey, someone paid!"
        ↓
Our server:
  1. Creates a license key (like LPV4-ABCD-1234-WXYZ-5678)
  2. Saves it to the database
  3. Sends an email to the customer with their key + download links
        ↓
Customer downloads the app (ZIP file with installer + docs)
        ↓
Customer runs installer, enters their license key
        ↓
App validates the key with our server
        ↓
Customer is in! They can use the app.
```

---

## WHAT SERVICES WE'RE USING

| Service | What It Does | I Already Have Account? |
|---------|--------------|------------------------|
| **Linode** | Hosts our API server | ✅ Yes |
| **Supabase** | Database (stores license keys) | ✅ Yes |
| **Stripe** | Takes payments | ✅ Yes |
| **Brevo** | Sends emails | ✅ Yes |
| **GitHub** | Where the code lives | ✅ Yes |

**I will give you login credentials for all of these.**

---

## YOUR TASKS - DO THESE IN ORDER

### ✅ TASK 1: Read The Documentation First (30 min)

Before you touch anything, read these files in this order:

1. **`docs/DEVELOPER_HANDOFF.md`** - Overview of everything
2. **`docs/BACKEND_SETUP_GUIDE.md`** - The actual server code you'll deploy
3. **`docs/INTEGRATION_CHECKLIST.md`** - Step-by-step checklist
4. **`docs/EMAIL_TEMPLATES.md`** - The email designs to use
5. **`docs/DOWNLOAD_PACKAGE_GUIDE.md`** - How to create download packages

**Don't skip this step.** It will save you hours of confusion.

---

### ✅ TASK 2: Set Up The Database (15 min)

**Where:** Supabase (I'll give you login)

**What to do:**
1. Log into Supabase
2. Go to SQL Editor
3. Copy the SQL from `docs/BACKEND_SETUP_GUIDE.md` (Section: "Step 1: Supabase Database Setup")
4. Paste it and click "Run"
5. This creates two tables: `licenses` and `purchases`

**How I know it's done:** You show me the tables in Supabase and they exist.

---

### ✅ TASK 3: Create Stripe Products (15 min)

**Where:** Stripe Dashboard (I'll give you login)

**What to do:**
1. Log into Stripe
2. Go to Products → Add Product
3. Create TWO products:

**Product 1:**
- Name: `Personal Vault`
- Price: `$49.00` (one-time payment, NOT subscription)
- Save it and write down the Price ID (starts with `price_`)

**Product 2:**
- Name: `Family Vault`  
- Price: `$79.00` (one-time payment, NOT subscription)
- Save it and write down the Price ID (starts with `price_`)

**How I know it's done:** You send me both Price IDs.

---

### ✅ TASK 4: Deploy The API Server (1 hour)

**Where:** My Linode server (I'll give you SSH access)

**What to do:**
1. SSH into the Linode server
2. Create a folder: `/var/www/lpv-api`
3. Create the files exactly as shown in `docs/BACKEND_SETUP_GUIDE.md`:
   - `package.json`
   - `server.js`
   - `.env` (with all the credentials I give you)
4. Run `npm install`
5. Start the server with PM2: `pm2 start server.js --name lpv-api`
6. Set up Nginx to point to it (instructions in the guide)
7. Get SSL certificate with Certbot (instructions in the guide)

**How I know it's done:** When I go to `https://server.localpasswordvault.com/` in my browser, I see:
```json
{"status":"ok","service":"Local Password Vault API","version":"1.0.0"}
```

---

### ✅ TASK 5: Set Up Stripe Webhook (15 min)

**Where:** Stripe Dashboard

**What to do:**
1. In Stripe, go to Developers → Webhooks
2. Click "Add endpoint"
3. Enter URL: `https://server.localpasswordvault.com/stripe-webhook`
4. Select event: `checkout.session.completed`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)
7. Add this to the `.env` file on the Linode server
8. Restart the API: `pm2 restart lpv-api`

**How I know it's done:** In Stripe webhooks, click "Send test webhook" and it shows success.

---

### ✅ TASK 6: Set Up Email Templates in Brevo (30 min)

**Where:** Brevo (I'll give you login)

**What to do:**
1. Log into Brevo
2. Go to Transactional → Email Templates
3. Create these 4 templates using the HTML from `docs/EMAIL_TEMPLATES.md`:

| Template Name | When It Sends |
|---------------|---------------|
| `purchase_confirmation` | Right after someone pays |
| `trial_started` | When someone starts free trial |
| `trial_expiring` | 3 days before trial ends |
| `trial_expired` | When trial ends |

4. For each template:
   - Click "New Template"
   - Choose "Code your own"
   - Paste the HTML from the docs
   - Set the subject line as shown in the docs
   - Save and note the Template ID

**How I know it's done:** You send me the Template IDs for all 4 templates.

---

### ✅ TASK 7: Create Download Packages (1 hour)

**Where:** Your computer / GitHub

**What to do:**
1. Clone the repo from GitHub
2. Build the installers:
   ```
   npm run dist:win
   npm run dist:mac
   npm run dist:linux
   ```
3. Convert these docs to PDF:
   - `docs/USER_MANUAL.md` → `User Manual.pdf`
   - `docs/PRIVACY_POLICY.md` → `Privacy Policy.pdf`
   - `docs/TERMS_OF_SERVICE.md` → `Terms of Service.pdf`
4. Create a Quick Start Guide (1-page PDF) - template in `docs/DOWNLOAD_PACKAGE_GUIDE.md`
5. Create ZIP packages for each platform containing:
   - The installer
   - README.txt
   - User Manual.pdf
   - Quick Start Guide.pdf
   - Privacy Policy.pdf
   - Terms of Service.pdf
   - License.txt
6. Upload the ZIPs to GitHub Releases

**How I know it's done:** I can download the ZIP files from GitHub and they contain everything.

---

### ✅ TASK 8: Set Up Download Links on Website (30 min)

**Where:** My website (localpasswordvault.com)

**What to do:**
1. Create download routes that redirect to the GitHub release ZIPs:
   - `localpasswordvault.com/download/windows` → Windows ZIP
   - `localpasswordvault.com/download/macos` → macOS ZIP
   - `localpasswordvault.com/download/linux` → Linux ZIP

2. Update the "Buy Now" buttons to create Stripe checkout sessions

**How I know it's done:** I click "Buy Now" and it takes me to Stripe checkout.

---

### ✅ TASK 9: Test The Whole Flow (1 hour)

**What to do:**

Test the PURCHASE flow:
1. Go to my website
2. Click "Buy Now" for Personal Vault
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete checkout
5. Verify:
   - ✅ License key appears in Supabase database
   - ✅ Email arrives with license key and download links
   - ✅ Download links work
6. Download the app, install it, enter the license key
7. Verify the app activates

Test the TRIAL flow:
1. Start a trial (if we have that on website)
2. Verify trial email arrives
3. Download and install
4. Enter trial key
5. Verify app works in trial mode

**How I know it's done:** You record a video showing the complete flow working.

---

### ✅ TASK 10: Fix The Floating Icon (30 min)

**What's the issue:** There's a floating icon that should appear after the user unlocks their vault. It might not be working because of missing IPC handlers.

**What to do:**
1. Test if the floating icon appears after unlocking the vault
2. If not, check the Electron console for errors
3. The fix might already be in place - just verify it works
4. The relevant files are:
   - `electron/main.js` (look for `createFloatingButton`)
   - `electron/preload.js` (look for `saveTrialInfo`)

**How I know it's done:** After I unlock my vault, a small floating icon appears that I can click to quickly access passwords.

---

### ✅ TASK 11: Set Up Code Signing (IMPORTANT - Do Before Public Release)

**Why this matters:** Without code signing:
- Windows shows scary "Unknown Publisher" warning
- Mac might completely BLOCK the app from opening
- Users won't trust the software

**GOOD NEWS: I already have the Windows certificate from SSL.com!**

I will give you:
- The certificate file (.pfx)
- The password for the certificate
- The instructions from SSL.com

---

**What to do:**

**1. Windows Signing (I have the certificate):**

   a. I'll send you the certificate file (.pfx) and password
   
   b. Put the certificate file somewhere secure on the build machine
   
   c. Create/update `.env` file in the project root:
   ```
   CSC_LINK=C:/path/to/my-certificate.pfx
   CSC_KEY_PASSWORD=the_password_I_give_you
   ```
   
   d. Rebuild the Windows installer:
   ```
   npm run dist:win
   ```
   
   e. Verify it worked:
   - Right-click the .exe file
   - Click "Properties"
   - Go to "Digital Signatures" tab
   - Should show our company name!

**2. Mac Signing (Need Apple Developer Account):**

   For Mac, we still need:
   - Apple Developer Account ($99/year) - https://developer.apple.com
   - Create "Developer ID Application" certificate
   - Set up notarization
   
   Add to `.env` file:
   ```
   APPLE_ID=your@email.com
   APPLE_ID_PASSWORD=app-specific-password
   APPLE_TEAM_ID=YOUR_TEAM_ID
   ```
   
   Rebuild: `npm run dist:mac`

   **NOTE:** If we don't have Apple Developer Account yet, we can skip Mac signing for now. Users can still install by right-clicking and selecting "Open".

---

**Full technical details:** See `docs/CODE_SIGNING_GUIDE.md`

**How I know it's done:** 
- Windows: Right-click the .exe → Properties → Digital Signatures tab shows our company name
- Mac: App opens without "unidentified developer" warning (if we set up Apple signing)

---

## CREDENTIALS I NEED TO GIVE YOU

Before you start, I'll send you:

- [ ] Supabase login (email + password)
- [ ] Stripe login (email + password)
- [ ] Brevo login (email + password)
- [ ] Linode SSH access (IP address + SSH key or password)
- [ ] GitHub repo access (if you don't already have it)
- [ ] **Windows Code Signing Certificate** (.pfx file from SSL.com)
- [ ] **Certificate Password** (for the .pfx file)
- [ ] **SSL.com Instructions** (the setup guide they provided)

---

## FILES YOU'LL BE WORKING WITH

| File | What It Is |
|------|------------|
| `docs/BACKEND_SETUP_GUIDE.md` | The server code to deploy |
| `docs/EMAIL_TEMPLATES.md` | HTML for all emails |
| `docs/DOWNLOAD_PACKAGE_GUIDE.md` | How to create ZIP packages |
| `electron/main.js` | Desktop app main process |
| `electron/preload.js` | Desktop app IPC bridge |
| `src/utils/licenseService.ts` | License validation logic |
| `src/utils/trialService.ts` | Trial management logic |

---

## HOW TO ASK ME QUESTIONS

If something is unclear:
1. Tell me which TASK number you're on
2. Tell me what step you're stuck on
3. Show me any error messages
4. I'll help you figure it out

---

## TIMELINE

| Task | Estimated Time |
|------|----------------|
| Task 1: Read docs | 30 min |
| Task 2: Database | 15 min |
| Task 3: Stripe products | 15 min |
| Task 4: Deploy API | 1 hour |
| Task 5: Stripe webhook | 15 min |
| Task 6: Email templates | 30 min |
| Task 7: Download packages | 1 hour |
| Task 8: Website links | 30 min |
| Task 9: Test everything | 1 hour |
| Task 10: Floating icon | 30 min |
| Task 11: Code signing | 2-3 hours* |
| **TOTAL** | **~8-9 hours** |

*Task 11 time varies - certificate purchase/verification can take 1-3 business days

---

## WHEN YOU'RE DONE

Send me:
1. ✅ Confirmation that API is live at `https://server.localpasswordvault.com/`
2. ✅ Screenshot of Supabase tables
3. ✅ Stripe Price IDs for both products
4. ✅ Brevo Template IDs for all 4 emails
5. ✅ Links to download packages on GitHub
6. ✅ Video of the complete purchase flow working
7. ✅ Video of the trial flow working
8. ✅ Confirmation floating icon works
9. ✅ Screenshot of Windows installer showing "Digital Signatures" tab with our name (after code signing)
10. ✅ Confirmation Mac app opens without security warnings (after code signing)

---

## QUESTIONS?

Call me or text me. Don't spend hours stuck on something - just ask!

---

*Document created: December 3, 2024*

