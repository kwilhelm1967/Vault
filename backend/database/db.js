/**
 * Database Connection and Initialization
 * Uses SQLite for simplicity - can be swapped for PostgreSQL in production
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Database file path
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'vault.db');

// Create database connection
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

/**
 * Initialize database tables from schema
 */
function initialize() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  
  // Execute schema (split by semicolons and run each statement)
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  for (const statement of statements) {
    try {
      db.exec(statement);
    } catch (error) {
      // Ignore "table already exists" errors
      if (!error.message.includes('already exists')) {
        console.error('Schema error:', error.message);
      }
    }
  }
  
  console.log('✓ Database initialized');
}

// =============================================================================
// CUSTOMER OPERATIONS
// =============================================================================

const customers = {
  create: db.prepare(`
    INSERT INTO customers (email, stripe_customer_id, name)
    VALUES (@email, @stripe_customer_id, @name)
  `),
  
  findByEmail: db.prepare(`
    SELECT * FROM customers WHERE email = ?
  `),
  
  findByStripeId: db.prepare(`
    SELECT * FROM customers WHERE stripe_customer_id = ?
  `),
  
  updateStripeId: db.prepare(`
    UPDATE customers SET stripe_customer_id = @stripe_customer_id, updated_at = CURRENT_TIMESTAMP
    WHERE email = @email
  `),
};

// =============================================================================
// LICENSE OPERATIONS
// =============================================================================

const licenses = {
  create: db.prepare(`
    INSERT INTO licenses (
      license_key, plan_type, product_type, customer_id, email, 
      stripe_payment_id, stripe_checkout_session_id, amount_paid, max_devices
    )
    VALUES (
      @license_key, @plan_type, @product_type, @customer_id, @email,
      @stripe_payment_id, @stripe_checkout_session_id, @amount_paid, @max_devices
    )
  `),
  
  findByKey: db.prepare(`
    SELECT * FROM licenses WHERE license_key = ? AND status = 'active'
  `),
  
  findByEmail: db.prepare(`
    SELECT * FROM licenses WHERE email = ? AND status = 'active'
  `),
  
  findBySessionId: db.prepare(`
    SELECT * FROM licenses WHERE stripe_checkout_session_id = ?
  `),
  
  activate: db.prepare(`
    UPDATE licenses 
    SET is_activated = TRUE, hardware_hash = @hardware_hash, 
        activated_at = CURRENT_TIMESTAMP, activated_devices = activated_devices + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE license_key = @license_key
  `),
  
  getActivatedDevices: db.prepare(`
    SELECT activated_devices, max_devices FROM licenses WHERE license_key = ?
  `),
  
  revoke: db.prepare(`
    UPDATE licenses SET status = 'revoked', updated_at = CURRENT_TIMESTAMP
    WHERE license_key = ?
  `),
};

// =============================================================================
// TRIAL OPERATIONS
// =============================================================================

const trials = {
  create: db.prepare(`
    INSERT INTO trials (email, trial_key, expires_at)
    VALUES (@email, @trial_key, @expires_at)
  `),
  
  findByEmail: db.prepare(`
    SELECT * FROM trials WHERE email = ?
  `),
  
  findByKey: db.prepare(`
    SELECT * FROM trials WHERE trial_key = ?
  `),
  
  activate: db.prepare(`
    UPDATE trials 
    SET is_activated = TRUE, hardware_hash = @hardware_hash, activated_at = CURRENT_TIMESTAMP
    WHERE trial_key = @trial_key
  `),
  
  markConverted: db.prepare(`
    UPDATE trials 
    SET is_converted = TRUE, converted_license_id = @license_id
    WHERE email = @email
  `),
};

// =============================================================================
// DEVICE ACTIVATION OPERATIONS
// =============================================================================

const deviceActivations = {
  create: db.prepare(`
    INSERT INTO device_activations (license_id, hardware_hash, device_name)
    VALUES (@license_id, @hardware_hash, @device_name)
  `),
  
  findByLicenseAndHash: db.prepare(`
    SELECT * FROM device_activations 
    WHERE license_id = ? AND hardware_hash = ? AND is_active = TRUE
  `),
  
  countByLicense: db.prepare(`
    SELECT COUNT(*) as count FROM device_activations 
    WHERE license_id = ? AND is_active = TRUE
  `),
  
  updateLastSeen: db.prepare(`
    UPDATE device_activations 
    SET last_seen_at = CURRENT_TIMESTAMP
    WHERE license_id = @license_id AND hardware_hash = @hardware_hash
  `),
  
  deactivate: db.prepare(`
    UPDATE device_activations 
    SET is_active = FALSE
    WHERE license_id = ? AND hardware_hash = ?
  `),
};

// =============================================================================
// WEBHOOK EVENT OPERATIONS
// =============================================================================

const webhookEvents = {
  create: db.prepare(`
    INSERT INTO webhook_events (stripe_event_id, event_type, payload)
    VALUES (@stripe_event_id, @event_type, @payload)
  `),
  
  exists: db.prepare(`
    SELECT 1 FROM webhook_events WHERE stripe_event_id = ?
  `),
  
  markProcessed: db.prepare(`
    UPDATE webhook_events 
    SET processed = TRUE
    WHERE stripe_event_id = ?
  `),
  
  markError: db.prepare(`
    UPDATE webhook_events 
    SET error_message = ?
    WHERE stripe_event_id = ?
  `),
};

/**
 * Execute a raw SQL query with parameters
 * Used for dynamic queries that can't be prepared
 */
function run(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  } catch (error) {
    console.error('SQL execution error:', error);
    throw error;
  }
}

module.exports = {
  db,
  initialize,
  run,
  customers,
  licenses,
  trials,
  deviceActivations,
  webhookEvents,
};

