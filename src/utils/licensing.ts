// Hardware fingerprinting and licensing system
class LicensingService {
  private static instance: LicensingService;
  private licenseKey: string | null = null;
  private hardwareId: string | null = null;

  static getInstance(): LicensingService {
    if (!LicensingService.instance) {
      LicensingService.instance = new LicensingService();
    }
    return LicensingService.instance;
  }

  // Generate a hardware fingerprint based on available system info
  async generateHardwareFingerprint(): Promise<string> {
    const components = [];
    
    // Screen resolution
    components.push(`${screen.width}x${screen.height}`);
    
    // Timezone
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    // Language
    components.push(navigator.language);
    
    // Platform
    components.push(navigator.platform);
    
    // User agent (partial)
    components.push(navigator.userAgent.slice(0, 50));
    
    // Available fonts (limited check)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = '14px Arial';
      components.push(ctx.measureText('Hardware fingerprint').width.toString());
    }
    
    // WebGL renderer info
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
      }
    } catch (e) {
      // Ignore WebGL errors
    }
    
    // CPU cores
    components.push(navigator.hardwareConcurrency?.toString() || 'unknown');
    
    // Memory (if available)
    if ('memory' in performance) {
      components.push((performance as any).memory.jsHeapSizeLimit.toString());
    }
    
    // Create hash from components
    const fingerprint = components.join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }

  // Validate license key format and checksum
  validateLicenseFormat(licenseKey: string): boolean {
    // Expected format: XXXX-XXXX-XXXX-XXXX (16 chars + 3 dashes)
    const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!pattern.test(licenseKey)) {
      return false;
    }
    
    // Simple checksum validation
    const cleanKey = licenseKey.replace(/-/g, '');
    let checksum = 0;
    for (let i = 0; i < cleanKey.length - 1; i++) {
      checksum += cleanKey.charCodeAt(i);
    }
    const expectedChecksum = (checksum % 36).toString(36).toUpperCase();
    return cleanKey[cleanKey.length - 1] === expectedChecksum;
  }

  // Check if license is bound to current hardware
  async isLicenseValidForHardware(licenseKey: string): Promise<boolean> {
    const currentHardwareId = await this.generateHardwareFingerprint();
    const storedBinding = localStorage.getItem(`license_binding_${licenseKey}`);
    
    if (!storedBinding) {
      // First time activation - bind to current hardware
      localStorage.setItem(`license_binding_${licenseKey}`, currentHardwareId);
      return true;
    }
    
    return storedBinding === currentHardwareId;
  }

  // Activate license
  async activateLicense(licenseKey: string): Promise<{ success: boolean; error?: string }> {
    // Validate format
    if (!this.validateLicenseFormat(licenseKey)) {
      return { success: false, error: 'Invalid license key format' };
    }

    // Check hardware binding
    const isValidForHardware = await this.isLicenseValidForHardware(licenseKey);
    if (!isValidForHardware) {
      return { 
        success: false, 
        error: 'This license is already activated on another device. Please contact support for assistance.' 
      };
    }

    // Store license
    localStorage.setItem('app_license_key', licenseKey);
    localStorage.setItem('license_activated_at', new Date().toISOString());
    this.licenseKey = licenseKey;
    
    return { success: true };
  }

  // Check if app is licensed
  async isLicensed(): Promise<boolean> {
    const storedLicense = localStorage.getItem('app_license_key');
    if (!storedLicense) {
      return false;
    }

    // Validate stored license
    if (!this.validateLicenseFormat(storedLicense)) {
      return false;
    }

    // Check hardware binding
    const isValidForHardware = await this.isLicenseValidForHardware(storedLicense);
    if (!isValidForHardware) {
      // License was moved to different hardware
      this.revokeLicense();
      return false;
    }

    this.licenseKey = storedLicense;
    return true;
  }

  // Get trial info
  getTrialInfo(): { isTrialActive: boolean; daysRemaining: number; isExpired: boolean } {
    const trialStart = localStorage.getItem('trial_start_date');
    const trialDays = 7; // 7-day trial
    
    if (!trialStart) {
      // Start trial
      localStorage.setItem('trial_start_date', new Date().toISOString());
      return { isTrialActive: true, daysRemaining: trialDays, isExpired: false };
    }

    const startDate = new Date(trialStart);
    const now = new Date();
    const daysPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, trialDays - daysPassed);
    
    return {
      isTrialActive: daysRemaining > 0,
      daysRemaining,
      isExpired: daysRemaining === 0
    };
  }

  // Revoke license
  revokeLicense(): void {
    localStorage.removeItem('app_license_key');
    localStorage.removeItem('license_activated_at');
    this.licenseKey = null;
  }

  // Get current license key
  getCurrentLicense(): string | null {
    return this.licenseKey;
  }

  // Check if user has premium features
  hasPremiumFeatures(): boolean {
    return this.licenseKey !== null;
  }

  // Get feature limits based on license status
  getFeatureLimits(): {
    maxEntries: number;
    maxCategories: number;
    canExport: boolean;
    canImport: boolean;
    hasCloudSync: boolean;
    hasAdvancedSecurity: boolean;
    canUseFloatingPanel: boolean;
  } {
    const isPremium = this.hasPremiumFeatures();
    
    return {
      maxEntries: isPremium ? -1 : 25, // -1 = unlimited, 25 for free
      maxCategories: isPremium ? -1 : 6, // Default categories only for free
      canExport: isPremium,
      canImport: isPremium,
      hasCloudSync: false, // NEVER enable cloud sync
      hasAdvancedSecurity: isPremium,
      canUseFloatingPanel: true // Available to all users
    };
  }

  // Generate a demo license key (for testing)
  generateDemoLicense(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 15; i++) {
      if (i > 0 && i % 4 === 0) {
        result += '-';
      }
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Add checksum
    let checksum = 0;
    const cleanKey = result.replace(/-/g, '');
    for (let i = 0; i < cleanKey.length; i++) {
      checksum += cleanKey.charCodeAt(i);
    }
    result += (checksum % 36).toString(36).toUpperCase();
    
    return result;
  }
}

export const licensingService = LicensingService.getInstance();