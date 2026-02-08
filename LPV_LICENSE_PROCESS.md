# Local Password Vault — License & Security Model

## How It Works

```
CUSTOMER                         YOUR SERVER                    CUSTOMER'S DEVICE
────────                         ───────────                    ─────────────────
Enter email ──────────────────► Generate signed .license file
                                 (ECDSA P-256 private key)
                                        │
                          Email with .license attachment
                                        │
                                ◄───────┘
Download app
Install app
Open app
                                                               ┌─────────────────────┐
Import .license file ──────────────────────────────────────►   │ 1. Parse JSON        │
                                                               │ 2. Verify ECDSA sig  │
                                                               │    (public key only) │
                                                               │ 3. Check expiration  │
                                                               │ 4. Generate device   │
                                                               │    fingerprint       │
                                                               │ 5. Bind to device    │
                                                               │ 6. Store locally     │
                                                               └─────────────────────┘
                                                               
                              NO INTERNET CALLS. EVER.
                              
Use app forever ───────────────────────────────────────────►   Local validation only
                                                               Every launch:
                                                               • Verify signature
                                                               • Check device match
                                                               • Check expiration
                                                               • All in localStorage
```

---

## The Customer Experience

### Trial (7 days free)

1. Customer goes to localpasswordvault.com, enters their email
2. Server creates trial record in Supabase, generates a signed `.license` file, emails it
3. Customer downloads the app from the website
4. Opens the app for the first time — sees "Import License File" as the primary action
5. Drags the `.license` file from their email onto the app (or clicks to browse)
6. App verifies the signature, binds to the device, trial starts
7. No internet connection needed from this point forward

### Purchase (lifetime)

1. Customer buys via Stripe on the website
2. Stripe webhook fires on the server
3. Server generates the license, signs a `.license` file, emails it with download links
4. Customer imports the `.license` file into the app — same drag-and-drop
5. App verifies, binds, activates. Done forever.

### Fallback (lost the file)

- A small "or enter code" field is available below the file import zone
- Customer can type the license code from their email
- This triggers one server call to retrieve the signed file, then proceeds offline
- This is the secondary path — file import is primary

---

## Security Architecture

### Layer 1: License File Authenticity — ECDSA P-256 Digital Signatures

**How it works:**

The server signs every `.license` file with an ECDSA P-256 private key. The app verifies with the corresponding public key. This is the same class of cryptography used by HTTPS, Bitcoin, and Apple's code signing.

```
SERVER (private key)                          APP (public key only)
────────────────────                          ────────────────────
license data ──► ECDSA Sign ──► signature     signature ──► ECDSA Verify ──► valid/invalid
                     │                                          │
              private key                                  public key
              (NEVER leaves server)                        (embedded in app)
```

**What this prevents:**

| Attack | Blocked? | Why |
|--------|----------|-----|
| Forge a license file | Yes | Cannot sign without the private key |
| Modify a license file (change expiry, plan type) | Yes | Signature covers all fields — any change invalidates it |
| Extract the signing key from the app | Impossible | Only the public key is in the app. Public keys cannot sign. |
| Create a keygen/crack | No known method | ECDSA P-256 has no practical attack with current computing |

**Implementation:**

| Component | File | Algorithm |
|-----------|------|-----------|
| Server signer | `backend/services/lpvLicenseSigner.js` | ECDSA P-256 with SHA-256 |
| App verifier | `src/utils/licenseValidator.ts` | Web Crypto API `crypto.subtle.verify()` |
| Key pair generator | `backend/scripts/generate-lpv-keys.js` | Node.js `crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' })` |
| Public key location | Embedded in `licenseValidator.ts` + `VITE_LICENSE_PUBLIC_KEY` env var | 65-byte uncompressed point, hex-encoded |
| Private key location | Server `.env` only (`LPV_SIGNING_PRIVATE_KEY`) | PKCS8 DER, hex-encoded |

**Signature format:**

The server creates a canonical JSON string of the license data (sorted keys), then signs it:

```
canonical = JSON.stringify(licenseData, Object.keys(licenseData).sort())
signature = ECDSA-Sign(SHA-256(canonical), privateKey)
```

The signature is a DER-encoded ECDSA signature, hex-encoded (~140 characters).

---

### Layer 2: Device Binding — Hardware Fingerprint

**How it works:**

When the customer imports the `.license` file, the app generates a SHA-256 hash of their hardware characteristics and stores it alongside the license. On every app launch, it regenerates the fingerprint and checks it matches.

**Fingerprint components:**

