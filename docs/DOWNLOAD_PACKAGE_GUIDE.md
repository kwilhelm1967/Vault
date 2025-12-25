# Download Package Structure

This document describes how to set up the download packages that users receive after purchase or trial signup.

**⚠️ IMPORTANT:** Customer packages contain **ONLY** production builds and user documentation. **NO source code is included.** See `docs/PACKAGE_SECURITY_VERIFICATION.md` for verification details.

---

## Package Contents

Each download package should be a **ZIP file** containing:

```
LocalPasswordVault-Windows/
├── Local Password Vault Setup.exe    # The installer
├── README.txt                         # Quick start instructions
├── User Manual.pdf                    # Full user documentation
├── Quick Start Guide.pdf              # 1-page getting started
├── Privacy Policy.pdf                 # Legal - privacy
├── Terms of Service.pdf               # Legal - terms
└── License.txt                        # Software license
```

---

## Package Names by Platform

| Platform | Package Name | Contents |
|----------|--------------|----------|
| Windows | `LocalPasswordVault-Windows-v1.2.0.zip` | Setup.exe + docs |
| macOS | `LocalPasswordVault-macOS-v1.2.0.zip` | .dmg + docs |
| Linux | `LocalPasswordVault-Linux-v1.2.0.zip` | .AppImage + docs |

---

## Creating the Packages

### Step 1: Build the Installers

**Important:** The installers contain ONLY production builds. Source code is automatically excluded.

```bash
# From the project root
npm run dist:win    # Creates release/Local Password Vault-Setup-1.2.0.exe
npm run dist:mac    # Creates release/Local Password Vault-1.2.0.dmg
npm run dist:linux  # Creates release/Local Password Vault-1.2.0.AppImage
```

**What's Included in Installer:**
- ✅ Production build (`dist/` folder - minified, bundled JavaScript)
- ✅ Electron main process (`electron/` folder)
- ✅ Dependencies (`node_modules/`)
- ✅ Package metadata (`package.json`)

**What's EXCLUDED from Installer:**
- ❌ Source code (`src/` directory)
- ❌ Backend code (`backend/` directory)
- ❌ Documentation (`docs/` directory - added separately to ZIP)
- ❌ TypeScript files (`*.ts`, `*.tsx`)
- ❌ Configuration files (`*.config.*`)
- ❌ Test files (`__tests__/`)

**Verification:** See `docs/PACKAGE_SECURITY_VERIFICATION.md`

### Step 2: Generate PDF Documentation

Convert the markdown docs to PDF using a tool like `pandoc` or an online converter:

```bash
# Using pandoc (install first: https://pandoc.org/)
pandoc docs/USER_MANUAL.md -o "User Manual.pdf" --pdf-engine=wkhtmltopdf
pandoc docs/PRIVACY_POLICY.md -o "Privacy Policy.pdf" --pdf-engine=wkhtmltopdf
pandoc docs/TERMS_OF_SERVICE.md -o "Terms of Service.pdf" --pdf-engine=wkhtmltopdf
```

Or use online tools:
- https://www.markdowntopdf.com/
- https://dillinger.io/ (export to PDF)

### Step 3: Create README.txt

```text
===============================================
   LOCAL PASSWORD VAULT - QUICK START
===============================================

Thank you for choosing Local Password Vault!

INSTALLATION:
1. Run the installer (Setup.exe / .dmg / .AppImage)
2. Follow the on-screen prompts
3. When asked, enter your license key
4. Create your master password
5. Start adding your passwords!

YOUR LICENSE KEY:
(You received this in your purchase confirmation email)

NEED HELP?
- Read the User Manual.pdf included in this package
- Visit: https://localpasswordvault.com/help
- Email: support@localpasswordvault.com

IMPORTANT:
- Your master password CANNOT be recovered if lost
- Write down your recovery phrase and store it safely
- Your data is stored locally on YOUR device only

===============================================
   © 2024 Local Password Vault
   https://localpasswordvault.com
===============================================
```

### Step 4: Create Quick Start Guide

