/**
 * LPV License Activation and Transfer Routes
 * 
 * Modern license activation API with device transfer support.
 * This is the recommended API for new client implementations.
 * 
 * Endpoints:
 * - POST /api/lpv/license/activate - Activate license on device
 * - POST /api/lpv/license/transfer - Transfer license to new device
 * - GET /api/lpv/license/status/:key - Check license status (diagnostics)
 * 
 * Security Requirements:
 * - No user data transmitted (only license_key + device_id)
 * - No vault content ever sent to server
 * - After activation, app works fully offline
 * 
 * Note: For legacy JWT-based validation, see /api/licenses/validate
 */

const express = require('express');
const db = require('../database/db');
const { normalizeKey, isValidFormat } = require('../services/licenseGenerator');

const router = express.Router();

// Transfer limit per year (0 = unlimited)
const MAX_TRANSFERS_PER_YEAR = 3;

/**
 * POST /api/lpv/license/activate
 * 
 * Activates a license key on the requesting device.
 * 
 * Request body:
 * {
 *   "license_key": "XXXX-XXXX-XXXX-XXXX",
 *   "device_id": "<sha256 device fingerprint>"
 * }
 * 
 * Response scenarios:
 * 
 * 1. First activation:
 * { "status": "activated", "mode": "first_activation", "plan_type": "personal" }
 * 
 * 2. Same device re-activation:
 * { "status": "activated", "mode": "same_device", "plan_type": "personal" }
 * 
 * 3. Different device (requires transfer):
 * { "status": "device_mismatch", "requires_transfer": true }
 * 
 * 4. Invalid or revoked:
 * { "status": "invalid", "error": "License key not found" }
 */
router.post('/activate', async (req, res) => {
  try {
    const { license_key, device_id } = req.body;
    
    // Validate input
    if (!license_key) {
      return res.status(400).json({ 
        status: 'invalid',
        error: 'License key is required' 
      });
    }
    
    if (!device_id) {
      return res.status(400).json({ 
        status: 'invalid',
        error: 'Device ID is required' 
      });
    }

    // Validate device_id format (should be 64-char hex SHA-256 hash)
    if (!/^[a-f0-9]{64}$/i.test(device_id)) {
      return res.status(400).json({ 
        status: 'invalid',
        error: 'Invalid device ID format' 
      });
    }
    
    // Normalize the license key
    const normalizedKey = normalizeKey(license_key);
    
    // Validate format
    if (!isValidFormat(normalizedKey)) {
      return res.status(400).json({ 
        status: 'invalid',
        error: 'Invalid license key format' 
      });
    }
    
    // Look up the license in database
    const license = await db.licenses.findByKey(normalizedKey);
    
    if (!license) {
      return res.status(404).json({ 
        status: 'invalid',
        error: 'License key not found' 
      });
    }
    
    // Check if license is active
    if (license.status !== 'active') {
      return res.json({ 
        status: 'revoked',
        error: 'This license has been revoked' 
      });
    }
    
    // ===== ACTIVATION LOGIC =====
    
    // Case 1: First activation (no device bound yet)
    if (!license.is_activated || !license.hardware_hash) {
      // Activate on this device
      await db.licenses.activate({
        license_key: normalizedKey,
        hardware_hash: device_id,
      });
      
      // Update activation count and current device
      const { data: current } = await db.supabase
        .from('licenses')
        .select('activation_count')
        .eq('license_key', normalizedKey)
        .single();
      
      await db.supabase
        .from('licenses')
        .update({
          activation_count: (current?.activation_count || 0) + 1,
          last_activated_at: new Date().toISOString(),
          current_device_id: device_id
        })
        .eq('license_key', normalizedKey);
      
      return res.json({
        status: 'activated',
        mode: 'first_activation',
        plan_type: license.plan_type,
      });
    }
    
    // Case 2: Same device re-activation
    if (license.hardware_hash === device_id || license.current_device_id === device_id) {
      // Update last activation time
      await db.supabase
        .from('licenses')
        .update({ last_activated_at: new Date().toISOString() })
        .eq('license_key', normalizedKey);
      
      return res.json({
        status: 'activated',
        mode: 'same_device',
        plan_type: license.plan_type,
      });
    }
    
    // Case 3: Different device - requires transfer
    return res.json({
      status: 'device_mismatch',
      requires_transfer: true,
    });
    
  } catch (error) {
    console.error('LPV License activation error:', error);
    res.status(500).json({ 
      status: 'invalid',
      error: 'License activation failed' 
    });
  }
});

