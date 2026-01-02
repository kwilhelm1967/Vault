const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const logger = require('../utils/logger');

async function initialize() {
  logger.info('Supabase connection initialized', {
    operation: 'db_init',
    service: 'supabase',
  });
  logger.warn('Run schema.sql manually in Supabase SQL Editor', {
    operation: 'db_init',
    service: 'supabase',
  });
}

// Performance monitoring (tracks query times - NO customer data)
const performanceMonitor = require('../utils/performanceMonitor');

const customers = {
  async create({ email, stripe_customer_id, name }) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('customers')
      .insert({ email, stripe_customer_id, name })
      .select()
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('insert', 'customers', duration);
    
    if (error) throw error;
    return data;
  },
  
  async findByEmail(email) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'customers', duration);
    
    // PGRST116 = not found (expected, don't throw)
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  
  async findByStripeId(stripe_customer_id) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('stripe_customer_id', stripe_customer_id)
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'customers', duration);
    
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
  
  async findAll() {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'customers', duration);
    
    if (error) throw error;
    return data || [];
  },
};


const licenses = {
  async create({
    license_key, plan_type, product_type, customer_id, email,
    stripe_payment_id, stripe_checkout_session_id, amount_paid, max_devices
  }) {
    const startTime = Date.now();
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
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('insert', 'licenses', duration);
    
    if (error) throw error;
    return data;
  },
  
  async findByKey(license_key) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', license_key)
      .eq('status', 'active')
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'licenses', duration);
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  
  async findByEmail(email) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('email', email)
      .eq('status', 'active');
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'licenses', duration);
    
    if (error) throw error;
    return data;
  },
  
  async findBySessionId(stripe_checkout_session_id) {
    const startTime = Date.now();
    // Returns single license (for single purchases)
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('stripe_checkout_session_id', stripe_checkout_session_id)
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'licenses', duration);
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  
  async findAllBySessionId(stripe_checkout_session_id) {
    const startTime = Date.now();
    // Returns all licenses for a session (for bundles)
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('stripe_checkout_session_id', stripe_checkout_session_id)
      .order('created_at', { ascending: true });
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'licenses', duration);
    
    if (error) throw error;
    return data || [];
  },
  
  async activate({ license_key, hardware_hash }) {
    const startTime = Date.now();
    // Get current count before incrementing
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
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('update', 'licenses', duration);
    
    if (error) throw error;
    return data;
  },
  
  async getActivatedDevices(license_key) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('licenses')
      .select('activated_devices, max_devices')
      .eq('license_key', license_key)
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'licenses', duration);
    
    if (error) throw error;
    return data;
  },
  
  async revoke(license_key) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('licenses')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString()
      })
      .eq('license_key', license_key)
      .select()
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('update', 'licenses', duration);
    
    if (error) throw error;
    return data;
  },
  
  async findAll() {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .order('created_at', { ascending: false });
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'licenses', duration);
    
    if (error) throw error;
    return data || [];
  },
  
  async findAllByEmail(email) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false });
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'licenses', duration);
    
    if (error) throw error;
    return data || [];
  },
};


const trials = {
  async create({ email, trial_key, expires_at }) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('trials')
      .insert({ email, trial_key, expires_at })
      .select()
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('insert', 'trials', duration);
    
    if (error) throw error;
    return data;
  },
  
  async findByEmail(email) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('trials')
      .select('*')
      .eq('email', email)
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'trials', duration);
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  
  async findByKey(trial_key) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('trials')
      .select('*')
      .eq('trial_key', trial_key)
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'trials', duration);
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  
  async activate({ trial_key, hardware_hash }) {
    const startTime = Date.now();
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
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('update', 'trials', duration);
    
    if (error) throw error;
    return data;
  },
  
  async markConverted({ email, license_id }) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('trials')
      .update({
        is_converted: true,
        converted_license_id: license_id
      })
      .eq('email', email)
      .select();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('update', 'trials', duration);
    
    if (error) throw error;
    return data;
  },
  
  async findAll() {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('trials')
      .select('*')
      .order('created_at', { ascending: false });
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'trials', duration);
    
    if (error) throw error;
    return data || [];
  },
};


const deviceActivations = {
  async create({ license_id, hardware_hash, device_name }) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('device_activations')
      .insert({ license_id, hardware_hash, device_name })
      .select()
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('insert', 'device_activations', duration);
    
    if (error) throw error;
    return data;
  },
  
  async findByLicenseAndHash(license_id, hardware_hash) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('device_activations')
      .select('*')
      .eq('license_id', license_id)
      .eq('hardware_hash', hardware_hash)
      .eq('is_active', true)
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'device_activations', duration);
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  
  async countByLicense(license_id) {
    const startTime = Date.now();
    const { count, error } = await supabase
      .from('device_activations')
      .select('*', { count: 'exact', head: true })
      .eq('license_id', license_id)
      .eq('is_active', true);
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'device_activations', duration);
    
    if (error) throw error;
    return { count: count || 0 };
  },
  
  async findAllByLicense(license_id) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('device_activations')
      .select('*')
      .eq('license_id', license_id)
      .eq('is_active', true)
      .order('last_seen_at', { ascending: false });
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'device_activations', duration);
    
    if (error) throw error;
    return data || [];
  },
  
  async updateLastSeen({ license_id, hardware_hash }) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('device_activations')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('license_id', license_id)
      .eq('hardware_hash', hardware_hash)
      .select()
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('update', 'device_activations', duration);
    
    if (error) throw error;
    return data;
  },
  
  async deactivate(license_id, hardware_hash) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('device_activations')
      .update({ is_active: false })
      .eq('license_id', license_id)
      .eq('hardware_hash', hardware_hash)
      .select()
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('update', 'device_activations', duration);
    
    if (error) throw error;
    return data;
  },
};


