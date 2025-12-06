# 👨‍💻 Developer Guide - Local Password Vault

This document provides technical details for developers working on the Local Password Vault codebase.

---

## 📁 Project Architecture

### Directory Structure

```
LocalPasswordVault/
├── .github/workflows/        # CI/CD pipelines
│   ├── ci.yml               # Tests, lint, security audit
│   ├── build.yml            # Production builds
│   └── electron-build.yml   # Electron releases
│
├── electron/                 # Electron main process
│   ├── main.js              # Window management, IPC handlers
│   ├── preload.js           # Context bridge (secure API exposure)
│   └── secure-storage.js    # Secure file storage utilities
│
├── e2e/                      # End-to-end tests (Playwright)
│   └── vault.spec.ts        # E2E test suite
│
├── src/
│   ├── components/          # React components
│   │   ├── vault/           # Core vault components
│   │   │   ├── EntryCard.tsx
│   │   │   ├── EntryDetailModal.tsx
│   │   │   ├── DeleteConfirmModal.tsx
│   │   │   ├── VaultEmptyStates.tsx
│   │   │   ├── CustomFieldDisplay.tsx
│   │   │   ├── vaultColors.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── settings/        # Settings components
│   │   │   ├── SettingsModals.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── accessibility/   # A11y components
│   │   │   ├── FocusTrap.tsx
│   │   │   ├── LiveRegion.tsx
│   │   │   ├── SkipLink.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── LazyComponents.tsx  # Code-split lazy loaded components
│   │   ├── MainVault.tsx    # Main vault interface
│   │   ├── Dashboard.tsx    # Dashboard view
│   │   ├── Settings.tsx     # Settings page
│   │   ├── EntryForm.tsx    # Add/Edit entry form
│   │   ├── LoginScreen.tsx  # Login/Setup screen
│   │   ├── FAQ.tsx          # FAQ page
│   │   └── ...
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useElectron.ts      # Electron integration
│   │   ├── useEntryManagement.ts # Entry CRUD operations
│   │   ├── useVaultState.ts    # Vault state management
│   │   ├── usePerformance.ts   # Performance monitoring
│   │   └── index.ts
│   │
│   ├── utils/               # Utility functions
│   │   ├── storage.ts       # Encrypted storage service
│   │   ├── validation.ts    # Input validation
│   │   ├── sanitization.ts  # Input sanitization
│   │   ├── licenseService.ts # License management
│   │   ├── trialService.ts  # Trial management
│   │   ├── totp.ts          # 2FA/TOTP generation
│   │   ├── recoveryPhrase.ts # BIP39 recovery phrase
│   │   ├── memorySecurity.ts # Secure memory operations
│   │   ├── devLog.ts        # Development logging (tree-shaken)
│   │   ├── safeUtils.ts     # Safe JSON/JWT parsing
│   │   ├── performanceMonitor.ts # Performance tracking
│   │   └── index.ts
│   │
│   ├── types/               # TypeScript definitions
│   │   └── index.ts         # All app types (JSDoc documented)
│   │
│   ├── test/                # Unit tests
│   │   ├── storage.test.ts
│   │   ├── entryManagement.test.ts
│   │   ├── licenseValidation.test.ts
│   │   ├── sanitization.test.ts
│   │   └── ...
│   │
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global CSS
│
├── playwright.config.ts     # E2E test configuration
├── jest.config.js           # Unit test configuration
├── vite.config.ts           # Build configuration
├── CHANGELOG.md             # Version history
├── README.md                # User documentation
└── DEVELOPER.md             # This file
```

---

## 🧪 Testing

### Test Types

| Type | Framework | Location | Command |
|------|-----------|----------|---------|
| Unit Tests | Jest | `src/test/` | `npm test` |
| E2E Tests | Playwright | `e2e/` | `npm run test:e2e` |
| Type Check | TypeScript | - | `npx tsc --noEmit` |

### Unit Test Files

```
src/test/
├── storage.test.ts           # Storage service tests
├── entryManagement.test.ts   # Entry CRUD operations
├── licenseValidation.test.ts # License & trial tests
├── sanitization.test.ts      # Input sanitization
├── errorHandling.test.ts     # Error utilities
├── errorBoundary.test.tsx    # Error boundary component
├── importExport.test.ts      # Import/export functionality
└── accessibility.test.tsx    # A11y components
```

### Running Tests

```bash
# Unit tests
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report

# E2E tests
npm run test:e2e           # Run headless
npm run test:e2e:headed    # Run with browser visible
npm run test:e2e:ui        # Interactive UI mode

# Type checking
npx tsc --noEmit           # Check types without emitting
```

