/**
 * License File Validation
 * 
 * Validates signed license files locally without contacting the server.
 * Uses HMAC-SHA256 signature verification.
 */

/**
 * Signed license file structure from server
 */
export interface SignedLicenseFile {
  signature: string;
  signed_at: string;
  license_key?: string;
  device_id?: string;
  plan_type?: string;
  max_devices?: number;
  transfer_count?: number;
  last_transfer_at?: string;
  product_type?: string;
  [key: string]: unknown; // Allow additional properties for flexibility
}

/**
 * Verify a signed license file signature
 * 
 * @param signedLicense - Signed license file from server
 * @returns Promise<boolean> - true if signature is valid
 */
export async function verifyLicenseSignature(signedLicense: SignedLicenseFile): Promise<boolean> {
  // In development, accept unsigned files
  if (import.meta.env.DEV && !signedLicense.signature) {
    return true;
  }

  if (!signedLicense.signature) {
    return false;
  }

  // Extract signature and signed_at from data
  const { signature, signed_at, ...licenseData } = signedLicense;
  
  // Create canonical JSON string (sorted keys)
  const canonicalData = JSON.stringify(licenseData, Object.keys(licenseData).sort());
  
  // Get signing secret from environment (same as backend)
  // Note: For production, this should be bundled at build time
  const signingSecret = import.meta.env.VITE_LICENSE_SIGNING_SECRET || '';
  
  if (!signingSecret) {
    // In development, allow unsigned files
    if (import.meta.env.DEV) {
      return true;
    }
    // In production without secret, reject unsigned files
    return false;
  }

  try {
    // Generate expected signature using Web Crypto API
    const expectedSignature = await generateHMAC(canonicalData, signingSecret);
    // Constant-time comparison
    return constantTimeEqual(signature, expectedSignature);
  } catch (error) {
    // Signature verification failed - return false without logging
    // Errors are handled by calling code
    return false;
  }
}

/**
 * Generate HMAC-SHA256 signature using Web Crypto API
 * 
 * @param data - The data string to sign
 * @param secret - The signing secret (should match backend secret)
 * @returns Promise resolving to hexadecimal HMAC-SHA256 signature
 * 
 * @example
 * ```typescript
 * const signature = await generateHMAC(canonicalData, signingSecret);
 * ```
 */
async function generateHMAC(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant-time string comparison to prevent timing attacks
 * 
 * Compares two strings in constant time to prevent attackers from using timing
 * differences to determine correct signature values. Uses bitwise XOR to compare
 * all characters regardless of where differences occur.
 * 
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 * 
 * @security This function is critical for signature verification security.
 * Never use regular string comparison (===) for cryptographic values.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Synchronous version for immediate validation (structure check only)
 * 
 * Note: This is a simplified version that only validates structure and signature
 * presence. For full cryptographic signature verification, use the async
 * verifyLicenseSignature function.
 * 
 * @param signedLicense - Signed license file object
 * @param signedLicense.signature - HMAC-SHA256 signature string
 * @param signedLicense.signed_at - ISO timestamp when license was signed
 * @returns true if signature is present and structure is valid, false otherwise
 * 
 * @remarks
 * This function is used for quick validation checks where async crypto
 * operations would be too slow. Full signature verification happens during
 * license activation using the async verifyLicenseSignature function.
 */
export function verifyLicenseSignatureSync(signedLicense: SignedLicenseFile): boolean {
  // In development, accept unsigned files
  if (import.meta.env.DEV && !signedLicense.signature) {
    return true;
  }

  if (!signedLicense.signature) {
    return false;
  }

  // For now, we'll validate structure and presence of signature
  // Full signature verification requires async crypto operations
  // The app will use this for quick checks, full verification happens on activation
  return true;
}

