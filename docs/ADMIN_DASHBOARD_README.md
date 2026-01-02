# Admin Dashboard Guide

A simple, privacy-safe admin dashboard for managing your Local Password Vault business without needing SQL knowledge.

---

## 🎯 What It Does

The admin dashboard provides a **visual interface** to:
- ✅ View business statistics (revenue, licenses, trials)
- ✅ Search and manage licenses
- ✅ View customer information
- ✅ Monitor trial conversions
- ✅ Manage failed webhooks
- ✅ Resend license emails

**All without writing SQL queries!**

---

## 🔒 Privacy Promise Maintained

**This dashboard:**
- ✅ Only shows business transaction data (purchases, licenses, payments)
- ✅ Does NOT access user vault content
- ✅ Does NOT require network calls from user's app
- ✅ Does NOT break the "100% offline" promise

**What you can see:**
- License keys and activation status
- Customer emails (from purchases)
- Payment amounts
- Trial signups and conversions
- Support tickets

**What you CANNOT see:**
- User passwords
- Vault entries
- User documents
- App usage data
- Any user content

---

## 🚀 Quick Start

### Step 1: Set Admin API Key

1. Generate a secure API key:
   ```bash
   openssl rand -hex 32
   ```

2. Add to your backend `.env` file:
   ```env
   ADMIN_API_KEY=your-generated-key-here
   ```

3. Restart your backend server:
   ```bash
   pm2 restart lpv-api
   ```

### Step 2: Open Dashboard

1. Open `admin-dashboard.html` in your web browser
   - Double-click the file, or
   - Right-click → Open with → Browser

2. Enter your credentials:
   - **API Key**: The `ADMIN_API_KEY` from your `.env` file
   - **API URL**: Your backend URL (e.g., `https://api.localpasswordvault.com` or `http://localhost:3001` for local)

3. Click **Login**

---

## 📊 Dashboard Features

### Overview Statistics

**Shows at a glance:**
- Total licenses sold
- Activation rate
- Total revenue
- LPV vs LLV breakdown
- Trial statistics

**Updates automatically** when you click "Refresh All"

---

### Recent Licenses Tab

**Shows:**
- Last 50 licenses created (past 30 days)
- License key, product type, plan type
- Customer email (masked for privacy)
- Purchase amount
- Activation status
- Purchase date

**Useful for:**
- Seeing recent sales
- Checking if licenses were activated
- Monitoring new customers

---

### Search Licenses Tab

**Search by:**
- Email address
- License key
- Stripe session ID

**Shows:**
- All matching licenses
- License details
- Option to resend email

**Useful for:**
- Finding a specific customer's licenses
- Verifying license status
- Resending lost license emails

---

### Trials Tab

**Shows:**
- Total trial signups
- Activation rate
- Conversion rate (trials that became purchases)
- Expired trials

**Useful for:**
- Tracking trial performance
- Understanding conversion funnel
- Identifying opportunities for follow-up

---

### Top Customers Tab

**Shows:**
- Customers with multiple licenses
- Total amount spent per customer
- Products purchased
- Customer since date

**Useful for:**
- Identifying repeat customers
- Understanding customer lifetime value
- Finding your best customers

---

### Failed Webhooks Tab

**Shows:**
- Webhook events that failed to process
- Error messages
- Option to retry processing

**Useful for:**
- Monitoring payment processing
- Fixing failed license generation
- Ensuring all purchases are processed

---

## 🔧 Actions Available

### Resend License Email

**When to use:**
- Customer says they didn't receive license email
- Customer lost their license key
- Need to send license to different email

**How:**
1. Search for the license
2. Click "Resend Email" button
3. Email is sent immediately

---

### Retry Failed Webhook

**When to use:**
- Payment completed but license wasn't created
- Webhook processing failed
- Need to reprocess a payment

**How:**
1. Go to "Failed Webhooks" tab
2. Click "Retry" button
3. Webhook is reprocessed

**Note:** Only retry if you're sure the payment was successful in Stripe.

---

## 🛡️ Security

### API Key Security

