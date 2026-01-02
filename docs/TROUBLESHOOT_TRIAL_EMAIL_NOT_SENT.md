# Troubleshoot Trial Email Not Being Sent

## 🔍 Quick Diagnosis

If you requested a trial key but didn't receive the email, check these:

### 1. **Backend Server is Running** ✅
- The backend server must be running for emails to be sent
- Check: `npm start` in the `backend/` directory
- Status: Backend is currently running

### 2. **Email Service Configuration**

The email service requires these environment variables in `backend/.env`:

```env
BREVO_API_KEY=xkeysib-your-api-key-here
FROM_EMAIL=noreply@localpasswordvault.com
SUPPORT_EMAIL=support@localpasswordvault.com
```

**Check if these are set:**
- ✅ `BREVO_API_KEY` - Should be set (you provided it earlier)
- ❓ `FROM_EMAIL` - May not be set
- ❓ `SUPPORT_EMAIL` - May not be set

### 3. **Common Issues**

#### Issue 1: Missing FROM_EMAIL
**Symptom:** Email service fails to send
**Fix:** Add to `backend/.env`:
```env
FROM_EMAIL=noreply@localpasswordvault.com
```

#### Issue 2: Invalid Brevo API Key
**Symptom:** Brevo API errors in logs
**Fix:** 
- Go to Brevo Dashboard → Settings → SMTP & API → API Keys
- Verify the API key is correct
- Make sure it has "Send emails" permission

#### Issue 3: Email Domain Not Verified
**Symptom:** Emails rejected by Brevo
**Fix:**
- In Brevo, verify your sender domain (`localpasswordvault.com`)
- Or use a verified sender email address

#### Issue 4: Email in Spam Folder
**Symptom:** Email sent but not received
**Fix:**
- Check spam/junk folder
- Add `noreply@localpasswordvault.com` to contacts
- Check email filters

### 4. **Check Backend Logs**

The backend logs email errors. Check the console output for:

```
Email send failed: [error message]
Brevo API error: [error details]
```

**To see logs:**
1. Look at the terminal where `npm start` is running
2. Look for lines with "email" or "trial"
3. Check for error messages

### 5. **Test Email Sending**

You can test if email service is working:

**Option A: Use the test endpoint**
```bash
curl -X POST http://localhost:3001/api/test/send-email \
  -H "Content-Type: application/json" \
  -d '{"type": "trial", "email": "your-email@example.com"}'
```

**Option B: Check email service connection**
The backend has a health check that verifies email service.

### 6. **Verify Trial Was Created**

Even if email fails, the trial key is still created. Check:

1. **Check database:**
   - Go to Supabase Dashboard
   - Check `trials` table
   - Look for your email address
   - The trial key should be there

2. **Check response:**
   - When you request a trial, the API returns the trial key in development mode
   - Check the browser console or network tab
   - Look for the API response

### 7. **Email Service Initialization**

The email service initializes when the backend starts. If it fails:

**Error:** `BREVO_API_KEY is required`
- **Fix:** Set `BREVO_API_KEY` in `backend/.env`

**Error:** `Brevo API client not initialized`
- **Fix:** Restart the backend server after setting environment variables

---

## ✅ Quick Fix Checklist

1. [ ] Backend server is running (`npm start` in `backend/` directory)
2. [ ] `BREVO_API_KEY` is set in `backend/.env`
3. [ ] `FROM_EMAIL` is set in `backend/.env`
4. [ ] `SUPPORT_EMAIL` is set in `backend/.env` (optional but recommended)
5. [ ] Brevo API key is valid and has "Send emails" permission
6. [ ] Sender domain is verified in Brevo (if using custom domain)
7. [ ] Check spam folder
8. [ ] Check backend logs for errors

---

## 🔧 Step-by-Step Fix

### Step 1: Check Environment Variables

Open `backend/.env` and verify:

```env
BREVO_API_KEY=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
FROM_EMAIL=noreply@localpasswordvault.com
SUPPORT_EMAIL=support@localpasswordvault.com
```

**If `FROM_EMAIL` is missing, add it.**

### Step 2: Restart Backend Server

After updating `.env`:
1. Stop the backend server (Ctrl+C)
2. Start it again: `cd backend && npm start`
3. Check for initialization errors

### Step 3: Test Email Sending

Try requesting a trial key again and check:
1. Backend console for errors
2. Spam folder
3. Database for trial key (if email fails, key is still created)

### Step 4: Verify Brevo Configuration

1. Go to Brevo Dashboard
2. Settings → SMTP & API → API Keys
3. Verify your API key is active
4. Check sender domain verification

---

## 📊 Expected Behavior

**When trial is requested:**
1. ✅ Trial key is generated
2. ✅ Trial is saved to database
3. ✅ Email is sent via Brevo
4. ✅ API returns success response

**If email fails:**
- ❌ Email not sent
- ✅ Trial key still created
- ✅ API still returns success (email errors are logged but don't fail the request)

**This means:** Even if you don't get the email, the trial key exists in the database and you can retrieve it.

---

## 🚨 Still Not Working?

If emails still aren't being sent:

1. **Check Brevo Dashboard:**
   - Go to Brevo → Statistics
   - Check if emails are being sent
   - Look for bounce/spam reports

2. **Test with a different email:**
   - Try a Gmail, Outlook, or other major provider
   - Some email providers block unknown senders

3. **Check backend logs:**
   - Look for specific error messages
   - Share the error with support

4. **Verify API key permissions:**
   - Brevo API key must have "Send emails" permission
   - Check in Brevo Dashboard → Settings → SMTP & API → API Keys

---

**Last Updated:** After checking backend server status and email service configuration
