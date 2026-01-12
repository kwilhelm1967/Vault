# Code Signing Instructions - Local Password Vault

## 📦 EXE File to Sign

**Location:** `release\Local Password Vault Setup 1.2.0-x64.exe`  
**Size:** 78 MB  
**Status:** ❌ UNSIGNED (will show SmartScreen warning)

---

## 🔐 Step 1: Sign the EXE File

### Option A: Using signtool (Manual Signing)

1. **Open Command Prompt as Administrator**

2. **Locate signtool.exe** (usually in Windows SDK):
   ```
   "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe"
   ```
   *Version number may vary - find your installed Windows SDK version*

3. **Sign the installer**:
   ```cmd
   signtool sign /f "path\to\your-certificate.pfx" /p "your-certificate-password" /tr http://timestamp.digicert.com /td sha256 /fd sha256 "C:\Users\kelly\OneDrive\Desktop\Vault-Main\LocalPasswordVault\release\Local Password Vault Setup 1.2.0-x64.exe"
   ```

   Replace:
   - `path\to\your-certificate.pfx` with your actual certificate path
   - `your-certificate-password` with your certificate password

### Option B: Using PowerShell (Alternative)

```powershell
Set-AuthenticodeSignature -FilePath "release\Local Password Vault Setup 1.2.0-x64.exe" -Certificate (Get-PfxData -FilePath "path\to\your-certificate.pfx" -Password (ConvertTo-SecureString "your-certificate-password" -AsPlainText -Force)).EndEntityCertificates[0] -TimestampServer "http://timestamp.digicert.com"
```

---

## ✅ Step 2: Verify the Signature

After signing, verify it worked:

```powershell
Get-AuthenticodeSignature "release\Local Password Vault Setup 1.2.0-x64.exe"
```

**Expected Output:**
- Status: `Valid`
- SignerCertificate: Shows your certificate details
- NotAfter: Certificate expiration date

**Or use the verification script:**
```powershell
.\scripts\verify-installer.ps1 -InstallerPath "release\Local Password Vault Setup 1.2.0-x64.exe"
```

---

## 🚀 Step 3: After Signing is Complete

### 1. **Test the Signed Installer**
- Copy the signed .exe to a different computer (or VM)
- Right-click → Properties → Digital Signatures tab
- Verify your signature appears
- Install it - should NOT show SmartScreen warning (after first use + reputation)

### 2. **Upload to GitHub Releases**

**Option A: Manual Upload**
1. Go to: https://github.com/kwilhelm1967/Vault/releases
2. Edit the V1.2.0 release (or create new release)
3. Upload the signed `.exe` file
4. Replace the unsigned version if updating

**Option B: Using Upload Script** (if configured)
```powershell
.\scripts\upload-release.ps1
```

### 3. **Update Download Links**

If the filename changed, update:
- `LLV/trial-success-llv.html` (if this is for Legacy Vault)
- `LLV/purchase-success.html` (if this is for Legacy Vault)
- Any website download links pointing to the installer

### 4. **Verify on Website**

- Download the installer from your website
- Check Properties → Digital Signatures shows your signature
- Test installation on clean Windows machine

---

## 📋 Checklist After Signing

- [ ] Signature verified with `Get-AuthenticodeSignature`
- [ ] Tested installer on clean machine (no SmartScreen warning after first use)
- [ ] Uploaded signed .exe to GitHub Releases
- [ ] Updated website download links if filename changed
- [ ] Verified download and installation from website works
- [ ] Confirmed signature appears in file properties

---

## ⚠️ Important Notes

1. **Certificate Requirements:**
   - Must be a valid code signing certificate (not SSL/TLS cert)
   - Must not be expired
   - EV certificates provide immediate reputation (no SmartScreen delay)

2. **SmartScreen:**
   - First-time signed installers may still show warning until reputation builds
   - Users need to click "More info" → "Run anyway" initially
   - After enough downloads, Windows recognizes it as trusted

3. **Timestamp:**
   - Always use timestamp server (`/tr` flag)
   - Ensures signature remains valid after certificate expires
   - Recommended: `http://timestamp.digicert.com` or `http://timestamp.sectigo.com`

4. **File Path:**
   - Full path: `C:\Users\kelly\OneDrive\Desktop\Vault-Main\LocalPasswordVault\release\Local Password Vault Setup 1.2.0-x64.exe`

---

## 🆘 Troubleshooting

**"signtool not found":**
- Install Windows SDK: https://developer.microsoft.com/windows/downloads/windows-sdk/
- Or use full path to signtool.exe

**"Invalid certificate":**
- Verify .pfx file is a code signing certificate
- Check certificate hasn't expired
- Ensure certificate password is correct

**"Access denied":**
- Run Command Prompt as Administrator
- Check file isn't locked by another process

**Signature shows but SmartScreen still warns:**
- Normal for new certificates
- Reputation builds over time with downloads
- EV certificates have immediate reputation
