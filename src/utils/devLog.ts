/**
 * Development-only logging utilities
 * 
 * These functions are tree-shaken out of production builds.
 * Use instead of console.log/warn/error for debug output.
 */

// Support both Vite's import.meta.env and test environment
let isDev = true; // Default to true for tests
try {
  // Check if we're in a test environment first
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    isDev = true;
  } else if (typeof window !== 'undefined' && window.__DEV__ !== undefined) {
    isDev = window.__DEV__;
  } else {
    // @ts-ignore - import.meta may not be available in all environments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try {
      const meta = (globalThis as any).import?.meta;
      if (meta?.env) {
        isDev = meta.env.DEV !== false;
      }
    } catch {
      // Fallback: check if we're in a browser environment
      if (typeof window !== 'undefined') {
        isDev = true;
      }
    }
  }
} catch {
  // In test environment, default to dev mode
  isDev = true;
}

/**
 * Log debug info - only in development
 */
export const devLog = (...args: unknown[]): void => {
  if (isDev) {
    console.log(...args);
  }
};

/**
 * Log warnings - only in development
 */
export const devWarn = (...args: unknown[]): void => {
  if (isDev) {
    console.warn(...args);
  }
};

/**
 * Log errors - only in development
 * Note: For production error tracking, use errorHandling.ts instead
 */
export const devError = (...args: unknown[]): void => {
  if (isDev) {
    console.error(...args);
  }
};

/**
 * Log with a prefix label - only in development
 */
export const devLogLabeled = (label: string, ...args: unknown[]): void => {
  if (isDev) {
    console.log(`[${label}]`, ...args);
  }
};

/**
 * Conditional logging based on feature flag
 */
export const devLogIf = (condition: boolean, ...args: unknown[]): void => {
  if (isDev && condition) {
    console.log(...args);
  }
};

export default {
  log: devLog,
  warn: devWarn,
  error: devError,
  labeled: devLogLabeled,
  logIf: devLogIf,
};










