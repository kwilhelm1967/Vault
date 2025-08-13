-- Database Schema for License Management
-- Choose the database that fits your needs

-- ============================================================================
-- POSTGRESQL SCHEMA
-- ============================================================================

-- Create licenses table
CREATE TABLE licenses (
    id SERIAL PRIMARY KEY,
    license_key VARCHAR(19) UNIQUE NOT NULL,
    license_type VARCHAR(20) NOT NULL CHECK (license_type IN ('pro', 'family', 'business', 'single')),
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    price DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    hardware_id VARCHAR(64),
    notes TEXT,
    order_id VARCHAR(255),
    payment_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    metadata JSONB
);

-- Create indexes for better performance
CREATE INDEX idx_licenses_key ON licenses(license_key);
CREATE INDEX idx_licenses_email ON licenses(customer_email);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_hardware ON licenses(hardware_id);
CREATE INDEX idx_licenses_created ON licenses(created_at);

-- Create license usage tracking table
CREATE TABLE license_usage (
    id SERIAL PRIMARY KEY,
    license_key VARCHAR(19) REFERENCES licenses(license_key),
    hardware_id VARCHAR(64),
    ip_address INET,
    user_agent TEXT,
    app_version VARCHAR(20),
    platform VARCHAR(50),
    action VARCHAR(50), -- 'activate', 'validate', 'deactivate'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_license ON license_usage(license_key);
CREATE INDEX idx_usage_hardware ON license_usage(hardware_id);
CREATE INDEX idx_usage_created ON license_usage(created_at);

-- Create sales statistics view
CREATE VIEW license_stats AS
SELECT 
    license_type,
    COUNT(*) as total_licenses,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_licenses,
    COUNT(CASE WHEN activated_at IS NOT NULL THEN 1 END) as used_licenses,
    SUM(price) as total_revenue,
    AVG(price) as avg_price,
    MIN(created_at) as first_sale,
    MAX(created_at) as last_sale
FROM licenses 
GROUP BY license_type;

-- ============================================================================
-- MYSQL SCHEMA
-- ============================================================================

-- Create licenses table (MySQL version)
CREATE TABLE licenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    license_key VARCHAR(19) UNIQUE NOT NULL,
    license_type ENUM('pro', 'family', 'business') NOT NULL,
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    price DECIMAL(10,2),
    status ENUM('active', 'revoked', 'expired') DEFAULT 'active',
    hardware_id VARCHAR(64),
    notes TEXT,
    order_id VARCHAR(255),
    payment_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP NULL,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    metadata JSON
);

-- Create indexes
CREATE INDEX idx_licenses_key ON licenses(license_key);
CREATE INDEX idx_licenses_email ON licenses(customer_email);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_hardware ON licenses(hardware_id);
CREATE INDEX idx_licenses_created ON licenses(created_at);

-- ============================================================================
-- SQLITE SCHEMA (for simple deployments)
-- ============================================================================

-- Create licenses table (SQLite version)
CREATE TABLE licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_key TEXT UNIQUE NOT NULL,
    license_type TEXT NOT NULL CHECK (license_type IN ('pro', 'family', 'business')),
    customer_email TEXT,
    customer_name TEXT,
    price REAL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    hardware_id TEXT,
    notes TEXT,
    order_id TEXT,
    payment_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    activated_at DATETIME,
    last_used_at DATETIME,
    expires_at DATETIME,
    metadata TEXT -- JSON as text in SQLite
);

-- Create indexes
CREATE INDEX idx_licenses_key ON licenses(license_key);
CREATE INDEX idx_licenses_email ON licenses(customer_email);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_hardware ON licenses(hardware_id);

-- ============================================================================
-- MONGODB SCHEMA (using Mongoose)
-- ============================================================================

/*
// License Schema for MongoDB (Node.js/Mongoose)
const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
    licenseKey: {
        type: String,
        required: true,
        unique: true,
        match: /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
    },
    licenseType: {
        type: String,
        required: true,
        enum: ['pro', 'family', 'business']
    },
    customerEmail: {
        type: String,
        lowercase: true,
        trim: true
    },
    customerName: String,
    price: {
        type: Number,
        min: 0
    },
    status: {
        type: String,
        enum: ['active', 'revoked', 'expired'],
        default: 'active'
    },
    hardwareId: String,
    notes: String,
    orderId: String,
    paymentId: String,
    activatedAt: Date,
    lastUsedAt: Date,
    expiresAt: Date,
    metadata: mongoose.Schema.Types.Mixed
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Indexes
licenseSchema.index({ licenseKey: 1 });
licenseSchema.index({ customerEmail: 1 });
licenseSchema.index({ status: 1 });
licenseSchema.index({ hardwareId: 1 });
licenseSchema.index({ createdAt: -1 });

// Usage tracking schema
const usageSchema = new mongoose.Schema({
    licenseKey: {
        type: String,
        required: true,
        ref: 'License'
    },
    hardwareId: String,
    ipAddress: String,
    userAgent: String,
    appVersion: String,
    platform: String,
    action: {
        type: String,
        enum: ['activate', 'validate', 'deactivate']
    }
}, {
    timestamps: true
});

module.exports = {
    License: mongoose.model('License', licenseSchema),
    Usage: mongoose.model('Usage', usageSchema)
};
*/

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Insert a new license
INSERT INTO licenses (license_key, license_type, customer_email, price, notes)
VALUES ('ABCD-EFGH-IJKL-MNOP', 'pro', 'customer@example.com', 29.99, 'Generated via Stripe webhook');

-- Find license by key
SELECT * FROM licenses WHERE license_key = 'ABCD-EFGH-IJKL-MNOP';

-- Update hardware binding
UPDATE licenses 
SET hardware_id = 'hw_12345', activated_at = CURRENT_TIMESTAMP 
WHERE license_key = 'ABCD-EFGH-IJKL-MNOP';

-- Get customer's licenses
SELECT license_key, license_type, status, created_at 
FROM licenses 
WHERE customer_email = 'customer@example.com' 
ORDER BY created_at DESC;

-- Get sales statistics
SELECT 
    license_type,
    COUNT(*) as total_sold,
    SUM(price) as revenue,
    COUNT(CASE WHEN activated_at IS NOT NULL THEN 1 END) as activated
FROM licenses 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY license_type;

-- Find unused licenses
SELECT license_key, license_type, created_at 
FROM licenses 
WHERE activated_at IS NULL 
AND status = 'active'
ORDER BY created_at DESC;

-- Revoke a license
UPDATE licenses 
SET status = 'revoked', hardware_id = NULL 
WHERE license_key = 'ABCD-EFGH-IJKL-MNOP';

-- Clean up old usage logs (keep last 90 days)
DELETE FROM license_usage 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- ============================================================================
-- BACKUP AND MAINTENANCE
-- ============================================================================

-- PostgreSQL backup command
-- pg_dump -h localhost -U username -d database_name -t licenses -t license_usage > backup.sql

-- MySQL backup command  
-- mysqldump -u username -p database_name licenses license_usage > backup.sql

-- SQLite backup command
-- sqlite3 database.db ".backup backup.db"

-- Restore commands are similar but use psql, mysql, or sqlite3 respectively