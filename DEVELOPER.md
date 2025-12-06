# 👨‍💻 Developer Guide - Local Password Vault

This document provides technical details for developers working on the Local Password Vault codebase.

---

## 📁 Project Architecture

### Directory Structure

```
LocalPasswordVault/
├── electron/                    # Electron main process
│   ├── main.js                 # Window management, IPC handlers
│   ├── preload.js              # Context bridge (secure API exposure)
│   └── secure-storage.js       # Secure file storage utilities
│
├── src/
│   ├── components/             # React components
│   │   ├── vault/              # Core vault components
│   │   │   ├── EntryCard.tsx       # Password entry display
│   │   │   ├── EntryDetailModal.tsx # Entry view modal
│   │   │   ├── DeleteConfirmModal.tsx
│   │   │   ├── VaultEmptyStates.tsx # Empty state displays
│   │   │   ├── VaultHeader.tsx
│   │   │   ├── VaultSidebar.tsx
│   │   │   ├── CustomFieldDisplay.tsx
│   │   │   ├── vaultColors.ts      # Color constants
│   │   │   └── index.ts            # Barrel exports
│   │   │
│   │   ├── settings/           # Settings components
│   │   │   ├── SettingsModals.tsx  # Export/Import/Clear modals
│   │   │   └── index.ts
│   │   │
│   │   ├── accessibility/      # A11y components
│   │   │   ├── FocusTrap.tsx
│   │   │   ├── LiveRegion.tsx
│   │   │   ├── SkipLink.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── auth/               # Authentication exports
│   │   ├── license/            # License management exports
│   │   ├── trial/              # Trial management exports
│   │   ├── modals/             # Modal component exports
│   │   ├── ui/                 # UI component exports
│   │   │
│   │   ├── MainVault.tsx       # Main vault interface
│   │   ├── Dashboard.tsx       # Dashboard view
│   │   ├── Settings.tsx        # Settings page
│   │   ├── EntryForm.tsx       # Add/Edit entry form
│   │   ├── LoginScreen.tsx     # Login/Setup screen
│   │   ├── FAQ.tsx             # FAQ page
│   │   └── ... (other components)
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useElectron.ts      # Electron integration
│   │   ├── useEntryManagement.ts # Entry CRUD operations
│   │   ├── useVaultState.ts    # Vault state management
│   │   └── index.ts
│   │
│   ├── utils/                  # Utility functions
│   │   ├── storage.ts          # Encrypted storage service
│   │   ├── validation.ts       # Input validation & sanitization
│   │   ├── licenseService.ts   # License management
│   │   ├── trialService.ts     # Trial management
│   │   ├── totp.ts             # 2FA/TOTP generation
│   │   ├── recoveryPhrase.ts   # BIP39 recovery phrase
│   │   ├── memorySecurity.ts   # Secure memory operations
│   │   ├── soundEffects.ts     # Audio feedback
│   │   └── index.ts
│   │
│   ├── types/                  # TypeScript definitions
│   │   └── index.ts
│   │
│   ├── styles/                 # Global styles
│   │   ├── theme.ts            # Theme configuration
│   │   └── index.ts
│   │
│   ├── config/                 # Configuration
│   │   ├── environment.ts      # Environment variables
│   │   └── changelog.ts        # Version history
│   │
│   ├── locales/               # i18n translations
│   │   ├── en.json
│   │   ├── de.json
│   │   ├── es.json
│   │   └── fr.json
│   │
│   ├── test/                  # Test files
│   │   └── *.test.ts
│   │
│   ├── App.tsx                # Main app component
│   ├── main.tsx               # Entry point
│   ├── index.css              # Global CSS
│   └── i18n.ts               # i18n configuration
│
├── public/                    # Static assets
├── CHANGELOG.md               # Version history
├── README.md                  # User documentation
└── DEVELOPER.md               # This file
```

---

## 🔧 Key Components

### Core Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `MainVault` | Main vault interface with sidebar | `components/MainVault.tsx` |
| `Dashboard` | Security overview & stats | `components/Dashboard.tsx` |
| `Settings` | App settings & quick actions | `components/Settings.tsx` |
| `EntryForm` | Add/Edit password entries | `components/EntryForm.tsx` |
| `LoginScreen` | Authentication & vault setup | `components/LoginScreen.tsx` |

### Vault Sub-Components

| Component | Purpose |
|-----------|---------|
| `EntryCard` | Individual password entry card |
| `EntryDetailModal` | Full entry view modal |
| `VaultEmptyState` | Empty state displays |
| `DeleteConfirmModal` | Delete confirmation |
| `CustomFieldDisplay` | Custom field rendering |

### Hooks

| Hook | Purpose |
|------|---------|
| `useEntryManagement` | Entry CRUD operations |
| `useVaultState` | Vault state (lock/unlock, entries) |
| `useElectron` | Electron integration detection |

---

## 🔐 Security Implementation

### Encryption

```typescript
// Storage encryption flow (utils/storage.ts)
1. Master Password
   → PBKDF2 (100,000 iterations, SHA-256)
   → 256-bit AES key

2. Entry Data
   → JSON.stringify()
   → AES-256-GCM encryption
   → Base64 encoding
   → localStorage
```

