/**
 * Integration Tests: License Activation Flow
 * 
 * Tests the complete license activation flow from start to finish,
 * including device binding, validation, and offline operation.
 */

import { LicenseService } from '../../utils/licenseService';
import { getLPVDeviceFingerprint } from '../../utils/deviceFingerprint';
import { verifyLicenseSignature } from '../../utils/licenseValidator';

// Mock dependencies
jest.mock('../../utils/deviceFingerprint');
jest.mock('../../utils/licenseValidator');

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

describe('License Activation Flow - Integration Tests', () => {
  let licenseService: LicenseService;

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    licenseService = LicenseService.getInstance();
    (getLPVDeviceFingerprint as jest.Mock).mockResolvedValue('device-id-123');
    (verifyLicenseSignature as jest.Mock).mockResolvedValue(true);
  });

  describe('Complete Activation Flow', () => {
    it('should complete full activation flow: validate -> activate -> store -> verify', async () => {
      const licenseKey = 'PERS-XXXX-XXXX-XXXX';
      const deviceId = 'device-id-123';

      // Mock successful activation response
      const mockLicenseFile = {
        license_key: licenseKey,
        device_id: deviceId,
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signature: 'valid-signature',
        signed_at: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          status: 'activated',
          plan_type: 'personal',
          license_file: mockLicenseFile,
        }),
      });

      // Step 1: Activate license
      const activationResult = await licenseService.activateLicense(licenseKey);
      expect(activationResult.success).toBe(true);

      // Step 2: Verify license file was stored
      const storedFile = await licenseService.getLocalLicenseFile();
      expect(storedFile).not.toBeNull();
      expect(storedFile?.license_key).toBe(licenseKey);
      expect(storedFile?.device_id).toBe(deviceId);

      // Step 3: Verify license info
      const licenseInfo = await licenseService.getLicenseInfo();
      expect(licenseInfo.isValid).toBe(true);
      expect(licenseInfo.type).toBe('personal');
      expect(licenseInfo.key).toBe(licenseKey);

      // Step 4: Verify app status
      const appStatus = await licenseService.getAppLicenseStatus();
      expect(appStatus.isLicensed).toBe(true);
      expect(appStatus.canUseApp).toBe(true);
    });

    it('should handle device mismatch and require transfer', async () => {
      const licenseKey = 'PERS-XXXX-XXXX-XXXX';
      const existingDeviceId = 'device-id-456';

      // Store existing license for different device
      localStorageMock.setItem('lpv_license_file', JSON.stringify({
        license_key: licenseKey,
        device_id: existingDeviceId,
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signature: 'valid-signature',
        signed_at: new Date().toISOString(),
      }));

      // Mock device mismatch response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          status: 'device_mismatch',
          mode: 'requires_transfer',
        }),
      });

      const result = await licenseService.activateLicense(licenseKey);
      
      expect(result.success).toBe(false);
      expect(result.requiresTransfer).toBe(true);
      expect(result.status).toBe('device_mismatch');
    });

    it('should validate local license after activation (offline)', async () => {
      const licenseKey = 'PERS-XXXX-XXXX-XXXX';
      const deviceId = 'device-id-123';

      // Store valid license file
      localStorageMock.setItem('lpv_license_file', JSON.stringify({
        license_key: licenseKey,
        device_id: deviceId,
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signature: 'valid-signature',
        signed_at: new Date().toISOString(),
      }));

      localStorageMock.setItem('app_license_key', licenseKey);
      localStorageMock.setItem('app_license_type', 'personal');

      // Validate locally (offline - no network call)
      const validation = await licenseService.validateLocalLicense();
      expect(validation.valid).toBe(true);
      expect(validation.requiresTransfer).toBe(false);

      // Verify no fetch calls were made (offline validation)
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should detect device mismatch on local validation', async () => {
      const licenseKey = 'PERS-XXXX-XXXX-XXXX';
      const storedDeviceId = 'device-id-456'; // Different from current
      const currentDeviceId = 'device-id-123';

      // Store license for different device
      localStorageMock.setItem('lpv_license_file', JSON.stringify({
        license_key: licenseKey,
        device_id: storedDeviceId,
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signature: 'valid-signature',
        signed_at: new Date().toISOString(),
      }));

      // Validate locally
      const validation = await licenseService.validateLocalLicense();
      expect(validation.valid).toBe(false);
      expect(validation.requiresTransfer).toBe(true);
    });
  });

  describe('License Transfer Flow', () => {
    it('should complete transfer flow: request -> validate -> store', async () => {
      const licenseKey = 'PERS-XXXX-XXXX-XXXX';
      const newDeviceId = 'device-id-789';

      (getLPVDeviceFingerprint as jest.Mock).mockResolvedValue(newDeviceId);

      const mockLicenseFile = {
        license_key: licenseKey,
        device_id: newDeviceId,
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signature: 'valid-signature',
        signed_at: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          status: 'transferred',
          license_file: mockLicenseFile,
        }),
      });

      const result = await licenseService.transferLicense(licenseKey);
      
      expect(result.success).toBe(true);

      // Verify new license file stored
      const storedFile = await licenseService.getLocalLicenseFile();
      expect(storedFile?.device_id).toBe(newDeviceId);
    });
  });

  describe('Offline Operation', () => {
    it('should work completely offline after activation', async () => {
      const licenseKey = 'PERS-XXXX-XXXX-XXXX';
      const deviceId = 'device-id-123';

      // Simulate already-activated license
      localStorageMock.setItem('lpv_license_file', JSON.stringify({
        license_key: licenseKey,
        device_id: deviceId,
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signature: 'valid-signature',
        signed_at: new Date().toISOString(),
      }));

      localStorageMock.setItem('app_license_key', licenseKey);
      localStorageMock.setItem('app_license_type', 'personal');

      // All these operations should work offline
      const licenseInfo = await licenseService.getLicenseInfo();
      const appStatus = await licenseService.getAppLicenseStatus();
      const maxDevices = await licenseService.getMaxDevices();
      const deviceInfo = await licenseService.getCurrentDeviceInfo();
      const validation = await licenseService.validateLocalLicense();

      // Verify all operations succeeded
      expect(licenseInfo.isValid).toBe(true);
      expect(appStatus.isLicensed).toBe(true);
      expect(maxDevices).toBe(1);
      expect(deviceInfo).not.toBeNull();
      expect(validation.valid).toBe(true);

      // Verify no network calls were made
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});

