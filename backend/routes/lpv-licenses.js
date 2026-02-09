const express = require('express');
const db = require('../database/db');
const { normalizeKey, isValidFormat, generateTrialKey } = require('../services/licenseGenerator');
const { signLpvLicenseFile: signLicenseFile } = require('../services/lpvLicenseSigner');
const { sendLpvTrialEmail } = require('../services/lpvEmail');
const logger = require('../utils/logger');

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
    
    // Check if this is a family plan
    const isFamilyPlan = license.plan_type === 'family' || license.plan_type === 'llv_family';
    
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
      
      // For family plans, create device activation entry
      if (isFamilyPlan) {
        const deviceName = req.headers['user-agent'] || 'Unknown Device';
        await db.deviceActivations.create({
          license_id: license.id,
          hardware_hash: device_id,
          device_name: deviceName,
        });
      }
      
      // Generate signed license file for offline validation
      let licenseFile;
      try {
        licenseFile = signLicenseFile({
          license_key: normalizedKey,
          device_id: device_id,
          plan_type: license.plan_type,
          max_devices: license.max_devices,
          activated_at: new Date().toISOString(),
          product_type: license.product_type || 'lpv',
          transfer_count: license.transfer_count || 0,
          last_transfer_at: license.last_transfer_at || null,
        });
      } catch (signError) {
        logger.error('Failed to sign license file', signError, {
          licenseKey: normalizedKey,
          operation: 'license_signing',
        });
        // Continue without signature (fallback for development)
        licenseFile = {
          license_key: normalizedKey,
          device_id: device_id,
          plan_type: license.plan_type,
          max_devices: license.max_devices,
          activated_at: new Date().toISOString(),
          product_type: license.product_type || 'lpv',
          transfer_count: license.transfer_count || 0,
          last_transfer_at: license.last_transfer_at || null,
          signature: '',
          signed_at: new Date().toISOString(),
        };
      }
      
      return res.json({
        status: 'activated',
        mode: 'first_activation',
        plan_type: license.plan_type,
        license_file: licenseFile,
      });
    }
    
    // Handle family plans with multiple devices
    if (isFamilyPlan) {
      const existingDevice = await db.deviceActivations.findByLicenseAndHash(
        license.id,
        device_id
      );
      
      if (existingDevice) {
        // Device already registered, just update last seen
        await db.deviceActivations.updateLastSeen({
          license_id: license.id,
          hardware_hash: device_id,
        });
        
        await db.supabase
          .from('licenses')
          .update({ last_activated_at: new Date().toISOString() })
          .eq('license_key', normalizedKey);
        
        // Return signed license file for offline validation
        let licenseFile;
        try {
          licenseFile = signLicenseFile({
            license_key: normalizedKey,
            device_id: device_id,
            plan_type: license.plan_type,
            max_devices: license.max_devices,
            activated_at: license.activated_at || new Date().toISOString(),
            product_type: license.product_type || 'lpv',
            transfer_count: license.transfer_count || 0,
            last_transfer_at: license.last_transfer_at || null,
          });
        } catch (signError) {
          logger.error('Failed to sign license file', signError, {
            licenseKey: normalizedKey,
            operation: 'license_signing',
          });
          licenseFile = {
            license_key: normalizedKey,
            device_id: device_id,
            plan_type: license.plan_type,
            max_devices: license.max_devices,
            activated_at: license.activated_at || new Date().toISOString(),
            product_type: license.product_type || 'lpv',
            transfer_count: license.transfer_count || 0,
            last_transfer_at: license.last_transfer_at || null,
            signature: '',
            signed_at: new Date().toISOString(),
          };
        }
        
        return res.json({
          status: 'activated',
          mode: 'same_device',
          plan_type: license.plan_type,
          license_file: licenseFile,
        });
      } else {
        // New device - check device limit
        const deviceCount = await db.deviceActivations.countByLicense(license.id);
        
        if (deviceCount.count >= (license.max_devices || 3)) {
          return res.status(409).json({
            status: 'invalid',
            error: `Maximum devices (${license.max_devices || 3}) reached. Deactivate a device or purchase another license.`
          });
        }
        
        // Create new device activation
        const deviceName = req.headers['user-agent'] || 'Unknown Device';
        await db.deviceActivations.create({
          license_id: license.id,
          hardware_hash: device_id,
          device_name: deviceName,
        });
        
        await db.supabase
          .from('licenses')
          .update({
            activation_count: (license.activation_count || 0) + 1,
            last_activated_at: new Date().toISOString(),
          })
          .eq('license_key', normalizedKey);
        
        // Generate signed license file for offline validation
        let licenseFile;
        try {
          licenseFile = signLicenseFile({
            license_key: normalizedKey,
            device_id: device_id,
            plan_type: license.plan_type,
            max_devices: license.max_devices,
            activated_at: new Date().toISOString(),
            product_type: license.product_type || 'lpv',
            transfer_count: license.transfer_count || 0,
            last_transfer_at: license.last_transfer_at || null,
          });
        } catch (signError) {
          logger.error('Failed to sign license file', signError, {
            licenseKey: normalizedKey,
            operation: 'license_signing',
          });
          licenseFile = {
            license_key: normalizedKey,
            device_id: device_id,
            plan_type: license.plan_type,
            max_devices: license.max_devices,
            activated_at: new Date().toISOString(),
            product_type: license.product_type || 'lpv',
            transfer_count: license.transfer_count || 0,
            last_transfer_at: license.last_transfer_at || null,
            signature: '',
            signed_at: new Date().toISOString(),
          };
        }
        
        return res.json({
          status: 'activated',
          mode: 'new_device',
          plan_type: license.plan_type,
          license_file: licenseFile,
        });
      }
    }
    
    // Personal plans: single device only
    // Same device reactivation
    if (license.hardware_hash === device_id || license.current_device_id === device_id) {
      await db.supabase
        .from('licenses')
        .update({ last_activated_at: new Date().toISOString() })
        .eq('license_key', normalizedKey);
      
      // Return signed license file for offline validation
      let licenseFile;
      try {
        licenseFile = signLicenseFile({
          license_key: normalizedKey,
          device_id: device_id,
          plan_type: license.plan_type,
          max_devices: license.max_devices,
          activated_at: license.activated_at || new Date().toISOString(),
          product_type: license.product_type || 'lpv',
          transfer_count: license.transfer_count || 0,
          last_transfer_at: license.last_transfer_at || null,
        });
      } catch (signError) {
        logger.error('Failed to sign license file', signError, {
          licenseKey: normalizedKey,
          operation: 'license_signing',
        });
        // Continue without signature (fallback for development)
        licenseFile = {
          license_key: normalizedKey,
          device_id: device_id,
          plan_type: license.plan_type,
          max_devices: license.max_devices,
          activated_at: license.activated_at || new Date().toISOString(),
          product_type: license.product_type || 'lpv',
          transfer_count: license.transfer_count || 0,
          last_transfer_at: license.last_transfer_at || null,
          signature: '',
          signed_at: new Date().toISOString(),
        };
      }
      
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
    logger.error('LPV License activation error', error, {
      licenseKey: req.body?.license_key,
      operation: 'license_activation',
    });
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
      let licenseFile;
      try {
        licenseFile = signLicenseFile({
          license_key: normalizedKey,
          device_id: new_device_id,
          plan_type: updatedLicense.plan_type,
          max_devices: updatedLicense.max_devices,
          activated_at: new Date().toISOString(),
          product_type: updatedLicense.product_type || 'lpv',
          transfer_count: updatedLicense.transfer_count || 0,
          last_transfer_at: updatedLicense.last_transfer_at || null,
        });
      } catch (signError) {
        logger.error('Failed to sign license file after transfer', signError, {
          licenseKey: normalizedKey,
          operation: 'license_signing_transfer',
        });
        // Continue without signature (fallback for development)
        licenseFile = {
          license_key: normalizedKey,
          device_id: new_device_id,
          plan_type: updatedLicense.plan_type,
          max_devices: updatedLicense.max_devices,
          activated_at: new Date().toISOString(),
          product_type: updatedLicense.product_type || 'lpv',
          transfer_count: updatedLicense.transfer_count || 0,
          last_transfer_at: updatedLicense.last_transfer_at || null,
          signature: '',
          signed_at: new Date().toISOString(),
        };
      }
      
    res.json({
      status: 'transferred',
      license_file: licenseFile,
    });
    
  } catch (error) {
    logger.error('LPV License transfer error', error, {
      licenseKey: req.body?.license_key,
      operation: 'license_transfer',
    });
    res.status(500).json({ 
      status: 'error',
      error: 'License transfer failed' 
    });
  }
});

