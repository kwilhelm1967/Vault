# Local Password Vault - Architecture Documentation

## Overview

Local Password Vault (LPV) is an **offline-first**, **security-focused** password management application built with React, TypeScript, and Electron. All sensitive data is encrypted locally using AES-256-GCM and never leaves the user's device.

---

## Architecture Principles

### 1. **Offline-First Design**
- 100% of vault operations work offline after initial setup
- No cloud synchronization
- No telemetry or user data transmission
- License activation is the only network operation (one-time, during activation)

### 2. **Security-First**
- AES-256-GCM encryption for all vault data
- PBKDF2 key derivation (100,000 iterations)
- Memory security practices (clearing sensitive strings)
- Input sanitization to prevent XSS
- Content Security Policy (CSP) headers

### 3. **Privacy Protection**
- Zero user data on external servers
- License keys and device hashes only (for activation)
- No analytics tracking
- No crash reporting with user data

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Application                      │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │   Main Process   │  IPC    │  Renderer Process │         │
│  │  (Node.js/Backend)│ ◄────► │  (React Frontend) │         │
│  └──────────────────┘         └──────────────────┘         │
│         │                              │                     │
│         │                              │                     │
│         ▼                              ▼                     │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Secure Storage  │         │  Encrypted Vault  │         │
│  │  (OS File System)│         │  (localStorage)   │         │
│  └──────────────────┘         └──────────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         │                              │
         │                              │
         ▼                              ▼
┌──────────────────┐         ┌──────────────────┐
│  License Server  │         │  User's Device   │
│  (Activation Only)│        │  (No Data Sent)  │
└──────────────────┘         └──────────────────┘
```

---

## Core Components

### 1. **Storage Service** (`src/utils/storage.ts`)

**Purpose**: Manages encrypted vault data storage and retrieval.

**Key Responsibilities**:
- Encrypting/decrypting password entries
- Managing Electron file storage vs localStorage
- Data validation and sanitization
- Entry CRUD operations

**Data Flow**:
```
User Action → StorageService.saveEntries()
           ↓
    Encrypt (AES-256-GCM)
           ↓
    Save to Electron File Storage (preferred)
           OR
    Save to localStorage (fallback)
```

**Storage Structure**:
- **Electron**: Encrypted vault stored in OS-secured file location
- **Web**: Encrypted vault in `localStorage` (encrypted_data key)
- **Metadata**: Settings, license info in separate localStorage keys

---

### 2. **License Service** (`src/utils/licenseService.ts`)

**Purpose**: Manages license activation, validation, and device binding.

**Activation Flow**:
```
User Enters Key → Validate Format
                ↓
        Get Device Fingerprint
                ↓
        Call Activation API (one-time)
                ↓
        Receive Signed License File
                ↓
        Store Locally for Offline Validation
```

**Offline Validation**:
- Validates license file signature (HMAC-SHA256)
- Checks device ID matches current device
- Returns license status without network calls

**License Types**:
- **Personal**: Single device, lifetime
- **Family**: 5 devices, lifetime
- **Trial**: 14 days, single device

---

### 3. **Trial Service** (`src/utils/trialService.ts`)

**Purpose**: Manages trial period tracking and expiration.

**Trial Flow**:
```
User Activates Trial → Generate Signed Trial File
                    ↓
            Store Locally (signed)
                    ↓
            Periodic Expiration Checks (local)
                    ↓
            Lock Vault on Expiration
```

**Key Features**:
- Signed trial files prevent tampering
- Device-bound (cannot transfer trial)
- Automatic expiration detection

---

### 4. **Encryption Service** (`src/utils/encryption.ts`)

**Purpose**: Handles AES-256-GCM encryption/decryption.

**Encryption Process**:
```
Master Password → PBKDF2 (100k iterations)
              ↓
        Derive Encryption Key
              ↓
        Generate IV (per operation)
              ↓
        AES-256-GCM Encrypt Data
              ↓
        Return: encrypted_data + iv + tag
```

**Security Features**:
- Key derivation prevents rainbow table attacks
- GCM mode provides authenticated encryption
- IV prevents pattern analysis
- Tag prevents tampering

---

### 5. **Memory Security** (`src/utils/memorySecurity.ts`)

**Purpose**: Implements best-effort memory clearing for sensitive data.

**Techniques**:
- Track sensitive strings in WeakSet
- Overwrite arrays with zeros
- Clear input fields after use
- Hash passwords for comparisons (avoid storing plaintext)

**Limitations**:
- JavaScript GC prevents guaranteed clearing
- Best-effort approach only
- More effective in Electron than browser

---

## Data Flow Diagrams

### License Activation Flow

```
┌─────────────┐
│   User      │
│  Enters Key │
└──────┬──────┘
       │
       ▼
┌──────────────────┐      ┌─────────────────┐
│ LicenseService   │─────►│  Validation     │
│ .activateLicense │      │  (format check) │
└──────┬───────────┘      └─────────────────┘
       │
       ▼
┌──────────────────┐
│ Device           │
│ Fingerprint      │
│ Generation       │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐      ┌──────────────┐
│ API Call         │─────►│ License      │
│ (one-time)       │      │ Server       │
└──────┬───────────┘      └──────┬───────┘
       │                         │
       │ ◄───────────────────────┘
       │ (signed license file)
       ▼
┌──────────────────┐
│ Save Locally     │
│ (offline usable) │
└──────────────────┘
```

### Vault Unlock Flow

```
┌─────────────┐
│   User      │
│ Enters MP   │
└──────┬──────┘
       │
       ▼
