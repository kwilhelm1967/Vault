# Distribution Checklist - Quick Reference

## ✅ Pre-Build Checklist

- [ ] Version number updated in `package.json`
- [ ] All tests passing (`npm test`)
- [ ] LICENSE file exists in root directory (required for NSIS installer)
- [ ] Icons are present: `assets/icons/icon.ico` (Windows), `assets/icons/icon.icns` (macOS)
- [ ] Production environment variables set (if needed)

## 🏗️ Build Steps

### 1. Clean Previous Builds
```bash
rm -rf dist release
```

### 2. Build Production Bundle
```bash
npm run build:prod
```
**Result:** Creates optimized production files in `dist/` (NO source code)

### 3. Build Installer for Target OS

**Windows:**
```bash
npm run dist:win
```
**Output:** `release/Local Password Vault Setup 1.2.0-x64.exe`

**macOS:**
```bash
npm run dist:mac
```
**Output:** `release/Local Password Vault-1.2.0-mac.dmg`

**Linux:**
```bash
npm run dist:linux
```
**Output:** `release/Local Password Vault-1.2.0.AppImage`

**All Platforms:**
```bash
npm run dist:all
```

## ✅ Post-Build Verification

### Verify No Source Code
```bash
# Should return nothing (empty)
find release -name "*.ts" -o -name "*.tsx" | grep -v node_modules

# Should return nothing (empty)  
find dist -name "*.ts" -o -name "*.tsx"
```

### Verify Installer Works
- [ ] Installer runs without errors
- [ ] Application launches after installation
- [ ] No source files visible in installation directory
- [ ] LICENSE shown during installation (Windows)

## 📦 What's Included in Installer

✅ **Included:**
- Compiled JavaScript (from `dist/`)
- Electron runtime files
- Required dependencies (from `node_modules/`)
- Application icons
- LICENSE file (shown during install)

❌ **Excluded (automatically):**
- TypeScript source files (`.ts`, `.tsx`)
- Test files (`__tests__/`, `*.test.*`)
- Developer documentation (`docs/`)
- Backend code (`backend/`)
- Configuration files (`.config.*`)
- Environment files (`.env*`)
- Git files (`.git/`)
- CI files (`.github/`)

## 📄 User Documentation (Optional)

To include user documentation with the installer:

1. **Create user docs folder:**
   ```bash
   mkdir -p user-docs
   cp docs/QUICK_START_GUIDE.md user-docs/
   cp docs/USER_MANUAL.md user-docs/
   cp docs/TROUBLESHOOTING_GUIDE.md user-docs/
   ```

2. **Bundle with installer:**
   - Copy installer and docs to a distribution folder
   - Create a README.txt explaining what each file is
   - Zip together for distribution

## 🚀 Distribution

### Option 1: GitHub Releases (Automated)
```bash
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0
```
GitHub Actions will automatically build and upload installers.

### Option 2: Manual Upload
1. Upload `.exe` (Windows), `.dmg` (macOS), or `.AppImage` (Linux) to your website
2. Provide download links
3. Optionally include user documentation as separate downloads

## ⚠️ Important Notes

1. **Source code is automatically excluded** - The `electron-builder.json` configuration already excludes all source files
2. **No manual file filtering needed** - electron-builder handles exclusions automatically
3. **LICENSE file required** - Must exist in root for NSIS installer to show license during installation
4. **Test on clean system** - Always test installers on a clean VM/system before distribution


