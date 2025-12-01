# Changelog

All notable changes to Local Password Vault will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.1] - 2025-12-01

### ✨ New Features

#### Sound Effects System
- Added optional UI sound effects for interactions
- Success, click, and error sounds
- Toggle in Settings → Sound Effects
- Respects user preferences (off by default)

#### Landing Page
- New marketing landing page component (`src/components/LandingPage.tsx`)
- Standalone HTML version for website deployment (`public/landing.html`)
- Sections: Hero, Stats, Features, Security, Testimonials, Pricing, Download
- Animated counters, particle effects, interactive password demo
- Trial signup form (requires backend integration)

### 📝 Documentation
- Added `docs/DEVELOPER_GUIDE.md` — Integration guide for developers
- Documents trial form API integration points
- Preview routes documentation
- Color palette reference

### 🔧 Developer Experience
- Landing page preview route: `/?preview=landing`
- Purchase success page preview: `/?preview=success`

---

## [1.2.0] - 2024-12-01

### 🔒 Security Enhancements

#### Authentication
- **Rate Limiting**: Login attempts limited to 5 before 30-second lockout
- **Stronger Passwords**: Minimum 12 characters for new vault creation
- **Auto-Lock**: Configurable timeout with user activity detection
- **Lockout Persistence**: Rate limiting survives page refresh

#### Encryption & Data Protection
- **Encrypted Export**: Password-protected AES-256-GCM backup option
- **Encrypted Import**: Restore from secure backup files
- **BIP39 Recovery Phrase**: Expanded to full 2048-word standard (132 bits entropy)
- **Constant-Time Comparison**: Prevents timing attacks on recovery phrase verification
- **Input Sanitization**: All entry fields sanitized before storage
- **Memory Security**: Enhanced clearing of sensitive data from memory

#### Infrastructure
- **Content Security Policy**: Added CSP headers (web and Electron)
- **Clipboard Auto-Clear**: Configurable timeout with content verification

### ✨ Features

#### User Interface
- **Dashboard**: New overview page with security score and statistics
- **Settings Page**: Comprehensive settings with bouncy card design
- **Weak Passwords View**: Click dashboard card to filter weak passwords
- **Expand/Collapse Cards**: Click card header to reveal password details
- **Removed Toggle Arrow**: Simplified card interaction (click anywhere on header)

#### Navigation & Branding
- **Renamed**: "Add Password" → "Add Account" throughout app
- **Brand Consistency**: "Local Password Vault" used everywhere
- **Dashboard Link**: Replaced "All" with "Dashboard" in navigation
- **Gold Underline**: Navigation hover effect

#### Export/Import
- **4 Export Options**: CSV, Encrypted JSON, JSON Import, Encrypted Import
- **Quick Actions**: Moved Import/Export to Settings page

### 🐛 Bug Fixes

- Fixed app freezing when clicking left navigation
- Fixed blank page after deleting an account
- Fixed Mini Vault drag getting stuck (added safety timeout, blur handlers)
- Fixed infinite re-render loop in app status loading
- Fixed modal positioning (lowered delete confirmation dialogs)
- Removed redundant expand/collapse arrow from password cards

### 🎨 UI/UX Improvements

- Modal header color matches left nav button (steel blue gradient)
- Subtitle text darkened for better contrast on blue headers
- Action buttons always visible on password cards (not hover-only)
- Password cards have bounce effect with blue border on hover
- Empty state content raised for better visual centering
- Professional action buttons in entry forms

### 🏗️ Code Quality

- Removed unused imports (ChevronRight, ChevronDown)
- Added sanitization utilities (`src/utils/sanitization.ts`)
- Enhanced memory security utilities
- Improved error handling in drag operations
- Added TypeScript types for new features

---

## [1.1.0] - 2024-11-15

### Added
- Password Generator with strength indicator
- Recovery Phrase system for password reset
- Mini Vault floating panel
- Category-based organization
- Search functionality

### Changed
- Improved encryption to AES-256-GCM
- Enhanced UI with Tailwind CSS
- Better mobile responsiveness

### Security
- PBKDF2 key derivation (100,000 iterations)
- Local-only storage (no cloud)

---

## [1.0.0] - 2024-10-01

### Initial Release
- Core password management functionality
- Master password authentication
- AES encryption for vault data
- Cross-platform Electron support
- Basic categories (Banking, Shopping, etc.)
- Import/Export functionality

---

## Upgrade Notes

### From 1.1.x to 1.2.0
- **No data migration required** — existing vaults work automatically
- **New master passwords** must be 12+ characters (existing passwords unaffected)
- **Recovery phrase** now uses BIP39 standard — old phrases still work
- **Settings** moved from sidebar to dedicated page

### Security Recommendations
1. Enable Auto-Lock (Settings → Security)
2. Set Clipboard Clear timeout (Settings → Security)
3. Use the Encrypted Export for backups
4. Save your 12-word recovery phrase securely

---

[1.2.0]: https://github.com/kwilhelm1967/Vault/releases/tag/v1.2.0
[1.1.0]: https://github.com/kwilhelm1967/Vault/releases/tag/v1.1.0
[1.0.0]: https://github.com/kwilhelm1967/Vault/releases/tag/v1.0.0

