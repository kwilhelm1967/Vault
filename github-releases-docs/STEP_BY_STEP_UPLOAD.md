# Step-by-Step GitHub Releases Upload Guide

## Quick Start
1. **GitHub Releases page should be open** in your browser
2. **File Explorer should be open** with the 3 zip files
3. Follow the steps below

---

## Detailed Steps

### Step 1: Navigate to Releases
- If not already open, go to: https://github.com/kwilhelm1967/Vault/releases
- You should see a list of releases

### Step 2: Choose Your Action

#### Option A: Upload to Existing Release (if v1.2.0 release exists)
1. Find the release tagged **v1.2.0** (or the latest release)
2. Click the **"Edit"** button (pencil icon) on that release
3. Scroll down to the section: **"Attach binaries by dropping them here or selecting them"**
4. **Drag and drop** all 3 zip files from the File Explorer window:
   - `Local-Password-Vault-Windows-Documentation-1.2.0.zip`
   - `Local-Password-Vault-macOS-Documentation-1.2.0.zip`
   - `Local-Password-Vault-Linux-Documentation-1.2.0.zip`
5. Wait for upload to complete (you'll see progress bars)
6. Click **"Update release"** button at the bottom

#### Option B: Create New Release (if v1.2.0 doesn't exist)
1. Click the **"Draft a new release"** button (green button, top right)
2. Click **"Choose a tag"** dropdown
   - If v1.2.0 exists, select it
   - If not, type `v1.2.0` and click "Create new tag: v1.2.0 on publish"
3. **Release title**: Enter `Local Password Vault 1.2.0`
4. **Description**: Add release notes (optional, can be edited later)
5. Scroll down to: **"Attach binaries by dropping them here or selecting them"**
6. **Drag and drop** all 3 zip files from the File Explorer window:
   - `Local-Password-Vault-Windows-Documentation-1.2.0.zip`
   - `Local-Password-Vault-macOS-Documentation-1.2.0.zip`
   - `Local-Password-Vault-Linux-Documentation-1.2.0.zip`
7. Wait for upload to complete (you'll see progress bars)
8. Click **"Publish release"** button (or "Save draft" if you want to publish later)

### Step 3: Verify Upload
After uploading, test these URLs in your browser:
- https://github.com/kwilhelm1967/Vault/releases/latest/download/Local-Password-Vault-Windows-Documentation-1.2.0.zip
- https://github.com/kwilhelm1967/Vault/releases/latest/download/Local-Password-Vault-macOS-Documentation-1.2.0.zip
- https://github.com/kwilhelm1967/Vault/releases/latest/download/Local-Password-Vault-Linux-Documentation-1.2.0.zip

Each should download the zip file.

### Step 4: Test on Website
1. Visit: https://localpasswordvault.com/trial-success.html
2. Scroll to the "Download Documentation" section
3. Click each documentation download button (Windows, macOS, Linux)
4. Verify files download correctly from GitHub

---

## Troubleshooting

**Files won't upload?**
- Make sure you're dragging from the File Explorer window
- Check that all 3 files are selected
- Try uploading one at a time if needed

**Can't find the release?**
- Make sure you're logged into GitHub
- Check that you have write access to the repository
- Try creating a new release instead

**Downloads don't work?**
- Verify filenames match exactly (case-sensitive)
- Make sure the release is published (not a draft)
- Check that files are actually attached to the release

---

## Files to Upload
All files are in: `github-releases-docs\`

1. Local-Password-Vault-Windows-Documentation-1.2.0.zip (16.04 KB)
2. Local-Password-Vault-macOS-Documentation-1.2.0.zip (16.04 KB)
3. Local-Password-Vault-Linux-Documentation-1.2.0.zip (16.03 KB)

---

## Success Checklist
- [ ] All 3 files uploaded to GitHub Release
- [ ] Release is published (not draft)
- [ ] Test URLs download correctly
- [ ] Documentation buttons work on trial-success.html page



