/**
 * License Service for Local Password Vault
 * 
 * Implements the LPV licensing model:
 * - Single-device activation with transfer capability
 * - Fully offline after initial activation
 * - No user data transmitted, only license key + device hash
 * - Local license file for offline validation
 * 
 * Security Philosophy:
 * - Offline-first, single-device activation
 * - No cloud storage, no telemetry, no shared keys
 * - Zero user data on the internet
 */

import environment from "../config/environment";
import { trialService, TrialInfo } from "./trialService";
import { getLPVDeviceFingerprint, isValidDeviceId } from "./deviceFingerprint";
import { verifyLicenseSignature } from "./licenseValidator";
import { devError, devWarn } from "./devLog";
import { apiClient, ApiError } from "./apiClient";
import { validateLicenseKey } from "./validation";
import { measureOperation } from "./performanceMonitor";

export type LicenseType = "personal" | "family" | "trial";

export interface LicenseInfo {
  isValid: boolean;
  type: LicenseType | null;
  key: string | null;
  activatedDate: Date | null;
}

export interface AppLicenseStatus {
  isLicensed: boolean;
  licenseInfo: LicenseInfo;
  trialInfo: TrialInfo;
  canUseApp: boolean;
  requiresPurchase: boolean;
}

/**
 * Local license file structure
 * Signed by server and stored locally for offline validation
 */
export interface LocalLicenseFile {
  license_key: string;
  device_id: string;
  plan_type: LicenseType;
  max_devices: number;
  activated_at: string;
  product_type?: string;
  signature: string;
  signed_at: string;
}

/**
 * Activation API response types
 */
export type ActivationStatus = 
  | "activated" 
  | "device_mismatch" 
  | "invalid" 
  | "revoked"
  | "transfer_limit_reached";

export type ActivationMode = "first_activation" | "same_device" | "requires_transfer";

export interface ActivationResponse {
  status: ActivationStatus;
  mode?: ActivationMode;
  requires_transfer?: boolean;
  plan_type?: LicenseType;
  error?: string;
}

export interface TransferResponse {
  status: "transferred" | "transfer_limit_reached" | "invalid" | "error";
  error?: string;
}

export class LicenseService {
  private static instance: LicenseService;
  
  // LocalStorage keys
  private static readonly LICENSE_KEY_STORAGE = "app_license_key";
  private static readonly LICENSE_TYPE_STORAGE = "app_license_type";
  private static readonly LICENSE_ACTIVATED_STORAGE = "app_license_activated";
  private static readonly DEVICE_ID_STORAGE = "app_device_id";
  private static readonly LOCAL_LICENSE_FILE = "lpv_license_file";
  
  // Cached device fingerprint
  private cachedDeviceId: string | null = null;

  static getInstance(): LicenseService {
    if (!LicenseService.instance) {
      LicenseService.instance = new LicenseService();
    }
    return LicenseService.instance;
  }

  /**
   * Get current device fingerprint (cached for performance)
   */
  async getDeviceId(): Promise<string> {
    if (this.cachedDeviceId) {
      return this.cachedDeviceId;
    }
    this.cachedDeviceId = await getLPVDeviceFingerprint();
    return this.cachedDeviceId;
  }

  /**
   * Get the current license and trial status
   */
  async getAppStatus(): Promise<AppLicenseStatus> {
    const licenseInfo = await this.getLicenseInfo();
    const trialInfo = await trialService.getTrialInfo();

    let canUseApp = false;
    let requiresPurchase = false;

    if (licenseInfo.isValid) {
      canUseApp = true;
      requiresPurchase = false;
    } else if (trialInfo.hasTrialBeenUsed && !trialInfo.isExpired && trialInfo.isTrialActive) {
      canUseApp = true;
      requiresPurchase = false;
    } else if (trialInfo.hasTrialBeenUsed && trialInfo.isExpired) {
      canUseApp = false;
      requiresPurchase = true;
    } else {
      canUseApp = false;
      requiresPurchase = true;
    }

    return {
      isLicensed: licenseInfo.isValid,
      licenseInfo,
      trialInfo,
      canUseApp,
      requiresPurchase,
    };
  }

