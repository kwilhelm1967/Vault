/**
 * Utilities Index
 *
 * Centralized exports for all utility functions in the After I'm Gone application.
 *
 * Usage:
 *   import { storageService, validateEmail } from '@/utils';
 */

// ==================== Storage & Security ====================
export { storageService, StorageService } from './storage';
export { memorySecurity, secureWipe, secureCompare } from './memorySecurity';
export { clipboardSecurity, secureCopyToClipboard } from './clipboardSecurity';
export { hmacService } from './hmacService';

// ==================== Validation ====================
export {
  sanitizeInput,
  validateEmail,
  validatePassword,
  validatePhone,
  validateRequired,
  validateDate,
  validateSSN,
  validateURL
} from './validation';

// ==================== Encryption & Security ====================
export { generateHardwareFingerprint } from './hardwareFingerprint';

// ==================== Rate Limiting ====================
export { rateLimiter, RateLimitError } from './rateLimiter';

// ==================== Password Strength ====================
export { calculatePasswordStrength, PasswordStrength } from './passwordStrength';

// ==================== Import/Export ====================
export { importService } from './importService';

// ==================== Sound Effects ====================
export { playSound, playSoundEffect, SoundEffect } from './soundEffects';

// ==================== Re-export commonly used functions ====================
export { storageService as defaultStorage } from './storage';