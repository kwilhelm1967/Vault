# Brevo Email Templates Setup

## Templates Included

| Template | File | Trigger |
|----------|------|---------|
| Purchase Confirmation | `purchase-confirmation.html` | After payment |
| Trial Welcome | `trial-welcome.html` | Trial signup |
| Trial Expiring | `trial-expiring.html` | 24 hours before expiry |
| Trial Expired | `trial-expired.html` | Day after expiry |

---

## Setup in Brevo

### Step 1: Create Templates

1. Log into [Brevo](https://app.brevo.com)
2. Go to **Campaigns → Templates**
3. Click **New Template** → **Code your own**
4. Paste HTML from each template file
5. Save with names:
   - `purchase-confirmation`
   - `trial-welcome`
   - `trial-expiring`
   - `trial-expired`

### Step 2: Note Template IDs

After saving, Brevo assigns an ID. Note these for backend config.

---

## Template Variables

### Purchase Confirmation

| Variable | Example |
|----------|---------|
| `{{ params.PLAN_NAME }}` | Personal Vault |
| `{{ params.AMOUNT }}` | $49.00 |
| `{{ params.LICENSE_KEY }}` | PERS-XXXX-XXXX-XXXX |
| `{{ params.MAX_DEVICES }}` | 1 |
| `{{ params.ORDER_DATE }}` | December 2, 2025 |
| `{{ params.ORDER_ID }}` | cs_xxx |

### Trial Welcome

| Variable | Example |
|----------|---------|
| `{{ params.TRIAL_KEY }}` | TRIA-XXXX-XXXX-XXXX |
| `{{ params.EXPIRES_AT }}` | December 9, 2025 |
| `{{ params.SIGNUP_DATE }}` | December 2, 2025 |

### Trial Expiring (24hr Warning)

| Variable | Example |
|----------|---------|
| `{{ params.EXPIRES_AT }}` | December 9, 2025 |

### Trial Expired

| Variable | Example |
|----------|---------|
| `{{ params.EXPIRED_DATE }}` | December 9, 2025 |
| `{{ params.EMAIL }}` | user@example.com |

---

## Automated Email Triggers

### Scheduled Job Setup

Create a cron job to run daily and check for:
1. Trials expiring in 24 hours → Send `trial-expiring`
2. Trials expired yesterday → Send `trial-expired`

**File: `backend/jobs/trialEmails.js`**

```javascript
const db = require('../database/db');
const { sendTrialExpiringEmail, sendTrialExpiredEmail } = require('../services/email');

async function checkTrialEmails() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get trials expiring in ~24 hours
  const expiringTrials = db.db.prepare(`
    SELECT * FROM trials 
    WHERE expires_at BETWEEN ? AND ?
    AND is_converted = FALSE
    AND expiring_email_sent = FALSE
  `).all(now.toISOString(), tomorrow.toISOString());

  for (const trial of expiringTrials) {
    await sendTrialExpiringEmail({
      to: trial.email,
      expiresAt: new Date(trial.expires_at)
    });
    
    db.db.prepare(`
      UPDATE trials SET expiring_email_sent = TRUE WHERE id = ?
    `).run(trial.id);
  }

  // Get trials that expired yesterday
  const expiredTrials = db.db.prepare(`
    SELECT * FROM trials 
    WHERE expires_at BETWEEN ? AND ?
    AND is_converted = FALSE
    AND expired_email_sent = FALSE
  `).all(yesterday.toISOString(), now.toISOString());

  for (const trial of expiredTrials) {
    await sendTrialExpiredEmail({
      to: trial.email,
      expiredDate: new Date(trial.expires_at)
    });
    
    db.db.prepare(`
      UPDATE trials SET expired_email_sent = TRUE WHERE id = ?
    `).run(trial.id);
  }

  console.log(`Processed ${expiringTrials.length} expiring, ${expiredTrials.length} expired`);
}

module.exports = { checkTrialEmails };
```

### Add to Database Schema

Add these columns to `trials` table:

```sql
ALTER TABLE trials ADD COLUMN expiring_email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE trials ADD COLUMN expired_email_sent BOOLEAN DEFAULT FALSE;
```

### Run with Cron

```bash
# Add to crontab (runs daily at 9 AM)
0 9 * * * cd /path/to/backend && node -e "require('./jobs/trialEmails').checkTrialEmails()"
```

Or use PM2:

```bash
pm2 start jobs/trialEmails.js --cron "0 9 * * *" --no-autorestart
```

---

## Discount Code Setup

The `trial-expired` template includes a **COMEBACK10** discount code.

### In Stripe:

1. Go to [Stripe → Coupons](https://dashboard.stripe.com/coupons)
2. Create coupon:
   - Code: `COMEBACK10`
   - Type: Percentage off
   - Amount: 10%
   - Duration: Once
3. Apply to checkout sessions when code is present

---

## Email Send Flow

```
Day 0: User signs up
       → Send: trial-welcome

Day 6: 24 hours before expiry
       → Send: trial-expiring (cron job)

Day 7: Trial expires
       → Send: trial-expired (cron job)

Day 7+: User purchases
       → Send: purchase-confirmation (webhook)
```

---

## Testing Checklist

- [ ] All templates render in Gmail
- [ ] All templates render in Outlook
- [ ] All templates render on mobile
- [ ] Variables populate correctly
- [ ] Links work
- [ ] Unsubscribe link works
- [ ] Discount code works in Stripe

---

## Support

Brevo Documentation: https://developers.brevo.com/docs
