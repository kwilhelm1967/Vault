# Brevo Transactional API Migration Guide

## ✅ Upgrade Complete

Your email service has been upgraded from **SMTP** to **Brevo Transactional API** for improved reliability, security, and deliverability.

## What Changed

### Benefits of Transactional API

- ✅ **Higher deliverability** - API-based sending has better inbox placement rates
- ✅ **Better error handling** - Detailed error responses with specific error codes
- ✅ **Built-in tracking** - Message IDs for tracking email delivery
- ✅ **More secure** - API keys are more secure than SMTP passwords
- ✅ **Rate limiting** - Built-in protection against abuse
- ✅ **Professional** - Industry standard for transactional emails

### Files Updated

1. **`services/email.js`** - Rewritten to use Brevo Transactional API
2. **`jobs/trialEmails.js`** - Updated to use the email service (no direct SMTP)
3. **`env.example`** - Updated configuration
4. **`README.md`** - Updated documentation
5. **`DEVELOPER_SETUP.md`** - Updated setup instructions

## Migration Steps

### 1. Get Your Brevo API Key

1. Log into [Brevo](https://app.brevo.com)
2. Go to **Settings → SMTP & API → API Keys**
3. Click **Generate a new API key**
4. Name it: `Local Password Vault Production`
5. Select permission: **Send emails**
6. Copy the API key (starts with `xkeysib-`)

### 2. Update Your `.env` File

**Remove these old SMTP variables:**
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-login-email
SMTP_PASSWORD=your-brevo-smtp-key
```

**Add the new API key:**
```bash
BREVO_API_KEY=xkeysib-your-api-key-here
```

### 3. Verify Configuration

Your `.env` should now have:
```bash
# Brevo (Transactional API)
BREVO_API_KEY=xkeysib-your-api-key-here

# Sender info (unchanged)
FROM_EMAIL=noreply@localpasswordvault.com
SUPPORT_EMAIL=support@localpasswordvault.com
```

### 4. Test the Connection

```bash
cd backend
node -e "require('./services/email').verifyConnection()"
```

You should see:
```
✓ Email service connection verified
  Account: your-email@example.com
  Plan: Free / Lite / Premium
```

### 5. Test Email Sending

The email service will automatically use the Brevo API. Test by:
- Making a trial signup
- Completing a purchase
- Running the trial emails job: `node jobs/trialEmails.js`

## API vs SMTP Comparison

| Feature | SMTP (Old) | Transactional API (New) |
|---------|------------|-------------------------|
| Deliverability | Good | Excellent |
| Error Messages | Generic | Detailed with codes |
| Tracking | Limited | Message IDs |
| Security | Password-based | API key-based |
| Rate Limits | Basic | Advanced |
| Professional | Standard | Enterprise-grade |

## Troubleshooting

### Error: "Brevo API client not initialized"

**Solution:** Make sure `BREVO_API_KEY` is set in your `.env` file.

### Error: "Invalid API key"

**Solution:** 
1. Verify the API key starts with `xkeysib-`
2. Check that the key has "Send emails" permission
3. Regenerate the key if needed

### Error: "Email send failed: Unauthorized"

**Solution:** Your API key may not have the correct permissions. Create a new key with "Send emails" permission.

## Rollback (If Needed)

If you need to rollback to SMTP temporarily:

1. Revert `services/email.js` to the previous version
2. Restore SMTP variables in `.env`
3. Restart the server

**Note:** We recommend staying with the Transactional API for better reliability.

## Support

- Brevo API Docs: https://developers.brevo.com/docs
- Brevo Dashboard: https://app.brevo.com
- Contact: support@localpasswordvault.com

---

**Migration completed successfully!** 🎉

Your email service is now using the most reliable, secure, and professional method available.

