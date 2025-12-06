// ============================================
// LOCAL PASSWORD VAULT TYPES
// ============================================

/**
 * Entry type - password entry or secure note
 */
export type EntryType = "password" | "secure_note";

/**
 * Password history item for tracking previous passwords
 */
export interface PasswordHistoryItem {
  password: string;
  changedAt: Date;
}

/**
 * Custom field for user-defined data
 */
export interface CustomField {
  id: string;
  label: string;
  value: string;
  isSecret?: boolean; // If true, value is hidden by default (like a password)
}

/**
 * Main password entry interface
 */
export interface PasswordEntry {
  id: string;
  entryType?: EntryType; // defaults to "password" for backwards compatibility
  accountName: string;
  username: string;
  password: string;
  website?: string;
  notes?: string;
  balance?: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  isFavorite?: boolean;
  lastPasswordChange?: Date;
  passwordHistory?: PasswordHistoryItem[]; // Previous passwords
  totpSecret?: string; // 2FA TOTP secret key (Base32 encoded)
  customFields?: CustomField[]; // User-defined fields
}

/**
 * Category for organizing entries
 */
export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

/**
 * Raw entry as loaded from JSON storage (dates are strings before conversion)
 * Use with parseRawEntry() to convert to PasswordEntry
 */
export type RawPasswordEntry = Record<string, unknown> & {
  id: string;
  accountName: string;
  username: string;
  password: string;
  category: string;
  createdAt: string;
  updatedAt: string;
};

// ============================================
// LICENSE & TRIAL TYPES
// ============================================

export interface LicenseInfo {
  licenseKey: string;
  planType: "personal" | "family" | "trial";
  isValid: boolean;
  activatedAt?: Date;
  expiresAt?: Date;
}

export interface TrialInfo {
  isActive: boolean;
  isExpired: boolean;
  daysRemaining: number;
  hoursRemaining?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface AppLicenseStatus {
  canUseApp: boolean;
  requiresPurchase: boolean;
  licenseInfo: LicenseInfo | null;
  trialInfo: TrialInfo;
}

// ============================================
// UTILITY TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface FormState<T> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isDirty: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// ============================================
// COMPONENT PROP TYPES
// ============================================

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export interface FormFieldProps extends BaseComponentProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

// ============================================
// VAULT SETTINGS
// ============================================

export interface VaultSettings {
  autoLockTimeout: number; // minutes
  clipboardClearTimeout: number; // seconds
  showPasswordsDefault: boolean;
  soundEffectsEnabled: boolean;
}