### Writing Tests

```typescript
// Example unit test
describe('Entry Management', () => {
  it('should create entry with required fields', () => {
    const entry = createMockEntry({
      accountName: 'Test',
      password: 'Password123!'
    });
    expect(entry.id).toBeTruthy();
    expect(entry.accountName).toBe('Test');
  });
});
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

#### ci.yml - Quality Checks (on every push/PR)

```yaml
Jobs:
1. lint-and-typecheck    # ESLint + TypeScript
2. unit-tests           # Jest with coverage
3. e2e-tests            # Playwright (Chromium)
4. build-verification   # Production build test
5. security-audit       # npm audit + secret scanning
```

#### build.yml - Release Builds (on tags)

```yaml
Jobs:
1. build-windows        # Windows installer (.exe)
2. build-mac           # macOS installer (.dmg)
3. build-linux         # Linux installer (.AppImage)
4. create-release      # GitHub Release with artifacts
```

### Running CI Locally

```bash
# Simulate CI checks
npm run lint                    # ESLint
npx tsc --noEmit               # Type check
npm test -- --ci               # Unit tests
npm run build                  # Build check
npx playwright test --project=chromium  # E2E
```

---

## ⚡ Performance

### Code Splitting

Large components are lazy-loaded for better initial load:

```typescript
// src/components/LazyComponents.tsx
export const LazySettings = React.lazy(() => 
  import('./Settings').then(m => ({ default: m.Settings }))
);

export const LazyFAQ = React.lazy(() => 
  import('./FAQ').then(m => ({ default: m.FAQ }))
);
```

### Lazy-Loaded Components

| Component | Chunk | When Loaded |
|-----------|-------|-------------|
| Settings | `feature-settings` | Settings tab clicked |
| FAQ | `feature-faq` | FAQ section opened |
| MobileAccess | `feature-mobile` | Mobile access clicked |
| OnboardingTutorial | `feature-onboarding` | First-time setup |
| WhatsNewModal | `feature-onboarding` | Version update |

### Performance Monitoring

```typescript
// Development-only performance tracking
import { useRenderTracking, measureOperation } from './hooks';

function MyComponent() {
  useRenderTracking('MyComponent');
  
  const handleSave = async () => {
    await measureOperation('saveEntry', async () => {
      // ... save logic
    });
  };
}
```

### Bundle Optimization

```typescript
// vite.config.ts - Manual chunks
manualChunks: {
  'vendor-react': ['react', 'react-dom'],
  'vendor-i18n': ['i18next', 'react-i18next'],
  'vendor-icons': ['lucide-react'],
  'feature-settings': ['./src/components/Settings.tsx'],
  'feature-faq': ['./src/components/FAQ.tsx'],
}
```

---

## 🔐 Security Implementation

### Encryption Architecture

```
Master Password
    ↓
PBKDF2 (100,000 iterations, SHA-256)
    ↓
256-bit AES Key
    ↓
AES-256-GCM Encryption
    ↓
Base64 → localStorage
```

### Key Security Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `storageService.unlockVault()` | `utils/storage.ts` | Decrypt vault |
| `storageService.saveEntries()` | `utils/storage.ts` | Encrypt & save |
| `secureWipe()` | `utils/memorySecurity.ts` | Clear memory |
| `sanitizeTextField()` | `utils/sanitization.ts` | Sanitize input |
| `safeParseJSON()` | `utils/safeUtils.ts` | Safe JSON parsing |
| `safeParseJWT()` | `utils/safeUtils.ts` | Safe JWT parsing |

### Development Logging

```typescript
// Use devLog instead of console.log (tree-shaken in production)
import { devLog, devError, devWarn } from './utils/devLog';

devLog('Debug info:', data);      // Only in dev
devError('Error occurred:', err); // Only in dev
devWarn('Warning:', msg);         // Only in dev
```

### Safe Utilities

```typescript
// Safe JSON parsing (won't crash on invalid JSON)
const data = safeParseJSON(jsonString, defaultValue);

// Safe localStorage access
const settings = safeGetLocalStorage('key', defaultValue);

