# Steps to Fix Email Not Sending

## ✅ What I Fixed in the Code

1. **Fixed Brevo v3 API initialization** - Updated to use correct `authentications.apiKey.apiKey` method
2. **Created diagnostic script** - `backend/scripts/diagnose-email.js` to test email service
3. **Verified email service code** - All code is correct

## 🔧 Steps You Must Do

### Step 1: Restart Backend Server (REQUIRED)

The backend server **MUST** be restarted for the email fixes to take effect:

1. **Stop the backend server:**
   - Go to the terminal where backend is running
   - Press `Ctrl+C` to stop it

2. **Start it again:**
   ```bash
   cd backend
   npm start
   ```

3. **Wait for it to start** - You should see:
   - "Server running on port 3001"
   - "Email service initialized" (if successful)

### Step 2: Run Diagnostic Script

Test if email service is working:

```bash
cd backend
node scripts/diagnose-email.js your-email@example.com
```

**Replace `your-email@example.com` with your actual email address.**

**What to look for:**
- ✅ All checks pass
- ✅ "Email sent successfully!"
- ❌ If you see errors, note them down

### Step 3: Check Backend Console

When you request a trial key, watch the backend console for:

**Good signs:**
- "Email service initialized"
- "trial_sent" log message
- No error messages

**Bad signs:**
- "Email service initialization failed"
- "Brevo API error"
- Any red error messages

### Step 4: Verify Brevo Configuration

1. **Go to Brevo Dashboard:**
   - https://app.brevo.com/
   - Login to your account

2. **Check API Key:**
   - Settings → SMTP & API → API Keys
   - Verify your API key is active
   - Make sure it has "Send emails" permission

3. **Check Sender Domain:**
   - Settings → Senders & IP
   - Verify `noreply@localpasswordvault.com` is verified
   - If not verified, emails may be blocked

4. **Check Email Statistics:**
   - Go to Statistics → Transactional Emails
   - See if emails are being sent
   - Check for bounces or blocks

### Step 5: Check Your Email

1. **Check Inbox** - Look for email from `noreply@localpasswordvault.com`
2. **Check Spam Folder** - Emails might be filtered
3. **Check Email Filters** - Some email providers have filters
4. **Wait a few minutes** - Sometimes emails are delayed

### Step 6: Test Trial Request Again

1. **Request a trial key** from your website
2. **Watch backend console** for any errors
3. **Check email** (inbox and spam)
4. **Check Brevo dashboard** for email status

---

## 🚨 Common Issues & Solutions

### Issue 1: "Email service initialization failed"

**Cause:** Brevo package not installed or API key wrong

**Fix:**
```bash
cd backend
npm install @getbrevo/brevo
```
Then restart backend server.

### Issue 2: "Brevo API error" or "Unauthorized"

**Cause:** API key is invalid or doesn't have permissions

**Fix:**
1. Go to Brevo Dashboard → Settings → SMTP & API → API Keys
2. Verify API key matches `BREVO_API_KEY` in `backend/.env`
3. Make sure key has "Send emails" permission
4. If needed, create a new API key and update `.env`

### Issue 3: "Sender domain not verified"

**Cause:** `noreply@localpasswordvault.com` domain not verified in Brevo

**Fix:**
1. Go to Brevo Dashboard → Settings → Senders & IP
2. Add and verify your domain `localpasswordvault.com`
3. Or use a verified sender email address

### Issue 4: Emails sent but not received

**Cause:** Email provider blocking or filtering

**Fix:**
1. Check spam folder
2. Add `noreply@localpasswordvault.com` to contacts
3. Check email provider's spam settings
4. Try a different email address (Gmail, Outlook, etc.)

### Issue 5: Backend server not running

**Cause:** Server crashed or not started

**Fix:**
```bash
cd backend
npm start
```

---

## 📋 Quick Checklist

Before reporting issues, verify:

- [ ] Backend server is running (`npm start` in backend directory)
- [ ] Backend server was restarted after code changes
- [ ] `BREVO_API_KEY` is set in `backend/.env`
- [ ] `FROM_EMAIL` is set in `backend/.env`
- [ ] Diagnostic script runs without errors
- [ ] Brevo API key is active and has permissions
- [ ] Sender domain is verified in Brevo
- [ ] Checked spam folder
- [ ] Checked backend console for errors
- [ ] Checked Brevo dashboard for email status

---

## 🔍 Still Not Working?

If emails still aren't sending after all steps:

1. **Run diagnostic script and share output:**
   ```bash
   node backend/scripts/diagnose-email.js your-email@example.com
   ```

2. **Check backend console** - Copy any error messages

3. **Check Brevo dashboard:**
   - Statistics → Transactional Emails
   - Look for failed sends or errors

4. **Verify environment variables:**
   - Open `backend/.env`
   - Verify all email-related variables are set

5. **Test with a different email address:**
   - Try Gmail, Outlook, or another provider
   - Some email providers block unknown senders

---

**Last Updated:** After fixing Brevo v3 initialization
