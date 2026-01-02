# Fix Download 404 Error

## 🔍 Problem

Getting 404 error when clicking download button. Error shows:
- URL: `/releases/download/v1.20/Local%20Password%20Vault-Setup-1.2.0.exe`
- Issues:
  1. Tag might be `v1.20` instead of `v1.2.0`
  2. Filename has hyphen: `Vault-Setup` (should be `Vault Setup` with space)

---

## ✅ Solution

### Step 1: Check Your GitHub Release

1. **Go to:** https://github.com/kwilhelm1967/Vault/releases
2. **Check the tag name:**
   - Should be: `v1.2.0` ✅
   - If it's: `v1.20` ❌ (this is the problem!)

3. **Check the filename:**
   - Should be: `Local Password Vault Setup 1.2.0.exe` ✅
   - If it's: `Local Password Vault-Setup-1.2.0.exe` ❌ (wrong - has hyphen)

---

### Step 2: Fix the Tag (If Wrong)

**If your tag is `v1.20` instead of `v1.2.0`:**

**Option A: Edit the Release (Easiest)**
1. Go to your release on GitHub
2. Click "Edit release" (pencil icon)
3. Change tag from `v1.20` to `v1.2.0`
4. Save

**Option B: Delete and Recreate**
1. Delete the release
2. Create new release with tag `v1.2.0`
3. Upload the file again

---

### Step 3: Fix the Filename (If Wrong)

**If the filename on GitHub has a hyphen:**

**Option A: Rename on GitHub**
1. Go to your release
2. Delete the old file
3. Upload the correct file: `Local Password Vault Setup 1.2.0.exe`

**Option B: Rebuild with Correct Name**
The file should be built as: `Local Password Vault Setup 1.2.0.exe`
(Check your `release/` folder to confirm)

---

### Step 4: Use `/latest/download/` Path

The HTML file uses `/latest/download/` which should work regardless of tag:
```
https://github.com/kwilhelm1967/Vault/releases/latest/download/Local%20Password%20Vault%20Setup%201.2.0.exe
```

**This should work if:**
- ✅ The file exists in the latest release
- ✅ The filename matches exactly

---

## 🔧 Quick Fix

**If you can't change the tag/filename, update the HTML to match:**

If your tag is `v1.20` and filename is `Local Password Vault-Setup-1.2.0.exe`:

Update `LPV/trial-success.html` line 435:
```html
<!-- Change from: -->
<a href="https://github.com/kwilhelm1967/Vault/releases/latest/download/Local%20Password%20Vault%20Setup%201.2.0.exe">

<!-- To match your actual GitHub release: -->
<a href="https://github.com/kwilhelm1967/Vault/releases/download/v1.20/Local%20Password%20Vault-Setup-1.2.0.exe">
```

**But it's better to fix the GitHub release instead!**

---

## ✅ Correct Setup

**GitHub Release should have:**
- Tag: `v1.2.0` (not `v1.20`)
- Filename: `Local Password Vault Setup 1.2.0.exe` (space before Setup, not hyphen)

**HTML should use:**
- Path: `/releases/latest/download/` (works with any tag)
- Filename: `Local%20Password%20Vault%20Setup%201.2.0.exe` (URL-encoded)

---

## 🧪 Test After Fix

1. **Test direct link:**
   ```
   https://github.com/kwilhelm1967/Vault/releases/latest/download/Local%20Password%20Vault%20Setup%201.2.0.exe
   ```

2. **Test from website:**
   - Visit your trial success page
   - Click "Download for Windows"
   - Should download successfully

---

## 📋 Checklist

- [ ] Check GitHub release tag is `v1.2.0` (not `v1.20`)
- [ ] Check filename on GitHub is `Local Password Vault Setup 1.2.0.exe`
- [ ] Verify file exists in the release
- [ ] Test download link directly
- [ ] Test download from website

---

**Last Updated:** 2025