**Important:**
- Keep your `ADMIN_API_KEY` secret
- Don't share it publicly
- Don't commit it to git
- Use a strong, random key

**Generate secure key:**
```bash
openssl rand -hex 32
```

### Access Control

**Current setup:**
- Simple API key authentication
- Anyone with the key can access the dashboard

**For production, consider:**
- IP whitelisting (add to backend)
- More complex authentication (JWT, OAuth)
- HTTPS only access
- Rate limiting

---

## 📍 File Locations

**Dashboard file:**
- `admin-dashboard.html` (project root)

**Backend endpoints:**
- `backend/routes/admin.js` (admin API routes)
- `backend/database/db.js` (database queries)

**Configuration:**
- `backend/.env` (ADMIN_API_KEY setting)

---

## 🐛 Troubleshooting

### "Invalid API key" Error

**Check:**
1. `ADMIN_API_KEY` is set in backend `.env` file
2. Backend server was restarted after adding the key
3. You're using the correct key (copy-paste to avoid typos)
4. API URL is correct

---

### "Connection Error" or "Failed to Fetch"

**Check:**
1. Backend server is running
2. API URL is correct (check for typos)
3. CORS is configured (should be automatic)
4. Firewall isn't blocking the connection

**For local development:**
- Use `http://localhost:3001`
- Make sure backend is running on port 3001

**For production:**
- Use `https://api.localpasswordvault.com`
- Make sure SSL certificate is valid

---

### Data Not Loading

**Check:**
1. Backend is connected to database
2. Database has data (check Supabase dashboard)
3. Browser console for errors (F12 → Console)
4. Network tab for failed requests

---

### Dashboard Shows "Loading..." Forever

**Possible causes:**
1. API endpoint doesn't exist (check backend routes)
2. Database query is failing (check backend logs)
3. CORS issue (check browser console)

**Solution:**
- Check backend logs: `pm2 logs lpv-api`
- Check browser console (F12) for errors
- Verify API endpoints are working: `curl -H "x-admin-api-key: YOUR_KEY" http://localhost:3001/api/admin/stats/overview`

---

## 📝 Notes

### Privacy Compliance

**This dashboard is privacy-safe because:**
- ✅ Only shows business transaction data
- ✅ No user content is displayed
- ✅ No data is collected from user's app
- ✅ All data comes from purchase/license records

**You can safely use this dashboard** without violating your privacy promise.

---

### No SQL Knowledge Required

**The dashboard handles all queries for you:**
- Statistics are calculated automatically
- Search works without SQL
- All data is formatted and displayed

**You never need to write SQL** - just use the dashboard!

---

### Offline Promise Maintained

**This dashboard:**
- ✅ Only reads from database (no app data)
- ✅ Doesn't require network calls from user's app
- ✅ Doesn't break the "100% offline" promise

**User's app remains 100% offline** after activation.

---

## 🎓 Example Use Cases

### Daily Check-in

1. Open dashboard
2. Check "Overview Statistics"
3. Review "Recent Licenses" for new sales
4. Check "Failed Webhooks" for any issues

**Time:** 2 minutes

---

### Customer Support

1. Customer says they didn't receive license
2. Go to "Search Licenses" tab
3. Search by customer email
4. Click "Resend Email"

**Time:** 30 seconds

---

### Weekly Review

1. Check "Overview Statistics" for revenue
2. Review "Trials" tab for conversion rate
3. Check "Top Customers" for repeat business
4. Review "Failed Webhooks" for issues

**Time:** 5 minutes

---

## 🔄 Updates

**To update the dashboard:**
- Edit `admin-dashboard.html`
- Refresh browser to see changes
- No backend restart needed (unless you change API endpoints)

**To add new features:**
1. Add new endpoint to `backend/routes/admin.js`
2. Add UI to `admin-dashboard.html`
3. Test locally first

---

## 📞 Support

**If you need help:**
- Check backend logs: `pm2 logs lpv-api`
- Check browser console (F12) for errors
- Verify API key is correct
- Verify backend is running

---

**Last Updated:** 2025
**Version:** 1.0.0