// Safe JWT parsing
const payload = safeParseJWT(token);
```

---

## 🧩 Hooks

### Core Hooks

| Hook | Purpose | Location |
|------|---------|----------|
| `useEntryManagement` | Add/update/delete entries | `hooks/useEntryManagement.ts` |
| `useVaultState` | Vault lock state, entries | `hooks/useVaultState.ts` |
| `useElectron` | Detect Electron environment | `hooks/useElectron.ts` |
| `usePerformance` | Performance tracking | `hooks/usePerformance.ts` |

### Using Hooks

```typescript
// Entry management
const { handleAddEntry, handleUpdateEntry, handleDeleteEntry } = 
  useEntryManagement({ entries, setEntries, isElectron, broadcastChange });

// Performance tracking (dev only)
useRenderTracking('ComponentName');
useLogMetrics(60000); // Log every 60s
```

---

## 🎨 Styling

### Color Palette

```typescript
// src/components/vault/vaultColors.ts
const colors = {
  brandGold: "#C9AE66",      // Primary accent
  steelBlue600: "#4A6FA5",   // Primary blue
  steelBlue500: "#5B82B8",
  warmIvory: "#E8EDF2",      // Light text
  slate400: "#94A3B8",       // Muted text
};
```

### CSS Classes

| Class | Purpose | Z-Index |
|-------|---------|---------|
| `.form-modal-backdrop` | Full-screen modal | 9998 |
| `.form-container` | Form styling | - |
| `.bouncy-card` | Hover animation | - |
| `.nav-item-hover` | Sidebar hover | - |

### Modal Z-Index Hierarchy

```
9999 - Notifications, floating button
9998 - Full-screen modals
50   - Dropdowns, tooltips
```

---

## 📝 TypeScript Guidelines

### Type Safety Rules

- ✅ No `: any` types allowed
- ✅ No `@ts-ignore` or `@ts-expect-error`
- ✅ All components have explicit prop types
- ✅ All functions have return types

### JSDoc Documentation

```typescript
/**
 * Saves entries to encrypted storage.
 * 
 * @param entries - Array of password entries to save
 * @returns Promise that resolves when save is complete
 * @throws {Error} If vault is locked or encryption fails
 * 
 * @example
 * await storageService.saveEntries(entries);
 */
async saveEntries(entries: PasswordEntry[]): Promise<void>
```

---

## 🚀 Build & Deploy

### Development

```bash
npm run dev        # Electron + Vite (full app)
npm run dev:vite   # Web only (faster iteration)
```

### Production Build

```bash
npm run build      # Build web assets
npm run build:prod # Production build with optimizations
npm run dist       # Build desktop installers
npm run dist:prod  # Production desktop installers
```

### Build Outputs

| Platform | Output | Size |
|----------|--------|------|
| Windows | `.exe` | ~85MB |
| macOS | `.dmg` | ~90MB |
| Linux | `.AppImage` | ~95MB |

### Bundle Analysis

```bash
# After build, check dist/assets/
ls -lh dist/assets/*.js

# Expected chunks:
# - vendor-react: ~25KB (gzip: 10KB)
# - vendor-icons: ~73KB (gzip: 20KB)
# - feature-*: 10-45KB each
# - main: ~140KB (gzip: 45KB)
```

---

## 🐛 Debugging

### Common Issues

| Issue | Solution |
|-------|----------|
| Vault won't unlock | Check `vault_password_hash` in localStorage |
| Entries not saving | Verify `storageService.isVaultUnlocked()` |
| Modal behind sidebar | Check z-index (should be 9998) |
| Console errors in prod | Should be none - all use devLog |
| Slow initial load | Check code splitting is working |

### Debug Tools

```bash
# Clear all data (dev mode)
http://localhost:5173/?reset

# Check TypeScript errors
npx tsc --noEmit

# Check for console statements
grep -r "console\." src/ --include="*.ts" --include="*.tsx"

# Check bundle size
npm run build && du -sh dist/
```

### Performance Debugging

```typescript
// Enable performance logging in dev
import { logMetrics } from './utils/performanceMonitor';

// Log current metrics
logMetrics();

// Use React Profiler
import { Profiler } from 'react';
import { onRenderCallback } from './hooks/usePerformance';

<Profiler id="MainVault" onRender={onRenderCallback}>
  <MainVault />
</Profiler>
```

---

## 📋 Code Quality Checklist

Before committing:

- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] No `console.log` (use `devLog`)
- [ ] No `: any` types
- [ ] Components have JSDoc comments
- [ ] New files added to barrel exports

---

## 📚 Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Playwright Testing](https://playwright.dev/docs/intro)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Vite Build](https://vitejs.dev/guide/)

---

**Last Updated**: December 2025 | **Version**: 1.2.0 | **Quality Score**: 5.0/5
