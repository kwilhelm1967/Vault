/**
 * Error Handling Tests
 *
 * Tests for error handling utilities and patterns
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ErrorHandler,
  ValidationError,
  NetworkError,
  StorageError,
  AuthenticationError,
  useErrorHandler,
  withErrorHandling,
  withRetry
} from '../utils/errorHandling';

describe('Error Classes', () => {
  describe('ValidationError', () => {
    it('should create validation error with correct properties', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });

      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.recoverable).toBe(true);
      expect(error.details).toEqual({ field: 'email' });
      expect(error.userMessage).toBe('Invalid input');
    });
  });

  describe('NetworkError', () => {
    it('should create network error with user-friendly message', () => {
      const error = new NetworkError('Connection failed');

      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('Connection failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.recoverable).toBe(true);
      expect(error.userMessage).toBe('Network connection issue. Please check your connection and try again.');
    });
  });

  describe('StorageError', () => {
    it('should create storage error as non-recoverable', () => {
      const error = new StorageError('Storage quota exceeded');

      expect(error.name).toBe('StorageError');
      expect(error.code).toBe('STORAGE_ERROR');
      expect(error.recoverable).toBe(false);
      expect(error.userMessage).toBe('Storage error occurred. Your data may not be saved properly.');
    });
  });

  describe('AuthenticationError', () => {
    it('should create auth error with custom message', () => {
      const error = new AuthenticationError('Invalid credentials');

      expect(error.name).toBe('AuthenticationError');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.recoverable).toBe(true);
      expect(error.userMessage).toBe('Invalid credentials');
    });
  });
});

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = ErrorHandler.getInstance();
    vi.clearAllMocks();
  });

  describe('handle method', () => {
    it('should handle ValidationError correctly', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const validationError = new ValidationError('Invalid email format');

      const result = errorHandler.handle(validationError, 'Email validation');

      expect(result.userMessage).toBe('Invalid email format');
      expect(result.shouldRetry).toBe(true);
      expect(result.logError).toBe(true);

      if (import.meta.env.DEV) {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[VALIDATION_ERROR] Email validation: Invalid email format',
          validationError.details
        );
      }

      consoleSpy.mockRestore();
    });

    it('should handle regular Error correctly', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const regularError = new Error('Something went wrong');

      const result = errorHandler.handle(regularError, 'Data loading');

      expect(result.userMessage).toBe('An unexpected error occurred.');
      expect(result.shouldRetry).toBe(false);
      expect(result.logError).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should handle NetworkError as retryable', () => {
      const networkError = new NetworkError('Connection timeout');
      const result = errorHandler.handle(networkError);

      expect(result.shouldRetry).toBe(true);
      expect(result.userMessage).toBe('Network connection issue. Please check your connection and try again.');
    });
  });

  describe('getUserMessage method', () => {
    it('should return user message for AppError', () => {
      const error = new ValidationError('Field is required');
      const message = errorHandler.getUserMessage(error);

      expect(message).toBe('Field is required');
    });

    it('should return default message for regular Error', () => {
      const error = new Error('System error');
      const message = errorHandler.getUserMessage(error);

      expect(message).toBe('An unexpected error occurred.');
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});

describe('withErrorHandling', () => {
  it('should return data on successful operation', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await withErrorHandling(operation, 'Test operation');

    expect(result.data).toBe('success');
    expect(result.error).toBeNull();
  });

  it('should return error on failed operation', async () => {
    const operation = vi.fn().mockRejectedValue(new ValidationError('Validation failed'));

    const result = await withErrorHandling(operation, 'Test operation');

    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error?.code).toBe('OPERATION_FAILED');
    expect(result.error?.message).toBe('Validation failed');
  });
});

describe('withRetry', () => {
  it('should return result on first successful attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await withRetry(operation, 3);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValueOnce('success');

    const result = await withRetry(operation, 3);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should throw after max retries', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Persistent failure'));

    await expect(withRetry(operation, 2)).rejects.toThrow('Persistent failure');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should use exponential backoff', async () => {
    vi.useFakeTimers();
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('First'))
      .mockRejectedValueOnce(new Error('Second'))
      .mockResolvedValueOnce('success');

    const promise = withRetry(operation, 3, 100);

    // First attempt fails immediately
    await vi.advanceTimersByTime(0);
    expect(operation).toHaveBeenCalledTimes(1);

    // Second attempt after 100ms delay
    await vi.advanceTimersByTime(100);
    expect(operation).toHaveBeenCalledTimes(2);

    // Third attempt after 200ms delay
    await vi.advanceTimersByTime(200);
    expect(operation).toHaveBeenCalledTimes(3);

    const result = await promise;
    expect(result).toBe('success');

    vi.useRealTimers();
  });
});

describe('useErrorHandler hook', () => {
  // Note: Testing custom hooks requires a test framework that supports React hooks
  // For now, we'll test the utility functions directly
  it('should provide error handling utilities', () => {
    const errorHandler = ErrorHandler.getInstance();

    const validationError = new ValidationError('Test error');
    const result = errorHandler.handle(validationError);

    expect(result.userMessage).toBe('Test error');
    expect(result.shouldRetry).toBe(true);
  });
});
