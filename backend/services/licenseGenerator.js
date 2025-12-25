/**
 * License Key Generator
 * Generates secure, unique license keys in format: XXXX-XXXX-XXXX-XXXX
 */

const crypto = require('crypto');

/**
 * Character set for license keys (excluding ambiguous characters like 0/O, 1/I/L)
 */
const CHAR_SET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate a random segment of specified length
 */
function generateSegment(length = 4) {
  let segment = '';
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    const index = randomBytes[i] % CHAR_SET.length;
    segment += CHAR_SET[index];
  }
  
  return segment;
}

/**
 * Generate a license key in format: XXXX-XXXX-XXXX-XXXX
 * 
 * @param {string} prefix - Optional prefix for the key (e.g., 'PERS', 'FAMLY')
 * @returns {string} Generated license key
 */
function generateLicenseKey(prefix = null) {
  if (prefix) {
    // Use prefix as first segment
    const paddedPrefix = prefix.toUpperCase().padEnd(4, 'X').slice(0, 4);
    return `${paddedPrefix}-${generateSegment()}-${generateSegment()}-${generateSegment()}`;
  }
  
  return `${generateSegment()}-${generateSegment()}-${generateSegment()}-${generateSegment()}`;
}

/**
 * Generate a trial key with TRIAL prefix
 * Format: TRIA-XXXX-XXXX-XXXX
 */
function generateTrialKey() {
  return `TRIA-${generateSegment()}-${generateSegment()}-${generateSegment()}`;
}

/**
 * Generate a Personal plan key
 * Format: PERS-XXXX-XXXX-XXXX
 */
function generatePersonalKey() {
  return generateLicenseKey('PERS');
}

/**
 * Generate a Family plan key
 * Format: FMLY-XXXX-XXXX-XXXX
 */
function generateFamilyKey() {
  return generateLicenseKey('FMLY');
}

/**
 * Generate a Local Legacy Vault Personal key
 * Format: LLVP-XXXX-XXXX-XXXX
 * 
 * Local Legacy Vault (LLV) is a separate product line from Local Password Vault (LPV).
 * Both products use the same Supabase database but are distinguished by license key prefix
 * and product_type field in the database.
 */
function generateLLVPersonalKey() {
  return generateLicenseKey('LLVP');
}

/**
 * Generate a Local Legacy Vault Family key
 * Format: LLVF-XXXX-XXXX-XXXX
 * 
 * Local Legacy Vault (LLV) is a separate product line from Local Password Vault (LPV).
 * Both products use the same Supabase database but are distinguished by license key prefix
 * and product_type field in the database.
 */
function generateLLVFamilyKey() {
  return generateLicenseKey('LLVF');
}

/**
 * Validate license key format
 * @param {string} key - License key to validate
 * @returns {boolean} True if valid format
 */
function isValidFormat(key) {
  if (!key || typeof key !== 'string') return false;
  
  // Clean the key
  const cleanKey = key.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  
  // Check format: XXXX-XXXX-XXXX-XXXX (16 chars + 3 dashes)
  const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return pattern.test(cleanKey);
}

/**
 * Normalize a license key (uppercase, clean characters)
 * @param {string} key - License key to normalize
 * @returns {string} Normalized key
 */
function normalizeKey(key) {
  if (!key) return '';
  return key.toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

/**
 * Get the plan type from a license key prefix
 * @param {string} key - License key
 * @returns {string|null} Plan type or null
 */
function getPlanTypeFromKey(key) {
  if (!key) return null;
  
  const prefix = key.toUpperCase().slice(0, 4);
  
  switch (prefix) {
    case 'PERS':
      return 'personal';
    case 'FMLY':
      return 'family';
    case 'LLVP':
      return 'llv_personal';
    case 'LLVF':
      return 'llv_family';
    case 'TRIA':
      return 'trial';
    default:
      return null; // Generic key without prefix
  }
}

module.exports = {
  generateLicenseKey,
  generateTrialKey,
  generatePersonalKey,
  generateFamilyKey,
  generateLLVPersonalKey,
  generateLLVFamilyKey,
  isValidFormat,
  normalizeKey,
  getPlanTypeFromKey,
};

