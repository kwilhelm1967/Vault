/**
 * Development-only logging utilities
 * 
 * These functions are tree-shaken out of production builds.
 * Use instead of console.log/warn/error for debug output.
 */

const isDev = import.meta.env.DEV;

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

