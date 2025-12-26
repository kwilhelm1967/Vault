/**
 * Error Handling Utilities
 *
 * Consistent error handling patterns for the application.
 * Provides standardized error types, logging, and recovery mechanisms.
 * Enhanced with structured logging for better error tracking.
 */

import { devError } from "./devLog";

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  recoverable: boolean;
  userMessage?: string;
  timestamp?: string;
  context?: string;
  stack?: string;
}

/**
 * Structured error log entry
 */
export interface ErrorLogEntry {
  code: string;
  message: string;
  context?: string;
  timestamp: string;
  details?: unknown;
  stack?: string;
  userAgent?: string;
  url?: string;
}

/**
 * Error logging service with structured logging
 */
class ErrorLogger {
  private static instance: ErrorLogger;
  private errorHistory: ErrorLogEntry[] = [];
  private readonly MAX_HISTORY = 100;
  private readonly STORAGE_KEY = 'lpv_error_logs';

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
      // Load persisted errors on initialization
      ErrorLogger.instance.loadFromLocalStorage();
    }
    return ErrorLogger.instance;
  }

  /**
   * Load error logs from localStorage
   * Maintains 100% offline operation - no network calls
   */
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ErrorLogEntry[];
        // Validate and limit to MAX_HISTORY
        this.errorHistory = parsed.slice(-this.MAX_HISTORY);
      }
    } catch (error) {
      // If parsing fails, clear corrupted data silently
      // Error logging system should not itself cause errors
      localStorage.removeItem(this.STORAGE_KEY);
      this.errorHistory = [];
    }
  }

  /**
   * Save error logs to localStorage
   * Maintains 100% offline operation - no network calls
   */
  private saveToLocalStorage(): void {
    try {
      // Only save recent errors (last MAX_HISTORY)
      const toSave = this.errorHistory.slice(-this.MAX_HISTORY);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
      // If storage fails (quota exceeded, etc.), silently reduce history and retry
      // Error logging system should not itself cause errors
      try {
        // Keep only most recent 50 entries
        this.errorHistory = this.errorHistory.slice(-50);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.errorHistory));
      } catch {
        // If still fails, give up silently
        // This prevents infinite loops if localStorage is completely unavailable
      }
    }
  }

  /**
   * Log an error with structured data
   */
  logError(error: AppError, context?: string): ErrorLogEntry {
    const entry: ErrorLogEntry = {
      code: error.code,
      message: error.message,
      context: context || error.context,
      timestamp: new Date().toISOString(),
      details: error.details,
      stack: error.stack,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    // Add to history (keep only recent errors)
    this.errorHistory.push(entry);
    if (this.errorHistory.length > this.MAX_HISTORY) {
      this.errorHistory.shift();
    }

    // Save to localStorage (100% offline - no network calls)
    this.saveToLocalStorage();

    // Log in development
    if (import.meta.env.DEV) {
      devError(
        `[${entry.code}] ${entry.context ? `${entry.context}: ` : ''}${entry.message}`,
        entry.details,
        { timestamp: entry.timestamp, stack: entry.stack }
      );
    }

    // In production, could send to error tracking service here
    // Example: sendToErrorTracking(entry);
    // NOTE: This would violate 100% offline promise, so NOT implemented

    return entry;
  }

  /**
   * Get recent error history
   */
  getErrorHistory(limit: number = 10): ErrorLogEntry[] {
    return this.errorHistory.slice(-limit);
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
    // Also clear from localStorage
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {
      // Silently handle storage errors - error logging system should not cause errors
    }
  }

  /**
   * Export error logs as JSON string
   * Useful for support requests
   * Maintains 100% offline operation - no network calls
   */
  exportErrorLogs(): string {
    const exportData = {
      exportedAt: new Date().toISOString(),
      appVersion: import.meta.env.VITE_APP_VERSION || 'unknown',
      totalErrors: this.errorHistory.length,
      errors: this.errorHistory,
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byCode: Record<string, number>;
    recent: number;
  } {
    const byCode: Record<string, number> = {};
    this.errorHistory.forEach(entry => {
      byCode[entry.code] = (byCode[entry.code] || 0) + 1;
    });

    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recent = this.errorHistory.filter(
      entry => new Date(entry.timestamp).getTime() > oneHourAgo
    ).length;

    return {
      total: this.errorHistory.length,
      byCode,
      recent,
    };
  }
}

export class ValidationError extends Error implements AppError {
  code = 'VALIDATION_ERROR';
  recoverable = true;
  userMessage: string;

  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.userMessage = message;
  }
}

