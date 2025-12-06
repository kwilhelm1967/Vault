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
import { safeParseJWT } from "./safeUtils";
import { devError } from "./devLog";

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
 * Written after successful activation for offline validation
 */
export interface LocalLicenseFile {
  license_key: string;
  device_id: string;
  activated_at: string;
  plan_type?: LicenseType;
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
   * Get local license file data
   */
  getLocalLicenseFile(): LocalLicenseFile | null {
    try {
      const stored = localStorage.getItem(LicenseService.LOCAL_LICENSE_FILE);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Invalid or missing file
    }
    return null;
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
   * Returns true if local license matches current device
   */
  async validateLocalLicense(): Promise<{ valid: boolean; requiresTransfer: boolean }> {
    const localLicense = this.getLocalLicenseFile();
    
    if (!localLicense) {
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

    // For trial licenses, check expiration
    if (type === 'trial') {
      const storedData = localStorage.getItem('license_token');
      if (storedData) {
        const tokenData = safeParseJWT<{ trialExpiryDate?: string }>(storedData);
        if (tokenData?.trialExpiryDate) {
          const trialExpiryDate = new Date(tokenData.trialExpiryDate);
          if (new Date() > trialExpiryDate) {
            this.removeLicense();
            trialService.endTrial();
            return {
              isValid: false,
              type: null,
              key: null,
              activatedDate: null,
            };
          }
        }
      }
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
      // Sanitize and validate license key format
      const cleanKey = licenseKey.replace(/[^A-Z0-9-]/g, "");
      const isValidFormat = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4,5}$/.test(cleanKey);
      
      if (!isValidFormat) {
        return { success: false, error: "This is not a valid license key." };
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

      // Call activation API
      const response = await fetch(
        `${environment.environment.licenseServerUrl}/api/lpv/license/activate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            license_key: cleanKey,
            device_id: deviceId,
          }),
        }
      );

      const result: ActivationResponse = await response.json();

      // Handle device mismatch
      if (result.status === "device_mismatch") {
        return {
          success: false,
          requiresTransfer: true,
          status: "device_mismatch",
          error: "This license is active on another device. Transfer required."
        };
      }

      // Handle invalid/revoked
      if (result.status === "invalid" || result.status === "revoked") {
        return {
          success: false,
          status: result.status,
          error: result.error || "This is not a valid license key."
        };
      }

      // Handle successful activation
      if (result.status === "activated") {
        const licenseType: LicenseType = result.plan_type || 'personal';
        
        // Save local license file for offline validation
        this.saveLocalLicenseFile({
          license_key: cleanKey,
          device_id: deviceId,
          activated_at: new Date().toISOString(),
          plan_type: licenseType,
        });

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
        error: result.error || "Activation failed" 
      };

    } catch (error) {
      devError("License activation error:", error);

      if (error instanceof TypeError && error.message.includes("fetch")) {
        return {
          success: false,
          error: "Unable to connect to license server. Please check your internet connection and try again.",
        };
      }

      return { success: false, error: "License activation failed" };
    }
  }

  /**
   * Transfer license to current device
   * 
   * Called when user confirms transfer after device_mismatch
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

      const response = await fetch(
        `${environment.environment.licenseServerUrl}/api/lpv/license/transfer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            license_key: cleanKey,
            new_device_id: deviceId,
          }),
        }
      );

      const result: TransferResponse = await response.json();

      if (result.status === "transferred") {
        // Update local license file
        this.saveLocalLicenseFile({
          license_key: cleanKey,
          device_id: deviceId,
          activated_at: new Date().toISOString(),
        });

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
          error: "Your license has reached its automatic transfer limit. Please contact support so we can help you move it to your new computer."
        };
      }

      return {
        success: false,
        error: result.error || "Transfer failed"
      };

    } catch (error) {
      devError("License transfer error:", error);

      if (error instanceof TypeError && error.message.includes("fetch")) {
        return {
          success: false,
          error: "Unable to connect to license server. Please check your internet connection.",
        };
      }

      return { success: false, error: "License transfer failed" };
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
    this.saveLocalLicenseFile({
      license_key: licenseKey,
      device_id: deviceId,
      activated_at: new Date().toISOString(),
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
    const localLicense = this.getLocalLicenseFile();
    
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
    if (!key) return { success: false, error: "No license found" };

    const localValidation = await this.validateLocalLicense();
    if (localValidation.valid) {
      return { success: true };
    }
    
    if (localValidation.requiresTransfer) {
      return { success: false, error: "Device mismatch - transfer required" };
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
}

export const licenseService = LicenseService.getInstance();
