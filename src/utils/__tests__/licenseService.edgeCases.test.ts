/**
 * License Service Edge Case Tests
 * 
 * Additional tests for edge cases and error scenarios in license operations.
 */

import { LicenseService } from '../licenseService';
import { apiClient } from '../apiClient';
import { trialService } from '../trialService';
import { getLPVDeviceFingerprint } from '../deviceFingerprint';
import { measureOperation } from '../performanceMonitor';

// Mock dependencies
jest.mock('../apiClient');
jest.mock('../trialService');
jest.mock('../deviceFingerprint');
jest.mock('../licenseValidator');
jest.mock('../performanceMonitor');

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('LicenseService - Edge Cases', () => {
  let licenseService: LicenseService;

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    licenseService = LicenseService.getInstance();
    (getLPVDeviceFingerprint as jest.Mock).mockResolvedValue('device-id-123');
    (measureOperation as jest.Mock).mockImplementation((name, fn) => fn());
  });

  describe('activateLicense - Network Error Scenarios', () => {
    it('should handle network timeout errors', async () => {
      const mockError = {
        code: 'REQUEST_TIMEOUT',
        message: 'Request timed out',
      };

      (apiClient.post as jest.Mock).mockRejectedValue(mockError);

      const result = await licenseService.activateLicense('PERS-XXXX-XXXX-XXXX');

      expect(result.success).toBe(false);
      expect(result.error).toContain('connect');
    });

    it('should handle network connection errors', async () => {
      const mockError = {
        code: 'NETWORK_ERROR',
        message: 'Network request failed',
      };

      (apiClient.post as jest.Mock).mockRejectedValue(mockError);

      const result = await licenseService.activateLicense('PERS-XXXX-XXXX-XXXX');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid JSON response', async () => {
      // Mock fetch to return invalid JSON
      const mockResponse = {
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      };

      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Invalid JSON'));

      const result = await licenseService.activateLicense('PERS-XXXX-XXXX-XXXX');

      expect(result.success).toBe(false);
    });

    it('should handle server error (500)', async () => {
      const mockError = {
        code: 'HTTP_500',
        message: 'Internal server error',
        status: 500,
      };

      (apiClient.post as jest.Mock).mockRejectedValue(mockError);

      const result = await licenseService.activateLicense('PERS-XXXX-XXXX-XXXX');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('activateLicense - Trial Key Edge Cases', () => {
    it('should handle expired trial key reuse', async () => {
      localStorageMock.setItem('app_license_key', 'TRIA-XXXX-XXXX-XXXX');
      localStorageMock.setItem('app_license_type', 'trial');

      (trialService.getTrialInfo as jest.Mock).mockResolvedValue({
        isExpired: true,
      });

      (trialService.activateTrial as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Trial expired',
      });

      const result = await licenseService.activateLicense('TRIA-XXXX-XXXX-XXXX');

      expect(result.success).toBe(false);
      expect(result.error).toContain('trial');
    });

    it('should handle trial activation failure', async () => {
      (trialService.activateTrial as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Invalid trial key',
      });

      const result = await licenseService.activateLicense('TRIA-XXXX-XXXX-XXXX');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('transferLicense - Edge Cases', () => {
    it('should handle network errors during transfer', async () => {
      const mockError = {
        code: 'NETWORK_ERROR',
        message: 'Network request failed',
      };

      (apiClient.post as jest.Mock).mockRejectedValue(mockError);

      const result = await licenseService.transferLicense('PERS-XXXX-XXXX-XXXX');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle transfer limit reached', async () => {
      const mockResponse = {
        data: {
          status: 'transfer_limit_reached',
          error: 'Transfer limit reached',
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await licenseService.transferLicense('PERS-XXXX-XXXX-XXXX');

      expect(result.success).toBe(false);
      expect(result.error).toContain('limit');
    });

    it('should handle invalid license key format', async () => {
      const result = await licenseService.transferLicense('invalid-key');

      // Transfer should validate key format first
      expect(result.success).toBe(false);
    });

    it('should handle timeout during transfer', async () => {
      const mockError = {
        code: 'REQUEST_TIMEOUT',
        message: 'Request timed out',
      };

      (apiClient.post as jest.Mock).mockRejectedValue(mockError);

      const result = await licenseService.transferLicense('PERS-XXXX-XXXX-XXXX');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getLicenseInfo - Edge Cases', () => {
    it('should handle missing activated date', async () => {
      localStorageMock.setItem('app_license_key', 'PERS-XXXX-XXXX-XXXX');
      localStorageMock.setItem('app_license_type', 'personal');
      // Missing activated date

      const info = await licenseService.getLicenseInfo();

      expect(info.isValid).toBe(true);
      expect(info.activatedDate).toBeNull();
    });

    it('should handle invalid date string', async () => {
      localStorageMock.setItem('app_license_key', 'PERS-XXXX-XXXX-XXXX');
      localStorageMock.setItem('app_license_type', 'personal');
      localStorageMock.setItem('app_license_activated', 'invalid-date');

      const info = await licenseService.getLicenseInfo();

      expect(info.isValid).toBe(true);
      expect(info.activatedDate).toBeInstanceOf(Date);
    });

    it('should handle device mismatch without transfer requirement', async () => {
      localStorageMock.setItem('app_license_key', 'PERS-XXXX-XXXX-XXXX');
      localStorageMock.setItem('app_license_type', 'personal');

      // Mock validateLocalLicense to return invalid without transfer
      const { LicenseService } = await import('../licenseService');
      jest.spyOn(LicenseService.prototype as any, 'validateLocalLicense').mockResolvedValue({
        valid: false,
        requiresTransfer: false,
      });

      const info = await licenseService.getLicenseInfo();

      expect(info.isValid).toBe(false);
    });
  });

  describe('getMaxDevices - Edge Cases', () => {
    it('should handle missing license file gracefully', async () => {
      localStorageMock.clear();

      const result = await licenseService.getMaxDevices();

      expect(result).toBe(1); // Default fallback
    });

    it('should handle corrupted license file JSON', async () => {
      localStorageMock.setItem('lpv_license_file', 'corrupted-json{');

      const result = await licenseService.getMaxDevices();

      expect(result).toBe(1); // Fallback on error
    });

    it('should handle license file without max_devices field', async () => {
      const licenseFile = {
        license_key: 'PERS-XXXX-XXXX-XXXX',
        device_id: 'device-id-123',
        plan_type: 'personal',
        // Missing max_devices
      };
      localStorageMock.setItem('lpv_license_file', JSON.stringify(licenseFile));

      const result = await licenseService.getMaxDevices();

      expect(result).toBe(1); // Default
    });
  });

  describe('getAppStatus - Edge Cases', () => {
    it('should handle trial expiration during status check', async () => {
      localStorageMock.setItem('app_license_key', 'TRIA-XXXX-XXXX-XXXX');
      localStorageMock.setItem('app_license_type', 'trial');

      (trialService.getTrialInfo as jest.Mock).mockResolvedValue({
        isTrialActive: true,
        isExpired: true,
        daysRemaining: 0,
      });

      const status = await licenseService.getAppLicenseStatus();

      expect(status.canUseApp).toBe(false);
      expect(status.requiresPurchase).toBe(true);
    });

    it('should handle missing license gracefully', async () => {
      localStorageMock.clear();

      (trialService.getTrialInfo as jest.Mock).mockResolvedValue({
        isTrialActive: false,
        isExpired: false,
        hasTrialBeenUsed: false,
      });

      const status = await licenseService.getAppLicenseStatus();

      expect(status.isLicensed).toBe(false);
      expect(status.canUseApp).toBe(false);
    });
  });
});