const webhookEvents = {
  async create({ stripe_event_id, event_type, payload }) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('webhook_events')
      .insert({
        stripe_event_id,
        event_type,
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload)
      })
      .select()
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('insert', 'webhook_events', duration);
    
    if (error) throw error;
    return data;
  },
  
  async exists(stripe_event_id) {
    const startTime = Date.now();
    // Check if webhook event was already processed (idempotency)
    const { data, error } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('stripe_event_id', stripe_event_id)
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'webhook_events', duration);
    
    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },
  
  async markProcessed(stripe_event_id) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('webhook_events')
      .update({ processed: true })
      .eq('stripe_event_id', stripe_event_id)
      .select()
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('update', 'webhook_events', duration);
    
    if (error) throw error;
    return data;
  },
  
  async markError(stripe_event_id, error_message) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('webhook_events')
      .update({ error_message })
      .eq('stripe_event_id', stripe_event_id)
      .select()
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('update', 'webhook_events', duration);
    
    if (error) throw error;
    return data;
  },
  
  async findFailed() {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('processed', false)
      .not('error_message', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'webhook_events', duration);
    
    if (error) throw error;
    return data || [];
  },
  
  async findByEventId(stripe_event_id) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('stripe_event_id', stripe_event_id)
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'webhook_events', duration);
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
};

const supportTickets = {
  async create({
    ticket_number, email, name, customer_id, subject, description,
    category, priority, license_key, license_id
  }) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        ticket_number,
        email,
        name,
        customer_id,
        subject,
        description,
        category,
        priority,
        license_key,
        license_id,
      })
      .select()
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('insert', 'support_tickets', duration);
    
    if (error) throw error;
    return data;
  },
  
  async findByNumber(ticket_number) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('ticket_number', ticket_number)
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'support_tickets', duration);
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  
  async findByEmail(email) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false });
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'support_tickets', duration);
    
    if (error) throw error;
    return data || [];
  },
  
  async updateStatus(ticket_id, status, additionalFields = {}) {
    const startTime = Date.now();
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      ...additionalFields,
    };
    
    // Set resolved_at or closed_at based on status
    if (status === 'resolved' && !updateData.resolved_at) {
      updateData.resolved_at = new Date().toISOString();
    }
    if (status === 'closed' && !updateData.closed_at) {
      updateData.closed_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticket_id)
      .select()
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('update', 'support_tickets', duration);
    
    if (error) throw error;
    return data;
  },
  
  async assignTicket(ticket_id, assigned_to) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('support_tickets')
      .update({
        assigned_to,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticket_id)
      .select()
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('update', 'support_tickets', duration);
    
    if (error) throw error;
    return data;
  },
  
  async updateLastResponse(ticket_id, response_by) {
    const startTime = Date.now();
    const { data: current } = await supabase
      .from('support_tickets')
      .select('response_count')
      .eq('id', ticket_id)
      .single();
    
    const { data, error } = await supabase
      .from('support_tickets')
      .update({
        last_response_at: new Date().toISOString(),
        last_response_by: response_by,
        response_count: (current?.response_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticket_id)
      .select()
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('update', 'support_tickets', duration);
    
    if (error) throw error;
    return data;
  },
  
  async findAll(filters = {}) {
    const startTime = Date.now();
    let query = supabase
      .from('support_tickets')
      .select('*');
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }
    
    query = query.order('created_at', { ascending: false });
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const { data, error } = await query;
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'support_tickets', duration);
    
    if (error) throw error;
    return data || [];
  },
};

const ticketMessages = {
  async create({
    ticket_id, message, sender_type, sender_email, sender_name,
    attachments, is_internal_note
  }) {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id,
        message,
        sender_type,
        sender_email,
        sender_name,
        attachments: attachments ? JSON.stringify(attachments) : null,
        is_internal_note: is_internal_note || false,
      })
      .select()
      .single();
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('insert', 'ticket_messages', duration);
    
    if (error) throw error;
    return data;
  },
  
  async findByTicket(ticket_id, includeInternal = false) {
    const startTime = Date.now();
    let query = supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticket_id);
    
    if (!includeInternal) {
      query = query.eq('is_internal_note', false);
    }
    
    query = query.order('created_at', { ascending: true });
    
    const { data, error } = await query;
    
    const duration = Date.now() - startTime;
    performanceMonitor.trackDatabaseQuery('select', 'ticket_messages', duration);
    
    if (error) throw error;
    return data || [];
  },
};

// Legacy compatibility - raw SQL not supported with Supabase
async function run() {
  throw new Error('Raw SQL not supported. Use query builder methods.');
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
  supportTickets,
  ticketMessages,
};
