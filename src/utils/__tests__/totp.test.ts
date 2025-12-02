/**
 * TOTP Utility Tests
 * 
 * Tests for Time-based One-Time Password generation.
 * Note: Some tests are skipped due to crypto requirements in Node.js environment.
 */

import { getTimeRemaining, isValidTOTPSecret } from '../totp';

describe('TOTP Utilities', () => {
  
  describe('isValidTOTPSecret', () => {
    it('should accept valid base32 secrets', () => {
      expect(isValidTOTPSecret('JBSWY3DPEHPK3PXP')).toBe(true);
      expect(isValidTOTPSecret('GEZDGNBVGY3TQOJQ')).toBe(true);
    });

    it('should reject empty secrets', () => {
      expect(isValidTOTPSecret('')).toBe(false);
    });

    it('should reject secrets with invalid characters', () => {
      expect(isValidTOTPSecret('invalid!')).toBe(false);
    });

    it('should reject secrets that are too short', () => {
      expect(isValidTOTPSecret('ABC')).toBe(false);
    });

    it('should handle secrets with spaces', () => {
      expect(isValidTOTPSecret('JBSW Y3DP EHPK 3PXP')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isValidTOTPSecret('jbswy3dpehpk3pxp')).toBe(true);
    });
  });

  describe('getTimeRemaining', () => {
    it('should return a number between 0 and 30', () => {
      const remaining = getTimeRemaining();
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(30);
    });

    it('should be an integer', () => {
      const remaining = getTimeRemaining();
      expect(Number.isInteger(remaining)).toBe(true);
    });
  });

  // Note: generateTOTP and base32Decode tests skipped
  // They require crypto.subtle which is not available in Node.js test environment
  // These functions are tested manually in the browser
});

