# Administrator Guide: Local Password Vault & Local Legacy Vault

Complete guide for managing users, licenses, and administrative tasks for both LPV (Local Password Vault) and LLV (Local Legacy Vault).

---

## Table of Contents

1. [Product Overview](#product-overview)
2. [System Architecture](#system-architecture)
3. [Managing Users](#managing-users)
4. [Creating License Keys](#creating-license-keys)
5. [Managing Licenses](#managing-licenses)
6. [Database Management](#database-management)
7. [Common Administrative Tasks](#common-administrative-tasks)
8. [Troubleshooting](#troubleshooting)

---

## Product Overview

### Local Password Vault (LPV)
- **Personal Plan**: $49 - 1 device, lifetime license
- **Family Plan**: $79 - 5 devices (5 separate keys), lifetime license
- Modern password management solution

### Local Legacy Vault (LLV)
- **Personal Plan**: $49 - 1 device, lifetime license
- **Family Plan**: $129 - 5 devices (5 separate keys), lifetime license
- Legacy-compatible password management solution

### License Key Formats
- **Personal LPV**: `PERS-XXXX-XXXX-XXXX` (e.g., `PERS-A3B5-C7D9-E2F4`)
- **Family LPV**: `FMLY-XXXX-XXXX-XXXX` (e.g., `FMLY-X9Y2-Z4W8-K6M3`)
- **Personal LLV**: `LLVP-XXXX-XXXX-XXXX` (e.g., `LLVP-R5T8-N3P7-Q9S2`)
- **Family LLV**: `LLVF-XXXX-XXXX-XXXX` (e.g., `LLVF-H4J7-K2L9-M6N8`)
- **Trial Keys**: `TRIA-XXXX-XXXX-XXXX` (7-day free trial, LPV only)

---

## System Architecture

### Technology Stack
- **Database**: Supabase (PostgreSQL)
- **Payment Processing**: Stripe
- **Email Service**: Brevo (Transactional API)
- **Backend Server**: Node.js/Express on Linode
- **License Signing**: HMAC-SHA256 (offline validation)

### Database Tables
1. **customers** - Customer information synced from Stripe
2. **licenses** - License keys and activation status
3. **trials** - Trial signups (7-day free trials)
4. **device_activations** - Device binding for family plans
5. **support_tickets** - Support ticket system
6. **ticket_messages** - Support ticket conversations
7. **webhook_events** - Stripe webhook event log

---

## Managing Users

### Accessing Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Table Editor** to view and manage data

### Viewing Customers

**Via Supabase Dashboard:**
1. Go to **Table Editor** → `customers` table
2. View all customer records with:
   - Email address
   - Stripe Customer ID
   - Name (if available)
   - Created/Updated timestamps

**Key Fields:**
- `email` - Customer email (unique)
- `stripe_customer_id` - Stripe customer identifier
- `name` - Customer name (optional)
- `created_at` - Account creation date
- `updated_at` - Last update timestamp

### Finding User Licenses

**Query licenses by email:**
```sql
SELECT * FROM licenses 
WHERE email = 'user@example.com' 
AND status = 'active'
ORDER BY created_at DESC;
```

**View all licenses for a customer:**
1. Find customer in `customers` table
2. Note the `id` (customer_id)
3. Query licenses:
```sql
SELECT * FROM licenses 
WHERE customer_id = <customer_id>
ORDER BY created_at DESC;
```

---

## Creating License Keys

### Method 1: Via Stripe Checkout (Automatic)

License keys are automatically generated when customers complete checkout through Stripe. Keys are created via webhook events and emailed to customers.

**Process:**
1. Customer completes Stripe checkout
2. Webhook receives `checkout.session.completed` event
3. System generates appropriate license keys:
   - Personal plan: 1 key
   - Family plan: 5 keys
4. Keys are stored in database
5. Confirmation email sent with keys

**No action required** - this happens automatically.

### Method 2: Manual Creation via Supabase (For Friends & Family)

**Step 1: Generate License Key**

License keys follow specific formats:
- LPV Personal: `PERS-XXXX-XXXX-XXXX`
- LPV Family: `FMLY-XXXX-XXXX-XXXX`
- LLV Personal: `LLVP-XXXX-XXXX-XXXX`
- LLV Family: `LLVF-XXXX-XXXX-XXXX`

**You can generate keys using Node.js:**
```bash
cd backend
node -e "
const { generatePersonalKey, generateFamilyKey, generateLLVPersonalKey, generateLLVFamilyKey } = require('./services/licenseGenerator');
console.log('LPV Personal:', generatePersonalKey());
console.log('LPV Family:', generateFamilyKey());
console.log('LLV Personal:', generateLLVPersonalKey());
console.log('LLV Family:', generateLLVFamilyKey());
"
```

**Or create manually** following the format (use random alphanumeric characters, excluding I, L, O, 0, 1).

**Step 2: Create License Record in Supabase**

1. Go to **Table Editor** → `licenses` table
2. Click **Insert** → **Insert row**
3. Fill in the following fields:

| Field | Value | Notes |
|-------|-------|-------|
| `license_key` | `PERS-A3B5-C7D9-E2F4` | Your generated key |
| `plan_type` | `personal` or `family` or `llv_personal` or `llv_family` | Must match key prefix |
| `product_type` | `lpv` or `llv` | Product identifier |
| `email` | `friend@example.com` | Recipient email |
| `customer_id` | (null or customer ID) | Optional, link to customer record |
| `amount_paid` | `4900` | Amount in cents ($49 = 4900, $79 = 7900, $129 = 12900) |
| `max_devices` | `1` | 1 for personal, 1 for each family key |
| `status` | `active` | License status |
| `stripe_payment_id` | (leave null) | Not applicable for manual keys |
| `stripe_checkout_session_id` | (leave null) | Not applicable for manual keys |

**Example for LPV Personal:**
```json
{
  "license_key": "PERS-A3B5-C7D9-E2F4",
  "plan_type": "personal",
  "product_type": "lpv",
  "email": "friend@example.com",
  "amount_paid": 4900,
  "max_devices": 1,
  "status": "active"
}
```

**Example for LPV Family (create 5 separate records, one for each key):**
```json
{
  "license_key": "FMLY-X9Y2-Z4W8-K6M1",
  "plan_type": "family",
  "product_type": "lpv",
  "email": "family@example.com",
  "amount_paid": 1580,  // $79 / 5 = $15.80 per key (in cents: 1580)
  "max_devices": 1,
  "status": "active"
}
```
*(Repeat for 4 more keys: K6M2, K6M3, K6M4, K6M5)*

**Step 3: Share the License Key**

Send the license key to the recipient via email or secure message. Include:
- The license key (e.g., `PERS-A3B5-C7D9-E2F4`)
- Instructions to enter it in the app
- Support email: support@localpasswordvault.com

---

## Managing Licenses

### Viewing License Details

**Find license by key:**
```sql
SELECT * FROM licenses 
WHERE license_key = 'PERS-A3B5-C7D9-E2F4';
```

**View activation status:**
```sql
SELECT 
  license_key,
  plan_type,
  product_type,
  email,
  is_activated,
  activated_at,
  hardware_hash,
  activation_count,
  transfer_count,
  status,
  created_at
FROM licenses 
WHERE license_key = 'PERS-A3B5-C7D9-E2F4';
```

**List all active licenses:**
```sql
SELECT license_key, plan_type, product_type, email, is_activated, created_at
FROM licenses 
WHERE status = 'active'
ORDER BY created_at DESC;
```

### Checking License Activation

**Check if license is activated:**
- `is_activated` = `true` means license has been activated on a device
- `hardware_hash` contains the device identifier (SHA-256 hash)
- `activated_at` shows when activation occurred

**For Family Plans - View Device Activations:**
```sql
SELECT da.*, l.license_key, l.email
FROM device_activations da
JOIN licenses l ON da.license_id = l.id
WHERE l.license_key = 'FMLY-X9Y2-Z4W8-K6M1';
```

### Revoking a License

**Via Supabase Dashboard:**
1. Go to **Table Editor** → `licenses` table
2. Find the license by `license_key`
3. Edit the row
4. Change `status` from `active` to `revoked`
5. Save

**Via SQL:**
```sql
UPDATE licenses 
SET status = 'revoked', updated_at = NOW()
WHERE license_key = 'PERS-A3B5-C7D9-E2F4';
```

**Note:** Revoked licenses cannot be reactivated. Users will need a new license key.

### Transferring Licenses

Licenses support device transfers (up to 3 per year for personal plans). Transfer history is tracked in the `transfer_count` field.

**View transfer history:**
- Check `transfer_count` field in licenses table
- Check `last_transfer_at` timestamp

**Manual transfer (if needed):**
1. Reset the hardware binding:
```sql
UPDATE licenses 
SET hardware_hash = NULL,
    is_activated = FALSE,
    activated_at = NULL,
    transfer_count = transfer_count + 1,
    last_transfer_at = NOW()
WHERE license_key = 'PERS-A3B5-C7D9-E2F4';
```

**Note:** Be careful with manual transfers. Users can transfer up to 3 times per year automatically through the app.

### Managing Family Plan Keys

Family plans include 5 separate keys (one per device). Each key is tracked as a separate license record.

**View all keys for a family purchase:**
```sql
SELECT license_key, email, is_activated, activated_at
FROM licenses 
WHERE email = 'family@example.com'
  AND plan_type = 'family'
  AND product_type = 'lpv'
ORDER BY created_at;
```

**Check device usage:**
- Each key can be activated on 1 device (`max_devices = 1`)
- `is_activated` shows if that specific key is in use
- `hardware_hash` identifies the device using that key

---

## Database Management

### Key Tables Overview

#### `licenses` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `license_key` | TEXT | Unique license key (e.g., PERS-A3B5-C7D9-E2F4) |
| `plan_type` | TEXT | `personal`, `family`, `llv_personal`, `llv_family` |
| `product_type` | TEXT | `lpv` or `llv` |
| `customer_id` | INTEGER | Reference to customers table |
| `email` | TEXT | Customer email |
| `stripe_payment_id` | TEXT | Stripe payment intent ID |
| `stripe_checkout_session_id` | TEXT | Stripe checkout session ID |
| `amount_paid` | INTEGER | Amount in cents (4900 = $49) |
| `is_activated` | BOOLEAN | Activation status |
| `hardware_hash` | TEXT | Device identifier (SHA-256) |
| `activated_at` | TIMESTAMP | First activation time |
| `current_device_id` | TEXT | Currently bound device |
| `activation_count` | INTEGER | Number of activations |
| `transfer_count` | INTEGER | Number of transfers |
| `last_activated_at` | TIMESTAMP | Last activation time |
| `last_transfer_at` | TIMESTAMP | Last transfer time |
| `max_devices` | INTEGER | Maximum devices (usually 1) |
| `activated_devices` | INTEGER | Currently activated devices |
| `status` | TEXT | `active`, `revoked`, `expired` |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

#### `customers` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `email` | TEXT | Customer email (unique) |
| `stripe_customer_id` | TEXT | Stripe customer ID |
| `name` | TEXT | Customer name (optional) |
| `created_at` | TIMESTAMP | Account creation |
| `updated_at` | TIMESTAMP | Last update |

#### `trials` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `email` | TEXT | Trial user email (unique) |
| `trial_key` | TEXT | Trial license key (TRIA-XXXX-XXXX-XXXX) |
| `hardware_hash` | TEXT | Device identifier |
| `started_at` | TIMESTAMP | Trial start time |
| `expires_at` | TIMESTAMP | Trial expiration (7 days) |
| `is_activated` | BOOLEAN | Activation status |
| `activated_at` | TIMESTAMP | Activation time |
| `is_converted` | BOOLEAN | Did they purchase? |
| `converted_license_id` | INTEGER | Reference to licenses table |
| `expiring_email_sent` | BOOLEAN | 24hr warning sent |
| `expired_email_sent` | BOOLEAN | Expiration email sent |
| `created_at` | TIMESTAMP | Creation timestamp |

#### `device_activations` Table (Family Plans)

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `license_id` | INTEGER | Reference to licenses table |
| `hardware_hash` | TEXT | Device identifier |
| `device_name` | TEXT | Device name (from user-agent) |
| `activated_at` | TIMESTAMP | Activation time |
| `last_seen_at` | TIMESTAMP | Last activity time |
| `is_active` | BOOLEAN | Active status |

### Useful SQL Queries

**Total active licenses:**
```sql
SELECT COUNT(*) as total_active
FROM licenses 
WHERE status = 'active';
```

**Licenses by plan type:**
```sql
SELECT plan_type, product_type, COUNT(*) as count
FROM licenses 
WHERE status = 'active'
GROUP BY plan_type, product_type
ORDER BY count DESC;
```

**Recently activated licenses:**
```sql
SELECT license_key, email, plan_type, product_type, activated_at
FROM licenses 
WHERE is_activated = true
ORDER BY activated_at DESC
LIMIT 50;
```

**Unactivated licenses:**
```sql
SELECT license_key, email, plan_type, product_type, created_at
FROM licenses 
WHERE is_activated = false 
  AND status = 'active'
ORDER BY created_at DESC;
```

**Family plan usage:**
```sql
SELECT 
  l.license_key,
  l.email,
  l.plan_type,
  COUNT(da.id) as devices_activated,
  l.max_devices
FROM licenses l
LEFT JOIN device_activations da ON l.id = da.license_id AND da.is_active = true
WHERE l.plan_type IN ('family', 'llv_family')
GROUP BY l.id, l.license_key, l.email, l.plan_type, l.max_devices;
```

**Trial conversions:**
```sql
SELECT 
  COUNT(*) as total_trials,
  SUM(CASE WHEN is_converted THEN 1 ELSE 0 END) as conversions,
  ROUND(100.0 * SUM(CASE WHEN is_converted THEN 1 ELSE 0 END) / COUNT(*), 2) as conversion_rate
FROM trials;
```

---

## Common Administrative Tasks

### Creating Keys for Friends & Family

**Complete Workflow:**

1. **Determine the product and plan:**
   - LPV Personal ($49) → `plan_type: 'personal'`, `product_type: 'lpv'`
   - LPV Family ($79) → `plan_type: 'family'`, `product_type: 'lpv'` (create 5 keys)
   - LLV Personal ($49) → `plan_type: 'llv_personal'`, `product_type: 'llv'`
   - LLV Family ($129) → `plan_type: 'llv_family'`, `product_type: 'llv'` (create 5 keys)

2. **Generate license keys:**
   - Use the Node.js script (see [Creating License Keys](#creating-license-keys))
   - Or manually create keys following the format

3. **Create license records in Supabase:**
   - Insert row(s) in `licenses` table
   - Set all required fields (see table above)
   - For family plans, create 5 separate license records

4. **Share keys securely:**
   - Email the keys to recipients
   - Include activation instructions
   - Provide support contact information

### Handling License Issues

**User says license key doesn't work:**
1. Check license exists: `SELECT * FROM licenses WHERE license_key = 'KEY-HERE';`
2. Verify status is `active`
3. Check if already activated (if user is trying to use on different device)
4. Verify key format matches plan type (PERS for personal, etc.)

**User needs to transfer to new device:**
1. Check transfer count: `SELECT transfer_count FROM licenses WHERE license_key = 'KEY';`
2. Users can transfer up to 3 times per year through the app
3. If exceeded, manually reset (see [Transferring Licenses](#transferring-licenses))

**Revoking a license:**
1. Update status to `revoked` in Supabase
2. License will no longer activate
3. User will need a new license key

### Viewing Customer Purchase History

**All licenses for a customer:**
```sql
SELECT 
  l.license_key,
  l.plan_type,
  l.product_type,
  l.amount_paid,
  l.created_at,
  l.is_activated,
  l.activated_at,
  l.status
FROM licenses l
WHERE l.email = 'customer@example.com'
ORDER BY l.created_at DESC;
```

**Customer with Stripe information:**
```sql
SELECT 
  c.email,
  c.name,
  c.stripe_customer_id,
  l.license_key,
  l.plan_type,
  l.product_type,
  l.amount_paid,
  l.stripe_checkout_session_id
FROM customers c
LEFT JOIN licenses l ON c.id = l.customer_id
WHERE c.email = 'customer@example.com';
```

### Monitoring System Health

**Recent license creations:**
```sql
SELECT 
  license_key,
  plan_type,
  product_type,
  email,
  created_at
FROM licenses
ORDER BY created_at DESC
LIMIT 20;
```

**Activation rate:**
```sql
SELECT 
  COUNT(*) as total_licenses,
  SUM(CASE WHEN is_activated THEN 1 ELSE 0 END) as activated,
  ROUND(100.0 * SUM(CASE WHEN is_activated THEN 1 ELSE 0 END) / COUNT(*), 2) as activation_rate
FROM licenses
WHERE status = 'active';
```

**Webhook event processing:**
```sql
SELECT 
  event_type,
  COUNT(*) as count,
  SUM(CASE WHEN processed THEN 1 ELSE 0 END) as processed,
  SUM(CASE WHEN NOT processed THEN 1 ELSE 0 END) as pending
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type
ORDER BY count DESC;
```

---

## Troubleshooting

### License Key Not Found

**Issue:** User reports license key doesn't work.

**Check:**
1. Verify key exists: `SELECT * FROM licenses WHERE license_key = 'KEY';`
2. Check key format matches plan type prefix
3. Verify status is `active`
4. Check for typos (license keys are case-insensitive but verify exact characters)

**Solution:**
- If key doesn't exist, create new license record
- If status is `revoked`, either reactivate or create new key
- If format is wrong, check plan_type matches key prefix

### License Already Activated

**Issue:** User trying to activate on new device but license is already bound.

**Check:**
```sql
SELECT 
  license_key,
  is_activated,
  hardware_hash,
  transfer_count,
  last_transfer_at
FROM licenses
WHERE license_key = 'KEY';
```

**Solution:**
- Personal plans: User can transfer up to 3 times per year via app
- If transfer limit exceeded, manually reset (see [Transferring Licenses](#transferring-licenses))
- Family plans: Each key is separate, user should use a different key from their 5-key set

### Family Plan - Not All Keys Visible

**Issue:** Customer purchased family plan but only received 1 key.

**Check:**
```sql
SELECT license_key, email, plan_type, created_at
FROM licenses
WHERE email = 'customer@example.com'
  AND plan_type = 'family'
ORDER BY created_at;
```

**Solution:**
- Family plans should have 5 separate license records
- If only 1 exists, create 4 more manually
- Each key should have `plan_type: 'family'` and `max_devices: 1`

### Stripe Payment Completed But No License Created

**Issue:** Payment succeeded but license key not generated.

**Check:**
1. Check webhook events: `SELECT * FROM webhook_events WHERE stripe_event_id = 'EVENT_ID';`
2. Check if webhook was processed: `SELECT processed, error_message FROM webhook_events WHERE stripe_event_id = 'EVENT_ID';`
3. Check Stripe checkout session ID: `SELECT * FROM licenses WHERE stripe_checkout_session_id = 'SESSION_ID';`

**Solution:**
- If webhook failed, check error_message for details
- Manually create license record if webhook processing failed
- Replay webhook from Stripe dashboard if needed

### Support Ticket Management

**View open tickets:**
```sql
SELECT 
  ticket_number,
  email,
  subject,
  category,
  priority,
  status,
  created_at
FROM support_tickets
WHERE status IN ('open', 'in_progress', 'waiting_customer')
ORDER BY created_at DESC;
```

**Update ticket status:**
```sql
UPDATE support_tickets
SET status = 'resolved',
    resolved_at = NOW(),
    updated_at = NOW()
WHERE ticket_number = 'TKT-2025-001234';
```

---

## Security Best Practices

1. **Never share license keys publicly** - Always send via secure email
2. **Keep Supabase credentials secure** - Use environment variables, never commit to git
3. **Audit license creation** - Keep records of manually created keys
4. **Monitor for abuse** - Watch for unusual activation patterns
5. **Regular backups** - Ensure Supabase backups are enabled
6. **Limit access** - Only authorized administrators should have database access

---

## Support Contacts

- **Technical Support**: support@localpasswordvault.com
- **Supabase Dashboard**: https://app.supabase.com
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Backend Server**: See `backend/README.md` for deployment details

---

## Additional Resources

- [Backend README](../backend/README.md) - Backend API documentation
- [Developer Setup](../backend/DEVELOPER_SETUP.md) - Complete setup guide
- [Database Schema](../backend/database/schema.sql) - Full database schema
- [Privacy License System](./PRIVACY_LICENSE_SYSTEM.md) - License system architecture

---

**Last Updated:** 2025-01-XX
**Version:** 1.0

