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
  private countdownInterval: NodeJS.Timeout | null = null;
  private expirationCallbacks: (() => void)[] = [];
  private expirationConfirmed: boolean = false;
  private expirationConfirmationCount: number = 0;
  private developmentLoggingInterval: NodeJS.Timeout | null = null;

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
    console.log('🎯 Trial started, backend status:', trialInfo);
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

    // Debug: show the actual token data
    if (licenseToken) {
      try {
        const tokenData = JSON.parse(atob(licenseToken.split('.')[1]));
        console.log('🔍 Full token data:', tokenData);
      } catch (error) {
        console.error('Error parsing token for debug:', error);
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
        const tokenData = JSON.parse(atob(licenseToken.split('.')[1])); // Decode JWT payload
        
        if (tokenData.isTrial && tokenData.trialExpiryDate) {
          const now = new Date();
          const expiryDate = new Date(tokenData.trialExpiryDate);
          const isExpired = now > expiryDate;
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
          };
        }
      } catch (error) {
        console.error('Error parsing license token:', error);
      }
    }

    // Fallback: Return basic trial info (will be updated by backend calls)
    return {
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

    console.log('🔍 Expiration Check:', {
      trialInfo,
      expirationConfirmed: this.expirationConfirmed
    });

    // If trial is not used or not expired, no need to check further
    if (!trialInfo.hasTrialBeenUsed || !trialInfo.isExpired) {
      // Reset expiration confirmation if trial is somehow valid again
      if (this.expirationConfirmed && !trialInfo.isExpired) {
        console.log('🔄 Trial is valid again, resetting expiration confirmation');
        this.expirationConfirmed = false;
        this.expirationConfirmationCount = 0;
      }
      return false;
    }

    // If expiration is confirmed, limit further checking
    if (this.expirationConfirmed) {
      this.expirationConfirmationCount++;
      console.log(`🔍 Expiration confirmed check #${this.expirationConfirmationCount} (max 3)`);

      // Only verify 2-3 times after initial confirmation
      if (this.expirationConfirmationCount >= 3) {
        console.log("✅ Expiration fully confirmed - stopping further checks");
        return true;
      }
    } else {
      // First time detecting expiration
      console.log("🚨 TRIAL EXPIRATION DETECTED - Triggering callbacks");
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
    console.log("🔄 Expiration confirmation reset");
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

    // Stop development logging if running
    this.stopDevelopmentLogging();

    // Reset expiration tracking
    this.expirationConfirmed = false;
    this.expirationConfirmationCount = 0;

    console.log("🔄 TRIAL RESET - Development logging stopped");
  }

  /**
   * End trial manually (when user purchases license)
   */
  endTrial(): void {
    // Keep the trial data but mark it as used
    // This prevents starting another trial
    localStorage.setItem(TrialService.TRIAL_USED_KEY, "true");

    // Stop development logging if running
    this.stopDevelopmentLogging();

    // Trigger expiration callbacks since trial ended
    this.triggerExpirationCallbacks();

    console.log("🛑 TRIAL ENDED - Development logging stopped - Expiration callbacks triggered");
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
    console.log("🚨 TRIGGERING TRIAL EXPIRATION CALLBACKS");
    this.expirationCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error("Error in expiration callback:", error);
      }
    });
  }
}

export const trialService = TrialService.getInstance();
