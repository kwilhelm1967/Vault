/**
 * Structured Error Logging Utility for Backend
 * 
 * Provides consistent, structured error logging with context, error codes,
 * and optional error tracking service integration.
 */

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
    this.errorHistory = [];
    this.MAX_HISTORY = 100;
  }

  /**
   * Log levels: error, warn, info, debug
   */
  shouldLog(level) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    return levels[level] <= levels[this.logLevel];
  }

  /**
   * Create structured log entry
   */
  createLogEntry(level, message, context = {}, error = null) {
    // Extract request ID from context if available
    const requestId = context.requestId || context.req?.requestId || null;
    
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId, // Include request ID for tracing
      context: {
        ...context,
        environment: process.env.NODE_ENV || 'development',
        service: 'local-password-vault-backend',
      },
    };
    
    // Remove requestId from context to avoid duplication
    if (entry.context.requestId) {
      delete entry.context.requestId;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
      };
    }

    return entry;
  }

  /**
   * Log error with full context
   */
  error(message, error = null, context = {}) {
    if (!this.shouldLog('error')) return;

    const entry = this.createLogEntry('error', message, context, error);
    
    // Add to history
    this.errorHistory.push(entry);
    if (this.errorHistory.length > this.MAX_HISTORY) {
      this.errorHistory.shift();
    }

    // Console output
    console.error(`[ERROR] ${message}`, {
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
      } : null,
      timestamp: entry.timestamp,
    });

    // In production, could send to error tracking service
    // Example: this.sendToErrorTracking(entry);
  }

  /**
   * Log warning
   */
  warn(message, context = {}) {
    if (!this.shouldLog('warn')) return;

    const entry = this.createLogEntry('warn', message, context);
    console.warn(`[WARN] ${message}`, { context, timestamp: entry.timestamp });
  }

  /**
   * Log info
   */
  info(message, context = {}) {
    if (!this.shouldLog('info')) return;

    const entry = this.createLogEntry('info', message, context);
    console.log(`[INFO] ${message}`, context);
  }

  /**
   * Log debug (only in development)
   */
  debug(message, context = {}) {
    if (!this.shouldLog('debug')) return;

    const entry = this.createLogEntry('debug', message, context);
    console.log(`[DEBUG] ${message}`, context);
  }

  /**
   * Log webhook event
   */
  webhook(eventType, eventId, context = {}) {
    this.info(`Webhook received: ${eventType}`, {
      eventId,
      eventType,
      ...context,
    });
  }

  /**
   * Log webhook error
   */
  webhookError(eventType, eventId, error, context = {}) {
    this.error(`Webhook processing failed: ${eventType}`, error, {
      eventId,
      eventType,
      ...context,
    });
  }

  /**
   * Log database operation
   */
  db(operation, table, context = {}) {
    this.debug(`DB ${operation}: ${table}`, context);
  }

  /**
   * Log database error
   */
  dbError(operation, table, error, context = {}) {
    this.error(`DB ${operation} failed: ${table}`, error, context);
  }

  /**
   * Log email operation
   */
  email(operation, recipient, context = {}) {
    this.info(`Email ${operation}`, {
      recipient: this.maskEmail(recipient),
      ...context,
    });
  }

  /**
   * Log email error
   */
  emailError(operation, recipient, error, context = {}) {
    this.error(`Email ${operation} failed`, error, {
      recipient: this.maskEmail(recipient),
      ...context,
    });
  }

  /**
   * Mask email for privacy (show only first 3 chars and domain)
   */
  maskEmail(email) {
    if (!email || typeof email !== 'string') return 'unknown';
    const [local, domain] = email.split('@');
    if (!domain) return email;
    return `${local.substring(0, 3)}***@${domain}`;
  }

  /**
   * Get recent error history
   */
  getErrorHistory(limit = 10) {
    return this.errorHistory.slice(-limit);
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const errors = this.errorHistory;
    const byLevel = {};
    const byContext = {};

    errors.forEach(entry => {
      byLevel[entry.level] = (byLevel[entry.level] || 0) + 1;
      if (entry.context?.operation) {
        byContext[entry.context.operation] = (byContext[entry.context.operation] || 0) + 1;
      }
    });

    return {
      total: errors.length,
      byLevel,
      byContext,
      recent: errors.slice(-5),
    };
  }
}

// Export singleton instance
module.exports = new Logger();





