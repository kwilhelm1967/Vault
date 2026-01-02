# Troubleshoot Trial Email Not Sending

## 🔍 Problem

Trial key is generated but email is not received after signup.

---

## ✅ Checklist

### 1. Is Backend Server Running?

**Check:**
```bash
# Test if backend is running
curl http://localhost:3001/api/health
```

**Or visit in browser:**
```
http://localhost:3001/api/health
```

**If not running:**
```bash
cd backend
npm start
```

---

### 2. Is Email Configuration Correct?

**Check `backend/.env` has:**
- ✅ `BREVO_API_KEY` - Should start with `xkeysib-`
- ✅ `FROM_EMAIL` - Should be `noreply@localpasswordvault.com`
- ✅ `SUPPORT_EMAIL` - Should be `support@localpasswordvault.com`

**Verify Brevo API key:**
- Go to: Brevo Dashboard → Settings → SMTP & API → API Keys
- Make sure the key is active
- Check if key has "Send emails" permission

---

### 3. Check Backend Logs

**When you sign up for a trial, check backend console/logs for:**
- Email sending errors
- Brevo API errors
- Connection errors

**Look for:**
- `Email sent successfully` ✅
- `Email error` ❌
- `Failed to send email` ❌

---

### 4. Check Email Service Status

**Brevo API might be:**
- Rate limited (check Brevo dashboard)
- Temporarily down
- Requiring sender verification

**Check Brevo Dashboard:**
- Go to: Brevo Dashboard → Transactional → Statistics
- Check if emails are being sent
- Check for any errors or blocks

---

### 5. Check Spam Folder

**Sometimes emails:**
- Go to spam/junk folder
- Get filtered by email provider
- Take a few minutes to arrive

**Check:**
- Spam/Junk folder
- Promotions tab (Gmail)
- Wait 2-3 minutes

---

### 6. Verify Email Address

**Make sure:**
- Email address is valid
- Email address is accessible
- No typos in email address

---

### 7. Test Email Sending Directly

**Test if emails work at all:**

1. **Check backend logs when signing up:**
   - Look for email sending attempts
   - Look for errors

2. **Check Brevo dashboard:**
   - Go to: Brevo → Transactional → Statistics
   - See if emails are being sent
   - Check delivery status

3. **Test with a different email:**
   - Try a different email address
   - Use Gmail, Outlook, etc.
   - Check if email provider is blocking

---

## 🔧 Common Issues

### Issue: Backend Not Running
**Solution:** Start the backend server
```bash
cd backend
npm start
```

### Issue: Brevo API Key Invalid
**Solution:** 
- Verify API key in Brevo dashboard
- Regenerate key if needed
- Update `backend/.env`

### Issue: Email in Spam
**Solution:**
- Check spam folder
- Mark as "Not Spam"
- Add sender to contacts

### Issue: Rate Limiting
**Solution:**
- Check Brevo dashboard for rate limits
- Wait a few minutes
- Upgrade Brevo plan if needed

### Issue: Sender Not Verified
**Solution:**
- Verify sender email in Brevo
- Go to: Brevo → Senders & IP → Senders
- Verify `noreply@localpasswordvault.com`

---

## 🧪 Testing Steps

1. **Start backend server** (if not running)
2. **Sign up for trial** with your email
3. **Check backend console** for email logs
4. **Check Brevo dashboard** for sent emails
5. **Check email inbox** (and spam)
6. **Wait 2-3 minutes** (sometimes delayed)

---

## 📋 Debug Checklist

- [ ] Backend server is running
- [ ] Backend accessible at `http://localhost:3001`
- [ ] `BREVO_API_KEY` is set in `.env`
- [ ] `FROM_EMAIL` is set in `.env`
- [ ] Brevo API key is valid and active
- [ ] Sender email is verified in Brevo
- [ ] Backend logs show email sending attempts
- [ ] No errors in backend logs
- [ ] Checked spam folder
- [ ] Waited 2-3 minutes
- [ ] Tried different email address

---

**Last Updated:** 2025
