# Code Signing Guide for Local Password Vault

This guide explains how to sign your installers for Windows and Mac to make them trusted by users and avoid security warnings.

## Why Code Sign?

- **Trust**: Users see your company name instead of "Unknown Publisher"
- **Security**: Prevents tampering with your software
- **Distribution**: Required for Mac App Store and recommended for Windows
- **Auto-Updates**: Some update mechanisms require signed apps

---

## Quick Setup Using Scripts (Recommended)

The easiest way to set up code signing is using the provided setup scripts. These scripts automate the certificate configuration process.

### Windows Setup Script

**Location:** `scripts/setup-code-signing.ps1`

**Usage:**
```powershell
# Run from project root
.\scripts\setup-code-signing.ps1
```

**What it does:**
1. Creates `certs/` directory (if it doesn't exist)
2. Guides you through downloading certificate from SSL.com
3. Copies certificate to `certs/` directory
4. Prompts for certificate password
5. Creates/updates `.env` file with:
   - `CSC_LINK=certs/your-certificate.pfx`
   - `CSC_KEY_PASSWORD=your_password`

**After running the script:**
```bash
# Build signed installer
npm run dist:win
```

### macOS/Linux Setup Script

**Location:** `scripts/setup-code-signing.sh`

**Usage:**
```bash
# Make executable (first time only)
chmod +x scripts/setup-code-signing.sh

# Run from project root
./scripts/setup-code-signing.sh
```

**What it does:**
- Same as Windows script but for macOS/Linux environment
- Creates `certs/` directory
- Guides certificate setup
- Configures `.env` file

### Verify Code Signing Configuration

**Location:** `scripts/verify-code-signing.ps1`

**Usage:**
```powershell
# Check if code signing is properly configured
.\scripts\verify-code-signing.ps1
```

**What it checks:**
- ✓ `.env` file exists
- ✓ Certificate file exists at path specified in `CSC_LINK`
- ✓ Certificate password is set in `CSC_KEY_PASSWORD`
- ✓ Certificate files are in `.gitignore` (security check)

**If verification fails:**
- Run `.\scripts\setup-code-signing.ps1` to configure

### Verify Installer Signature

**Location:** `scripts/verify-installer.ps1`

**Usage:**
```powershell
# Verify the built installer (auto-detects latest in release/ folder)
.\scripts\verify-installer.ps1

# Or specify installer path
.\scripts\verify-installer.ps1 -InstallerPath "path\to\installer.exe"
```

**What it checks:**
- File information (name, size, dates)
- SHA-256 hash (for publishing on website)
- Digital signature status (Valid/NotSigned/Invalid)
- Certificate details (signer, issuer, expiration)
- File size checks (malware indicators)
- Dependency audit (npm vulnerabilities)

**Example output:**
```
[PASS] Signature Status - Valid
[INFO] Signer - CN=Your Company Name
[INFO] Expires - 2025-12-31
[INFO] SHA-256 - abc123... (for website)
```

---

## Windows Code Signing (Manual Setup)

### Option 1: EV Code Signing Certificate (Recommended)

EV (Extended Validation) certificates provide instant reputation with SmartScreen.

**Providers:**
- DigiCert (~$500/year)
- Sectigo (~$350/year)
- GlobalSign (~$400/year)

**Steps:**

1. **Purchase Certificate**
   - Buy an EV code signing certificate
   - Complete identity verification (requires notarized documents)
   - Receive hardware token (USB) with private key

2. **Install Certificate**
   ```powershell
   # Install certificate to Windows certificate store
   certutil -csp "eToken Base Cryptographic Provider" -importpfx certificate.pfx
   ```

3. **Configure electron-builder**
   
   **Option A: Use Setup Script (Recommended)**
   ```powershell
   .\scripts\setup-code-signing.ps1
   ```
   
   **Option B: Manual Configuration**
   
   Create `.env` file:
   ```env
   CSC_LINK=path/to/certificate.pfx
   CSC_KEY_PASSWORD=your_password
   ```

4. **Verify Configuration**
   ```powershell
   .\scripts\verify-code-signing.ps1
   ```

5. **Build Signed Installer**
   ```bash
   npm run dist:win
   ```

6. **Verify Installer Signature**
   ```powershell
   .\scripts\verify-installer.ps1
   ```

### Option 2: Standard Code Signing Certificate

Cheaper but requires time to build SmartScreen reputation.

**Providers:**
- SSL.com (~$75/year)
- Sectigo (~$100/year)

### Option 3: Self-Signed (Development Only)

```powershell
# Create self-signed certificate
New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=Local Password Vault" -CertStoreLocation Cert:\CurrentUser\My

# Export certificate
$cert = Get-ChildItem Cert:\CurrentUser\My | Where-Object {$_.Subject -like "*Local Password Vault*"}
Export-PfxCertificate -Cert $cert -FilePath .\selfsigned.pfx -Password (ConvertTo-SecureString -String "password" -Force -AsPlainText)
```

---

## Mac Code Signing

### Requirements

1. **Apple Developer Account** ($99/year)
   - Enroll at https://developer.apple.com

2. **Developer ID Certificate**
   - Go to Certificates, Identifiers & Profiles
   - Create "Developer ID Application" certificate

3. **Notarization**
   - Required for macOS 10.15+ (Catalina and later)
   - Apple scans your app for malware

### Steps:

1. **Install Certificate**
   - Double-click downloaded certificate
   - It will be added to Keychain

2. **Create App-Specific Password**
   - Go to https://appleid.apple.com
   - Generate app-specific password for notarization

3. **Configure electron-builder**

   Create `.env` file:
   ```env
   APPLE_ID=your@email.com
   APPLE_ID_PASSWORD=app-specific-password
   APPLE_TEAM_ID=YOUR_TEAM_ID
   ```

   Update `electron-builder.json`:
   ```json
   {
     "mac": {
       "identity": "Developer ID Application: Your Name (TEAM_ID)",
       "notarize": {
         "teamId": "YOUR_TEAM_ID"
       }
     }
   }
   ```

4. **Build Signed & Notarized App**
   ```bash
   npm run dist:mac
   ```

### Hardened Runtime

Already configured in `electron-builder.json`:
```json
{
  "mac": {
    "hardenedRuntime": true,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist"
  }
}
```

---

## GitHub Actions CI/CD (Recommended)

Automate builds and signing with GitHub Actions:

```yaml
# .github/workflows/build.yml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run dist:win
        env:
          CSC_LINK: ${{ secrets.WIN_CERTIFICATE_BASE64 }}
          CSC_KEY_PASSWORD: ${{ secrets.WIN_CERTIFICATE_PASSWORD }}
      - uses: actions/upload-artifact@v4
        with:
          name: windows-installer
          path: release/*.exe

  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run dist:mac
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          CSC_LINK: ${{ secrets.MAC_CERTIFICATE_BASE64 }}
          CSC_KEY_PASSWORD: ${{ secrets.MAC_CERTIFICATE_PASSWORD }}
      - uses: actions/upload-artifact@v4
        with:
          name: mac-installer
          path: release/*.dmg
```

---

## Verification

### Windows
```powershell
# Check signature
signtool verify /pa "Local Password Vault Setup.exe"

# View certificate details
signtool verify /v /pa "Local Password Vault Setup.exe"
```

### Mac
```bash
# Check code signature
codesign -dv --verbose=4 "Local Password Vault.app"

# Verify notarization
spctl -a -vvv -t install "Local Password Vault.app"

# Check notarization status
xcrun stapler validate "Local Password Vault.dmg"
```

---

## Troubleshooting

### Windows SmartScreen Warning
- **Cause**: No reputation or unsigned
- **Fix**: Use EV certificate or accumulate reputation

### Mac "App can't be opened"
- **Cause**: Not notarized or quarantine attribute
- **Fix**: Notarize app or run:
  ```bash
  xattr -cr "Local Password Vault.app"
  ```

### Certificate Not Found
- **Cause**: Certificate not in keychain/store
- **Fix**: Re-import certificate

---

## Cost Summary

| Platform | Option | Cost | Notes |
|----------|--------|------|-------|
| Windows | EV Certificate | ~$400/year | Instant trust |
| Windows | Standard Certificate | ~$100/year | Takes time to build trust |
| Mac | Developer ID | $99/year | Required for distribution |
| Both | Self-signed | Free | Development only |

---

## Quick Start (Unsigned Development Builds)

For testing without code signing:

```bash
# Windows
npm run dist:win

# Mac (will show "unidentified developer" warning)
npm run dist:mac

# Linux (no signing required)
npm run dist:linux
```

Users can bypass warnings:
- **Windows**: Click "More info" → "Run anyway"
- **Mac**: Right-click → "Open" → "Open"
