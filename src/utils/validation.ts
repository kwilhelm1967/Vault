/**
 * Enhanced Input Validation Utilities
 * 
 * Provides robust validation for user inputs with security-focused checks.
 * All validation is performed client-side (100% offline after activation).
 */

import { ERROR_MESSAGES, LICENSE_KEY_PATTERN, TRIAL_KEY_PATTERN } from '../constants/errorMessages';

/**
 * License key validation result
 */
export interface LicenseKeyValidation {
  valid: boolean;
  error?: string;
  cleaned?: string;
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
      error: ERROR_MESSAGES.LICENSE.INVALID_FORMAT,
    };
  }

  // Clean the key: remove spaces, convert to uppercase
  const cleaned = key.trim().replace(/\s+/g, '').toUpperCase();

  // Check minimum length
  if (cleaned.length < 16) {
    return {
      valid: false,
      error: ERROR_MESSAGES.LICENSE.INVALID_FORMAT,
    };
  }

  // Validate format pattern
  if (!LICENSE_KEY_PATTERN.test(cleaned)) {
    return {
      valid: false,
      error: ERROR_MESSAGES.LICENSE.INVALID_FORMAT,
    };
  }

  // Check for known prefixes (security: prevents invalid key types)
  const validPrefixes = ['PERS', 'FAMI', 'LLV_', 'TRIAL', 'TRIA'];
  const prefix = cleaned.substring(0, 4);
  const hasValidPrefix = validPrefixes.some(p => cleaned.startsWith(p));

  if (!hasValidPrefix && !cleaned.startsWith('TRIA-')) {
    return {
      valid: false,
      error: ERROR_MESSAGES.LICENSE.INVALID_KEY,
    };
  }

  // Basic checksum: ensure key has reasonable character distribution
  // This is a simple heuristic, not cryptographic validation
  const segments = cleaned.split('-');
  if (segments.length < 4) {
    return {
      valid: false,
      error: ERROR_MESSAGES.LICENSE.INVALID_FORMAT,
    };
  }

  // Check each segment has reasonable length
  for (const segment of segments) {
    if (segment.length < 4 || segment.length > 5) {
      return {
        valid: false,
        error: ERROR_MESSAGES.LICENSE.INVALID_FORMAT,
      };
    }
  }

  return {
    valid: true,
    cleaned,
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
 * @returns Validation result
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
