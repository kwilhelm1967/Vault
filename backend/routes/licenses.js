/**
 * License Validation and Activation Routes
 * 
 * POST /api/licenses/validate - Validate and activate a license key
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { normalizeKey, isValidFormat } = require('../services/licenseGenerator');

const router = express.Router();

/**
 * POST /api/licenses/validate
 * 
 * Validates a license key and activates it on the requesting device.
 * This is the main endpoint your Electron app calls.
 * 
 * Request body:
 * {
 *   "licenseKey": "XXXX-XXXX-XXXX-XXXX",
 *   "hardwareHash": "sha256-device-fingerprint"
 * }
 * 
 * Response (success):
 * {
 *   "success": true,
 *   "data": {
 *     "planType": "personal" | "family",
 *     "token": "jwt-token",
 *     "isNewActivation": true,
 *     "activationTime": "ISO-date",
 *     "maxDevices": 1
 *   }
 * }
 */
router.post('/validate', async (req, res) => {
  try {
    const { licenseKey, hardwareHash } = req.body;
    
    // Validate input
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
    
    // Normalize the license key
    const normalizedKey = normalizeKey(licenseKey);
    
    // Validate format
    if (!isValidFormat(normalizedKey)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid license key format' 
      });
    }
    
    // Look up the license in database
    const license = await db.licenses.findByKey(normalizedKey);
    
    if (!license) {
      return res.status(404).json({ 
        success: false, 
        error: 'License key not found' 
      });
    }
    
    // Check if license is active
    if (license.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        error: 'This license has been revoked or expired' 
      });
    }
    
    // Check device activation
    let isNewActivation = false;
    
    if (license.is_activated) {
      // License already activated - check if same device or different
      
      // For family plans, check device count
      if (license.plan_type === 'family') {
        // Check if this hardware is already activated
        const existingDevice = await db.deviceActivations.findByLicenseAndHash(
          license.id, 
          hardwareHash
        );
        
        if (existingDevice) {
          // Same device - update last seen
          await db.deviceActivations.updateLastSeen({
            license_id: license.id,
            hardware_hash: hardwareHash,
          });
        } else {
          // New device - check if under limit
          const deviceCount = await db.deviceActivations.countByLicense(license.id);
          
          if (deviceCount.count >= license.max_devices) {
            return res.status(409).json({ 
              success: false, 
              error: `Maximum devices (${license.max_devices}) reached. Deactivate a device or purchase another license.` 
            });
          }
          
          // Add new device
          await db.deviceActivations.create({
            license_id: license.id,
            hardware_hash: hardwareHash,
            device_name: req.headers['user-agent'] || 'Unknown Device',
          });
          
          // Update activated_devices count
          await db.licenses.activate({
            license_key: normalizedKey,
            hardware_hash: hardwareHash,
          });
          
          isNewActivation = true;
        }
      } else {
        // Personal plan - single device only
        if (license.hardware_hash !== hardwareHash) {
          return res.status(409).json({ 
            success: false, 
            error: 'This license is already activated on another device' 
          });
        }
        // Same device - valid
      }
    } else {
      // First activation
      await db.licenses.activate({
        license_key: normalizedKey,
        hardware_hash: hardwareHash,
      });
      
      // For family plans, also record the first device
      if (license.plan_type === 'family') {
        await db.deviceActivations.create({
          license_id: license.id,
          hardware_hash: hardwareHash,
          device_name: req.headers['user-agent'] || 'Unknown Device',
        });
      }
      
      isNewActivation = true;
    }
    
    // Ensure JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('CRITICAL: JWT_SECRET not configured');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error' 
      });
    }

    // Generate JWT token for offline validation
    const token = jwt.sign(
      {
        licenseKey: normalizedKey,
        planType: license.plan_type,
        hardwareHash: hardwareHash,
        maxDevices: license.max_devices,
        activatedAt: license.activated_at || new Date().toISOString(),
      },
      process.env.JWT_SECRET,
      { expiresIn: '365d' } // Lifetime license - long expiry
    );
    
    // Success response
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

/**
 * GET /api/licenses/check/:key
 * 
 * Quick check if a license key exists (without activation)
 * Useful for validating keys before showing download page
 */
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

