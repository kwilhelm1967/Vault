# Gap Analysis: No External Calls & Device Binding

**Date:** February 8, 2026  
**Scope:** Full codebase audit — frontend (`src/`), Electron (`electron/`), backend (`backend/`)  
**Objective:** Verify (1) no unauthorized/unwanted outbound calls exist, and (2) device binding is complete and enforceable.

---

## EXECUTIVE SUMMARY

The codebase is **generally well-architected** for offline-first operation with device binding. However, there are **7 gaps** (3 critical, 2 moderate, 2 low-severity) that need to be addressed.

| Area | Status | Gaps Found |
|------|--------|------------|
| **No External Calls (post-activation)** | MOSTLY PASS | 3 gaps |
| **Device Binding - Frontend** | PASS | 1 gap |
| **Device Binding - Backend** | PASS | 0 gaps |
| **Device Binding - Electron** | PARTIAL PASS | 1 gap |
| **License Signature Verification** | PARTIAL PASS | 2 gaps |

---

## SECTION 1: "NO CALLS" AUDIT

### What Should Make Network Calls (Legitimate)

These are the **ONLY** operations that should ever make outbound HTTP requests:

1. **License activation** (`POST /api/lpv/license/activate`) — one-time, user-initiated
2. **License transfer** (`POST /api/lpv/license/transfer`) — user-initiated
3. **Trial activation** (`POST /api/lpv/license/trial/activate`) — one-time, user-initiated
4. **Trial signup by email** (`POST /api/trial/signup`) — user-initiated from LicenseScreen
5. **Stripe checkout** (`POST /api/checkout/create-session`, `/api/checkout/bundle`) — user-initiated purchase
6. **Purchase success verification** (`GET /api/checkout/session/:id`) — after Stripe redirect
7. **Network diagnostics** (`GET /health`) — user-initiated troubleshooting only
8. **Admin Dashboard** (authenticated API calls) — admin-only, requires Supabase auth

### Confirmed NO-OP / Disabled Services (PASS)

| Service | File | Status |
|---------|------|--------|
| Analytics | `src/utils/analyticsService.ts` | **NO-OP** — all methods empty, zero network calls |
| Sentry | `src/utils/sentry.ts` | **NO-OP** — all methods empty, zero network calls |
| Auto-Updater | `electron/autoUpdater.js` | **DISABLED** — all methods are no-ops, zero network calls |
| Cloud Sync | `src/config/environment.ts` | `enableCloudSync: false` — hardcoded off |

### Confirmed Offline Operations (PASS)

| Operation | File | Status |
|-----------|------|--------|
| `getAppStatus()` | `licenseService.ts:137` | **100% OFFLINE** — reads localStorage only |
| `getLicenseInfo()` | `licenseService.ts:257` | **100% OFFLINE** — reads localStorage + validates local file |
| `validateLocalLicense()` | `licenseService.ts:224` | **100% OFFLINE** — crypto signature check only |
| `shouldBlockAccess()` | `licenseService.ts:837` | **100% OFFLINE** — delegates to offline methods |
| `validateForCriticalOperation()` | `licenseService.ts:810` | **100% OFFLINE** — local validation only |
| `getTrialInfo()` | `trialService.ts:267` | **100% OFFLINE** — reads localStorage + verifies signature |
| `refreshLicenseStatus()` | `licenseService.ts:885` | **100% OFFLINE** — local validation only |

---

### GAP 1 (CRITICAL): `licenseKeys.ts` — Hardcoded License Keys in Client Bundle

**File:** `src/utils/licenseKeys.ts`

**Issue:** All license keys (personal, family, gift/lifetime) are **hardcoded in plaintext** in the frontend source code and bundled into the production JavaScript. This means:

- Anyone can extract every valid license key from the JS bundle
- The `validateLicenseKey()` function on line 195 checks against this client-side list
- An attacker can use any of these keys to activate on their device

**Severity:** CRITICAL  
**Impact:** Complete bypass of the paid license system  

**Recommendation:**
- **Remove `licenseKeys.ts` entirely** from the frontend bundle
- All license validation must happen **server-side only** (which the backend already does via Supabase DB lookup)
- The client-side `validateLicenseKey()` in this file is redundant — `licenseService.ts` already calls the server for activation
- If needed for format-only validation, keep only the regex pattern check, NOT the key list