/**
 * POST /api/lpv/license/transfer
 * 
 * Transfers a license from the old device to a new device.
 * 
 * Request body:
 * {
 *   "license_key": "XXXX-XXXX-XXXX-XXXX",
 *   "new_device_id": "<sha256 device fingerprint>"
 * }
 * 
 * Response scenarios:
 * 
 * 1. Success:
 * { "status": "transferred" }
 * 
 * 2. Transfer limit reached:
 * { "status": "transfer_limit_reached" }
 * 
 * 3. Invalid:
 * { "status": "invalid", "error": "..." }
 */
router.post('/transfer', async (req, res) => {
  try {
    const { license_key, new_device_id } = req.body;
    
    // Validate input
    if (!license_key) {
      return res.status(400).json({ 
        status: 'invalid',
        error: 'License key is required' 
      });
    }
    
    if (!new_device_id) {
      return res.status(400).json({ 
        status: 'invalid',
        error: 'New device ID is required' 
      });
    }

    // Validate device_id format
    if (!/^[a-f0-9]{64}$/i.test(new_device_id)) {
      return res.status(400).json({ 
        status: 'invalid',
        error: 'Invalid device ID format' 
      });
    }
    
    // Normalize the license key
    const normalizedKey = normalizeKey(license_key);
    
    // Look up the license in database
    const license = await db.licenses.findByKey(normalizedKey);
    
    if (!license) {
      return res.status(404).json({ 
        status: 'invalid',
        error: 'License key not found' 
      });
    }
    
    // Check if license is active
    if (license.status !== 'active') {
      return res.json({ 
        status: 'invalid',
        error: 'This license has been revoked' 
      });
    }
    
    // Check transfer limit (if configured)
    if (MAX_TRANSFERS_PER_YEAR > 0) {
      const transferCount = license.transfer_count || 0;
      const lastTransferAt = license.last_transfer_at;
      
      // Check if we're within the same year
      if (lastTransferAt) {
        const lastTransferDate = new Date(lastTransferAt);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        if (lastTransferDate > oneYearAgo && transferCount >= MAX_TRANSFERS_PER_YEAR) {
          return res.json({
            status: 'transfer_limit_reached',
          });
        }
      }
    }
    
    // Perform the transfer
    const { data: current } = await db.supabase
      .from('licenses')
      .select('transfer_count')
      .eq('license_key', normalizedKey)
      .single();
    
    const { error: updateError } = await db.supabase
      .from('licenses')
      .update({
        hardware_hash: new_device_id,
        current_device_id: new_device_id,
        transfer_count: (current?.transfer_count || 0) + 1,
        last_transfer_at: new Date().toISOString(),
        last_activated_at: new Date().toISOString()
      })
      .eq('license_key', normalizedKey);
    
    if (updateError) {
      return res.status(500).json({
        status: 'error',
        error: 'Failed to update license'
      });
    }
    
    res.json({
      status: 'transferred',
    });
    
  } catch (error) {
    console.error('LPV License transfer error:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'License transfer failed' 
    });
  }
});

/**
 * GET /api/lpv/license/status/:key
 * 
 * Check license status (for diagnostics)
 */
router.get('/status/:key', async (req, res) => {
  try {
    const normalizedKey = normalizeKey(req.params.key);
    
    if (!isValidFormat(normalizedKey)) {
      return res.status(400).json({ valid: false, error: 'Invalid format' });
    }
    
    const license = await db.licenses.findByKey(normalizedKey);
    
    if (!license) {
      return res.status(404).json({ valid: false, error: 'Not found' });
    }
    
    res.json({
      valid: license.status === 'active',
      plan_type: license.plan_type,
      is_activated: license.is_activated,
      activation_count: license.activation_count || 0,
      transfer_count: license.transfer_count || 0,
    });
    
  } catch (error) {
    console.error('License status check error:', error);
    res.status(500).json({ valid: false, error: 'Check failed' });
  }
});

module.exports = router;

