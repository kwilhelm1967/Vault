# Download Setup - What's Required

## ✅ Current Status

**Download Links Are Configured:**
- ✅ Website has download buttons for Windows, macOS, and Linux
- ✅ Links point to GitHub Releases
- ✅ Code is ready to handle downloads

**But Downloads Will Only Work IF:**

---

## 🔧 Required Steps for Downloads to Work

### 1. Build the Installers

You need to build the installers for each platform:

**Windows:**
```bash
npm run dist:win
```
Creates: `release/Local Password Vault Setup 1.2.0-x64.exe`

**macOS:**
```bash
npm run dist:mac
```
Creates: `release/Local Password Vault-1.2.0-mac.dmg`

**Linux:**
```bash
npm run dist:linux
```
Creates: `release/Local Password Vault-1.2.0.AppImage`

**All Platforms:**
```bash
npm run dist:all
```

---

### 2. Create a GitHub Release

The download links point to:
- `https://github.com/kwilhelm1967/Vault/releases/latest/download/[filename]`

**You need to:**

1. **Go to GitHub:** https://github.com/kwilhelm1967/Vault/releases
2. **Click "Draft a new release"**
3. **Create a tag:** `v1.2.0` (or your version number)
4. **Upload the installer files** from the `release/` directory:
   - `Local Password Vault Setup 1.2.0-x64.exe` (Windows)
   - `Local Password Vault-1.2.0-mac.dmg` (macOS)
   - `Local Password Vault-1.2.0.AppImage` (Linux)
5. **Publish the release**

**OR use automated release:**
```bash
npm run release
```
This will build and automatically publish to GitHub (if configured).

---

### 3. Verify Filenames Match

The code expects these exact filenames:

**Windows:**
- `Local Password Vault-Setup-1.2.0.exe` (URL-encoded: `Local%20Password%20Vault-Setup-1.2.0.exe`)

**macOS:**
- `Local Password Vault-1.2.0-mac.dmg` (URL-encoded: `Local%20Password%20Vault-1.2.0-mac.dmg`)

**Linux:**
- `Local Password Vault-1.2.0.AppImage` (URL-encoded: `Local%20Password%20Vault-1.2.0.AppImage`)

**Important:** The actual filenames in GitHub must match these (or update the code to match your filenames).

---

## ❌ What Happens If Not Set Up

**If installers aren't built and uploaded:**
- ❌ Clicking download buttons will show a 404 error
- ❌ Users will get "File not found" from GitHub
- ❌ Downloads won't work

**If filenames don't match:**
- ❌ Links will point to wrong files
- ❌ Downloads will fail or download wrong files

---

## ✅ What Happens When Properly Set Up

**When installers are built and uploaded:**
- ✅ Clicking "Download for Windows" downloads the `.exe` file
- ✅ Clicking "Download for macOS" downloads the `.dmg` file
- ✅ Clicking "Download for Linux" downloads the `.AppImage` file
- ✅ Downloads work immediately from GitHub Releases
- ✅ Users can install and use the app

---

## 🚀 Quick Setup Guide

### Option 1: Manual Build & Upload

1. **Build installers:**
   ```bash
   npm run dist:all
   ```

2. **Go to GitHub Releases:**
   - https://github.com/kwilhelm1967/Vault/releases
   - Click "Draft a new release"
   - Tag: `v1.2.0`
   - Upload files from `release/` directory
   - Publish

3. **Test downloads:**
   - Visit your website
   - Click download buttons
   - Verify files download

### Option 2: Automated (GitHub Actions)

If you have GitHub Actions set up:
1. **Create a git tag:**
   ```bash
   git tag v1.2.0
   git push origin v1.2.0
   ```

2. **GitHub Actions will:**
   - Build installers automatically
   - Create GitHub Release
   - Upload installers
   - Downloads will work immediately

---

## 📊 Current Download URLs

The code uses these URLs (from `src/config/downloadUrls.ts`):

- **Windows:** `https://github.com/kwilhelm1967/Vault/releases/latest/download/Local%20Password%20Vault-Setup-1.2.0.exe`
- **macOS:** `https://github.com/kwilhelm1967/Vault/releases/latest/download/Local%20Password%20Vault-1.2.0-mac.dmg`
- **Linux:** `https://github.com/kwilhelm1967/Vault/releases/latest/download/Local%20Password%20Vault-1.2.0.AppImage`

**These URLs will work once you:**
1. Build the installers
2. Upload them to a GitHub Release
3. Ensure filenames match

---

## 🎯 Summary

**Downloads will work when:**
- ✅ Installers are built (`npm run dist:all`)
- ✅ Installers are uploaded to GitHub Release
- ✅ Filenames match what's in the code

**Downloads won't work if:**
- ❌ Installers haven't been built
- ❌ No GitHub Release exists
- ❌ Filenames don't match

**Next step:** Build the installers and create a GitHub Release!

---

**Last Updated:** 2025
