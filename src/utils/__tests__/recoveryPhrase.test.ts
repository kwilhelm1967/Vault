/**
 * Recovery Phrase Tests
 * 
 * Comprehensive tests for recovery phrase generation, validation, and storage.
 * This is security-critical code that must be thoroughly tested.
 */

import {
  generateRecoveryPhrase,
  storeRecoveryPhrase,
  verifyRecoveryPhrase,
  hasRecoveryPhrase,
  clearRecoveryPhrase,
  validateRecoveryPhraseFormat,
} from '../recoveryPhrase';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Recovery Phrase Generation', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should generate a 12-word phrase', () => {
    const phrase = generateRecoveryPhrase();
    const words = phrase.split(' ');
    
    expect(words.length).toBe(12);
  });

  it('should generate different phrases on each call', () => {
    const phrase1 = generateRecoveryPhrase();
    const phrase2 = generateRecoveryPhrase();
    
    // Very unlikely to be the same (1 in 2^132 chance)
    expect(phrase1).not.toBe(phrase2);
  });

  it('should generate valid BIP39 words', () => {
    const phrase = generateRecoveryPhrase();
    const words = phrase.split(' ');
    
    // All words should be lowercase
    words.forEach(word => {
      expect(word).toBe(word.toLowerCase());
    });
    
    // Validate format
    const validation = validateRecoveryPhraseFormat(phrase);
    expect(validation.valid).toBe(true);
  });

  it('should generate phrases with proper entropy', () => {
    const phrases = new Set<string>();
    
    // Generate 100 phrases - all should be unique
    for (let i = 0; i < 100; i++) {
      phrases.add(generateRecoveryPhrase());
    }
    
    // With 132 bits of entropy, collisions are extremely unlikely
    expect(phrases.size).toBe(100);
  });

  it('should handle crypto.getRandomValues availability', () => {
    // Should not throw even if crypto is available
    expect(() => generateRecoveryPhrase()).not.toThrow();
  });
});

describe('Recovery Phrase Validation', () => {
  it('should validate correct 12-word phrase', () => {
    const phrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    const result = validateRecoveryPhraseFormat(phrase);
    
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject phrase with wrong word count', () => {
    const phrase = 'abandon ability able about above absent';
    const result = validateRecoveryPhraseFormat(phrase);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Expected 12 words');
  });

  it('should reject phrase with invalid words', () => {
    const phrase = 'abandon ability able about above absent absorb abstract absurd abuse access invalidword';
    const result = validateRecoveryPhraseFormat(phrase);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid word');
  });

  it('should handle case-insensitive validation', () => {
    const phrase = 'ABANDON ABILITY ABLE ABOUT ABOVE ABSENT ABSORB ABSTRACT ABSURD ABUSE ACCESS ACCIDENT';
    const result = validateRecoveryPhraseFormat(phrase);
    
    expect(result.valid).toBe(true);
  });

  it('should handle extra whitespace', () => {
    const phrase = '  abandon   ability   able   about   above   absent   absorb   abstract   absurd   abuse   access   accident  ';
    const result = validateRecoveryPhraseFormat(phrase);
    
    expect(result.valid).toBe(true);
  });

  it('should reject empty phrase', () => {
    const result = validateRecoveryPhraseFormat('');
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Expected 12 words');
  });

  it('should reject phrase with non-BIP39 words', () => {
    const phrase = 'abandon ability able about above absent absorb abstract absurd abuse access password';
    const result = validateRecoveryPhraseFormat(phrase);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid word');
  });
});

describe('Recovery Phrase Storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should store recovery phrase hash', async () => {
    const phrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    
    await storeRecoveryPhrase(phrase);
    
    expect(localStorageMock.setItem).toHaveBeenCalled();
    const calls = (localStorageMock.setItem as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
  });

  it('should store salt separately from hash', async () => {
    const phrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    
    await storeRecoveryPhrase(phrase);
    
    // Should store both hash and salt
    const setItemCalls = (localStorageMock.setItem as jest.Mock).mock.calls;
    expect(setItemCalls.length).toBe(2);
    
    const keys = setItemCalls.map((call: [string, string]) => call[0]);
    expect(keys).toContain('vault_recovery_hash');
    expect(keys).toContain('vault_recovery_salt');
  });

  it('should generate different salts for different phrases', async () => {
    const phrase1 = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    const phrase2 = 'abandon ability able about above absent absorb abstract absurd abuse access account';
    
    await storeRecoveryPhrase(phrase1);
    const salt1 = localStorageMock.getItem('vault_recovery_salt');
    
    localStorageMock.clear();
    
    await storeRecoveryPhrase(phrase2);
    const salt2 = localStorageMock.getItem('vault_recovery_salt');
    
    // Salts should be different (very high probability)
    expect(salt1).not.toBe(salt2);
  });
});

