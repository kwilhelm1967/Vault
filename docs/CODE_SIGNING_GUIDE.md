# Code Signing Guide

This guide explains how to sign Local Password Vault for Windows and macOS to remove security warnings.

## Why Code Signing Matters

Without code signing:
- **Windows**: Shows "Windows protected your PC" SmartScreen warning
- **macOS**: Shows "Cannot be opened because the developer cannot be verified"

With code signing:
- Users trust the installer immediately
- No scary security warnings
- Required for enterprise deployment

---

## Windows Code Signing

### Step 1: Purchase an EV Code Signing Certificate

| Provider | Cost | Link |
|----------|------|------|
| DigiCert | ~$400/year | https://www.digicert.com/signing/code-signing-certificates |
| Sectigo | ~$300/year | https://sectigo.com/ssl-certificates-tls/code-signing |
| GlobalSign | ~$350/year | https://www.globalsign.com/en/code-signing-certificate |

> ⚠️ **Important**: Get an **EV (Extended Validation)** certificate, not a standard one. EV certificates build SmartScreen reputation immediately.

### Step 2: Receive Your Certificate

EV certificates come on a **USB hardware token** (like a YubiKey). This is required for security.

### Step 3: Export the Certificate

1. Insert the USB token
2. Open the certificate management software (provided by vendor)
3. Export as `.pfx` file with a strong password
4. Save to `certs/windows-signing.pfx`

### Step 4: Configure Environment

Create a `.env` file (or set in your CI/CD):

```bash
WIN_CSC_KEY_PASSWORD=your_certificate_password
```

### Step 5: Build Signed Installer

```bash
npm run dist:win
```

The certificate settings are already in `electron-builder.json`:

```json
"win": {
  "certificateFile": "./certs/windows-signing.pfx",
  "certificatePassword": "${WIN_CSC_KEY_PASSWORD}",
  "signingHashAlgorithms": ["sha256"],
  "publisherName": "Your Company Name"
}
```

### Step 6: Update Publisher Name

Edit `electron-builder.json` and replace:
```json
"publisherName": "Your Company Name"
```

With your actual company/developer name as it appears on the certificate.

---

## macOS Code Signing & Notarization

### Step 1: Join Apple Developer Program

1. Go to https://developer.apple.com/programs/
2. Enroll ($99/year)
3. Wait for approval (usually 24-48 hours)

### Step 2: Create Developer ID Certificate

1. Open **Xcode** on a Mac
2. Go to **Xcode → Settings → Accounts**
3. Select your Apple ID → Manage Certificates
4. Click **+** → **Developer ID Application**
5. Certificate will be added to Keychain

### Step 3: Find Your Team ID

1. Go to https://developer.apple.com/account
2. Click **Membership** in the sidebar
3. Copy your **Team ID** (10-character alphanumeric)

### Step 4: Configure electron-builder.json

Edit `electron-builder.json` and replace placeholders:

```json
"mac": {
  "identity": "Developer ID Application: John Smith (ABC123XYZ)",
  "notarize": {
    "teamId": "ABC123XYZ"
  }
}
```

Replace:
- `John Smith` → Your name as registered with Apple
- `ABC123XYZ` → Your Team ID

### Step 5: Set Up Notarization Credentials

Apple requires **notarization** for apps distributed outside the App Store.

Create an **App-Specific Password**:
1. Go to https://appleid.apple.com
2. Sign in → Security → App-Specific Passwords
3. Generate a password for "electron-builder"

Set environment variables:

```bash
APPLE_ID=your@email.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=ABC123XYZ
```

### Step 6: Build Signed & Notarized App

```bash
npm run dist:mac
```

This will:
1. Build the app
2. Sign with your Developer ID
3. Submit to Apple for notarization
4. Staple the notarization ticket to the app

> ⚠️ Notarization can take 5-15 minutes. Be patient.

---

## File Structure

After setup, your project should have:

```
LocalPasswordVault/
├── certs/
│   └── windows-signing.pfx    # Windows certificate (DO NOT COMMIT)
├── build/
│   └── entitlements.mac.plist # macOS entitlements
├── electron-builder.json       # Build configuration
└── .env                        # Environment variables (DO NOT COMMIT)
```

---

## Security: Keep Certificates Safe!

### Add to .gitignore

```gitignore
# Code signing certificates - NEVER commit these
certs/
*.pfx
*.p12
*.pem

# Environment variables
.env
.env.local
```

### Best Practices

1. **Never commit certificates** to version control
2. **Use environment variables** for passwords
3. **Store certificates securely** (password manager, hardware token)
4. **Limit access** to signing credentials
5. **Use CI/CD secrets** for automated builds

---

## CI/CD Integration (GitHub Actions Example)

```yaml
name: Build & Sign

on:
  push:
    tags:
      - 'v*'

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build signed installer
        env:
          WIN_CSC_LINK: ${{ secrets.WIN_CSC_LINK }}
          WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
        run: npm run dist:win
        
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: windows-installer
          path: release/*.exe

  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Import signing certificate
        env:
          MACOS_CERTIFICATE: ${{ secrets.MACOS_CERTIFICATE }}
          MACOS_CERTIFICATE_PWD: ${{ secrets.MACOS_CERTIFICATE_PWD }}
        run: |
          echo $MACOS_CERTIFICATE | base64 --decode > certificate.p12
          security create-keychain -p "" build.keychain
          security import certificate.p12 -k build.keychain -P $MACOS_CERTIFICATE_PWD -T /usr/bin/codesign
          security set-key-partition-list -S apple-tool:,apple: -s -k "" build.keychain
          
      - name: Build signed & notarized app
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: npm run dist:mac
        
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: macos-installer
          path: release/*.dmg
```

---

## Troubleshooting

### Windows: "The file is corrupted" error
- Ensure the certificate password is correct
- Check that the USB token is connected
- Verify the `.pfx` file isn't corrupted

### macOS: "Code signature invalid"
- Ensure you're using "Developer ID Application" (not "Mac App Distribution")
- Check that the certificate is in your Keychain
- Run `security find-identity -v -p codesigning` to verify

### macOS: Notarization fails
- Check your Apple ID credentials
- Ensure app-specific password is correct
- Review Apple's email for specific rejection reasons

### Both: Certificate expired
- Certificates expire yearly
- Renew 30 days before expiration
- Re-export and update your build environment

---

## Cost Summary

| Item | Cost | Renewal |
|------|------|---------|
| Windows EV Certificate | $300-500 | Yearly |
| Apple Developer Program | $99 | Yearly |
| **Total** | ~$400-600 | Yearly |

---

## Next Steps

1. [ ] Purchase Windows EV certificate
2. [ ] Join Apple Developer Program
3. [ ] Set up certificates locally
4. [ ] Test signed builds
5. [ ] Configure CI/CD for automated signing
6. [ ] Update `.gitignore` to exclude sensitive files

