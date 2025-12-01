// User Preferences Service for Local Password Vault

export interface UserPreferences {
  autoLockInterval: number; // minutes, 0 = disabled
  showPasswordStrength: boolean;
  defaultPasswordLength: number;
  includeSymbols: boolean;
  includeNumbers: boolean;
  includeUppercase: boolean;
  includeLowercase: boolean;
  clipboardClearTime: number; // seconds, 0 = disabled
  theme: 'dark' | 'light';
}

const DEFAULT_PREFERENCES: UserPreferences = {
  autoLockInterval: 5,
  showPasswordStrength: true,
  defaultPasswordLength: 16,
  includeSymbols: true,
  includeNumbers: true,
  includeUppercase: true,
  includeLowercase: true,
  clipboardClearTime: 30,
  theme: 'dark',
};

const STORAGE_KEY = 'lpv_user_preferences';

class PreferencesService {
  private preferences: UserPreferences = { ...DEFAULT_PREFERENCES };

  async loadPreferences(): Promise<UserPreferences> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.preferences = { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      this.preferences = { ...DEFAULT_PREFERENCES };
    }
    return this.preferences;
  }

  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  async updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...updates };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save preferences:', error);
      throw error;
    }
  }

  async resetToDefaults(): Promise<void> {
    this.preferences = { ...DEFAULT_PREFERENCES };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
  }
}

export const preferencesService = new PreferencesService();



