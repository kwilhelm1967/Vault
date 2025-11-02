import environment from "../config/environment";
import { trialService, TrialInfo } from "./trialService";

export type LicenseType = "single" | "family" | "pro" | "business";

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
  getAppStatus(): AppLicenseStatus {
    const licenseInfo = this.getLicenseInfo();
    const trialInfo = trialService.getTrialInfo();

    const canUseApp = licenseInfo.isValid || trialInfo.isTrialActive;
    const requiresPurchase =
      !licenseInfo.isValid &&
      (trialInfo.isExpired || !trialInfo.hasTrialBeenUsed);

    return {
      isLicensed: licenseInfo.isValid,
      licenseInfo,
      trialInfo,
      canUseApp,
      requiresPurchase: requiresPurchase && trialInfo.hasTrialBeenUsed,
    };
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
   * Activate a license key
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
        console.log(result);

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
          return {
            success: false,
            error: result.error || "License activation failed",
          };
        }

        if (!result.success) {
          return {
            success: false,
            error: result.error || "License activation failed",
          };
        }

        // Map backend plan type to frontend license type
        const planTypeMap: Record<string, LicenseType> = {
          'personal': 'single',
          'family': 'family',
          'pro': 'pro',
          'business': 'business'
        };

        licenseType = planTypeMap[result.data?.planType] || 'single';
      } else {
        // Already activated earlier and lifetime mode is ON; trust stored type
        licenseType = (localStorage.getItem(
          LicenseService.LICENSE_TYPE_STORAGE
        ) as LicenseType) || undefined;
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

      // End trial since user has a valid license
      trialService.endTrial();

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
  startTrial(): TrialInfo {
    return trialService.startTrial();
  }

  /**
   * Check if user can start a trial
   */
  canStartTrial(): boolean {
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
      single: "Single User License",
      family: "Family Plan",
      pro: "Pro License",
      business: "Business Plan",
    };
    return names[type];
  }

  /**
   * Check if app access should be blocked
   */
  shouldBlockAccess(): boolean {
    const status = this.getAppStatus();
    return !status.canUseApp;
  }

  /**
   * Get trial progress percentage
   */
  getTrialProgress(): number {
    return trialService.getTrialProgress();
  }

  /**
   * Get trial time remaining
   */
  getTrialTimeRemaining(): string {
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
