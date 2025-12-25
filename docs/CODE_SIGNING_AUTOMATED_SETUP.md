# Automated Code Signing Setup

**Purpose:** Simple, automated setup for code signing certificates. No confusion for developers.

---

## Quick Start (Windows)

### Option 1: Automated Setup Script (Recommended)

1. **Download certificate from SSL.com:**
   - Go to: https://www.ssl.com/account/
   - My Certificates → Code Signing Certificates
   - Download as **PKCS#12 (.pfx)** format
   - Save the password

2. **Run setup script:**
   ```powershell
   .\scripts\setup-code-signing.ps1
   ```

3. **Follow the prompts:**
   - Script will ask for certificate file path
   - Script will ask for certificate password
   - Script will create `.env` file automatically

4. **Verify setup:**
   ```powershell
   .\scripts\verify-code-signing.ps1
   ```

5. **Test code signing:**
   ```bash
   npm run dist:win
   ```

**That's it!** The installer will be automatically signed.

---

## Quick Start (macOS/Linux)

1. **Download certificate from SSL.com** (same as Windows)

2. **Run setup script:**
   ```bash
   chmod +x scripts/setup-code-signing.sh
   ./scripts/setup-code-signing.sh
   ```

3. **Follow the prompts** (same as Windows)

4. **Verify and test** (same as Windows)

---

## Manual Setup (If Script Doesn't Work)

### Step 1: Place Certificate

1. Create `certs/` folder (if it doesn't exist)
2. Copy your `.pfx` file to `certs/windows-code-signing.pfx`

### Step 2: Create .env File

Create `.env` file in project root:

```env
CSC_LINK=certs/windows-code-signing.pfx
CSC_KEY_PASSWORD=your_password_here
```

### Step 3: Test

```bash
npm run dist:win
```

---

## Verification

**Check if code signing is configured:**
```powershell
.\scripts\verify-code-signing.ps1
```

**Or manually check:**
- `.env` file exists
- `CSC_LINK` points to certificate file
- Certificate file exists at that path
- `CSC_KEY_PASSWORD` is set

**Verify signed installer:**
- Right-click installer → Properties → Digital Signatures tab
- Should show your SSL.com certificate name

---

## Troubleshooting

### Script won't run (Windows)
```powershell
# Enable script execution (run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Certificate file not found
- Check the path in `.env` file
- Use forward slashes: `certs/windows-code-signing.pfx`
- Check file actually exists in `certs/` folder

### "Invalid password" error
- Verify password from SSL.com is correct
- Check for extra spaces in `.env` file
- Try copying password directly from SSL.com

---

## What the Scripts Do

### `setup-code-signing.ps1` / `setup-code-signing.sh`
- Creates `certs/` directory if needed
- Guides you through downloading certificate
- Copies certificate to `certs/` folder
- Creates/updates `.env` file with certificate path and password
- Verifies setup

### `verify-code-signing.ps1`
- Checks if `.env` file exists
- Verifies certificate file exists
- Checks password is set
- Confirms certificate is in `.gitignore`
- Reports any issues

---

## Security Notes

✅ **Safe:**
- Certificate files are in `.gitignore` (won't be committed)
- `.env` file is in `.gitignore` (won't be committed)
- Scripts only run locally on your machine

❌ **Never:**
- Commit certificate files to git
- Share certificate files via email/chat
- Hardcode passwords in code

---

## Next Steps

Once setup is complete:
1. ✅ Certificate is in `certs/` folder
2. ✅ `.env` file is configured
3. ✅ Run: `npm run dist:win` (will automatically sign)
4. ✅ Verify signature on installer

---

**Last Updated:** Latest  
**Status:** Ready to use - just run the script!

