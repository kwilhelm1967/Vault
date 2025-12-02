# Local Password Vault - API Reference

This document provides a technical reference for developers working with Local Password Vault's internal APIs.

---

## Table of Contents

1. [Storage Service](#storage-service)
2. [License Service](#license-service)
3. [Trial Service](#trial-service)
4. [Encryption](#encryption)
5. [TOTP Service](#totp-service)
6. [Electron IPC](#electron-ipc)
7. [Types & Interfaces](#types--interfaces)

---

## Storage Service

Location: `src/utils/storage.ts`

The storage service handles all vault data operations with AES-256 encryption.

### Methods

#### `vaultExists()`
Check if a vault has been created.

```typescript
storageService.vaultExists(): boolean
```

**Returns:** `true` if vault exists, `false` otherwise.

---

#### `createVault(masterPassword: string)`
Create a new vault with the given master password.

```typescript
await storageService.createVault(masterPassword: string): Promise<void>
```

**Parameters:**
- `masterPassword` - The master password for the vault

**Throws:** Error if vault creation fails

---

#### `unlockVault(masterPassword: string)`
Unlock an existing vault.

```typescript
await storageService.unlockVault(masterPassword: string): Promise<boolean>
```

**Parameters:**
- `masterPassword` - The master password

**Returns:** `true` if unlock successful, `false` if password incorrect

---

#### `lockVault()`
Lock the vault and clear encryption keys from memory.

```typescript
storageService.lockVault(): void
```

---

#### `isVaultUnlocked()`
Check if the vault is currently unlocked.

```typescript
storageService.isVaultUnlocked(): boolean
```

---

#### `saveEntries(entries: PasswordEntry[])`
Save password entries to encrypted storage.

```typescript
await storageService.saveEntries(entries: PasswordEntry[]): Promise<void>
```

**Parameters:**
- `entries` - Array of password entries to save

---

#### `loadEntries()`
Load and decrypt all password entries.

```typescript
await storageService.loadEntries(): Promise<PasswordEntry[]>
```

**Returns:** Array of decrypted password entries

---

#### `savePasswordHint(hint: string)`
Save a password hint.

```typescript
await storageService.savePasswordHint(hint: string): Promise<void>
```

---

#### `loadPasswordHint()`
Load the saved password hint.

```typescript
storageService.loadPasswordHint(): string | null
```

---

#### `clearAllData()`
Delete all vault data (destructive).

```typescript
await storageService.clearAllData(): Promise<void>
```

---

## License Service

Location: `src/utils/licenseService.ts`

Handles license validation and activation.

### Methods

#### `getAppStatus()`
Get the current application license status.

```typescript
await licenseService.getAppStatus(): Promise<AppLicenseStatus>
```

**Returns:**
```typescript
{
  isActivated: boolean;
  licenseType: 'single' | 'family' | 'trial' | null;
  trialInfo: {
    isActive: boolean;
    isExpired: boolean;
    daysRemaining: number;
    endDate: Date | null;
  };
}
```

---

#### `activateLicense(licenseKey: string)`
Activate a license key.

```typescript
await licenseService.activateLicense(licenseKey: string): Promise<{
  success: boolean;
  message: string;
  licenseType?: string;
}>
```

**Parameters:**
- `licenseKey` - The license key to activate (format: XXXX-XXXX-XXXX-XXXX)

---

#### `deactivateLicense()`
Deactivate the current license.

```typescript
await licenseService.deactivateLicense(): Promise<void>
```

---

## Trial Service

Location: `src/utils/trialService.ts`

Manages trial period functionality.

### Methods

#### `startTrial()`
Start a new trial period.

```typescript
await trialService.startTrial(): Promise<{
  success: boolean;
  endDate: Date;
}>
```

---

#### `getTrialInfo()`
Get current trial status.

```typescript
await trialService.getTrialInfo(): Promise<{
  isActive: boolean;
  endDate: Date | null;
  daysRemaining: number;
  hoursRemaining: number;
}>
```

---

#### `isTrialExpired()`
Check if trial has expired.

```typescript
await trialService.isTrialExpired(): Promise<boolean>
```

---

#### `addExpirationCallback(callback: () => void)`
Register a callback for trial expiration.

```typescript
trialService.addExpirationCallback(callback: () => void): void
```

---

## Encryption

Location: `src/utils/storage.ts` (EncryptionService class)

### Algorithm Details

- **Algorithm:** AES-256-GCM
- **Key Derivation:** PBKDF2 with SHA-256
- **Iterations:** 100,000
- **Salt:** 16 bytes (random)
- **IV:** 12 bytes (random per encryption)

### Internal Methods

```typescript
// Derive encryption key from password
deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey>

// Encrypt data
encryptData(plaintext: string): Promise<string>

// Decrypt data
decryptData(ciphertext: string): Promise<string>
```

---

## TOTP Service

Location: `src/utils/totp.ts`

Generates time-based one-time passwords for 2FA.

### Methods

#### `generateTOTP(secret: string)`
Generate a TOTP code from a secret.

```typescript
generateTOTP(secret: string): string
```

**Parameters:**
- `secret` - Base32 encoded TOTP secret

**Returns:** 6-digit TOTP code

---

#### `getTimeRemaining()`
Get seconds until next TOTP code.

```typescript
getTimeRemaining(): number
```

**Returns:** Seconds remaining (0-30)

---

#### `validateSecret(secret: string)`
Check if a TOTP secret is valid.

```typescript
validateSecret(secret: string): boolean
```

---

## Electron IPC

Location: `electron/main.js`, `src/vite-env.d.ts`

### Available IPC Channels

#### Window Management

```typescript
// Show/hide windows
window.electronAPI.showMainWindow(): void
window.electronAPI.hideMainWindow(): void
window.electronAPI.minimizeMainWindow(): void
window.electronAPI.restoreMainWindow(): void

// Floating panel
window.electronAPI.showFloatingPanel(): void
window.electronAPI.hideFloatingPanel(): void
window.electronAPI.setAlwaysOnTop(value: boolean): void
```

#### Vault Operations

```typescript
// Vault status
window.electronAPI.isVaultUnlocked(): Promise<boolean>
window.electronAPI.setVaultUnlocked(unlocked: boolean): void

// Shared entries (for floating panel)
window.electronAPI.saveSharedEntries(entries: PasswordEntry[]): Promise<boolean>
window.electronAPI.loadSharedEntries(): Promise<PasswordEntry[]>
```

#### System

```typescript
// App info
window.electronAPI.getVersion(): Promise<string>
window.electronAPI.getPlatform(): Promise<string>

// External links
window.electronAPI.openExternal(url: string): void

// Updates
window.electronAPI.checkForUpdates(): Promise<void>
```

#### Events

```typescript
// Listen for vault status changes
window.electronAPI.onVaultStatusChange(callback: (event, unlocked) => void): void
window.electronAPI.removeVaultStatusListener(): void

// Listen for update status
window.electronAPI.onUpdateStatus(callback: (event, status) => void): void
```

---

## Types & Interfaces

Location: `src/types/index.ts`

### PasswordEntry

```typescript
interface PasswordEntry {
  id: string;
  accountName: string;
  username: string;
  password: string;
  category: string;
  websiteUrl?: string;
  notes?: string;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
  passwordChangedAt?: Date;
  passwordHistory?: PasswordHistoryItem[];
  customFields?: CustomField[];
  totpSecret?: string;
}
```

### Category

```typescript
interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}
```

### CustomField

```typescript
interface CustomField {
  id: string;
  label: string;
  value: string;
  isSecret: boolean;
}
```

### PasswordHistoryItem

```typescript
interface PasswordHistoryItem {
  password: string;
  changedAt: Date;
}
```

### LicenseKey

```typescript
interface LicenseKey {
  key: string;
  type: 'single' | 'family';
  isUsed: boolean;
}
```

---

## Error Handling

All async methods may throw errors. Wrap calls in try-catch:

```typescript
try {
  await storageService.unlockVault(password);
} catch (error) {
  if (error.message.includes('Invalid password')) {
    // Handle incorrect password
  } else {
    // Handle other errors
  }
}
```

---

## Security Considerations

1. **Never log passwords** - All password data should be treated as sensitive
2. **Clear memory** - Use `memorySecurity.clearString()` after handling passwords
3. **Validate input** - Use `validation.ts` utilities for user input
4. **Sanitize output** - Use `sanitization.ts` for display

---

## Example Usage

### Creating a New Entry

```typescript
import { storageService } from './utils/storage';
import { PasswordEntry } from './types';

const newEntry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'> = {
  accountName: 'Example Account',
  username: 'user@example.com',
  password: 'securePassword123',
  category: 'other',
  isFavorite: false,
};

// Load existing entries
const entries = await storageService.loadEntries();

// Add new entry with generated ID and timestamps
const entry: PasswordEntry = {
  ...newEntry,
  id: crypto.randomUUID(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Save all entries
await storageService.saveEntries([...entries, entry]);
```

### Generating a TOTP Code

```typescript
import { generateTOTP, getTimeRemaining } from './utils/totp';

const secret = 'JBSWY3DPEHPK3PXP'; // Base32 encoded
const code = generateTOTP(secret);
const secondsLeft = getTimeRemaining();

console.log(`Code: ${code} (expires in ${secondsLeft}s)`);
```

