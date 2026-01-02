# Building Distributable Installers - Developer Guide

This guide explains how to create production-ready installers that contain **NO source code** and include all necessary user documentation.

---

## Prerequisites

1. **Node.js 20+** installed
2. **All dependencies** installed: `npm ci`
3. **Build assets** ready (icons, etc.)
4. **Clean build environment** (no test files, no source maps in production)

---

## Step 1: Prepare User Documentation

### Required Documents for Users

The installer should include these user-facing documents:

1. **Quick Start Guide** - `docs/QUICK_START_GUIDE.md`
2. **User Manual** - `docs/USER_MANUAL.md`
3. **Troubleshooting Guide** - `docs/TROUBLESHOOTING_GUIDE.md`
4. **License Agreement** - `LICENSE` (already configured in electron-builder.json)
5. **Privacy Policy** - `docs/PRIVACY_POLICY.md` (optional but recommended)

### Create User Documentation Package

Create a `user-docs` folder with only user-facing documentation:

```bash
mkdir -p user-docs
cp docs/QUICK_START_GUIDE.md user-docs/
cp docs/USER_MANUAL.md user-docs/
cp docs/TROUBLESHOOTING_GUIDE.md user-docs/
cp docs/PRIVACY_POLICY.md user-docs/  # Optional
cp LICENSE user-docs/  # Required
```

---

## Step 2: Verify Source Code Exclusion

The `electron-builder.json` already excludes source code:

```json
"files": [
  "dist/**/*",           // ✅ Compiled output only
  "electron/**/*",       // ✅ Electron runtime files
  "node_modules/**/*",   // ✅ Dependencies
  "package.json",        // ✅ Package metadata
  "!src/**/*",           // ❌ Source code excluded
  "!backend/**/*",       // ❌ Backend code excluded
  "!docs/**/*",          // ❌ Developer docs excluded
  "!*.ts",               // ❌ TypeScript source excluded
  "!*.tsx",              // ❌ React source excluded
  "!*.config.*",         // ❌ Config files excluded
  "!__tests__/**/*",     // ❌ Test files excluded
  "!.env*",              // ❌ Environment files excluded
  "!.git/**/*",          // ❌ Git files excluded
  "!.github/**/*"        // ❌ CI files excluded
]
```

**✅ Source code is already properly excluded**

---

## Step 3: Build Production Bundle

### Clean Build (Recommended)

```bash
# Clean previous builds
rm -rf dist release

# Build production bundle (no source maps, minified)
npm run build:prod
```

This creates optimized production files in `dist/` with:
- ✅ Minified JavaScript
- ✅ Optimized assets
- ✅ No source maps
- ✅ No TypeScript source files

---

## Step 4: Build Platform-Specific Installers

### Windows (.exe Installer)

```bash
npm run dist:win
```

**Output:**
- `release/Local Password Vault Setup 1.2.0-x64.exe` - Main installer
- `release/Local Password Vault Setup 1.2.0-ia32.exe` - 32-bit installer
- `release/Local Password Vault-1.2.0-Portable-x64.exe` - Portable version

**What's included:**
- ✅ Compiled application (no source code)
- ✅ Electron runtime
- ✅ Required dependencies
- ✅ LICENSE file (shown during installation)
- ✅ Application icons

**What's NOT included:**
- ❌ TypeScript source files (.ts, .tsx)
- ❌ Test files
- ❌ Developer documentation
- ❌ Backend code
- ❌ Configuration files
- ❌ Git history

### macOS (.dmg)

```bash
npm run dist:mac
```

**Output:**
- `release/Local Password Vault-1.2.0-mac.dmg` - Disk image
- `release/Local Password Vault-1.2.0-mac.zip` - Zip archive

### Linux (.AppImage / .deb)

```bash
npm run dist:linux
```

**Output:**
- `release/Local Password Vault-1.2.0.AppImage` - AppImage
- `release/Local Password Vault-1.2.0-linux-x64.deb` - Debian package

### All Platforms

```bash
npm run dist:all
```

Builds installers for Windows, macOS, and Linux.

---

## Step 5: Include User Documentation (Optional Enhancement)

To include user documentation in the installer, you can:

### Option A: Include in Application Package

Modify `electron-builder.json` to include user docs:

```json
"files": [
  "dist/**/*",
  "electron/**/*",
  "node_modules/**/*",
  "package.json",
  "user-docs/**/*",  // Add this line
  "!src/**/*",
  // ... rest of exclusions
]
```

Then users can access docs from: `%APPDATA%/Local Password Vault/user-docs/` (Windows)

### Option B: Bundle with Installer (Recommended)

Include documentation as separate files alongside the installer:

1. Create a `release-package` folder:
```bash
mkdir -p release-package
```

2. Copy installer and documentation:
```bash
# Windows
cp "release/Local Password Vault Setup 1.2.0-x64.exe" release-package/
cp user-docs/*.md release-package/
cp LICENSE release-package/

# macOS
cp "release/Local Password Vault-1.2.0-mac.dmg" release-package/
cp user-docs/*.md release-package/

# Linux
cp "release/Local Password Vault-1.2.0.AppImage" release-package/
cp user-docs/*.md release-package/
```

