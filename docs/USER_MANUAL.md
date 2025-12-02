# Local Password Vault - User Manual

Welcome to Local Password Vault! This guide will help you get started and make the most of your secure password manager.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your Vault](#creating-your-vault)
3. [Adding Passwords](#adding-passwords)
4. [Managing Passwords](#managing-passwords)
5. [Categories & Organization](#categories--organization)
6. [Security Features](#security-features)
7. [Two-Factor Authentication](#two-factor-authentication)
8. [Backup & Export](#backup--export)
9. [Settings](#settings)
10. [Keyboard Shortcuts](#keyboard-shortcuts)
11. [Troubleshooting](#troubleshooting)
12. [FAQ](#faq)

---

## Getting Started

### Installation

1. Download the installer for your operating system
2. Run the installer and follow the prompts
3. Launch Local Password Vault

### System Requirements

- **Windows:** Windows 10 or later (64-bit)
- **Mac:** macOS 10.15 (Catalina) or later
- **Linux:** Ubuntu 20.04+ or equivalent

---

## Creating Your Vault

When you first open Local Password Vault, you'll create your master password.

### Choosing a Strong Master Password

Your master password is the key to your vault. Choose wisely:

✅ **Do:**
- Use at least 12 characters
- Mix uppercase, lowercase, numbers, and symbols
- Use a passphrase (e.g., "Coffee-Mountain-Blue-42!")
- Make it memorable to you

❌ **Don't:**
- Use personal information (birthdays, names)
- Use common words or phrases
- Reuse passwords from other accounts
- Write it down where others can find it

### Password Hint

You can optionally add a hint to help you remember your master password. This hint is stored locally and shown on the login screen.

> ⚠️ **Important:** Your master password cannot be recovered. If you forget it, your vault data cannot be accessed.

---

## Adding Passwords

### Quick Add

1. Click the **+** button or press `Ctrl+N`
2. Fill in the account details:
   - **Account Name:** A friendly name (e.g., "Gmail", "Netflix")
   - **Username:** Your login username or email
   - **Password:** Your password (or generate one)
   - **Category:** Select a category
   - **Website URL:** (Optional) The login page URL
   - **Notes:** (Optional) Additional information

3. Click **Save**

### Using the Password Generator

Don't create passwords yourself! Use the built-in generator:

1. Click the **dice icon** 🎲 next to the password field
2. Adjust settings:
   - **Length:** 12-32 characters (16+ recommended)
   - **Include:** Uppercase, lowercase, numbers, symbols
3. Click **Generate**
4. Click **Use Password**

### Adding Custom Fields

For accounts with additional information:

1. Click **Add Custom Field**
2. Enter a label (e.g., "PIN", "Security Question")
3. Enter the value
4. Toggle **Secret** if the value should be hidden

---

## Managing Passwords

### Viewing Passwords

- Click on any entry to expand it
- Click the **eye icon** 👁️ to reveal the password
- Passwords auto-hide after 30 seconds

### Copying Passwords

- Click the **copy icon** 📋 next to any field
- The value is copied to your clipboard
- Clipboard is automatically cleared after 30 seconds

### Editing Passwords

1. Click on an entry to expand it
2. Click the **Edit** button (pencil icon)
3. Make your changes
4. Click **Save**

### Deleting Passwords

1. Click on an entry to expand it
2. Click the **Delete** button (trash icon)
3. Confirm deletion
4. Use **Undo** within 5 seconds if needed

### Password History

When you change a password, the old one is saved:

1. Expand an entry
2. Scroll down to **Password History**
3. View previous passwords with dates

---

## Categories & Organization

### Default Categories

- **All** - View all entries
- **Banking** - Banks, credit cards, investments
- **Shopping** - E-commerce, retail accounts
- **Entertainment** - Streaming, gaming, social
- **Email** - Email accounts
- **Work** - Professional accounts
- **Business** - Business-related accounts
- **Other** - Everything else

### Using Categories

- Click a category in the sidebar to filter
- Assign categories when adding/editing entries
- Categories help you find passwords quickly

### Favorites

Mark frequently-used accounts as favorites:

1. Click the **star icon** ⭐ on any entry
2. Access favorites from the sidebar
3. Favorites appear at the top when sorted

---

## Security Features

### Auto-Lock

Your vault automatically locks after inactivity:

- Default: 5 minutes
- Configurable in Settings (1-60 minutes)
- Manual lock: Click the **lock icon** or press `Ctrl+L`

### Password Strength Meter

When adding/editing passwords, a strength meter shows:

- 🔴 **Weak** - Too short or simple
- 🟡 **Fair** - Could be stronger
- 🟢 **Strong** - Good password
- 💪 **Very Strong** - Excellent password

### Password Age Alerts

Passwords older than 90 days are flagged:

- View in Dashboard under "Old Passwords"
- Consider updating these regularly

### Weak Password Detection

The app identifies weak passwords:

- Less than 8 characters
- Common patterns
- No mix of character types

### Reused Password Detection

Using the same password for multiple accounts is risky. The app warns you about reused passwords.

---

## Two-Factor Authentication (2FA)

### Adding 2FA to an Entry

1. Edit an entry
2. Click **Add 2FA**
3. Enter the TOTP secret (from the service's QR code)
4. Save the entry

### Using 2FA

1. Expand an entry with 2FA enabled
2. View the 6-digit code
3. Code refreshes every 30 seconds
4. Click to copy

### Getting the TOTP Secret

Most services provide a QR code for 2FA. To get the secret:

1. Look for "Can't scan QR code?" or "Manual entry"
2. Copy the secret key (usually 16-32 characters)
3. Paste into Local Password Vault

---

## Backup & Export

### Exporting Your Vault

1. Go to **Settings** (gear icon)
2. Click **Export Data**
3. Choose format:
   - **JSON** - Full backup with all fields
   - **CSV** - Compatible with other password managers
4. Choose save location
5. Enter your master password to confirm

### Importing Data

1. Go to **Settings**
2. Click **Import Data**
3. Select your file (JSON or CSV)
4. Review imported entries
5. Click **Import**

### Backup Recommendations

- Export regularly (weekly or monthly)
- Store backups securely:
  - Encrypted USB drive
  - Encrypted cloud storage
  - Safe or safety deposit box
- Keep multiple backup copies

---

## Settings

### Auto-Lock Timeout

- How long before vault locks automatically
- Options: 1, 5, 15, 30, 60 minutes

### Clipboard Clear

- Automatically clear clipboard after copying
- Default: 30 seconds

### Sound Effects

- Enable/disable UI sounds
- Default: Enabled

### Password Hint

- View or update your password hint

### Clear All Data

- ⚠️ **Danger Zone**
- Permanently deletes all vault data
- Cannot be undone

---

## Keyboard Shortcuts

### Navigation

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Focus search |
| `Esc` | Clear search / Close modal |
| `↑` `↓` | Navigate entries |
| `Enter` | Open selected entry |

### Actions

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | Add new entry |
| `Ctrl+E` | Edit selected entry |
| `Ctrl+C` | Copy password |
| `Ctrl+Shift+C` | Copy username |
| `Del` | Delete selected entry |
| `Ctrl+Z` | Undo |

### Vault

| Shortcut | Action |
|----------|--------|
| `Ctrl+L` | Lock vault |
| `Ctrl+,` | Open settings |
| `?` | Show keyboard shortcuts |

---

## Troubleshooting

### Forgot Master Password

Unfortunately, your master password cannot be recovered. This is by design for security.

**Options:**
1. Try password variations you might have used
2. Check your password hint
3. If you have a backup, restore from that
4. As a last resort, reset the vault (loses all data)

### App Won't Open

**Windows:**
1. Right-click the app → "Run as Administrator"
2. Check if antivirus is blocking it
3. Reinstall the application

**Mac:**
1. Right-click → "Open" → "Open" again
2. Go to System Preferences → Security → "Open Anyway"

**Linux:**
1. Make the AppImage executable: `chmod +x LocalPasswordVault.AppImage`
2. Run from terminal to see errors

### Vault Won't Unlock

1. Check Caps Lock
2. Try typing password in a text editor first
3. Make sure you're using the correct vault

### Data Not Saving

1. Check disk space
2. Ensure app has write permissions
3. Try running as Administrator (Windows)

### Floating Panel Not Showing

1. Check if vault is unlocked
2. Look for the floating button on screen edges
3. Restart the application

---

## FAQ

### Is my data stored in the cloud?

**No.** All data is stored locally on your device only. No cloud, no servers, no tracking.

### What encryption is used?

AES-256-GCM with PBKDF2 key derivation (100,000 iterations). This is military-grade encryption.

### Can I sync across devices?

Local Password Vault is intentionally offline-only for maximum security. To transfer:
1. Export from one device
2. Securely transfer the file
3. Import on the other device

### What if I lose my device?

Your vault is encrypted with your master password. Without the password, the data cannot be accessed. However, you should:
1. Keep secure backups
2. Consider remote wiping if available
3. Change passwords for sensitive accounts

### How do I update the app?

Updates are checked automatically. When available:
1. A notification will appear
2. Click "Download" to get the update
3. The update installs when you restart

### Is it open source?

The core app is proprietary, but we're transparent about our security practices. See our Security documentation for details.

### Can I use it for my team/business?

Yes! The Family plan supports up to 5 users. For larger teams, contact us about enterprise options.

---

## Getting Help

### Support

- **Email:** support@localpasswordvault.com
- **Website:** https://localpasswordvault.com/support

### Report a Bug

- Visit: https://github.com/kwilhelm1967/Vault/issues
- Include: App version, OS, steps to reproduce

### Feature Requests

We love hearing from users! Submit ideas through:
- GitHub Issues
- Email support

---

*Last updated: December 2024*
*Version: 1.2.0*