  /**
   * Get local license file data with corruption checking
   */
  async getLocalLicenseFile(): Promise<LocalLicenseFile | null> {
    try {
      const stored = localStorage.getItem(LicenseService.LOCAL_LICENSE_FILE);
      if (!stored) {
        return null;
      }

      // Check for corruption
      const { checkLicenseFileCorruption, recoverLicenseFile } = await import("./corruptionHandler");
      const corruptionCheck = checkLicenseFileCorruption(stored);
      
      if (corruptionCheck.isCorrupted) {
        if (corruptionCheck.recoverable) {
          devWarn("License file corruption detected, attempting recovery:", corruptionCheck.errors);
          const recovery = recoverLicenseFile(stored);
          if (recovery.success && recovery.recovered && recovery.data) {
            return recovery.data as LocalLicenseFile;
          }
        }
        devError("License file is corrupted and cannot be recovered:", corruptionCheck.errors);
        return null;
      }

      return JSON.parse(stored);
    } catch (error) {
      devError("Failed to get local license file:", error);
      return null;
    }
  }

  /**
   * Save local license file
   */
  private saveLocalLicenseFile(data: LocalLicenseFile): void {
    localStorage.setItem(LicenseService.LOCAL_LICENSE_FILE, JSON.stringify(data));
  }

  /**
   * Clear local license file
   */
  private clearLocalLicenseFile(): void {
    localStorage.removeItem(LicenseService.LOCAL_LICENSE_FILE);
  }

  /**
   * Validate license locally (offline check)
   * Returns true if local license matches current device and signature is valid
   */
  async validateLocalLicense(): Promise<{ valid: boolean; requiresTransfer: boolean }> {
    const localLicense = await this.getLocalLicenseFile();
    
    if (!localLicense) {
      return { valid: false, requiresTransfer: false };
    }

    // Verify signature (prevents tampering)
    const isValidSignature = await verifyLicenseSignature(localLicense);
    if (!isValidSignature) {
      devError('License file signature verification failed');
      return { valid: false, requiresTransfer: false };
    }

    const currentDeviceId = await this.getDeviceId();
    
    // Check if device IDs match
    if (localLicense.device_id === currentDeviceId) {
      return { valid: true, requiresTransfer: false };
    }
    
    // Device mismatch - transfer required
    return { valid: false, requiresTransfer: true };
  }

  /**
   * Get current license information
   * Performs offline validation first
   */
  async getLicenseInfo(): Promise<LicenseInfo> {
    const key = localStorage.getItem(LicenseService.LICENSE_KEY_STORAGE);
    const type = localStorage.getItem(LicenseService.LICENSE_TYPE_STORAGE) as LicenseType;
    const activatedDateStr = localStorage.getItem(LicenseService.LICENSE_ACTIVATED_STORAGE);

    if (!key || !type) {
      return {
        isValid: false,
        type: null,
        key: null,
        activatedDate: null,
      };
    }

    // For trial licenses, check expiration (local only, no network)
    if (type === 'trial') {
      // Trial expiration is handled by trialService using signed trial files
      // No network calls needed - uses signed trial file with cryptographically signed start_date
    }

    // For non-trial licenses, validate device binding locally
    if (type !== 'trial') {
      const localValidation = await this.validateLocalLicense();
      if (!localValidation.valid && !localValidation.requiresTransfer) {
        // No local license file - might need re-activation
        return {
          isValid: false,
          type: null,
          key: null,
          activatedDate: null,
        };
      }
    }

    return {
      isValid: true,
      type,
      key,
      activatedDate: activatedDateStr ? new Date(activatedDateStr) : null,
    };
  }