3. Create a README for the package:
```bash
cat > release-package/README.txt << 'EOF'
Local Password Vault - Installation Package
===========================================

INSTALLER:
- Windows: Run "Local Password Vault Setup 1.2.0-x64.exe"
- macOS: Open "Local Password Vault-1.2.0-mac.dmg" and drag to Applications
- Linux: Make executable (chmod +x) then run the .AppImage

DOCUMENTATION:
- QUICK_START_GUIDE.md - Get started in 5 minutes
- USER_MANUAL.md - Complete user guide
- TROUBLESHOOTING_GUIDE.md - Common issues and solutions
- LICENSE - Software license agreement

SUPPORT:
- Website: https://localpasswordvault.com
- Email: support@localpasswordvault.com
EOF
```

---

## Step 6: Verify No Source Code Leakage

### Quick Verification

```bash
# Check that no .ts or .tsx files are in the release
find release -name "*.ts" -o -name "*.tsx" | grep -v node_modules

# Should return nothing (empty)

# Check that no source files are in dist
find dist -name "*.ts" -o -name "*.tsx"

# Should return nothing (empty)

# Verify only compiled JavaScript exists
find dist -name "*.js" | head -5

# Should show only .js files (compiled output)
```

### Detailed Verification

```bash
# List all files in the installer (extract and check)
# For Windows NSIS installer, you can use 7-Zip to extract and inspect
# For macOS DMG, mount and inspect contents
# For Linux AppImage, extract: ./LocalPasswordVault.AppImage --appimage-extract
```

---

## Step 7: Test the Installer

### Windows Testing

1. **Install on clean VM** (recommended)
2. **Verify installation:**
   - Installer runs without errors
   - Application launches correctly
   - No source files visible in installation directory
   - LICENSE is shown during installation

3. **Check installation location:**
   ```
   C:\Users\[Username]\AppData\Local\Programs\Local Password Vault\
   ```
   - Should contain only: `.exe`, `.dll`, resources, no `.ts` files

### macOS Testing

1. **Test on clean macOS system**
2. **Verify:**
   - DMG mounts correctly
   - Application can be dragged to Applications
   - Application launches
   - Gatekeeper doesn't block (if code signed)

### Linux Testing

1. **Test on clean Linux system**
2. **Verify:**
   - AppImage is executable
   - Application launches
   - No source files in extracted AppImage

---

## Step 8: Create Distribution Package

### For GitHub Releases

1. **Tag the release:**
   ```bash
   git tag -a v1.2.0 -m "Release version 1.2.0"
   git push origin v1.2.0
   ```

2. **GitHub Actions will automatically:**
   - Build installers for all platforms
   - Upload to GitHub Releases
   - Attach installers as release assets

### For Manual Distribution

1. **Create distribution archive:**
   ```bash
   # Windows
   cd release-package
   zip -r ../LocalPasswordVault-1.2.0-Windows.zip .
   
   # macOS
   zip -r ../LocalPasswordVault-1.2.0-macOS.zip .
   
   # Linux
   zip -r ../LocalPasswordVault-1.2.0-Linux.zip .
   ```

2. **Upload to distribution platform:**
   - Your website
   - File hosting service
   - Direct download links

---

## Checklist Before Distribution

- [ ] Source code excluded (no .ts, .tsx files in release)
- [ ] Production build completed (`npm run build:prod`)
- [ ] Installers built for target platforms
- [ ] Installers tested on clean systems
- [ ] LICENSE file included
- [ ] User documentation prepared (optional but recommended)
- [ ] Application icons included
- [ ] Version number correct in package.json
- [ ] No test files in release
- [ ] No developer documentation in release
- [ ] No .env files in release
- [ ] No .git files in release

---

## Troubleshooting

### Issue: Source files appearing in installer

**Solution:**
1. Verify `electron-builder.json` exclusions are correct
2. Clean build: `rm -rf dist release`
3. Rebuild: `npm run build:prod && npm run dist:win`

### Issue: Installer is too large

**Solution:**
1. Check `compression: "maximum"` in electron-builder.json
2. Verify `asar: true` (packages files into archive)
3. Remove unnecessary dependencies from package.json

### Issue: Documentation not accessible

**Solution:**
1. Include docs in `files` array in electron-builder.json
2. Or bundle docs separately with installer
3. Or host docs online and link from application

---

## Security Best Practices

1. **Never include:**
   - API keys or secrets
   - `.env` files
   - Source code
   - Test credentials
   - Developer tools

2. **Always verify:**
   - No secrets in compiled code (grep for keys)
   - No source maps in production build
   - No debug code enabled

3. **Code signing (recommended):**
   - Sign Windows installers with code signing certificate
   - Sign macOS apps with Apple Developer certificate
   - Improves trust and security

---

## Summary

**To create a distributable installer with NO source code:**

1. ✅ Run `npm run build:prod` (creates optimized production build)
2. ✅ Run `npm run dist:win` (or `dist:mac`, `dist:linux`)
3. ✅ Verify no source files in `release/` folder
4. ✅ Test installer on clean system
5. ✅ Distribute the `.exe` (Windows), `.dmg` (macOS), or `.AppImage` (Linux)

**The electron-builder configuration already excludes all source code automatically.**


