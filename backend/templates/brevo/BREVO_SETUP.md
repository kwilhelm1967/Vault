# Brevo Email Templates Setup

## Templates Included

| Template | File | Purpose |
|----------|------|---------|
| Purchase Confirmation | `purchase-confirmation.html` | Sent after successful payment |
| Trial Welcome | `trial-welcome.html` | Sent when trial starts |

---

## Setup in Brevo

### Step 1: Create Templates

1. Log into [Brevo](https://app.brevo.com)
2. Go to **Campaigns → Templates**
3. Click **New Template** → **Drag & Drop Editor** → **Code your own**
4. Paste the HTML from each template file
5. Save with these names:
   - `purchase-confirmation`
   - `trial-welcome`

### Step 2: Note Template IDs

After saving, Brevo assigns an ID to each template. Note these for your backend config.

---

## Template Variables

### Purchase Confirmation

| Variable | Description | Example |
|----------|-------------|---------|
| `{{ params.PLAN_NAME }}` | Plan purchased | Personal Vault |
| `{{ params.AMOUNT }}` | Price paid | $49.00 |
| `{{ params.LICENSE_KEY }}` | License key | PERS-XXXX-XXXX-XXXX |
| `{{ params.MAX_DEVICES }}` | Device limit | 1 |
| `{{ params.ORDER_DATE }}` | Purchase date | December 2, 2025 |
| `{{ params.ORDER_ID }}` | Stripe session ID | cs_xxx |

### Trial Welcome

| Variable | Description | Example |
|----------|-------------|---------|
| `{{ params.TRIAL_KEY }}` | Trial key | TRIA-XXXX-XXXX-XXXX |
| `{{ params.EXPIRES_AT }}` | Expiration date | December 9, 2025 |
| `{{ params.SIGNUP_DATE }}` | Signup date | December 2, 2025 |

---

## Sending via API

### Purchase Email

```javascript
const Brevo = require('@getbrevo/brevo');

const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

await apiInstance.sendTransacEmail({
  to: [{ email: 'customer@example.com' }],
  templateId: YOUR_PURCHASE_TEMPLATE_ID,
  params: {
    PLAN_NAME: 'Personal Vault',
    AMOUNT: '$49.00',
    LICENSE_KEY: 'PERS-XXXX-XXXX-XXXX',
    MAX_DEVICES: '1',
    ORDER_DATE: 'December 2, 2025',
    ORDER_ID: 'cs_xxx'
  }
});
```

### Trial Email

```javascript
await apiInstance.sendTransacEmail({
  to: [{ email: 'customer@example.com' }],
  templateId: YOUR_TRIAL_TEMPLATE_ID,
  params: {
    TRIAL_KEY: 'TRIA-XXXX-XXXX-XXXX',
    EXPIRES_AT: 'December 9, 2025',
    SIGNUP_DATE: 'December 2, 2025'
  }
});
```

---

## Alternative: SMTP Method

The backend currently uses SMTP which works with these templates as raw HTML. The templates in `backend/templates/` (not the brevo folder) are used for SMTP sending.

If you prefer Brevo's template system with the API:
1. Install: `npm install @getbrevo/brevo`
2. Update `services/email.js` to use Brevo API instead of SMTP
3. Set `BREVO_API_KEY` in `.env`

---

## Testing

1. Send test emails to yourself first
2. Check rendering in:
   - Gmail
   - Outlook
   - Apple Mail
   - Mobile devices
3. Verify all variables populate correctly

---

## Support

Brevo Documentation: https://developers.brevo.com/docs