A simple 1-page PDF with:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              LOCAL PASSWORD VAULT                           │
│              Quick Start Guide                              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STEP 1: INSTALL                                            │
│  ─────────────────                                          │
│  Run the installer and follow the prompts.                  │
│                                                             │
│  STEP 2: ENTER LICENSE KEY                                  │
│  ─────────────────────────                                  │
│  Enter the license key from your email.                     │
│  Format: PERS-XXXX-XXXX-XXXX or FMLY-XXXX-XXXX-XXXX                          │
│                                                             │
│  STEP 3: CREATE MASTER PASSWORD                             │
│  ──────────────────────────────                             │
│  Choose a strong password you'll remember.                  │
│  This is the ONLY password you need to remember!            │
│                                                             │
│  STEP 4: SAVE RECOVERY PHRASE                               │
│  ────────────────────────────                               │
│  Write down your 12-word recovery phrase.                   │
│  Store it somewhere safe (not on your computer).            │
│                                                             │
│  STEP 5: START ADDING PASSWORDS                             │
│  ──────────────────────────────                             │
│  Click "+ Add Entry" to save your first password.           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TIPS:                                                      │
│  • Use the password generator for strong passwords          │
│  • Enable the floating icon for quick access                │
│  • Export backups regularly (Settings → Export)             │
│                                                             │
│  SUPPORT: support@localpasswordvault.com                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 5: Create License.txt

```text
LOCAL PASSWORD VAULT - SOFTWARE LICENSE

Copyright © 2024 Local Password Vault. All rights reserved.

This software is licensed, not sold. By installing or using this 
software, you agree to the following terms:

LICENSE GRANT:
- Personal Vault: Licensed for use on ONE (1) device
- Family Vault: Licensed for use on up to FIVE (5) devices

RESTRICTIONS:
- You may not redistribute, sell, or sublicense this software
- You may not reverse engineer or modify the software
- One license key = one device (Personal) or five devices (Family)

DATA OWNERSHIP:
- All data you store remains YOUR property
- Your data is stored locally on YOUR device only
- We have no access to your passwords or data

WARRANTY DISCLAIMER:
This software is provided "as is" without warranty of any kind.

For full terms, see Terms of Service.pdf or visit:
https://localpasswordvault.com/terms

Contact: support@localpasswordvault.com
```

### Step 6: Create ZIP Packages

**Windows (PowerShell):**
```powershell
# Create Windows package
$version = "1.2.0"
$packageDir = "LocalPasswordVault-Windows"

New-Item -ItemType Directory -Force -Path $packageDir
Copy-Item "release/Local Password Vault-Setup-$version.exe" "$packageDir/Local Password Vault Setup.exe"
Copy-Item "README.txt" $packageDir
Copy-Item "User Manual.pdf" $packageDir
Copy-Item "Quick Start Guide.pdf" $packageDir
Copy-Item "Privacy Policy.pdf" $packageDir
Copy-Item "Terms of Service.pdf" $packageDir
Copy-Item "License.txt" $packageDir

Compress-Archive -Path $packageDir -DestinationPath "LocalPasswordVault-Windows-v$version.zip" -Force
Remove-Item -Recurse -Force $packageDir
```

**macOS/Linux (Bash):**
```bash
#!/bin/bash
VERSION="1.2.0"

# Windows package
mkdir -p LocalPasswordVault-Windows
cp "release/Local Password Vault-Setup-$VERSION.exe" "LocalPasswordVault-Windows/Local Password Vault Setup.exe"
cp README.txt User\ Manual.pdf Quick\ Start\ Guide.pdf Privacy\ Policy.pdf Terms\ of\ Service.pdf License.txt LocalPasswordVault-Windows/
zip -r "LocalPasswordVault-Windows-v$VERSION.zip" LocalPasswordVault-Windows
rm -rf LocalPasswordVault-Windows

# macOS package
mkdir -p LocalPasswordVault-macOS
cp "release/Local Password Vault-$VERSION.dmg" "LocalPasswordVault-macOS/Local Password Vault.dmg"
cp README.txt User\ Manual.pdf Quick\ Start\ Guide.pdf Privacy\ Policy.pdf Terms\ of\ Service.pdf License.txt LocalPasswordVault-macOS/
zip -r "LocalPasswordVault-macOS-v$VERSION.zip" LocalPasswordVault-macOS
rm -rf LocalPasswordVault-macOS

# Linux package
mkdir -p LocalPasswordVault-Linux
cp "release/Local Password Vault-$VERSION.AppImage" "LocalPasswordVault-Linux/Local Password Vault.AppImage"
cp README.txt User\ Manual.pdf Quick\ Start\ Guide.pdf Privacy\ Policy.pdf Terms\ of\ Service.pdf License.txt LocalPasswordVault-Linux/
zip -r "LocalPasswordVault-Linux-v$VERSION.zip" LocalPasswordVault-Linux
rm -rf LocalPasswordVault-Linux
```