---

### GAP 2 (MODERATE): `App.tsx` — `fetch()` on PDF Data URL

**File:** `src/App.tsx:760`

```typescript
const response = await fetch(pdfDataUrl);
const blob = await response.blob();
```

**Issue:** This `fetch()` is called on a data URL from `storageService.exportPDF()`. While data URLs are technically local and don't make network calls, if `pdfDataUrl` were ever to return an `http://` or `https://` URL (e.g., due to a bug or injection), this would make an external call.

**Severity:** LOW  
**Impact:** Potential for unintended external call if data URL generation is compromised  

**Recommendation:**
- Add a guard: `if (!pdfDataUrl.startsWith('data:')) throw new Error('Invalid PDF data')`
- Or convert directly from base64 without `fetch()`

---

### GAP 3 (MODERATE): `AdminGate.tsx` — Direct Supabase Auth Call

**File:** `src/components/AdminGate.tsx:25`

```typescript
const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, { ... });
```

**Issue:** The AdminGate component makes a direct `fetch()` call to the Supabase auth URL for admin login. This is **not going through the `apiClient`**, bypassing the centralized retry/error-handling logic. More importantly, this is an external call to `supabase.co` that exists in the production bundle.

**Severity:** MODERATE  
**Impact:** External call to Supabase exists in production code; admin auth goes through external service  

**Recommendation:**
- If admin portal is intended for internal use only, this is acceptable but should be documented
- Consider routing admin auth through the backend (`POST /api/admin/auth`) to avoid direct Supabase calls from the client
- At minimum, ensure this code path is only reachable by admins (it appears guarded by a gate screen)

---

## SECTION 2: DEVICE BINDING AUDIT

### Device Fingerprint Generation (PASS with notes)

**File:** `src/utils/deviceFingerprint.ts`

The fingerprint is a SHA-256 hash of:
- `navigator.platform`
- `navigator.hardwareConcurrency` (CPU cores)
- Screen resolution + color depth + pixel depth
- Timezone
- System language
- WebGL vendor + renderer + version
- OS info from user-agent
- `navigator.deviceMemory` (if available)
- `navigator.maxTouchPoints`

**Assessment:** This produces a reasonably stable fingerprint that varies across physical machines. The fingerprint is:
- Cached in `localStorage` under `_cached_device_id` for performance
- Validated as a 64-character hex string
- Shared between `licenseService` and `trialService` via the cache

### Device Binding Enforcement Chain (PASS)

| Step | Component | How Device Is Bound |
|------|-----------|-------------------|
| **Activation** | `licenseService.activateLicense()` | Sends `device_id` to server; server stores in `hardware_hash` + `current_device_id` |
| **Server Response** | `backend/routes/lpv-licenses.js` | Returns signed `license_file` containing `device_id` |
| **Local Storage** | `licenseService.saveLocalLicenseFile()` | Saves signed license file with `device_id` in localStorage |
| **Offline Validation** | `licenseService.validateLocalLicense()` | Compares `localLicense.device_id` against current `getDeviceId()` |
| **Signature Check** | `licenseValidator.verifyLicenseSignature()` | HMAC-SHA256 verification prevents tampering with `device_id` in local file |
| **App Access Gate** | `licenseService.shouldBlockAccess()` | Calls `validateForCriticalOperation()` → `validateLocalLicense()` |
| **Device Mismatch** | `licenseService.checkDeviceMismatch()` | Detects when hardware changes, prompts for transfer |
| **Transfer** | `licenseService.transferLicense()` | Server-side transfer with new `device_id`, max 3/year |

### Trial Device Binding (PASS)

| Step | Component | How Device Is Bound |
|------|-----------|-------------------|
| **Trial Activation** | `trialService.activateTrial()` | Sends `device_id` to server |
| **Server Response** | `backend/routes/lpv-licenses.js` trial route | Returns signed `trial_file` containing `device_id` |
| **Trial Validation** | `trialService.getTrialInfo()` | Checks `trialFile.device_id !== currentDeviceId` → invalidates trial |

### Backend Device Binding (PASS)

**File:** `backend/routes/lpv-licenses.js`

