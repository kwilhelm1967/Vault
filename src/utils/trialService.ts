export interface TrialInfo {
  isTrialActive: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  secondsRemaining: number;
  isExpired: boolean;
  startDate: Date | null;
  endDate: Date | null;
  hasTrialBeenUsed: boolean;
  timeRemaining: string;
  trialDurationDisplay: string;
  licenseKey: string | null;
  securityHash: string | null;
  activationTime: Date | null;
  lastChecked: Date | null;
  warningPopup1Timestamp?: string | null;
  warningPopup2Timestamp?: string | null;
}

export interface WarningPopupState {
  shouldShowExpiringWarning: boolean;
  shouldShowFinalWarning: boolean;
  timeRemaining: string;
}

export interface BackendTrialStatus {
  isTrial: boolean;
  isActive: boolean;
  isExpired: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  expiresAt: string | null;
  timeRemaining: string;
  licenseKey: string;
  planName: string;
  trialDuration: string;
}

export class TrialService {
  private static instance: TrialService;
  private static readonly TRIAL_START_KEY = "trial_start_date";
  private static readonly TRIAL_USED_KEY = "trial_used";
  private static readonly TRIAL_LICENSE_KEY = "trial_license_key";
  private static readonly LICENSE_TOKEN_KEY = "license_token";
  private static readonly WARNING_POPUP_1_SHOWN_KEY = "warning_popup_1_shown";
  private static readonly WARNING_POPUP_2_SHOWN_KEY = "warning_popup_2_shown";
  private expirationCallbacks: (() => void)[] = [];
  private warningPopupCallbacks: ((state: WarningPopupState) => void)[] = [];
  private expirationConfirmed: boolean = false;
  private expirationConfirmationCount: number = 0;

  static getInstance(): TrialService {
    if (!TrialService.instance) {
      TrialService.instance = new TrialService();
    }
    return TrialService.instance;
  }

  /**
   * Start the trial period - now backend-dependent
   */
  async startTrial(licenseKey: string, hardwareHash: string): Promise<TrialInfo> {
    
    // Store trial metadata with enhanced security
    const activationTime = new Date().toISOString();
    localStorage.setItem(TrialService.TRIAL_START_KEY, activationTime);
    localStorage.setItem(TrialService.TRIAL_USED_KEY, "true");
    localStorage.setItem(TrialService.TRIAL_LICENSE_KEY, licenseKey);

    // Store hardware hash for verification
    localStorage.setItem('trial_hardware_hash', hardwareHash);

    // Create secure session storage for trial data
    const trialSession = {
      licenseKey,
      hardwareHash,
      activationTime,
      initialized: true
    };
    sessionStorage.setItem('trial_session', JSON.stringify(trialSession));

    // Development logging disabled to prevent unnecessary API calls
    // The trial now works offline using the JWT token
    // if (import.meta.env.DEV) {
    //   this.startDevelopmentLogging(licenseKey, hardwareHash);
    // }

    // Get initial trial status from backend
    const trialInfo = await this.getTrialInfo();
    return trialInfo;
  }

