-- =============================================================================
-- Local Password Vault - Database Schema
-- =============================================================================
-- This schema supports:
-- • License key management (Personal $49, Family $79)
-- • Trial signups (7-day free trial)
-- • Customer records from Stripe
-- • Hardware-bound activation tracking
-- =============================================================================

-- Customers table (synced from Stripe)
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT UNIQUE,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- License keys table
CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_key TEXT NOT NULL UNIQUE,
    
    -- License type: 'personal' ($49) or 'family' ($79)
    plan_type TEXT NOT NULL CHECK (plan_type IN ('personal', 'family')),
    
    -- Customer association
    customer_id INTEGER REFERENCES customers(id),
    email TEXT NOT NULL,
    
    -- Stripe payment info
    stripe_payment_id TEXT,
    stripe_checkout_session_id TEXT,
    amount_paid INTEGER, -- in cents (4900 = $49, 7900 = $79)
    
    -- Activation tracking
    is_activated BOOLEAN DEFAULT FALSE,
    hardware_hash TEXT,
    activated_at DATETIME,
    
    -- For family plans: track device count (max 5)
    max_devices INTEGER DEFAULT 1,
    activated_devices INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trial signups table
CREATE TABLE IF NOT EXISTS trials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    trial_key TEXT NOT NULL UNIQUE,
    
    -- Hardware binding (prevents trial abuse)
    hardware_hash TEXT,
    
    -- Trial period (7 days)
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    
    -- Status tracking
    is_activated BOOLEAN DEFAULT FALSE,
    activated_at DATETIME,
    is_converted BOOLEAN DEFAULT FALSE, -- Did they purchase?
    converted_license_id INTEGER REFERENCES licenses(id),
    
    -- Email tracking (for automated reminders)
    expiring_email_sent BOOLEAN DEFAULT FALSE,  -- 24hr warning sent
    expired_email_sent BOOLEAN DEFAULT FALSE,   -- Expired + discount sent
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Device activations (for family plans with multiple devices)
CREATE TABLE IF NOT EXISTS device_activations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_id INTEGER NOT NULL REFERENCES licenses(id),
    hardware_hash TEXT NOT NULL,
    device_name TEXT,
    activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(license_id, hardware_hash)
);

-- Webhook events log (for debugging Stripe issues)
CREATE TABLE IF NOT EXISTS webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payload TEXT, -- JSON string
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INDEXES for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(email);
CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_stripe_session ON licenses(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_trials_email ON trials(email);
CREATE INDEX IF NOT EXISTS idx_trials_key ON trials(trial_key);
CREATE INDEX IF NOT EXISTS idx_device_activations_license ON device_activations(license_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);

-- =============================================================================
-- SAMPLE DATA (for testing - remove in production)
-- =============================================================================

-- Test customer
-- INSERT OR IGNORE INTO customers (email, name) VALUES ('test@example.com', 'Test User');

-- Test license key (Personal plan)
-- INSERT OR IGNORE INTO licenses (license_key, plan_type, email, amount_paid, max_devices)
-- VALUES ('TEST-1234-ABCD-5678', 'personal', 'test@example.com', 4900, 1);

-- Test license key (Family plan - 5 devices)
-- INSERT OR IGNORE INTO licenses (license_key, plan_type, email, amount_paid, max_devices)
-- VALUES ('FAMILY-1234-ABCD-5678', 'family', 'test@example.com', 7900, 5);

