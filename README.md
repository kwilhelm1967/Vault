# 🔐 Local Password Vault

A professional-grade, offline-first password management application built with React, TypeScript, and Electron. Your passwords stay on YOUR device — no cloud, no subscriptions, no compromises.

**Official Website**: [LocalPasswordVault.com](https://LocalPasswordVault.com) | **Support**: support@LocalPasswordVault.com

---

## ✨ Features

### 🛡️ Security
- **AES-256-GCM Encryption** — Military-grade local encryption
- **PBKDF2 Key Derivation** — 100,000 iterations for password strengthening
- **Rate-Limited Login** — 5 attempts before 30-second lockout
- **Auto-Lock** — Configurable timeout with activity detection
- **Clipboard Auto-Clear** — Passwords cleared from clipboard automatically
- **12-Word Recovery Phrase** — BIP39-standard recovery with 2048-word list
- **Content Security Policy** — XSS attack prevention
- **Input Sanitization** — All entries sanitized before storage
- **Constant-Time Comparison** — Timing attack prevention
- **Memory Security** — Sensitive data cleared from memory

### 💻 Cross-Platform
- **Windows** — `.exe` installer
- **macOS** — `.dmg` disk image  
- **Linux** — `.AppImage` portable
- **Web** — Works in any modern browser

### 🎯 User Experience
- **Mini Vault** — Floating panel for quick access (Electron)
- **Dashboard** — Overview with security score and statistics
- **Categories** — Banking, Shopping, Entertainment, Email, Work, Business, Other
- **Search & Filter** — Debounced search for instant results
- **Password Generator** — Customizable strong password creation
- **Password Strength Meter** — Visual feedback on password quality
- **Password Age Alerts** — Warnings for passwords >90 days old
- **2FA/TOTP Built-in** — Generate authenticator codes
- **Custom Fields** — Add any data to entries
- **Secure Notes** — Store sensitive text
- **Password History** — Track previous passwords
- **Undo Delete** — 5-second window to restore
- **Offline Indicator** — Know when you're offline
- **Encrypted Export/Import** — Password-protected backups
- **Keyboard Accessible** — Full keyboard navigation

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
# Install dependencies
npm install

# Start development server (web)
npm run dev:vite

# Start with Electron (desktop)
npm run dev
```

### Build for Production
```bash
# Build web version
npm run build

# Build desktop applications
npm run dist
```

---

## 🏗️ Technical Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS |
| **Build** | Vite 5 |
| **Desktop** | Electron 28 |
| **Encryption** | Web Crypto API (AES-256-GCM, PBKDF2) |
| **Icons** | Lucide React |

---

## 🔒 Security Architecture

### Encryption Flow
1. Master password → PBKDF2 (100k iterations) → 256-bit key
2. Vault data → AES-256-GCM encryption → Local storage
3. Recovery phrase → BIP39 word list → PBKDF2 hash

### Security Features

| Feature | Implementation |
|---------|----------------|
| Password Storage | AES-256-GCM encrypted |
| Key Derivation | PBKDF2 with 100,000 iterations |
| Login Protection | Rate limiting (5 attempts / 30s lockout) |
| Session Security | Auto-lock on inactivity |
| Clipboard | Auto-clear after configurable timeout |
| Recovery | 12-word BIP39 phrase (132 bits entropy) |
| Export | Optional encrypted backup (AES-256-GCM) |
| XSS Prevention | Content Security Policy headers |
| Input Validation | Sanitization on all user inputs |

---

## 📁 Project Structure

```
LocalPasswordVault/
├── electron/           # Electron main process
│   ├── main.js        # Main window, floating panel, IPC
│   ├── preload.js     # Context bridge for renderer
│   └── secure-storage.js
├── src/
│   ├── components/    # React components
│   │   ├── MainVault.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Settings.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── EntryForm.tsx
│   │   ├── PasswordGenerator.tsx
│   │   └── ...
│   ├── utils/         # Core utilities
│   │   ├── storage.ts          # Encrypted storage service
│   │   ├── memorySecurity.ts   # Memory clearing
│   │   ├── sanitization.ts     # Input sanitization
│   │   ├── recoveryPhrase.ts   # BIP39 recovery
│   │   └── ...
│   ├── hooks/         # Custom React hooks
│   ├── types/         # TypeScript definitions
│   └── config/        # Environment configuration
├── public/            # Static assets
├── LPV/               # Front-end HTML pages
│   ├── index.html     # Entry point with CSP (React app)
│   ├── pricing.html   # Pricing page
│   ├── success.html   # Purchase success page
│   └── ...            # Other static pages
```

---

## ⚙️ Settings

Access via **Settings** in the left navigation:

| Setting | Options | Default |
|---------|---------|---------|
| Auto-Lock Timeout | 1min, 5min, 15min, 30min, Never | 5 minutes |
| Clipboard Clear | 15s, 30s, 60s, Never | 30 seconds |
| Show Passwords | On/Off | Off |

### Quick Actions
- **Export (CSV)** — Unencrypted spreadsheet
- **Export (Encrypted)** — Password-protected JSON backup
- **Import (JSON)** — Standard backup restore
- **Import (Encrypted)** — Restore from secure backup
- **Change Master Password**
- **Clear All Data**

---

## 🔑 Password Requirements

### Master Password (New Vault)
- Minimum 12 characters
- Recommended: uppercase, lowercase, numbers, symbols

### Generated Passwords
- Configurable length (8-64 characters)
- Options: uppercase, lowercase, numbers, symbols
- Strength indicator

---

## 📦 Build Outputs

| Platform | File | Location |
|----------|------|----------|
| Windows | `LocalPasswordVault Setup.exe` | `dist/` |
| macOS | `LocalPasswordVault.dmg` | `dist/` |
| Linux | `LocalPasswordVault.AppImage` | `dist/` |

---

## 🛠️ Development Commands

```bash
npm run dev           # Full dev (Vite + Electron)
npm run dev:vite      # Web only
npm run build         # Production build
npm run dist          # Build desktop apps
npm run lint          # Run ESLint
```

---

## 💰 Pricing

| Plan | Price | Keys | Devices |
|------|-------|------|---------|
| **Free Trial** | $0 | — | 1 (7 days) |
| **Personal Vault** | $49 | 1 | 1 (lifetime) |
| **Family Vault** | $79 | 5 | 5 (lifetime) |
| **Family Protection Bundle** | **$179** | **10** | **5 devices (both products)** |

*Save $29 when buying LPV Family + LLV Family together*

All paid plans are **one-time lifetime purchases** — no subscriptions, no recurring fees.

---

## 📄 License

Proprietary software. See LICENSE file for details.

---

## 🆘 Support

- **Website**: [LocalPasswordVault.com](https://LocalPasswordVault.com)
- **Email**: support@LocalPasswordVault.com
- **Issues**: [GitHub Issues](https://github.com/kwilhelm1967/Vault/issues)

---

**Version 1.2.0** | © 2025 Local Password Vault. All rights reserved.

