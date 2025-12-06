/**
 * Utilities Index - Local Password Vault
 *
 * Centralized exports for all utility functions.
 *
 * Usage:
 *   import { storageService, validateLicenseKey } from './utils';
 */

// ==================== Storage & Encryption ====================
export { storageService, StorageService } from './storage';
export { memorySecurity, secureWipe, secureCompare } from './memorySecurity';

// ==================== Validation & Sanitization ====================
export {
  sanitizeInput,
  sanitizeTextField,
  sanitizePassword,
  sanitizeNotes,
  validateEmail,
  validateLicenseKey,
  formatLicenseKey,
} from './validation';
export { sanitizeTextField as sanitize } from './sanitization';

// ==================== License & Trial ====================
export { licenseService } from './licenseService';
export { trialService } from './trialService';
export { 
  SINGLE_USER_LICENSES, 
  FAMILY_LICENSES, 
  isValidLicenseKey,
  getLicenseType 
} from './licenseKeys';

// ==================== Authentication ====================
export { generateRecoveryPhrase, verifyRecoveryPhrase, storeRecoveryPhrase } from './recoveryPhrase';
export { generateLPVHardwareFingerprint } from './deviceFingerprint';
export { generateHardwareFingerprint } from './hardwareFingerprint';

// ==================== 2FA / TOTP ====================
export { generateTOTP, getTimeRemaining, isValidTOTPSecret } from './totp';

// ==================== Import/Export ====================
export { importService } from './importService';

// ==================== Mobile ====================
export { mobileService } from './mobileService';

// ==================== Sound Effects ====================
export { 
  playLockSound, 
  playCopySound, 
  playDeleteSound,
  playSuccessSound,
  playErrorSound 
} from './soundEffects';

// ==================== Error Handling ====================
export { 
  ErrorHandler, 
  useErrorHandler, 
  withErrorHandling, 
  withRetry,
  AppError, 
  ValidationError,
  NetworkError,
  StorageError,
  AuthenticationError
} from './errorHandling';

// ==================== Analytics (placeholder) ====================
export { analyticsService } from './analyticsService';

// ==================== Development Logging ====================
export { devLog, devWarn, devError, devLogLabeled, devLogIf } from './devLog';

// ==================== Safe Utilities ====================
export { 
  safeParseJSON, 
  safeGetLocalStorage, 
  safeSetLocalStorage, 
  safeParseJWT,
  safeGet 
} from './safeUtils';