┌──────────────────┐      ┌─────────────────┐
│ Encryption       │─────►│ PBKDF2 Key      │
│ Service          │      │ Derivation      │
└──────┬───────────┘      └─────────────────┘
       │
       ▼
┌──────────────────┐      ┌─────────────────┐
│ Decrypt Vault    │─────►│ Load Encrypted  │
│ Data             │      │ Data from       │
│                  │      │ Storage         │
└──────┬───────────┘      └─────────────────┘
       │
       ▼
┌──────────────────┐
│ Decrypt Entries  │
│ (AES-256-GCM)    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Display Entries  │
│ (in-memory only) │
└──────────────────┘
```

### Entry Save Flow

```
┌─────────────┐
│   User      │
│ Saves Entry │
└──────┬──────┘
       │
       ▼
┌──────────────────┐      ┌─────────────────┐
│ StorageService   │─────►│ Sanitize Input  │
│ .saveEntries     │      │ (XSS prevention)│
└──────┬───────────┘      └─────────────────┘
       │
       ▼
┌──────────────────┐
│ Encrypt Data     │
│ (AES-256-GCM)    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐      ┌─────────────────┐
│ Save to Electron │      │ Save to         │
│ File Storage     │      │ localStorage    │
│ (primary)        │      │ (backup)        │
└──────────────────┘      └─────────────────┘
```

---

## Component Hierarchy

### React Component Tree

```
App
├── LicenseScreen (if not licensed)
│   ├── TrialActivation
│   └── LicenseActivation
│
└── Dashboard (if licensed)
    ├── LockScreen (if locked)
    └── MainVault (if unlocked)
        ├── VaultSidebar
        ├── EntryList
        │   └── EntryCard[]
        ├── EntryForm
        │   ├── PasswordGenerator
        │   └── CustomFields
        └── EntryDetailModal
```

---

## State Management

### Global State (via React Hooks)

- **App Status**: License/trial status (`useAppStatus`)
- **Vault Data**: Entries and categories (`useVaultData`)
- **UI State**: Current view, selected entry, etc. (component-local)

### Storage Layer

- **Encrypted Vault**: Electron file storage / localStorage
- **Settings**: localStorage (unencrypted, non-sensitive)
- **License Info**: localStorage + signed license file

---

## Security Architecture

### Encryption Chain

```
Master Password
    ↓
PBKDF2 (100k iterations, SHA-256)
    ↓
Encryption Key (32 bytes)
    ↓
AES-256-GCM
    ↓
Encrypted Vault Data
```

### Threat Model

**Protected Against**:
- ✅ Data theft (encryption at rest)
- ✅ Network interception (no network data transmission)
- ✅ Memory dumps (best-effort clearing)
- ✅ XSS attacks (input sanitization)
- ✅ License tampering (HMAC signatures)

**Not Protected Against**:
- ⚠️ Physical access + keylogger (mitigated by auto-lock)
- ⚠️ Compromised master password (user responsibility)
- ⚠️ Memory analysis during runtime (best-effort only)

---

## Error Handling Strategy

### Error Hierarchy

1. **User-Facing Errors**: Displayed in UI with actionable messages
2. **Dev Errors**: Logged to console in dev mode
3. **Silent Failures**: Handled gracefully with fallbacks

### Error Handling Patterns

```typescript
// Standard pattern for async operations
const { data, error } = await withErrorHandling(
  () => asyncOperation(),
  'operation-name'
);

if (error) {
  // Handle error (log, display, fallback)
}
```

---

## Performance Optimizations

### React Optimizations
- `React.memo` on expensive components (MainVault, EntryCard)
- `useMemo` for filtered/sorted lists
- `useCallback` for stable function references

### Storage Optimizations
- Lazy loading of entries
- Indexed storage for fast lookups
- Debounced save operations

### Memory Optimizations
- Memory security clearing
- WeakSet for tracking sensitive data
- Avoid storing plaintext passwords in state

---

## Testing Strategy

### Unit Tests
- **Coverage Target**: 80% minimum
- **Critical Paths**: Encryption, license validation, storage operations
- **Framework**: Jest

### Integration Tests
- **Coverage**: License flows, trial expiration, vault operations
- **Framework**: Jest with mocked APIs

### E2E Tests
- **Coverage**: Critical user journeys
- **Framework**: Playwright

---

## Deployment Architecture

### Electron Build Process

```
Source Code
    ↓
Vite Build (Frontend)
    ↓
Electron Builder
    ↓
Platform-Specific Installers
    ├── Windows (.exe)
    ├── macOS (.dmg)
    └── Linux (.AppImage)
```

### Code Signing
- Windows: Authenticode
- macOS: Apple Developer ID
- Linux: GPG (optional)

---

## Future Architecture Considerations

### Potential Enhancements
- Biometric unlock (platform APIs)
- Hardware security modules (HSM) support
- Multi-vault support
- Secure sharing (end-to-end encrypted)

### Scalability Considerations
- Current design supports 10,000+ entries
- Index-based lookups for performance
- Lazy rendering for large lists

---

## References

- [Security Documentation](./SECURITY.md)
- [Data Privacy Verification](./DATA_PRIVACY_VERIFICATION.md)
- [Developer Handoff Guide](./DEVELOPER_HANDOFF.md)
- [Offline Operation Guide](./OFFLINE_OPERATION_GUIDE.md)

---

**Last Updated**: 2024
**Version**: 1.0.0

