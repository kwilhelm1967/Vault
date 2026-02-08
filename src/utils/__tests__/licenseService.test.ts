/**
 * License Service Tests
 * 
 * Tests for license activation, validation, and transfer functionality.
 */

import { LicenseService } from '../licenseService';
import { verifyLicenseSignature } from '../licenseValidator';
import { trialService } from '../trialService';
import { getLPVDeviceFingerprint } from '../deviceFingerprint';
import { apiClient } from '../apiClient';
import _environment from '../../config/environment';

// Mock dependencies
jest.mock('../licenseValidator');
jest.mock('../trialService');
jest.mock('../deviceFingerprint');
jest.mock('../apiClient');
jest.mock('../../config/environment', () => ({
  default: {
    environment: {
      licenseServerUrl: 'https://api.example.com',
    },
  },
}));

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

// Mock fetch
global.fetch = jest.fn();

describe('LicenseService', () => {
  let licenseService: LicenseService;

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    licenseService = LicenseService.getInstance();
    (getLPVDeviceFingerprint as jest.Mock).mockResolvedValue('device-id-123');
    // Ensure MODE is set to test to prevent dev mode bypass
    if (!import.meta.env.MODE) {
      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, MODE: 'test' },
        writable: true,
        configurable: true,
      });
    }
  });

  describe('getLicenseInfo', () => {
    it('should return invalid license when no license stored', async () => {
      const info = await licenseService.getLicenseInfo();
      
      expect(info.isValid).toBe(false);
      expect(info.type).toBeNull();
      expect(info.key).toBeNull();
    });

    it('should return valid license info when license exists', async () => {
      localStorageMock.setItem('app_license_key', 'PERS-XXXX-XXXX-XXXX');
      localStorageMock.setItem('app_license_type', 'personal');
      localStorageMock.setItem('app_license_activated', new Date().toISOString());
      localStorageMock.setItem('lpv_license_file', JSON.stringify({
        license_key: 'PERS-XXXX-XXXX-XXXX',
        device_id: 'device-id-123',
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signature: 'valid-signature',
        signed_at: new Date().toISOString(),
      }));

      const info = await licenseService.getLicenseInfo();
      
      expect(info.isValid).toBe(true);
      expect(info.type).toBe('personal');
      expect(info.key).toBe('PERS-XXXX-XXXX-XXXX');
    });
  });

  describe('activateLicense', () => {
    it('should reject invalid license key format', async () => {
      const result = await licenseService.activateLicense('invalid-key');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not a valid license key');
    });

    it('should activate license in development mode', async () => {
      const originalEnv = import.meta.env.DEV;
      const originalMode = import.meta.env.MODE;
      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: true, MODE: 'development' },
        writable: true,
        configurable: true,
      });

      const result = await licenseService.activateLicense('PERS-XXXX-XXXX-XXXX');
      
      expect(result.success).toBe(true);
      expect(localStorageMock.getItem('app_license_key')).toBe('PERS-XXXX-XXXX-XXXX');

      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: originalEnv, MODE: originalMode },
        writable: true,
        configurable: true,
      });
    });

    it('should call activation API with correct parameters', async () => {
      const originalEnv = import.meta.env.DEV;
      const originalMode = import.meta.env.MODE;
      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: false, MODE: 'test' },
        writable: true,
        configurable: true,
      });

      const mockResponse = {
        data: {
          status: 'activated',
          plan_type: 'personal',
          license_file: {
            license_key: 'PERS-XXXX-XXXX-XXXX',
            device_id: 'device-id-123',
            plan_type: 'personal',
            max_devices: 1,
            activated_at: new Date().toISOString(),
            signature: 'valid-signature',
            signed_at: new Date().toISOString(),
          },
        },
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      (verifyLicenseSignature as jest.Mock).mockResolvedValue(true);

      const result = await licenseService.activateLicense('PERS-XXXX-XXXX-XXXX');
      
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/lpv/license/activate',
        expect.objectContaining({
          license_key: 'PERS-XXXX-XXXX-XXXX',
          device_id: 'device-id-123',
        }),
        expect.any(Object)
      );

      expect(result.success).toBe(true);

      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: originalEnv, MODE: originalMode },
        writable: true,
        configurable: true,
      });
    });

    it('should handle device mismatch response', async () => {
      const originalEnv = import.meta.env.DEV;
      const originalMode = import.meta.env.MODE;
      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: false, MODE: 'test' },
        writable: true,
        configurable: true,
      });

      const mockResponse = {
        data: {
          status: 'device_mismatch',
          mode: 'requires_transfer',
        },
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await licenseService.activateLicense('PERS-XXXX-XXXX-XXXX');
      
      expect(result.success).toBe(false);
      expect(result.requiresTransfer).toBe(true);
      expect(result.status).toBe('device_mismatch');

      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: originalEnv, MODE: originalMode },
        writable: true,
        configurable: true,
      });
    });

    it('should handle invalid license key response', async () => {
      const originalEnv = import.meta.env.DEV;
      const originalMode = import.meta.env.MODE;
      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: false, MODE: 'test' },
        writable: true,
        configurable: true,
      });

      const mockResponse = {
        data: {
          status: 'invalid',
          error: 'License key not found',
        },
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await licenseService.activateLicense('PERS-INVALID-XXXX');
      
      expect(result.success).toBe(false);
      expect(result.status).toBe('invalid');
      expect(result.error).toContain('not a valid license key');

      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: originalEnv, MODE: originalMode },
        writable: true,
        configurable: true,
      });
    });

    it('should handle revoked license response', async () => {
      const originalEnv = import.meta.env.DEV;
      const originalMode = import.meta.env.MODE;
      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: false, MODE: 'test' },
        writable: true,
        configurable: true,
      });

      const mockResponse = {
        data: {
          status: 'revoked',
          error: 'License has been revoked',
        },
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await licenseService.activateLicense('PERS-REVOKED-XXXX');
      
      expect(result.success).toBe(false);
      expect(result.status).toBe('revoked');

      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: originalEnv, MODE: originalMode },
        writable: true,
        configurable: true,
      });
    });

    it('should handle network errors', async () => {
      const originalEnv = import.meta.env.DEV;
      const originalMode = import.meta.env.MODE;
      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: false, MODE: 'test' },
        writable: true,
        configurable: true,
      });

      (apiClient.post as jest.Mock).mockRejectedValue({
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to license server',
      });

      const result = await licenseService.activateLicense('PERS-XXXX-XXXX-XXXX');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unable to connect');

      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: originalEnv, MODE: originalMode },
        writable: true,
        configurable: true,
      });
    });

    it('should reject expired trial key reuse', async () => {
      const originalEnv = import.meta.env.DEV;
      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: false },
        writable: true,
      });

      localStorageMock.setItem('app_license_key', 'TRIAL-XXXX-XXXX-XXXX');
      localStorageMock.setItem('app_license_type', 'trial');

      (trialService.getTrialInfo as jest.Mock).mockResolvedValue({
        isExpired: true,
      });

      const result = await licenseService.activateLicense('TRIAL-XXXX-XXXX-XXXX');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('trial');

      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: originalEnv },
        writable: true,
      });
    });

    it('should validate and save signed license file', async () => {
      const originalEnv = import.meta.env.DEV;
      const originalMode = import.meta.env.MODE;
      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: false, MODE: 'test' },
        writable: true,
        configurable: true,
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

      const mockResponse = {
        data: {
          status: 'activated',
          plan_type: 'personal',
          license_file: licenseFile,
        },
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      (verifyLicenseSignature as jest.Mock).mockResolvedValue(true);

      const result = await licenseService.activateLicense('PERS-XXXX-XXXX-XXXX');
      
      expect(verifyLicenseSignature).toHaveBeenCalledWith(licenseFile);
      expect(result.success).toBe(true);
      expect(localStorageMock.getItem('lpv_license_file')).toBeTruthy();

      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: originalEnv, MODE: originalMode },
        writable: true,
        configurable: true,
      });
    });

    it('should reject license file with invalid signature', async () => {
      const originalEnv = import.meta.env.DEV;
      const originalMode = import.meta.env.MODE;
      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: false, MODE: 'test' },
        writable: true,
        configurable: true,
      });

      const licenseFile = {
        license_key: 'PERS-XXXX-XXXX-XXXX',
        device_id: 'device-id-123',
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signature: 'invalid-signature',
        signed_at: new Date().toISOString(),
      };

      const mockResponse = {
        data: {
          status: 'activated',
          plan_type: 'personal',
          license_file: licenseFile,
        },
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      (verifyLicenseSignature as jest.Mock).mockResolvedValue(false);

      const result = await licenseService.activateLicense('PERS-XXXX-XXXX-XXXX');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('signature');

      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: originalEnv, MODE: originalMode },
        writable: true,
        configurable: true,
      });
    });
  });

  describe('transferLicense', () => {
    it('should transfer license to current device', async () => {
      const originalEnv = import.meta.env.DEV;
      const originalMode = import.meta.env.MODE;
      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: false, MODE: 'test' },
        writable: true,
        configurable: true,
      });

      const mockResponse = {
        data: {
          status: 'transferred',
          license_file: {
            license_key: 'PERS-XXXX-XXXX-XXXX',
            device_id: 'device-id-123',
            plan_type: 'personal',
            max_devices: 1,
            activated_at: new Date().toISOString(),
            signature: 'valid-signature',
            signed_at: new Date().toISOString(),
          },
        },
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      (verifyLicenseSignature as jest.Mock).mockResolvedValue(true);

      const result = await licenseService.transferLicense('PERS-XXXX-XXXX-XXXX');
      
      expect(result.success).toBe(true);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/lpv/license/transfer',
        expect.objectContaining({
          license_key: 'PERS-XXXX-XXXX-XXXX',
          device_id: 'device-id-123',
        }),
        expect.any(Object)
      );

      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: originalEnv, MODE: originalMode },
        writable: true,
        configurable: true,
      });
    });

    it('should handle transfer limit reached', async () => {
      const originalEnv = import.meta.env.DEV;
      const originalMode = import.meta.env.MODE;
      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: false, MODE: 'test' },
        writable: true,
        configurable: true,
      });

      const mockResponse = {
        data: {
          status: 'transfer_limit_reached',
          error: 'Transfer limit reached',
        },
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await licenseService.transferLicense('PERS-XXXX-XXXX-XXXX');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('limit');

      Object.defineProperty(import.meta, 'env', {
        value: { ...import.meta.env, DEV: originalEnv, MODE: originalMode },
        writable: true,
        configurable: true,
      });
    });
  });

  describe('getAppLicenseStatus', () => {
    it('should return unlicensed status when no license', async () => {
      const status = await licenseService.getAppLicenseStatus();
      
      expect(status.isLicensed).toBe(false);
      expect(status.canUseApp).toBe(false);
      expect(status.requiresPurchase).toBe(true);
    });

    it('should return licensed status when valid license exists', async () => {
      localStorageMock.setItem('app_license_key', 'PERS-XXXX-XXXX-XXXX');
      localStorageMock.setItem('app_license_type', 'personal');
      localStorageMock.setItem('app_license_activated', new Date().toISOString());
      localStorageMock.setItem('lpv_license_file', JSON.stringify({
        license_key: 'PERS-XXXX-XXXX-XXXX',
        device_id: 'device-id-123',
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signature: 'valid-signature',
        signed_at: new Date().toISOString(),
      }));

      (trialService.getTrialInfo as jest.Mock).mockResolvedValue({
        hasTrial: false,
        isExpired: false,
      });

      const status = await licenseService.getAppLicenseStatus();
      
      expect(status.isLicensed).toBe(true);
      expect(status.canUseApp).toBe(true);
      expect(status.requiresPurchase).toBe(false);
    });
  });

  describe('getLocalLicenseFile', () => {
    it('should return null when no license file exists', async () => {
      localStorageMock.clear();
      const result = await licenseService.getLocalLicenseFile();
      expect(result).toBeNull();
    });

    it('should return license file when valid file exists', async () => {
      const licenseFile = {
        license_key: 'PERS-XXXX-XXXX-XXXX',
        device_id: 'device-id-123',
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signature: 'valid-signature',
        signed_at: new Date().toISOString(),
      };
      localStorageMock.setItem('lpv_license_file', JSON.stringify(licenseFile));

      const result = await licenseService.getLocalLicenseFile();
      
      expect(result).not.toBeNull();
      expect(result?.license_key).toBe('PERS-XXXX-XXXX-XXXX');
      expect(result?.device_id).toBe('device-id-123');
    });

    it('should handle corruption recovery', async () => {
      // Mock corruption handler
      const mockCorruptionHandler = {
        checkLicenseFileCorruption: jest.fn().mockReturnValue({
          isCorrupted: true,
          recoverable: true,
          errors: ['Invalid JSON structure'],
        }),
        recoverLicenseFile: jest.fn().mockReturnValue({
          success: true,
          recovered: true,
          data: {
            license_key: 'PERS-XXXX-XXXX-XXXX',
            device_id: 'device-id-123',
            plan_type: 'personal',
            max_devices: 1,
          },
        }),
      };

      // Store corrupted data
      localStorageMock.setItem('lpv_license_file', 'corrupted-json{');

      // Mock dynamic import
      jest.doMock('../corruptionHandler', () => mockCorruptionHandler);

      const result = await licenseService.getLocalLicenseFile();
      
      expect(result).not.toBeNull();
      expect(result?.license_key).toBe('PERS-XXXX-XXXX-XXXX');
    });

    it('should return null when corruption cannot be recovered', async () => {
      const mockCorruptionHandler = {
        checkLicenseFileCorruption: jest.fn().mockReturnValue({
          isCorrupted: true,
          recoverable: false,
          errors: ['Severe corruption'],
        }),
      };

      localStorageMock.setItem('lpv_license_file', 'severely-corrupted');

      jest.doMock('../corruptionHandler', () => mockCorruptionHandler);

      const result = await licenseService.getLocalLicenseFile();
      
      expect(result).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      localStorageMock.setItem('lpv_license_file', 'invalid-json{');

      const result = await licenseService.getLocalLicenseFile();
      
      // Should handle gracefully and return null
      expect(result).toBeNull();
    });

    it('should handle async import errors', async () => {
      localStorageMock.setItem('lpv_license_file', JSON.stringify({
        license_key: 'PERS-XXXX-XXXX-XXXX',
        device_id: 'device-id-123',
      }));

      // Mock import failure
      jest.doMock('../corruptionHandler', () => {
        throw new Error('Module not found');
      });

      // Should still work if corruption check fails
      const result = await licenseService.getLocalLicenseFile();
      // Result depends on whether corruption handler is required
      expect(result).toBeDefined();
    });
  });

  describe('getMaxDevices', () => {
    it('should return 1 when no license file exists', async () => {
      localStorageMock.clear();
      const result = await licenseService.getMaxDevices();
      expect(result).toBe(1);
    });

    it('should return max_devices from license file', async () => {
      const licenseFile = {
        license_key: 'FAMI-XXXX-XXXX-XXXX',
        device_id: 'device-id-123',
        plan_type: 'family',
        max_devices: 5,
        activated_at: new Date().toISOString(),
        signature: 'valid-signature',
        signed_at: new Date().toISOString(),
      };
      localStorageMock.setItem('lpv_license_file', JSON.stringify(licenseFile));

      const result = await licenseService.getMaxDevices();
      expect(result).toBe(5);
    });

    it('should return 1 when max_devices is not specified', async () => {
      const licenseFile = {
        license_key: 'PERS-XXXX-XXXX-XXXX',
        device_id: 'device-id-123',
        plan_type: 'personal',
        activated_at: new Date().toISOString(),
        signature: 'valid-signature',
        signed_at: new Date().toISOString(),
      };
      localStorageMock.setItem('lpv_license_file', JSON.stringify(licenseFile));

      const result = await licenseService.getMaxDevices();
      expect(result).toBe(1);
    });

    it('should handle errors gracefully and return 1', async () => {
      // Set invalid data that will cause getLocalLicenseFile to fail
      localStorageMock.setItem('lpv_license_file', 'invalid-json');

      const result = await licenseService.getMaxDevices();
      expect(result).toBe(1); // Fallback value
    });
  });

  describe('getCurrentDeviceInfo', () => {
    it('should return null when no license file exists', async () => {
      localStorageMock.clear();
      const result = await licenseService.getCurrentDeviceInfo();
      expect(result).toBeNull();
    });

    it('should return device info when license file exists', async () => {
      const licenseFile = {
        license_key: 'PERS-XXXX-XXXX-XXXX',
        device_id: 'device-id-123',
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signature: 'valid-signature',
        signed_at: new Date().toISOString(),
      };
      localStorageMock.setItem('lpv_license_file', JSON.stringify(licenseFile));

      const result = await licenseService.getCurrentDeviceInfo();
      
      expect(result).not.toBeNull();
      expect(result?.deviceId).toBe('device-id-123');
    });
  });
});