  /**
   * Get current trial information - now backend-dependent
   */
  async getTrialInfo(): Promise<TrialInfo> {
    const hasTrialBeenUsed = localStorage.getItem(TrialService.TRIAL_USED_KEY) === "true";
    const licenseKey = localStorage.getItem(TrialService.TRIAL_LICENSE_KEY);
    const licenseToken = localStorage.getItem(TrialService.LICENSE_TOKEN_KEY);
    const storedHardwareHash = localStorage.getItem('trial_hardware_hash');

    // If we have a license token, try Quick JWT parse first (more reliable)
    if (licenseToken) {
      const quickResult = this.quickJWTParse();
      if (quickResult) {
        return quickResult;
      }

      try {
        const tokenData = JSON.parse(atob(licenseToken.split('.')[1]));
        if (tokenData.planType && tokenData.planType !== 'trial') {
          // Clear any remaining trial data
          localStorage.removeItem(TrialService.TRIAL_USED_KEY);
          localStorage.removeItem(TrialService.TRIAL_LICENSE_KEY);
          localStorage.removeItem(TrialService.TRIAL_START_KEY);
          return {
            isTrialActive: false,
            daysRemaining: 0,
            hoursRemaining: 0,
            minutesRemaining: 0,
            secondsRemaining: 0,
            isExpired: false,
            startDate: null,
            endDate: null,
            hasTrialBeenUsed: false,
            timeRemaining: 'No trial needed',
            trialDurationDisplay: 'None',
            licenseKey: null,
            securityHash: null,
            activationTime: null,
            lastChecked: new Date(),
          };
        }
      } catch (error) {
        console.error('Error parsing license token in trial service:', error);
      }
    }

    if (!hasTrialBeenUsed || !licenseKey) {
      // No trial started yet
      return {
        isTrialActive: false,
        daysRemaining: 0,
        hoursRemaining: 0,
        minutesRemaining: 0,
        secondsRemaining: 0,
        isExpired: false,
        startDate: null,
        endDate: null,
        hasTrialBeenUsed: false,
        timeRemaining: 'No trial activated',
        trialDurationDisplay: 'None',
        licenseKey: null,
        securityHash: null,
        activationTime: null,
        lastChecked: new Date(),
      };
    }

    // Verify hardware hash matches
    const currentHardwareHash = await this.generateHardwareFingerprint();
    if (storedHardwareHash && storedHardwareHash !== currentHardwareHash) {
      console.error('Hardware hash mismatch detected');
      return {
        isTrialActive: false,
        daysRemaining: 0,
        hoursRemaining: 0,
        minutesRemaining: 0,
        secondsRemaining: 0,
        isExpired: true,
        startDate: null,
        endDate: null,
        hasTrialBeenUsed: true,
        timeRemaining: 'Trial invalidated - device changed',
        trialDurationDisplay: 'Invalid',
        licenseKey: licenseKey,
        securityHash: null,
        activationTime: null,
        lastChecked: new Date(),
      };
    }

    // If we have a license token, use it for trial status (offline capable)
    if (licenseToken) {
      try {
        console.log('🔑 LICENSE TOKEN FOUND, attempting to parse...');
        const tokenParts = licenseToken.split('.');
        if (tokenParts.length !== 3) {
          throw new Error('Invalid JWT format - expected 3 parts');
        }

        const tokenData = JSON.parse(atob(tokenParts[1])); // Decode JWT payload

        // 🔍 DEBUG: Log JWT token data for warning timestamps
        console.log('🔍 JWT Token Data Analysis:', {
          isTrial: tokenData.isTrial,
          trialExpiryDate: tokenData.trialExpiryDate,
          warningPopup1Timestamp: tokenData.warningPopup1Timestamp,
          warningPopup2Timestamp: tokenData.warningPopup2Timestamp,
          hasWarningTimestamps: !!(tokenData.warningPopup1Timestamp && tokenData.warningPopup2Timestamp),
          allTokenData: tokenData
        });

        if (tokenData.isTrial && tokenData.trialExpiryDate) {
          console.log('✅ JWT TOKEN IS VALID TRIAL - proceeding with calculation');
          const now = new Date();
          const expiryDate = new Date(tokenData.trialExpiryDate);
          const isExpired = now >= expiryDate; // Use >= to include exact expiry time
          const isActive = !isExpired;


          // Calculate remaining time with seconds precision
          const remainingMs = Math.max(0, expiryDate.getTime() - now.getTime());
          const daysRemaining = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
          const hoursRemaining = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
          const minutesRemaining = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
          const secondsRemaining = Math.floor((remainingMs % (60 * 1000)) / 1000);

          let timeRemaining;
          if (isExpired) {
            timeRemaining = 'Trial expired';
          } else if (daysRemaining > 0) {
            timeRemaining = `${daysRemaining}d ${hoursRemaining}h ${minutesRemaining}m ${secondsRemaining}s`;
          } else if (hoursRemaining > 0) {
            timeRemaining = `${hoursRemaining}h ${minutesRemaining}m ${secondsRemaining}s`;
          } else if (minutesRemaining > 0) {
            timeRemaining = `${minutesRemaining}m ${secondsRemaining}s`;
          } else {
            timeRemaining = `${secondsRemaining}s`;
          }

          return {
            isTrialActive: isActive,
            daysRemaining,
            hoursRemaining,
            minutesRemaining,
            secondsRemaining,
            isExpired,
            startDate: new Date(localStorage.getItem(TrialService.TRIAL_START_KEY) || now.toISOString()),
            endDate: expiryDate,
            hasTrialBeenUsed: true,
            timeRemaining,
            trialDurationDisplay: tokenData.trialDurationDisplay || 'Unknown',
            licenseKey: licenseKey,
            securityHash: tokenData.securityHash || null,
            activationTime: tokenData.activationTime ? new Date(tokenData.activationTime) : null,
            lastChecked: new Date(),
            warningPopup1Timestamp: tokenData.warningPopup1Timestamp || null,
            warningPopup2Timestamp: tokenData.warningPopup2Timestamp || null,
          };
        }
      } catch (error) {
        // JWT parsing failed, continue to fallback logic
      }
    }

    // Fallback: If we have trial data but no license token, check if trial should be expired
    const trialStartDate = localStorage.getItem(TrialService.TRIAL_START_KEY);
    if (trialStartDate) {
      const startDate = new Date(trialStartDate);
      // In development mode, trials expire after minutes instead of days
      const isDevMode = import.meta.env.DEV;
      const trialDurationMs = isDevMode ? 5 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000; // 5 min dev vs 7 days prod
      const expiryDate = new Date(startDate.getTime() + trialDurationMs);
      const now = new Date();
      const isExpired = now >= expiryDate;


      return {
        isTrialActive: !isExpired,
        daysRemaining: isExpired ? 0 : Math.max(0, Math.floor((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))),
        hoursRemaining: isExpired ? 0 : Math.max(0, Math.floor((expiryDate.getTime() - now.getTime()) / (60 * 60 * 1000))),
        minutesRemaining: isExpired ? 0 : Math.max(0, Math.floor((expiryDate.getTime() - now.getTime()) / (60 * 1000))),
        secondsRemaining: isExpired ? 0 : Math.max(0, Math.floor((expiryDate.getTime() - now.getTime()) / 1000)),
        isExpired,
        startDate,
        endDate: expiryDate,
        hasTrialBeenUsed: true,
        timeRemaining: isExpired ? 'Trial expired' : `Checking trial status...`,
        trialDurationDisplay: isDevMode ? '5 minutes' : '7 days',
        licenseKey: licenseKey,
        securityHash: null,
        activationTime: startDate,
        lastChecked: new Date(),
      };
    }

    // Try quick JWT parse as a fallback before final fallback
    const quickResult = this.quickJWTParse();
    if (quickResult) {
      return quickResult;
    }

    // Final fallback with no start date
    const fallbackResult = {
      isTrialActive: false,
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
      secondsRemaining: 0,
      isExpired: false,
      startDate: new Date(localStorage.getItem(TrialService.TRIAL_START_KEY) || ''),
      endDate: null,
      hasTrialBeenUsed: true,
      timeRemaining: 'Checking trial status...',
      trialDurationDisplay: 'Unknown',
      licenseKey: licenseKey,
      securityHash: null,
      activationTime: null,
      lastChecked: new Date(),
    };


    return fallbackResult;
  }

