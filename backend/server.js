/**
 * Local Password Vault - Backend API Server
 * 
 * Handles:
 * - License key validation and activation
 * - Trial signups
 * - Stripe payment webhooks
 * - Email delivery
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes
const licensesRouter = require('./routes/licenses');
const lpvLicensesRouter = require('./routes/lpv-licenses');
const trialRouter = require('./routes/trial');
const webhooksRouter = require('./routes/webhooks');
const checkoutRouter = require('./routes/checkout');

// Import database
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3001;

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Security headers
app.use(helmet());

// CORS - Allow requests from your frontend domains
const allowedOrigins = [
  'https://localpasswordvault.com',
  'https://www.localpasswordvault.com',
];

// Add localhost only in development
if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push('http://localhost:5173');
  allowedOrigins.push('http://localhost:3000');
}

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting - Protect against abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Parse JSON for most routes
app.use((req, res, next) => {
  // Skip JSON parsing for Stripe webhooks (needs raw body)
  if (req.originalUrl === '/api/webhooks/stripe') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// =============================================================================
// ROUTES
// =============================================================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/licenses', licensesRouter);
app.use('/api/lpv/license', lpvLicensesRouter);  // New LPV license transfer API
app.use('/api/trial', trialRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/checkout', checkoutRouter);

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// =============================================================================
// START SERVER
// =============================================================================

// Initialize database tables
db.initialize();

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Local Password Vault - Backend API                          ║
║                                                               ║
║   Server running on port ${PORT}                                 ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║                                                               ║
║   Endpoints:                                                  ║
║   • POST /api/licenses/validate  - Activate license key       ║
║   • POST /api/lpv/license/activate - LPV license activation   ║
║   • POST /api/lpv/license/transfer - LPV license transfer     ║
║   • POST /api/trial/signup       - Start free trial           ║
║   • POST /api/checkout/session   - Create Stripe checkout     ║
║   • POST /api/webhooks/stripe    - Stripe webhook handler     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;

