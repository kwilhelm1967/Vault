/**
 * Mobile Service
 * 
 * Handles mobile companion app functionality including:
 * - View-only mobile access
 * - QR code generation for mobile access
 * - Mobile session management
 */

export interface MobileAccessToken {
  token: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  permissions: 'view-only' | 'full';
  deviceInfo?: string;
}

export interface MobileSession {
  token: string;
  deviceName: string;
  lastAccess: Date;
  isActive: boolean;
}

const MOBILE_TOKENS_KEY = "lpv_mobile_tokens";

class MobileService {
  private static instance: MobileService;
  private activeTokens: MobileAccessToken[] = [];

  static getInstance(): MobileService {
    if (!MobileService.instance) {
      MobileService.instance = new MobileService();
    }
    return MobileService.instance;
  }

  /**
   * Generate a mobile access token
   */
  async generateAccessToken(
    durationHours: number = 24,
    permissions: 'view-only' | 'full' = 'view-only',
    deviceInfo?: string
  ): Promise<MobileAccessToken> {
    const token = this.generateSecureToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

    const accessToken: MobileAccessToken = {
      token,
      createdAt: now,
      expiresAt,
      isActive: true,
      permissions,
      deviceInfo,
    };

    this.activeTokens.push(accessToken);
    await this.saveTokens();

    return accessToken;
  }

  /**
   * Validate a mobile access token
   */
  validateToken(token: string): { valid: boolean; permissions?: 'view-only' | 'full'; error?: string } {
    const accessToken = this.activeTokens.find(
      t => t.token === token && t.isActive && new Date() < t.expiresAt
    );

    if (!accessToken) {
      return { valid: false, error: 'Invalid or expired token' };
    }

    return {
      valid: true,
      permissions: accessToken.permissions,
    };
  }

  /**
   * Revoke a mobile access token
   */
  async revokeToken(token: string): Promise<boolean> {
    const accessToken = this.activeTokens.find(t => t.token === token);
    if (!accessToken) return false;

    accessToken.isActive = false;
    await this.saveTokens();
    return true;
  }

  /**
   * Get all active tokens
   */
  getActiveTokens(): MobileAccessToken[] {
    const now = new Date();
    return this.activeTokens.filter(
      t => t.isActive && now < t.expiresAt
    );
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();
    let cleaned = false;

    this.activeTokens = this.activeTokens.map(token => {
      if (now >= token.expiresAt && token.isActive) {
        token.isActive = false;
        cleaned = true;
      }
      return token;
    });

    if (cleaned) {
      await this.saveTokens();
    }
  }

  /**
   * Generate QR code data for mobile access
   */
  generateQRCodeData(token: string): string {
    const baseUrl = window.location.origin;
    const mobileUrl = `${baseUrl}/mobile?token=${token}`;
    
    return JSON.stringify({
      type: 'mobile-access',
      app: 'LocalPasswordVault',
      url: mobileUrl,
      token,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check if current device is mobile
   */
  isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  /**
   * Get device information
   */
  getDeviceInfo(): string {
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) return 'Android';
    if (/Windows Phone/i.test(ua)) return 'Windows Phone';
    return 'Unknown Device';
  }

  /**
   * Generate secure random token
   */
  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Save tokens to localStorage
   */
  private async saveTokens(): Promise<void> {
    try {
      const tokensToSave = this.activeTokens.map(token => ({
        ...token,
        createdAt: token.createdAt.toISOString(),
        expiresAt: token.expiresAt.toISOString(),
      }));
      localStorage.setItem(MOBILE_TOKENS_KEY, JSON.stringify(tokensToSave));
    } catch (error) {
      console.error("Failed to save mobile tokens:", error);
    }
  }

  /**
   * Load tokens from localStorage
   */
  async loadTokens(): Promise<void> {
    try {
      const stored = localStorage.getItem(MOBILE_TOKENS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.activeTokens = parsed.map((token: any) => ({
          ...token,
          createdAt: new Date(token.createdAt),
          expiresAt: new Date(token.expiresAt),
        }));
        await this.cleanupExpiredTokens();
      } else {
        this.activeTokens = [];
      }
    } catch (error) {
      console.error("Failed to load mobile tokens:", error);
      this.activeTokens = [];
    }
  }
}

export const mobileService = MobileService.getInstance();

