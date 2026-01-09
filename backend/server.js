require('dotenv').config();

// Validate environment variables BEFORE anything else
const { validateAndLog } = require('./utils/envValidator');
validateAndLog();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const performanceMonitor = require('./utils/performanceMonitor');
const { initSentry, Sentry, captureException } = require('./utils/sentry');

// Initialize Sentry BEFORE other middleware
initSentry();

const licensesRouter = require('./routes/licenses');
const lpvLicensesRouter = require('./routes/lpv-licenses');
const trialRouter = require('./routes/trial');
const webhooksRouter = require('./routes/webhooks');
const checkoutRouter = require('./routes/checkout');
const ticketsRouter = require('./routes/tickets');
const adminRouter = require('./routes/admin');
const testRouter = require('./routes/test');
const db = require('./database/db');
const { stripe } = require('./services/stripe');

const app = express();
const PORT = process.env.PORT || 3001;

// Sentry request handler must be first (only if Sentry is available)
if (Sentry && Sentry.Handlers && Sentry.Handlers.requestHandler) {
  app.use(Sentry.Handlers.requestHandler());
  // Tracing handler
  if (Sentry.Handlers.tracingHandler) {
    app.use(Sentry.Handlers.tracingHandler());
  }
}

app.use(helmet());

const allowedOrigins = [
  'https://localpasswordvault.com',
  'https://www.localpasswordvault.com',
  'https://locallegacyvault.com',
  'https://www.locallegacyvault.com',
];

// Allow localhost origins for development/testing
if (process.env.NODE_ENV === 'development' || process.env.ALLOW_LOCALHOST === 'true') {
  allowedOrigins.push(
    'http://localhost:5173', 
    'http://localhost:3000', 
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  );
}

// Allow Electron app requests (file:// and electron:// protocols)
// Electron apps don't send Origin header, so we need to allow requests without origin
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like Electron apps, mobile apps, or curl)
    if (!origin) {
      return callback(null, true);
    }
    // Allow localhost origins for local development/testing (regardless of NODE_ENV)
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    // Allow requests from allowed origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
};

app.use(cors(corsOptions));

// General API rate limit (less strict)
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// Stricter rate limits for sensitive endpoints
const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const activationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many activation attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Request ID middleware - generates unique ID for each request
app.use((req, res, next) => {
  // Generate unique request ID
  const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Attach to logger context
  req.loggerContext = { requestId };
  
  next();
});

// Performance monitoring middleware (tracks response times - NO customer data)
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Track response time after response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    performanceMonitor.trackRequest(req.method, req.path, res.statusCode, duration);
  });
  
  next();
});

// Webhook endpoint needs raw body for Stripe signature verification
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhooks/stripe') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks: {
      database: 'unknown',
      stripe: 'unknown',
    },
  };
  
  // Check database connectivity
  try {
    await db.customers.findByEmail('health-check@test.local');
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'degraded';
    health.databaseError = error.message;
  }
  
  // Check Stripe connectivity
  try {
    await stripe.products.list({ limit: 1 });
    health.checks.stripe = 'ok';
  } catch (error) {
    health.checks.stripe = 'error';
    health.status = 'degraded';
    health.stripeError = error.message;
  }
  
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Performance metrics endpoint (NO customer data)
app.get('/metrics', (req, res) => {
  // Optional: Add basic auth or IP whitelist for production
  const summary = performanceMonitor.getSummary();
  res.json({
    timestamp: new Date().toISOString(),
    metrics: summary,
  });
});

// Deployment endpoint - allows server to update itself
// SECURITY: Only allow from localhost or specific IPs
app.post('/api/deploy', async (req, res) => {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  // Basic security: Check if request is from localhost or trusted IP
  const clientIp = req.ip || req.connection.remoteAddress;
  const isLocalhost = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';
  
  // Allow localhost or specific secret token
  const deployToken = req.headers['x-deploy-token'] || req.body?.token;
  const validToken = process.env.DEPLOY_TOKEN;
  
  if (!isLocalhost && (!validToken || deployToken !== validToken)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  try {
    logger.info('Deployment triggered', { clientIp, requestId: req.requestId });
    
    // Change to backend directory
    const backendPath = __dirname;
    
    // Pull latest code
    const { stdout: pullOutput, stderr: pullError } = await execAsync('git pull origin main', { cwd: backendPath });
    logger.info('Git pull completed', { output: pullOutput, error: pullError, requestId: req.requestId });
    
    // Restart PM2 process
    const { stdout: restartOutput, stderr: restartError } = await execAsync('pm2 restart lpv-api', { cwd: backendPath });
    logger.info('PM2 restart completed', { output: restartOutput, error: restartError, requestId: req.requestId });
    
    res.json({
      success: true,
      message: 'Deployment completed',
      pull: { output: pullOutput, error: pullError },
      restart: { output: restartOutput, error: restartError },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Deployment failed', error, { requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Apply rate limiting to specific routes
app.use('/api/licenses', licensesRouter);
app.use('/api/lpv/license/activate', activationRateLimit);
app.use('/api/lpv/license/transfer', strictRateLimit);
app.use('/api/lpv/license', lpvLicensesRouter);
app.use('/api/trial', strictRateLimit, trialRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/checkout', strictRateLimit, checkoutRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/test', testRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Sentry error handler must be before other error handlers
// Sentry error handler (only if Sentry is available)
if (Sentry && Sentry.Handlers && Sentry.Handlers.errorHandler) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use((err, req, res, next) => {
  // Log error
  logger.error('Server error', err, {
    path: req.path,
    method: req.method,
    operation: 'server_error_handler',
    requestId: req.requestId,
  });

  // Send to Sentry (already handled by logger.error, but keep for explicit tracking)
  captureException(err, {
    path: req.path,
    requestId: req.requestId,
    method: req.method,
    operation: 'server_error_handler',
  });

  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

db.initialize().catch(err => {
  logger.warn('Database initialization warning', {
    message: err.message,
    operation: 'database_init',
  });
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    operation: 'server_start',
  });
});

module.exports = app;

