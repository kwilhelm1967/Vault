# Admin Features & Privacy Guide

**Purpose:** Define what admin/owner features are acceptable without breaking the "100% offline" and "no user content" brand promises.

---

## 🎯 Core Privacy Principles

### ✅ What's ALLOWED (Doesn't Break Privacy Promise)

**Business Transaction Data:**
- License keys and activation status
- Payment information (from Stripe)
- Customer email addresses (from purchases)
- Support tickets (user-initiated)
- License transfer history
- Trial signup information

**Aggregate Statistics:**
- Total licenses sold
- Activation rates
- Revenue statistics
- Product popularity (LPV vs LLV)
- Plan type distribution (Personal vs Family)
- Trial conversion rates

**Technical/Operational Data:**
- Backend error logs (server-side only)
- Webhook processing status
- API performance metrics
- System health monitoring

### ❌ What's NOT ALLOWED (Breaks Privacy Promise)

**User Content:**
- ❌ Passwords stored in vault
- ❌ Vault entries/records
- ❌ Personal information from vault
- ❌ Document contents
- ❌ Any data the user stores in the app

**User Behavior Tracking:**
- ❌ App usage analytics
- ❌ Feature usage statistics
- ❌ Time spent in app
- ❌ Click tracking
- ❌ User journey tracking

**Network Calls from App:**
- ❌ Telemetry from the app
- ❌ Error reporting from the app (after activation)
- ❌ Analytics from the app
- ❌ Any data transmission from user's device

---

## 📊 Current Admin Features (Already Implemented)

### 1. License Management

**What you can see:**
- ✅ All license keys
- ✅ Activation status (active/revoked)
- ✅ License type (Personal/Family, LPV/LLV)
- ✅ Customer email
- ✅ Purchase date
- ✅ Activation date
- ✅ Transfer count
- ✅ Device binding (hardware hash - anonymized)

**How to access:**
- Supabase Dashboard → `licenses` table
- Admin API: `GET /api/admin/licenses/search`

**Privacy Impact:** ✅ **ZERO** - This is business transaction data, not user content.

---

### 2. Customer Management

**What you can see:**
- ✅ Customer email addresses
- ✅ Stripe customer IDs
- ✅ Customer names (if provided during checkout)
- ✅ Purchase history
- ✅ All licenses associated with customer

**How to access:**
- Supabase Dashboard → `customers` table
- Join with `licenses` table for full history

**Privacy Impact:** ✅ **ZERO** - This is purchase/transaction data, not user content.

---

### 3. Payment & Revenue Tracking

**What you can see:**
- ✅ Stripe payment IDs
- ✅ Amount paid per license
- ✅ Checkout session IDs
- ✅ Payment dates
- ✅ Product purchased (LPV/LLV, Personal/Family)

**How to access:**
- Stripe Dashboard (full payment details)
- Database: `licenses` table has `amount_paid`, `stripe_payment_id`

**Privacy Impact:** ✅ **ZERO** - This is financial transaction data, not user content.

---

### 4. Trial Management

**What you can see:**
- ✅ Trial signup emails
- ✅ Trial key generated
- ✅ Trial start date
- ✅ Trial expiration date
- ✅ Activation status
- ✅ Conversion status (did they purchase?)

**How to access:**
- Supabase Dashboard → `trials` table

**Privacy Impact:** ✅ **ZERO** - This is signup/activation data, not user content.

---

### 5. Support Ticket System

**What you can see:**
- ✅ Support ticket submissions
- ✅ Customer email
- ✅ Issue description (user-provided)
- ✅ Ticket status
- ✅ Support conversations

**How to access:**
- Supabase Dashboard → `support_tickets` and `ticket_messages` tables

**Privacy Impact:** ✅ **ZERO** - This is user-initiated support communication, not vault content.

---

### 6. Webhook Monitoring

**What you can see:**
- ✅ Failed webhook events
- ✅ Webhook processing status
- ✅ Error messages (technical, not user data)
- ✅ Retry capability

**How to access:**
- Admin API: `GET /api/admin/webhooks/failed`
- Supabase Dashboard → `webhook_events` table

**Privacy Impact:** ✅ **ZERO** - This is system operational data, not user content.

