-- =============================================================================
-- Local Password Vault & Local Legacy Vault - Database Schema (PostgreSQL for Supabase)
-- =============================================================================
-- This schema supports BOTH products:
-- • Local Password Vault (LPV): Personal $49, Family $79
-- • Local Legacy Vault (LLV): Personal $49, Family $129
-- • Trial signups (7-day free trial) - LPV only
-- • Customer records from Stripe
-- • Hardware-bound activation tracking
-- • Bundle purchases with automatic discounts (LPV + LLV combinations)
-- 
-- Database: Supabase (PostgreSQL) - NO SQLite support
-- =============================================================================

-- Customers table (synced from Stripe)
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT UNIQUE,
    name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- License keys table
CREATE TABLE IF NOT EXISTS licenses (
    id SERIAL PRIMARY KEY,
    license_key TEXT NOT NULL UNIQUE,
    
    -- License type: 'personal', 'family', 'llv_personal', 'llv_family'
    -- Supports both Local Password Vault (LPV) and Local Legacy Vault (LLV)
    plan_type TEXT NOT NULL CHECK (plan_type IN ('personal', 'family', 'llv_personal', 'llv_family')),
    
    -- Product type: 'lpv' (Local Password Vault) or 'llv' (Local Legacy Vault)
    -- Both products use the same Supabase database, distinguished by this field
    product_type TEXT DEFAULT 'lpv' CHECK (product_type IN ('lpv', 'llv')),
    
    -- Customer association
    customer_id INTEGER REFERENCES customers(id),
    email TEXT NOT NULL,
    
    -- Stripe payment info
    stripe_payment_id TEXT,
    stripe_checkout_session_id TEXT,
    amount_paid INTEGER, -- in cents (4900 = $49, 7900 = $79, 12900 = $129)
    
    -- Activation tracking
    is_activated BOOLEAN DEFAULT FALSE,
    hardware_hash TEXT,
    activated_at TIMESTAMP,
    
    -- Current device binding (for LPV single-device model)
    current_device_id TEXT,
    
    -- Activation and transfer tracking
    activation_count INTEGER DEFAULT 0,
    transfer_count INTEGER DEFAULT 0,
    last_activated_at TIMESTAMP,
    last_transfer_at TIMESTAMP,
    
    -- For family plans: track device count (max 5)
    max_devices INTEGER DEFAULT 1,
    activated_devices INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trial signups table
CREATE TABLE IF NOT EXISTS trials (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    trial_key TEXT NOT NULL UNIQUE,
    
    -- Hardware binding (prevents trial abuse)
    hardware_hash TEXT,
    
    -- Trial period (7 days)
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    -- Status tracking
    is_activated BOOLEAN DEFAULT FALSE,
    activated_at TIMESTAMP,
    is_converted BOOLEAN DEFAULT FALSE, -- Did they purchase?
    converted_license_id INTEGER REFERENCES licenses(id),
    
    -- Email tracking (for automated reminders)
    expiring_email_sent BOOLEAN DEFAULT FALSE,  -- 24hr warning sent
    expired_email_sent BOOLEAN DEFAULT FALSE,   -- Expired + discount sent
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Device activations (for family plans with multiple devices)
CREATE TABLE IF NOT EXISTS device_activations (
    id SERIAL PRIMARY KEY,
    license_id INTEGER NOT NULL REFERENCES licenses(id),
    hardware_hash TEXT NOT NULL,
    device_name TEXT,
    activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(license_id, hardware_hash)
);

-- Webhook events log (for debugging Stripe issues)
CREATE TABLE IF NOT EXISTS webhook_events (
    id SERIAL PRIMARY KEY,
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payload TEXT, -- JSON string
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
