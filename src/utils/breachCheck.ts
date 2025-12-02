/**
 * Breach Check Service
 * 
 * Checks passwords against the HaveIBeenPwned database using k-anonymity.
 * Your full password is NEVER sent to any server.
 * 
 * How it works:
 * 1. Hash the password with SHA-1
 * 2. Send only the first 5 characters of the hash
 * 3. HIBP returns all matching hashes
 * 4. We check locally if our full hash is in the list
 */

/**
 * Generate SHA-1 hash of a string
 */
async function sha1(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Check if a password has been exposed in known data breaches
 * 
 * @param password - The password to check
 * @returns Object with breach status and count
 */
export async function checkPasswordBreach(password: string): Promise<{
  breached: boolean;
  count: number;
  error?: string;
}> {
  try {
    // Don't check empty or very short passwords
    if (!password || password.length < 4) {
      return { breached: false, count: 0 };
    }

    // Hash the password
    const hash = await sha1(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    // Query HIBP API with just the prefix (k-anonymity)
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'Add-Padding': 'true', // Adds fake entries to prevent timing attacks
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        return { breached: false, count: 0, error: 'Rate limited. Try again later.' };
      }
      return { breached: false, count: 0, error: 'Unable to check breach status.' };
    }

    const text = await response.text();
    const lines = text.split('\n');

    // Check if our hash suffix is in the results
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return { 
          breached: true, 
          count: parseInt(count.trim(), 10) || 1 
        };
      }
    }

    return { breached: false, count: 0 };
  } catch (error) {
    // Network error or offline - don't alarm user
    console.error('Breach check failed:', error);
    return { breached: false, count: 0, error: 'Unable to check (offline?)' };
  }
}

/**
 * Check multiple passwords for breaches
 * Includes rate limiting to avoid hitting API limits
 * 
 * @param passwords - Array of passwords to check
 * @param delayMs - Delay between requests (default 100ms)
 */
export async function checkMultiplePasswords(
  passwords: string[],
  delayMs: number = 100
): Promise<Map<string, { breached: boolean; count: number }>> {
  const results = new Map<string, { breached: boolean; count: number }>();
  
  for (const password of passwords) {
    // Skip duplicates
    if (results.has(password)) continue;
    
    const result = await checkPasswordBreach(password);
    results.set(password, { breached: result.breached, count: result.count });
    
    // Rate limit
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

/**
 * Format breach count for display
 */
export function formatBreachCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