---

## Hosting the Downloads

### Option 1: GitHub Releases (Recommended)

1. Go to your GitHub repo → Releases
2. Create a new release (e.g., v1.2.0)
3. Upload all three ZIP packages
4. Download URLs will be:
   - `https://github.com/kwilhelm1967/Vault/releases/download/v1.2.0/LocalPasswordVault-Windows-v1.2.0.zip`
   - `https://github.com/kwilhelm1967/Vault/releases/download/v1.2.0/LocalPasswordVault-macOS-v1.2.0.zip`
   - `https://github.com/kwilhelm1967/Vault/releases/download/v1.2.0/LocalPasswordVault-Linux-v1.2.0.zip`

### Option 2: Your Web Server

Upload to your website and create download routes:
- `https://localpasswordvault.com/download/windows` → Redirect to ZIP
- `https://localpasswordvault.com/download/macos` → Redirect to ZIP
- `https://localpasswordvault.com/download/linux` → Redirect to ZIP

### Option 3: Cloud Storage (S3, Linode Object Storage)

Upload ZIPs to cloud storage and serve via CDN.

---

## Download Page Implementation

Create a download page on your website that:

1. **Detects OS automatically** and highlights the right download
2. **Shows package contents** so users know what they're getting
3. **Provides direct links** to all three platforms

Example HTML:

```html
<div class="download-section">
  <h2>Download Local Password Vault</h2>
  <p>Your complete package includes:</p>
  <ul>
    <li>✓ Installer for your operating system</li>
    <li>✓ User Manual (PDF)</li>
    <li>✓ Quick Start Guide</li>
    <li>✓ Privacy Policy & Terms of Service</li>
  </ul>
  
  <div class="download-buttons">
    <a href="/download/windows" class="btn-download">
      <span class="icon">⊞</span>
      <span class="label">Windows</span>
      <span class="size">~85 MB</span>
    </a>
    <a href="/download/macos" class="btn-download">
      <span class="icon"></span>
      <span class="label">macOS</span>
      <span class="size">~90 MB</span>
    </a>
    <a href="/download/linux" class="btn-download">
      <span class="icon">🐧</span>
      <span class="label">Linux</span>
      <span class="size">~80 MB</span>
    </a>
  </div>
  
  <p class="note">
    After downloading, unzip the package and run the installer.
    You'll need your license key (check your email).
  </p>
</div>
```

---

## Automated Package Creation Script

Save this as `scripts/create-packages.sh`:

