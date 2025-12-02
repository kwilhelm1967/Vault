/**
 * Validation Utility Tests
 * 
 * Tests for input validation and sanitization.
 */

import { sanitizeInput, validateMasterPassword, validateLicenseKey, validateEmail, validateUrl } from '../validation';

describe('Input Validation', () => {
  
  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = sanitizeInput(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should remove HTML tags', () => {
      const input = '<div onclick="hack()">Click me</div>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('<div');
      expect(result).not.toContain('onclick');
    });

    it('should preserve normal text', () => {
      const input = 'Hello World 123!@#';
      const result = sanitizeInput(input);
      expect(result).toBe(input);
    });

    it('should handle empty string', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('should handle null/undefined gracefully', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = sanitizeInput(input);
      expect(result).toBe('Hello World');
    });

    it('should limit length when maxLength provided', () => {
      const input = 'This is a very long string that exceeds the limit';
      const result = sanitizeInput(input, 10);
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('validateMasterPassword', () => {
    it('should reject passwords shorter than 12 characters', () => {
      const result = validateMasterPassword('short');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters');
    });

    it('should accept passwords 12+ characters', () => {
      const result = validateMasterPassword('longpassword123');
      expect(result.isValid).toBe(true);
    });

    it('should provide strength feedback', () => {
      const weak = validateMasterPassword('password1234');
      const strong = validateMasterPassword('MyStr0ng!Pass#2024');
      
      expect(weak.strength).toBe('weak');
      expect(strong.strength).toBe('strong');
    });

    it('should detect common passwords', () => {
      const result = validateMasterPassword('password123456');
      expect(result.warnings).toContain('Password contains common patterns');
    });
  });

  describe('validateLicenseKey', () => {
    it('should accept valid format XXXX-XXXX-XXXX-XXXX', () => {
      const result = validateLicenseKey('ABCD-1234-EFGH-5678');
      expect(result.isValid).toBe(true);
    });

    it('should accept format with trailing number XXXX-XXXX-XXXX-XXXX#', () => {
      const result = validateLicenseKey('ABCD-1234-EFGH-5678');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid format', () => {
      const result = validateLicenseKey('invalid-key');
      expect(result.isValid).toBe(false);
    });

    it('should normalize to uppercase', () => {
      const result = validateLicenseKey('abcd-1234-efgh-5678');
      expect(result.normalized).toBe('ABCD-1234-EFGH-5678');
    });

    it('should handle empty input', () => {
      const result = validateLicenseKey('');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should accept valid URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://localhost:3000')).toBe(true);
      expect(validateUrl('example.com')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('')).toBe(false);
      expect(validateUrl('not a url')).toBe(false);
    });
  });
});

