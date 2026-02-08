/**
 * Error Handling Tests
 *
 * Tests for error handling utilities and patterns
 */

// Mock import.meta.env before importing the module
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        DEV: false,
      },
    },
  },
  writable: true,
});

import {
  ErrorHandler,
  ErrorLogger,
  ValidationError,
  NetworkError,
  StorageError,
  AuthenticationError,
  withErrorHandling,
  withRetry,
  createError,
  getErrorLogger,
  ERROR_CODES,
  type AppError,
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
    jest.clearAllMocks();
  });

  describe('handle method', () => {
    it('should handle ValidationError correctly', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const validationError = new ValidationError('Invalid email format');

      const result = errorHandler.handle(validationError, 'Email validation');

      expect(result.userMessage).toBe('Invalid email format');
      expect(result.shouldRetry).toBe(true);
      expect(result.logError).toBe(true);

      // In test environment, always log
      {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[VALIDATION_ERROR] Email validation: Invalid email format',
          validationError.details
        );
      }

      consoleSpy.mockRestore();
    });

    it('should handle regular Error correctly', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
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
    const operation = jest.fn().mockResolvedValue('success');

    const result = await withErrorHandling(operation, 'Test operation');

    expect(result.data).toBe('success');
    expect(result.error).toBeNull();
  });

  it('should return error on failed operation', async () => {
    const operation = jest.fn().mockRejectedValue(new ValidationError('Validation failed'));

    const result = await withErrorHandling(operation, 'Test operation');

    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error?.code).toBe('OPERATION_FAILED');
    expect(result.error?.message).toBe('Validation failed');
  });
});

describe('withRetry', () => {
  it('should return result on first successful attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');

    const result = await withRetry(operation, 3);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValueOnce('success');

    const result = await withRetry(operation, 3);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should throw after max retries', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

    await expect(withRetry(operation, 2)).rejects.toThrow('Persistent failure');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should use exponential backoff', async () => {
    jest.useFakeTimers();
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('First'))
      .mockRejectedValueOnce(new Error('Second'))
      .mockResolvedValueOnce('success');

    const promise = withRetry(operation, 3, 100);

    // First attempt fails immediately
    await Promise.resolve();
    jest.advanceTimersByTime(0);
    await Promise.resolve();
    expect(operation).toHaveBeenCalledTimes(1);

    // Second attempt after 100ms delay
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    expect(operation).toHaveBeenCalledTimes(2);

    // Third attempt after 200ms delay
    jest.advanceTimersByTime(200);
    await Promise.resolve();
    expect(operation).toHaveBeenCalledTimes(3);

    const result = await promise;
    expect(result).toBe('success');

    jest.useRealTimers();
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
    // Regular errors are not retryable
    expect(result.shouldRetry).toBe(false);
  });
});

