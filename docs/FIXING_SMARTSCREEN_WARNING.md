# Fixing Windows SmartScreen Warning

**Problem:** Users see a blue "Windows protected your PC" warning screen and must click "More info" → "Run anyway" to install.

**Solution:** Properly configure code signing and understand SmartScreen reputation.

---

## Quick Fix Steps

### Step 1: Configure Your SSL.com Certificate

You've purchased a certificate from SSL.com. Now you need to configure it:

```powershell
# Run the setup script (easiest method)
.\scripts\setup-code-signing.ps1
```

**What this does:**
1. Prompts you to download your certificate from SSL.com (if not already downloaded)
2. Copies certificate to `certs/` folder
3. Creates/updates `.env` file with:
   - `CSC_LINK=certs/your-certificate.pfx`
   - `CSC_KEY_PASSWORD=your_password`

**Manual Setup (if script doesn't work):**

1. **Download certificate from SSL.com:**
   - Go to: https://www.ssl.com/account/
   - Navigate to: My Certificates → Code Signing Certificates
   - Download as PKCS#12 (.pfx) format
   - Save the password provided by SSL.com

2. **Create `certs/` folder** (if it doesn't exist):
   ```powershell
   mkdir certs
   ```

3. **Copy certificate to `certs/` folder:**
   ```powershell
   # Example: Copy your downloaded certificate
   Copy-Item "C:\Users\YourName\Downloads\your-cert.pfx" "certs\your-cert.pfx"
   ```

4. **Create `.env` file** in project root:
   ```env
   # Windows Code Signing (SSL.com)
   CSC_LINK=certs/your-cert.pfx
   CSC_KEY_PASSWORD=your_certificate_password_here
   ```

### Step 2: Verify Configuration

```powershell
# Check if everything is set up correctly
.\scripts\verify-code-signing.ps1
```

This should show:
- ✓ .env file exists
- ✓ Certificate file found
- ✓ Certificate password is set

### Step 3: Rebuild Installer with Signing

**IMPORTANT:** You must rebuild the installer for signing to take effect:

```powershell
# Clean previous builds (optional but recommended)
Remove-Item -Recurse -Force release\*, dist\* -ErrorAction SilentlyContinue

# Build signed installer
npm run dist:win
```

**What to look for during build:**
- You should see messages about signing
- No errors about certificate not found
- Build completes successfully

### Step 4: Verify Installer is Signed

**Method 1: Right-click Properties**
1. Right-click the installer in `release/` folder
2. Click **Properties**
3. Go to **Digital Signatures** tab
4. You should see your certificate listed
5. Click **Details** → Should show "The digital signature is OK"

**Method 2: Using PowerShell**
```powershell
# Verify signature
Get-AuthenticodeSignature "release\Local Password Vault Setup 1.2.0.exe"
```

**Expected output:**
```
Status: Valid
SignerCertificate: [Your Certificate Details]
```

**Method 3: Using the verification script**
```powershell
.\scripts\verify-installer.ps1
```

---

## Why You Still See Warnings (Even With Certificate)

### Understanding SmartScreen Reputation

**Standard Code Signing Certificates (like SSL.com):**
- ✅ **Signs your installer** (proves it's from you)
- ✅ **Shows your company name** instead of "Unknown Publisher"
- ⚠️ **Still shows warning** until reputation is built

**This is NORMAL and EXPECTED!**

SmartScreen uses a reputation system:
1. **First few downloads:** Warning appears (even with valid certificate)
2. **After 10-50 downloads:** Warning may still appear
3. **After 100+ downloads:** Warning typically disappears
4. **After 1000+ downloads:** Full trust established

### EV (Extended Validation) Certificates

**EV certificates** (~$400-500/year) provide **instant reputation**:
- ✅ No SmartScreen warning from day one
- ✅ Requires hardware token (USB key)
- ✅ More expensive

**Standard certificates** (like SSL.com ~$75/year):
- ✅ Valid signature
- ✅ Shows your company name
- ⚠️ Requires time to build reputation (weeks to months)

---

## What You Can Do Right Now

### Option 1: Accept the Warning (Recommended for Now)

**For your users:**
1. The warning is normal for new software
2. They can safely click "More info" → "Run anyway"
3. The installer IS properly signed (just needs reputation)
4. After enough downloads, the warning will disappear automatically

**Instructions to give users:**
```
If you see a Windows security warning:
1. Click "More info"
2. Click "Run anyway"
3. The installer is safe and properly signed
```

### Option 2: Build Reputation Faster

**Ways to build SmartScreen reputation:**

1. **Get more downloads:**
   - Share with friends/family to download
   - Post on software directories
   - Get initial users to download

2. **Submit to Microsoft:**
   - Go to: https://www.microsoft.com/en-us/wdsi/filesubmission
   - Submit your signed installer
   - Microsoft may whitelist it faster

3. **Use Windows Defender SmartScreen reputation:**
   - Each legitimate download builds reputation
   - Takes time (weeks to months)
   - No way to speed this up significantly

### Option 3: Upgrade to EV Certificate (Future)

If you want instant trust:
- Purchase EV code signing certificate (~$400-500/year)
- Providers: DigiCert, Sectigo, GlobalSign
- Provides instant SmartScreen trust
- Requires hardware token

---

## Troubleshooting

### Issue: Certificate Not Found During Build

**Symptoms:**
- Build fails with "certificate not found"
- Error about CSC_LINK

**Solution:**
1. Check `.env` file exists in project root
2. Verify `CSC_LINK` path is correct (relative to project root)
3. Verify certificate file exists at that path
4. Run: `.\scripts\verify-code-signing.ps1`

### Issue: Wrong Password

**Symptoms:**
- Build fails with "invalid password"
- Certificate import error

**Solution:**
1. Verify password in `.env` file matches SSL.com password
2. Check for extra spaces or special characters
3. Try re-downloading certificate from SSL.com

### Issue: Installer Not Signed

**Symptoms:**
- Build completes but no signature in Properties
- Digital Signatures tab is empty

**Solution:**
1. Check build output for signing errors
2. Verify `.env` file is in project root (not in subfolder)
3. Verify certificate file path is correct
4. Try rebuilding: `npm run dist:win`

### Issue: Certificate Expired

**Symptoms:**
- Signature shows as "expired" or "invalid"

**Solution:**
1. Check certificate expiration date
2. Renew certificate with SSL.com if expired
3. Download new certificate and update `.env`

---

## Verification Checklist

Before distributing your installer:

- [ ] Certificate configured in `.env` file
- [ ] Certificate file exists in `certs/` folder
- [ ] Installer rebuilt after configuring certificate
- [ ] Digital Signatures tab shows your certificate
- [ ] Signature status is "Valid"
- [ ] Company name appears (not "Unknown Publisher")

**Even if all checked:**
- ⚠️ SmartScreen warning may still appear (this is normal)
- ✅ Users can safely click "Run anyway"
- ✅ Reputation will build over time

---

## Current Status

**What you have:**
- ✅ Valid code signing certificate from SSL.com
- ✅ Installer can be signed
- ✅ Shows your company name

**What you need:**
- ⚠️ Time to build SmartScreen reputation
- ⚠️ Multiple downloads to establish trust
- ⚠️ Users may see warning initially (this is expected)

**What you can do:**
1. ✅ Configure certificate properly (use setup script)
2. ✅ Rebuild installer with signing
3. ✅ Verify signature is valid
4. ✅ Accept that warnings are normal initially
5. ✅ Build reputation through legitimate downloads

---

## Quick Reference

**Setup certificate:**
```powershell
.\scripts\setup-code-signing.ps1
```

**Verify configuration:**
```powershell
.\scripts\verify-code-signing.ps1
```

**Build signed installer:**
```powershell
npm run dist:win
```

**Verify installer signature:**
```powershell
.\scripts\verify-installer.ps1
```

**Or manually:**
```powershell
Get-AuthenticodeSignature "release\Local Password Vault Setup 1.2.0.exe"
```

---

## Summary

**The blue warning screen is NORMAL for new software**, even with a valid certificate. Here's what to do:

1. ✅ **Configure your SSL.com certificate** (use setup script)
2. ✅ **Rebuild your installer** (`npm run dist:win`)
3. ✅ **Verify it's signed** (check Properties → Digital Signatures)
4. ✅ **Accept the warning** (it will disappear as reputation builds)
5. ✅ **Tell users it's safe** (they can click "Run anyway")

**The installer IS properly signed** - SmartScreen just needs time to build trust. This is how Windows security works, and it's the same for all new software.

---

**Need help?** Check:
- `docs/CODE_SIGNING_GUIDE.md` - Full code signing guide
- `scripts/verify-code-signing.ps1` - Verify your setup
- SSL.com support - For certificate issues
