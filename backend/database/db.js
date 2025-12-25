/**
 * Database Connection and Initialization
 * Uses Supabase (PostgreSQL)
 * 
 * This database supports both products:
 * - Local Password Vault (LPV): product_type='lpv'
 * - Local Legacy Vault (LLV): product_type='llv'
 * 
 * Both products share the same Supabase database and are distinguished by:
 * - License key prefix (PERS/FMLY vs LLVP/LLVF)
 * - product_type field in licenses table
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Initialize database tables from schema
 * Note: Schema should be run manually in Supabase SQL Editor
 */
async function initialize() {
  console.log('✓ Supabase connection initialized');
  console.log('⚠ Note: Run schema.sql manually in Supabase SQL Editor');
}

// =============================================================================
// CUSTOMER OPERATIONS
// =============================================================================

const customers = {
  async create({ email, stripe_customer_id, name }) {
    const { data, error } = await supabase
      .from('customers')
      .insert({ email, stripe_customer_id, name })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async findByEmail(email) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },
  
  async findByStripeId(stripe_customer_id) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('stripe_customer_id', stripe_customer_id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  
  async updateStripeId({ email, stripe_customer_id }) {
    const { data, error } = await supabase
      .from('customers')
      .update({ stripe_customer_id, updated_at: new Date().toISOString() })
      .eq('email', email)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};

// =============================================================================
// LICENSE OPERATIONS
// =============================================================================

const licenses = {
  async create({
    license_key, plan_type, product_type, customer_id, email,
    stripe_payment_id, stripe_checkout_session_id, amount_paid, max_devices
  }) {
    const { data, error } = await supabase
      .from('licenses')
      .insert({
        license_key,
        plan_type,
        product_type,
        customer_id,
        email,
        stripe_payment_id,
        stripe_checkout_session_id,
        amount_paid,
        max_devices
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async findByKey(license_key) {
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', license_key)
      .eq('status', 'active')
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  
  async findByEmail(email) {
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('email', email)
      .eq('status', 'active');
    
    if (error) throw error;
    return data;
  },
  
  async findBySessionId(stripe_checkout_session_id) {
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('stripe_checkout_session_id', stripe_checkout_session_id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  
  async activate({ license_key, hardware_hash }) {
    // First get current value to increment
    const { data: current } = await supabase
      .from('licenses')
      .select('activated_devices')
      .eq('license_key', license_key)
      .single();
    
    const { data, error } = await supabase
      .from('licenses')
      .update({
        is_activated: true,
        hardware_hash,
        activated_at: new Date().toISOString(),
        activated_devices: (current?.activated_devices || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('license_key', license_key)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async getActivatedDevices(license_key) {
    const { data, error } = await supabase
      .from('licenses')
      .select('activated_devices, max_devices')
      .eq('license_key', license_key)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async revoke(license_key) {
    const { data, error } = await supabase
      .from('licenses')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString()
      })
      .eq('license_key', license_key)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};

// =============================================================================
// TRIAL OPERATIONS
// =============================================================================

const trials = {
  async create({ email, trial_key, expires_at }) {
    const { data, error } = await supabase
      .from('trials')
      .insert({ email, trial_key, expires_at })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async findByEmail(email) {
    const { data, error } = await supabase
      .from('trials')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  
  async findByKey(trial_key) {
    const { data, error } = await supabase
      .from('trials')
      .select('*')
      .eq('trial_key', trial_key)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  
  async activate({ trial_key, hardware_hash }) {
    const { data, error } = await supabase
      .from('trials')
      .update({
        is_activated: true,
        hardware_hash,
        activated_at: new Date().toISOString()
      })
      .eq('trial_key', trial_key)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async markConverted({ email, license_id }) {
    const { data, error } = await supabase
      .from('trials')
      .update({
        is_converted: true,
        converted_license_id: license_id
      })
      .eq('email', email)
      .select();
    
    if (error) throw error;
    return data;
  },
};

// =============================================================================
// DEVICE ACTIVATION OPERATIONS
// =============================================================================

const deviceActivations = {
  async create({ license_id, hardware_hash, device_name }) {
    const { data, error } = await supabase
      .from('device_activations')
      .insert({ license_id, hardware_hash, device_name })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async findByLicenseAndHash(license_id, hardware_hash) {
    const { data, error } = await supabase
      .from('device_activations')
      .select('*')
      .eq('license_id', license_id)
      .eq('hardware_hash', hardware_hash)
      .eq('is_active', true)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  
  async countByLicense(license_id) {
    const { count, error } = await supabase
      .from('device_activations')
      .select('*', { count: 'exact', head: true })
      .eq('license_id', license_id)
      .eq('is_active', true);
    
    if (error) throw error;
    return { count: count || 0 };
  },
  
  async updateLastSeen({ license_id, hardware_hash }) {
    const { data, error } = await supabase
      .from('device_activations')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('license_id', license_id)
      .eq('hardware_hash', hardware_hash)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async deactivate(license_id, hardware_hash) {
    const { data, error } = await supabase
      .from('device_activations')
      .update({ is_active: false })
      .eq('license_id', license_id)
      .eq('hardware_hash', hardware_hash)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};

// =============================================================================
// WEBHOOK EVENT OPERATIONS
// =============================================================================

const webhookEvents = {
  async create({ stripe_event_id, event_type, payload }) {
    const { data, error } = await supabase
      .from('webhook_events')
      .insert({
        stripe_event_id,
        event_type,
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload)
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async exists(stripe_event_id) {
    const { data, error } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('stripe_event_id', stripe_event_id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },
  
  async markProcessed(stripe_event_id) {
    const { data, error } = await supabase
      .from('webhook_events')
      .update({ processed: true })
      .eq('stripe_event_id', stripe_event_id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async markError(stripe_event_id, error_message) {
    const { data, error } = await supabase
      .from('webhook_events')
      .update({ error_message })
      .eq('stripe_event_id', stripe_event_id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};

/**
 * Execute a raw SQL query with parameters
 * Note: Supabase doesn't support raw SQL directly from client
 * Use the query builder methods above instead
 * This function is kept for compatibility but should be refactored
 */
async function run(sql, params = []) {
  console.warn('db.run() called with raw SQL. Consider using query builder methods instead.');
  throw new Error('Raw SQL execution not supported with Supabase. Use query builder methods.');
}

module.exports = {
  supabase,
  initialize,
  run,
  customers,
  licenses,
  trials,
  deviceActivations,
  webhookEvents,
};
