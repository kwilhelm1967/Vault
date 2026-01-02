# Troubleshooting Guide
## Local Password Vault

Solutions to common issues and questions.

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Activation Issues](#activation-issues)
3. [Login Issues](#login-issues)
4. [Data Issues](#data-issues)
5. [Performance Issues](#performance-issues)
6. [License Issues](#license-issues)
7. [Export/Import Issues](#exportimport-issues)
8. [General Questions](#general-questions)

---

## Installation Issues

### App Won't Install

**Symptoms:**
- Installer fails to run
- Error message during installation
- Installation hangs

**Solutions:**

1. **Check system requirements**
   - Windows: Windows 10 or later
   - macOS: macOS 10.15 or later
   - Linux: Modern distribution

2. **Run as administrator** (Windows)
   - Right-click installer
   - Select "Run as administrator"

3. **Disable antivirus temporarily**
   - Some antivirus software blocks installers
   - Re-enable after installation

4. **Check disk space**
   - Ensure at least 100MB free space

5. **Download again**
   - File may be corrupted
   - Download fresh copy from website

---

### App Won't Launch

**Symptoms:**
- App doesn't start
- Crashes immediately
- Blank screen

**Solutions:**

1. **Restart your computer**
   - Simple restart often fixes issues

2. **Check for updates**
   - Install latest version from website

3. **Clear app data** (last resort)
   - Windows: Delete `%APPDATA%\Local Password Vault\`
   - macOS: Delete `~/Library/Application Support/Local Password Vault/`
   - Linux: Delete `~/.config/Local Password Vault/`
   - ⚠️ **This will delete your vault data**

4. **Reinstall the app**
   - Uninstall completely
   - Download fresh installer
   - Install again

---

## Activation Issues

### License Key Not Working

**Symptoms:**
- "Invalid license key" error
- Activation fails
- Key not recognized

**Solutions:**

1. **Check key format**
   - Format: `XXXX-XXXX-XXXX-XXXX`
   - All uppercase letters
   - No spaces before/after

2. **Copy key correctly**
   - Copy entire key from email
   - Paste without modifications
   - Check for typos

3. **Verify key type**
   - Personal: Starts with `PERS-`
   - Family: Starts with `FMLY-`
   - Trial: Starts with `TRIA-`

4. **Check internet connection**
   - Activation requires internet
   - Check connection and try again

5. **Contact support**
   - Email: support@localpasswordvault.com
   - Include your license key (first 4 characters only)

---

### Device Mismatch Error

**Symptoms:**
- "License active on another device"
- Transfer required message
- Can't activate on new device

**Solutions:**

1. **Transfer your license**
   - Click "Transfer License" when prompted
   - Confirm transfer
   - License moves to new device

2. **Check transfer limit**
   - Limited to 3 transfers per year
   - If limit reached, contact support

3. **Verify device**
   - Make sure you're on the correct device
   - Check device fingerprint matches

---

### Trial Key Not Working

**Symptoms:**
- Trial key rejected
- "Invalid trial key" error
- Trial already used

**Solutions:**

1. **Check trial status**
   - Each email can only use trial once
   - If already used, purchase a license

2. **Verify email**
   - Use the same email that received trial key
   - Check spam folder for trial email

3. **Check expiration**
   - Trial keys expire after 7 days
   - If expired, purchase a license

4. **Request new trial**
   - Use different email address
   - Or purchase a license

---

## Login Issues

### Forgot Master Password

**Symptoms:**
- Can't remember password
- Login fails
- Locked out of vault

**Solutions:**

1. **Use recovery phrase**
   - Enter your 12-word recovery phrase
   - Create new master password
   - Vault is restored

2. **If no recovery phrase**
   - ⚠️ **Vault cannot be recovered**
   - You'll need to create a new vault
   - Previous data is lost

3. **Prevention**
   - Write down recovery phrase
   - Store it securely
   - Never lose it

---

### Too Many Failed Attempts

**Symptoms:**
- "Too many failed attempts" error
- 30-second lockout
- Can't login

**Solutions:**

1. **Wait 30 seconds**
   - Lockout is temporary
   - Try again after timeout

2. **Remember your password**
   - Use recovery phrase if forgotten
   - Check password manager notes

3. **Reset vault** (last resort)
   - Delete app data
   - Create new vault
   - ⚠️ **All data will be lost**

---

### Vault Won't Unlock

**Symptoms:**
- Correct password but won't unlock
- Error message
- Vault stays locked

**Solutions:**

1. **Check password**
   - Verify correct password
   - Check for caps lock
   - Check for typos

2. **Try recovery phrase**
   - Use recovery phrase to restore
   - Create new master password

3. **Check vault file**
   - Vault file may be corrupted
   - Restore from backup if available

4. **Contact support**
   - Email: support@localpasswordvault.com
   - Include error message

---

## Data Issues

### Passwords Not Saving

**Symptoms:**
- New entries don't appear
- Changes not saved
- Data disappears

**Solutions:**

1. **Check vault is unlocked**
   - Vault must be unlocked to save
   - Unlock vault first

2. **Check disk space**
   - Ensure sufficient free space
   - Clear disk space if needed

3. **Check storage permissions**
   - App needs write permissions
   - Grant permissions if prompted

4. **Restart app**
   - Close and reopen app
   - Try saving again

---

### Data Missing or Corrupted

**Symptoms:**
- Entries disappeared
- Corrupted data
- Can't open vault

**Solutions:**

1. **Restore from backup**
   - Use latest encrypted backup
   - Import backup file
   - Data is restored

2. **Check backup location**
   - Look for `.json` backup files
   - Check export location

3. **If no backup**
   - ⚠️ **Data may be lost**
   - Contact support for help
   - May need to recreate entries

4. **Prevention**
   - Export backups regularly
   - Store backups securely
   - Multiple backup locations

---

### Can't Find Password

**Symptoms:**
- Entry not visible
- Search not working
- Entry disappeared

**Solutions:**

1. **Check search**
   - Clear search field
   - Try different search terms
   - Check category filter

2. **Check all categories**
   - Click "All" category
   - Check each category
   - Entry may be in different category

3. **Check if deleted**
   - Check trash/recently deleted
   - Undo if within 5 seconds
   - Restore from backup if needed

---

## Performance Issues

### App is Slow

**Symptoms:**
- Slow to load
- Laggy interface
- Slow search

**Solutions:**

1. **Check vault size**
   - Large vaults (1000+ entries) may be slower
   - Consider organizing entries
   - Use categories effectively

2. **Close other apps**
   - Free up system resources
   - Close unnecessary programs
   - Restart computer

3. **Check system resources**
   - Ensure sufficient RAM
   - Check CPU usage
   - Close background processes

4. **Update app**
   - Install latest version
   - Performance improvements in updates

---

### High Memory Usage

**Symptoms:**
- App uses too much memory
- System slows down
- Memory warnings

**Solutions:**

1. **Reduce vault size**
   - Delete unused entries
   - Organize entries
   - Export old entries

2. **Close and reopen**
   - Restart app periodically
   - Clears memory cache

3. **Update app**
   - Latest version may have fixes
   - Install updates

---

## License Issues

### License Expired

**Symptoms:**
- "License expired" message
 - Can't use app
- Trial ended

**Solutions:**

1. **Purchase license**
   - Go to [LocalPasswordVault.com](https://localpasswordvault.com)
   - Purchase Personal ($49) or Family ($79)
   - Activate new license key

2. **Check trial status**
   - Trial lasts 7 days
   - If expired, purchase license

---

### Can't Transfer License

**Symptoms:**
- Transfer fails
- "Transfer limit reached"
- Can't move to new device

**Solutions:**

1. **Check transfer limit**
   - Limited to 3 transfers per year
   - If limit reached, wait for reset
   - Or contact support

2. **Verify internet connection**
   - Transfer requires internet
   - Check connection
   - Try again

3. **Contact support**
   - Email: support@localpasswordvault.com
   - Request transfer assistance

---

## Export/Import Issues

### Export Fails

**Symptoms:**
- Export doesn't work
- File not created
- Error message

**Solutions:**

1. **Check vault is unlocked**
   - Unlock vault first
   - Then try export

2. **Check disk space**
   - Ensure sufficient space
   - Clear space if needed

3. **Check file permissions**
   - App needs write permissions
   - Grant permissions

4. **Try different location**
   - Save to different folder
   - Check folder permissions

---

### Import Fails

**Symptoms:**
- Import doesn't work
- "Invalid file" error
- Data not imported

**Solutions:**

1. **Check file format**
   - Must be `.json` or `.csv`
   - Verify file is not corrupted
   - Check file size

2. **Check password** (encrypted files)
   - Enter correct password
   - Check for typos
   - Try different password

3. **Check file compatibility**
   - File must be from compatible version
   - Export from same version if possible

4. **Try different file**
   - Use different backup
   - Export fresh backup
   - Try again

---

## General Questions

### Does the app work offline?

**Answer:** Yes! After activation, the app works 100% offline. No internet required.

### Is my data stored in the cloud?

**Answer:** No. All data is stored locally on your device. Nothing is sent to servers.

### Can I use the same license on multiple devices?

**Answer:** 
- **Personal license**: 1 device only
- **Family license**: 5 devices
- Transfer license to move between devices

### How do I backup my data?

**Answer:**
1. Go to Settings → Export
2. Choose "Encrypted JSON"
3. Enter backup password
4. Save file securely

### Can I recover my master password?

**Answer:** Only with your recovery phrase. If you lose both, the vault cannot be recovered.

### Is the app secure?

**Answer:** Yes. Uses AES-256-GCM encryption, PBKDF2 key derivation, and all data stays on your device.

### How do I update the app?

**Answer:** Download the latest version from [LocalPasswordVault.com](https://localpasswordvault.com) and install over existing version.

---

## Still Need Help?

If you've tried all solutions and still have issues:

1. **Email Support**: support@localpasswordvault.com
   - Include error messages
   - Describe what you were doing
   - Include app version

2. **Check Documentation**
   - User Manual: See USER_MANUAL.md
   - Quick Start: See QUICK_START_GUIDE.md

3. **Visit Website**: [LocalPasswordVault.com](https://localpasswordvault.com)

---

**We're here to help!** Contact support for assistance with any issues.

*Your passwords. Your device. Your control.*