---

### 7. Error Logging (Backend Only)

**What you can see:**
- ✅ Backend server errors
- ✅ API errors
- ✅ Database errors
- ✅ Email sending errors
- ✅ Webhook processing errors

**How to access:**
- Backend logs (PM2 logs)
- Sentry dashboard (if configured)

**Privacy Impact:** ✅ **ZERO** - Backend errors only, no user content. App errors are NOT sent.

---

## 🚀 Recommended Additional Admin Features (Privacy-Safe)

### 1. Dashboard/Statistics View

**What to show:**
```sql
-- Total licenses sold
SELECT COUNT(*) FROM licenses WHERE status = 'active';

-- Licenses by product type
SELECT product_type, COUNT(*) 
FROM licenses 
WHERE status = 'active' 
GROUP BY product_type;

-- Licenses by plan type
SELECT plan_type, COUNT(*) 
FROM licenses 
WHERE status = 'active' 
GROUP BY plan_type;

-- Activation rate
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN is_activated THEN 1 ELSE 0 END) as activated,
  ROUND(100.0 * SUM(CASE WHEN is_activated THEN 1 ELSE 0 END) / COUNT(*), 2) as activation_rate
FROM licenses 
WHERE status = 'active';

-- Revenue by product
SELECT 
  product_type,
  plan_type,
  SUM(amount_paid) / 100.0 as revenue_dollars,
  COUNT(*) as license_count
FROM licenses 
WHERE status = 'active'
GROUP BY product_type, plan_type;

-- Trial conversion rate
SELECT 
  COUNT(*) as total_trials,
  SUM(CASE WHEN is_converted THEN 1 ELSE 0 END) as conversions,
  ROUND(100.0 * SUM(CASE WHEN is_converted THEN 1 ELSE 0 END) / COUNT(*), 2) as conversion_rate
FROM trials;

-- Recent purchases (last 30 days)
SELECT 
  license_key,
  product_type,
  plan_type,
  email,
  amount_paid / 100.0 as amount,
  created_at
FROM licenses 
WHERE created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```

**Privacy Impact:** ✅ **ZERO** - Aggregate statistics only, no individual user content.

**Implementation:**
- Create admin dashboard page (web interface)
- Or add to existing admin API endpoints
- Use Supabase SQL queries

---

### 2. License Health Monitoring

**What to track:**
- Licenses that were created but never activated
- Licenses approaching transfer limit
- Recently revoked licenses
- Licenses with multiple activation attempts

**Privacy Impact:** ✅ **ZERO** - License status only, not user content.

**Example Queries:**
```sql
-- Unactivated licenses (older than 30 days)
SELECT license_key, email, created_at
FROM licenses 
WHERE status = 'active' 
  AND is_activated = false
  AND created_at < NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- Licenses near transfer limit
SELECT license_key, email, transfer_count
FROM licenses 
WHERE status = 'active'
  AND transfer_count >= 2
ORDER BY transfer_count DESC;
```

---

### 3. Customer Lifetime Value

**What to calculate:**
- Total revenue per customer
- Number of products purchased per customer
- Average order value
- Repeat purchase rate

**Privacy Impact:** ✅ **ZERO** - Financial aggregates only, not user content.

**Example Query:**
```sql
-- Customer lifetime value
SELECT 
  email,
  COUNT(*) as total_licenses,
  SUM(amount_paid) / 100.0 as total_spent,
  STRING_AGG(DISTINCT product_type, ', ') as products_purchased
FROM licenses 
WHERE status = 'active'
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY total_spent DESC;
```

---

### 4. Product Performance Metrics

**What to track:**
- LPV vs LLV sales
- Personal vs Family plan popularity
- Bundle purchase rate
- Geographic distribution (if available from Stripe)

**Privacy Impact:** ✅ **ZERO** - Product sales data only, not user content.

---

### 5. Support Metrics

**What to track:**
- Tickets by category
- Average resolution time
- Common issues
- Support ticket volume trends

**Privacy Impact:** ✅ **ZERO** - Support metadata only, not vault content.

---

### 6. Email Delivery Status

**What to track:**
- Email delivery success rate
- Failed email deliveries
- Email open rates (if Brevo provides this)
- Email bounce rate