router.post('/trial/activate', async (req, res) => {
  try {
    const { trial_key, device_id, product_type } = req.body;
    
    if (!trial_key) {
      return res.status(400).json({ 
        status: 'invalid',
        error: 'Trial key is required' 
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
    
    const normalizedKey = normalizeKey(trial_key);
    
    if (!isValidFormat(normalizedKey)) {
      return res.status(400).json({ 
        status: 'invalid',
        error: 'Invalid trial key format' 
      });
    }
    
    // Check if trial exists
    const trial = await db.trials.findByKey(normalizedKey);
    
    if (!trial) {
      return res.status(404).json({ 
        status: 'invalid',
        error: 'Trial key not found' 
      });
    }
    
    // LPV only
    // Also check trial.product_type if available in database, otherwise detect from key
    let detectedProductType = 'lpv';
    if (trial.product_type) {
      detectedProductType = trial.product_type;
    } else {
      // Detect from key prefix
      const keyPrefix = normalizedKey.toUpperCase().slice(0, 4);
      detectedProductType = 'lpv';
    }
    
    // Override with explicit product_type from request if provided
    if (product_type === 'llv' || product_type === 'lpv') {
      detectedProductType = product_type;
    }
    
    // Check if trial is expired
    const expiresAt = new Date(trial.expires_at);
    const now = new Date();
    
    if (now >= expiresAt) {
      return res.json({ 
        status: 'expired',
        error: 'This trial has expired' 
      });
    }
    
    // Mark trial as activated if not already
    if (!trial.is_activated) {
      await db.supabase
        .from('trials')
        .update({ is_activated: true, activated_at: new Date().toISOString() })
        .eq('trial_key', normalizedKey);
    }
    
    // Generate signed trial file for offline validation
    const startDate = trial.activated_at || new Date().toISOString();
    let trialFile;
    try {
      trialFile = signLicenseFile({
        trial_key: normalizedKey,
        device_id: device_id,
        plan_type: 'trial',
        start_date: startDate,
        expires_at: trial.expires_at,
        product_type: detectedProductType,
      });
    } catch (signError) {
      logger.error('Failed to sign trial file', signError, {
        trialKey: normalizedKey,
        operation: 'trial_signing',
      });
      // Continue without signature (fallback for development)
      trialFile = {
        trial_key: normalizedKey,
        device_id: device_id,
        plan_type: 'trial',
        start_date: startDate,
        expires_at: trial.expires_at,
        product_type: detectedProductType,
        signature: '',
        signed_at: new Date().toISOString(),
      };
    }
    
    return res.json({
      status: 'activated',
      trial_file: trialFile,
      expires_at: trial.expires_at,
    });
    
  } catch (error) {
    logger.error('Trial activation error', error, {
      trialKey: req.body?.trial_key,
      operation: 'trial_activation',
    });
    res.status(500).json({ 
      status: 'error',
      error: 'Trial activation failed' 
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
    logger.error('License status check error', error, {
      licenseKey: req.params?.key,
      operation: 'license_status_check',
    });
    res.status(500).json({ valid: false, error: 'Check failed' });
  }
});

// Get all devices for a license (family plans only)
router.get('/devices/:key', async (req, res) => {
  try {
    const normalizedKey = normalizeKey(req.params.key);
    
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
    
    // Only family plans support multiple devices
    if (license.plan_type !== 'family' && license.plan_type !== 'llv_family') {
      return res.status(400).json({ 
        success: false,
        error: 'Device management is only available for Family Plan licenses' 
      });
    }
    
    // Get all active devices for this license
    const devices = await db.deviceActivations.findAllByLicense(license.id);
    
    // Get device count
    const deviceCount = await db.deviceActivations.countByLicense(license.id);
    
    res.json({
      success: true,
      devices: devices.map(device => ({
        id: device.id,
        hardware_hash: device.hardware_hash,
        device_name: device.device_name || 'Unknown Device',
        activated_at: device.activated_at,
        last_seen_at: device.last_seen_at,
        is_active: device.is_active,
      })),
      device_count: deviceCount.count || 0,
      max_devices: license.max_devices || 3,
    });
    
  } catch (error) {
    logger.error('Get devices error', error, {
      licenseKey: req.params?.key,
      operation: 'get_devices',
    });
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve devices' 
    });
  }
});

// Deactivate a device
router.post('/devices/:key/deactivate', async (req, res) => {
  try {
    const normalizedKey = normalizeKey(req.params.key);
    const { hardware_hash } = req.body;
    
    if (!isValidFormat(normalizedKey)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid license key format' 
      });
    }
    
    if (!hardware_hash) {
      return res.status(400).json({ 
        success: false,
        error: 'Hardware hash is required' 
      });
    }
    
    if (!/^[a-f0-9]{64}$/i.test(hardware_hash)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid hardware hash format' 
      });
    }
    
    const license = await db.licenses.findByKey(normalizedKey);
    
    if (!license) {
      return res.status(404).json({ 
        success: false,
        error: 'License key not found' 
      });
    }
    
    // Only family plans support multiple devices
    if (license.plan_type !== 'family' && license.plan_type !== 'llv_family') {
      return res.status(400).json({ 
        success: false,
        error: 'Device management is only available for Family Plan licenses' 
      });
    }
    
    // Check if device exists and is active
    const device = await db.deviceActivations.findByLicenseAndHash(
      license.id,
      hardware_hash
    );
    
    if (!device) {
      return res.status(404).json({ 
        success: false,
        error: 'Device not found or already deactivated' 
      });
    }
    
    // Deactivate the device
    await db.deviceActivations.deactivate(license.id, hardware_hash);
    
    // Update device count
    const deviceCount = await db.deviceActivations.countByLicense(license.id);
    
    res.json({
      success: true,
      message: 'Device deactivated successfully',
      device_count: deviceCount.count || 0,
      max_devices: license.max_devices || 3,
    });
    
  } catch (error) {
    logger.error('Deactivate device error', error, {
      licenseKey: req.params?.key,
      hardwareHash: req.body?.hardware_hash,
      operation: 'deactivate_device',
    });
    res.status(500).json({ 
      success: false,
      error: 'Failed to deactivate device' 
    });
  }
});