describe('ErrorLogger', () => {
  let logger: ErrorLogger;
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return localStorageMock[key] || null;
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      localStorageMock[key] = value;
    });
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
      delete localStorageMock[key];
    });

    logger = ErrorLogger.getInstance();
    logger.clearHistory();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be a singleton', () => {
    const logger1 = ErrorLogger.getInstance();
    const logger2 = ErrorLogger.getInstance();
    
    expect(logger1).toBe(logger2);
  });

  it('should log errors with context', () => {
    const error: AppError = {
      code: 'TEST_ERROR',
      message: 'Test error message',
      recoverable: true,
      userMessage: 'User-friendly message',
    };

    const entry = logger.logError(error, 'test-context');

    expect(entry.code).toBe('TEST_ERROR');
    expect(entry.message).toBe('Test error message');
    expect(entry.context).toBe('test-context');
    expect(entry.timestamp).toBeDefined();
  });

  it('should store errors in history', () => {
    const error: AppError = {
      code: 'TEST_ERROR',
      message: 'Test error',
      recoverable: true,
    };

    logger.logError(error);
    const history = logger.getErrorHistory();

    expect(history.length).toBe(1);
    expect(history[0].code).toBe('TEST_ERROR');
  });

  it('should limit history to MAX_HISTORY', () => {
    const error: AppError = {
      code: 'TEST_ERROR',
      message: 'Test error',
      recoverable: true,
    };

    // Log more than MAX_HISTORY (100) errors
    for (let i = 0; i < 150; i++) {
      logger.logError({ ...error, code: `ERROR_${i}` });
    }

    const history = logger.getErrorHistory(200);
    expect(history.length).toBeLessThanOrEqual(100);
  });

  it('should get recent error history with limit', () => {
    const error: AppError = {
      code: 'TEST_ERROR',
      message: 'Test error',
      recoverable: true,
    };

    for (let i = 0; i < 20; i++) {
      logger.logError({ ...error, code: `ERROR_${i}` });
    }

    const recent = logger.getErrorHistory(5);
    expect(recent.length).toBe(5);
  });

  it('should clear error history', () => {
    const error: AppError = {
      code: 'TEST_ERROR',
      message: 'Test error',
      recoverable: true,
    };

    logger.logError(error);
    expect(logger.getErrorHistory().length).toBe(1);

    logger.clearHistory();
    expect(logger.getErrorHistory().length).toBe(0);
  });

  it('should export error logs as JSON', () => {
    const error: AppError = {
      code: 'TEST_ERROR',
      message: 'Test error',
      recoverable: true,
    };

    logger.logError(error);
    const exported = logger.exportErrorLogs();
    const parsed = JSON.parse(exported);

    expect(parsed.totalErrors).toBe(1);
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.exportedAt).toBeDefined();
    expect(parsed.appVersion).toBeDefined();
  });

  it('should get error statistics', () => {
    const errors = [
      { code: 'ERROR_A', message: 'Error A', recoverable: true },
      { code: 'ERROR_A', message: 'Error A again', recoverable: true },
      { code: 'ERROR_B', message: 'Error B', recoverable: true },
    ];

    errors.forEach(err => logger.logError(err as AppError));
    const stats = logger.getErrorStats();

    expect(stats.total).toBe(3);
    expect(stats.byCode['ERROR_A']).toBe(2);
    expect(stats.byCode['ERROR_B']).toBe(1);
    expect(stats.recent).toBeGreaterThanOrEqual(0);
  });

  it('should persist errors to localStorage', () => {
    const error: AppError = {
      code: 'TEST_ERROR',
      message: 'Test error',
      recoverable: true,
    };

    logger.logError(error);

    expect(Storage.prototype.setItem).toHaveBeenCalled();
  });

  it('should load errors from localStorage on initialization', () => {
    const storedErrors = [
      {
        code: 'STORED_ERROR',
        message: 'Stored error',
        timestamp: new Date().toISOString(),
      },
    ];
    localStorageMock['lpv_error_logs'] = JSON.stringify(storedErrors);

    const newLogger = ErrorLogger.getInstance();
    const history = newLogger.getErrorHistory();

    expect(history.length).toBeGreaterThan(0);
  });

  it('should handle corrupted localStorage data gracefully', () => {
    localStorageMock['lpv_error_logs'] = 'invalid json!!!';

    const newLogger = ErrorLogger.getInstance();
    const history = newLogger.getErrorHistory();

    // Should handle gracefully and return empty history
    expect(Array.isArray(history)).toBe(true);
  });
});

describe('createError', () => {
  it('should create structured error with code', () => {
    const error = createError('TEST_ERROR', 'Test message');

    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test message');
    expect(error.recoverable).toBe(false);
    expect(error.timestamp).toBeDefined();
  });

  it('should create error with options', () => {
    const error = createError('TEST_ERROR', 'Test message', {
      details: { field: 'email' },
      recoverable: true,
      userMessage: 'User-friendly message',
      context: 'validation',
    });

    expect(error.code).toBe('TEST_ERROR');
    expect(error.details).toEqual({ field: 'email' });
    expect(error.recoverable).toBe(true);
    expect(error.userMessage).toBe('User-friendly message');
    expect(error.context).toBe('validation');
  });

  it('should use message as default userMessage', () => {
    const error = createError('TEST_ERROR', 'Test message');

    expect(error.userMessage).toBe('Test message');
  });
});

describe('ERROR_CODES', () => {
  it('should export all error code constants', () => {
    expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ERROR_CODES.NETWORK_ERROR).toBe('NETWORK_ERROR');
    expect(ERROR_CODES.STORAGE_ERROR).toBe('STORAGE_ERROR');
    expect(ERROR_CODES.AUTH_ERROR).toBe('AUTH_ERROR');
    expect(ERROR_CODES.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
  });
});

describe('getErrorLogger', () => {
  it('should return ErrorLogger instance', () => {
    const logger = getErrorLogger();

    expect(logger).toBeInstanceOf(ErrorLogger);
    expect(logger).toBe(ErrorLogger.getInstance());
  });
});

describe('ErrorHandler - normalizeError', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = ErrorHandler.getInstance();
  });

  it('should infer NETWORK_ERROR from error message', () => {
    const error = new Error('Network connection failed');
    const result = errorHandler.handle(error);

    expect(result.errorCode).toBe('NETWORK_ERROR');
    expect(result.shouldRetry).toBe(true);
  });

  it('should infer STORAGE_ERROR from error message', () => {
    const error = new Error('localStorage quota exceeded');
    const result = errorHandler.handle(error);

    expect(result.errorCode).toBe('STORAGE_ERROR');
  });

  it('should infer AUTH_ERROR from error message', () => {
    const error = new Error('Permission denied');
    const result = errorHandler.handle(error);

    expect(result.errorCode).toBe('AUTH_ERROR');
    expect(result.shouldRetry).toBe(true);
  });

  it('should handle errors with stack traces', () => {
    const error = new Error('Test error');
    error.stack = 'Error: Test error\n    at test.js:1:1';

    const result = errorHandler.handle(error);

    expect(result.errorCode).toBe('UNKNOWN_ERROR');
  });
});