| Component | Source | Stability |
|-----------|--------|-----------|
| OS platform | `navigator.platform` | Very stable |
| CPU core count | `navigator.hardwareConcurrency` | Stable per machine |
| Screen resolution | `screen.width x screen.height` | Stable per monitor config |
| Screen color depth | `screen.colorDepth` | Stable |
| Screen pixel depth | `screen.pixelDepth` | Stable |
| Timezone | `Intl.DateTimeFormat().resolvedOptions().timeZone` | Stable |
| System language | `navigator.language` | Stable |
| GPU vendor | WebGL `UNMASKED_VENDOR_WEBGL` | Very stable per GPU |
| GPU renderer | WebGL `UNMASKED_RENDERER_WEBGL` | Very stable per GPU |
| WebGL version | `gl.getParameter(gl.VERSION)` | Stable |
| GLSL version | `gl.getParameter(gl.SHADING_LANGUAGE_VERSION)` | Stable |
| OS from user-agent | Parsed from `navigator.userAgent` | Stable across browser updates |
| Device memory | `navigator.deviceMemory` | Stable per machine |
| Max touch points | `navigator.maxTouchPoints` | Stable |

**Final device_id:**

```
components = "platform|cores|1920x1080|24|24|America/New_York|en-US|NVIDIA|GeForce RTX 3080|..."
device_id  = SHA-256(components)
           = "a7f3b2c1d4e5f6..." (64-character hex string)
```

**What this prevents:**

| Attack | Blocked? | Why |
|--------|----------|-----|
| Copy license file to another computer | Yes | Fingerprint won't match on different hardware |
| Copy localStorage to another computer | Yes | Device fingerprint is recalculated on every launch |
| Run on a VM with cloned hardware profile | Partially | VMs often differ in GPU, memory, and other subtle characteristics |
| Use on same computer after hardware change | Handled | User re-imports the license file, which re-binds to the new fingerprint |

**Implementation:**

| Component | File | Purpose |
|-----------|------|---------|
| Fingerprint generator | `src/utils/deviceFingerprint.ts` | `getLPVDeviceFingerprint()` → SHA-256 hex |
| Fingerprint cache | `localStorage._cached_device_id` | Avoids recalculating on every call |
| Binding (full license) | `src/utils/licenseService.ts` `importLicenseFile()` | Sets `device_id` in local license file |
| Binding (trial) | `src/utils/licenseService.ts` `importLicenseFile()` | Sets `device_id` in local trial file |
| Validation (full license) | `src/utils/licenseService.ts` `validateLocalLicense()` | Compares `localLicense.device_id === currentDeviceId` |
| Validation (trial) | `src/utils/trialService.ts` `getTrialInfo()` | Compares `trialFile.device_id !== currentDeviceId` → invalidates |

---

### Layer 3: Vault Encryption — AES-256-GCM

**How it works:**

The customer's passwords and vault data are encrypted with AES-256-GCM using a key derived from their master password via PBKDF2. The master password never leaves the device. It is never sent to any server. It is never stored anywhere.

| Component | Detail |
|-----------|--------|
| Cipher | AES-256-GCM (authenticated encryption) |
| Key derivation | PBKDF2 with 100,000 iterations, SHA-256 |
| Salt | 32 random bytes, generated per vault, stored alongside encrypted data |
| IV | 12 random bytes (96-bit), generated per encryption operation |
| Auth tag | 16 bytes (128-bit), generated by GCM mode |
| Storage | Encrypted blob stored in `vault.dat` on local filesystem |
| Backup | Automatic backup to `vault.backup.dat` with atomic write |
| File permissions | 0600 (owner read/write only) on Unix/Linux/Mac |
| Secure delete | Random overwrite before file deletion |

**What this prevents:**

| Attack | Blocked? | Why |
|--------|----------|-----|
| Read vault without master password | Yes | AES-256-GCM is unbreakable without the key |
| Brute-force master password | Impractical | 100,000 PBKDF2 iterations makes each guess ~0.1 seconds |
| Tamper with encrypted data | Yes | GCM authentication tag detects any modification |
| Extract master password from app memory | Mitigated | `memorySecurity.ts` securely wipes sensitive buffers |
| Read vault file from disk | Yes (on Unix/Mac) | File permissions restrict access to owner only |

**Implementation:**

| Component | File |
|-----------|------|
| Renderer-side encryption | Built into vault storage (renderer process only) |
| Electron secure storage | `electron/secure-storage.js` — stores/loads encrypted blobs |
| Memory security | `src/utils/memorySecurity.ts` — secure wipe of buffers |
| Master password | Never enters the Electron main process. Only the encrypted blob crosses IPC. |

---

### Layer 4: Electron Security Hardening

| Protection | Setting | File |
|------------|---------|------|
| Node.js disabled in renderer | `nodeIntegration: false` | `electron/main.js` |
| Context isolation | `contextIsolation: true` | `electron/main.js` |
| Remote module disabled | `enableRemoteModule: false` | `electron/main.js` |
| Web security enabled | `webSecurity: true` | `electron/main.js` |
| Insecure content blocked | `allowRunningInsecureContent: false` | `electron/main.js` |
| IPC source validation | `isValidSource()` checks frame origin | `electron/main.js` |
| Certificate validation | Custom `setCertificateVerifyProc` | `electron/main.js` |
| Permission restrictions | Denies camera, mic, geolocation, etc. | `electron/main.js` |
| CSP enforcement | Strict Content-Security-Policy headers | `electron/main.js` |
| External URL blocking | `setWindowOpenHandler` → deny | `electron/main.js` |
| Navigation restrictions | `will-navigate` blocks non-app URLs | `electron/main.js` |
| Preload API surface | Minimal, validated IPC bridge only | `electron/preload.js` |
| Auto-updater | Disabled (no phone-home) | `electron/autoUpdater.js` |

