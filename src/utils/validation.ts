/**
 * Input Validation Utilities
 * 
 * Comprehensive validation and sanitization for all user inputs.
 */

// ============================================
// SANITIZATION
// ============================================

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string | null | undefined, maxLength?: number): string {
  if (input === null || input === undefined) {
    return '';
  }

  let sanitized = String(input)
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove event handlers
    .replace(/on\w+\s*=/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove data: URLs (can contain scripts)
    .replace(/data:/gi, '')
    // Trim whitespace
    .trim();

  // Limit length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize for HTML display (escapes HTML entities)
 */
export function escapeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return input.replace(/[&<>"']/g, (char) => map[char]);
}

// ============================================
// PASSWORD VALIDATION
// ============================================

export interface PasswordValidationResult {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  score: number;
  errors: string[];
  warnings: string[];
}

const COMMON_PASSWORDS = [
  'password', '123456', 'qwerty', 'letmein', 'welcome',
  'admin', 'login', 'master', 'passw0rd', 'password1',
];

const COMMON_PATTERNS = [
  /^(.)\1+$/,           // All same characters
  /^(012|123|234|345|456|567|678|789|890)+$/,  // Sequential numbers
  /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+$/i,  // Sequential letters
];

/**
 * Validate master password strength and requirements
 */
export function validateMasterPassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  // Minimum length
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  } else {
    score += 20;
    if (password.length >= 16) score += 10;
    if (password.length >= 20) score += 10;
  }

  // Character variety
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  if (hasLowercase) score += 10;
  if (hasUppercase) score += 10;
  if (hasNumbers) score += 10;
  if (hasSpecial) score += 20;

  // Character variety warnings
  if (!hasUppercase) warnings.push('Add uppercase letters for stronger password');
  if (!hasNumbers) warnings.push('Add numbers for stronger password');
  if (!hasSpecial) warnings.push('Add special characters for stronger password');

  // Check for common passwords
  const lowerPassword = password.toLowerCase();
  if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
    warnings.push('Password contains common patterns');
    score -= 20;
  }

  // Check for common patterns
  if (COMMON_PATTERNS.some(pattern => pattern.test(password))) {
    warnings.push('Password contains sequential or repeated characters');
    score -= 15;
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong';
  if (score < 30) {
    strength = 'weak';
  } else if (score < 60) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  return {
    isValid: errors.length === 0,
    strength,
    score: Math.max(0, Math.min(100, score)),
    errors,
    warnings,
  };
}

// ============================================
// LICENSE KEY VALIDATION
// ============================================

export interface LicenseKeyValidationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
}

/**
 * Validate and normalize license key format
 */
export function validateLicenseKey(key: string): LicenseKeyValidationResult {
  if (!key || typeof key !== 'string') {
    return { isValid: false, normalized: '', error: 'License key is required' };
  }

  // Normalize: uppercase, remove extra spaces
  const normalized = key.trim().toUpperCase();

  // Remove any dashes and check if it's alphanumeric
  const cleaned = normalized.replace(/-/g, '');

  // Should be 16-17 alphanumeric characters (with optional trailing digit)
  if (!/^[A-Z0-9]{16,17}$/.test(cleaned)) {
    return { 
      isValid: false, 
      normalized, 
      error: 'Invalid license key format' 
    };
  }

  // Format as XXXX-XXXX-XXXX-XXXX or XXXX-XXXX-XXXX-XXXX#
  const formatted = cleaned.length === 17 
    ? `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 17)}`
    : `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}`;

  return { isValid: true, normalized: formatted };
}

// ============================================
// EMAIL VALIDATION
// ============================================

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  // Basic email regex - not perfect but covers most cases
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// ============================================
// URL VALIDATION
// ============================================

/**
 * Validate URL format (allows URLs without protocol)
 */
export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;

  // Add protocol if missing for validation
  const urlToTest = trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`;

  try {
    new URL(urlToTest);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// FIELD VALIDATORS
// ============================================

/**
 * Validate account name
 */
export function validateAccountName(name: string): { isValid: boolean; error?: string } {
  const sanitized = sanitizeInput(name);
  
  if (!sanitized) {
    return { isValid: false, error: 'Account name is required' };
  }
  
  if (sanitized.length > 100) {
    return { isValid: false, error: 'Account name must be 100 characters or less' };
  }
  
  return { isValid: true };
}

/**
 * Validate username
 */
export function validateUsername(username: string): { isValid: boolean; error?: string } {
  const sanitized = sanitizeInput(username);
  
  if (!sanitized) {
    return { isValid: false, error: 'Username is required' };
  }
  
  if (sanitized.length > 200) {
    return { isValid: false, error: 'Username must be 200 characters or less' };
  }
  
  return { isValid: true };
}

/**
 * Validate notes field
 */
export function validateNotes(notes: string): { isValid: boolean; error?: string } {
  if (!notes) return { isValid: true }; // Notes are optional
  
  const sanitized = sanitizeInput(notes);
  
  if (sanitized.length > 10000) {
    return { isValid: false, error: 'Notes must be 10,000 characters or less' };
  }
  
  return { isValid: true };
}

