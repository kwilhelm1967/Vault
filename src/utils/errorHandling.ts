/**
 * Error Handling Utilities
 *
 * Consistent error handling patterns for the application.
 * Provides standardized error types, logging, and recovery mechanisms.
 */

import { devError } from "./devLog";

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  recoverable: boolean;
  userMessage?: string;
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
   */
  handle(error: Error | AppError, context?: string): {
    userMessage: string;
    shouldRetry: boolean;
    logError: boolean;
  } {
    const appError = this.normalizeError(error);

    // Log error in development
    devError(`[${appError.code}] ${context ? `${context}: ` : ''}`, appError.message, appError.details);

    // Determine user message
    const userMessage = appError.userMessage || 'An unexpected error occurred.';

    // Determine if retry is appropriate
    const shouldRetry = appError.recoverable && this.isRetryable(appError);

    return {
      userMessage,
      shouldRetry,
      logError: true
    };
  }

  /**
   * Normalize any error to AppError format
   */
  private normalizeError(error: Error | AppError): AppError {
    if (this.isAppError(error)) {
      return error;
    }

    // Convert regular Error to AppError
    const appError: AppError = {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      details: error,
      recoverable: false,
      userMessage: 'An unexpected error occurred.'
    };

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
 * Async operation wrapper with error handling
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
 * Retry mechanism for failed operations
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
