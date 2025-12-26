# Download Packages - Created

**Date:** January 2025  
**Version:** 1.2.0

## Packages Created

### Windows Package ✅
- **File:** `Local-Password-Vault-Windows-1.2.0.zip`
- **Contains:**
  - `Local Password Vault Setup 1.2.0.exe` (installer)
  - `README.txt` (installation instructions)
  - `USER_MANUAL.md` (complete user guide)
  - `QUICK_START_GUIDE.md` (quick start instructions)
  - `TROUBLESHOOTING_GUIDE.md` (troubleshooting help)

### macOS Package ⚠️
- **Status:** Not created (DMG not found)
- **Requirement:** Must be built on macOS system or via CI/CD (cannot build on Windows)
- **To create:**
  1. Build macOS installer: `npm run dist:mac` (on macOS system)
  2. Run package script: `.\scripts\create-download-packages.ps1`
  3. Package will be created automatically: `Local-Password-Vault-macOS-1.2.0.zip`

### Linux Package ⚠️
- **Status:** Not created (AppImage not found)
- **Requirement:** Must be built on Linux system or via CI/CD (cannot build on Windows)
- **To create:**
  1. Build Linux installer: `npm run dist:linux` (on Linux system)
  2. Run package script: `.\scripts\create-download-packages.ps1`
  3. Package will be created automatically: `Local-Password-Vault-Linux-1.2.0.zip`

---

## Next Steps (Manual)

### 1. Upload to GitHub Releases
1. Go to: https://github.com/kwilhelm1967/Vault/releases
2. Create a new release (tag: `v1.2.0`)
3. Upload the ZIP file(s) as release assets
4. Get the download URLs (they'll look like):
   - `https://github.com/kwilhelm1967/Vault/releases/download/v1.2.0/Local-Password-Vault-Windows-1.2.0.zip`

### 2. Update Email Templates
Update the download URLs in these email templates:
- `backend/templates/purchase-confirmation-email.html`
- `backend/templates/bundle-email.html`
- `backend/templates/trial-welcome-email.html`

Replace placeholder URLs with actual GitHub Releases URLs.

### 3. Test Download Links
- Verify all download links work
- Test on different platforms
- Ensure files download correctly

---

## Script Usage

To create packages again (after building installers):
```powershell
.\scripts\create-download-packages.ps1
```

Or manually:
```powershell
# Windows
New-Item -ItemType Directory -Path "download-packages\windows" -Force
Copy-Item "release\Local Password Vault Setup 1.2.0.exe" -Destination "download-packages\windows\" -Force
Copy-Item "download-packages\README.txt" -Destination "download-packages\windows\" -Force
Copy-Item "docs\USER_MANUAL.md" -Destination "download-packages\windows\" -Force
Copy-Item "docs\QUICK_START_GUIDE.md" -Destination "download-packages\windows\" -Force
Copy-Item "docs\TROUBLESHOOTING_GUIDE.md" -Destination "download-packages\windows\" -Force
Compress-Archive -Path "download-packages\windows\*" -DestinationPath "download-packages\Local-Password-Vault-Windows-1.2.0.zip" -Force
```


