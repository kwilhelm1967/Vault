require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const licensesRouter = require('./routes/licenses');
const lpvLicensesRouter = require('./routes/lpv-licenses');
const trialRouter = require('./routes/trial');
const webhooksRouter = require('./routes/webhooks');
const checkoutRouter = require('./routes/checkout');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());

const allowedOrigins = [
  'https://localpasswordvault.com',
  'https://www.localpasswordvault.com',
];

if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push('http://localhost:5173', 'http://localhost:3000');
}

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// Webhook endpoint needs raw body for Stripe signature verification
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhooks/stripe') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.use('/api/licenses', licensesRouter);
app.use('/api/lpv/license', lpvLicensesRouter);
app.use('/api/trial', trialRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/checkout', checkoutRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

db.initialize().catch(err => {
  console.error('Database initialization warning:', err.message);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

module.exports = app;

