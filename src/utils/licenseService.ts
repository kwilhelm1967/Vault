import environment from "../config/environment";
import { trialService, TrialInfo } from "./trialService";

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

export class LicenseService {
  private static instance: LicenseService;
  private static readonly LICENSE_KEY_STORAGE = "app_license_key";
  private static readonly LICENSE_TYPE_STORAGE = "app_license_type";
  private static readonly LICENSE_ACTIVATED_STORAGE = "app_license_activated";
  private static readonly LAST_VALIDATION_STORAGE = "app_last_validation"; // retained for backward compatibility
  private static readonly HARDWARE_ID_STORAGE = "app_hardware_id";

  // LIFETIME MODE: Only a single API call is ever made (first activation). After that, no
  // background / periodic / critical validations or refresh calls will hit the network.
  // Set to false to re-enable legacy periodic validation behaviour.
  private static readonly LIFETIME_ONE_TIME_ACTIVATION = true;

  // Validate once every 24 hours
  private static readonly VALIDATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  // For critical operations, validate more frequently (1 hour)
  // Legacy constant retained for reference; unused in lifetime mode
  // private static readonly CRITICAL_VALIDATION_INTERVAL = 60 * 60 * 1000; // 1 hour

  static getInstance(): LicenseService {
    if (!LicenseService.instance) {
      LicenseService.instance = new LicenseService();
    }
    return LicenseService.instance;
  }

