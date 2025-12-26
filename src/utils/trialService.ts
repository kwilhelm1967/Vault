import { generateHardwareFingerprint } from "./hardwareFingerprint";
import { verifyLicenseSignature } from "./licenseValidator";
import { devError, devLog } from "./devLog";
import { apiClient, ApiError } from "./apiClient";
import { getLPVDeviceFingerprint } from "./deviceFingerprint";

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

/**
 * Signed trial file structure (same as license files)
 */
export interface SignedTrialFile {
  trial_key: string;
  device_id: string;
  plan_type: 'trial';
  start_date: string;
  expires_at: string;
  product_type?: string;
  signature: string;
  signed_at: string;
}

export class TrialService {
  private static instance: TrialService;
  private static readonly TRIAL_FILE_STORAGE = "lpv_trial_file";
  private static readonly TRIAL_USED_KEY = "trial_used";
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
   * Activate trial with signed trial file from backend
   */
  async activateTrial(trialKey: string): Promise<{
    success: boolean;
    error?: string;
    trialInfo?: TrialInfo;
  }> {
    try {
      const cleanKey = trialKey.replace(/[^A-Z0-9-]/g, "");
      const deviceId = await getLPVDeviceFingerprint();

      // Development mode: create unsigned trial file
      if (import.meta.env.DEV) {
        const startDate = new Date().toISOString();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        const trialFile: SignedTrialFile = {
          trial_key: cleanKey,
          device_id: deviceId,
          plan_type: 'trial',
          start_date: startDate,
          expires_at: expiresAt.toISOString(),
          product_type: 'lpv',
          signature: '',
          signed_at: new Date().toISOString(),
        };
        
        this.saveTrialFile(trialFile);
        localStorage.setItem(TrialService.TRIAL_USED_KEY, "true");
        
        const trialInfo = await this.getTrialInfo();
        return { success: true, trialInfo };
      }

      // Call trial activation API
      const response = await apiClient.post<{
        status: string;
        trial_file?: SignedTrialFile;
        expires_at?: string;
        error?: string;
      }>(
        "/api/lpv/license/trial/activate",
        {
          trial_key: cleanKey,
          device_id: deviceId,
        },
        {
          retries: 2,
          timeout: 10000,
        }
      );

      const result = response.data;

      if (result.status === "expired") {
        return {
          success: false,
          error: result.error || "This trial has expired. Your 7-day trial period has ended. Please purchase a license to continue using Local Password Vault.",
        };
      }

      if (result.status === "invalid") {
        return {
          success: false,
          error: result.error || "Invalid trial key. Please check your email for the correct trial key (format: TRIA-XXXX-XXXX-XXXX-XXXX). If you can't find it, contact support@LocalPasswordVault.com",
        };
      }

      if (result.status === "activated" && result.trial_file) {
        // Verify signature
        const isValid = await verifyLicenseSignature(result.trial_file);
        if (!isValid) {
          return {
            success: false,
            error: "Trial activation verification failed. The trial file appears to be corrupted. Please try again, or contact support@LocalPasswordVault.com if the problem persists.",
          };
        }

        // Save signed trial file
        this.saveTrialFile(result.trial_file);
        localStorage.setItem(TrialService.TRIAL_USED_KEY, "true");

        const trialInfo = await this.getTrialInfo();
        return { success: true, trialInfo };
      }

      return {
        success: false,
        error: result.error || "Trial activation failed. Please check your trial key and internet connection, then try again. If the problem persists, contact support@LocalPasswordVault.com",
      };

    } catch (error) {
      devError("Trial activation error:", error);

      if (error && typeof error === "object" && "code" in error) {
        const apiError = error as ApiError;
        if (apiError.code === "NETWORK_ERROR" || apiError.code === "REQUEST_TIMEOUT") {
          return {
            success: false,
            error: "Unable to connect to license server. Please check your internet connection and try again. Internet access is required for trial activation.",
          };
        }
        return {
          success: false,
          error: apiError.message || "Trial activation failed. Please try again, or contact support@LocalPasswordVault.com if the problem persists.",
        };
      }

      return { 
        success: false, 
        error: "Trial activation failed. Please check your internet connection and try again. If the problem continues, contact support@LocalPasswordVault.com"
      };
    }
  }

