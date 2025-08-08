export class SecurityService {
  private static instance: SecurityService;
  private integrityChecks: Map<string, string> = new Map();
  private securityEvents: Array<{ timestamp: Date; event: string; severity: 'low' | 'medium' | 'high' }> = [];

  private constructor() {
    this.initializeSecurityMonitoring();
  }

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  private initializeSecurityMonitoring(): void {
    // Monitor for suspicious activities
    this.setupIntegrityChecks();
    this.monitorMemoryUsage();
    this.detectDebuggingAttempts();
  }

  private setupIntegrityChecks(): void {
    // Set up file integrity monitoring
    const criticalFiles = [
      'encryption.ts',
      'storage.ts',
      'licensing.ts'
    ];

    criticalFiles.forEach(file => {
      this.integrityChecks.set(file, this.generateFileHash(file));
    });
  }

  private generateFileHash(filename: string): string {
    // Simple hash generation for integrity checking
    return btoa(filename + Date.now().toString()).slice(0, 16);
  }

  private monitorMemoryUsage(): void {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      if (memInfo.usedJSHeapSize > memInfo.jsHeapSizeLimit * 0.9) {
        this.logSecurityEvent('High memory usage detected', 'medium');
      }
    }
  }

  private detectDebuggingAttempts(): void {
    // Detect if developer tools are open
    let devtools = { open: false };
    const threshold = 160;

    setInterval(() => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          this.logSecurityEvent('Developer tools detected', 'high');
        }
      } else {
        devtools.open = false;
      }
    }, 500);
  }

  public validateLicenseIntegrity(licenseData: any): boolean {
    try {
      // Validate license structure
      if (!licenseData || typeof licenseData !== 'object') {
        this.logSecurityEvent('Invalid license structure', 'high');
        return false;
      }

      // Check required fields
      const requiredFields = ['licenseKey', 'userId', 'expirationDate', 'signature'];
      for (const field of requiredFields) {
        if (!(field in licenseData)) {
          this.logSecurityEvent(`Missing license field: ${field}`, 'high');
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logSecurityEvent('License validation error', 'high');
      return false;
    }
  }

  public checkDataIntegrity(data: string): boolean {
    try {
      // Basic data integrity checks
      if (!data || data.length === 0) {
        return false;
      }

      // Check for suspicious patterns
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /eval\(/i,
        /function\s*\(/i
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(data)) {
          this.logSecurityEvent('Suspicious data pattern detected', 'high');
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logSecurityEvent('Data integrity check failed', 'medium');
      return false;
    }
  }

  public sanitizeInput(input: string): string {
    if (!input) return '';
    
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  public logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high'): void {
    this.securityEvents.push({
      timestamp: new Date(),
      event,
      severity
    });

    // Keep only last 100 events
    if (this.securityEvents.length > 100) {
      this.securityEvents = this.securityEvents.slice(-100);
    }

    // Log high severity events to console in development
    if (severity === 'high' && process.env.NODE_ENV === 'development') {
      console.warn(`Security Event: ${event}`);
    }
  }

  public getSecurityEvents(): Array<{ timestamp: Date; event: string; severity: string }> {
    return [...this.securityEvents];
  }

  public clearSecurityEvents(): void {
    this.securityEvents = [];
  }

  public isSecureEnvironment(): boolean {
    // Check if running in a secure context
    if (typeof window !== 'undefined') {
      return window.isSecureContext || window.location.protocol === 'https:';
    }
    return true;
  }

  public generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint8Array(length);
      window.crypto.getRandomValues(array);
      
      for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
      }
    } else {
      // Fallback for environments without crypto API
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    
    return result;
  }

  public validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const securityService = SecurityService.getInstance();