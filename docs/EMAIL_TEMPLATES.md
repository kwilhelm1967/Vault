# Email Templates for Brevo

These are the polished email templates to use in your Brevo transactional email system. Copy these HTML templates into Brevo and configure them as described below.

---

## How to Set Up in Brevo

1. Log into Brevo → **Transactional** → **Email Templates**
2. Click **New Template**
3. Choose **Code your own** (HTML)
4. Paste the HTML below
5. Set the **Subject Line** as specified
6. Save and note the Template ID

---

## Template 1: Purchase Confirmation (License Delivery)

**Trigger:** After successful Stripe payment  
**Subject:** 🔐 Your Local Password Vault License Key  
**Template Name:** `purchase_confirmation`

### Variables to Pass:
- `{{ params.planName }}` - "Personal Vault (1 device)" or "Family Vault (5 devices)"
- `{{ params.licenseKeys }}` - HTML string of license key boxes
- `{{ params.numKeys }}` - Number of keys (1 or 5)

### HTML Template:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your License Key</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  
  <!-- Wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#0a0a0a;">
    <tr>
      <td style="padding:40px 20px;">
        
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin:0 auto;background:#0f172a;border-radius:16px;overflow:hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:48px 40px;text-align:center;">
              <!-- Logo placeholder - replace with your logo -->
              <img src="https://localpasswordvault.com/logo-white.png" alt="Local Password Vault" width="60" style="margin-bottom:20px;">
              <h1 style="color:#ffffff;margin:0;font-size:32px;font-weight:700;letter-spacing:-0.5px;">Thank You!</h1>
              <p style="color:#94a3b8;margin:16px 0 0;font-size:18px;font-weight:400;">Your purchase is complete</p>
            </td>
          </tr>
          
          <!-- Plan Badge -->
          <tr>
            <td style="padding:32px 40px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background:#1e293b;border-radius:8px;padding:16px 20px;text-align:center;">
                    <span style="color:#5B82B8;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">{{ params.planName }}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- License Key Section -->
          <tr>
            <td style="padding:32px 40px;">
              <h2 style="color:#ffffff;font-size:20px;margin:0 0 20px;font-weight:600;">Your License Key{{ params.numKeys > 1 ? 's' : '' }}</h2>
              
              <!-- License Key Box(es) - Dynamic -->
              {{ params.licenseKeys }}
              
              <p style="color:#64748b;font-size:14px;margin:20px 0 0;line-height:1.6;">
                ⚠️ <strong style="color:#94a3b8;">Keep {{ params.numKeys > 1 ? 'these keys' : 'this key' }} safe!</strong> You'll need {{ params.numKeys > 1 ? 'them' : 'it' }} to activate your software. We recommend saving this email.
              </p>
            </td>
          </tr>
          
          <!-- Download Section -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#1e293b;border-radius:12px;">
                <tr>
                  <td style="padding:28px;">
                    <h2 style="color:#ffffff;font-size:18px;margin:0 0 20px;font-weight:600;">📥 Download Your App</h2>
                    
                    <!-- Download Buttons -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding-right:12px;">
                          <a href="https://localpasswordvault.com/download/windows" style="display:inline-block;background:#5B82B8;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">⊞ Windows</a>
                        </td>
                        <td style="padding-right:12px;">
                          <a href="https://localpasswordvault.com/download/macos" style="display:inline-block;background:#5B82B8;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;"> macOS</a>
                        </td>
                        <td>
                          <a href="https://localpasswordvault.com/download/linux" style="display:inline-block;background:#5B82B8;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">🐧 Linux</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Getting Started Steps -->
          <tr>
            <td style="padding:0 40px 40px;">
              <h2 style="color:#ffffff;font-size:18px;margin:0 0 20px;font-weight:600;">🚀 Getting Started</h2>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #1e293b;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width:36px;vertical-align:top;">
                          <span style="display:inline-block;width:28px;height:28px;background:#5B82B8;border-radius:50%;color:#fff;font-size:14px;font-weight:600;line-height:28px;text-align:center;">1</span>
                        </td>
                        <td style="color:#94a3b8;font-size:15px;line-height:1.5;">Download the installer for your operating system</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #1e293b;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width:36px;vertical-align:top;">
                          <span style="display:inline-block;width:28px;height:28px;background:#5B82B8;border-radius:50%;color:#fff;font-size:14px;font-weight:600;line-height:28px;text-align:center;">2</span>
                        </td>
                        <td style="color:#94a3b8;font-size:15px;line-height:1.5;">Run the installer and follow the prompts</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #1e293b;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width:36px;vertical-align:top;">
                          <span style="display:inline-block;width:28px;height:28px;background:#5B82B8;border-radius:50%;color:#fff;font-size:14px;font-weight:600;line-height:28px;text-align:center;">3</span>
                        </td>
                        <td style="color:#94a3b8;font-size:15px;line-height:1.5;">Enter your license key when prompted</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width:36px;vertical-align:top;">
                          <span style="display:inline-block;width:28px;height:28px;background:#5B82B8;border-radius:50%;color:#fff;font-size:14px;font-weight:600;line-height:28px;text-align:center;">4</span>
                        </td>
                        <td style="color:#94a3b8;font-size:15px;line-height:1.5;">Create your master password and start securing your data!</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#0a0a0a;padding:32px 40px;text-align:center;border-top:1px solid #1e293b;">
              <p style="color:#64748b;font-size:14px;margin:0 0 12px;">
                Questions? We're here to help!<br>
                <a href="mailto:support@localpasswordvault.com" style="color:#5B82B8;text-decoration:none;font-weight:500;">support@localpasswordvault.com</a>
              </p>
              <p style="color:#475569;font-size:12px;margin:0;">
                © 2024 Local Password Vault. All rights reserved.<br>
                Your data stays on your device. Always.
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
```

### License Key Box HTML (generate dynamically):

```javascript
// Generate license key HTML boxes
function generateLicenseKeyHtml(licenseKeys) {
  return licenseKeys.map((key, index) => `
    <div style="background:#1a2537;border:2px solid #334155;border-radius:10px;padding:20px;margin:12px 0;text-align:center;">
      ${licenseKeys.length > 1 ? `<p style="color:#64748b;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Key ${index + 1}</p>` : ''}
      <p style="color:#5B82B8;font-size:22px;font-family:'Courier New',monospace;font-weight:700;margin:0;letter-spacing:2px;">${key}</p>
    </div>
  `).join('');
}
```

---

## Template 2: Trial Started

**Trigger:** When user starts a free trial  
**Subject:** 🎉 Your 7-Day Free Trial Has Started!  
**Template Name:** `trial_started`

### Variables:
- `{{ params.trialKey }}` - The trial license key
- `{{ params.expiryDate }}` - Formatted expiry date (e.g., "December 10, 2024")

### HTML Template:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Trial Has Started</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#0a0a0a;">
    <tr>
      <td style="padding:40px 20px;">
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin:0 auto;background:#0f172a;border-radius:16px;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:48px 40px;text-align:center;">
              <div style="font-size:48px;margin-bottom:16px;">🎉</div>
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">Your Free Trial Has Started!</h1>
              <p style="color:#94a3b8;margin:16px 0 0;font-size:16px;">You have 7 days to explore all features</p>
            </td>
          </tr>
          
          <!-- Trial Key -->
          <tr>
            <td style="padding:32px 40px;">
              <h2 style="color:#ffffff;font-size:18px;margin:0 0 16px;font-weight:600;">Your Trial Key</h2>
              
              <div style="background:#1a2537;border:2px solid #334155;border-radius:10px;padding:20px;text-align:center;">
                <p style="color:#5B82B8;font-size:22px;font-family:'Courier New',monospace;font-weight:700;margin:0;letter-spacing:2px;">{{ params.trialKey }}</p>
              </div>
              
              <p style="color:#f59e0b;font-size:14px;margin:16px 0 0;text-align:center;">
                ⏰ Trial expires: <strong>{{ params.expiryDate }}</strong>
              </p>
            </td>
          </tr>
          
          <!-- Download Section -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#1e293b;border-radius:12px;">
                <tr>
                  <td style="padding:28px;text-align:center;">
                    <h2 style="color:#ffffff;font-size:18px;margin:0 0 20px;font-weight:600;">📥 Download Now</h2>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
                      <tr>
                        <td style="padding-right:12px;">
                          <a href="https://localpasswordvault.com/download/windows" style="display:inline-block;background:#5B82B8;color:#ffffff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Windows</a>
                        </td>
                        <td style="padding-right:12px;">
                          <a href="https://localpasswordvault.com/download/macos" style="display:inline-block;background:#5B82B8;color:#ffffff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">macOS</a>
                        </td>
                        <td>
                          <a href="https://localpasswordvault.com/download/linux" style="display:inline-block;background:#5B82B8;color:#ffffff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Linux</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- What's Included -->
          <tr>
            <td style="padding:0 40px 40px;">
              <h2 style="color:#ffffff;font-size:18px;margin:0 0 20px;font-weight:600;">✨ What's Included in Your Trial</h2>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding:8px 0;color:#94a3b8;font-size:15px;">✓ Unlimited password storage</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#94a3b8;font-size:15px;">✓ AES-256 encryption</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#94a3b8;font-size:15px;">✓ Password generator</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#94a3b8;font-size:15px;">✓ 2FA/TOTP support</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#94a3b8;font-size:15px;">✓ Secure import/export</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#94a3b8;font-size:15px;">✓ Floating quick-access panel</td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 40px;text-align:center;">
              <p style="color:#64748b;font-size:14px;margin:0 0 16px;">Love it? Upgrade anytime to keep your data.</p>
              <a href="https://localpasswordvault.com/#pricing" style="display:inline-block;background:#22c55e;color:#ffffff;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">View Pricing Plans</a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#0a0a0a;padding:32px 40px;text-align:center;border-top:1px solid #1e293b;">
              <p style="color:#64748b;font-size:14px;margin:0 0 12px;">
                Need help? <a href="mailto:support@localpasswordvault.com" style="color:#5B82B8;text-decoration:none;">support@localpasswordvault.com</a>
              </p>
              <p style="color:#475569;font-size:12px;margin:0;">
                © 2024 Local Password Vault. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
```

---

## Template 3: Trial Expiring Soon (3 Days Left)

**Trigger:** 3 days before trial expires  
**Subject:** ⏰ Your Trial Expires in 3 Days  
**Template Name:** `trial_expiring`

### Variables:
- `{{ params.expiryDate }}` - Formatted expiry date
- `{{ params.daysLeft }}` - Number of days remaining

### HTML Template:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trial Expiring Soon</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#0a0a0a;">
    <tr>
      <td style="padding:40px 20px;">
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin:0 auto;background:#0f172a;border-radius:16px;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7f1d1d 0%,#991b1b 100%);padding:48px 40px;text-align:center;">
              <div style="font-size:48px;margin-bottom:16px;">⏰</div>
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">Your Trial Expires Soon!</h1>
              <p style="color:#fca5a5;margin:16px 0 0;font-size:18px;font-weight:600;">Only {{ params.daysLeft }} days left</p>
            </td>
          </tr>
          
          <!-- Message -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#94a3b8;font-size:16px;line-height:1.7;margin:0 0 24px;">
                Hi there! We noticed your Local Password Vault trial is ending on <strong style="color:#ffffff;">{{ params.expiryDate }}</strong>.
              </p>
              
              <p style="color:#94a3b8;font-size:16px;line-height:1.7;margin:0 0 32px;">
                Don't lose access to your saved passwords! Upgrade now to keep all your data and continue using the app without interruption.
              </p>
              
              <!-- CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align:center;">
                    <a href="https://localpasswordvault.com/#pricing" style="display:inline-block;background:#5B82B8;color:#ffffff;padding:18px 48px;border-radius:8px;text-decoration:none;font-weight:600;font-size:18px;">Upgrade Now</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Pricing Reminder -->
          <tr>
            <td style="padding:0 40px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#1e293b;border-radius:12px;">
                <tr>
                  <td style="padding:24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width:50%;padding:12px;vertical-align:top;">
                          <h3 style="color:#ffffff;font-size:16px;margin:0 0 8px;">Personal Vault</h3>
                          <p style="color:#5B82B8;font-size:24px;font-weight:700;margin:0;">$49</p>
                          <p style="color:#64748b;font-size:13px;margin:4px 0 0;">One-time • 1 device</p>
                        </td>
                        <td style="width:50%;padding:12px;vertical-align:top;border-left:1px solid #334155;">
                          <h3 style="color:#ffffff;font-size:16px;margin:0 0 8px;">Family Vault</h3>
                          <p style="color:#5B82B8;font-size:24px;font-weight:700;margin:0;">$79</p>
                          <p style="color:#64748b;font-size:13px;margin:4px 0 0;">One-time • 5 devices</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#0a0a0a;padding:32px 40px;text-align:center;border-top:1px solid #1e293b;">
              <p style="color:#64748b;font-size:14px;margin:0 0 12px;">
                Questions? <a href="mailto:support@localpasswordvault.com" style="color:#5B82B8;text-decoration:none;">support@localpasswordvault.com</a>
              </p>
              <p style="color:#475569;font-size:12px;margin:0;">
                © 2024 Local Password Vault. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
```

---

## Template 4: Trial Expired

**Trigger:** When trial expires  
**Subject:** 😢 Your Trial Has Expired  
**Template Name:** `trial_expired`

### HTML Template:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trial Expired</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#0a0a0a;">
    <tr>
      <td style="padding:40px 20px;">
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin:0 auto;background:#0f172a;border-radius:16px;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:48px 40px;text-align:center;">
              <div style="font-size:48px;margin-bottom:16px;">😢</div>
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">Your Trial Has Expired</h1>
              <p style="color:#94a3b8;margin:16px 0 0;font-size:16px;">But your passwords are still safe!</p>
            </td>
          </tr>
          
          <!-- Message -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#94a3b8;font-size:16px;line-height:1.7;margin:0 0 24px;">
                Your 7-day trial of Local Password Vault has ended. Your data is still encrypted and stored locally on your device.
              </p>
              
              <div style="background:#1a2537;border-left:4px solid #5B82B8;padding:16px 20px;margin:0 0 32px;border-radius:0 8px 8px 0;">
                <p style="color:#94a3b8;font-size:14px;margin:0;line-height:1.6;">
                  <strong style="color:#ffffff;">Good news:</strong> When you purchase a license, all your saved passwords will still be there waiting for you!
                </p>
              </div>
              
              <!-- CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align:center;">
                    <a href="https://localpasswordvault.com/#pricing" style="display:inline-block;background:#22c55e;color:#ffffff;padding:18px 48px;border-radius:8px;text-decoration:none;font-weight:600;font-size:18px;">Get Full Access Now</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Pricing -->
          <tr>
            <td style="padding:0 40px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#1e293b;border-radius:12px;">
                <tr>
                  <td style="padding:24px;">
                    <h3 style="color:#ffffff;font-size:16px;margin:0 0 16px;text-align:center;">Choose Your Plan</h3>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width:50%;padding:12px;text-align:center;">
                          <p style="color:#5B82B8;font-size:28px;font-weight:700;margin:0;">$49</p>
                          <p style="color:#94a3b8;font-size:14px;margin:4px 0;">Personal • 1 device</p>
                        </td>
                        <td style="width:50%;padding:12px;text-align:center;border-left:1px solid #334155;">
                          <p style="color:#5B82B8;font-size:28px;font-weight:700;margin:0;">$79</p>
                          <p style="color:#94a3b8;font-size:14px;margin:4px 0;">Family • 5 devices</p>
                        </td>
                      </tr>
                    </table>
                    <p style="color:#64748b;font-size:13px;margin:16px 0 0;text-align:center;">One-time payment. Lifetime access. No subscriptions.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#0a0a0a;padding:32px 40px;text-align:center;border-top:1px solid #1e293b;">
              <p style="color:#64748b;font-size:14px;margin:0 0 12px;">
                Questions? <a href="mailto:support@localpasswordvault.com" style="color:#5B82B8;text-decoration:none;">support@localpasswordvault.com</a>
              </p>
              <p style="color:#475569;font-size:12px;margin:0;">
                © 2024 Local Password Vault. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
```

---

## Template 5: Password Reset / Support

**Trigger:** Manual support request  
**Subject:** 🔑 Local Password Vault Support  
**Template Name:** `support_response`

### Variables:
- `{{ params.userName }}` - Customer name
- `{{ params.message }}` - Support message content

### HTML Template:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Response</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#0a0a0a;">
    <tr>
      <td style="padding:40px 20px;">
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin:0 auto;background:#0f172a;border-radius:16px;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:40px;text-align:center;">
              <img src="https://localpasswordvault.com/logo-white.png" alt="Local Password Vault" width="50" style="margin-bottom:16px;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:600;">Support Response</h1>
            </td>
          </tr>
          
          <!-- Message -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#ffffff;font-size:16px;margin:0 0 24px;">Hi {{ params.userName }},</p>
              
              <div style="color:#94a3b8;font-size:15px;line-height:1.8;">
                {{ params.message }}
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#0a0a0a;padding:32px 40px;text-align:center;border-top:1px solid #1e293b;">
              <p style="color:#64748b;font-size:14px;margin:0 0 12px;">
                Need more help? Reply to this email or visit our <a href="https://localpasswordvault.com/help" style="color:#5B82B8;text-decoration:none;">Help Center</a>
              </p>
              <p style="color:#475569;font-size:12px;margin:0;">
                © 2024 Local Password Vault. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
```

---

## Backend Code to Send Emails

Here's the Node.js code to send these emails using Brevo SMTP:

```javascript
const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS
  }
});

// Helper: Generate license key HTML
function generateLicenseKeyHtml(licenseKeys) {
  return licenseKeys.map((key, index) => `
    <div style="background:#1a2537;border:2px solid #334155;border-radius:10px;padding:20px;margin:12px 0;text-align:center;">
      ${licenseKeys.length > 1 ? `<p style="color:#64748b;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Key ${index + 1}</p>` : ''}
      <p style="color:#5B82B8;font-size:22px;font-family:'Courier New',monospace;font-weight:700;margin:0;letter-spacing:2px;">${key}</p>
    </div>
  `).join('');
}

// Send purchase confirmation email
async function sendPurchaseEmail(email, licenseKeys, planType) {
  const planName = planType === 'family' ? 'Family Vault (5 devices)' : 'Personal Vault (1 device)';
  const keysHtml = generateLicenseKeyHtml(licenseKeys);
  
  // Use the full HTML template from Template 1 above
  // Replace {{ params.xxx }} with actual values
  
  await transporter.sendMail({
    from: '"Local Password Vault" <noreply@localpasswordvault.com>',
    to: email,
    subject: '🔐 Your Local Password Vault License Key',
    html: /* Template 1 HTML with variables replaced */
  });
}

// Send trial started email
async function sendTrialEmail(email, trialKey, expiryDate) {
  const formattedDate = new Date(expiryDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  await transporter.sendMail({
    from: '"Local Password Vault" <noreply@localpasswordvault.com>',
    to: email,
    subject: '🎉 Your 7-Day Free Trial Has Started!',
    html: /* Template 2 HTML with variables replaced */
  });
}

// Send trial expiring email
async function sendTrialExpiringEmail(email, expiryDate, daysLeft) {
  await transporter.sendMail({
    from: '"Local Password Vault" <noreply@localpasswordvault.com>',
    to: email,
    subject: `⏰ Your Trial Expires in ${daysLeft} Days`,
    html: /* Template 3 HTML with variables replaced */
  });
}

// Send trial expired email
async function sendTrialExpiredEmail(email) {
  await transporter.sendMail({
    from: '"Local Password Vault" <noreply@localpasswordvault.com>',
    to: email,
    subject: '😢 Your Trial Has Expired',
    html: /* Template 4 HTML with variables replaced */
  });
}
```

---

## Email Sending Schedule

| Email | When to Send |
|-------|--------------|
| Purchase Confirmation | Immediately after Stripe webhook |
| Trial Started | Immediately after trial activation |
| Trial Expiring (3 days) | 3 days before expiry (cron job) |
| Trial Expiring (1 day) | 1 day before expiry (cron job) |
| Trial Expired | Day of expiry (cron job) |

---

## Testing Your Templates

1. In Brevo, use **Send a test** to preview
2. Test on multiple email clients (Gmail, Outlook, Apple Mail)
3. Check mobile rendering
4. Verify all links work

---

*Last Updated: December 3, 2024*

