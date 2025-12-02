/**
 * License Keys Tests
 * 
 * Tests for license key validation and lookup.
 */

import { singleUserLicenses, familyLicenses } from '../licenseKeys';

describe('License Keys', () => {
  
  describe('singleUserLicenses', () => {
    it('should have valid structure', () => {
      singleUserLicenses.forEach(license => {
        expect(license).toHaveProperty('key');
        expect(license).toHaveProperty('type');
        expect(license).toHaveProperty('expires');
        expect(license).toHaveProperty('expirationDate');
      });
    });

    it('should all be single type', () => {
      singleUserLicenses.forEach(license => {
        expect(license.type).toBe('single');
      });
    });

    it('should have valid key format XXXX-XXXX-XXXX-XXXX#', () => {
      const keyPattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4,5}$/;
      singleUserLicenses.forEach(license => {
        expect(license.key).toMatch(keyPattern);
      });
    });

    it('should have unique keys', () => {
      const keys = singleUserLicenses.map(l => l.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });
  });

  describe('familyLicenses', () => {
    it('should have valid structure', () => {
      familyLicenses.forEach(license => {
        expect(license).toHaveProperty('key');
        expect(license).toHaveProperty('type');
        expect(license).toHaveProperty('expires');
        expect(license).toHaveProperty('expirationDate');
      });
    });

    it('should all be family type', () => {
      familyLicenses.forEach(license => {
        expect(license.type).toBe('family');
      });
    });

    it('should have valid key format', () => {
      const keyPattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4,5}$/;
      familyLicenses.forEach(license => {
        expect(license.key).toMatch(keyPattern);
      });
    });

    it('should have unique keys', () => {
      const keys = familyLicenses.map(l => l.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });
  });

  describe('All licenses', () => {
    it('should have no duplicate keys across types', () => {
      const allKeys = [
        ...singleUserLicenses.map(l => l.key),
        ...familyLicenses.map(l => l.key),
      ];
      const uniqueKeys = new Set(allKeys);
      expect(uniqueKeys.size).toBe(allKeys.length);
    });

    it('should have future expiration dates', () => {
      const now = new Date();
      const allLicenses = [...singleUserLicenses, ...familyLicenses];
      
      allLicenses.forEach(license => {
        expect(new Date(license.expirationDate).getTime()).toBeGreaterThan(now.getTime());
      });
    });
  });
});