  /**
   * Activate a license key
   * 
   * Flow:
   * 1. Validate key format
   * 2. Get device fingerprint
   * 3. Call activation API
   * 4. Handle response (activated, device_mismatch, invalid)
   * 5. On success, save local license file
   */
  async activateLicense(licenseKey: string): Promise<{ 
    success: boolean; 
    error?: string; 
    licenseType?: LicenseType;
    requiresTransfer?: boolean;
    status?: ActivationStatus;
  }> {
    const isDevMode = import.meta.env.DEV;

    try {
      // Enhanced validation using centralized validation utility
      const validation = validateLicenseKey(licenseKey);
      
      if (!validation.valid || !validation.cleaned) {
        return { 
          success: false, 
          error: validation.error || ERROR_MESSAGES.LICENSE.INVALID_FORMAT 
        };
      }
      
      const cleanKey = validation.cleaned;

      // Check if this is a trial key (starts with TRIA-)
      if (cleanKey.startsWith('TRIA-')) {
        // Route to trial activation
        const result = await trialService.activateTrial(cleanKey);
        if (result.success && result.trialInfo) {
          // Update localStorage to mark as trial
          localStorage.setItem(LicenseService.LICENSE_KEY_STORAGE, cleanKey);
          localStorage.setItem(LicenseService.LICENSE_TYPE_STORAGE, 'trial');
          localStorage.setItem(LicenseService.LICENSE_ACTIVATED_STORAGE, new Date().toISOString());
          
          return {
            success: true,
            licenseType: 'trial',
            status: 'activated'
          };
        }
        return {
          success: false,
          error: result.error || "Trial activation failed. Please check your trial key and try again. If the problem persists, contact support@LocalPasswordVault.com"
        };
      }

      // Get device fingerprint
      const deviceId = await this.getDeviceId();

      // Development mode: bypass server
      if (isDevMode) {
        return this.activateLocalLicense(cleanKey, deviceId);
      }

      // Check if trial key being reused
      const existingLicenseInfo = await this.getLicenseInfo();
      if (existingLicenseInfo.type === 'trial' && existingLicenseInfo.key === cleanKey) {
        const trialInfo = await trialService.getTrialInfo();
        if (trialInfo.isExpired) {
          return {
            success: false,
            error: "This key was for your trial. To continue, purchase a lifetime key."
          };
        }
      }

      // Call activation API using centralized API client with performance monitoring
      const response = await measureOperation(
        'license-activation',
        () => apiClient.post<ActivationResponse>(
          "/api/lpv/license/activate",
          {
            license_key: cleanKey,
            device_id: deviceId,
          },
          {
            retries: 2,
            timeout: 10000,
          }
        )
      );

      const result = response.data;

      // Handle device mismatch
      if (result.status === "device_mismatch") {
        return {
          success: false,
          requiresTransfer: true,
          status: "device_mismatch",
          error: "This license is already active on another device. You'll need to transfer it to this device to continue."
        };
      }

      // Handle invalid/revoked
      if (result.status === "invalid") {
        return {
          success: false,
          status: result.status,
          error: result.error || ERROR_MESSAGES.LICENSE.INVALID_KEY
        };
      }
      
      if (result.status === "revoked") {
        return {
          success: false,
          status: result.status,
          error: "This license has been revoked. If you believe this is an error, please contact support@LocalPasswordVault.com for assistance."
        };
      }

      // Handle successful activation
      if (result.status === "activated") {
        const licenseType: LicenseType = result.plan_type || 'personal';
        
        // Verify and save signed license file from server
        if (result.license_file) {
          const isValid = await verifyLicenseSignature(result.license_file);
          if (!isValid) {
            return {
              success: false,
              error: "License verification failed. The license file appears to be corrupted or invalid. Please try activating again, or contact support@LocalPasswordVault.com if the problem persists."
            };
          }
          
          // Save signed license file for offline validation
          this.saveLocalLicenseFile(result.license_file);
        } else {
          // Fallback: create unsigned file (for development or legacy)
          this.saveLocalLicenseFile({
            license_key: cleanKey,
            device_id: deviceId,
            plan_type: licenseType,
            max_devices: 1,
            activated_at: new Date().toISOString(),
            signature: '',
            signed_at: new Date().toISOString(),
          });
        }

        // Update localStorage
        localStorage.setItem(LicenseService.LICENSE_KEY_STORAGE, cleanKey);
        localStorage.setItem(LicenseService.LICENSE_TYPE_STORAGE, licenseType);
        localStorage.setItem(LicenseService.LICENSE_ACTIVATED_STORAGE, new Date().toISOString());
        localStorage.setItem(LicenseService.DEVICE_ID_STORAGE, deviceId);

        // End trial if not a trial license
        if (licenseType !== 'trial') {
          trialService.endTrial();
        }

        return { 
          success: true, 
          licenseType,
          status: "activated"
        };
      }

      return { 
        success: false, 
        error: result.error || ERROR_MESSAGES.LICENSE.ACTIVATION_FAILED_RETRY
      };

    } catch (error) {
      devError("License activation error:", error);

      // Handle API errors from apiClient
      if (error && typeof error === "object" && "code" in error) {
        const apiError = error as ApiError;
        if (apiError.code === "NETWORK_ERROR" || apiError.code === "REQUEST_TIMEOUT") {
          return {
            success: false,
            error: ERROR_MESSAGES.NETWORK.UNABLE_TO_CONNECT_ACTIVATION_ONLY,
          };
        }
        return {
          success: false,
          error: apiError.message || ERROR_MESSAGES.GENERIC.RETRY_SUGGESTION,
        };
      }

      return { 
        success: false, 
        error: ERROR_MESSAGES.LICENSE.ACTIVATION_FAILED_RETRY
      };
    }
  }