```bash
#!/bin/bash
set -e

VERSION=$(node -p "require('./package.json').version")
RELEASE_DIR="release"
PACKAGES_DIR="packages"
DOCS_DIR="package-docs"

echo "Creating packages for version $VERSION..."

# Create docs directory
mkdir -p $DOCS_DIR

# Generate PDFs (requires pandoc)
echo "Generating PDF documentation..."
pandoc docs/USER_MANUAL.md -o "$DOCS_DIR/User Manual.pdf" --pdf-engine=wkhtmltopdf 2>/dev/null || echo "Warning: Could not generate User Manual PDF"
pandoc docs/PRIVACY_POLICY.md -o "$DOCS_DIR/Privacy Policy.pdf" --pdf-engine=wkhtmltopdf 2>/dev/null || echo "Warning: Could not generate Privacy Policy PDF"
pandoc docs/TERMS_OF_SERVICE.md -o "$DOCS_DIR/Terms of Service.pdf" --pdf-engine=wkhtmltopdf 2>/dev/null || echo "Warning: Could not generate Terms of Service PDF"

# Create README.txt
cat > "$DOCS_DIR/README.txt" << 'EOF'
===============================================
   LOCAL PASSWORD VAULT - QUICK START
===============================================

Thank you for choosing Local Password Vault!

INSTALLATION:
1. Run the installer
2. Enter your license key when prompted
3. Create your master password
4. Start adding your passwords!

NEED HELP?
- Read the User Manual.pdf
- Visit: https://localpasswordvault.com/help
- Email: support@localpasswordvault.com

© 2024 Local Password Vault
===============================================
EOF

# Create License.txt
cat > "$DOCS_DIR/License.txt" << 'EOF'
LOCAL PASSWORD VAULT - SOFTWARE LICENSE
Copyright © 2024 Local Password Vault. All rights reserved.

This software is licensed for personal use only.
See Terms of Service.pdf for full terms.
EOF

# Create packages directory
mkdir -p $PACKAGES_DIR

# Windows package
if [ -f "$RELEASE_DIR/Local Password Vault-Setup-$VERSION.exe" ]; then
  echo "Creating Windows package..."
  mkdir -p "LocalPasswordVault-Windows"
  cp "$RELEASE_DIR/Local Password Vault-Setup-$VERSION.exe" "LocalPasswordVault-Windows/Local Password Vault Setup.exe"
  cp $DOCS_DIR/* "LocalPasswordVault-Windows/"
  zip -r "$PACKAGES_DIR/LocalPasswordVault-Windows-v$VERSION.zip" "LocalPasswordVault-Windows"
  rm -rf "LocalPasswordVault-Windows"
fi

# macOS package
if [ -f "$RELEASE_DIR/Local Password Vault-$VERSION.dmg" ]; then
  echo "Creating macOS package..."
  mkdir -p "LocalPasswordVault-macOS"
  cp "$RELEASE_DIR/Local Password Vault-$VERSION.dmg" "LocalPasswordVault-macOS/Local Password Vault.dmg"
  cp $DOCS_DIR/* "LocalPasswordVault-macOS/"
  zip -r "$PACKAGES_DIR/LocalPasswordVault-macOS-v$VERSION.zip" "LocalPasswordVault-macOS"
  rm -rf "LocalPasswordVault-macOS"
fi

# Linux package
if [ -f "$RELEASE_DIR/Local Password Vault-$VERSION.AppImage" ]; then
  echo "Creating Linux package..."
  mkdir -p "LocalPasswordVault-Linux"
  cp "$RELEASE_DIR/Local Password Vault-$VERSION.AppImage" "LocalPasswordVault-Linux/Local Password Vault.AppImage"
  chmod +x "LocalPasswordVault-Linux/Local Password Vault.AppImage"
  cp $DOCS_DIR/* "LocalPasswordVault-Linux/"
  zip -r "$PACKAGES_DIR/LocalPasswordVault-Linux-v$VERSION.zip" "LocalPasswordVault-Linux"
  rm -rf "LocalPasswordVault-Linux"
fi

# Cleanup
rm -rf $DOCS_DIR

echo ""
echo "✅ Packages created in $PACKAGES_DIR/"
ls -la $PACKAGES_DIR/
```

Make it executable:
```bash
chmod +x scripts/create-packages.sh
```

Run after building:
```bash
npm run dist:all
./scripts/create-packages.sh
```

---

## Summary

**What the user downloads:** A ZIP file containing:
1. ✅ Installer (.exe / .dmg / .AppImage) - **Production build only, NO source code**
2. ✅ README.txt (quick start)
3. ✅ User Manual.pdf
4. ✅ Quick Start Guide.pdf
5. ✅ Privacy Policy.pdf
6. ✅ Terms of Service.pdf
7. ✅ License.txt

**What the user does NOT get:**
- ❌ Source code (`src/` directory)
- ❌ Backend code (`backend/` directory)
- ❌ TypeScript files (`*.ts`, `*.tsx`)
- ❌ Configuration files
- ❌ Test files
- ❌ Development files

**User experience:**
1. User purchases or starts trial
2. Receives email with license key + download links
3. Downloads ZIP for their OS
4. Unzips to find installer + all documentation
5. Runs installer, enters license key
6. Ready to use!

**Security Verification:** See `docs/PACKAGE_SECURITY_VERIFICATION.md` for complete verification that no source code is included.

---

*Last Updated: December 3, 2024*

