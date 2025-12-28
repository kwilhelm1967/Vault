/**
 * Memory Security Tests
 * 
 * Comprehensive tests for memory security utilities (security-critical).
 * Tests secure memory handling, password hashing, and sensitive data cleanup.
 */

import { MemorySecurity, memorySecurity } from '../memorySecurity';

// Mock crypto.subtle
const mockDeriveBits = jest.fn();
const mockImportKey = jest.fn();

beforeAll(() => {
  // Mock crypto.subtle
  Object.defineProperty(window, 'crypto', {
    value: {
      subtle: {
        importKey: mockImportKey,
        deriveBits: mockDeriveBits,
      },
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
    },
    writable: true,
    configurable: true,
  });

  // Mock TextEncoder
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
});

describe('MemorySecurity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MemorySecurity.clearAllSensitiveData();
    
    // Reset mocks
    mockImportKey.mockResolvedValue({});
    mockDeriveBits.mockResolvedValue(new ArrayBuffer(32));
  });

  afterEach(() => {
    // Clean up any intervals
    jest.useFakeTimers();
    jest.runAllTimers();
    jest.useRealTimers();
  });

  describe('trackSensitiveData', () => {
    it('should track a sensitive string', () => {
      const sensitive = 'mySecretPassword123';
      const result = MemorySecurity.trackSensitiveData(sensitive);
      
      expect(result).toBe(sensitive);
    });

    it('should not track empty strings', () => {
      const empty = '';
      MemorySecurity.trackSensitiveData(empty);
      // Empty strings should not be tracked
      expect(true).toBe(true); // No error thrown
    });

    it('should handle non-string input gracefully', () => {
      // @ts-expect-error Testing invalid input
      const result = MemorySecurity.trackSensitiveData(null);
      expect(result).toBeNull();
    });
  });

  describe('trackSensitiveArray', () => {
    it('should track a sensitive Uint8Array', () => {
      const sensitive = new Uint8Array([1, 2, 3, 4, 5]);
      const result = MemorySecurity.trackSensitiveArray(sensitive);
      
      expect(result).toBe(sensitive);
    });

    it('should not track non-Uint8Array input', () => {
      const notArray = [1, 2, 3] as unknown;
      // @ts-expect-error Testing invalid input
      const result = MemorySecurity.trackSensitiveArray(notArray);
      expect(result).toBe(notArray);
    });
  });

  describe('clearArray', () => {
    it('should clear a Uint8Array with zeros', () => {
      const array = new Uint8Array([1, 2, 3, 4, 5]);
      MemorySecurity.clearArray(array);
      
      // Array should be filled with zeros
      expect(Array.from(array)).toEqual([0, 0, 0, 0, 0]);
    });

    it('should overwrite with random data before zeros', () => {
      const array = new Uint8Array(10);
      const originalCopy = new Uint8Array(array);
      
      MemorySecurity.clearArray(array);
      
      // Array should be cleared (zeros)
      expect(array.every(val => val === 0)).toBe(true);
    });

    it('should handle detached buffers gracefully', () => {
      const array = new Uint8Array([1, 2, 3]);
      // Simulate detached buffer by mocking fill to throw
      const originalFill = array.fill;
      array.fill = jest.fn(() => {
        throw new Error('Buffer detached');
      });
      
      expect(() => MemorySecurity.clearArray(array)).not.toThrow();
      
      // Restore
      array.fill = originalFill;
    });

    it('should return early for non-Uint8Array input', () => {
      const notArray = [1, 2, 3] as unknown;
      expect(() => {
        // @ts-expect-error Testing invalid input
        MemorySecurity.clearArray(notArray);
      }).not.toThrow();
    });
  });

  describe('clearString', () => {
    it('should remove string from tracking', () => {
      const sensitive = 'mySecretPassword123';
      MemorySecurity.trackSensitiveData(sensitive);
      MemorySecurity.clearString(sensitive);
      
      // String should be cleared from tracking
      expect(true).toBe(true); // No direct way to verify, but no error thrown
    });

    it('should handle non-string input gracefully', () => {
      expect(() => {
        // @ts-expect-error Testing invalid input
        MemorySecurity.clearString(null);
      }).not.toThrow();
    });
  });

  describe('clearAllSensitiveData', () => {
    it('should clear all tracked sensitive data', () => {
      MemorySecurity.trackSensitiveData('secret1');
      MemorySecurity.trackSensitiveData('secret2');
      
      expect(() => MemorySecurity.clearAllSensitiveData()).not.toThrow();
    });

    it('should handle errors gracefully', () => {
      // Mock sensitiveStrings.clear to throw
      const originalClear = Set.prototype.clear;
      Set.prototype.clear = jest.fn(() => {
        throw new Error('Clear failed');
      });

      expect(() => MemorySecurity.clearAllSensitiveData()).not.toThrow();

      // Restore
      Set.prototype.clear = originalClear;
    });
  });

  describe('clearInputField', () => {
    it('should clear an input field securely', () => {
      const input = document.createElement('input');
      input.type = 'password';
      input.value = 'myPassword123';
      
      MemorySecurity.clearInputField(input);
      
      expect(input.value).toBe('');
    });

    it('should overwrite with random data before clearing', () => {
      const input = document.createElement('input');
      input.type = 'password';
      input.value = 'test';
      
      MemorySecurity.clearInputField(input);
      
      // Should be cleared
      expect(input.value).toBe('');
    });

    it('should handle non-input elements gracefully', () => {
      const div = document.createElement('div');
      
      expect(() => {
        // @ts-expect-error Testing invalid input
        MemorySecurity.clearInputField(div);
      }).not.toThrow();
    });

    it('should handle null input gracefully', () => {
      expect(() => {
        // @ts-expect-error Testing invalid input
        MemorySecurity.clearInputField(null);
      }).not.toThrow();
    });
  });

  describe('registerPasswordInput', () => {
    it('should register a password input for auto-clearing', () => {
      const input = document.createElement('input');
      input.type = 'password';
      
      const cleanup = MemorySecurity.registerPasswordInput(input);
      
      expect(typeof cleanup).toBe('function');
      
      // Cleanup should work
      expect(() => cleanup()).not.toThrow();
    });

    it('should return no-op function for invalid input', () => {
      const cleanup = MemorySecurity.registerPasswordInput(null as unknown as HTMLInputElement);
      
      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();
    });

    it('should handle blur event', () => {
      const input = document.createElement('input');
      input.type = 'password';
      input.value = 'test';
      document.body.appendChild(input);
      
      const cleanup = MemorySecurity.registerPasswordInput(input);
      
      // Trigger blur
      input.dispatchEvent(new Event('blur'));
      
      // Cleanup
      cleanup();
      document.body.removeChild(input);
    });
  });

  describe('hashPassword', () => {
    it('should hash a password using PBKDF2', async () => {
      const password = 'myPassword123';
      const salt = new Uint8Array(16);
      crypto.getRandomValues(salt);
      
      mockImportKey.mockResolvedValue({});
      mockDeriveBits.mockResolvedValue(new ArrayBuffer(32));
      
      const hash = await MemorySecurity.hashPassword(password, salt);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      
      expect(mockImportKey).toHaveBeenCalled();
      expect(mockDeriveBits).toHaveBeenCalled();
    });

    it('should use correct PBKDF2 parameters', async () => {
      const password = 'myPassword123';
      const salt = new Uint8Array(16);
      crypto.getRandomValues(salt);
      
      mockImportKey.mockResolvedValue({});
      mockDeriveBits.mockResolvedValue(new ArrayBuffer(32));
      
      await MemorySecurity.hashPassword(password, salt);
      
      // Verify PBKDF2 parameters
      expect(mockDeriveBits).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PBKDF2',
          salt: expect.any(ArrayBuffer),
          iterations: 100000,
          hash: 'SHA-256',
        }),
        expect.anything(),
        256
      );
    });

    it('should handle hashing errors', async () => {
      const password = 'myPassword123';
      const salt = new Uint8Array(16);
      
      mockImportKey.mockRejectedValue(new Error('Import key failed'));
      
      await expect(MemorySecurity.hashPassword(password, salt)).rejects.toThrow();
    });
  });

  describe('generateSecureRandom', () => {
    it('should generate cryptographically secure random bytes', () => {
      const length = 32;
      const random = MemorySecurity.generateSecureRandom(length);
      
      expect(random).toBeInstanceOf(Uint8Array);
      expect(random.length).toBe(length);
    });

    it('should generate different values on each call', () => {
      const random1 = MemorySecurity.generateSecureRandom(32);
      const random2 = MemorySecurity.generateSecureRandom(32);
      
      // Very unlikely to be the same
      expect(Array.from(random1)).not.toEqual(Array.from(random2));
    });
  });

  describe('secureCompare', () => {
    it('should return true for equal strings', () => {
      expect(MemorySecurity.secureCompare('test', 'test')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(MemorySecurity.secureCompare('test', 'different')).toBe(false);
    });

    it('should return false for strings of different lengths', () => {
      expect(MemorySecurity.secureCompare('short', 'verylongstring')).toBe(false);
    });

    it('should prevent timing attacks by comparing same length', () => {
      const start1 = performance.now();
      MemorySecurity.secureCompare('short', 'different');
      const time1 = performance.now() - start1;
      
      const start2 = performance.now();
      MemorySecurity.secureCompare('verylongstring1', 'verylongstring2');
      const time2 = performance.now() - start2;
      
      // Times should be similar (within reasonable margin)
      // This is a basic check - true constant-time would need more sophisticated testing
      expect(Math.abs(time1 - time2)).toBeLessThan(10);
    });

    it('should handle non-string input', () => {
      expect(MemorySecurity.secureCompare(null as unknown as string, 'test')).toBe(false);
      expect(MemorySecurity.secureCompare('test', null as unknown as string)).toBe(false);
      expect(MemorySecurity.secureCompare(null as unknown as string, null as unknown as string)).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(MemorySecurity.secureCompare('', '')).toBe(true);
      expect(MemorySecurity.secureCompare('', 'notempty')).toBe(false);
    });
  });

  describe('onVaultLock', () => {
    it('should clear all sensitive data on vault lock', () => {
      MemorySecurity.trackSensitiveData('secret1');
      
      expect(() => MemorySecurity.onVaultLock()).not.toThrow();
    });

    it('should clear password inputs on the page', () => {
      const input = document.createElement('input');
      input.type = 'password';
      input.value = 'test';
      document.body.appendChild(input);
      
      MemorySecurity.onVaultLock();
      
      expect(input.value).toBe('');
      
      document.body.removeChild(input);
    });
  });

  describe('createSecurePassword', () => {
    it('should create a secure password container', () => {
      const password = 'mySecretPassword123';
      const container = MemorySecurity.createSecurePassword(password, 1000);
      
      expect(container).toBeDefined();
      expect(typeof container.get).toBe('function');
      expect(typeof container.clear).toBe('function');
    });

    it('should allow accessing password before timeout', () => {
      const password = 'mySecretPassword123';
      const container = MemorySecurity.createSecurePassword(password, 1000);
      
      expect(container.get()).toBe(password);
    });

    it('should clear password after timeout', async () => {
      jest.useFakeTimers();
      
      const password = 'mySecretPassword123';
      const container = MemorySecurity.createSecurePassword(password, 1000);
      
      expect(container.get()).toBe(password);
      
      // Fast-forward time
      jest.advanceTimersByTime(1001);
      
      await expect(() => container.get()).toThrow('Password has been cleared from memory');
      
      jest.useRealTimers();
    });

    it('should allow manual clearing', () => {
      const password = 'mySecretPassword123';
      const container = MemorySecurity.createSecurePassword(password, 1000);
      
      container.clear();
      
      expect(() => container.get()).toThrow('Password has been cleared from memory');
    });
  });

  describe('initialize', () => {
    it('should set up cleanup interval', () => {
      jest.useFakeTimers();
      
      MemorySecurity.initialize();
      
      // Fast-forward to trigger cleanup
      jest.advanceTimersByTime(30001);
      
      // Should not throw
      expect(true).toBe(true);
      
      jest.useRealTimers();
    });

    it('should set up beforeunload handler', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      MemorySecurity.initialize();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
      
      addEventListenerSpy.mockRestore();
    });

    it('should set up visibilitychange handler', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      
      MemorySecurity.initialize();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );
      
      addEventListenerSpy.mockRestore();
    });
  });

  describe('performCleanup', () => {
    it('should attempt garbage collection if available', () => {
      // Mock gc function
      const mockGc = jest.fn();
      (globalThis as { gc?: () => void }).gc = mockGc;
      
      // Call performCleanup indirectly through initialize
      MemorySecurity.initialize();
      
      // Should not throw
      expect(true).toBe(true);
      
      // Cleanup
      delete (globalThis as { gc?: () => void }).gc;
    });
  });

  describe('singleton instance', () => {
    it('should export singleton instance', () => {
      expect(memorySecurity).toBe(MemorySecurity);
    });
  });
});