  /**
   * Transfer license to current device
   * 
   * Called when user confirms transfer after device_mismatch
   */
  /**
   * Transfer license to current device
   * 
   * Transfers an existing license from one device to another. This allows users
   * to move their license when they get a new device or need to reinstall.
   * 
   * @param licenseKey - The license key to transfer
   * @returns Promise resolving to transfer result with success status and optional error
   * 
   * @example
   * ```typescript
   * const result = await licenseService.transferLicense('PERS-XXXX-XXXX-XXXX');
   * if (result.success) {
   *   // License transferred successfully
   * } else {
   *   // Handle error
   * }
   * ```
   */
  async transferLicense(licenseKey: string): Promise<{
    success: boolean;
    error?: string;
    status?: string;
  }> {
    try {
      const cleanKey = licenseKey.replace(/[^A-Z0-9-]/g, "");
      const deviceId = await this.getDeviceId();

      // Development mode: simulate transfer
      if (import.meta.env.DEV) {
        return this.transferLocalLicense(cleanKey, deviceId);
      }

      // Call transfer API using centralized API client with performance monitoring
      const response = await measureOperation(
        'license-transfer',
        () => apiClient.post<TransferResponse>(
          "/api/lpv/license/transfer",
          {
            license_key: cleanKey,
            new_device_id: deviceId,
          },
          {
            retries: 2,
            timeout: 10000,
          }
        )
      );

      const result = response.data;

      if (result.status === "transferred") {
        // Verify and save signed license file from server
        if (result.license_file) {
          const isValid = await verifyLicenseSignature(result.license_file);
          if (!isValid) {
            return {
              success: false,
              error: "License transfer verification failed. The license file appears to be corrupted. Please try again, or contact support@LocalPasswordVault.com if the problem persists."
            };
          }
          
          // Save signed license file
          this.saveLocalLicenseFile(result.license_file);
        } else {
          // Fallback for development
          const localLicense = await this.getLocalLicenseFile();
          this.saveLocalLicenseFile({
            license_key: cleanKey,
            device_id: deviceId,
            plan_type: localLicense?.plan_type || 'personal',
            max_devices: localLicense?.max_devices || 1,
            activated_at: new Date().toISOString(),
            signature: '',
            signed_at: new Date().toISOString(),
          });
        }

        // Update localStorage
        localStorage.setItem(LicenseService.LICENSE_KEY_STORAGE, cleanKey);
        localStorage.setItem(LicenseService.LICENSE_ACTIVATED_STORAGE, new Date().toISOString());
        localStorage.setItem(LicenseService.DEVICE_ID_STORAGE, deviceId);

        return { success: true, status: "transferred" };
      }

      if (result.status === "transfer_limit_reached") {
        return {
          success: false,
          status: "transfer_limit_reached",
          error: "Your license has reached its automatic transfer limit (3 transfers per year). Please contact support@LocalPasswordVault.com and we'll help you move it to your new computer."
        };
      }

      return {
        success: false,
        error: result.error || "License transfer failed. Please check your internet connection and try again. If the problem continues, contact support@LocalPasswordVault.com"
      };

    } catch (error) {
      devError("License transfer error:", error);

      // Handle API errors from apiClient
      if (error && typeof error === "object" && "code" in error) {
        const apiError = error as ApiError;
        if (apiError.code === "NETWORK_ERROR" || apiError.code === "REQUEST_TIMEOUT") {
          return {
            success: false,
            error: ERROR_MESSAGES.NETWORK.UNABLE_TO_CONNECT_TRANSFER,
          };
        }
        return {
          success: false,
          error: apiError.message || "License transfer failed. Please try again, or contact support@LocalPasswordVault.com if the problem persists.",
        };
      }

      return { 
        success: false, 
        error: "License transfer failed. Please check your internet connection and try again. If the problem continues, contact support@LocalPasswordVault.com"
      };
    }
  }

