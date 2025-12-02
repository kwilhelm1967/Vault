/**
 * Utilities Index
 * 
 * Centralized exports for all utility functions.
 * 
 * Usage:
 *   import { storageService, validateEmail } from '@/utils';
 */

// ==================== Core Services ====================
export { storageService, StorageService } from './storage';
export { licenseService } from './licenseService';
export { trialService } from './trialService';

// ==================== Validation ====================
export {
  sanitizeInput,
  escapeHtml,
  validateMasterPassword,
  validateLicenseKey,
  validateEmail,
  validateUrl,
  validateAccountName,
  validateUsername,
  validateNotes,
} from './validation';

// ==================== Security ====================
export { generateHardwareFingerprint } from './hardwareFingerprint';
export {
  SecureString,
  secureWipe,
  createSecureString,
  secureCompare,
} from './memorySecurity';
export { sanitizeHtml, sanitizeFilename } from './sanitization';

// ==================== Authentication ====================
export {
  generateTOTP,
  getTOTPTimeRemaining,
  isValidTOTPSecret,
} from './totp';
export {
  generateRecoveryPhrase,
  verifyRecoveryPhrase,
  hashRecoveryPhrase,
} from './recoveryPhrase';

// ==================== License Keys ====================
export {
  singleUserLicenses,
  familyLicenses,
  type LicenseKey,
  type LicenseType,
} from './licenseKeys';

// ==================== Import/Export ====================
export { importService } from './importService';

// ==================== Sound Effects ====================
export {
  playSound,
  playSoundEffect,
  SoundEffect,
} from './soundEffects';

// ==================== Analytics (Dev Only) ====================
export { analyticsService } from './analyticsService';

