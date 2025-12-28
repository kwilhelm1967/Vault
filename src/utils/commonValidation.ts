/**
 * Common Validation Utilities
 * 
 * Extracted common validation logic to reduce code duplication.
 * All validation is performed client-side (100% offline after activation).
 */

import { validateLicenseKey, validateTrialKey, validateUrl, validateAccountName } from './validation';

/**
 * Sanitize and validate license key input
 * 
 * @param input - Raw license key input
 * @returns Cleaned and validated key, or null if invalid
 */
export function sanitizeAndValidateLicenseKey(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const validation = validateLicenseKey(input);
  return validation.valid && validation.cleaned ? validation.cleaned : null;
}

/**
 * Sanitize and validate trial key input
 * 
 * @param input - Raw trial key input
 * @returns Cleaned and validated key, or null if invalid
 */
export function sanitizeAndValidateTrialKey(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const validation = validateTrialKey(input);
  return validation.valid && validation.cleaned ? validation.cleaned : null;
}

/**
 * Sanitize and validate URL input
 * 
 * @param input - Raw URL input
 * @returns Cleaned and validated URL, or null if invalid
 */
export function sanitizeAndValidateUrl(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const validation = validateUrl(input);
  return validation.valid && validation.cleaned ? validation.cleaned : null;
}

/**
 * Sanitize and validate account name
 * 
 * @param input - Raw account name input
 * @returns Validation result
 */
export function sanitizeAndValidateAccountName(input: string): { valid: boolean; error?: string; cleaned?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Account name is required' };
  }

  const trimmed = input.trim();
  const validation = validateAccountName(trimmed);
  
  return {
    ...validation,
    cleaned: validation.valid ? trimmed : undefined,
  };
}

/**
 * Common input sanitization (remove extra whitespace, trim)
 * 
 * @param input - Input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Validate and sanitize form data
 * 
 * @param data - Form data object
 * @returns Sanitized form data
 */
export function sanitizeFormData<T extends Record<string, string>>(data: T): T {
  const sanitized = { ...data };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeInput(sanitized[key]) as T[Extract<keyof T, string>];
    }
  }
  
  return sanitized;
}