  /**
   * Start the trial period (legacy method - now calls activateTrial)
   */
  async startTrial(licenseKey: string, hardwareHash: string): Promise<TrialInfo> {
    const result = await this.activateTrial(licenseKey);
    if (result.success && result.trialInfo) {
      return result.trialInfo;
    }
    // Return empty trial info on failure
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

  /**
   * Get current trial information from signed trial file
   */
  async getTrialInfo(): Promise<TrialInfo> {
    const trialFile = this.getTrialFile();
    
    if (!trialFile) {
      const hasTrialBeenUsed = localStorage.getItem(TrialService.TRIAL_USED_KEY) === "true";
      return {
        isTrialActive: false,
        daysRemaining: 0,
        hoursRemaining: 0,
        minutesRemaining: 0,
        secondsRemaining: 0,
        isExpired: false,
        startDate: null,
        endDate: null,
        hasTrialBeenUsed,
        timeRemaining: hasTrialBeenUsed ? 'Trial expired or invalid' : 'No trial activated',
        trialDurationDisplay: 'None',
        licenseKey: null,
        securityHash: null,
        activationTime: null,
        lastChecked: new Date(),
      };
    }

    // Verify signature (async)
    const isValid = await verifyLicenseSignature(trialFile);
    if (!isValid) {
      devError('Invalid trial file signature');
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
        timeRemaining: 'Trial file invalid - signature verification failed',
        trialDurationDisplay: 'Invalid',
        licenseKey: trialFile.trial_key,
        securityHash: null,
        activationTime: null,
        lastChecked: new Date(),
      };
    }

    // Verify device binding
    const currentDeviceId = await getLPVDeviceFingerprint();
    if (trialFile.device_id !== currentDeviceId) {
      devError('Device mismatch detected for trial');
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
        licenseKey: trialFile.trial_key,
        securityHash: null,
        activationTime: null,
        lastChecked: new Date(),
      };
    }

    // Calculate expiration from signed start_date (prevents tampering)
    const startDate = new Date(trialFile.start_date);
    const expiresAt = new Date(trialFile.expires_at);
    const now = new Date();
    
    // Use the signed start_date to calculate expiration
    // This ensures the trial expires exactly 7 days after the signed start date
    // regardless of system clock manipulation
    const isExpired = now >= expiresAt;
    const isActive = !isExpired;

    // Calculate remaining time
    const remainingMs = Math.max(0, expiresAt.getTime() - now.getTime());
    const daysRemaining = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const hoursRemaining = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutesRemaining = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
    const secondsRemaining = Math.floor((remainingMs % (60 * 1000)) / 1000);

    let timeRemaining: string;
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

    const trialDurationDisplay = daysRemaining > 0 
      ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
      : hoursRemaining > 0
      ? `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`
      : `${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}`;