**Privacy Impact:** ✅ **ZERO** - Email delivery metadata only, not user content.

**Note:** Email open rates are acceptable because they're about email delivery, not app usage.

---

### 7. System Health Dashboard

**What to monitor:**
- API response times
- Database query performance
- Webhook processing time
- Error rates by endpoint
- Server uptime

**Privacy Impact:** ✅ **ZERO** - System performance data only, not user content.

---

## 🚫 What You CANNOT Have (Would Break Privacy Promise)

### ❌ App Usage Analytics

**NOT ALLOWED:**
- How many passwords users store
- How often users open the app
- Which features are used most
- Time spent in app
- User journey tracking
- Feature usage statistics

**Why:** This requires network calls from the app, breaking "100% offline" promise.

---

### ❌ User Content Access

**NOT ALLOWED:**
- Viewing user passwords
- Accessing vault entries
- Reading stored documents
- Viewing user data
- Any access to encrypted vault contents

**Why:** This violates "no user content" promise and privacy guarantee.

---

### ❌ App Error Reporting (After Activation)

**NOT ALLOWED:**
- Sending crash reports from app
- Sending error logs from app
- Telemetry from user's device
- Any data transmission from app after activation

**Why:** This requires network calls from the app, breaking "100% offline" promise.

**Note:** Backend error reporting (Sentry) is OK because it's server-side only.

---

### ❌ User Behavior Tracking

**NOT ALLOWED:**
- Click tracking
- Page view tracking
- User interaction tracking
- A/B testing data collection
- User preference tracking

**Why:** This requires network calls and violates privacy promise.

---

## ✅ Best Practices for Admin Features

### 1. Data Collection Principles

**DO:**
- ✅ Collect only business transaction data
- ✅ Use aggregate statistics (not individual tracking)
- ✅ Collect data at point of transaction (Stripe, signup, support)
- ✅ Anonymize where possible (hardware hashes are already hashed)

**DON'T:**
- ❌ Collect data from the app itself
- ❌ Track individual user behavior
- ❌ Access user content
- ❌ Require network calls from app

---

### 2. Privacy-First Design

**When building admin features:**
1. Ask: "Does this require data from the user's app?"
   - If YES → Don't build it
   - If NO → Proceed

2. Ask: "Does this access user content?"
   - If YES → Don't build it
   - If NO → Proceed

3. Ask: "Does this break the offline promise?"
   - If YES → Don't build it
   - If NO → Proceed

---

### 3. Transparency

**Be transparent about what you collect:**
- Privacy Policy should state: "We collect purchase information, license activation status, and support communications. We do NOT collect or access your vault contents."
- Terms of Service should clarify: "Your vault data remains 100% local and is never transmitted to our servers."

---

## 📋 Recommended Admin Dashboard Features

### Priority 1: Essential Business Metrics

1. **Revenue Dashboard**
   - Total revenue (LPV + LLV)
   - Revenue by product
   - Revenue by plan type
   - Revenue trends (daily/weekly/monthly)

2. **License Management**
   - Total licenses sold
   - Activation rate
   - Active vs inactive licenses
   - License search (by key, email, session ID)

3. **Customer Overview**
   - Total customers
   - Repeat customers
   - Customer lifetime value
   - Top customers by revenue

---

### Priority 2: Operational Metrics

4. **Trial Performance**
   - Trial signups
   - Trial conversion rate
   - Trial expiration tracking

5. **Support Metrics**
   - Open tickets
   - Average resolution time
   - Common issues
   - Support volume trends

6. **System Health**
   - API uptime
   - Error rates
   - Webhook processing status
   - Email delivery status

---

### Priority 3: Advanced Analytics

7. **Product Insights**
   - LPV vs LLV popularity
   - Bundle purchase rate
   - Plan type preferences
   - Geographic distribution (from Stripe)

8. **Customer Insights**
   - Purchase patterns
   - Upgrade/downgrade trends
   - Churn indicators (if applicable)

---

## 🔧 Implementation Guide

### Option 1: Admin Web Dashboard

**Create a simple admin dashboard:**
- React/Next.js app
- Authenticated with `ADMIN_API_KEY`
- Connects to Supabase or uses admin API endpoints
- Displays statistics and license management

