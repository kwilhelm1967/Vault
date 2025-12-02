# Code Signing Guide for Local Password Vault

This guide explains how to sign your installers for Windows and Mac to make them trusted by users and avoid security warnings.

## Why Code Sign?

- **Trust**: Users see your company name instead of "Unknown Publisher"
- **Security**: Prevents tampering with your software
- **Distribution**: Required for Mac App Store and recommended for Windows
- **Auto-Updates**: Some update mechanisms require signed apps

---

## Windows Code Signing

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
   
   Create `.env` file:
   ```env
   CSC_LINK=path/to/certificate.pfx
   CSC_KEY_PASSWORD=your_password
   ```

4. **Build Signed Installer**
   ```bash
   npm run dist:win
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
