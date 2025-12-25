const express = require('express');
const db = require('../database/db');
const { normalizeKey, isValidFormat } = require('../services/licenseGenerator');
const { signLicenseFile } = require('../services/licenseSigner');

const router = express.Router();
const MAX_TRANSFERS_PER_YEAR = 3;

router.post('/activate', async (req, res) => {
  try {
    const { license_key, device_id } = req.body;
    
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

    if (!/^[a-f0-9]{64}$/i.test(device_id)) {
      return res.status(400).json({ 
        status: 'invalid',
        error: 'Invalid device ID format' 
      });
    }
    
    const normalizedKey = normalizeKey(license_key);
    
    if (!isValidFormat(normalizedKey)) {
      return res.status(400).json({ 
        status: 'invalid',
        error: 'Invalid license key format' 
      });
    }
    
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
    
    // First activation
    if (!license.is_activated || !license.hardware_hash) {
      await db.licenses.activate({
        license_key: normalizedKey,
        hardware_hash: device_id,
      });
      
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
      
      // Generate signed license file for offline validation
      const licenseFile = signLicenseFile({
        license_key: normalizedKey,
        device_id: device_id,
        plan_type: license.plan_type,
        max_devices: license.max_devices,
        activated_at: new Date().toISOString(),
        product_type: license.product_type || 'lpv',
        transfer_count: license.transfer_count || 0,
        last_transfer_at: license.last_transfer_at || null,
      });
      
      return res.json({
        status: 'activated',
        mode: 'first_activation',
        plan_type: license.plan_type,
        license_file: licenseFile,
      });
    }
    
    // Same device reactivation
    if (license.hardware_hash === device_id || license.current_device_id === device_id) {
      await db.supabase
        .from('licenses')
        .update({ last_activated_at: new Date().toISOString() })
        .eq('license_key', normalizedKey);
      
      // Return signed license file for offline validation
      const licenseFile = signLicenseFile({
        license_key: normalizedKey,
        device_id: device_id,
        plan_type: license.plan_type,
        max_devices: license.max_devices,
        activated_at: license.activated_at || new Date().toISOString(),
        product_type: license.product_type || 'lpv',
        transfer_count: license.transfer_count || 0,
        last_transfer_at: license.last_transfer_at || null,
      });
      
      return res.json({
        status: 'activated',
        mode: 'same_device',
        plan_type: license.plan_type,
        license_file: licenseFile,
      });
    }
    
    // Different device - requires transfer
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

router.post('/transfer', async (req, res) => {
  try {
    const { license_key, new_device_id } = req.body;
    
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

    if (!/^[a-f0-9]{64}$/i.test(new_device_id)) {
      return res.status(400).json({ 
        status: 'invalid',
        error: 'Invalid device ID format' 
      });
    }
    
    const normalizedKey = normalizeKey(license_key);
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
    
    // Check transfer limit (3 per year)
    if (MAX_TRANSFERS_PER_YEAR > 0) {
      const transferCount = license.transfer_count || 0;
      const lastTransferAt = license.last_transfer_at;
      
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
    
      // Return signed license file after transfer
      const updatedLicense = await db.licenses.findByKey(normalizedKey);
      const licenseFile = signLicenseFile({
        license_key: normalizedKey,
        device_id: new_device_id,
        plan_type: updatedLicense.plan_type,
        max_devices: updatedLicense.max_devices,
        activated_at: new Date().toISOString(),
        product_type: updatedLicense.product_type || 'lpv',
        transfer_count: updatedLicense.transfer_count || 0,
        last_transfer_at: updatedLicense.last_transfer_at || null,
      });
    
    res.json({
      status: 'transferred',
      license_file: licenseFile,
    });
    
  } catch (error) {
    console.error('LPV License transfer error:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'License transfer failed' 
    });
  }
});

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