### Key Security Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `storageService.unlockVault()` | `utils/storage.ts` | Decrypt vault with password |
| `storageService.saveEntries()` | `utils/storage.ts` | Encrypt and save entries |
| `secureWipe()` | `utils/memorySecurity.ts` | Clear sensitive data from memory |
| `sanitizeTextField()` | `utils/sanitization.ts` | Sanitize user input |
| `validateLicenseKey()` | `utils/validation.ts` | Validate license format |

### Rate Limiting

```typescript
// Login rate limiting
- 5 failed attempts → 30 second lockout
- Stored in localStorage with timestamp
- Constant-time password comparison
```

---

## 🎨 Styling

### Color Palette (vaultColors.ts)

```typescript
const colors = {
  brandGold: "#C9AE66",      // Primary accent
  steelBlue600: "#4A6FA5",   // Primary blue
  steelBlue500: "#5B82B8",
  steelBlue400: "#7A9DC7",
  warmIvory: "#E8EDF2",      // Light text
  slate400: "#94A3B8",       // Muted text
};
```

### CSS Classes (index.css)

| Class | Purpose |
|-------|---------|
| `.form-modal-backdrop` | Full-screen modal backdrop with pattern |
| `.form-container` | Form styling container |
| `.bouncy-card` | Hover animation for cards |
| `.nav-item-hover` | Sidebar navigation hover |

### Theme (styles/theme.ts)

Centralized theme configuration with:
- Colors
- Typography
- Spacing
- Border radius
- Shadows
- Component styles

---

## 🧪 Testing

### Test Structure

```
src/test/
├── accessibility.test.tsx    # A11y component tests
├── errorBoundary.test.tsx    # Error handling tests
├── errorHandling.test.ts     # Error utility tests
├── importExport.test.ts      # Import/export tests
└── sanitization.test.ts      # Input sanitization tests

src/utils/__tests__/
├── licenseKeys.test.ts       # License validation tests
├── storage.test.ts           # Storage service tests
├── totp.test.ts              # TOTP generation tests
└── validation.test.ts        # Validation tests
```

### Running Tests

```bash
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

---

## 🔌 Electron Integration

### IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `vault-changed` | Main → Renderer | Notify of vault changes |
| `get-shared-entries` | Renderer → Main | Get entries from main |
| `save-shared-entries` | Renderer → Main | Save entries to main |
| `show-floating-panel` | Renderer → Main | Show floating panel |

### Floating Button/Panel

The floating button is rendered in a separate Electron window:
- `src/floatingButtonEntry.tsx` - Entry point
- `src/components/FloatingButton.tsx` - Button component
- `electron/main.js` - Window creation

---

## 📝 Adding New Features

### Adding a New Component

1. Create component file in appropriate folder
2. Add to barrel export (`index.ts`)
3. Import where needed

```typescript
// src/components/vault/NewComponent.tsx
export const NewComponent: React.FC<Props> = ({ ... }) => { ... };

// src/components/vault/index.ts
export { NewComponent } from './NewComponent';

// Usage
import { NewComponent } from './vault';
```

### Adding a New Hook

1. Create hook in `src/hooks/`
2. Export from `src/hooks/index.ts`

```typescript
// src/hooks/useNewHook.ts
export const useNewHook = () => { ... };

// src/hooks/index.ts
export { useNewHook } from './useNewHook';
```

### Adding a New Utility

1. Create utility in `src/utils/`
2. Export from `src/utils/index.ts`

---

## 🚀 Build & Deploy

### Development

```bash
npm run dev        # Electron + Vite
npm run dev:vite   # Web only (faster)
```

### Production Build

```bash
npm run build      # Build web
npm run dist       # Build desktop apps
```

### Build Outputs

| Platform | Output |
|----------|--------|
| Windows | `dist/LocalPasswordVault Setup.exe` |
| macOS | `dist/LocalPasswordVault.dmg` |
| Linux | `dist/LocalPasswordVault.AppImage` |

---

## 📋 Code Standards

### TypeScript

- Strict mode enabled
- All components use explicit types
- Props interfaces defined for all components

### React

- Functional components only
- Custom hooks for shared logic
- Memoization for expensive operations

### CSS

- Tailwind CSS for styling
- Custom classes in `index.css`
- Theme colors from `vaultColors.ts`

### Security

- No `console.log` in production
- All user input sanitized
- Sensitive data cleared from memory
- No cloud/external API calls

---

## 🐛 Debugging

### Common Issues

| Issue | Solution |
|-------|----------|
| Vault won't unlock | Check localStorage for `vault_password_hash` |
| Entries not saving | Check `storageService.isVaultUnlocked()` |
| Floating button not showing | Check Electron window creation in `main.js` |
| Trial not working | Check `license_token` in localStorage |

### Debug Mode

In development, add `?reset` to URL to clear all localStorage:
```
http://localhost:5173/?reset
```

---

## 📚 Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

---

**Last Updated**: December 2025 | **Version**: 1.2.0



