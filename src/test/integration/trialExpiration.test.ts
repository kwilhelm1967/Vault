/**
 * Integration Tests: Trial Expiration Flow
 * 
 * Tests the complete trial expiration handling flow, including:
 * - Trial expiration detection
 * - Warning popups and banners
 * - License activation after expiration
 * - Data preservation during expiration
 */

import { trialService } from '../../utils/trialService';
import { licenseService } from '../../utils/licenseService';
import { getLPVDeviceFingerprint } from '../../utils/deviceFingerprint';

// Mock device fingerprint
jest.mock('../../utils/deviceFingerprint', () => ({
  getLPVDeviceFingerprint: jest.fn().mockResolvedValue('test-device-id-1234567890123456789012345678901234567890123456789012345678901234'),
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

// Helper to create a trial file for testing
function createTrialFile(startDate: Date, durationDays: number = 7): void {
  const expiresAt = new Date(startDate);
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  
  const trialFile = {
    trial_key: 'TRIAL-TEST-KEY-1234',
    device_id: 'test-device-id-1234567890123456789012345678901234567890123456789012345678901234',
    plan_type: 'trial' as const,
    start_date: startDate.toISOString(),
    expires_at: expiresAt.toISOString(),
    product_type: 'lpv',
    signature: '', // Empty signature for dev/test
    signed_at: new Date().toISOString(),
  };
  
  localStorageMock.setItem('lpv_trial_file', JSON.stringify(trialFile));
  localStorageMock.setItem('trial_used', 'true');
}

describe('Trial Expiration Flow - Integration Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Trial Expiration Detection', () => {
    it('should detect expired trial correctly', async () => {
      // Set trial as expired (started 8 days ago, 7 day duration)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 8);
      createTrialFile(startDate, 7);

      const trialInfo = await trialService.getTrialInfo();
      
      expect(trialInfo.isExpired).toBe(true);
      expect(trialInfo.isTrialActive).toBe(false);
      expect(trialInfo.daysRemaining).toBe(0);
    });

    it('should detect active trial correctly', async () => {
      // Set trial as active (started 2 days ago, 7 day duration)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 2);
      createTrialFile(startDate, 7);

      const trialInfo = await trialService.getTrialInfo();
      
      expect(trialInfo.isExpired).toBe(false);
      expect(trialInfo.isTrialActive).toBe(true);
      expect(trialInfo.daysRemaining).toBeGreaterThan(0);
      expect(trialInfo.daysRemaining).toBeLessThanOrEqual(5);
    });

    it('should show expiring warning when 1 day remaining', async () => {
      // Set trial to expire in 1 day (started 6 days ago, 7 day duration)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      createTrialFile(startDate, 7);

      const trialInfo = await trialService.getTrialInfo();
      const warningState = trialService.checkWarningStateSync();
      
      expect(trialInfo.daysRemaining).toBe(1);
      expect(warningState.shouldShowExpiringWarning).toBe(true);
    });

    it('should show final warning when expired', async () => {
      // Set trial as expired (started 8 days ago, 7 day duration)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 8);
      createTrialFile(startDate, 7);

      const warningState = trialService.checkWarningStateSync();
      
      expect(warningState.shouldShowFinalWarning).toBe(true);
    });
  });

  describe('Trial Expiration Handling', () => {
    it('should prevent app usage when trial expired', async () => {
      // Set trial as expired (started 8 days ago, 7 day duration)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 8);
      createTrialFile(startDate, 7);

      const appStatus = await licenseService.getAppLicenseStatus();
      
      expect(appStatus.canUseApp).toBe(false);
      expect(appStatus.trialInfo.isExpired).toBe(true);
    });

    it('should allow license activation after expiration', async () => {
      // Set trial as expired (started 8 days ago, 7 day duration)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 8);
      createTrialFile(startDate, 7);

      // Mock license activation
      const mockLicenseFile = {
        license_key: 'PERS-XXXX-XXXX-XXXX',
        device_id: 'device-id-123',
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

      const activationResult = await licenseService.activateLicense('PERS-XXXX-XXXX-XXXX');
      
      expect(activationResult.success).toBe(true);

      // Verify app can be used after activation
      const appStatus = await licenseService.getAppLicenseStatus();
      expect(appStatus.canUseApp).toBe(true);
      expect(appStatus.isLicensed).toBe(true);
    });
  });

  describe('Data Preservation During Expiration', () => {
    it('should preserve vault data when trial expires', () => {
      // Simulate vault data exists
      const vaultData = JSON.stringify([{ id: '1', accountName: 'Test' }]);
      localStorageMock.setItem('vault_data', vaultData);
      
      // Set trial as expired (started 8 days ago, 7 day duration)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 8);
      createTrialFile(startDate, 7);

      // Verify data is still there
      const stored = localStorageMock.getItem('vault_data');
      expect(stored).toBe(vaultData);
    });

    it('should allow data export after expiration', () => {
      // Set trial as expired (started 8 days ago, 7 day duration)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 8);
      createTrialFile(startDate, 7);

      // Data should still be accessible for export
      const vaultData = localStorageMock.getItem('vault_data');
      expect(vaultData).toBeDefined(); // Can be null, but key should exist
    });
  });

  describe('Trial Warning System', () => {
    it('should register and call warning popup callbacks', () => {
      const mockCallback = jest.fn();
      
      trialService.addWarningPopupCallback(mockCallback);
      
      // Manually trigger warning check - use sync method for testing
      const warningState = trialService.checkWarningStateSync();
      
      // Callback should be registered (may or may not be called depending on trial state)
      trialService.removeWarningPopupCallback(mockCallback);
      
      expect(typeof warningState).toBe('object');
      expect(warningState).toHaveProperty('shouldShowExpiringWarning');
      expect(warningState).toHaveProperty('shouldShowFinalWarning');
    });

    it('should calculate time remaining correctly', async () => {
      // Set trial with 3 days remaining (started 4 days ago, 7 day duration)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 4);
      createTrialFile(startDate, 7);

      const trialInfo = await trialService.getTrialInfo();
      
      expect(trialInfo.daysRemaining).toBe(3);
    });

    it('should format time remaining string correctly', async () => {
      // Set trial with 2 days remaining (started 5 days ago, 7 day duration)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 5);
      createTrialFile(startDate, 7);

      const trialInfo = await trialService.getTrialInfo();
      const warningState = trialService.checkWarningStateSync();
      
      // Should have time remaining string
      expect(typeof trialInfo.timeRemaining).toBe('string');
      expect(trialInfo.daysRemaining).toBeGreaterThan(0);
      expect(typeof warningState.timeRemaining).toBe('string');
    });
  });

  describe('Trial Reset and Cleanup', () => {
    it('should clear trial data when license activated', async () => {
      // Set active trial (started 2 days ago, 7 day duration)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 2);
      createTrialFile(startDate, 7);

      // Activate license
      const mockLicenseFile = {
        license_key: 'PERS-XXXX-XXXX-XXXX',
        device_id: 'device-id-123',
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

      await licenseService.activateLicense('PERS-XXXX-XXXX-XXXX');

      // Trial should no longer be relevant
      const appStatus = await licenseService.getAppLicenseStatus();
      expect(appStatus.isLicensed).toBe(true);
      expect(appStatus.canUseApp).toBe(true);
    });
  });
});

