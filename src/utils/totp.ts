/**
 * TOTP (Time-based One-Time Password) Generator
 * 
 * Implements RFC 6238 for generating 2FA codes.
 * Uses Web Crypto API for HMAC-SHA1.
 */

import { devError } from "./devLog";

// Base32 alphabet (RFC 4648)
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decode a Base32 string to Uint8Array
 */
function base32Decode(encoded: string): Uint8Array {
  // Normalize: uppercase and remove spaces/dashes
  const normalized = encoded.toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
  
  const output: number[] = [];
  let bits = 0;
  let value = 0;
  
  for (const char of normalized) {
    const index = BASE32_CHARS.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base32 character: ${char}`);
    }
    
    value = (value << 5) | index;
    bits += 5;
    
    while (bits >= 8) {
      bits -= 8;
      output.push((value >> bits) & 0xff);
    }
  }
  
  return new Uint8Array(output);
}

/**
 * Convert a number to a big-endian 8-byte array
 */
function intToBytes(num: number): Uint8Array {
  const bytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    bytes[i] = num & 0xff;
    num = Math.floor(num / 256);
  }
  return bytes;
}

/**
 * Generate HMAC-SHA1
 */
async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
  return new Uint8Array(signature);
}

/**
 * Dynamic truncation per RFC 4226
 */
function dynamicTruncate(hmac: Uint8Array, digits: number = 6): string {
  // Get offset from last 4 bits of last byte
  const offset = hmac[hmac.length - 1] & 0x0f;
  
  // Get 4 bytes starting at offset
  const binary = 
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  
  // Get the last N digits
  const otp = binary % Math.pow(10, digits);
  
  // Pad with leading zeros if necessary
  return otp.toString().padStart(digits, '0');
}

/**
 * Generate a TOTP code
 * 
 * @param secret - Base32 encoded secret
 * @param timeStep - Time step in seconds (default: 30)
 * @param digits - Number of digits (default: 6)
 * @returns The TOTP code
 */
export async function generateTOTP(
  secret: string,
  timeStep: number = 30,
  digits: number = 6
): Promise<string> {
  try {
    const key = base32Decode(secret);
    const counter = Math.floor(Date.now() / 1000 / timeStep);
    const counterBytes = intToBytes(counter);
    const hmac = await hmacSha1(key, counterBytes);
    return dynamicTruncate(hmac, digits);
  } catch (error) {
    devError('TOTP generation error:', error);
    throw new Error('Invalid TOTP secret');
  }
}

/**
 * Get the time remaining until the next TOTP code
 * 
 * @param timeStep - Time step in seconds (default: 30)
 * @returns Seconds remaining
 */
export function getTimeRemaining(timeStep: number = 30): number {
  return timeStep - (Math.floor(Date.now() / 1000) % timeStep);
}

/**
 * Validate a TOTP secret
 * 
 * @param secret - Base32 encoded secret to validate
 * @returns true if valid
 */
export function isValidTOTPSecret(secret: string): boolean {
  try {
    const normalized = secret.toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
    if (normalized.length < 16) return false; // Minimum 80 bits
    
    for (const char of normalized) {
      if (BASE32_CHARS.indexOf(char) === -1) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a random TOTP secret (for testing)
 * 
 * @param length - Length in bytes (default: 20 = 160 bits)
 * @returns Base32 encoded secret
 */
export function generateTOTPSecret(length: number = 20): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  
  let result = '';
  let bits = 0;
  let value = 0;
  
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    
    while (bits >= 5) {
      bits -= 5;
      result += BASE32_CHARS[(value >> bits) & 0x1f];
    }
  }
  
  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 0x1f];
  }
  
  return result;
}

export default {
  generateTOTP,
  getTimeRemaining,
  isValidTOTPSecret,
  generateTOTPSecret,
};

