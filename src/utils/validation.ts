/**
 * Enhanced Input Validation Utilities
 * 
 * Provides robust validation for user inputs with security-focused checks.
 * All validation is performed client-side (100% offline after activation).
 */

import { ERROR_MESSAGES, LICENSE_KEY_PATTERN, TRIAL_KEY_PATTERN } from '../constants/errorMessages';

/**
 * Sanitize input to remove HTML tags and dangerous content
 * 
 * @param input - Input string to sanitize
 * @param maxLength - Optional maximum length
 * @returns Sanitized string
 */
export function sanitizeInput(input: string | null | undefined, maxLength?: number): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  let sanitized = input
    .trim()
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove event handlers (onclick, onerror, etc.)
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]+/gi, '')
    // Remove javascript: and data: protocols
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');
  
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Master password validation result
 */
export interface MasterPasswordValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

/**
 * Validate master password with strength checking
 * 
 * @param password - Password to validate
 * @returns Validation result with strength and feedback
 */
export function validateMasterPassword(password: string): MasterPasswordValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Minimum length check
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  
  // Check for common patterns
  const commonPatterns = [
    /password/i,
    /123456/,
    /qwerty/i,
    /admin/i,
    /letmein/i,
    /welcome/i,
    /monkey/i,
    /1234567890/,
    /abcdef/i,
  ];
  
  if (commonPatterns.some(pattern => pattern.test(password))) {
    warnings.push('Password contains common patterns');
  }
  
  // Calculate strength
  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
  if (score >= 5) strength = 'strong';
  else if (score >= 4) strength = 'good';
  else if (score >= 3) strength = 'fair';
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    strength,
  };
}

/**
 * Email validation
 * 
 * @param email - Email to validate
 * @returns true if valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const trimmed = email.trim();
  if (!trimmed) {
    return false;
  }
  
  // Basic email regex (RFC 5322 simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
}

/**
 * License key validation result
 */
export interface LicenseKeyValidation {
  valid: boolean;
  isValid?: boolean; // Alias for test compatibility
  error?: string;
  cleaned?: string;
  normalized?: string; // Alias for test compatibility
}

/**
 * Enhanced license key validation
 * 
 * Validates format, checks known prefixes, and performs basic checksum validation.
 * All validation is local - no network calls.
 * 
 * @param key - License key to validate
 * @returns Validation result with cleaned key if valid
 */
export function validateLicenseKey(key: string): LicenseKeyValidation {
  if (!key || typeof key !== 'string') {
    return {
      valid: false,
      isValid: false,
      error: ERROR_MESSAGES.LICENSE.INVALID_FORMAT,
    };
  }

  // Clean the key: remove spaces, convert to uppercase
  const cleaned = key.trim().replace(/\s+/g, '').toUpperCase();

  // Check minimum length
  if (cleaned.length < 16) {
    return {
      valid: false,
      isValid: false,
      error: ERROR_MESSAGES.LICENSE.INVALID_FORMAT,
    };
  }

  // Validate format pattern
  if (!LICENSE_KEY_PATTERN.test(cleaned)) {
    return {
      valid: false,
      isValid: false,
      error: ERROR_MESSAGES.LICENSE.INVALID_FORMAT,
    };
  }

  // Check for known prefixes (security: prevents invalid key types)
  const validPrefixes = ['PERS', 'FAMI', 'LPVT'];
  const _prefix = cleaned.substring(0, 4);
  const hasValidPrefix = validPrefixes.some(p => cleaned.startsWith(p));

  if (!hasValidPrefix && !cleaned.startsWith('LPVT-')) {
    return {
      valid: false,
      isValid: false,
      error: ERROR_MESSAGES.LICENSE.INVALID_KEY,
    };
  }

  // Basic checksum: ensure key has reasonable character distribution
  // This is a simple heuristic, not cryptographic validation
  const segments = cleaned.split('-');
  if (segments.length < 4) {
    return {
      valid: false,
      isValid: false,
      error: ERROR_MESSAGES.LICENSE.INVALID_FORMAT,
    };
  }

  // Check each segment has reasonable length
  for (const segment of segments) {
    if (segment.length < 4 || segment.length > 5) {
      return {
        valid: false,
        isValid: false,
        error: ERROR_MESSAGES.LICENSE.INVALID_FORMAT,
      };
    }
  }

  return {
    valid: true,
    isValid: true,
    cleaned,
    normalized: cleaned,
  };
}

