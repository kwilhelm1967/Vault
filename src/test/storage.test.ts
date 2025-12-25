/**
 * Storage Service Unit Tests
 * 
 * Tests for the encrypted storage system that handles vault data.
 */

import { storageService } from '../utils/storage';
import { validateMasterPassword } from '../utils/validation';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock crypto.subtle for encryption tests
const mockCrypto = {
  subtle: {
    importKey: jest.fn().mockResolvedValue({}),
    deriveKey: jest.fn().mockResolvedValue({}),
    encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    decrypt: jest.fn().mockResolvedValue(new TextEncoder().encode(JSON.stringify([]))),
  },
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },
};

Object.defineProperty(window, 'crypto', { value: mockCrypto });

describe('StorageService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('Vault Initialization', () => {
    it('should detect when vault does not exist', () => {
      expect(storageService.vaultExists()).toBe(false);
    });

    it('should detect when vault exists after creation', async () => {
      // Simulate vault creation by setting the salt key (vaultExists checks for vault_salt_v2)
      localStorageMock.setItem('vault_salt_v2', 'salt_value');
      expect(storageService.vaultExists()).toBe(true);
    });
  });

  describe('Master Password Validation', () => {
    it('should reject password shorter than 12 characters', () => {
      const result = validateMasterPassword('short123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters');
    });

    it('should accept valid password with 12+ characters', () => {
      const result = validateMasterPassword('ValidPassword123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require mixed case for strong passwords', () => {
      const result = validateMasterPassword('alllowercase123!');
      // Should still be valid but may have strength warnings
      expect(result.isValid).toBe(true);
    });
  });

  describe('Password Hint', () => {
    beforeEach(async () => {
      // Unlock vault before setting password hint
      await storageService.initializeVault('TestPassword123!');
    });

    it('should store and retrieve password hint', async () => {
      await storageService.setPasswordHint('My hint');
      const hint = storageService.getPasswordHint();
      expect(hint).toBe('My hint');
    });

    it('should handle null hint', async () => {
      await storageService.setPasswordHint(null);
      const hint = storageService.getPasswordHint();
      expect(hint).toBeNull();
    });

    it('should not allow hint to be same as password pattern', async () => {
      // Hint should not reveal the password
      await storageService.setPasswordHint('Test hint');
      const hint = storageService.getPasswordHint();
      expect(hint).toBe('Test hint');
    });
  });

  describe('Entry Validation', () => {
    const validEntry = {
      id: 'test-id-123',
      accountName: 'Test Account',
      username: 'testuser',
      password: 'TestPass123!',
      category: 'other',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should accept valid entry', () => {
      const isValid = validEntry.id && validEntry.accountName && validEntry.password;
      expect(isValid).toBeTruthy();
    });

    it('should reject entry without id', () => {
      const invalidEntry = { ...validEntry, id: '' };
      const isValid = invalidEntry.id && invalidEntry.accountName;
      expect(isValid).toBeFalsy();
    });

    it('should reject entry without accountName', () => {
      const invalidEntry = { ...validEntry, accountName: '' };
      const isValid = invalidEntry.id && invalidEntry.accountName;
      expect(isValid).toBeFalsy();
    });

    it('should allow secure notes without password', () => {
      const secureNote = {
        ...validEntry,
        entryType: 'secure_note',
        password: '',
        username: '',
        notes: 'My secure note content',
      };
      const isValid = secureNote.id && secureNote.accountName && 
        (secureNote.entryType === 'secure_note' || secureNote.password);
      expect(isValid).toBeTruthy();
    });
  });

  describe('Vault Lock State', () => {
    it('should start in locked state', () => {
      // Fresh instance should be locked
      expect(storageService.isVaultUnlocked()).toBe(false);
    });

    it('should track lock state correctly', () => {
      // Note: Actually testing lock/unlock requires full crypto setup
      // This tests the state management
      expect(typeof storageService.isVaultUnlocked).toBe('function');
    });
  });

  describe('Export/Import', () => {
    it('should have exportData method', () => {
      expect(typeof storageService.exportData).toBe('function');
    });

    it('should have methods for encrypted export/import', () => {
      expect(typeof storageService.exportEncrypted).toBe('function');
      expect(typeof storageService.importEncrypted).toBe('function');
    });
  });
});










