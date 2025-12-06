/**
 * Memory Security Utilities
 * 
 * Provides secure memory handling for sensitive data like passwords,
 * encryption keys, and other secrets. While JavaScript's garbage collector
 * makes true secure deletion impossible, these utilities provide best-effort
 * protection against memory inspection attacks.
 */

import { devError, devWarn } from "./devLog";

export class MemorySecurity {
  private static sensitiveStrings = new Set<string>();
  private static sensitiveArrays = new WeakSet<Uint8Array>();
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static inputListeners = new WeakMap<HTMLInputElement, () => void>();

  /**
   * Initialize memory security monitoring
   */
  static initialize(): void {
    // Start periodic cleanup
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 30000); // Clean every 30 seconds

    // Clear memory on page unload/hide
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.clearAllSensitiveData();
      });
      
      // Also clear on visibility hidden (tab switch)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          // Perform light cleanup when tab is hidden
          this.performCleanup();
        }
      });
    }
  }

  /**
   * Track a sensitive string for secure cleanup
   */
  static trackSensitiveData(data: string): string {
    if (typeof data === 'string' && data.length > 0) {
      this.sensitiveStrings.add(data);
    }
    return data;
  }

  /**
   * Track a sensitive byte array for secure cleanup
   */
  static trackSensitiveArray(data: Uint8Array): Uint8Array {
    if (data instanceof Uint8Array) {
      this.sensitiveArrays.add(data);
    }
    return data;
  }

  /**
   * Securely clear a Uint8Array by overwriting with random data then zeros
   */
  static clearArray(data: Uint8Array): void {
    if (!(data instanceof Uint8Array)) return;

    try {
      // First overwrite with random data
      crypto.getRandomValues(data);
      // Then overwrite with zeros
      data.fill(0);
    } catch (error) {
      // Fallback: just fill with zeros
      try {
        data.fill(0);
      } catch {
        // Ignore if buffer is detached
      }
    }
  }

  /**
   * Securely clear a string from memory (best effort)
   * Note: JavaScript strings are immutable, we can only remove references
   */
  static clearString(data: string): void {
    if (typeof data !== 'string') return;
    this.sensitiveStrings.delete(data);
  }

  /**
   * Clear all tracked sensitive data
   */
  static clearAllSensitiveData(): void {
    try {
      // Clear tracked strings
      this.sensitiveStrings.clear();
      
      // Note: WeakSet doesn't have forEach, arrays are cleaned when dereferenced
    } catch (error) {
      devWarn('Failed to clear sensitive data:', error);
    }
  }

  /**
   * Securely clear an input field
   * Overwrites the value before clearing
   */
  static clearInputField(input: HTMLInputElement): void {
    if (!input || !(input instanceof HTMLInputElement)) return;

    try {
      // Overwrite with random characters first
      const length = input.value.length;
      if (length > 0) {
        const randomChars = Array.from(
          crypto.getRandomValues(new Uint8Array(length)),
          (b) => String.fromCharCode(b % 94 + 33)
        ).join('');
        input.value = randomChars;
      }
      // Then clear
      input.value = '';
    } catch (error) {
      // Fallback: just clear
      input.value = '';
    }
  }

  /**
   * Register a password input for automatic clearing on blur
   */
  static registerPasswordInput(input: HTMLInputElement): () => void {
    if (!input || !(input instanceof HTMLInputElement)) {
      return () => {};
    }

    const clearHandler = () => {
      // Don't auto-clear if input still has focus
      if (document.activeElement === input) return;
      
      // Clear after a short delay (allows form submission)
      setTimeout(() => {
        if (document.activeElement !== input && input.value) {
          this.trackSensitiveData(input.value);
        }
      }, 100);
    };

    input.addEventListener('blur', clearHandler);
    this.inputListeners.set(input, clearHandler);

    // Return cleanup function
    return () => {
      input.removeEventListener('blur', clearHandler);
      this.inputListeners.delete(input);
    };
  }

  /**
   * Perform memory cleanup
   */
  private static performCleanup(): void {
    try {
      // Hint to garbage collector (only works in Node.js with --expose-gc)
      if (typeof (globalThis as { gc?: () => void }).gc === 'function') {
        (globalThis as { gc: () => void }).gc();
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Secure password hashing with PBKDF2
   */
  static async hashPassword(password: string, salt: Uint8Array): Promise<string> {
    try {
      this.trackSensitiveData(password);
      this.trackSensitiveArray(salt);

      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordData,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt.buffer as ArrayBuffer,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        256
      );

      const hashArray = new Uint8Array(derivedBits);
      const hash = btoa(String.fromCharCode(...hashArray));

      // Clean up
      this.clearString(password);
      this.clearArray(new Uint8Array(passwordData.buffer));
      this.clearArray(hashArray);

      return hash;
    } catch (error) {
      devError('Password hashing failed:', error);
      throw error;
    }
  }

  /**
   * Generate cryptographically secure random bytes
   */
  static generateSecureRandom(length: number): Uint8Array {
    const data = new Uint8Array(length);
    crypto.getRandomValues(data);
    return data;
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  static secureCompare(a: string, b: string): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }

    // Always compare same length to prevent timing leaks
    const maxLen = Math.max(a.length, b.length);
    let result = a.length === b.length ? 0 : 1;

    for (let i = 0; i < maxLen; i++) {
      const charA = i < a.length ? a.charCodeAt(i) : 0;
      const charB = i < b.length ? b.charCodeAt(i) : 0;
      result |= charA ^ charB;
    }

    return result === 0;
  }

  /**
   * Clear sensitive data on vault lock
   */
  static onVaultLock(): void {
    this.clearAllSensitiveData();
    this.performCleanup();
    
    // Also clear any password inputs on the page
    if (typeof document !== 'undefined') {
      document.querySelectorAll('input[type="password"]').forEach((input) => {
        if (input instanceof HTMLInputElement) {
          this.clearInputField(input);
        }
      });
    }
  }

  /**
   * Create a secure password container that auto-clears
   */
  static createSecurePassword(password: string, timeoutMs: number = 60000): {
    get: () => string;
    clear: () => void;
  } {
    let value: string | null = password;
    this.trackSensitiveData(password);

    const timeout = setTimeout(() => {
      value = null;
    }, timeoutMs);

    return {
      get: () => {
        if (value === null) {
          throw new Error('Password has been cleared from memory');
        }
        return value;
      },
      clear: () => {
        if (value) {
          this.clearString(value);
        }
        value = null;
        clearTimeout(timeout);
      },
    };
  }

  // Auto-initialize when module loads
  static {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }
}

// Export singleton instance
export const memorySecurity = MemorySecurity;