export class NetworkError extends Error implements AppError {
  code = 'NETWORK_ERROR';
  recoverable = true;
  userMessage: string;

  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'NetworkError';
    this.userMessage = 'Network connection issue. Please check your connection and try again.';
  }
}

export class StorageError extends Error implements AppError {
  code = 'STORAGE_ERROR';
  recoverable = false;
  userMessage: string;

  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'StorageError';
    this.userMessage = 'Storage error occurred. Your data may not be saved properly.';
  }
}

export class AuthenticationError extends Error implements AppError {
  code = 'AUTH_ERROR';
  recoverable = true;
  userMessage: string;

  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'AuthenticationError';
    this.userMessage = message;
  }
}

/**
 * Error handler that provides consistent error processing
 * 
 * Singleton class that normalizes errors, determines user-friendly messages,
 * and manages error logging. Ensures all errors are handled consistently
 * throughout the application with proper context and recovery guidance.
 * 
 * @example
 * ```typescript
 * const handler = ErrorHandler.getInstance();
 * const result = handler.handle(new Error('Something went wrong'), 'user-action');
 * if (result.shouldRetry) {
 *   // Retry the operation
 * }
 * ```
 */
export class ErrorHandler {
  private static instance: ErrorHandler;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle an error with appropriate logging and user feedback
   * 
   * Normalizes the error, logs it with context, and returns structured
   * information about how to handle the error (user message, retry guidance).
   * 
   * @param error - Error object (native Error or AppError)
   * @param context - Optional context string describing where the error occurred
   * @returns Object containing user message, retry guidance, and error code
   * 
   * @example
   * ```typescript
   * try {
   *   await someOperation();
   * } catch (error) {
   *   const result = ErrorHandler.getInstance().handle(error, 'data-sync');
   *   showNotification(result.userMessage);
   *   if (result.shouldRetry) {
   *     retryOperation();
   *   }
   * }
   * ```
   */
  handle(error: Error | AppError, context?: string): {
    userMessage: string;
    shouldRetry: boolean;
    logError: boolean;
    errorCode: string;
  } {
    const appError = this.normalizeError(error);
    appError.context = context || appError.context;
    appError.timestamp = new Date().toISOString();
    
    if (error instanceof Error && error.stack) {
      appError.stack = error.stack;
    }

    // Log error with structured logging
    const logger = ErrorLogger.getInstance();
    logger.logError(appError, context);

    // Determine user message
    const userMessage = appError.userMessage || 'An unexpected error occurred.';

    // Determine if retry is appropriate
    const shouldRetry = appError.recoverable && this.isRetryable(appError);

    return {
      userMessage,
      shouldRetry,
      logError: true,
      errorCode: appError.code,
    };
  }

  /**
   * Normalize any error to AppError format
   */
  private normalizeError(error: Error | AppError): AppError {
    if (this.isAppError(error)) {
      return {
        ...error,
        timestamp: error.timestamp || new Date().toISOString(),
      };
    }

    // Convert regular Error to AppError
    const appError: AppError = {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      details: error,
      recoverable: false,
      userMessage: 'An unexpected error occurred.',
      timestamp: new Date().toISOString(),
      stack: error.stack,
    };

    // Try to infer error type from message
    if (error.message) {
      const message = error.message.toLowerCase();
      if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
        appError.code = 'NETWORK_ERROR';
        appError.recoverable = true;
        appError.userMessage = 'Network connection issue. Please check your connection and try again.';
      } else if (message.includes('storage') || message.includes('localStorage') || message.includes('quota')) {
        appError.code = 'STORAGE_ERROR';
        appError.userMessage = 'Storage error occurred. Your data may not be saved properly.';
      } else if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
        appError.code = 'AUTH_ERROR';
        appError.recoverable = true;
        appError.userMessage = 'Permission denied. Please check your access rights.';
      }
    }

    return appError;
  }

  /**
   * Check if error is an AppError
   */
  private isAppError(error: unknown): error is AppError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'recoverable' in error &&
      typeof (error as AppError).code === 'string' &&
      typeof (error as AppError).recoverable === 'boolean'
    );
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryable(error: AppError): boolean {
    const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT_ERROR'];
    return retryableCodes.includes(error.code);
  }

  /**
   * Create a user-friendly error message
   */
  getUserMessage(error: Error | AppError): string {
    const appError = this.normalizeError(error);
    return appError.userMessage || 'An unexpected error occurred.';
  }
}

