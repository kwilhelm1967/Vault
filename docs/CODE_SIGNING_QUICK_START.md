# Code Signing Quick Start

**Purpose:** Get code signing working quickly for Windows (SSL.com) and macOS (Apple Developer).

---

## Windows Code Signing (SSL.com)

### Step 1: Download Certificate

1. **Log in to SSL.com:**
   - Go to: https://www.ssl.com/account/
   - Navigate to: My Certificates → Code Signing Certificates

2. **Download Certificate:**
   - Click "Download" or "Export"
   - Choose format: **PKCS#12 (.pfx)** or **PFX**
   - Save file (e.g., `windows-code-signing.pfx`)
   - **Save the password** provided by SSL.com

### Step 2: Place Certificate

1. **Copy certificate to project:**
   ```
   certs/
   └── windows-code-signing.pfx
   ```

2. **Verify it's ignored by git:**
   - ✅ Already configured in `.gitignore`
   - Certificate won't be committed

### Step 3: Configure Environment

1. **Create `.env` file** in project root:
   ```bash
   # Copy template (or create manually)
   # See docs/env.template for reference
   ```

2. **Edit `.env` file:**
   ```env
   CSC_LINK=certs/windows-code-signing.pfx
   CSC_KEY_PASSWORD=your_ssl_com_password_here
   ```

3. **Replace:**
   - `windows-code-signing.pfx` with your actual filename
   - `your_ssl_com_password_here` with password from SSL.com

### Step 4: Build & Test

```bash
npm run dist:win
```

**Verify signature:**
- Right-click installer → Properties → Digital Signatures tab
- Should show your SSL.com certificate name

---

## macOS Code Signing (Apple Developer)

### Step 1: Get Certificate Identity

1. **Install certificate to Keychain:**
   - Download from: https://developer.apple.com/account/resources/certificates/list
   - Double-click `.cer` file to install to Keychain

2. **Find your identity:**
   ```bash
   security find-identity -v -p codesigning
   ```

3. **Look for output like:**
   ```
   1) ABC123... "Developer ID Application: Your Name (TEAM_ID)"
   ```

4. **Copy the identity** (the part in quotes)

### Step 2: Get App-Specific Password

1. **Go to:** https://appleid.apple.com
2. **Sign in** → **App-Specific Passwords**
3. **Generate new password** for "electron-builder"
4. **Copy the password** (you'll only see it once)

### Step 3: Configure Environment

1. **Edit `.env` file:**
   ```env
   APPLE_ID=your@email.com
   APPLE_ID_PASSWORD=app-specific-password-from-step-2
   APPLE_TEAM_ID=YOUR_TEAM_ID
   ```

2. **Update `electron-builder.json`:**
   - Open `electron-builder.json`
   - Find the `mac` section
   - Add (if not already there):
   ```json
   "identity": "Developer ID Application: Your Name (TEAM_ID)",
   ```
   - Replace with your actual identity from Step 1

### Step 4: Build & Test

```bash
npm run dist:mac
```

**This will:**
- Sign the app
- Notarize with Apple (requires internet)
- Staple notarization ticket

**Verify:**
```bash
codesign -dv --verbose=4 "release/Local Password Vault.app"
spctl -a -vvv -t install "release/Local Password Vault.app"
```

---

## Complete .env File Example

```env
# Windows Code Signing (SSL.com)
CSC_LINK=certs/windows-code-signing.pfx
CSC_KEY_PASSWORD=your_ssl_com_password

# macOS Code Signing (Apple Developer)
APPLE_ID=your@email.com
APPLE_ID_PASSWORD=app-specific-password
APPLE_TEAM_ID=YOUR_TEAM_ID
```

---

## Verification Checklist

### Windows
- [ ] Certificate downloaded from SSL.com
- [ ] Certificate placed in `certs/` folder
- [ ] `.env` file created with `CSC_LINK` and `CSC_KEY_PASSWORD`
- [ ] Build successful: `npm run dist:win`
- [ ] Installer shows digital signature in Properties

### macOS
- [ ] Certificate installed to Keychain
- [ ] Identity found: `security find-identity -v -p codesigning`
- [ ] App-specific password created
- [ ] `.env` file has `APPLE_ID`, `APPLE_ID_PASSWORD`, `APPLE_TEAM_ID`
- [ ] `electron-builder.json` has identity in `mac` section
- [ ] Build successful: `npm run dist:mac`
- [ ] App notarized and verified

---

## Troubleshooting

### Windows: "Certificate not found"
- Check `.env` file exists
- Verify `CSC_LINK` path is correct
- Check certificate file exists in `certs/` folder

### macOS: "No identity found"
- Run: `security find-identity -v -p codesigning`
- Verify identity matches what's in `electron-builder.json`
- Check certificate is in Keychain

### macOS: "Notarization failed"
- Verify `APPLE_ID_PASSWORD` is app-specific password (not Apple ID password)
- Check `APPLE_TEAM_ID` is correct
- Ensure internet connection (notarization requires internet)

---

## Next Steps

1. **Download Windows certificate from SSL.com** → Place in `certs/` folder
2. **Create `.env` file** → Add Windows certificate path and password
3. **Test Windows build:** `npm run dist:win`
4. **Configure macOS** (if needed) → Add Apple Developer credentials to `.env`
5. **Test macOS build:** `npm run dist:mac`

---

**Last Updated:** Latest  
**Status:** Ready to configure