  /**
   * Development mode: Activate license locally
   */
  private async activateLocalLicense(
    licenseKey: string,
    deviceId: string
  ): Promise<{ success: boolean; error?: string; licenseType?: LicenseType }> {
    // Save local license file
    this.saveLocalLicenseFile({
      license_key: licenseKey,
      device_id: deviceId,
      activated_at: new Date().toISOString(),
      plan_type: 'personal',
    });

    localStorage.setItem(LicenseService.LICENSE_KEY_STORAGE, licenseKey);
    localStorage.setItem(LicenseService.LICENSE_TYPE_STORAGE, 'personal');
    localStorage.setItem(LicenseService.LICENSE_ACTIVATED_STORAGE, new Date().toISOString());
    localStorage.setItem(LicenseService.DEVICE_ID_STORAGE, deviceId);
    
    trialService.endTrial();
    
    return { success: true, licenseType: 'personal' };
  }

  /**
   * Development mode: Transfer license locally
   */
  private async transferLocalLicense(
    licenseKey: string,
    deviceId: string
  ): Promise<{ success: boolean; error?: string; status?: string }> {
    const localLicense = await this.getLocalLicenseFile();
    this.saveLocalLicenseFile({
      license_key: licenseKey,
      device_id: deviceId,
      plan_type: localLicense?.plan_type || 'personal',
      max_devices: localLicense?.max_devices || 1,
      activated_at: new Date().toISOString(),
      signature: '',
      signed_at: new Date().toISOString(),
    });

    localStorage.setItem(LicenseService.DEVICE_ID_STORAGE, deviceId);
    localStorage.setItem(LicenseService.LICENSE_ACTIVATED_STORAGE, new Date().toISOString());

    return { success: true, status: "transferred" };
  }

  /**
   * Check if device mismatch requires transfer
   * Used on app startup
   */
  async checkDeviceMismatch(): Promise<{
    hasMismatch: boolean;
    licenseKey: string | null;
  }> {
    const localLicense = await this.getLocalLicenseFile();
    
    if (!localLicense) {
      return { hasMismatch: false, licenseKey: null };
    }

    const currentDeviceId = await this.getDeviceId();
    
    if (localLicense.device_id !== currentDeviceId) {
      return { 
        hasMismatch: true, 
        licenseKey: localLicense.license_key 
      };
    }

    return { hasMismatch: false, licenseKey: null };
  }

  /**
   * Start trial period
   */
  async startTrial(licenseKey: string, hardwareHash: string): Promise<TrialInfo> {
    return trialService.startTrial(licenseKey, hardwareHash);
  }

  /**
   * Check if user can start a trial
   */
  async canStartTrial(): Promise<boolean> {
    return trialService.canStartTrial();
  }

  /**
   * Remove license (for testing or manual reset)
   */
  removeLicense(): void {
    localStorage.removeItem(LicenseService.LICENSE_KEY_STORAGE);
    localStorage.removeItem(LicenseService.LICENSE_TYPE_STORAGE);
    localStorage.removeItem(LicenseService.LICENSE_ACTIVATED_STORAGE);
    localStorage.removeItem(LicenseService.DEVICE_ID_STORAGE);
    localStorage.removeItem('license_token');
    this.clearLocalLicenseFile();
  }

