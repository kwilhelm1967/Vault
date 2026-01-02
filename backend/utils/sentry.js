/**
 * Sentry Error Tracking Configuration (Backend)
 * 
 * Initializes Sentry for backend error tracking and performance monitoring.
 * Only enabled in production mode.
 */

let Sentry;
let nodeProfilingIntegration;

try {
  Sentry = require('@sentry/node');
  nodeProfilingIntegration = require('@sentry/profiling-node').nodeProfilingIntegration;
} catch (err) {
  console.warn('[Sentry] Sentry modules not available, error tracking disabled:', err.message);
  // Create mock Sentry object
  Sentry = {
    init: () => {},
    Handlers: {
      requestHandler: () => (req, res, next) => next(),
      tracingHandler: () => (req, res, next) => next(),
      errorHandler: () => (err, req, res, next) => next(err),
    },
    setUser: () => {},
    captureException: () => {},
    captureMessage: () => {},
    addBreadcrumb: () => {},
    httpIntegration: () => ({}),
    expressIntegration: () => ({}),
  };
  nodeProfilingIntegration = () => ({});
}

/**
 * Initialize Sentry for error tracking
 */
function initSentry() {
  // If Sentry modules failed to load, skip initialization
  if (!Sentry || typeof Sentry.init !== 'function') {
    console.log('[Sentry] Sentry not available, error tracking disabled');
    return;
  }

  // Only initialize in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Sentry] Error tracking disabled in non-production mode');
    return;
  }

  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    console.warn('[Sentry] DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'production',
    integrations: [
      // Enable HTTP tracing
      Sentry.httpIntegration(),
      // Enable Express integration
      Sentry.expressIntegration(),
      // Enable profiling
      nodeProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions
    profilesSampleRate: 0.1, // 10% of transactions
    
    // Filter out sensitive data
    beforeSend(event, hint) {
      // Don't send events in development
      if (process.env.NODE_ENV !== 'production') {
        return null;
      }

      // Remove sensitive data from request
      if (event.request) {
        // Remove passwords, license keys, API keys, etc.
        if (event.request.data) {
          const sensitiveKeys = [
            'password',
            'license_key',
            'device_id',
            'masterPassword',
            'api_key',
            'secret',
            'token',
            'stripe_secret',
            'jwt_secret', // Legacy endpoint only
            'license_signing_secret',
          ];
          
          sensitiveKeys.forEach(key => {
            if (event.request.data[key]) {
              event.request.data[key] = '[REDACTED]';
            }
          });
        }

        // Remove sensitive headers
        if (event.request.headers) {
          const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie'];
          sensitiveHeaders.forEach(header => {
            if (event.request.headers[header]) {
              event.request.headers[header] = '[REDACTED]';
            }
          });
        }

        // Remove sensitive query params
        if (event.request.query_string) {
          const sensitiveParams = ['key', 'token', 'password', 'secret'];
          sensitiveParams.forEach(param => {
            if (event.request.query_string.includes(param)) {
              event.request.query_string = '[REDACTED]';
            }
          });
        }
      }

      // Remove sensitive data from user context
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
      }

      // Remove sensitive data from extra context
      if (event.extra) {
        const sensitiveExtra = ['password', 'license_key', 'device_id', 'api_key'];
        sensitiveExtra.forEach(key => {
          if (event.extra[key]) {
            event.extra[key] = '[REDACTED]';
          }
        });
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Expected network errors
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      // User cancellations
      'AbortError',
    ],
  });

  console.log('[Sentry] Error tracking initialized');
}

/**
 * Set user context for Sentry
 */
function setSentryUser(userId, metadata = {}) {
  if (process.env.NODE_ENV !== 'production') return;

  Sentry.setUser({
    id: userId,
    // Don't include email or other PII
    ...metadata,
  });
}

/**
 * Clear user context
 */
function clearSentryUser() {
  if (process.env.NODE_ENV !== 'production') return;
  Sentry.setUser(null);
}

/**
 * Capture exception manually
 */
function captureException(error, context = {}) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Sentry] Error (not sent in dev):', error, context);
    return;
  }

  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

/**
 * Capture message manually
 */
function captureMessage(message, level = 'info', context = {}) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Sentry] Message (not sent in dev): ${message}`, context);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    contexts: {
      custom: context,
    },
  });
}

/**
 * Add breadcrumb for debugging
 */
function addBreadcrumb(message, category, level = 'info', data = {}) {
  if (process.env.NODE_ENV !== 'production') return;

  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

module.exports = {
  initSentry,
  setSentryUser,
  clearSentryUser,
  captureException,
  captureMessage,
  addBreadcrumb,
  Sentry, // Export Sentry for middleware
};

