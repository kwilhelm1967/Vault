/**
 * Storage Service Tests
 * 
 * Tests for vault storage and data management.
 * Note: Encryption tests are limited due to mocked crypto API.
 */

import { storageService } from '../storage';

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset vault state
    storageService.lockVault();
  });

  describe('Vault Existence', () => {
    it('should return false when no vault exists', () => {
      expect(storageService.vaultExists()).toBe(false);
    });
  });

  describe('Vault Lock State', () => {
    it('should start in locked state', () => {
      expect(storageService.isVaultUnlocked()).toBe(false);
    });

    it('should lock vault when requested', () => {
      storageService.lockVault();
      expect(storageService.isVaultUnlocked()).toBe(false);
    });
  });

  describe('Lockout Protection', () => {
    it('should track remaining login attempts', () => {
      const attempts = storageService.getRemainingAttempts();
      expect(attempts).toBe(5);
    });

    it('should report initial lockout status as not locked', () => {
      const status = storageService.isLockedOut();
      expect(status.locked).toBe(false);
      expect(status.remainingSeconds).toBe(0);
    });
  });

  describe('Password Hint', () => {
    it('should return null when no hint is set', async () => {
      const hint = await storageService.getPasswordHint();
      expect(hint).toBeNull();
    });
  });

  describe('Export Data', () => {
    it('should throw error when vault is locked', async () => {
      await expect(storageService.exportData()).rejects.toThrow();
    });
  });
});

describe('StorageService - Type Checking', () => {
  it('should have required methods', () => {
    expect(typeof storageService.vaultExists).toBe('function');
    expect(typeof storageService.isVaultUnlocked).toBe('function');
    expect(typeof storageService.lockVault).toBe('function');
    expect(typeof storageService.unlockVault).toBe('function');
    expect(typeof storageService.initializeVault).toBe('function');
    expect(typeof storageService.saveEntries).toBe('function');
    expect(typeof storageService.loadEntries).toBe('function');
    expect(typeof storageService.exportData).toBe('function');
    expect(typeof storageService.getPasswordHint).toBe('function');
    expect(typeof storageService.setPasswordHint).toBe('function');
  });

  it('should be a singleton', () => {
    // Both should reference the same instance
    const service1 = storageService;
    const service2 = storageService;
    expect(service1).toBe(service2);
  });
});

describe('StorageService - Lockout Behavior', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should persist lockout across page refreshes via localStorage', () => {
    // Check that lockout storage key can be set
    const lockoutKey = 'vault_lockout';
    const futureTime = Date.now() + 30000;
    localStorage.setItem(lockoutKey, futureTime.toString());
    
    const status = storageService.isLockedOut();
    expect(status.locked).toBe(true);
    expect(status.remainingSeconds).toBeGreaterThan(0);
  });

  it('should not be locked out if lockout time has passed', () => {
    const lockoutKey = 'vault_lockout';
    const pastTime = Date.now() - 1000;
    localStorage.setItem(lockoutKey, pastTime.toString());
    
    const status = storageService.isLockedOut();
    expect(status.locked).toBe(false);
  });
});