| Check | Implementation |
|-------|---------------|
| `device_id` required | Line 21: Returns 400 if missing |
| `device_id` format validation | Line 28: Regex `/^[a-f0-9]{64}$/i` enforced |
| First activation binds device | Lines 65-134: Stores `hardware_hash` + `current_device_id` |
| Same-device reactivation | Lines 264-309: Checks `hardware_hash === device_id` or `current_device_id === device_id` |
| Device mismatch detected | Lines 312-315: Returns `status: 'device_mismatch'` |
| Transfer enforced | Lines 329-462: `new_device_id` validated, transfer count tracked, max 3/year |
| Family plan multi-device | Lines 138-259: Device activations tracked per license, max devices enforced |
| Trial device binding | Lines 465-589: `device_id` stored in signed trial file |

---

### GAP 4 (CRITICAL): Trial Licenses Skip Device Binding Validation Locally

**File:** `src/utils/licenseService.ts:273-280`

```typescript
// For trial licenses, check expiration (local only, no network)
// No device validation needed for trials - they're device-bound by design
if (type === 'trial') {
  return {
    isValid: true,
    type,
    key,
    activatedDate: activatedDateStr ? new Date(activatedDateStr) : null,
  };
}
```

**Issue:** When `getLicenseInfo()` finds a trial license type in localStorage, it returns `isValid: true` **without checking the signed trial file or verifying device binding**. The trial file has device binding checks in `trialService.getTrialInfo()`, but `getLicenseInfo()` short-circuits before reaching that code.

This means:
- If someone copies `app_license_type = "trial"` and `app_license_key = "LPVT-..."` to a different machine's localStorage, `getLicenseInfo()` would return valid
- The `getAppStatus()` method at line 150 does check `trialInfo.isTrialActive` via `trialService.getTrialInfo()` (which DOES verify device binding), so the overall flow may still catch it
- But `getLicenseInfo()` alone is not safe for trial types

**Severity:** CRITICAL  
**Impact:** Potential bypass of trial device binding when `getLicenseInfo()` is called in isolation  

**Recommendation:**
- Remove the trial short-circuit in `getLicenseInfo()` and route trial validation through `trialService.getTrialInfo()` which properly checks device binding
- Or add explicit device binding check for trials: verify the signed trial file's `device_id` matches current device

---

### GAP 5 (CRITICAL): `licenseValidator.ts` — Signing Secret Bundled in Frontend

**File:** `src/utils/licenseValidator.ts:49`

```typescript
const signingSecret = import.meta.env.VITE_LICENSE_SIGNING_SECRET || '';
```

**Issue:** The license signing secret (`VITE_LICENSE_SIGNING_SECRET`) is an **environment variable that gets bundled into the frontend JavaScript** by Vite. This is the same secret the backend uses to sign license files. If this secret is present in the production build:

- An attacker can extract it from the JS bundle
- They can forge valid license file signatures
- They can create license files with any `device_id`, completely bypassing device binding

**Severity:** CRITICAL  
**Impact:** Complete bypass of license signature verification and device binding  

**Recommendation:**
- **Never bundle the signing secret in the frontend**
- Use **asymmetric cryptography** instead: backend signs with a private key, frontend verifies with a public key
- The public key can safely be bundled in the frontend
- Alternative: Use Ed25519 signatures (fast, small, secure) — the backend signs with the private key, the client verifies with the embedded public key

---

### GAP 6 (LOW): Electron Main Process Uses Separate Trial Validation

**File:** `electron/main.js:1422-1488`

**Issue:** The Electron main process (`validateAndEnforceTrialStatus`) reads trial info from a separate JSON file (`trial-info.json` in userData), NOT from the signed trial file in localStorage. This creates a dual-validation path:

- **Renderer:** Uses signed trial file (`lpv_trial_file` in localStorage) with crypto verification
- **Main process:** Uses unsigned `trial-info.json` which is written by the renderer via IPC (`save-trial-info`)

An attacker could modify `trial-info.json` directly on disk to set `hasValidLicense: true` or manipulate `expiryTime`, bypassing the Electron-level trial enforcement.

**Severity:** LOW (because the renderer-side validation is the primary gate)  
**Impact:** Floating button and floating panel might not be properly gated if `trial-info.json` is tampered  

**Recommendation:**
- Have the Electron main process read and verify the signed trial/license file directly, rather than relying on an unsigned JSON file
- Or cryptographically sign the `trial-info.json` file when writing it from the renderer

---

