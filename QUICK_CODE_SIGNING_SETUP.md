# Quick Code Signing Setup - Eliminate Virus Warnings

## The Problem
Windows Defender and antivirus software flag unsigned executables as potentially dangerous. This is a false positive, but it scares users away.

## The Solution
Code sign your installer with a trusted certificate. This takes about 1-2 hours to set up.

## Fastest Path to Fix (Choose One):

### Option 1: SSL.com Standard Certificate (~$75/year) - RECOMMENDED
**Fastest setup, cheapest option**

1. **Purchase Certificate** (15 minutes)
   - Go to: https://www.ssl.com/products/code-signing-certificate/
   - Purchase "Code Signing Certificate" (~$75/year)
   - Complete identity verification (email verification, phone call)
   - Download certificate as PKCS#12 (.pfx) format

2. **Run Setup Script** (2 minutes)
   ```powershell
   .\scripts\setup-code-signing.ps1
   ```
   - Follow the prompts
   - It will configure everything automatically

3. **Build Signed Installer** (5 minutes)
   ```powershell
   npm run dist:win
   ```

4. **Verify It Worked**
   ```powershell
   .\scripts\verify-installer.ps1
   ```
   - Should show: `[PASS] Signature Status - Valid`

5. **Upload New Installer to GitHub Releases**
   - Replace the unsigned installer with the signed one
   - Users will no longer see virus warnings!

**Total time: ~1-2 hours (mostly waiting for certificate approval)**

---

### Option 2: Sectigo Standard Certificate (~$100/year)
Similar process, slightly more expensive but good reputation.

---

### Option 3: EV Certificate (~$350-500/year) - Best for Long Term
**Instant SmartScreen reputation, no warnings ever**

- DigiCert: https://www.digicert.com/code-signing
- Sectigo: https://sectigo.com/ssl-certificates-tls/code-signing
- GlobalSign: https://www.globalsign.com/en/code-signing-certificate

Takes longer to set up (requires notarized documents, hardware token), but provides the best user experience.

---

## What Changed in electron-builder.json

✅ Code signing is now **ENABLED**
✅ NSIS installer target added (this is what users download)
✅ Will automatically sign when `CSC_LINK` environment variable is set

## Next Steps

1. **Purchase a certificate** (choose Option 1 for fastest setup)
2. **Run the setup script** to configure it
3. **Build a new signed installer**
4. **Upload to GitHub Releases**
5. **Virus warnings will be GONE!**

## Important Notes

- The certificate must be from a trusted Certificate Authority (CA)
- Self-signed certificates won't work - Windows won't trust them
- Once signed, all future releases must also be signed
- The certificate expires yearly and needs renewal

## Cost Breakdown

- **SSL.com Standard**: ~$75/year (cheapest, works great)
- **Sectigo Standard**: ~$100/year
- **EV Certificate**: ~$350-500/year (best reputation)

For a small developer, SSL.com Standard is the best value and will eliminate 99% of warnings.