/**
 * POST /trial/signup — LPV-SPECIFIC trial signup
 *
 * Model (no workarounds):
 * - Application: customer downloads the app only from the website (direct links to app installers).
 * - License: customer receives the .license file only as an email attachment. No license download link.
 *
 * This endpoint:
 * 1. Creates the trial record in Supabase
 * 2. Generates a signed license file (opaque base64; no code or readable structure in the file)
 * 3. Emails the .license file as an attachment. Customer imports it into the app.
 *
 * Mounted at: /api/lpv/license/trial/signup
 */
const WEBSITE_URL = (process.env.WEBSITE_URL || 'https://localpasswordvault.com').replace(/\/$/, '');

function wantsJson(req) {
  const accept = req.get('Accept') || '';
  return accept.includes('application/json');
}

function redirectTrialError(res, message) {
  res.redirect(302, WEBSITE_URL + '/trial.html?error=' + encodeURIComponent(message));
}

function redirectTrialSuccess(res) {
  res.redirect(302, WEBSITE_URL + '/trial-success.html');
}

// GET /api/lpv/license/trial/signup → send user to the trial form (avoids 404 when opening URL in browser)
router.get('/trial/signup', (req, res) => {
  res.redirect(302, WEBSITE_URL + '/trial.html');
});

router.post('/trial/signup', async (req, res) => {
  try {
    const { email } = req.body;
    const TRIAL_DURATION_DAYS = 7;
    const json = wantsJson(req);

    if (!email) {
      if (json) return res.status(400).json({ success: false, error: 'Email is required' });
      return redirectTrialError(res, 'Email is required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      if (json) return res.status(400).json({ success: false, error: 'Invalid email format' });
      return redirectTrialError(res, 'Invalid email format');
    }

    // Check for existing LPV trial
    const allTrials = await db.trials.findAllByEmail(normalizedEmail);
    const existingTrial = allTrials?.find(trial => {
      const trialProductType = trial.product_type || 'lpv';
      return trialProductType === 'lpv';
    });

    if (existingTrial) {
      const expiresAt = new Date(existingTrial.expires_at);
      const now = new Date();

      if (now < expiresAt) {
        // Resend the signed license file for the existing trial
        const trialFile = signLicenseFile({
          trial_key: existingTrial.trial_key,
          plan_type: 'trial',
          product_type: 'lpv',
          start_date: existingTrial.activated_at || existingTrial.created_at || now.toISOString(),
          expires_at: existingTrial.expires_at,
        });

        const licenseFileContent = Buffer.from(JSON.stringify(trialFile), 'utf8').toString('base64');

        try {
          await sendLpvTrialEmail({
            to: normalizedEmail,
            trialKey: existingTrial.trial_key,
            expiresAt,
            licenseFileContent,
          });
        } catch (emailError) {
          logger.emailError('lpv_trial_resend', normalizedEmail, emailError, {
            operation: 'lpv_trial_signup',
          });
          const msg = 'We could not send the email. Please try again or contact support.';
          if (json) return res.status(503).json({ success: false, error: msg });
          return redirectTrialError(res, msg);
        }

        if (json) return res.json({ success: true, message: 'Trial license resent to your email', licenseCode: existingTrial.trial_key, expiresAt: expiresAt.toISOString() });
        return redirectTrialSuccess(res);
      }
      // Expired — fall through to create a new one
    }

    // Prevent trial if customer already has a license
    const existingLicense = await db.licenses.findByEmail(normalizedEmail);
    if (existingLicense && existingLicense.length > 0) {
      const msg = 'You already have a license. Check your email for your .license file.';
      if (json) return res.status(400).json({ success: false, error: msg, hasLicense: true });
      return redirectTrialError(res, msg);
    }

    // Generate trial key and expiration
    const trialKey = generateTrialKey('lpv');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TRIAL_DURATION_DAYS);

    // Save trial record to database
    try {
      await db.trials.create({
        email: normalizedEmail,
        trial_key: trialKey,
        expires_at: expiresAt.toISOString(),
        product_type: 'lpv',
      });
    } catch (dbError) {
      if (dbError.code === '23505' || dbError.message?.includes('unique')) {
        if (json) return res.status(400).json({ success: false, error: 'Trial already exists for this email' });
        return redirectTrialError(res, 'Trial already exists for this email');
      }
      throw dbError;
    }

    // Generate signed license file
    const trialFile = signLicenseFile({
      trial_key: trialKey,
      plan_type: 'trial',
      product_type: 'lpv',
      start_date: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    });

    const licenseFileContent = Buffer.from(JSON.stringify(trialFile), 'utf8').toString('base64');

    // Send email with signed license file attached (required — do not return success without sending)
    try {
      await sendLpvTrialEmail({
        to: normalizedEmail,
        trialKey,
        expiresAt,
        licenseFileContent,
      });
      logger.email('lpv_trial_sent', normalizedEmail, {
        operation: 'lpv_trial_signup',
        trialKey,
      });
    } catch (emailError) {
      logger.emailError('lpv_trial_send', normalizedEmail, emailError, {
        operation: 'lpv_trial_signup',
        trialKey,
      });
      const msg = 'We could not send your trial email. Please try again or contact support.';
      if (json) return res.status(503).json({ success: false, error: msg });
      return redirectTrialError(res, msg);
    }

    if (json) return res.json({ success: true, message: 'Trial license sent to your email', licenseCode: trialKey, expiresAt: expiresAt.toISOString() });
    return redirectTrialSuccess(res);

  } catch (error) {
    logger.error('LPV trial signup error', error, {
      email: req.body?.email,
      operation: 'lpv_trial_signup',
    });
    if (wantsJson(req)) return res.status(500).json({ success: false, error: 'Failed to create trial. Please try again.' });
    return redirectTrialError(res, 'Something went wrong. Please try again.');
  }
});

module.exports = router;