---

### Layer 5: Zero Network Calls After Activation

**After the license file is imported, the app makes exactly zero outbound network requests.**

| What's disabled | How |
|----------------|-----|
| Analytics | `src/utils/analyticsService.ts` — all methods are empty no-ops |
| Error tracking (Sentry) | `src/utils/sentry.ts` — all methods are empty no-ops |
| Auto-updater | `electron/autoUpdater.js` — all methods are empty no-ops |
| Cloud sync | `src/config/environment.ts` — `enableCloudSync: false` hardcoded |
| License heartbeat | Does not exist. Validation is 100% local. |
| Telemetry | Does not exist. No data collection of any kind. |

**Verification method:** Every function that could make a network call has been audited. The only outbound calls are user-initiated: license activation (fallback), Stripe checkout, trial signup, admin dashboard. After the `.license` file is imported, none of these paths execute.

---

## What's Stored Where

### On Your Server (Supabase)

| Table | What's stored | Why |
|-------|--------------|-----|
| `trials` | email, trial code, expires_at, product_type | Business record of who signed up for a trial |
| `licenses` | license code, email, Stripe payment ID, plan_type, amount_paid | Business record of who bought what |
| `customers` | email, Stripe customer ID, name | Customer record from Stripe |
| `webhook_events` | Stripe event ID, payload | Idempotency log for webhook processing |

**What's NOT stored on the server:** vault data, master passwords, device fingerprints, license files. The signed `.license` file is generated, emailed, and forgotten. The server does not keep a copy.

### On the Customer's Device

| Storage | What | Why |
|---------|------|-----|
| `localStorage.lpv_license_file` | Signed license JSON + device_id | Offline license validation |
| `localStorage.lpv_trial_file` | Signed trial JSON + device_id | Offline trial validation |
| `localStorage.app_license_type` | `personal`, `family`, or `trial` | Quick type check |
| `localStorage._cached_device_id` | SHA-256 hardware fingerprint | Avoids recalculating on every launch |
| `vault.dat` (filesystem) | AES-256-GCM encrypted vault blob | The actual password data |
| `vault.backup.dat` (filesystem) | Backup of encrypted vault | Recovery from corruption |
| `vault.salt` (filesystem) | 32-byte random salt | Key derivation for vault encryption |

**What's NOT stored on the device:** the ECDSA private key, the HMAC signing secret, any server credentials, any analytics data.

---

## Device Transfer

When a customer moves to a new computer:

1. They find the original `.license` file in their email
2. They import it into the app on the new computer
3. The app generates a new device fingerprint for the new hardware
4. The app binds the license to the new device
5. The old device's copy still has the old fingerprint — it becomes invalid on next launch since the fingerprint no longer matches

This is a self-service process. No server call needed. No transfer limits enforced (since there's no server round-trip to count them).

If the customer also has the fallback code entry path, the server-side transfer route (`POST /api/lpv/license/transfer`) enforces a 3-per-year transfer limit and re-issues a signed file. This is a secondary path for customers who lost their file.

---

## License File Format

### Trial License File (`.license`)

```json
{
  "trial_key": "LPVT-A3B7-K9M2-X4R8",
  "plan_type": "trial",
  "product_type": "lpv",
  "start_date": "2026-02-08T21:56:00.000Z",
  "expires_at": "2026-02-15T21:56:00.000Z",
  "signature": "3045022100b8e4f2a1c7d9...hex...4a3b",
  "signed_at": "2026-02-08T21:56:00.000Z"
}
```

### Purchase License File (`.license`)

```json
{
  "license_key": "PERS-X7K2-M4B9-R3A8",
  "plan_type": "personal",
  "max_devices": 1,
  "product_type": "lpv",
  "activated_at": "2026-02-08T22:00:00.000Z",
  "transfer_count": 0,
  "last_transfer_at": null,
  "signature": "304402207f1a3c5d8e2b...hex...9c7e",
  "signed_at": "2026-02-08T22:00:00.000Z"
}
```

Note: `device_id` is NOT in the file from the server. It is added locally by the app when the file is imported. This is by design — the server doesn't need to know which device the customer uses.

---

## Summary

| Concern | How It's Handled |
|---------|-----------------|
| Can someone forge a license? | No. ECDSA P-256 signature. Private key is on the server only. |
| Can someone copy a license to another computer? | No. Device fingerprint binding. Different hardware = different fingerprint = license invalid. |
| Can someone read the vault without the master password? | No. AES-256-GCM encryption with PBKDF2 key derivation. |
| Does the app phone home? | No. Zero network calls after license import. |
| Does the app track the user? | No. Analytics, Sentry, telemetry all disabled (no-op implementations). |
| Can the server see the user's passwords? | No. The server never receives vault data or the master password. |
| What if the server goes down? | App works normally. Everything is local. |
| What if the customer gets a new computer? | Re-import the license file from email. Self-service, no server needed. |