  /**
   * Quick JWT parse for debugging - bypass all logic
   */
  quickJWTParse(): TrialInfo | null {
    try {
      const licenseToken = localStorage.getItem(TrialService.LICENSE_TOKEN_KEY);
      if (!licenseToken) {
        return null;
      }

      const tokenData = JSON.parse(atob(licenseToken.split('.')[1]));

      if (!tokenData.isTrial || !tokenData.trialExpiryDate) {
        return null;
      }

      const now = new Date();
      const expiryDate = new Date(tokenData.trialExpiryDate);
      const isExpired = now >= expiryDate;
      const isActive = !isExpired;

      const remainingMs = Math.max(0, expiryDate.getTime() - now.getTime());
      const minutesRemaining = Math.floor(remainingMs / (60 * 1000));
      const secondsRemaining = Math.floor((remainingMs % (60 * 1000)) / 1000);

      const timeRemaining = isExpired ? 'Trial expired' : `${minutesRemaining}m ${secondsRemaining}s`;

      return {
        isTrialActive: isActive,
        daysRemaining: 0,
        hoursRemaining: 0,
        minutesRemaining,
        secondsRemaining,
        isExpired,
        startDate: tokenData.activationTime ? new Date(tokenData.activationTime) : new Date(),
        endDate: expiryDate,
        hasTrialBeenUsed: true,
        timeRemaining,
        trialDurationDisplay: tokenData.trialDurationDisplay || 'minutes',
        licenseKey: tokenData.licenseKey || null,
        securityHash: tokenData.securityHash || null,
        activationTime: tokenData.activationTime ? new Date(tokenData.activationTime) : null,
        lastChecked: new Date(),
        warningPopup1Timestamp: tokenData.warningPopup1Timestamp || null,
        warningPopup2Timestamp: tokenData.warningPopup2Timestamp || null,
      };
    } catch (error) {
      console.error('❌ QUICK JWT PARSE ERROR:', error);
      return null;
    }
  }