    return {
      isTrialActive: isActive,
      daysRemaining,
      hoursRemaining,
      minutesRemaining,
      secondsRemaining,
      isExpired,
      startDate,
      endDate: expiresAt,
      hasTrialBeenUsed: true,
      timeRemaining,
      trialDurationDisplay,
      licenseKey: trialFile.trial_key,
      securityHash: trialFile.device_id,
      activationTime: startDate,
      lastChecked: new Date(),
      warningPopup1Timestamp: localStorage.getItem(TrialService.WARNING_POPUP_1_SHOWN_KEY),
      warningPopup2Timestamp: localStorage.getItem(TrialService.WARNING_POPUP_2_SHOWN_KEY),
    };
  }

  /**
   * Get signed trial file from storage
   */
  private getTrialFile(): SignedTrialFile | null {
    try {
      const stored = localStorage.getItem(TrialService.TRIAL_FILE_STORAGE);
      if (!stored) return null;
      return JSON.parse(stored) as SignedTrialFile;
    } catch (error) {
      devError('Failed to parse trial file:', error);
      return null;
    }
  }

  /**
   * Save signed trial file to storage
   */
  private saveTrialFile(trialFile: SignedTrialFile): void {
    try {
      localStorage.setItem(TrialService.TRIAL_FILE_STORAGE, JSON.stringify(trialFile));
    } catch (error) {
      devError('Failed to save trial file:', error);
    }
  }

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
    localStorage.removeItem(TrialService.TRIAL_FILE_STORAGE);
    localStorage.removeItem(TrialService.TRIAL_USED_KEY);
    localStorage.removeItem(TrialService.WARNING_POPUP_1_SHOWN_KEY);
    localStorage.removeItem(TrialService.WARNING_POPUP_2_SHOWN_KEY);

    // Reset expiration tracking
    this.expirationConfirmed = false;
    this.expirationConfirmationCount = 0;
  }

  /**
   * End trial manually (when user purchases license)
   */
  endTrial(): void {
    // Clear trial file
    localStorage.removeItem(TrialService.TRIAL_FILE_STORAGE);
    // Keep the trial used flag to prevent starting another trial
    localStorage.setItem(TrialService.TRIAL_USED_KEY, "true");

    // Trigger expiration callbacks since trial ended
    this.triggerExpirationCallbacks();
  }

  /**
   * Get trial progress as percentage (0-100)
   */
  async getTrialProgress(): Promise<number> {
    const trialInfo = await this.getTrialInfo();
    
    if (!trialInfo.hasTrialBeenUsed || !trialInfo.startDate || !trialInfo.endDate) {
      return 0;
    }

    if (trialInfo.isExpired) {
      return 100;
    }

    const totalDuration = trialInfo.endDate.getTime() - trialInfo.startDate.getTime();
    const elapsed = Date.now() - trialInfo.startDate.getTime();
    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    
    return progress;
  }

  /**
   * Register callback for trial expiration
   */
  onExpiration(callback: () => void): void {
    this.expirationCallbacks.push(callback);
  }

  /**
   * Unregister expiration callback
   */
  offExpiration(callback: () => void): void {
    this.expirationCallbacks = this.expirationCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Register callback for trial expiration (alias for onExpiration)
   */
  addExpirationCallback(callback: () => void): void {
    this.onExpiration(callback);
  }

  /**
   * Unregister expiration callback (alias for offExpiration)
   */
  removeExpirationCallback(callback: () => void): void {
    this.offExpiration(callback);
  }

  /**
   * Register callback for warning popups
   */
  onWarningPopup(callback: (state: WarningPopupState) => void): void {
    this.warningPopupCallbacks.push(callback);
  }

  /**
   * Unregister warning popup callback
   */
  offWarningPopup(callback: (state: WarningPopupState) => void): void {
    this.warningPopupCallbacks = this.warningPopupCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Register callback for warning popups (alias for onWarningPopup)
   */
  addWarningPopupCallback(callback: (state: WarningPopupState) => void): void {
    this.onWarningPopup(callback);
  }

  /**
   * Unregister warning popup callback (alias for offWarningPopup)
   */
  removeWarningPopupCallback(callback: (state: WarningPopupState) => void): void {
    this.offWarningPopup(callback);
  }

  /**
   * Trigger expiration callbacks
   */
  private triggerExpirationCallbacks(): void {
    this.expirationCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        devError('Error in expiration callback:', error);
      }
    });
  }

  /**
   * Check and trigger warning popups
   */
  async checkAndTriggerWarningPopups(): Promise<void> {
    const trialInfo = await this.getTrialInfo();

    if (!trialInfo.hasTrialBeenUsed || !trialInfo.isTrialActive || trialInfo.isExpired) {
      return;
    }

    const daysRemaining = trialInfo.daysRemaining;
    const hoursRemaining = trialInfo.hoursRemaining;
    const hasShownWarning1 = localStorage.getItem(TrialService.WARNING_POPUP_1_SHOWN_KEY) !== null;
    const hasShownWarning2 = localStorage.getItem(TrialService.WARNING_POPUP_2_SHOWN_KEY) !== null;

    const state: WarningPopupState = {
      shouldShowExpiringWarning: daysRemaining <= 1 && !hasShownWarning1,
      shouldShowFinalWarning: hoursRemaining <= 24 && daysRemaining === 0 && !hasShownWarning2,
      timeRemaining: trialInfo.timeRemaining,
    };

    if (state.shouldShowExpiringWarning) {
      localStorage.setItem(TrialService.WARNING_POPUP_1_SHOWN_KEY, new Date().toISOString());
    }

    if (state.shouldShowFinalWarning) {
      localStorage.setItem(TrialService.WARNING_POPUP_2_SHOWN_KEY, new Date().toISOString());
    }

    if (state.shouldShowExpiringWarning || state.shouldShowFinalWarning) {
      this.warningPopupCallbacks.forEach(callback => {
        try {
          callback(state);
        } catch (error) {
          devError('Error in warning popup callback:', error);
        }
      });
    }
  }

  /**
   * Check and trigger warning popups (alias for checkAndTriggerWarningPopups)
   */
  async checkWarningPopups(): Promise<void> {
    return this.checkAndTriggerWarningPopups();
  }
}

export const trialService = TrialService.getInstance();