### GAP 7 (LOW): Device ID Cache Could Be Stale

**File:** `src/utils/licenseService.ts:107-108` and `src/utils/trialService.ts:320-321`

```typescript
const cachedId = localStorage.getItem('_cached_device_id');
```

**Issue:** The device fingerprint is cached in localStorage under `_cached_device_id` and reused across restarts without recalculation. If a user's hardware changes (e.g., GPU driver update changing WebGL renderer, OS update changing platform string), the cached ID could become stale, causing a false device mismatch.

**Severity:** LOW  
**Impact:** Legitimate users could be locked out if hardware changes cause fingerprint drift  

**Recommendation:**
- Periodically recalculate the fingerprint (e.g., once per day) and compare against the cache
- If the new fingerprint differs, update the cache but also check if the old fingerprint matches the license file
- Consider using a smaller set of more stable hardware attributes (CPU cores + RAM + OS) as primary identifiers

---

## SECTION 3: SUMMARY OF ALL OUTBOUND NETWORK CALLS

### Frontend (`src/`) — Complete List

| Call | File | When | Legitimate? |
|------|------|------|-------------|
| `POST /api/lpv/license/activate` | `licenseService.ts:408` | User clicks Activate | YES |
| `POST /api/lpv/license/transfer` | `licenseService.ts:615` | User confirms transfer | YES |
| `POST /api/lpv/license/trial/activate` | `trialService.ts:118` | User activates trial key | YES |
| `POST /api/trial/signup` | `LicenseScreen.tsx:772` | User requests trial by email | YES |
| `POST /api/checkout/create-session` | `LicenseScreen.tsx:596` | User initiates purchase | YES |
| `POST /api/checkout/bundle` | `LicenseScreen.tsx:669` | User initiates bundle purchase | YES |
| `GET /api/checkout/session/:id` | `PurchaseSuccessPage.tsx:342` | After Stripe redirect | YES |
| `GET /health` | `networkDiagnostics.ts:71` | User troubleshoots connection | YES |
| `fetch(pdfDataUrl)` | `App.tsx:760` | PDF export (data URL) | YES (local) |
| `fetch(supabaseUrl/auth)` | `AdminGate.tsx:25` | Admin login | YES (admin only) |
| Admin API calls | `AdminDashboard.tsx:501` | Various admin operations | YES (admin only) |

### Electron Main Process — Complete List

| Call | File | When | Legitimate? |
|------|------|------|-------------|
| `net.request()` via IPC `http-request` | `electron/main.js:2325` | Proxied from renderer for license calls | YES |
| `net.request()` for health check | `electron/main.js:2651` | Network diagnostic IPC | YES |

### Backend — Server-Side Only (Not App Calls)

The backend makes calls to:
- Supabase (database)
- Stripe (payment processing)
- Email service (SendGrid/etc for trial emails)

These are all server-side and do not represent app "phoning home."

---

## SECTION 4: REMEDIATION PRIORITY

| Priority | Gap | Action Required |
|----------|-----|-----------------|
| **P0** | GAP 1: Hardcoded license keys in client | Remove `licenseKeys.ts` key lists from frontend bundle |
| **P0** | GAP 5: Signing secret in frontend | Switch to asymmetric crypto (public key in frontend, private on backend) |
| **P0** | GAP 4: Trial skips device binding in `getLicenseInfo()` | Add device binding check for trial type in `getLicenseInfo()` |
| **P1** | GAP 3: AdminGate direct Supabase call | Route admin auth through backend API |
| **P1** | GAP 6: Electron unsigned trial-info.json | Sign or verify the trial-info.json in main process |
| **P2** | GAP 2: Unguarded fetch on PDF URL | Add data URL guard |
| **P2** | GAP 7: Stale device ID cache | Add periodic recalculation |

---

## CONCLUSION

The app's "no calls after activation" policy is **well-implemented** — analytics, Sentry, auto-updater, and cloud sync are all properly disabled/no-op. All post-activation operations (license check, trial check, vault access) are **100% offline**.

Device binding is **architecturally sound** — the fingerprint → signed license file → local validation chain is correct. The backend properly validates device IDs and enforces transfer limits.

However, **3 critical gaps** (hardcoded keys, frontend signing secret, trial device binding skip) must be fixed to make the system actually secure against a technically knowledgeable user examining the JavaScript bundle.
