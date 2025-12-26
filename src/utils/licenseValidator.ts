/**
 * License File Validation
 * 
 * Validates signed license files locally without contacting the server.
 * Uses HMAC-SHA256 signature verification.
 */

/**
 * Verify a signed license file signature
 * @param signedLicense - Signed license file from server
 * @returns Promise<boolean> - true if signature is valid
 */
export async function verifyLicenseSignature(signedLicense: {
  signature: string;
  signed_at: string;
  [key: string]: any;
}): Promise<boolean> {
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
 * Generate HMAC-SHA256 signature
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
 * Synchronous version for immediate validation
 * Note: This is a simplified version. For production, use async version.
 */
export function verifyLicenseSignatureSync(signedLicense: {
  signature: string;
  signed_at: string;
  [key: string]: any;
}): boolean {
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

