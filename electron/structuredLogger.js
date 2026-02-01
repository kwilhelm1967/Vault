/**
 * Structured Error Logger for Electron Main Process
 * 
 * Provides consistent, structured error logging with context, severity levels,
 * and automatic timestamping for better debugging and monitoring.
 */

const log = require('electron-log');

/**
 * Log levels
 */
const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

/**
 * Structured error logger
 */
class StructuredLogger {
  /**
   * Log an error with structured context
   * @param {string} category - Error category (e.g., 'File Operation', 'IPC', 'Network')
   * @param {string} operation - Operation that failed (e.g., 'saveVault', 'loadPosition')
   * @param {Error|Object} error - Error object or error details
   * @param {Object} context - Additional context (file path, user action, etc.)
   */
  static error(category, operation, error, context = {}) {
    const errorDetails = this._extractErrorDetails(error);
    const logEntry = {
      level: LogLevel.ERROR,
      category,
      operation,
      timestamp: new Date().toISOString(),
      error: {
        message: errorDetails.message,
        code: errorDetails.code,
        name: errorDetails.name,
        stack: errorDetails.stack,
      },
      context,
    };
    
    log.error(`[${category}] ${operation} failed:`, logEntry);
    return logEntry;
  }

  /**
   * Log a warning with structured context
   * @param {string} category - Warning category
   * @param {string} operation - Operation that generated warning
   * @param {string} message - Warning message
   * @param {Object} context - Additional context
   */
  static warn(category, operation, message, context = {}) {
    const logEntry = {
      level: LogLevel.WARN,
      category,
      operation,
      timestamp: new Date().toISOString(),
      message,
      context,
    };
    
    log.warn(`[${category}] ${operation}:`, logEntry);
    return logEntry;
  }

  /**
   * Log an info message with structured context
   * @param {string} category - Info category
   * @param {string} operation - Operation
   * @param {string} message - Info message
   * @param {Object} context - Additional context
   */
  static info(category, operation, message, context = {}) {
    const logEntry = {
      level: LogLevel.INFO,
      category,
      operation,
      timestamp: new Date().toISOString(),
      message,
      context,
    };
    
    log.info(`[${category}] ${operation}:`, logEntry);
    return logEntry;
  }

  /**
   * Log a debug message with structured context
   * @param {string} category - Debug category
   * @param {string} operation - Operation
   * @param {string} message - Debug message
   * @param {Object} context - Additional context
   */
  static debug(category, operation, message, context = {}) {
    const logEntry = {
      level: LogLevel.DEBUG,
      category,
      operation,
      timestamp: new Date().toISOString(),
      message,
      context,
    };
    
    log.debug(`[${category}] ${operation}:`, logEntry);
    return logEntry;
  }

  /**
   * Extract error details from error object
   * @private
   */
  static _extractErrorDetails(error) {
    if (error instanceof Error) {
      return {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack,
      };
    } else if (typeof error === 'object' && error !== null) {
      return {
        message: error.message || 'Unknown error',
        code: error.code,
        name: error.name || 'Error',
        stack: error.stack,
      };
    } else {
      return {
        message: String(error),
        code: undefined,
        name: 'Error',
        stack: undefined,
      };
    }
  }
}

module.exports = StructuredLogger;