  /**
   * Generate hardware fingerprint for trial validation
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

  // Backend API method removed - trial status is now determined from JWT token
  // async getTrialStatusFromBackend() - removed to prevent 404 errors

  // Development logging methods removed to prevent unnecessary API calls
  // The trial now works offline using JWT token validation

  /**
   * Check if trial has expired
   */
  async isTrialExpired(): Promise<boolean> {
    const trialInfo = await this.getTrialInfo();
    return trialInfo.hasTrialBeenUsed && trialInfo.isExpired;
  }

  /**
   * Check and handle trial expiration (triggers callbacks if expired)
   */
  async checkAndHandleExpiration(): Promise<boolean> {
    const trialInfo = await this.getTrialInfo();



    // If trial is not used or not expired, no need to check further
    if (!trialInfo.hasTrialBeenUsed || !trialInfo.isExpired) {
      // Reset expiration confirmation if trial is somehow valid again
      if (this.expirationConfirmed && !trialInfo.isExpired) {
        this.expirationConfirmed = false;
        this.expirationConfirmationCount = 0;
      }
      return false;
    }

    // If expiration is confirmed, limit further checking
    if (this.expirationConfirmed) {
      this.expirationConfirmationCount++;


      // Only verify 2-3 times after initial confirmation
      if (this.expirationConfirmationCount >= 3) {
        return true;
      }
    } else {
      // First time detecting expiration
      this.expirationConfirmed = true;
      this.expirationConfirmationCount = 1;
      this.triggerExpirationCallbacks();
    }

    return true;
  }

  /**
   * Check if expiration has been confirmed
   */
  isExpirationConfirmed(): boolean {
    return this.expirationConfirmed;
  }

  /**
   * Reset expiration confirmation (for testing)
   */
  resetExpirationConfirmation(): void {
    this.expirationConfirmed = false;
    this.expirationConfirmationCount = 0;
  }

  /**
   * Check if trial is currently active
   */
  async isTrialActive(): Promise<boolean> {
    const trialInfo = await this.getTrialInfo();
    return trialInfo.hasTrialBeenUsed && trialInfo.isTrialActive;
  }

  /**
   * Check if user can start a trial (hasn't used it yet)
   */
  async canStartTrial(): Promise<boolean> {
    const trialInfo = await this.getTrialInfo();
    return !trialInfo.hasTrialBeenUsed;
  }

  /**
   * Get remaining trial time in a human-readable format
   */
  async getTrialTimeRemaining(): Promise<string> {
    const trialInfo = await this.getTrialInfo();
    return trialInfo.timeRemaining;
  }

  /**
   * Reset trial (for testing purposes only)
   */
  resetTrial(): void {
    localStorage.removeItem(TrialService.TRIAL_START_KEY);
    localStorage.removeItem(TrialService.TRIAL_USED_KEY);
    localStorage.removeItem(TrialService.TRIAL_LICENSE_KEY);
    localStorage.removeItem(TrialService.LICENSE_TOKEN_KEY);

    // Development logging removed - no longer needed

    // Reset expiration tracking
    this.expirationConfirmed = false;
    this.expirationConfirmationCount = 0;
  }

  /**
   * End trial manually (when user purchases license)
   */
  endTrial(): void {
    // Keep the trial data but mark it as used
    // This prevents starting another trial
    localStorage.setItem(TrialService.TRIAL_USED_KEY, "true");

    // Development logging removed - no longer needed

    // Trigger expiration callbacks since trial ended
    this.triggerExpirationCallbacks();

  }

  /**
   * Get trial progress as percentage (0-100) - calculated from backend data
   */
  async getTrialProgress(): Promise<number> {
    const trialInfo = await this.getTrialInfo();

    if (!trialInfo.hasTrialBeenUsed || !trialInfo.startDate || !trialInfo.endDate) {
      return 0;
    }

    if (trialInfo.isExpired) {
      return 100;
    }

    const totalTime = trialInfo.endDate.getTime() - trialInfo.startDate.getTime();
    const elapsed = new Date().getTime() - trialInfo.startDate.getTime();
    return Math.round(Math.min(100, Math.max(0, (elapsed / totalTime) * 100)));
  }