**Location:** Could be separate repo or subdirectory

---

### Option 2: Enhanced Admin API

**Add more endpoints to `backend/routes/admin.js`:**

```javascript
// Statistics endpoints
GET /api/admin/stats/overview
GET /api/admin/stats/revenue
GET /api/admin/stats/licenses
GET /api/admin/stats/trials
GET /api/admin/stats/support

// License management
GET /api/admin/licenses/list
GET /api/admin/licenses/unactivated
GET /api/admin/licenses/revoked

// Customer management
GET /api/admin/customers/list
GET /api/admin/customers/top
```

---

### Option 3: Supabase Dashboard + SQL Queries

**Use Supabase's built-in dashboard:**
- Create saved SQL queries
- Create views for common statistics
- Use Supabase's table editor for manual management

**Advantage:** No additional code needed, works immediately.

---

## 📊 Example: Privacy-Safe Statistics Query

```sql
-- Comprehensive business statistics (privacy-safe)
SELECT 
  -- License counts
  (SELECT COUNT(*) FROM licenses WHERE status = 'active') as total_licenses,
  (SELECT COUNT(*) FROM licenses WHERE status = 'active' AND is_activated = true) as activated_licenses,
  
  -- Revenue
  (SELECT SUM(amount_paid) / 100.0 FROM licenses WHERE status = 'active') as total_revenue,
  
  -- Product breakdown
  (SELECT COUNT(*) FROM licenses WHERE status = 'active' AND product_type = 'lpv') as lpv_licenses,
  (SELECT COUNT(*) FROM licenses WHERE status = 'active' AND product_type = 'llv') as llv_licenses,
  
  -- Plan breakdown
  (SELECT COUNT(*) FROM licenses WHERE status = 'active' AND plan_type = 'personal') as personal_licenses,
  (SELECT COUNT(*) FROM licenses WHERE status = 'active' AND plan_type = 'family') as family_licenses,
  
  -- Trial stats
  (SELECT COUNT(*) FROM trials) as total_trials,
  (SELECT COUNT(*) FROM trials WHERE is_converted = true) as converted_trials,
  
  -- Support stats
  (SELECT COUNT(*) FROM support_tickets WHERE status = 'open') as open_tickets;
```

**Privacy Impact:** ✅ **ZERO** - All aggregate data, no individual user content.

---

## ✅ Summary: What You CAN Have

| Feature | Privacy Impact | Status |
|---------|---------------|--------|
| License management | ✅ Zero | ✅ Implemented |
| Customer management | ✅ Zero | ✅ Implemented |
| Payment tracking | ✅ Zero | ✅ Implemented |
| Trial management | ✅ Zero | ✅ Implemented |
| Support tickets | ✅ Zero | ✅ Implemented |
| Revenue statistics | ✅ Zero | ✅ Can add |
| Activation rates | ✅ Zero | ✅ Can add |
| Product analytics | ✅ Zero | ✅ Can add |
| Customer lifetime value | ✅ Zero | ✅ Can add |
| System health monitoring | ✅ Zero | ✅ Can add |
| Email delivery tracking | ✅ Zero | ✅ Can add |

---

## ❌ Summary: What You CANNOT Have

| Feature | Why Not Allowed | Impact |
|---------|----------------|--------|
| App usage analytics | Requires network calls | ❌ Breaks offline promise |
| User content access | Accesses vault data | ❌ Breaks privacy promise |
| App error reporting | Requires network calls | ❌ Breaks offline promise |
| Behavior tracking | Requires network calls | ❌ Breaks offline promise |
| Feature usage stats | Requires network calls | ❌ Breaks offline promise |

---

## 🎯 Key Takeaway

**You can have comprehensive business intelligence and admin features** as long as they:
1. ✅ Use data from business transactions (purchases, licenses, support)
2. ✅ Use aggregate statistics (not individual tracking)
3. ✅ Don't require network calls from the app
4. ✅ Don't access user content

**Your brand promise remains intact** because:
- User's vault data stays 100% local
- No network calls from app after activation
- No user content is ever collected
- All admin data comes from business transactions, not app usage

---

**Last Updated:** 2025
**Version:** 1.0.0
