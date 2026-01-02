# How to Upload Files to GitHub Releases

## 📍 File Location

Your installer files are located at:
```
C:\Users\kelly\OneDrive\Desktop\Vault-Main\LocalPasswordVault\release\
```

The file you need to upload:
- `Local Password Vault Setup 1.2.0.exe`

---

## 📤 Method 1: Upload via GitHub Web Interface (Easiest)

### Step 1: Go to GitHub Releases
1. Open your browser
2. Go to: https://github.com/kwilhelm1967/Vault/releases
3. If you don't have any releases yet, click **"Draft a new release"**
4. If you have releases, click **"Draft a new release"** button

### Step 2: Create the Release
1. **Tag version:** Type `v1.2.0` (or your version number)
2. **Release title:** Type `v1.2.0` or `Version 1.2.0`
3. **Description:** (Optional) Add release notes
4. **Don't click "Publish release" yet!**

### Step 3: Upload the File
1. **Scroll down** to the "Attach binaries" section
2. **Click "Choose your files"** or drag and drop area
3. **Navigate to your release folder:**
   - Copy this path: `C:\Users\kelly\OneDrive\Desktop\Vault-Main\LocalPasswordVault\release`
   - Paste it into Windows Explorer address bar
   - Or navigate: Desktop → Vault-Main → LocalPasswordVault → release
4. **Select the file:**
   - `Local Password Vault Setup 1.2.0.exe`
   - (Optionally also upload the `.blockmap` file)
5. **Wait for upload to complete** (you'll see progress)
6. **Click "Publish release"**

---

## 📤 Method 2: Drag and Drop (Fastest)

1. **Open Windows Explorer:**
   - Navigate to: `C:\Users\kelly\OneDrive\Desktop\Vault-Main\LocalPasswordVault\release`
   - Or paste this path in the address bar

2. **Go to GitHub Releases:**
   - Open: https://github.com/kwilhelm1967/Vault/releases/new
   - Fill in tag: `v1.2.0`
   - Fill in title: `v1.2.0`

3. **Drag and drop:**
   - Drag `Local Password Vault Setup 1.2.0.exe` from Windows Explorer
   - Drop it onto the "Attach binaries" area on GitHub
   - Wait for upload

4. **Click "Publish release"**

---

## 📤 Method 3: Using GitHub CLI (Advanced)

If you have GitHub CLI installed:

```bash
cd release
gh release create v1.2.0 "Local Password Vault Setup 1.2.0.exe" --title "v1.2.0" --notes "Release 1.2.0"
```

---

## 🔍 Troubleshooting

### "Files aren't in the release folder"

**Check the exact path:**
1. Open Windows Explorer
2. Paste this in the address bar:
   ```
   C:\Users\kelly\OneDrive\Desktop\Vault-Main\LocalPasswordVault\release
   ```
3. Press Enter
4. You should see `Local Password Vault Setup 1.2.0.exe`

### "GitHub is trying to browse my hard drive"

This is normal! GitHub's upload button opens a file picker that lets you browse your computer. Just:
1. Navigate to the `release` folder using the file picker
2. Select the `.exe` file
3. Click "Open"

### "I can't find the release folder"

**Option 1: Use full path**
- Copy: `C:\Users\kelly\OneDrive\Desktop\Vault-Main\LocalPasswordVault\release`
- Paste in Windows Explorer address bar
- Press Enter

**Option 2: Navigate manually**
- Desktop → Vault-Main → LocalPasswordVault → release

### "File is too large"

GitHub allows files up to 2GB. Your `.exe` file is ~80MB, so it should be fine.

If you get an error:
- Check your internet connection
- Try uploading again
- Check if file is corrupted (try rebuilding: `npm run dist:win`)

---

## ✅ After Uploading

Once uploaded, test the download link:
- Visit: https://github.com/kwilhelm1967/Vault/releases/latest/download/Local%20Password%20Vault%20Setup%201.2.0.exe
- It should download the file
- Your website download buttons will now work!

---

## 📝 Quick Reference

**File to upload:**
- Name: `Local Password Vault Setup 1.2.0.exe`
- Location: `C:\Users\kelly\OneDrive\Desktop\Vault-Main\LocalPasswordVault\release\`
- Size: ~80 MB

**GitHub Release:**
- URL: https://github.com/kwilhelm1967/Vault/releases
- Tag: `v1.2.0`
- File will be at: `https://github.com/kwilhelm1967/Vault/releases/latest/download/Local%20Password%20Vault%20Setup%201.2.0.exe`

---

**Last Updated:** 2025
