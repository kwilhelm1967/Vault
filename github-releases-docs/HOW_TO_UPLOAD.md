# How to Upload Documentation Files to GitHub Releases

## Quick Steps

### 1. Go to GitHub Releases
**URL:** https://github.com/kwilhelm1967/Vault/releases

### 2. Find or Create Release v1.2.0

#### Option A: If Release v1.2.0 Already Exists
1. Find the release tagged **v1.2.0** in the list
2. Click the **"Edit"** button (pencil icon) on that release
3. Scroll down to **"Attach binaries by dropping them here or selecting them"**
4. Drag and drop all 3 zip files from the `github-releases-docs` folder
5. Click **"Update release"**

#### Option B: If Release v1.2.0 Doesn't Exist
1. Click **"Draft a new release"** button (top right, green button)
2. Click **"Choose a tag"** dropdown
   - If v1.2.0 exists, select it
   - If not, type `v1.2.0` and select "Create new tag: v1.2.0 on publish"
3. **Release title:** Enter `Local Password Vault 1.2.0`
4. **Description:** Add release notes (optional)
5. Scroll down to **"Attach binaries by dropping them here or selecting them"**
6. Drag and drop all 3 zip files from the `github-releases-docs` folder:
   - `Local-Password-Vault-Windows-Documentation-1.2.0.zip`
   - `Local-Password-Vault-macOS-Documentation-1.2.0.zip`
   - `Local-Password-Vault-Linux-Documentation-1.2.0.zip`
7. Click **"Publish release"** (or "Save draft" if you want to publish later)

### 3. Files to Upload
All files are in: `github-releases-docs\`

1. `Local-Password-Vault-Windows-Documentation-1.2.0.zip` (16.04 KB)
2. `Local-Password-Vault-macOS-Documentation-1.2.0.zip` (16.04 KB)
3. `Local-Password-Vault-Linux-Documentation-1.2.0.zip` (16.03 KB)

### 4. Verify Upload
After uploading, test these URLs:
- https://github.com/kwilhelm1967/Vault/releases/latest/download/Local-Password-Vault-Windows-Documentation-1.2.0.zip
- https://github.com/kwilhelm1967/Vault/releases/latest/download/Local-Password-Vault-macOS-Documentation-1.2.0.zip
- https://github.com/kwilhelm1967/Vault/releases/latest/download/Local-Password-Vault-Linux-Documentation-1.2.0.zip

Each should download the zip file.

### 5. Test on Website
1. Visit: https://localpasswordvault.com/trial-success.html
2. Scroll to "Download Documentation" section
3. Click each documentation button (Windows, macOS, Linux)
4. Verify files download correctly

---

## Visual Guide

```
GitHub Releases Page
├── Releases List
│   └── v1.2.0 (or click "Draft a new release")
│       └── Edit Release (or Create Release)
│           └── Scroll to "Attach binaries" section
│               └── Drag & Drop 3 zip files here
│                   └── Click "Update release" or "Publish release"
```

---

## Important Notes

- **Filenames must match exactly** (case-sensitive)
- All 3 files should be uploaded to the **same release**
- The `/latest/download/` path automatically points to the latest release
- Once uploaded, the download buttons on trial-success.html will work immediately

---

## Troubleshooting

**Can't find the release?**
- Make sure you're logged into GitHub
- Check that you have write access to the repository
- Try creating a new release instead

**Files won't upload?**
- Make sure you're dragging from the File Explorer window
- Check that all 3 files are selected
- Try uploading one at a time if needed

**Downloads don't work?**
- Verify filenames match exactly (case-sensitive)
- Make sure the release is published (not a draft)
- Check that files are actually attached to the release



