/**
 * Safe Utility Functions
 * 
 * Provides safe wrappers for common operations that might fail.
 * Prevents crashes from malformed data.
 */

import { devWarn } from "./devLog";

/**
 * Safely parse JSON with a fallback value.
 * Returns fallback if parsing fails or input is null/undefined.
 * 
 * @param json - JSON string to parse (can be null)
 * @param fallback - Value to return if parsing fails
 * @param logError - Whether to log parse errors in dev mode (default: true)
 * @returns Parsed value or fallback
 * 
 * @example
 * const settings = safeParseJSON(localStorage.getItem('settings'), {});
 * const items = safeParseJSON(data, [] as string[]);
 */
export function safeParseJSON<T>(json: string | null | undefined, fallback: T, logError = true): T {
  if (!json) return fallback;
  
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    if (logError) {
      devWarn("Failed to parse JSON:", error, "Input:", json.substring(0, 100));
    }
    return fallback;
  }
}

/**
 * Safely get and parse a localStorage item.
 * Combines localStorage.getItem and JSON.parse with error handling.
 * 
 * @param key - localStorage key
 * @param fallback - Value to return if key doesn't exist or parsing fails
 * @returns Parsed value or fallback
 * 
 * @example
 * const favorites = safeGetLocalStorage('favorites', new Set<string>());
 * const config = safeGetLocalStorage('config', { theme: 'dark' });
 */
export function safeGetLocalStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return fallback;
    return JSON.parse(item) as T;
  } catch (error) {
    devWarn(`Failed to get/parse localStorage key "${key}":`, error);
    return fallback;
  }
}

/**
 * Safely set a localStorage item with JSON serialization.
 * Handles serialization errors gracefully.
 * 
 * @param key - localStorage key
 * @param value - Value to serialize and store
 * @returns true if successful, false if failed
 * 
 * @example
 * safeSetLocalStorage('config', { theme: 'dark' });
 */
export function safeSetLocalStorage(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    devWarn(`Failed to set localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Safely parse a JWT token payload.
 * Returns null if token is invalid or malformed.
 * 
 * @param token - JWT token string
 * @returns Decoded payload object or null
 * 
 * @example
 * const payload = safeParseJWT(token);
 * if (payload?.exp && Date.now() > payload.exp * 1000) {
 *   // Token expired
 * }
 */
export function safeParseJWT<T extends Record<string, unknown> = Record<string, unknown>>(
  token: string | null | undefined
): T | null {
  if (!token) return null;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      devWarn("Invalid JWT: expected 3 parts, got", parts.length);
      return null;
    }
    return JSON.parse(atob(parts[1])) as T;
  } catch (error) {
    devWarn("Failed to parse JWT:", error);
    return null;
  }
}

/**
 * Safely access a nested property in an object.
 * Returns undefined if any part of the path doesn't exist.
 * 
 * @param obj - Object to access
 * @param path - Dot-separated path (e.g., "user.profile.name")
 * @param fallback - Optional fallback value
 * @returns Property value or fallback
 * 
 * @example
 * const name = safeGet(user, 'profile.name', 'Unknown');
 */
export function safeGet<T>(
  obj: unknown,
  path: string,
  fallback?: T
): T | undefined {
  try {
    const keys = path.split('.');
    let result: unknown = obj;
    
    for (const key of keys) {
      if (result === null || result === undefined) {
        return fallback;
      }
      result = (result as Record<string, unknown>)[key];
    }
    
    return (result as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export default {
  parseJSON: safeParseJSON,
  getLocalStorage: safeGetLocalStorage,
  setLocalStorage: safeSetLocalStorage,
  parseJWT: safeParseJWT,
  get: safeGet,
};