  /**
   * Generate a hardware fingerprint for license activation
   */
  private async generateHardwareFingerprint(): Promise<string> {
    const components = [];

    // Screen and display info
    components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
    components.push(screen.pixelDepth.toString());

    // System info
    components.push(navigator.platform);
    components.push(navigator.language);
    components.push(navigator.hardwareConcurrency?.toString() || "unknown");
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

    // Browser and engine info
    components.push(navigator.userAgent.slice(0, 100));
    components.push(navigator.vendor || "unknown");

    // WebGL fingerprinting
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") as WebGLRenderingContext;
      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
          components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
        components.push(gl.getParameter(gl.VERSION));
      }
    } catch (e) {
      components.push("webgl_unavailable");
    }

    // Generate hash from components
    const fingerprint = components.join("|");

    // Create SHA-256 hash using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  }

  /**
   * Get the current license and trial status
   */
  async getAppStatus(): Promise<AppLicenseStatus> {
    const licenseInfo = this.getLicenseInfo();
    const trialInfo = await trialService.getTrialInfo();

    // Check if user can use the app based on license or trial status
    let canUseApp = false;
    let requiresPurchase = false;

    if (licenseInfo.isValid) {
      // Valid license (non-trial or trial that hasn't expired)
      canUseApp = true;
      requiresPurchase = false;
    } else if (trialInfo.hasTrialBeenUsed && !trialInfo.isExpired && trialInfo.isTrialActive) {
      // Active trial (not expired)
      canUseApp = true;
      requiresPurchase = false;
    } else if (trialInfo.hasTrialBeenUsed && trialInfo.isExpired) {
      // Expired trial - user must purchase
      canUseApp = false;
      requiresPurchase = true;
    } else {
      // No license and no trial used - user can start trial or purchase
      canUseApp = false;
      requiresPurchase = true;
    }

    
    const status = {
      isLicensed: licenseInfo.isValid,
      licenseInfo,
      trialInfo,
      canUseApp,
      requiresPurchase,
    };

    return status;
  }

  /**
   * Get current license information with periodic validation
   */
  getLicenseInfo(): LicenseInfo {
    const key = localStorage.getItem(LicenseService.LICENSE_KEY_STORAGE);
    const type = localStorage.getItem(
      LicenseService.LICENSE_TYPE_STORAGE
    ) as LicenseType;
    const activatedDateStr = localStorage.getItem(
      LicenseService.LICENSE_ACTIVATED_STORAGE
    );
    const lastValidation = localStorage.getItem(
      LicenseService.LAST_VALIDATION_STORAGE
    ); // legacy leftover (ignored in lifetime mode)

    if (!key || !type) {
      return {
        isValid: false,
        type: null,
        key: null,
        activatedDate: null,
      };
    }

    // For trial licenses, check if they have expired locally
    if (type === 'trial') {
      // Try to get trial expiry from the stored license token
      try {
        const storedData = localStorage.getItem('license_token');
        if (storedData) {
          const tokenData = JSON.parse(atob(storedData.split('.')[1])); // Decode JWT payload
          if (tokenData.trialExpiryDate) {
            const trialExpiryDate = new Date(tokenData.trialExpiryDate);
            if (new Date() > trialExpiryDate) {
              // Trial has expired, remove license and mark trial as expired
              this.removeLicense();
              // Ensure trial service knows the trial has expired
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
      } catch (error) {
        console.error('Error checking trial expiration:', error);
      }
    }

    // In lifetime mode we NEVER schedule or perform background validation after first activation.
    if (!LicenseService.LIFETIME_ONE_TIME_ACTIVATION) {
      const shouldValidate =
        !lastValidation ||
        Date.now() - parseInt(lastValidation) >
          LicenseService.VALIDATION_INTERVAL;
      if (shouldValidate) {
        this.validateLicenseInBackground(key);
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
   * Activate a license key with enhanced security
   */
  async activateLicense(
    licenseKey: string
  ): Promise<{ success: boolean; error?: string; licenseType?: LicenseType }> {
    try {
      // Validate license key format
      const cleanKey = licenseKey.replace(/[^A-Z0-9-]/g, "");
      if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanKey)) {
        return { success: false, error: "Invalid license key format" };
      }

      // Check if this is the same trial key being reactivated
      const existingLicenseInfo = this.getLicenseInfo();
      if (existingLicenseInfo.type === 'trial' && existingLicenseInfo.key === cleanKey) {
        // Check if the trial has expired
        const trialInfo = await trialService.getTrialInfo();
        if (trialInfo.isExpired) {
          return {
            success: false,
            error: "Your trial period has expired. This trial license key can only be used once. Please purchase a license to continue using the app."
          };
        }
      }

      // Generate hardware fingerprint for activation
      const hardwareId = await this.generateHardwareFingerprint();

      let licenseType: LicenseType | undefined;

      // Only perform the activation network call the very first time (no existing license stored)
      if (!LicenseService.LIFETIME_ONE_TIME_ACTIVATION ||
          !localStorage.getItem(LicenseService.LICENSE_KEY_STORAGE)) {
        const response = await fetch(
          `${environment.environment.licenseServerUrl}/api/licenses/validate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              licenseKey: cleanKey,
              hardwareHash: hardwareId,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            return { success: false, error: "License key not found" };
          }
          if (response.status === 409) {
            return {
              success: false,
              error: "License key is already activated on another device",
            };
          }
          // Handle trial expiration from backend
          if (result.error?.includes("trial") && result.error?.includes("expir")) {
            return {
              success: false,
              error: "Your trial period has expired. This trial license key can only be used once. Please purchase a license to continue using the app."
            };
          }
          return {
            success: false,
            error: result.error || "License activation failed",
          };
        }

        if (!result.success) {
          // Handle trial expiration from backend success response
          if (result.error?.includes("trial") && result.error?.includes("expir")) {
            return {
              success: false,
              error: "Your trial period has expired. This trial license key can only be used once. Please purchase a license to continue using the app."
            };
          }
          return {
            success: false,
            error: result.error || "License activation failed",
          };
        }

        // Map backend plan type to frontend license type
        const planTypeMap: Record<string, LicenseType> = {
          'personal': 'personal',
          'family': 'family',
          'trial': 'trial'
};

        licenseType = planTypeMap[result.data?.planType] || 'personal';

        // Store the license token for offline validation and trial expiration checking
        if (result.data?.token) {
                    localStorage.setItem('license_token', result.data.token);

          // If this is a trial license, initialize the local trial service with backend data
          if (licenseType === 'trial' && result.data) {
            // Verify backend response matches security requirements
            if (result.data.isNewActivation) {
              // Store additional security information
              localStorage.setItem('trial_activation_time', result.data.activationTime || new Date().toISOString());
              localStorage.setItem('trial_expiry_time', result.data.expiryTime || '');
            }

            // For trial licenses, start the backend-dependent trial service
            // The trial service will fetch status from the backend API
            try {
              // Store encrypted trial data for additional security
              this.storeSecureTrialData(result.data, cleanKey, hardwareId);
            } catch (error) {
              console.error('Error starting trial service:', error);
              throw error;
            }
          }
        }
      } else {
        // Already activated earlier and lifetime mode is ON; trust stored type
        licenseType = (localStorage.getItem(
          LicenseService.LICENSE_TYPE_STORAGE
        ) as LicenseType) || undefined;

        // Verify trial integrity if it's a trial license
        if (licenseType === 'trial') {
          const integrityCheck = await this.verifyTrialIntegrity(cleanKey);
          if (!integrityCheck) {
            return {
              success: false,
              error: "Trial integrity check failed. Please contact support."
            };
          }
        }
      }

      localStorage.setItem(LicenseService.LICENSE_KEY_STORAGE, cleanKey);
      if (licenseType) {
        localStorage.setItem(LicenseService.LICENSE_TYPE_STORAGE, licenseType);
      }
      localStorage.setItem(
        LicenseService.LICENSE_ACTIVATED_STORAGE,
        new Date().toISOString()
      );
      // Record initial validation timestamp (historical only). No future validations in lifetime mode.
      localStorage.setItem(
        LicenseService.LAST_VALIDATION_STORAGE,
        Date.now().toString()
      );

      // Store hardware ID for future validations
      localStorage.setItem(LicenseService.HARDWARE_ID_STORAGE, hardwareId);

      // Only end trial for non-trial licenses
      if (licenseType !== 'trial') {
        trialService.endTrial();

        // Also clear any remaining trial-related localStorage items
        localStorage.removeItem('trial_hardware_hash');
        localStorage.removeItem('trial_activation_time');
        localStorage.removeItem('trial_expiry_time');
        sessionStorage.removeItem('trial_session');
        sessionStorage.removeItem('secure_trial_data');
      }

      return { success: true, licenseType };
    } catch (error) {
      console.error("License activation error:", error);

      // Don't fallback to local validation - server validation is required
      if (error instanceof TypeError && error.message.includes("fetch")) {
        return {
          success: false,
          error:
            "Unable to connect to license server. Please check your internet connection and try again.",
        };
      }

      return { success: false, error: "License activation failed" };
    }
  }

  /**
   * Store secure trial data
   */
  private storeSecureTrialData(backendData: any, licenseKey: string, hardwareHash: string): void {
    try {
      const secureData = {
        licenseKey,
        hardwareHash,
        activationTime: backendData.activationTime,
        expiryTime: backendData.expiryTime,
        trialDurationMs: backendData.trialDurationMs,
        securityHash: backendData.token ? this.extractSecurityHash(backendData.token) : null,
        timestamp: Date.now()
      };

      // Store in sessionStorage (cleared on browser close)
      sessionStorage.setItem('secure_trial_data', JSON.stringify(secureData));
    } catch (error) {
      console.error('Error storing secure trial data:', error);
    }
  }

  /**
   * Verify trial integrity
   */
  private async verifyTrialIntegrity(licenseKey: string): Promise<boolean> {
    try {
      const storedHardwareHash = localStorage.getItem('trial_hardware_hash');
      const currentHardwareHash = await this.generateHardwareFingerprint();

      // Verify hardware hash hasn't changed
      if (storedHardwareHash && storedHardwareHash !== currentHardwareHash) {
        console.error('Trial integrity check failed: hardware hash mismatch');
        return false;
      }

      // Verify license key matches
      const storedLicenseKey = localStorage.getItem('trial_license_key');
      if (storedLicenseKey !== licenseKey) {
        console.error('Trial integrity check failed: license key mismatch');
        return false;
      }

      // Verify secure session data if available
      const secureSession = sessionStorage.getItem('trial_session');
      if (secureSession) {
        const sessionData = JSON.parse(secureSession);
        if (sessionData.hardwareHash !== currentHardwareHash || sessionData.licenseKey !== licenseKey) {
          console.error('Trial integrity check failed: session data mismatch');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error verifying trial integrity:', error);
      return false;
    }
  }

  /**
   * Extract security hash from token
   */
  private extractSecurityHash(token: string): string | null {
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      return tokenData.securityHash || null;
    } catch (error) {
      console.error('Error extracting security hash:', error);
      return null;
    }
  }

  /**
   * Validate license in background without blocking UI
   */
  private async validateLicenseInBackground(_licenseKey: string): Promise<void> {
    if (!LicenseService.LIFETIME_ONE_TIME_ACTIVATION) {
      // If legacy behaviour is re-enabled, we could restore previous implementation.
      return;
    }
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
   * Remove license (for testing or license transfer)
   */
  removeLicense(): void {
    localStorage.removeItem(LicenseService.LICENSE_KEY_STORAGE);
    localStorage.removeItem(LicenseService.LICENSE_TYPE_STORAGE);
    localStorage.removeItem(LicenseService.LICENSE_ACTIVATED_STORAGE);
    localStorage.removeItem(LicenseService.LAST_VALIDATION_STORAGE);
    localStorage.removeItem(LicenseService.HARDWARE_ID_STORAGE);
    localStorage.removeItem('license_token');
  }

  /**
   * Validate license for critical operations (more frequent validation)
   */
  async validateForCriticalOperation(): Promise<boolean> {
    // In lifetime mode critical validation is a simple local presence check.
    const key = localStorage.getItem(LicenseService.LICENSE_KEY_STORAGE);
    return !!key;
  }

  /**
   * Get license display name
   */
  getLicenseDisplayName(type: LicenseType): string {
    const names = {
      personal: "Single User License",
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
  }

  /**
   * Manually refresh license status (force validation)
   */
  async refreshLicenseStatus(): Promise<{ success: boolean; error?: string }> {
    // Lifetime mode: nothing to refresh, license is considered valid if stored.
    const key = localStorage.getItem(LicenseService.LICENSE_KEY_STORAGE);
    if (!key) return { success: false, error: "No license found" };
    return { success: true };
  }
}

export const licenseService = LicenseService.getInstance();