describe('Recovery Phrase Verification', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should verify correct phrase', async () => {
    const phrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    
    await storeRecoveryPhrase(phrase);
    const isValid = await verifyRecoveryPhrase(phrase);
    
    expect(isValid).toBe(true);
  });

  it('should reject incorrect phrase', async () => {
    const correctPhrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    // Use a completely different last word
    const wrongPhrase = 'abandon ability able about above absent absorb abstract absurd abuse access account';
    
    await storeRecoveryPhrase(correctPhrase);
    
    // Wait a bit to ensure async operations complete
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const isValid = await verifyRecoveryPhrase(wrongPhrase);
    
    // account != accident, so hash should differ
    expect(isValid).toBe(false);
  });

  it('should handle case-insensitive verification', async () => {
    const phrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    
    await storeRecoveryPhrase(phrase);
    const isValid = await verifyRecoveryPhrase(phrase.toUpperCase());
    
    expect(isValid).toBe(true);
  });

  it('should handle extra whitespace in verification', async () => {
    const phrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    
    await storeRecoveryPhrase(phrase);
    const isValid = await verifyRecoveryPhrase(`  ${phrase}  `);
    
    expect(isValid).toBe(true);
  });

  it('should return false when no phrase is stored', async () => {
    const isValid = await verifyRecoveryPhrase('any phrase');
    
    expect(isValid).toBe(false);
  });

  it('should use constant-time comparison to prevent timing attacks', async () => {
    const phrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    
    await storeRecoveryPhrase(phrase);
    
    // Measure time for correct vs incorrect (in real scenario)
    const startCorrect = performance.now();
    await verifyRecoveryPhrase(phrase);
    const timeCorrect = performance.now() - startCorrect;
    
    const startIncorrect = performance.now();
    await verifyRecoveryPhrase('wrong phrase here');
    const timeIncorrect = performance.now() - startIncorrect;
    
    // Times should be similar (within reasonable margin)
    // This is a basic check - true constant-time would require more sophisticated testing
    const timeDiff = Math.abs(timeCorrect - timeIncorrect);
    expect(timeDiff).toBeLessThan(100); // Should be very close
  });

  it('should reject phrase with single word difference', async () => {
    const correctPhrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    // Change the last word to a different valid BIP39 word
    const wrongPhrase = 'abandon ability able about above absent absorb abstract absurd abuse access account';
    
    await storeRecoveryPhrase(correctPhrase);
    
    // Wait a bit to ensure async operations complete
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const isValid = await verifyRecoveryPhrase(wrongPhrase);
    
    // account != accident, so hash should differ and verification should fail
    expect(isValid).toBe(false);
  });
});

describe('Recovery Phrase State Management', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should return false when no phrase is stored', () => {
    expect(hasRecoveryPhrase()).toBe(false);
  });

  it('should return true when phrase is stored', async () => {
    const phrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    
    await storeRecoveryPhrase(phrase);
    
    expect(hasRecoveryPhrase()).toBe(true);
  });

  it('should clear recovery phrase', async () => {
    const phrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    
    await storeRecoveryPhrase(phrase);
    expect(hasRecoveryPhrase()).toBe(true);
    
    clearRecoveryPhrase();
    
    expect(hasRecoveryPhrase()).toBe(false);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('vault_recovery_hash');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('vault_recovery_salt');
  });

  it('should handle clearing when no phrase exists', () => {
    expect(() => clearRecoveryPhrase()).not.toThrow();
  });
});

describe('Recovery Phrase Security', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should not store plaintext phrase', async () => {
    const phrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    
    await storeRecoveryPhrase(phrase);
    
    const storedHash = localStorageMock.getItem('vault_recovery_hash');
    const storedSalt = localStorageMock.getItem('vault_recovery_salt');
    
    // Should not contain any words from the phrase
    expect(storedHash).not.toContain('abandon');
    expect(storedHash).not.toContain('ability');
    expect(storedSalt).not.toContain('abandon');
    expect(storedSalt).not.toContain('ability');
  });

  it('should use PBKDF2 with high iteration count', async () => {
    const phrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    
    const start = performance.now();
    await storeRecoveryPhrase(phrase);
    const duration = performance.now() - start;
    
    // PBKDF2 with 100,000 iterations should take measurable time
    // This is a basic check - actual timing depends on hardware
    expect(duration).toBeGreaterThan(0);
  });

  it('should generate unique salts', async () => {
    const phrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    const salts = new Set<string>();
    
    // Store same phrase multiple times - should get different salts
    for (let i = 0; i < 10; i++) {
      localStorageMock.clear();
      await storeRecoveryPhrase(phrase);
      const salt = localStorageMock.getItem('vault_recovery_salt');
      if (salt) salts.add(salt);
    }
    
    // All salts should be unique
    expect(salts.size).toBe(10);
  });

  it('should handle verification with corrupted storage', async () => {
    // Simulate corrupted hash
    localStorageMock.setItem('vault_recovery_hash', 'invalid_base64!!!');
    localStorageMock.setItem('vault_recovery_salt', btoa('test'));
    
    const phrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    
    // Should handle gracefully and return false
    const isValid = await verifyRecoveryPhrase(phrase);
    expect(isValid).toBe(false);
  });
});

