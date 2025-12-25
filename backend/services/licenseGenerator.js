const crypto = require('crypto');

const CHAR_SET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateSegment(length = 4) {
  let segment = '';
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    const index = randomBytes[i] % CHAR_SET.length;
    segment += CHAR_SET[index];
  }
  
  return segment;
}

function generateLicenseKey(prefix = null) {
  if (prefix) {
    const paddedPrefix = prefix.toUpperCase().padEnd(4, 'X').slice(0, 4);
    return `${paddedPrefix}-${generateSegment()}-${generateSegment()}-${generateSegment()}`;
  }
  
  return `${generateSegment()}-${generateSegment()}-${generateSegment()}-${generateSegment()}`;
}

function generateTrialKey() {
  return `TRIA-${generateSegment()}-${generateSegment()}-${generateSegment()}`;
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
    case 'TRIA':
      return 'trial';
    default:
      return null;
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

