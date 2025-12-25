const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { normalizeKey, isValidFormat } = require('../services/licenseGenerator');

const router = express.Router();

router.post('/validate', async (req, res) => {
  try {
    const { licenseKey, hardwareHash } = req.body;
    
    if (!licenseKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'License key is required' 
      });
    }
    
    if (!hardwareHash) {
      return res.status(400).json({ 
        success: false, 
        error: 'Hardware hash is required' 
      });
    }
    
    const normalizedKey = normalizeKey(licenseKey);
    
    if (!isValidFormat(normalizedKey)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid license key format' 
      });
    }
    
    const license = await db.licenses.findByKey(normalizedKey);
    
    if (!license) {
      return res.status(404).json({ 
        success: false, 
        error: 'License key not found' 
      });
    }
    
    if (license.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        error: 'This license has been revoked or expired' 
      });
    }
    
    let isNewActivation = false;
    
    if (license.is_activated) {
      // Family plans support multiple devices
      if (license.plan_type === 'family' || license.plan_type === 'llv_family') {
        const existingDevice = await db.deviceActivations.findByLicenseAndHash(
          license.id, 
          hardwareHash
        );
        
        if (existingDevice) {
          // Device already registered, just update last seen
          await db.deviceActivations.updateLastSeen({
            license_id: license.id,
            hardware_hash: hardwareHash,
          });
        } else {
          // New device - check device limit
          const deviceCount = await db.deviceActivations.countByLicense(license.id);
          
          if (deviceCount.count >= license.max_devices) {
            return res.status(409).json({ 
              success: false, 
              error: `Maximum devices (${license.max_devices}) reached. Deactivate a device or purchase another license.` 
            });
          }
          
          await db.deviceActivations.create({
            license_id: license.id,
            hardware_hash: hardwareHash,
            device_name: req.headers['user-agent'] || 'Unknown Device',
          });
          
          await db.licenses.activate({
            license_key: normalizedKey,
            hardware_hash: hardwareHash,
          });
          
          isNewActivation = true;
        }
      } else {
        // Personal plans: single device only
        if (license.hardware_hash !== hardwareHash) {
          return res.status(409).json({ 
            success: false, 
            error: 'This license is already activated on another device' 
          });
        }
      }
    } else {
      // First activation
      await db.licenses.activate({
        license_key: normalizedKey,
        hardware_hash: hardwareHash,
      });
      
      // Track device for family plans
      if (license.plan_type === 'family' || license.plan_type === 'llv_family') {
        await db.deviceActivations.create({
          license_id: license.id,
          hardware_hash: hardwareHash,
          device_name: req.headers['user-agent'] || 'Unknown Device',
        });
      }
      
      isNewActivation = true;
    }
    
    if (!process.env.JWT_SECRET) {
      console.error('CRITICAL: JWT_SECRET not configured');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error' 
      });
    }

    // Generate JWT for offline validation
    const token = jwt.sign(
      {
        licenseKey: normalizedKey,
        planType: license.plan_type,
        hardwareHash: hardwareHash,
        maxDevices: license.max_devices,
        activatedAt: license.activated_at || new Date().toISOString(),
      },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );
    
    res.json({
      success: true,
      data: {
        planType: license.plan_type,
        token,
        isNewActivation,
        activationTime: license.activated_at || new Date().toISOString(),
        maxDevices: license.max_devices,
        activatedDevices: license.activated_devices + (isNewActivation ? 1 : 0),
      },
    });
    
  } catch (error) {
    console.error('License validation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'License validation failed' 
    });
  }
});

router.get('/check/:key', async (req, res) => {
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
      valid: true,
      planType: license.plan_type,
      isActivated: license.is_activated,
    });
    
  } catch (error) {
    console.error('License check error:', error);
    res.status(500).json({ valid: false, error: 'Check failed' });
  }
});

module.exports = router;

