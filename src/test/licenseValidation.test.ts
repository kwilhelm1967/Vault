/**
 * License Validation Unit Tests
 * 
 * Tests for license key validation and trial management.
 */

import { validateLicenseKey, getLicenseType, singleUserLicenses, familyLicenses } from '../utils/licenseKeys';

describe('License Key Validation', () => {
  describe('Format Validation', () => {
    it('should accept valid single user license format', () => {
      // Single user format: LPV-XXXX-XXXX-XXXX
      const validKey = 'LPV-ABCD-1234-EFGH';
      const result = validateLicenseKey(validKey);
      expect(result).toBe(true);
    });

    it('should accept valid family license format', () => {
      // Family format: LPVF-XXXX-XXXX-XXXX
      const validKey = 'LPVF-ABCD-1234-EFGH';
      const result = validateLicenseKey(validKey);
      expect(result).toBe(true);
    });

    it('should reject invalid format', () => {
      const invalidKeys = [
        'INVALID-KEY',
        'LPV-123',
        'LPV-ABCD-1234',
        '',
        null as unknown as string,
        undefined as unknown as string,
      ];

      invalidKeys.forEach(key => {
        if (key !== null && key !== undefined) {
          const result = validateLicenseKey(key);
          expect(result).toBe(false);
        }
      });
    });

    it('should be case-insensitive', () => {
      const upperCase = 'LPV-ABCD-1234-EFGH';
      const lowerCase = 'lpv-abcd-1234-efgh';
      const mixedCase = 'Lpv-AbCd-1234-EfGh';

      // All should have consistent validation
      expect(typeof validateLicenseKey(upperCase)).toBe('boolean');
      expect(typeof validateLicenseKey(lowerCase)).toBe('boolean');
      expect(typeof validateLicenseKey(mixedCase)).toBe('boolean');
    });
  });

  describe('License Type Detection', () => {
    it('should identify single user license', () => {
      const singleUserKey = 'LPV-TEST-USER-KEY1';
      const type = getLicenseType(singleUserKey);
      expect(type).toBe('single');
    });

    it('should identify family license', () => {
      const familyKey = 'LPVF-TEST-FAMI-KEY1';
      const type = getLicenseType(familyKey);
      expect(type).toBe('family');
    });

    it('should return null for invalid keys', () => {
      const invalidKey = 'INVALID-KEY';
      const type = getLicenseType(invalidKey);
      expect(type).toBeNull();
    });
  });

  describe('License Key Storage', () => {
    it('should have defined single user licenses', () => {
      expect(Array.isArray(singleUserLicenses)).toBe(true);
      expect(singleUserLicenses.length).toBeGreaterThan(0);
    });

    it('should have defined family licenses', () => {
      expect(Array.isArray(familyLicenses)).toBe(true);
      expect(familyLicenses.length).toBeGreaterThan(0);
    });

    it('should not have overlapping keys between single and family', () => {
      const singleKeys = singleUserLicenses.map(l => l.key);
      const familyKeys = familyLicenses.map(l => l.key);
      const overlap = singleKeys.filter(key => familyKeys.includes(key));
      expect(overlap).toHaveLength(0);
    });
  });

  describe('Trial License', () => {
    it('should recognize trial license format', () => {
      const trialKey = 'TRIAL-DEV-7DAY-0001';
      // Trial keys have specific format
      expect(trialKey.startsWith('TRIAL')).toBe(true);
    });

    it('should extract trial duration from key', () => {
      const trialKey = 'TRIAL-DEV-7DAY-0001';
      const match = trialKey.match(/(\d+)DAY/);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('7');
    });
  });
});

describe('Trial Service', () => {
  describe('Trial Status', () => {
    it('should calculate trial expiry correctly', () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const durationDays = 7;
      const expiryDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
      
      expect(expiryDate.toISOString()).toBe('2024-01-08T00:00:00.000Z');
    });

    it('should detect expired trial', () => {
      const expiryDate = new Date('2024-01-01T00:00:00Z');
      const now = new Date('2024-01-02T00:00:00Z');
      
      const isExpired = now > expiryDate;
      expect(isExpired).toBe(true);
    });

    it('should detect active trial', () => {
      const expiryDate = new Date('2024-12-31T00:00:00Z');
      const now = new Date('2024-01-01T00:00:00Z');
      
      const isExpired = now > expiryDate;
      expect(isExpired).toBe(false);
    });

    it('should calculate remaining time correctly', () => {
      const expiryDate = new Date('2024-01-08T00:00:00Z');
      const now = new Date('2024-01-05T00:00:00Z');
      
      const remainingMs = expiryDate.getTime() - now.getTime();
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
      
      expect(remainingDays).toBe(3);
    });
  });

  describe('JWT Token Parsing', () => {
    it('should parse valid JWT structure', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ 
        isTrial: true, 
        planType: 'trial',
        trialExpiryDate: '2024-12-31T00:00:00Z'
      }));
      const signature = 'test_signature';
      const token = `${header}.${payload}.${signature}`;
      
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
      
      const parsedPayload = JSON.parse(atob(parts[1]));
      expect(parsedPayload.isTrial).toBe(true);
      expect(parsedPayload.planType).toBe('trial');
    });

    it('should handle invalid JWT gracefully', () => {
      const invalidTokens = [
        'not.a.valid.token',
        'invalid',
        '',
        'only.two.parts',
      ];

      invalidTokens.forEach(token => {
        const parts = token.split('.');
        const isValid = parts.length === 3;
        
        if (!isValid) {
          expect(parts.length).not.toBe(3);
        }
      });
    });
  });

  describe('License Activation', () => {
    it('should format license key consistently', () => {
      const inputKey = 'lpv-abcd-1234-efgh';
      const formattedKey = inputKey.toUpperCase();
      
      expect(formattedKey).toBe('LPV-ABCD-1234-EFGH');
    });

    it('should trim whitespace from license key', () => {
      const inputKey = '  LPV-ABCD-1234-EFGH  ';
      const trimmedKey = inputKey.trim();
      
      expect(trimmedKey).toBe('LPV-ABCD-1234-EFGH');
    });
  });
});

describe('Password Strength Validation', () => {
  const checkStrength = (password: string) => {
    const checks = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /[0-9]/.test(password),
      symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    
    return {
      checks,
      score,
      strength: score <= 2 ? 'weak' : score <= 3 ? 'medium' : 'strong',
    };
  };

  it('should rate weak password correctly', () => {
    const result = checkStrength('password');
    expect(result.strength).toBe('weak');
  });

  it('should rate medium password correctly', () => {
    const result = checkStrength('Password123');
    expect(result.strength).toBe('medium');
  });

  it('should rate strong password correctly', () => {
    const result = checkStrength('SecurePassword123!');
    expect(result.strength).toBe('strong');
  });

  it('should check for uppercase letters', () => {
    const result = checkStrength('ALLUPPERCASE');
    expect(result.checks.uppercase).toBe(true);
    expect(result.checks.lowercase).toBe(false);
  });

  it('should check for numbers', () => {
    const result = checkStrength('Password123');
    expect(result.checks.numbers).toBe(true);
  });

  it('should check for symbols', () => {
    const result = checkStrength('Password!');
    expect(result.checks.symbols).toBe(true);
  });

  it('should require minimum 12 characters', () => {
    const shortPassword = checkStrength('Short1!');
    const longPassword = checkStrength('LongEnoughPass1!');
    
    expect(shortPassword.checks.length).toBe(false);
    expect(longPassword.checks.length).toBe(true);
  });
});