  /**
   * Add callback for trial expiration
   */
  addExpirationCallback(callback: () => void): void {
    this.expirationCallbacks.push(callback);
  }

  /**
   * Remove expiration callback
   */
  removeExpirationCallback(callback: () => void): void {
    const index = this.expirationCallbacks.indexOf(callback);
    if (index > -1) {
      this.expirationCallbacks.splice(index, 1);
    }
  }

  /**
   * Trigger all expiration callbacks
   */
  private triggerExpirationCallbacks(): void {
    this.expirationCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error("Error in expiration callback:", error);
      }
    });
  }

  /**
   * Add callback for warning popup changes
   */
  addWarningPopupCallback(callback: (state: WarningPopupState) => void): void {
    this.warningPopupCallbacks.push(callback);
  }

  /**
   * Remove warning popup callback
   */
  removeWarningPopupCallback(callback: (state: WarningPopupState) => void): void {
    const index = this.warningPopupCallbacks.indexOf(callback);
    if (index > -1) {
      this.warningPopupCallbacks.splice(index, 1);
    }
  }

  /**
   * Trigger all warning popup callbacks
   */
  private triggerWarningPopupCallbacks(state: WarningPopupState): void {
    this.warningPopupCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error("Error in warning popup callback:", error);
      }
    });
  }

  /**
   * Check if warning popup should be shown
   */
  async checkWarningPopups(): Promise<void> {
    try {
      const trialInfo = await this.getTrialInfo();

      // Don't show warnings if trial is not active or already expired
      if (!trialInfo.isTrialActive || trialInfo.isExpired || !trialInfo.endDate) {
        return;
      }

      const now = new Date();
      const popup1Shown = localStorage.getItem(TrialService.WARNING_POPUP_1_SHOWN_KEY) === 'true';
      const popup2Shown = localStorage.getItem(TrialService.WARNING_POPUP_2_SHOWN_KEY) === 'true';

      // Check first warning popup (2 minutes before)
      if (!popup1Shown && trialInfo.warningPopup1Timestamp) {
        const popup1Time = new Date(trialInfo.warningPopup1Timestamp);
        if (now >= popup1Time) {
          console.log('🚨 TRIGGERING POPUP 1 (Expiring Soon)');
          localStorage.setItem(TrialService.WARNING_POPUP_1_SHOWN_KEY, 'true');
          this.triggerWarningPopupCallbacks({
            shouldShowExpiringWarning: true,
            shouldShowFinalWarning: false,
            timeRemaining: trialInfo.timeRemaining,
          });
          return;
        }
      }

      // Check second warning popup (1 minute before)
      if (!popup2Shown && trialInfo.warningPopup2Timestamp) {
        const popup2Time = new Date(trialInfo.warningPopup2Timestamp);
        if (now >= popup2Time) {
          console.log('🚨 TRIGGERING POPUP 2 (Final Notice)');
          localStorage.setItem(TrialService.WARNING_POPUP_2_SHOWN_KEY, 'true');
          this.triggerWarningPopupCallbacks({
            shouldShowExpiringWarning: false,
            shouldShowFinalWarning: true,
            timeRemaining: trialInfo.timeRemaining,
          });
        }
      }
    } catch (error) {
      console.error('❌ ERROR checking warning popups:', error);
    }
  }

  /**
   * Reset warning popup state (for testing)
   */
  resetWarningPopups(): void {
    localStorage.removeItem(TrialService.WARNING_POPUP_1_SHOWN_KEY);
    localStorage.removeItem(TrialService.WARNING_POPUP_2_SHOWN_KEY);
  }

  /**
   * Check if specific warning popup has been shown
   */
  hasWarningPopupBeenShown(popupNumber: 1 | 2): boolean {
    const key = popupNumber === 1
      ? TrialService.WARNING_POPUP_1_SHOWN_KEY
      : TrialService.WARNING_POPUP_2_SHOWN_KEY;
    return localStorage.getItem(key) === 'true';
  }

  /**
   * Debug method to log current trial status and warning times
   */
  async logTrialStatus(): Promise<void> {
    try {
      const trialInfo = await this.getTrialInfo();
      const now = new Date();

      console.log('📋 TRIAL STATUS DEBUG REPORT:', {
        currentTime: now.toISOString(),
        trialActive: trialInfo.isTrialActive,
        isExpired: trialInfo.isExpired,
        trialEndDate: trialInfo.endDate?.toISOString(),
        timeRemaining: trialInfo.timeRemaining,
        warning1Timestamp: trialInfo.warningPopup1Timestamp,
        warning2Timestamp: trialInfo.warningPopup2Timestamp,
        warning1Shown: this.hasWarningPopupBeenShown(1),
        warning2Shown: this.hasWarningPopupBeenShown(2),
        licenseTokenPresent: !!localStorage.getItem(TrialService.LICENSE_TOKEN_KEY)
      });

      if (trialInfo.warningPopup1Timestamp) {
        const warning1Time = new Date(trialInfo.warningPopup1Timestamp);
        const timeToWarning1 = warning1Time.getTime() - now.getTime();
        console.log(`⏰ WARNING 1: ${timeToWarning1 > 0 ? Math.floor(timeToWarning1 / 1000) + 's' : 'PAST'} (${warning1Time.toISOString()})`);
      }

      if (trialInfo.warningPopup2Timestamp) {
        const warning2Time = new Date(trialInfo.warningPopup2Timestamp);
        const timeToWarning2 = warning2Time.getTime() - now.getTime();
        console.log(`⏰ WARNING 2: ${timeToWarning2 > 0 ? Math.floor(timeToWarning2 / 1000) + 's' : 'PAST'} (${warning2Time.toISOString()})`);
      }
    } catch (error) {
      console.error('❌ ERROR in logTrialStatus:', error);
    }
  }
}

