# Code Signing Setup - Quick Start

**Purpose:** Configure code signing for Windows and/or macOS installers using your existing certificate.

---

## What Type of Certificate Do You Have?

Please provide:
1. **Platform:** Windows (.pfx), macOS (.p12), or both?
2. **Certificate file location:** Where is the certificate file stored?
3. **Certificate password:** Do you have the password for the certificate?

---

## Windows Code Signing Setup

### Step 1: Place Certificate File

**Option A: Local File (Recommended for Development)**
1. Create `certs/` directory (already exists, already in .gitignore)
2. Place your `.pfx` file in `certs/`:
   ```
   certs/
   └── windows-code-signing.pfx
   ```

**Option B: Environment Variable (Recommended for CI/CD)**
- Store certificate as base64-encoded string in environment variable
- Or use file path in environment variable

### Step 2: Create Environment File

Create `.env` file in project root (already in .gitignore):

```env
# Windows Code Signing
CSC_LINK=certs/windows-code-signing.pfx
CSC_KEY_PASSWORD=your_certificate_password_here
```

**OR** if certificate is in different location:
```env
CSC_LINK=C:/path/to/your/certificate.pfx
CSC_KEY_PASSWORD=your_certificate_password_here
```

### Step 3: Update electron-builder.json

The configuration will automatically use the environment variables. No changes needed to `electron-builder.json` - it will detect `CSC_LINK` and `CSC_KEY_PASSWORD` automatically.

### Step 4: Build Signed Installer

```bash
npm run dist:win
```

The installer will be automatically signed.

### Step 5: Verify Signature

**Windows (PowerShell):**
```powershell
signtool verify /pa "release/Local Password Vault Setup 1.2.0.exe"
```

**Or check properties:**
- Right-click installer → Properties → Digital Signatures tab
- Should show your certificate name

---

## macOS Code Signing Setup

### Step 1: Install Certificate

1. **If you have a .p12 file:**
   - Double-click the `.p12` file
   - Enter the password when prompted
   - Certificate will be added to Keychain

2. **If you have a certificate from Apple Developer:**
   - Download from https://developer.apple.com/account/resources/certificates/list
   - Double-click to install to Keychain

### Step 2: Find Your Certificate Identity

**Open Terminal and run:**
```bash
security find-identity -v -p codesigning
```

**Look for output like:**
```
1) ABC1234567890ABCDEF1234567890ABCDEF1234 "Developer ID Application: Your Name (TEAM_ID)"
```

**Copy the identity** (the part in quotes after the hash).

### Step 3: Create Environment File

Add to `.env` file:

```env
# macOS Code Signing
APPLE_ID=your@email.com
APPLE_ID_PASSWORD=app-specific-password  # NOT your Apple ID password!
APPLE_TEAM_ID=YOUR_TEAM_ID
CSC_LINK=certs/macos-code-signing.p12  # Optional if using Keychain
CSC_KEY_PASSWORD=your_certificate_password  # Optional if using Keychain
```

**Get App-Specific Password:**
1. Go to https://appleid.apple.com
2. Sign in → App-Specific Passwords
3. Generate new password for "electron-builder"
4. Use this password (NOT your Apple ID password)

**Get Team ID:**
1. Go to https://developer.apple.com/account
2. Team ID is shown in top right corner

### Step 4: Update electron-builder.json

Add identity to `mac` section:

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

### Step 5: Build Signed & Notarized App

```bash
npm run dist:mac
```

This will:
1. Sign the app with your certificate
2. Notarize with Apple (requires internet)
3. Staple the notarization ticket

### Step 6: Verify Signature

```bash
# Check code signature
codesign -dv --verbose=4 "release/Local Password Vault.app"

# Verify notarization
spctl -a -vvv -t install "release/Local Password Vault.app"

# Check notarization status
xcrun stapler validate "release/Local Password Vault.dmg"
```

---

## Security Best Practices

### ✅ DO:
- ✅ Store certificates in `certs/` folder (already in .gitignore)
- ✅ Use environment variables for passwords
- ✅ Never commit certificates to git
- ✅ Use app-specific passwords for macOS (not Apple ID password)
- ✅ Keep certificates backed up securely

### ❌ DON'T:
- ❌ Commit `.pfx` or `.p12` files to git
- ❌ Hardcode passwords in code
- ❌ Share certificates via email or chat
- ❌ Use Apple ID password directly (use app-specific password)

---

## Environment Variables Reference

### Windows
```env
CSC_LINK=path/to/certificate.pfx
CSC_KEY_PASSWORD=your_password
```

### macOS
```env
APPLE_ID=your@email.com
APPLE_ID_PASSWORD=app-specific-password
APPLE_TEAM_ID=YOUR_TEAM_ID
CSC_LINK=path/to/certificate.p12  # Optional
CSC_KEY_PASSWORD=your_password     # Optional
```

### Both (if you have both certificates)
```env
# Windows
CSC_LINK=certs/windows-code-signing.pfx
CSC_KEY_PASSWORD=windows_password

# macOS
APPLE_ID=your@email.com
APPLE_ID_PASSWORD=app-specific-password
APPLE_TEAM_ID=YOUR_TEAM_ID
```

---

## Troubleshooting

### Windows: "Certificate not found"
- Check `CSC_LINK` path is correct
- Verify `.pfx` file exists
- Check password is correct

### Windows: "SignTool Error"
- Install Windows SDK (includes signtool)
- Or use electron-builder's built-in signing

### macOS: "No identity found"
- Run: `security find-identity -v -p codesigning`
- Verify identity matches what's in `electron-builder.json`
- Check certificate is in Keychain

### macOS: "Notarization failed"
- Check `APPLE_ID_PASSWORD` is app-specific password (not Apple ID password)
- Verify `APPLE_TEAM_ID` is correct
- Check internet connection (notarization requires internet)

---

## Next Steps

1. **Tell me:**
   - What type of certificate(s) you have (Windows .pfx, macOS .p12, or both)
   - Where the certificate file(s) are located
   - If you have the password(s)

2. **I will:**
   - Update `electron-builder.json` with your certificate identity (macOS)
   - Create `.env.example` with placeholders
   - Update build scripts if needed
   - Provide specific instructions for your setup

---

**Last Updated:** Latest  
**Status:** Ready to configure once certificate details provided

