/**
 * License Validator Tests
 * 
 * Tests for license file signature verification and validation.
 */

import { verifyLicenseSignature, verifyLicenseSignatureSync } from '../licenseValidator';

// Mock crypto.subtle for HMAC operations
const mockCrypto = {
  subtle: {
    importKey: jest.fn(),
    sign: jest.fn(),
  },
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

describe('License Validator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyLicenseSignature', () => {
    it('should accept unsigned files in development mode', async () => {
      const originalEnv = import.meta.env.DEV;
      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: true },
        writable: true,
      });

      const licenseFile = {
        license_key: 'PERS-XXXX-XXXX-XXXX',
        device_id: 'device-id-123',
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signed_at: new Date().toISOString(),
      };

      const result = await verifyLicenseSignature(licenseFile as Parameters<typeof verifyLicenseSignature>[0]);
      
      expect(result).toBe(true);

      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: originalEnv },
        writable: true,
      });
    });

    it('should reject files without signature in production', async () => {
      const originalEnv = import.meta.env.DEV;
      const originalSecret = import.meta.env.VITE_LICENSE_SIGNING_SECRET;
      
      Object.defineProperty(import.meta, 'env', {
        value: { 
          ...import.meta.env, 
          DEV: false,
          VITE_LICENSE_SIGNING_SECRET: 'test-secret',
        },
        writable: true,
      });

      const licenseFile = {
        license_key: 'PERS-XXXX-XXXX-XXXX',
        device_id: 'device-id-123',
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signed_at: new Date().toISOString(),
      };

      const result = await verifyLicenseSignature(licenseFile as Parameters<typeof verifyLicenseSignature>[0]);
      
      expect(result).toBe(false);

      Object.defineProperty(import.meta, 'env', {
        value: { 
          ...import.meta.env, 
          DEV: originalEnv,
          VITE_LICENSE_SIGNING_SECRET: originalSecret,
        },
        writable: true,
      });
    });

    it('should verify valid signature', async () => {
      const originalEnv = import.meta.env.DEV;
      const originalSecret = import.meta.env.VITE_LICENSE_SIGNING_SECRET;
      
      Object.defineProperty(import.meta, 'env', {
        value: { 
          ...import.meta.env, 
          DEV: false,
          VITE_LICENSE_SIGNING_SECRET: 'test-secret',
        },
        writable: true,
      });

      const licenseData = {
        license_key: 'PERS-XXXX-XXXX-XXXX',
        device_id: 'device-id-123',
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
      };

      const expectedSignature = 'abc123def456';
      const licenseFile = {
        ...licenseData,
        signature: expectedSignature,
        signed_at: new Date().toISOString(),
      };

      // Mock crypto operations
      const mockKey = { type: 'secret' };
      const mockSignature = new Uint8Array([0xab, 0xc1, 0x23, 0xde, 0xf4, 0x56]);
      
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.sign.mockResolvedValue(mockSignature);

      // Mock TextEncoder
      global.TextEncoder = jest.fn().mockImplementation(() => ({
        encode: jest.fn((str: string) => new Uint8Array(str.length)),
      })) as any;

      const result = await verifyLicenseSignature(licenseFile as Parameters<typeof verifyLicenseSignature>[0]);
      
      expect(mockCrypto.subtle.importKey).toHaveBeenCalled();
      expect(mockCrypto.subtle.sign).toHaveBeenCalled();

      Object.defineProperty(import.meta, 'env', {
        value: { 
          ...import.meta.env, 
          DEV: originalEnv,
          VITE_LICENSE_SIGNING_SECRET: originalSecret,
        },
        writable: true,
      });
    });

    it('should handle crypto errors gracefully', async () => {
      const originalEnv = import.meta.env.DEV;
      const originalSecret = import.meta.env.VITE_LICENSE_SIGNING_SECRET;
      
      Object.defineProperty(import.meta, 'env', {
        value: { 
          ...import.meta.env, 
          DEV: false,
          VITE_LICENSE_SIGNING_SECRET: 'test-secret',
        },
        writable: true,
      });

      const licenseFile = {
        license_key: 'PERS-XXXX-XXXX-XXXX',
        device_id: 'device-id-123',
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signature: 'valid-signature',
        signed_at: new Date().toISOString(),
      };

      mockCrypto.subtle.importKey.mockRejectedValue(
        new Error('Crypto operation failed')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await verifyLicenseSignature(licenseFile as Parameters<typeof verifyLicenseSignature>[0]);
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();

      Object.defineProperty(import.meta, 'env', {
        value: { 
          ...import.meta.env, 
          DEV: originalEnv,
          VITE_LICENSE_SIGNING_SECRET: originalSecret,
        },
        writable: true,
      });
    });

    it('should reject files without secret in production', async () => {
      const originalEnv = import.meta.env.DEV;
      const originalSecret = import.meta.env.VITE_LICENSE_SIGNING_SECRET;
      
      Object.defineProperty(import.meta, 'env', {
        value: { 
          ...import.meta.env, 
          DEV: false,
          VITE_LICENSE_SIGNING_SECRET: '',
        },
        writable: true,
      });

      const licenseFile = {
        license_key: 'PERS-XXXX-XXXX-XXXX',
        device_id: 'device-id-123',
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signature: 'valid-signature',
        signed_at: new Date().toISOString(),
      };

      const result = await verifyLicenseSignature(licenseFile as Parameters<typeof verifyLicenseSignature>[0]);
      
      expect(result).toBe(false);

      Object.defineProperty(import.meta, 'env', {
        value: { 
          ...import.meta.env, 
          DEV: originalEnv,
          VITE_LICENSE_SIGNING_SECRET: originalSecret,
        },
        writable: true,
      });
    });
  });

  describe('verifyLicenseSignatureSync', () => {
    it('should accept unsigned files in development mode', () => {
      const originalEnv = import.meta.env.DEV;
      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: true },
        writable: true,
      });

      const licenseFile = {
        license_key: 'PERS-XXXX-XXXX-XXXX',
        device_id: 'device-id-123',
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signed_at: new Date().toISOString(),
      };

      const result = verifyLicenseSignatureSync(licenseFile as Parameters<typeof verifyLicenseSignatureSync>[0]);
      
      expect(result).toBe(true);

      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: originalEnv },
        writable: true,
      });
    });

    it('should reject files without signature in production', () => {
      const originalEnv = import.meta.env.DEV;
      const originalSecret = import.meta.env.VITE_LICENSE_SIGNING_SECRET;
      
      Object.defineProperty(import.meta, 'env', {
        value: { 
          ...import.meta.env, 
          DEV: false,
          VITE_LICENSE_SIGNING_SECRET: 'test-secret',
        },
        writable: true,
      });

      const licenseFile = {
        license_key: 'PERS-XXXX-XXXX-XXXX',
        device_id: 'device-id-123',
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signed_at: new Date().toISOString(),
      };

      const result = verifyLicenseSignatureSync(licenseFile as Parameters<typeof verifyLicenseSignatureSync>[0]);
      
      expect(result).toBe(false);

      Object.defineProperty(import.meta, 'env', {
        value: { 
          ...import.meta.env, 
          DEV: originalEnv,
          VITE_LICENSE_SIGNING_SECRET: originalSecret,
        },
        writable: true,
      });
    });

    it('should accept files with signature structure', () => {
      const originalEnv = import.meta.env.DEV;
      const originalSecret = import.meta.env.VITE_LICENSE_SIGNING_SECRET;
      
      Object.defineProperty(import.meta, 'env', {
        value: { 
          ...import.meta.env, 
          DEV: false,
          VITE_LICENSE_SIGNING_SECRET: 'test-secret',
        },
        writable: true,
      });

      const licenseFile = {
        license_key: 'PERS-XXXX-XXXX-XXXX',
        device_id: 'device-id-123',
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signature: 'valid-signature',
        signed_at: new Date().toISOString(),
      };

      // Sync version does basic structure check
      const result = verifyLicenseSignatureSync(licenseFile as Parameters<typeof verifyLicenseSignatureSync>[0]);
      
      expect(result).toBe(true);

      Object.defineProperty(import.meta, 'env', {
        value: { 
          ...import.meta.env, 
          DEV: originalEnv,
          VITE_LICENSE_SIGNING_SECRET: originalSecret,
        },
        writable: true,
      });
    });
  });
});





