const crypto = require('crypto');

const CHAR_SET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const NUMBERS = '23456789';

function generateSegment(length = 4) {
  let segment = '';
  const randomBytes = crypto.randomBytes(length);
  
  // Ensure segment has at least one letter and one number
  const hasLetter = () => /[A-Z]/.test(segment);
  const hasNumber = () => /[2-9]/.test(segment);
  
  for (let i = 0; i < length; i++) {
    let char;
    
    // If we're at the last position and still missing a letter or number, force it
    if (i === length - 1) {
      if (!hasLetter()) {
        // Force a letter
        const letterIndex = randomBytes[i] % LETTERS.length;
        char = LETTERS[letterIndex];
      } else if (!hasNumber()) {
        // Force a number
        const numberIndex = randomBytes[i] % NUMBERS.length;
        char = NUMBERS[numberIndex];
      } else {
        // Both present, use normal random selection
        const index = randomBytes[i] % CHAR_SET.length;
        char = CHAR_SET[index];
      }
    } else {
      // Normal random selection
      const index = randomBytes[i] % CHAR_SET.length;
      char = CHAR_SET[index];
    }
    
    segment += char;
  }
  
  // Final validation: ensure segment has both letters and numbers
  if (!/[A-Z]/.test(segment) || !/[2-9]/.test(segment)) {
    // Regenerate if validation fails (should be rare)
    return generateSegment(length);
  }
  
  return segment;
}

function generateLicenseKey(prefix = null) {
  let key;
  if (prefix) {
    const paddedPrefix = prefix.toUpperCase().padEnd(4, 'X').slice(0, 4);
    key = `${paddedPrefix}-${generateSegment()}-${generateSegment()}-${generateSegment()}`;
  } else {
    key = `${generateSegment()}-${generateSegment()}-${generateSegment()}-${generateSegment()}`;
  }
  
  // Final validation: ensure entire key (excluding prefix) has both letters and numbers
  const segmentsOnly = key.split('-').slice(prefix ? 1 : 0).join('');
  if (!/[A-Z]/.test(segmentsOnly) || !/[2-9]/.test(segmentsOnly)) {
    // Regenerate if validation fails (should be rare)
    return generateLicenseKey(prefix);
  }
  
  return key;
}

function generateTrialKey(productType = 'lpv') {
  // Generate trial key with product-specific prefix
  // LPV trials use 'LPVT', LLV trials use 'LLVT'
  const prefix = productType === 'llv' ? 'LLVT' : 'LPVT';
  const key = `${prefix}-${generateSegment()}-${generateSegment()}-${generateSegment()}`;
  
  // Final validation: ensure segments (excluding prefix) have both letters and numbers
  const segmentsOnly = key.split('-').slice(1).join('');
  if (!/[A-Z]/.test(segmentsOnly) || !/[2-9]/.test(segmentsOnly)) {
    // Regenerate if validation fails (should be rare)
    return generateTrialKey(productType);
  }
  
  return key;
}

function generateLPVTrialKey() {
  return generateTrialKey('lpv');
}

function generateLLVTrialKey() {
  return generateTrialKey('llv');
}

function generatePersonalKey() {
  return generateLicenseKey('PERS');
}

function generateFamilyKey() {
  return generateLicenseKey('FMLY');
}

function generateLLVPersonalKey() {
  return generateLicenseKey('LLVP');
}

function generateLLVFamilyKey() {
  return generateLicenseKey('LLVF');
}

function generateAfterPassingAddonKey() {
  return generateLicenseKey('AFPA');
}

function generateAfterPassingStandaloneKey() {
  // Generate with prefix AFPG (AfterPassing Guide)
  return generateLicenseKey('AFPG');
}

function isValidFormat(key) {
  if (!key || typeof key !== 'string') return false;
  const cleanKey = key.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return pattern.test(cleanKey);
}

function normalizeKey(key) {
  if (!key) return '';
  return key.toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

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
    case 'AFPA': // AfterPassing Guide Add-On
      return 'afterpassing_addon';
    case 'AFCS': // Legacy (backward compatibility)
    case 'AFPG': // AfterPassing Guide Standalone
      return 'afterpassing_standalone';
    case 'LPVT': // LPV trial
      return 'trial';
    case 'LLVT': // LLV trial
      return 'llv_trial';
    default:
      return null;
  }
}

function getProductTypeFromTrialKey(key) {
  if (!key) return 'lpv';
  const prefix = key.toUpperCase().slice(0, 4);
  return prefix === 'LLVT' ? 'llv' : 'lpv';
}

module.exports = {
  generateLicenseKey,
  generateTrialKey,
  generateLPVTrialKey,
  generateLLVTrialKey,
  generatePersonalKey,
  generateFamilyKey,
  generateLLVPersonalKey,
  generateLLVFamilyKey,
  generateAfterPassingAddonKey,
  generateAfterPassingStandaloneKey,
  isValidFormat,
  normalizeKey,
  getPlanTypeFromKey,
  getProductTypeFromTrialKey,
};

