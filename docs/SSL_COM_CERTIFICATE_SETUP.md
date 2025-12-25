# SSL.com Windows Code Signing Certificate Setup

**Purpose:** Download and configure your Windows code signing certificate from SSL.com.

---

## Step 1: Download Certificate from SSL.com

### Option A: Download as .pfx File (Recommended)

1. **Log in to SSL.com:**
   - Go to: https://www.ssl.com/account/
   - Log in with your credentials

2. **Navigate to Certificates:**
   - Go to: My Certificates → Code Signing Certificates
   - Find your Windows code signing certificate

3. **Download Certificate:**
   - Click "Download" or "Export"
   - Choose format: **PKCS#12 (.pfx)** or **PFX**
   - Save the file (e.g., `windows-code-signing.pfx`)

4. **Note the Password:**
   - SSL.com will provide a password for the .pfx file
   - Save this password securely (you'll need it)

### Option B: Download as .p12 File

If SSL.com only offers .p12 format:
- Download the .p12 file
- It works the same as .pfx for code signing

---

## Step 2: Place Certificate in Project

1. **Create certs directory** (if it doesn't exist):
   ```bash
   mkdir certs
   ```

2. **Copy certificate to certs folder:**
   ```
   certs/
   └── windows-code-signing.pfx  (or .p12)
   ```

3. **Verify .gitignore:**
   - Check that `certs/` and `*.pfx`, `*.p12` are in `.gitignore`
   - ✅ Already configured - certificates won't be committed

---

## Step 3: Create Environment File

Create `.env` file in project root:

```env
# Windows Code Signing (SSL.com)
CSC_LINK=certs/windows-code-signing.pfx
CSC_KEY_PASSWORD=your_ssl_com_password_here
```

**Replace:**
- `windows-code-signing.pfx` with your actual certificate filename
- `your_ssl_com_password_here` with the password from SSL.com

---

## Step 4: Test Code Signing

```bash
npm run dist:win
```

**What to expect:**
- Build will create installer
- Code signing will happen automatically
- You may be prompted for certificate password (if not in .env)

**Verify signature:**
```powershell
signtool verify /pa "release/Local Password Vault Setup 1.2.0.exe"
```

**Or check manually:**
- Right-click installer → Properties → Digital Signatures tab
- Should show your certificate name from SSL.com

---

## Troubleshooting

### "Certificate file not found"
- Check `CSC_LINK` path in `.env` is correct
- Verify certificate file exists in `certs/` folder
- Use forward slashes in path: `certs/windows-code-signing.pfx`

### "Invalid password"
- Verify password from SSL.com is correct
- Check for extra spaces or special characters
- Try copying password directly from SSL.com

### "Certificate expired"
- Check certificate expiration date on SSL.com
- Renew certificate if needed

### "SignTool not found"
- electron-builder includes its own signing tool
- Should work without Windows SDK
- If issues persist, install Windows SDK

---

## Next Steps

Once Windows certificate is set up:
1. ✅ Test build: `npm run dist:win`
2. ✅ Verify signature on installer
3. ✅ Configure macOS signing (if needed)

---

**Last Updated:** Latest