/**
 * Hook for consistent error handling in components
 */
export function useErrorHandler() {
  const errorHandler = ErrorHandler.getInstance();

  const handleError = (error: Error | AppError, context?: string) => {
    return errorHandler.handle(error, context);
  };

  const getUserMessage = (error: Error | AppError) => {
    return errorHandler.getUserMessage(error);
  };

  return { handleError, getUserMessage };
}

/**
 * Async operation wrapper with automatic error handling
 * 
 * Wraps an async operation in try-catch and returns a result object instead
 * of throwing. This allows for functional error handling without try-catch
 * blocks at every call site.
 * 
 * @template T - Return type of the operation
 * @param operation - Async function to execute
 * @param context - Optional context for error logging
 * @returns Promise resolving to { data, error } object - exactly one will be non-null
 * 
 * @example
 * ```typescript
 * const { data, error } = await withErrorHandling(
 *   () => apiClient.get('/endpoint'),
 *   'fetch-user-data'
 * );
 * if (error) {
 *   showError(error.userMessage);
 *   return;
 * }
 * // Use data safely - TypeScript knows it's not null here
 * processData(data);
 * ```
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (error) {
    const errorHandler = ErrorHandler.getInstance();
    const handledError = errorHandler.handle(error as Error, context);

    return {
      data: null,
      error: {
        code: 'OPERATION_FAILED',
        message: (error as Error).message,
        details: error,
        recoverable: handledError.shouldRetry,
        userMessage: handledError.userMessage
      }
    };
  }
}

/**
 * Retry mechanism for failed operations with exponential backoff
 * 
 * Executes an async operation with automatic retries on failure. Uses exponential
 * backoff between retries to avoid overwhelming the system. Throws the last error
 * if all retries are exhausted.
 * 
 * @template T - Return type of the operation
 * @param operation - Async function to retry on failure
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param delay - Initial delay in milliseconds (default: 1000)
 * @returns Promise resolving to operation result on success
 * @throws Last error if all retries are exhausted
 * 
 * @example
 * ```typescript
 * try {
 *   const data = await withRetry(
 *     () => networkRequest(),
 *     3,  // max retries
 *     1000 // initial delay
 *   );
 *   // Success after retries
 * } catch (error) {
 *   // All retries exhausted
 * }
 * ```
 * 
 * @remarks
 * Delay progression: 1s, 2s, 4s for default parameters (exponential backoff)
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }

  throw lastError!;
}

/**
 * Get error logger instance for advanced error tracking
 */
export function getErrorLogger(): ErrorLogger {
  return ErrorLogger.getInstance();
}

/**
 * Error code constants for consistent error identification
 */
export const ERROR_CODES = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  
  // Storage errors
  STORAGE_ERROR: 'STORAGE_ERROR',
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_ACCESS_DENIED: 'STORAGE_ACCESS_DENIED',
  
  // Authentication errors
  AUTH_ERROR: 'AUTH_ERROR',
  LICENSE_INVALID: 'LICENSE_INVALID',
  LICENSE_EXPIRED: 'LICENSE_EXPIRED',
  LICENSE_REVOKED: 'LICENSE_REVOKED',
  
  // Operation errors
  OPERATION_FAILED: 'OPERATION_FAILED',
  OPERATION_CANCELLED: 'OPERATION_CANCELLED',
  
  // Unknown errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Create a structured error with error code
 */
export function createError(
  code: string,
  message: string,
  options?: {
    details?: unknown;
    recoverable?: boolean;
    userMessage?: string;
    context?: string;
  }
): AppError {
  return {
    code,
    message,
    details: options?.details,
    recoverable: options?.recoverable ?? false,
    userMessage: options?.userMessage || message,
    context: options?.context,
    timestamp: new Date().toISOString(),
  };
}
