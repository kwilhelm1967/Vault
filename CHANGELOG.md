# Changelog

All notable changes to Local Password Vault will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - December 2025

### Highlights
- Password Age Alerts
- Enhanced Accessibility
- Premium Floating Button
- Comprehensive FAQ System
- UI Consistency Improvements

### Added
- Password age warnings for entries >90 days old
- Undo delete with 5-second recovery window
- Offline indicator when network unavailable
- ARIA live regions for screen readers
- Keyboard navigation improvements
- Focus trap for modal dialogs
- Skip-to-content link for accessibility
- Installer verification script
- Comprehensive FAQ section with categorized Q&A
- License transfer system for device changes
- Import functionality from competitor password managers (LastPass, 1Password, Chrome, Bitwarden, Dashlane, Keeper)

### Improved
- Floating button with premium design and smooth hover animations
- Debounced search for better performance
- Micro-interactions and animations throughout
- Component architecture (vault components modularized)
- Modal consistency - all modals now use edge-to-edge patterned backdrop
- Gold accent color scheme applied consistently
- Dropdown menus with polished styling
- Form design matching Legacy Vault aesthetic
- Dashboard redesigned with individual account cards
- Responsive layouts for various screen sizes

### Fixed
- npm security vulnerabilities
- Onboarding tutorial only shows on first-time setup (not every login)
- Empty state messages now context-aware (no misleading "All passwords strong" when empty)
- Floating button hover effect no longer clips corners
- Modal backgrounds now consistent across all dialogs

### Security
- Removed breach check API to maintain offline promise
- All console.log debug statements removed from production code
- Dev testing tools hidden in production builds

---

## [1.1.0] - November 2025

### Highlights
- 2FA/TOTP Support
- Custom Fields
- Password History

### Added
- Built-in 2FA/TOTP authenticator
- Custom fields for any data type
- Secure notes entry type
- Password history tracking
- Password strength meter
- Bulk delete operations
- Favorites for quick access

### Improved
- Dashboard with security score
- Entry card expand/collapse functionality

### Fixed
- Memory leaks in trial status checking

---

## [1.0.0] - October 2025

### Highlights
- Initial Release
- AES-256 Encryption
- Cross-Platform Support

### Added
- AES-256-GCM encryption with PBKDF2 (100,000 iterations)
- Cross-platform support (Windows, Mac, Linux)
- Floating mini vault panel (Electron)
- Password generator with customizable options
- Encrypted backup/restore functionality
- 12-word BIP39 recovery phrase
- Auto-lock timeout (configurable)
- Clipboard auto-clear
- Rate-limited login (5 attempts / 30s lockout)
- Category organization (Banking, Shopping, Entertainment, Email, Work, Business, Other)
- Export to CSV and encrypted JSON
- Import from JSON backup

---

## Version History Summary

| Version | Date | Key Features |
|---------|------|--------------|
| 1.2.0 | Dec 2025 | Password age alerts, accessibility, FAQ system |
| 1.1.0 | Nov 2025 | 2FA/TOTP, custom fields, password history |
| 1.0.0 | Oct 2025 | Initial release with AES-256 encryption |

---

**Full documentation**: [README.md](./README.md)  
**Support**: support@LocalPasswordVault.com
