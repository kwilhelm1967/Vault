# Developer Guide - Local Password Vault

This document covers recent architectural changes, the new landing page system, and integration points for the website trial form.

---

## Recent Changes Summary

### 1. Sound Effects System (v1.2.1)

New audio feedback system for UI interactions.

**Files Modified:**
- `src/utils/soundEffects.ts` — New sound effects utility
- `src/utils/preferencesService.ts` — Added sound preference toggle
- `src/components/Settings.tsx` — Sound effects toggle UI
- `src/components/EntryForm.tsx` — Sound on save
- `src/components/MainVault.tsx` — Sound on actions

**Usage:**
```typescript
import { playSuccessSound, playClickSound } from '../utils/soundEffects';

// Play on successful action
playSuccessSound();

// Play on button click
playClickSound();
```

**User Preference:**
```typescript
import { preferencesService } from '../utils/preferencesService';

// Check if sounds enabled
const prefs = await preferencesService.getPreferences();
if (prefs.soundEffectsEnabled) {
  playSuccessSound();
}
```

---

### 2. Landing Page System

Two versions of the landing page are available:

#### React Component
**Location:** `src/components/LandingPage.tsx`

**Preview URL (Dev Mode):**
```
http://localhost:5173/?preview=landing
```

**Integration in App.tsx:**
```typescript
import { LandingPage } from "./components/LandingPage";

// Preview route (dev only)
if (urlParams.get('preview') === 'landing') {
  return <LandingPage />;
}
```

#### Standalone HTML
**Location:** `public/landing.html`

This is a self-contained HTML file that can be deployed directly to the website. It includes:
- All CSS inline
- Lucide icons via CDN
- Google Fonts (Outfit, JetBrains Mono)
- Interactive JavaScript

**Deployment:**
Simply upload `landing.html` to the web server root or rename to `index.html`.

---

### 3. Trial Form Integration

The landing page includes a trial signup form that needs to connect to the backend API.

#### Current Form Structure
```html
<form id="trial-form">
  <input type="email" placeholder="Enter your email" required>
  <button type="submit">Start Free Trial</button>
</form>
```

#### Backend Integration Point
In `public/landing.html`, locate the form submission handler (around line 850):

```javascript
document.getElementById('trial-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const email = this.querySelector('input[type="email"]').value;
  
  // TODO: Replace with actual API call
  // POST to your trial endpoint:
  // fetch('https://api.localpasswordvault.com/trial', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email })
  // })
});
```

#### Expected API Response
```json
{
  "success": true,
  "trialKey": "TRIAL-XXXX-XXXX-XXXX",
  "expiresAt": "2025-12-08T00:00:00Z",
  "message": "Trial key sent to email"
}
```

#### Error States to Handle
- `400` — Invalid email format
- `409` — Email already used for trial
- `500` — Server error

---

## Architecture Overview

### License Flow
```
User Signs Up → Backend API → Generates Trial Key → 
Stores in Supabase → Sends via Brevo Email → 
User Enters Key in App → JWT Token Stored Locally
```

### Key Files for License System
| File | Purpose |
|------|---------|
| `src/utils/licenseService.ts` | License validation, activation |
| `src/utils/trialService.ts` | Trial management, expiration |
| `src/components/LicenseScreen.tsx` | License entry UI |
| `src/components/ExpiredTrialScreen.tsx` | Trial expired state |

### Backend Architecture
```
Stripe (Webhook) → Linode (API Server) → Supabase (Database) → Brevo (Email)
```

---

## Development Workflow

### Preview Routes (Dev Mode Only)
Add `?preview=X` to URL to view different screens:

| Preview | URL |
|---------|-----|
| Landing Page | `/?preview=landing` |
| Key Activation | `/?preview=keyactivation` |
| Expired Trial | `/?preview=expired` |
| Purchase Success | `/?preview=success` |
| Download Page | `/?preview=download` |
| Trial Banner (Active) | `/?trialbanner=active` |
| Trial Banner (Urgent) | `/?trialbanner=urgent` |
| Trial Banner (Expired) | `/?trialbanner=expired` |

### Dev Bypass
Add `?dev=1` to bypass license check during development.

---

## Pricing Structure

| Plan | Price | Keys | Devices |
|------|-------|------|---------|
| Personal Vault | $49 | 1 | 1 |
| Family Vault | $79 | 5 | 5 |
| Free Trial | $0 | 1 | 1 (7 days) |

**Note:** Prices shown in landing page. Update in both:
- `src/components/LandingPage.tsx` (React version)
- `public/landing.html` (Standalone version)

---

## Color Palette

The landing page uses this consistent color scheme:

```css
--obsidian: #0a0e17;      /* Background */
--midnight: #111827;       /* Cards */
--slate: #1e293b;         /* Secondary background */
--steel: #334155;         /* Borders */
--electric: #3b82f6;      /* Primary accent */
--electric-light: #60a5fa; /* Hover states */
--amber: #f59e0b;         /* Warm accent */
--ivory: #f8fafc;         /* Text */
--silver: #94a3b8;        /* Secondary text */
--emerald: #10b981;       /* Success/security */
```

---

## Testing Checklist

Before deploying landing page changes:

- [ ] Trial form submits to correct API endpoint
- [ ] Error messages display correctly
- [ ] Download buttons link to correct files
- [ ] Pricing matches backend configuration
- [ ] Email addresses are valid
- [ ] Mobile responsive layout works
- [ ] All icons render (Lucide CDN)
- [ ] Fonts load (Google Fonts)

---

## Support

- **Website**: [LocalPasswordVault.com](https://LocalPasswordVault.com)
- **Email**: support@LocalPasswordVault.com