export const trialService = TrialService.getInstance();

/**
 * Main Process Communication Helpers for Trial Validation
 * These functions help synchronize trial status between renderer and main process
 */

/**
 * Check if trial is expired via main process
 * This provides an additional security layer by validating trial status in the main process
 */
export async function checkTrialExpiredInMainProcess(): Promise<boolean> {
  try {
    if (window.electronAPI?.isTrialExpired) {
      return await window.electronAPI.isTrialExpired();
    }

    // Fallback to local check if main process API not available
    return await trialService.isTrialExpired();
  } catch (error) {
    console.error('Error checking trial status in main process:', error);
    return true; // Assume expired for security
  }
}

/**
 * Get detailed trial status from main process
 */
export async function getTrialStatusFromMainProcess(): Promise<{
  hasTrial: boolean;
  isExpired: boolean;
  canUnlock: boolean;
  expiryTime?: string;
}> {
  try {
    if (window.electronAPI?.checkTrialStatus) {
      return await window.electronAPI.checkTrialStatus();
    }

    // Fallback to local check if main process API not available
    const trialInfo = await trialService.getTrialInfo();
    return {
      hasTrial: trialInfo.hasTrialBeenUsed,
      isExpired: trialInfo.isExpired,
      canUnlock: !trialInfo.isExpired,
      expiryTime: trialInfo.endDate?.toISOString()
    };
  } catch (error) {
    console.error('Error getting trial status from main process:', error);
    return {
      hasTrial: false,
      isExpired: true,
      canUnlock: false
    };
  }
}

/**
 * Sync trial status to main process for consistent enforcement
 * This ensures the main process has the same trial data as renderer
 */
export async function syncTrialStatusToMainProcess(): Promise<boolean> {
  try {
    const trialInfo = await trialService.getTrialInfo();

    // Save trial info to file system for main process access
    if (window.electronAPI?.saveTrialInfo) {
      return await window.electronAPI.saveTrialInfo({
        hasTrial: trialInfo.hasTrialBeenUsed,
        isExpired: trialInfo.isExpired,
        expiryTime: trialInfo.endDate?.toISOString(),
        hasValidLicense: trialInfo.licenseKey && !trialInfo.isTrialActive
      });
    }

    return false;
  } catch (error) {
    console.error('Error syncing trial status to main process:', error);
    return false;
  }
}

/**
 * Validate trial status across both processes
 * Returns true if trial is valid in both renderer and main process
 */
export async function validateTrialStatusAcrossProcesses(): Promise<boolean> {
  try {
    // Check trial status in renderer
    const rendererTrialInfo = await trialService.getTrialInfo();

    // Check trial status in main process
    const mainProcessStatus = await getTrialStatusFromMainProcess();

    // Both processes must agree that trial is valid
    const rendererValid = !rendererTrialInfo.isExpired || !rendererTrialInfo.hasTrialBeenUsed;
    const mainProcessValid = mainProcessStatus.canUnlock;

    return rendererValid && mainProcessValid;
  } catch (error) {
    console.error('Error validating trial status across processes:', error);
    return false; // Assume invalid for security
  }
}
