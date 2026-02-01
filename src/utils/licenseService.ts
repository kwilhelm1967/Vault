/**
 * License Service for Local Password Vault
 * 
 * Handles license activation, validation, and device management.
 * Fully offline after initial activation.
 */

import environment from "../config/environment";
import { trialService, TrialInfo } from "./trialService";
import { getLPVDeviceFingerprint, isValidDeviceId } from "./deviceFingerprint";
import { verifyLicenseSignature } from "./licenseValidator";
import { devError, devWarn } from "./devLog";
import { apiClient, ApiError } from "./apiClient";
import { validateLicenseKey } from "./validation";
import { measureOperation } from "./performanceMonitor";
import { ERROR_MESSAGES } from "../constants/errorMessages";

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
  
  // Cached device fingerprint (persisted to avoid recalculation)
  private cachedDeviceId: string | null = null;
  private deviceIdPromise: Promise<string> | null = null;

  static getInstance(): LicenseService {
    if (!LicenseService.instance) {
      LicenseService.instance = new LicenseService();
    }
    return LicenseService.instance;
  }

  /**
   * Get current device fingerprint (cached for performance)
   * Uses localStorage cache to avoid recalculating on every app start
   */
  async getDeviceId(): Promise<string> {
    // Return cached value immediately if available
    if (this.cachedDeviceId) {
      return this.cachedDeviceId;
    }

    // Check localStorage cache first (persists across app restarts)
    const cachedId = localStorage.getItem('_cached_device_id');
    if (cachedId) {
      this.cachedDeviceId = cachedId;
      return cachedId;
    }

    // If already calculating, return the same promise (avoid duplicate calculations)
    if (this.deviceIdPromise) {
      return this.deviceIdPromise;
    }

    // Calculate device fingerprint (this can be slow)
    this.deviceIdPromise = getLPVDeviceFingerprint().then(id => {
      this.cachedDeviceId = id;
      // Cache in localStorage for next app start
      localStorage.setItem('_cached_device_id', id);
      this.deviceIdPromise = null;
      return id;
    });

    return this.deviceIdPromise;
  }

  /**
   * Get the current license and trial status
   * Optimized: Runs license and trial checks in parallel for faster loading
   * 
   * IMPORTANT: This function is 100% OFFLINE - no network calls
   * Only reads from localStorage and validates local license/trial files
   */
  async getAppStatus(): Promise<AppLicenseStatus> {
    // Run license and trial checks in parallel (faster than sequential)
    const [licenseInfo, trialInfo] = await Promise.all([
      this.getLicenseInfo(),
      trialService.getTrialInfo()
    ]);

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
   * 
   * IMPORTANT: This function is 100% OFFLINE - no network calls
   * Only reads from localStorage and verifies cryptographic signature
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
   * Optimized: Only validates device binding if needed (defers expensive operations)
   * 
   * IMPORTANT: This function is 100% OFFLINE - no network calls
   * Only reads from localStorage and validates local license file
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
    // No device validation needed for trials - they're device-bound by design
    if (type === 'trial') {
      return {
        isValid: true,
        type,
        key,
        activatedDate: activatedDateStr ? new Date(activatedDateStr) : null,
      };
    }

    // For non-trial licenses, validate device binding locally
    // MUST have a local license file for non-trial licenses
    const hasLocalLicense = localStorage.getItem(LicenseService.LOCAL_LICENSE_FILE);
    if (!hasLocalLicense) {
      // No local license file - license is not valid
      return {
        isValid: false,
        type: null,
        key: null,
        activatedDate: null,
      };
    }

    // Validate the local license file
    const localValidation = await this.validateLocalLicense();
    if (!localValidation.valid && !localValidation.requiresTransfer) {
      // Local license file is invalid - might need re-activation
      return {
        isValid: false,
        type: null,
        key: null,
        activatedDate: null,
      };
    }

    return {
      isValid: localValidation.valid,
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
  async activateLicense(
    licenseKey: string,
    options?: {
      onProgress?: (stage: 'connecting' | 'sending' | 'receiving' | 'processing') => void;
      onRetry?: (attempt: number, totalRetries: number, delay: number) => void;
    }
  ): Promise<{ 
    success: boolean; 
    error?: string; 
    licenseType?: LicenseType;
    requiresTransfer?: boolean;
    status?: ActivationStatus;
  }> {
    // Check dev mode - in test environment, ensure we can override it
    const isDevMode = import.meta.env.DEV && !import.meta.env.MODE?.includes('test');

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

      // Check if this is a trial key (starts with LPVT- for LPV or LLVT- for LLV)
      if (cleanKey.startsWith('LPVT-') || cleanKey.startsWith('LLVT-')) {
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

      const apiBaseUrl = environment.environment.licenseServerUrl;
      const activationUrl = `${apiBaseUrl}/api/lpv/license/activate`;
      
      devLog('[License Service] Attempting activation:', {
        url: activationUrl,
        licenseKey: cleanKey.substring(0, 12) + '...', // Log partial key for security
        deviceId: deviceId.substring(0, 16) + '...', // Log partial device ID
        isIPAddress: /^\d+\.\d+\.\d+\.\d+$/.test(new URL(apiBaseUrl).hostname),
      });

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
            timeout: 15000, // Increased timeout for better reliability
            onProgress: options?.onProgress,
            onRetry: options?.onRetry,
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
        error: result.error || ERROR_MESSAGES.LICENSE.ACTIVATION_FAILED
      };

    } catch (error) {
      const apiBaseUrl = environment.environment.licenseServerUrl;
      const activationUrl = `${apiBaseUrl}/api/lpv/license/activate`;
      
      devError("[License Service] Activation failed:", {
        url: activationUrl,
        errorType: error?.constructor?.name || typeof error,
        errorCode: (error as any)?.code,
        errorMessage: (error as any)?.message,
        errorStatus: (error as any)?.status,
        errorDetails: (error as any)?.details,
        fullError: error,
      });

      // Handle API errors from apiClient
      if (error && typeof error === "object" && "code" in error) {
        const apiError = error as ApiError;
        
        // HTTP errors (4xx, 5xx) - show actual API error message
        if (apiError.code === "HTTP_ERROR" || apiError.code?.startsWith("HTTP_")) {
          // Extract actual error message from API response
          const apiErrorMessage = apiError.message || (apiError.details as any)?.error || (apiError.details as any)?.message;
          return {
            success: false,
            error: apiErrorMessage || `Activation failed (HTTP ${apiError.status || 'error'})`,
          };
        }
        
        // Network errors - show specific error message if available, otherwise generic
        if (apiError.code === "NETWORK_ERROR" || apiError.code === "REQUEST_TIMEOUT" || apiError.code === "REQUEST_ABORTED") {
          const specificMessage = apiError.message || ERROR_MESSAGES.NETWORK.UNABLE_TO_CONNECT_ACTIVATION_ONLY;
          
          // Use the specific message if it's not the generic fallback message
          const isGenericMessage = specificMessage === ERROR_MESSAGES.NETWORK.UNABLE_TO_CONNECT_ACTIVATION_ONLY;
          const hasSpecificDetails = !isGenericMessage && specificMessage && (
            specificMessage.includes("DNS") || 
            specificMessage.includes("Connection refused") || 
            specificMessage.includes("timeout") || 
            specificMessage.includes("certificate") ||
            specificMessage.includes("Cannot resolve hostname") ||
            specificMessage.includes("SSL") ||
            specificMessage.includes("TLS") ||
            specificMessage.length > 50  // Longer messages are likely specific errors
          );
          
          // Use specific message if we have details, otherwise use generic
          const errorMessage = hasSpecificDetails 
            ? specificMessage
            : ERROR_MESSAGES.NETWORK.UNABLE_TO_CONNECT_ACTIVATION_ONLY;
          
          return {
            success: false,
            error: errorMessage,
          };
        }
        
        // Other errors - show the actual error message
        return {
          success: false,
          error: apiError.message || ERROR_MESSAGES.LICENSE.ACTIVATION_FAILED,
        };
      }

      return { 
        success: false, 
        error: ERROR_MESSAGES.LICENSE.ACTIVATION_FAILED
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
            error: ERROR_MESSAGES.NETWORK.UNABLE_TO_CONNECT_ACTIVATION_ONLY,
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
   * 
   * IMPORTANT: This function is 100% OFFLINE - no network calls
   * Only validates local license file and device binding
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
   * 
   * IMPORTANT: This function is 100% OFFLINE - no network calls
   * Only validates local license file and device binding
   */
  async shouldBlockAccess(): Promise<boolean> {
    const status = await this.getAppStatus();
    if (!status.canUseApp) {
      return true;
    }
    
    // For licensed users, also verify device binding
    if (status.isLicensed) {
      const isValid = await this.validateForCriticalOperation();
      return !isValid;
    }
    
    return false;
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
   * Get app license status (alias for getAppStatus for backward compatibility)
   */
  async getAppLicenseStatus(): Promise<AppLicenseStatus> {
    return this.getAppStatus();
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
    return type === 'family';
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