  /**
   * Validate license for critical operations
   */
  async validateForCriticalOperation(): Promise<boolean> {
    const key = localStorage.getItem(LicenseService.LICENSE_KEY_STORAGE);
    if (!key) return false;

    // Validate device binding
    const localValidation = await this.validateLocalLicense();
    return localValidation.valid;
  }

  /**
   * Get license display name
   */
  getLicenseDisplayName(type: LicenseType): string {
    const names = {
      personal: "Personal Vault",
      family: "Family Plan",
      trial: "7-Day Trial License",
    };
    return names[type];
  }

  /**
   * Check if app access should be blocked
   */
  async shouldBlockAccess(): Promise<boolean> {
    const status = await this.getAppStatus();
    return !status.canUseApp;
  }

  /**
   * Get trial progress percentage
   */
  async getTrialProgress(): Promise<number> {
    return trialService.getTrialProgress();
  }

  /**
   * Get trial time remaining
   */
  async getTrialTimeRemaining(): Promise<string> {
    return trialService.getTrialTimeRemaining();
  }

  /**
   * Reset everything (for testing)
   */
  resetAll(): void {
    this.removeLicense();
    trialService.resetTrial();
    this.cachedDeviceId = null;
  }

  /**
   * Refresh license status (no network call needed in offline mode)
   */
  async refreshLicenseStatus(): Promise<{ success: boolean; error?: string }> {
    const key = localStorage.getItem(LicenseService.LICENSE_KEY_STORAGE);
    if (!key) return { 
      success: false, 
      error: "No license found. Please activate your license key to continue using the app." 
    };

    const localValidation = await this.validateLocalLicense();
    if (localValidation.valid) {
      return { success: true };
    }
    
    if (localValidation.requiresTransfer) {
      return { 
        success: false, 
        error: "Your license is bound to a different device. You'll need to transfer it to this device to continue." 
      };
    }

    return { success: true };
  }

  /**
   * Get stored device ID
   */
  getStoredDeviceId(): string | null {
    return localStorage.getItem(LicenseService.DEVICE_ID_STORAGE);
  }

  /**
   * Verify device ID is valid format
   */
  isValidDeviceId(deviceId: string): boolean {
    return isValidDeviceId(deviceId);
  }

  /**
   * Check if current license is a family plan
   */
  isFamilyPlan(): boolean {
    const type = localStorage.getItem(LicenseService.LICENSE_TYPE_STORAGE);
    return type === 'family' || type === 'llv_family';
  }

  /**
   * Get max devices for current license
   */
  async getMaxDevices(): Promise<number> {
    const localLicense = await this.getLocalLicenseFile();
    return localLicense?.max_devices || 1;
  }

  /**
   * Get current device info
   */
  async getCurrentDeviceInfo(): Promise<{
    deviceId: string;
    deviceName: string;
  } | null> {
    const deviceId = await this.getDeviceId();
    if (!deviceId) return null;

    const ua = navigator.userAgent;
    let deviceName = 'Unknown Device';
    if (ua.includes('Windows')) deviceName = 'Windows Device';
    else if (ua.includes('Mac')) deviceName = 'Mac Device';
    else if (ua.includes('Linux')) deviceName = 'Linux Device';

    return { deviceId, deviceName };
  }

  /**
   * Get detailed device information from local license file (100% offline)
   * Returns device info stored in the signed license file
   */
  async getLocalDeviceInfo(): Promise<{
    deviceId: string;
    licenseKey: string;
    planType: LicenseType;
    activatedAt: string;
    maxDevices: number;
  } | null> {
    const localLicense = await this.getLocalLicenseFile();
    if (!localLicense) {
      return null;
    }

    return {
      deviceId: localLicense.device_id,
      licenseKey: localLicense.license_key,
      planType: localLicense.plan_type,
      activatedAt: localLicense.activated_at,
      maxDevices: localLicense.max_devices || 1,
    };
  }

}

export const licenseService = LicenseService.getInstance();
