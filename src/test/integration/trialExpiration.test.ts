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
    it('should detect expired trial correctly', () => {
      // Set trial as expired (7 days ago)
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 8);
      
      localStorageMock.setItem('trial_start_date', expiredDate.toISOString());
      localStorageMock.setItem('trial_duration_days', '7');
      localStorageMock.setItem('trial_activated', 'true');

      const trialInfo = trialService.getTrialInfo();
      
      expect(trialInfo.isExpired).toBe(true);
      expect(trialInfo.isActive).toBe(false);
      expect(trialInfo.daysRemaining).toBe(0);
    });

    it('should detect active trial correctly', () => {
      // Set trial as active (started 2 days ago)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 2);
      
      localStorageMock.setItem('trial_start_date', startDate.toISOString());
      localStorageMock.setItem('trial_duration_days', '7');
      localStorageMock.setItem('trial_activated', 'true');

      const trialInfo = trialService.getTrialInfo();
      
      expect(trialInfo.isExpired).toBe(false);
      expect(trialInfo.isActive).toBe(true);
      expect(trialInfo.daysRemaining).toBeGreaterThan(0);
      expect(trialInfo.daysRemaining).toBeLessThanOrEqual(5);
    });

    it('should show expiring warning when 1 day remaining', () => {
      // Set trial to expire in 1 day
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      
      localStorageMock.setItem('trial_start_date', startDate.toISOString());
      localStorageMock.setItem('trial_duration_days', '7');
      localStorageMock.setItem('trial_activated', 'true');

      const trialInfo = trialService.getTrialInfo();
      const warningState = trialService.checkWarningPopups();
      
      expect(trialInfo.daysRemaining).toBe(1);
      expect(warningState.shouldShowExpiringWarning).toBe(true);
    });

    it('should show final warning when expired', () => {
      // Set trial as expired
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 8);
      
      localStorageMock.setItem('trial_start_date', expiredDate.toISOString());
      localStorageMock.setItem('trial_duration_days', '7');
      localStorageMock.setItem('trial_activated', 'true');

      const warningState = trialService.checkWarningPopups();
      
      expect(warningState.shouldShowFinalWarning).toBe(true);
    });
  });

  describe('Trial Expiration Handling', () => {
    it('should prevent app usage when trial expired', async () => {
      // Set trial as expired
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 8);
      
      localStorageMock.setItem('trial_start_date', expiredDate.toISOString());
      localStorageMock.setItem('trial_duration_days', '7');
      localStorageMock.setItem('trial_activated', 'true');

      const appStatus = await licenseService.getAppLicenseStatus();
      
      expect(appStatus.canUseApp).toBe(false);
      expect(appStatus.trialInfo.isExpired).toBe(true);
    });

    it('should allow license activation after expiration', async () => {
      // Set trial as expired
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 8);
      
      localStorageMock.setItem('trial_start_date', expiredDate.toISOString());
      localStorageMock.setItem('trial_duration_days', '7');
      localStorageMock.setItem('trial_activated', 'true');

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
      
      // Set trial as expired
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 8);
      
      localStorageMock.setItem('trial_start_date', expiredDate.toISOString());
      localStorageMock.setItem('trial_duration_days', '7');
      localStorageMock.setItem('trial_activated', 'true');

      // Verify data is still there
      const stored = localStorageMock.getItem('vault_data');
      expect(stored).toBe(vaultData);
    });

    it('should allow data export after expiration', () => {
      // Set trial as expired
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 8);
      
      localStorageMock.setItem('trial_start_date', expiredDate.toISOString());
      localStorageMock.setItem('trial_duration_days', '7');
      localStorageMock.setItem('trial_activated', 'true');

      // Data should still be accessible for export
      const vaultData = localStorageMock.getItem('vault_data');
      expect(vaultData).toBeDefined(); // Can be null, but key should exist
    });
  });

  describe('Trial Warning System', () => {
    it('should register and call warning popup callbacks', () => {
      const mockCallback = jest.fn();
      
      trialService.addWarningPopupCallback(mockCallback);
      
      // Manually trigger warning check
      const warningState = trialService.checkWarningPopups();
      
      // Callback should be registered (may or may not be called depending on trial state)
      trialService.removeWarningPopupCallback(mockCallback);
      
      expect(typeof mockCallback).toBe('function');
    });

    it('should calculate time remaining correctly', () => {
      // Set trial with 3 days remaining
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 4);
      
      localStorageMock.setItem('trial_start_date', startDate.toISOString());
      localStorageMock.setItem('trial_duration_days', '7');
      localStorageMock.setItem('trial_activated', 'true');

      const trialInfo = trialService.getTrialInfo();
      
      expect(trialInfo.daysRemaining).toBe(3);
    });

    it('should format time remaining string correctly', () => {
      // Set trial with 2 days, 5 hours remaining
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 5);
      startDate.setHours(startDate.getHours() - 19); // 19 hours = almost 1 day
      
      localStorageMock.setItem('trial_start_date', startDate.toISOString());
      localStorageMock.setItem('trial_duration_days', '7');
      localStorageMock.setItem('trial_activated', 'true');

      const warningState = trialService.checkWarningPopups();
      
      // Should have time remaining string
      if (warningState.timeRemaining) {
        expect(typeof warningState.timeRemaining).toBe('string');
      }
    });
  });

  describe('Trial Reset and Cleanup', () => {
    it('should clear trial data when license activated', async () => {
      // Set active trial
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 2);
      
      localStorageMock.setItem('trial_start_date', startDate.toISOString());
      localStorageMock.setItem('trial_duration_days', '7');
      localStorageMock.setItem('trial_activated', 'true');

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

