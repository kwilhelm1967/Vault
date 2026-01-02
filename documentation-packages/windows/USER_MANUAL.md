# Local Password Vault - User Manual

**Version 1.2.0** | © 2025 Local Password Vault

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Core Features](#core-features)
4. [Security Features](#security-features)
5. [License & Activation](#license--activation)
6. [Settings & Preferences](#settings--preferences)
7. [Import & Export](#import--export)
8. [Tips & Best Practices](#tips--best-practices)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [Support](#support)

---

## Introduction

**Local Password Vault** is a professional-grade password manager that keeps your passwords secure on your device. Your data never leaves your computer—no cloud storage, no subscriptions, no compromises.

### Key Features

- 🔒 **Military-Grade Encryption** - AES-256-GCM encryption
- 🏠 **100% Offline** - Works without internet after activation
- 🔐 **Device Binding** - Secure license activation
- 📱 **Cross-Platform** - Windows, macOS, Linux, and Web
- 🎯 **Easy to Use** - Intuitive interface
- 🛡️ **Privacy-First** - Zero data collection

---

## Getting Started

### Installation

1. **Download** the installer from [LocalPasswordVault.com](https://localpasswordvault.com)
2. **Run** the installer and follow the setup wizard
3. **Launch** the application

### First Launch

When you first open Local Password Vault:

1. **Create Your Master Password**
   - Minimum 12 characters
   - Use a mix of uppercase, lowercase, numbers, and symbols
   - This password encrypts all your data—choose wisely
   - You cannot recover this password if forgotten

2. **Save Your Recovery Phrase**
   - You'll see a 12-word recovery phrase
   - Write it down and store it securely
   - This is your only way to recover your vault if you forget your master password

3. **Start Using Your Vault**
   - Once your vault is created, you can start adding passwords

---

## Core Features

### Dashboard

The dashboard provides an overview of your vault:

- **Security Score** - Overall security rating
- **Total Entries** - Number of passwords stored
- **Categories** - Breakdown by category
- **Password Age** - Warnings for old passwords
- **Recent Activity** - Latest changes

### Adding Passwords

1. Click the **"+"** button or press `Ctrl+N` (Windows/Linux) or `Cmd+N` (Mac)
2. Fill in the entry details:
   - **Title** - Name for this entry (required)
   - **Username** - Your username or email
   - **Password** - Your password (or generate one)
   - **URL** - Website URL (optional)
   - **Category** - Banking, Shopping, Email, etc.
   - **Notes** - Additional information
3. Click **"Save"**

### Password Generator

Generate strong, random passwords:

1. Click the **key icon** in the password field
2. Configure options:
   - **Length** - 8 to 64 characters
   - **Include uppercase** - A-Z
   - **Include lowercase** - a-z
   - **Include numbers** - 0-9
   - **Include symbols** - !@#$%^&*
3. Click **"Generate"**
4. Click **"Copy"** to copy to clipboard

### Searching & Filtering

- **Search Bar** - Type to search titles, usernames, URLs, or notes
- **Category Filter** - Click a category in the sidebar
- **Quick Search** - Press `Ctrl+F` (Windows/Linux) or `Cmd+F` (Mac)

### Editing Entries

1. Click an entry to open it
2. Click the **edit icon** (pencil)
3. Make your changes
4. Click **"Save"**

### Deleting Entries

1. Click an entry to open it
2. Click the **delete icon** (trash)
3. Confirm deletion
4. **Undo** - You have 5 seconds to undo deletion

### Categories

Organize passwords into categories:

- **Banking** - Financial accounts
- **Shopping** - Online stores
- **Entertainment** - Streaming, games
- **Email** - Email accounts
- **Work** - Work-related accounts
- **Business** - Business accounts
- **Other** - Everything else

---

## Security Features

### Encryption

All your data is encrypted using:

- **AES-256-GCM** - Military-grade encryption
- **PBKDF2** - 100,000 iterations for key strengthening
- **Unique IV** - Each encryption uses a unique initialization vector

### Auto-Lock

Protect your vault when away:

1. Go to **Settings** → **Auto-Lock**
2. Choose timeout: 1 min, 5 min, 15 min, 30 min, or Never
3. Vault locks automatically after inactivity

### Rate-Limited Login

- Maximum **5 failed attempts**
- **30-second lockout** after 5 failures
- Protects against brute-force attacks

### Clipboard Auto-Clear

Passwords copied to clipboard are automatically cleared:

1. Go to **Settings** → **Clipboard Clear**
2. Choose timeout: 15s, 30s, 60s, or Never
3. Clipboard clears after timeout

### Password Strength Meter

Visual feedback on password quality:

- **Weak** - Red indicator
- **Fair** - Yellow indicator
- **Good** - Green indicator
- **Strong** - Dark green indicator

### Password Age Alerts

Get warnings for passwords older than 90 days:

- **Yellow warning** - Password 90+ days old
- **Red warning** - Password 180+ days old
- Update passwords regularly for better security

### 2FA/TOTP Support

Generate authenticator codes:

1. Open an entry
2. Click **"2FA"** tab
3. Enter your TOTP secret
4. View current code
5. Codes refresh every 30 seconds

---

## License & Activation

### Activating Your License

1. **Purchase** a license from [LocalPasswordVault.com](https://localpasswordvault.com)
2. **Receive** your license key via email
3. **Open** the app
4. **Enter** your license key (format: `XXXX-XXXX-XXXX-XXXX`)
5. **Accept** the End User License Agreement (EULA)
6. **Activate** - Your license is now active

### License Types

- **Personal Vault** - $49, 1 device, lifetime
- **Family Vault** - $79, 5 devices, lifetime
- **Free Trial** - 7 days, 1 device

### Transferring Your License

If you need to move your license to a new device:

1. **Activate** on new device
2. **Confirm transfer** when prompted
3. **License transfers** to new device
4. **Old device** is deactivated

**Note:** Limited to 3 transfers per year.

### Offline Operation

After activation, the app works **100% offline**:

- ✅ No internet required
- ✅ No phone-home functionality
- ✅ No data collection
- ✅ All validation is local

---

## Settings & Preferences

### Auto-Lock Timeout

Control when your vault locks:

- **1 minute** - Most secure
- **5 minutes** - Recommended
- **15 minutes** - Convenient
- **30 minutes** - Less secure
- **Never** - Not recommended

### Clipboard Clear Timeout

Control when clipboard clears:

- **15 seconds** - Most secure
- **30 seconds** - Recommended
- **60 seconds** - Convenient
- **Never** - Not recommended

### Show Passwords

Toggle password visibility:

- **Off** - Passwords hidden (default)
- **On** - Passwords visible

### Sound Effects

Enable/disable sound effects:

- **On** - Audio feedback for actions
- **Off** - Silent operation

### Theme

The app uses a dark theme optimized for security and eye comfort.

---

## Import & Export

### Exporting Your Vault

Create a backup of your data:

1. Go to **Settings** → **Export**
2. Choose format:
   - **CSV** - Unencrypted spreadsheet
   - **Encrypted JSON** - Password-protected backup
3. **Save** the file securely

### Importing Data

Restore from a backup:

1. Go to **Settings** → **Import**
2. Select your backup file
3. Enter password (if encrypted)
4. **Import** - Data is restored

### Import Formats

- **CSV** - Standard spreadsheet format
- **Encrypted JSON** - Secure backup format
- **Standard JSON** - Unencrypted JSON

---

## Tips & Best Practices

### Master Password

- **Use a strong password** - Mix of characters, numbers, symbols
- **Never share it** - Keep it private
- **Store recovery phrase** - Write it down securely
- **Don't forget it** - There's no password recovery

### Password Management

- **Use unique passwords** - Different password for each site
- **Generate strong passwords** - Use the password generator
- **Update regularly** - Change passwords every 90 days
- **Use 2FA** - Enable two-factor authentication where possible

### Security

- **Enable auto-lock** - Protect your vault when away
- **Use clipboard clear** - Prevent password exposure
- **Keep app updated** - Install updates for security fixes
- **Backup regularly** - Export encrypted backups

### Organization

- **Use categories** - Organize passwords by type
- **Add notes** - Store additional information
- **Use search** - Quickly find passwords
- **Keep it clean** - Delete unused entries

---

## Keyboard Shortcuts

### General

- `Ctrl+N` / `Cmd+N` - New entry
- `Ctrl+F` / `Cmd+F` - Search
- `Ctrl+S` / `Cmd+S` - Save entry
- `Ctrl+W` / `Cmd+W` - Close modal
- `Esc` - Cancel/Close
- `Ctrl+,` / `Cmd+,` - Settings

### Navigation

- `Ctrl+1` / `Cmd+1` - Dashboard
- `Ctrl+2` / `Cmd+2` - All entries
- `Ctrl+3` / `Cmd+3` - Banking
- `Ctrl+4` / `Cmd+4` - Shopping
- `Ctrl+5` / `Cmd+5` - Entertainment
- `Ctrl+6` / `Cmd+6` - Email
- `Ctrl+7` / `Cmd+7` - Work
- `Ctrl+8` / `Cmd+8` - Business
- `Ctrl+9` / `Cmd+9` - Other

### Entry Operations

- `Enter` - Open entry
- `Delete` - Delete entry
- `Ctrl+C` / `Cmd+C` - Copy password
- `Ctrl+V` / `Cmd+V` - Paste
- `Ctrl+Z` / `Cmd+Z` - Undo

---

## Support

### Getting Help

- **Email**: support@localpasswordvault.com
- **Website**: [LocalPasswordVault.com](https://localpasswordvault.com)
- **Documentation**: See troubleshooting guide

### Common Questions

**Q: Can I recover my master password?**  
A: No. If you forget your master password, use your recovery phrase to restore access.

**Q: Does the app work offline?**  
A: Yes. After activation, the app works 100% offline.

**Q: Can I use the same license on multiple devices?**  
A: Personal licenses are for 1 device. Family licenses support 5 devices.

**Q: How do I transfer my license?**  
A: Activate on the new device and confirm the transfer when prompted.

**Q: Is my data stored in the cloud?**  
A: No. All data is stored locally on your device.

**Q: Can I export my passwords?**  
A: Yes. Go to Settings → Export to create a backup.

---

## Appendix

### System Requirements

- **Windows**: Windows 10 or later
- **macOS**: macOS 10.15 or later
- **Linux**: Modern Linux distribution
- **Web**: Modern browser (Chrome, Firefox, Edge, Safari)

### File Locations

- **Windows**: `%APPDATA%\Local Password Vault\`
- **macOS**: `~/Library/Application Support/Local Password Vault/`
- **Linux**: `~/.config/Local Password Vault/`

### Version History

- **1.2.0** - Current version
- See changelog for full history

---

**© 2025 Local Password Vault. All rights reserved.**

*Your passwords. Your device. Your control.*