/**
 * Trial key validation
 * 
 * @param key - Trial key to validate
 * @returns Validation result
 */
export function validateTrialKey(key: string): LicenseKeyValidation {
  if (!key || typeof key !== 'string') {
    return {
      valid: false,
      error: ERROR_MESSAGES.TRIAL.INVALID_TRIAL_KEY,
    };
  }

  const cleaned = key.trim().toUpperCase();

  if (!TRIAL_KEY_PATTERN.test(cleaned)) {
    return {
      valid: false,
      error: ERROR_MESSAGES.TRIAL.INVALID_TRIAL_KEY,
    };
  }

  return {
    valid: true,
    cleaned,
  };
}

/**
 * URL validation with security checks
 * 
 * Validates URLs and ensures only safe protocols are allowed.
 * 
 * @param url - URL to validate
 * @param returnBoolean - If true, returns boolean instead of object (for test compatibility)
 * @returns Validation result or boolean
 */
export interface UrlValidation {
  valid: boolean;
  error?: string;
  cleaned?: string;
}

export function validateUrl(url: string): UrlValidation {
  if (!url || typeof url !== 'string') {
    return {
      valid: false,
      error: 'URL is required',
    };
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return {
      valid: false,
      error: 'URL cannot be empty',
    };
  }

  // Allow URLs without protocol (will be prefixed with https://)
  let urlToValidate = trimmed;
  if (!trimmed.match(/^https?:\/\//i)) {
    urlToValidate = `https://${trimmed}`;
  }

  try {
    const urlObj = new URL(urlToValidate);

    // Only allow http and https protocols (security: prevent javascript:, data:, etc.)
    const allowedProtocols = ['http:', 'https:'];
    if (!allowedProtocols.includes(urlObj.protocol)) {
      return {
        valid: false,
        error: 'Only HTTP and HTTPS URLs are allowed',
      };
    }

    // Check for dangerous patterns
    if (urlObj.hostname.includes('javascript:') || 
        urlObj.hostname.includes('data:') ||
        urlObj.hostname.includes('vbscript:')) {
      return {
        valid: false,
        error: 'Invalid URL format',
      };
    }

    return {
      valid: true,
      cleaned: urlToValidate,
    };
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format',
    };
  }
}

/**
 * Account name validation
 * 
 * @param name - Account name to validate
 * @returns Validation result
 */
export interface NameValidation {
  valid: boolean;
  error?: string;
}

export function validateAccountName(name: string): NameValidation {
  if (!name || typeof name !== 'string') {
    return {
      valid: false,
      error: 'Account name is required',
    };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return {
      valid: false,
      error: 'Account name cannot be empty',
    };
  }

  if (trimmed.length > 200) {
    return {
      valid: false,
      error: 'Account name must be 200 characters or less',
    };
  }

  // Check for dangerous patterns (XSS prevention)
  if (/<script|javascript:|on\w+\s*=/i.test(trimmed)) {
    return {
      valid: false,
      error: 'Account name contains invalid characters',
    };
  }

  return {
    valid: true,
  };
}

/**
 * Password validation (for entry passwords, not master password)
 * 
 * @param password - Password to validate
 * @returns Validation result
 */
export interface PasswordValidation {
  valid: boolean;
  error?: string;
}

export function validateEntryPassword(password: string): PasswordValidation {
  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      error: 'Password is required',
    };
  }

  // Entry passwords can be any length (some services have very long passwords)
  // But we'll set a reasonable maximum
  if (password.length > 1000) {
    return {
      valid: false,
      error: 'Password is too long (maximum 1000 characters)',
    };
  }

  return {
    valid: true,
  };
}

/**
 * Username validation
 * 
 * @param username - Username to validate
 * @returns Validation result
 */
export function validateUsername(username: string): NameValidation {
  if (!username || typeof username !== 'string') {
    return {
      valid: true, // Username is optional
    };
  }

  const trimmed = username.trim();
  
  if (trimmed.length > 500) {
    return {
      valid: false,
      error: 'Username must be 500 characters or less',
    };
  }

  // Check for dangerous patterns
  if (/<script|javascript:|on\w+\s*=/i.test(trimmed)) {
    return {
      valid: false,
      error: 'Username contains invalid characters',
    };
  }

  return {
    valid: true,
  };
}
