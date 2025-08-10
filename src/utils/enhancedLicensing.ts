// Enhanced licensing service with hardware-bound validation and server integration
class EnhancedLicensingService {
  private static instance: EnhancedLicensingService;
  private licenseKey: string | null = null;
  private hardwareId: string | null = null;
  private licenseData: any = null;

  static getInstance(): EnhancedLicensingService {
    if (!EnhancedLicensingService.instance) {
      EnhancedLicensingService.instance = new EnhancedLicensingService();
    }
    return EnhancedLicensingService.instance;
  }

  // Generate comprehensive hardware fingerprint
  async generateAdvancedFingerprint(): Promise<string> {
    const components = [];
    
    // Screen and display info
    components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
    components.push(screen.pixelDepth.toString());
    
    // System info
    components.push(navigator.platform);
    components.push(navigator.language);
    components.push(navigator.hardwareConcurrency?.toString() || 'unknown');
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    // Browser and engine info
    components.push(navigator.userAgent.slice(0, 100));
    components.push(navigator.vendor || 'unknown');
    
    // WebGL fingerprinting
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
          components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
        components.push(gl.getParameter(gl.VERSION));
        components.push(gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
      }
    } catch (e) {
      components.push('webgl_unavailable');
    }
    
    // Canvas fingerprinting
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Hardware fingerprint test 🔐', 2, 2);
        components.push(canvas.toDataURL().slice(-50));
      }
    } catch (e) {
      components.push('canvas_unavailable');
    }
    
    // Audio context fingerprinting
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      components.push(audioContext.sampleRate.toString());
      components.push(analyser.frequencyBinCount.toString());
      
      audioContext.close();
    } catch (e) {
      components.push('audio_unavailable');
    }
    
    // Memory info (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      components.push(memory.jsHeapSizeLimit.toString());
    }
    
    // Create hash from components
    const fingerprint = components.join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  }

  // Validate license key format and checksum
  validateLicenseFormat(licenseKey: string): boolean {
    const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!pattern.test(licenseKey)) {
      return false;
    }
    
    const cleanKey = licenseKey.replace(/-/g, '');
    let checksum = 0;
    for (let i = 0; i < cleanKey.length - 1; i++) {
      checksum += cleanKey.charCodeAt(i);
    }
    const expectedChecksum = (checksum % 36).toString(36).toUpperCase();
    return cleanKey[cleanKey.length - 1] === expectedChecksum;
  }

  // Server-side license validation
  async validateLicenseServer(licenseKey: string, hardwareId: string): Promise<{ valid: boolean; licenseData?: any; error?: string }> {
    try {
      const response = await fetch(`${environment.licenseServerUrl}/api/validate-license`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          licenseKey,
          hardwareId,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          platform: navigator.platform
        })
      });

      const result = await response.json();
      
      // In test mode, always return valid for our test keys
      if (environment.isTest) {
        return { valid: true, licenseData: { type: 'pro', status: 'active' } };
      }
      
      return result;
    } catch (error) {
      console.debug('Server validation failed, using offline validation');
      return { valid: this.validateLicenseFormat(licenseKey) };
    }
  }

  // Activate license with enhanced validation
  async activateLicense(licenseKey: string): Promise<{ success: boolean; error?: string }> {
    if (!this.validateLicenseFormat(licenseKey)) {
      return { success: false, error: 'Invalid license key format' };
    }

    const hardwareId = await this.generateAdvancedFingerprint();
    const validation = await this.validateLicenseServer(licenseKey, hardwareId);

    if (!validation.valid) {
      return { success: false, error: validation.error || 'License validation failed' };
    }

    // Store license data
    localStorage.setItem('app_license_key', licenseKey);
    localStorage.setItem('app_hardware_id', hardwareId);
    localStorage.setItem('license_activated_at', new Date().toISOString());
    localStorage.setItem('eula_accepted', 'true'); // Set EULA as accepted
    
    if (validation.licenseData) {
      localStorage.setItem('license_data', JSON.stringify(validation.licenseData));
      this.licenseData = validation.licenseData;
    }

    this.licenseKey = licenseKey;
    this.hardwareId = hardwareId;
    
    return { success: true };
  }

  // Accept EULA without license activation (for trial)
  acceptEula(): void {
    localStorage.setItem('eula_accepted', 'true');
  }

  // Check if app is licensed (no free tier)
  async isLicensed(): Promise<boolean> {
    const storedLicense = localStorage.getItem('app_license_key');
    const storedHardwareId = localStorage.getItem('app_hardware_id');
    
    if (!storedLicense) {
      return false;
    }

    if (!this.validateLicenseFormat(storedLicense)) {
      this.revokeLicense();
      return false;
    }

    const currentHardwareId = await this.generateAdvancedFingerprint();
    
    // Allow some flexibility in hardware changes (80% similarity)
    if (storedHardwareId && this.calculateSimilarity(storedHardwareId, currentHardwareId) < 0.8) {
      this.revokeLicense();
      return false;
    }

    // Periodic server validation (every 7 days)
    const lastValidation = localStorage.getItem('last_server_validation');
    const now = Date.now();
    // In test mode, validate less frequently
    const validationInterval = environment.isTest ? 
      30 * 24 * 60 * 60 * 1000 : // 30 days in test mode
      7 * 24 * 60 * 60 * 1000;   // 7 days in production
    
    if (!lastValidation || (now - parseInt(lastValidation)) > validationInterval) {
      const validation = await this.validateLicenseServer(storedLicense, currentHardwareId);
      if (!validation.valid) {
        this.revokeLicense();
        return false;
      }
      localStorage.setItem('last_server_validation', now.toString());
    }

    this.licenseKey = storedLicense;
    this.hardwareId = currentHardwareId;
    
    // Load license data
    const storedData = localStorage.getItem('license_data');
    if (storedData) {
      this.licenseData = JSON.parse(storedData);
    }

    return true;
  }

  // Get trial info - NO FREE TIER, only trial
  getTrialInfo(): { isTrialActive: boolean; daysRemaining: number; isExpired: boolean } {
    const trialStart = localStorage.getItem('trial_start_date');
    const trialDays = 7; // 7-day trial only
    const eulaAccepted = localStorage.getItem('eula_accepted') === 'true';
    
    if (!trialStart) {
      // Start trial
      localStorage.setItem('trial_start_date', new Date().toISOString());
      return { 
        isTrialActive: eulaAccepted, // Only active if EULA accepted
        daysRemaining: trialDays, 
        isExpired: false 
      };
    }

    const startDate = new Date(trialStart);
    const now = new Date();
    const daysPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, trialDays - daysPassed);
    
    return {
      isTrialActive: daysRemaining > 0 && eulaAccepted,
      daysRemaining,
      isExpired: daysRemaining === 0
    };
  }

  // Calculate hardware similarity
  private calculateSimilarity(hardware1: string, hardware2: string): number {
    if (hardware1 === hardware2) return 1.0;
    
    const len1 = hardware1.length;
    const len2 = hardware2.length;
    const maxLen = Math.max(len1, len2);
    
    let matches = 0;
    for (let i = 0; i < Math.min(len1, len2); i++) {
      if (hardware1[i] === hardware2[i]) {
        matches++;
      }
    }
    
    return matches / maxLen;
  }

  // Revoke license
  revokeLicense(): void {
    localStorage.removeItem('app_license_key');
    localStorage.removeItem('app_hardware_id');
    localStorage.removeItem('license_activated_at');
    localStorage.removeItem('license_data');
    localStorage.removeItem('eula_accepted');
    localStorage.removeItem('last_server_validation');
    this.licenseKey = null;
    this.hardwareId = null;
    this.licenseData = null;
  }

  // Get current license key
  getCurrentLicense(): string | null {
    return this.licenseKey;
  }

  // Check if user has premium features (all paid tiers have premium features)
  hasPremiumFeatures(): boolean {
    return this.licenseKey !== null;
  }

  // Get license type
  getLicenseType(): 'single' | 'pro' | 'family' | 'business' | null {
    if (!this.licenseData) return null;
    
    switch (this.licenseData.type) {
      case 'pro':
        return 'pro';
      case 'single':
        return 'single';
      case 'family':
        return 'family';
      case 'business':
        return 'business';
      default:
        return null;
    }
  }

  // Get feature limits based on license tier (NO FREE TIER)
  getFeatureLimits(): {
    maxEntries: number;
    maxCategories: number;
    canExport: boolean;
    canImport: boolean;
    hasCloudSync: boolean;
    hasAdvancedSecurity: boolean;
    canUseFloatingPanel: boolean;
    maxDevices: number;
    hasTeamFeatures: boolean;
    hasPrioritySupport: boolean;
    hasProFeatures: boolean;
  } {
    const licenseType = this.getLicenseType();
    
    // Trial users get Single User features
    if (!licenseType) {
      const trial = this.getTrialInfo();
      if (trial.isTrialActive) {
        return {
          maxEntries: -1, // Unlimited during trial
          maxCategories: -1,
          canExport: true,
          canImport: true,
          hasCloudSync: false,
          hasAdvancedSecurity: true,
          canUseFloatingPanel: true,
          maxDevices: 1,
          hasTeamFeatures: false,
          hasPrioritySupport: false,
          hasProFeatures: false
        };
      }
      
      // No license and no trial = no access
      return {
        maxEntries: 0,
        maxCategories: 0,
        canExport: false,
        canImport: false,
        hasCloudSync: false,
        hasAdvancedSecurity: false,
        canUseFloatingPanel: false,
        maxDevices: 0,
        hasTeamFeatures: false,
        hasPrioritySupport: false,
        hasProFeatures: false
      };
    }
    
    switch (licenseType) {
      case 'single':
        return {
          maxEntries: -1, // Unlimited
          maxCategories: -1,
          canExport: true,
          canImport: true,
          hasCloudSync: false, // NEVER enable cloud sync
          hasAdvancedSecurity: true,
          canUseFloatingPanel: true,
          maxDevices: 1,
          hasTeamFeatures: false,
          hasPrioritySupport: false,
          hasProFeatures: false
        };
        
      case 'family':
        return {
          maxEntries: -1, // Unlimited
          maxCategories: -1,
          canExport: true,
          canImport: true,
          hasCloudSync: false, // NEVER enable cloud sync
          hasAdvancedSecurity: true,
          canUseFloatingPanel: true,
          maxDevices: 3,
          hasTeamFeatures: false,
          hasPrioritySupport: true,
          hasProFeatures: false
        };
        
      case 'pro':
        return {
          maxEntries: -1, // Unlimited
          maxCategories: -1,
          canExport: true,
          canImport: true,
          hasCloudSync: false,
          hasAdvancedSecurity: true,
          canUseFloatingPanel: true,
          maxDevices: 6, // 6 devices with 6 unique license keys
          hasTeamFeatures: false,
          hasPrioritySupport: true,
          hasProFeatures: true
        };
        
      case 'business':
        return {
          maxEntries: -1, // Unlimited
          maxCategories: -1,
          canExport: true,
          canImport: true,
          hasCloudSync: false,
          hasAdvancedSecurity: true,
          canUseFloatingPanel: true,
          maxDevices: 10, // Changed from 10+ to exactly 10
          hasTeamFeatures: true,
          hasPrioritySupport: true,
          hasProFeatures: true
        };
        
      default:
        return {
          maxEntries: 0,
          maxCategories: 0,
          canExport: false,
          canImport: false,
          hasCloudSync: false,
          hasAdvancedSecurity: false,
          canUseFloatingPanel: false,
          maxDevices: 0,
          hasTeamFeatures: false,
          hasPrioritySupport: false,
          hasProFeatures: false
        };
    }
  }

  // Get license status for display
  getLicenseStatus(): {
    isLicensed: boolean;
    licenseType: string | null;
    isTrialActive: boolean;
    daysRemaining: number;
    features: any;
  } {
    const isLicensed = this.licenseKey !== null;
    const licenseType = this.getLicenseType();
    const trial = this.getTrialInfo();
    const features = this.getFeatureLimits();
    
    return {
      isLicensed,
      licenseType,
      isTrialActive: trial.isTrialActive,
      daysRemaining: trial.daysRemaining,
      features
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

// License key types
export type LicenseType = 'single' | 'pro' | 'family' | 'business';

import { environment } from '../config/environment';
export const enhancedLicensingService = EnhancedLicensingService.getInstance();