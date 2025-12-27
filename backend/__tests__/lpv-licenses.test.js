/**
 * LPV License Activation Tests
 * 
 * Tests for license activation, transfer, and status checks.
 * 
 * Run with: npm test -- lpv-licenses.test.js
 */

const request = require('supertest');
const express = require('express');

// Mock dependencies before requiring routes
jest.mock('../database/db');
jest.mock('../services/licenseGenerator');
jest.mock('../services/licenseSigner');
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const lpvLicensesRouter = require('../routes/lpv-licenses');
const db = require('../database/db');
const { normalizeKey } = require('../services/licenseGenerator');
const { signLicenseFile } = require('../services/licenseSigner');

const app = express();
app.use(express.json());
app.use('/api/lpv/license', lpvLicensesRouter);

describe('LPV License Activation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/lpv/license/activate', () => {
    it('should reject requests without license key', async () => {
      const response = await request(app)
        .post('/api/lpv/license/activate')
        .send({ device_id: 'a'.repeat(64) });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('invalid');
      expect(response.body.error).toBe('License key is required');
    });

    it('should reject requests without device ID', async () => {
      const response = await request(app)
        .post('/api/lpv/license/activate')
        .send({ license_key: 'PERS-TEST-1234-5678' });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('invalid');
      expect(response.body.error).toBe('Device ID is required');
    });

    it('should reject invalid device ID format', async () => {
      const response = await request(app)
        .post('/api/lpv/license/activate')
        .send({
          license_key: 'PERS-TEST-1234-5678',
          device_id: 'invalid-device-id',
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('invalid');
      expect(response.body.error).toBe('Invalid device ID format');
    });

    it('should reject invalid license key format', async () => {
      normalizeKey.mockReturnValue('INVALID-KEY');
      const { isValidFormat } = require('../services/licenseGenerator');
      isValidFormat.mockReturnValue(false);

      const response = await request(app)
        .post('/api/lpv/license/activate')
        .send({
          license_key: 'INVALID-KEY',
          device_id: 'a'.repeat(64),
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('invalid');
      expect(response.body.error).toBe('Invalid license key format');
    });

    it('should reject non-existent license key', async () => {
      normalizeKey.mockReturnValue('PERS-NOTFOUND-1234');
      const { isValidFormat } = require('../services/licenseGenerator');
      isValidFormat.mockReturnValue(true);
      db.licenses.findByKey.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/lpv/license/activate')
        .send({
          license_key: 'PERS-NOTFOUND-1234',
          device_id: 'a'.repeat(64),
        });

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('invalid');
      expect(response.body.error).toBe('License key not found');
    });

    it('should reject revoked licenses', async () => {
      normalizeKey.mockReturnValue('PERS-REVOKED-1234');
      const { isValidFormat } = require('../services/licenseGenerator');
      isValidFormat.mockReturnValue(true);
      db.licenses.findByKey.mockResolvedValue({
        license_key: 'PERS-REVOKED-1234',
        status: 'revoked',
        plan_type: 'personal',
        max_devices: 1,
        product_type: 'lpv',
      });

      const response = await request(app)
        .post('/api/lpv/license/activate')
        .send({
          license_key: 'PERS-REVOKED-1234',
          device_id: 'a'.repeat(64),
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('revoked');
    });

    it('should activate license on first activation', async () => {
      const deviceId = 'a'.repeat(64);
      const licenseKey = 'PERS-FIRST-1234';
      normalizeKey.mockReturnValue(licenseKey);
      const { isValidFormat } = require('../services/licenseGenerator');
      isValidFormat.mockReturnValue(true);
      
      db.licenses.findByKey.mockResolvedValue({
        license_key: licenseKey,
        status: 'active',
        plan_type: 'personal',
        max_devices: 1,
        product_type: 'lpv',
        is_activated: false,
        hardware_hash: null,
        activation_count: 0,
        transfer_count: 0,
        last_transfer_at: null,
      });
      
      db.licenses.activate.mockResolvedValue({});
      db.supabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { activation_count: 0 },
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({}),
          }),
        }),
      };
      
      signLicenseFile.mockReturnValue({
        license_key: licenseKey,
        device_id: deviceId,
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signature: 'test-signature',
        signed_at: new Date().toISOString(),
      });

      const response = await request(app)
        .post('/api/lpv/license/activate')
        .send({
          license_key: licenseKey,
          device_id: deviceId,
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('activated');
      expect(response.body.mode).toBe('first_activation');
      expect(response.body.license_file).toBeDefined();
      expect(db.licenses.activate).toHaveBeenCalled();
    });

    it('should allow reactivation on same device', async () => {
      const deviceId = 'a'.repeat(64);
      const licenseKey = 'PERS-SAME-1234';
      normalizeKey.mockReturnValue(licenseKey);
      const { isValidFormat } = require('../services/licenseGenerator');
      isValidFormat.mockReturnValue(true);
      
      db.licenses.findByKey.mockResolvedValue({
        license_key: licenseKey,
        status: 'active',
        plan_type: 'personal',
        max_devices: 1,
        product_type: 'lpv',
        is_activated: true,
        hardware_hash: deviceId,
        current_device_id: deviceId,
        activated_at: new Date().toISOString(),
        transfer_count: 0,
        last_transfer_at: null,
      });
      
      db.supabase = {
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({}),
          }),
        }),
      };
      
      signLicenseFile.mockReturnValue({
        license_key: licenseKey,
        device_id: deviceId,
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signature: 'test-signature',
        signed_at: new Date().toISOString(),
      });

      const response = await request(app)
        .post('/api/lpv/license/activate')
        .send({
          license_key: licenseKey,
          device_id: deviceId,
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('activated');
      expect(response.body.mode).toBe('same_device');
    });

    it('should require transfer for different device', async () => {
      const deviceId1 = 'a'.repeat(64);
      const deviceId2 = 'b'.repeat(64);
      const licenseKey = 'PERS-DIFF-1234';
      normalizeKey.mockReturnValue(licenseKey);
      const { isValidFormat } = require('../services/licenseGenerator');
      isValidFormat.mockReturnValue(true);
      
      db.licenses.findByKey.mockResolvedValue({
        license_key: licenseKey,
        status: 'active',
        plan_type: 'personal',
        max_devices: 1,
        product_type: 'lpv',
        is_activated: true,
        hardware_hash: deviceId1,
        current_device_id: deviceId1,
      });

      const response = await request(app)
        .post('/api/lpv/license/activate')
        .send({
          license_key: licenseKey,
          device_id: deviceId2, // Different device
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('device_mismatch');
      expect(response.body.requires_transfer).toBe(true);
    });

    it('should handle database errors during activation', async () => {
      const deviceId = 'a'.repeat(64);
      const licenseKey = 'PERS-ERROR-1234';
      normalizeKey.mockReturnValue(licenseKey);
      const { isValidFormat } = require('../services/licenseGenerator');
      isValidFormat.mockReturnValue(true);
      
      db.licenses.findByKey.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/lpv/license/activate')
        .send({
          license_key: licenseKey,
          device_id: deviceId,
        });

      expect(response.status).toBe(500);
      expect(response.body.status).toBe('invalid');
      expect(response.body.error).toBe('License activation failed');
    });

    it('should handle license signing failures gracefully', async () => {
      const deviceId = 'a'.repeat(64);
      const licenseKey = 'PERS-SIGN-1234';
      normalizeKey.mockReturnValue(licenseKey);
      const { isValidFormat } = require('../services/licenseGenerator');
      isValidFormat.mockReturnValue(true);
      
      db.licenses.findByKey.mockResolvedValue({
        license_key: licenseKey,
        status: 'active',
        plan_type: 'personal',
        max_devices: 1,
        product_type: 'lpv',
        is_activated: false,
        hardware_hash: null,
        activation_count: 0,
        transfer_count: 0,
        last_transfer_at: null,
      });
      
      db.licenses.activate.mockResolvedValue({});
      db.supabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { activation_count: 0 },
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({}),
          }),
        }),
      };
      
      // Simulate signing failure
      signLicenseFile.mockImplementation(() => {
        throw new Error('Signing service unavailable');
      });

      const response = await request(app)
        .post('/api/lpv/license/activate')
        .send({
          license_key: licenseKey,
          device_id: deviceId,
        });

      // Should still succeed with fallback unsigned license
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('activated');
      expect(response.body.license_file).toBeDefined();
    });
  });

  describe('POST /api/lpv/license/transfer', () => {
    it('should reject requests without license key', async () => {
      const response = await request(app)
        .post('/api/lpv/license/transfer')
        .send({ new_device_id: 'a'.repeat(64) });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('invalid');
    });

    it('should reject requests without new device ID', async () => {
      const response = await request(app)
        .post('/api/lpv/license/transfer')
        .send({ license_key: 'PERS-TEST-1234' });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('invalid');
    });

    it('should reject invalid device ID format', async () => {
      const response = await request(app)
        .post('/api/lpv/license/transfer')
        .send({
          license_key: 'PERS-TEST-1234',
          new_device_id: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('invalid');
    });

    it('should reject non-existent license for transfer', async () => {
      normalizeKey.mockReturnValue('PERS-NOTFOUND-1234');
      db.licenses.findByKey.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/lpv/license/transfer')
        .send({
          license_key: 'PERS-NOTFOUND-1234',
          new_device_id: 'a'.repeat(64),
        });

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('invalid');
    });

    it('should reject revoked licenses for transfer', async () => {
      normalizeKey.mockReturnValue('PERS-REVOKED-1234');
      db.licenses.findByKey.mockResolvedValue({
        license_key: 'PERS-REVOKED-1234',
        status: 'revoked',
      });

      const response = await request(app)
        .post('/api/lpv/license/transfer')
        .send({
          license_key: 'PERS-REVOKED-1234',
          new_device_id: 'a'.repeat(64),
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('invalid');
    });

    it('should transfer license successfully', async () => {
      const newDeviceId = 'b'.repeat(64);
      const licenseKey = 'PERS-TRANSFER-1234';
      normalizeKey.mockReturnValue(licenseKey);
      
      db.licenses.findByKey.mockResolvedValue({
        license_key: licenseKey,
        status: 'active',
        plan_type: 'personal',
        max_devices: 1,
        product_type: 'lpv',
        transfer_count: 0,
        last_transfer_at: null,
      });
      
      db.supabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { transfer_count: 0 },
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
      
      db.licenses.findByKey
        .mockResolvedValueOnce({
          license_key: licenseKey,
          status: 'active',
          plan_type: 'personal',
          max_devices: 1,
          product_type: 'lpv',
          transfer_count: 0,
          last_transfer_at: null,
        })
        .mockResolvedValueOnce({
          license_key: licenseKey,
          status: 'active',
          plan_type: 'personal',
          max_devices: 1,
          product_type: 'lpv',
          transfer_count: 1,
          last_transfer_at: new Date().toISOString(),
        });
      
      signLicenseFile.mockReturnValue({
        license_key: licenseKey,
        device_id: newDeviceId,
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signature: 'test-signature',
        signed_at: new Date().toISOString(),
      });

      const response = await request(app)
        .post('/api/lpv/license/transfer')
        .send({
          license_key: licenseKey,
          new_device_id: newDeviceId,
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('transferred');
      expect(response.body.license_file).toBeDefined();
    });

    it('should enforce transfer limit', async () => {
      const newDeviceId = 'e'.repeat(64);
      const licenseKey = 'PERS-LIMIT-1234';
      normalizeKey.mockReturnValue(licenseKey);
      
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const recentTransfer = new Date();
      recentTransfer.setDate(recentTransfer.getDate() - 30); // 30 days ago
      
      db.licenses.findByKey.mockResolvedValue({
        license_key: licenseKey,
        status: 'active',
        plan_type: 'personal',
        max_devices: 1,
        product_type: 'lpv',
        transfer_count: 3, // Already at limit
        last_transfer_at: recentTransfer.toISOString(), // Within last year
      });

      const response = await request(app)
        .post('/api/lpv/license/transfer')
        .send({
          license_key: licenseKey,
          new_device_id: newDeviceId,
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('transfer_limit_reached');
    });

    it('should allow transfer after year has passed', async () => {
      const newDeviceId = 'f'.repeat(64);
      const licenseKey = 'PERS-RESET-1234';
      normalizeKey.mockReturnValue(licenseKey);
      
      const oldTransfer = new Date();
      oldTransfer.setFullYear(oldTransfer.getFullYear() - 2); // 2 years ago
      
      db.licenses.findByKey
        .mockResolvedValueOnce({
          license_key: licenseKey,
          status: 'active',
          plan_type: 'personal',
          max_devices: 1,
          product_type: 'lpv',
          transfer_count: 3,
          last_transfer_at: oldTransfer.toISOString(), // More than a year ago
        })
        .mockResolvedValueOnce({
          license_key: licenseKey,
          status: 'active',
          plan_type: 'personal',
          max_devices: 1,
          product_type: 'lpv',
          transfer_count: 4,
          last_transfer_at: new Date().toISOString(),
        });
      
      db.supabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { transfer_count: 3 },
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
      
      signLicenseFile.mockReturnValue({
        license_key: licenseKey,
        device_id: newDeviceId,
        plan_type: 'personal',
        max_devices: 1,
        activated_at: new Date().toISOString(),
        signature: 'test-signature',
        signed_at: new Date().toISOString(),
      });

      const response = await request(app)
        .post('/api/lpv/license/transfer')
        .send({
          license_key: licenseKey,
          new_device_id: newDeviceId,
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('transferred');
    });
  });

  describe('GET /api/lpv/license/status/:key', () => {
    it('should reject invalid license key format', async () => {
      normalizeKey.mockReturnValue('INVALID');
      const { isValidFormat } = require('../services/licenseGenerator');
      isValidFormat.mockReturnValue(false);

      const response = await request(app)
        .get('/api/lpv/license/status/INVALID');

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
    });

    it('should return status for valid license', async () => {
      const licenseKey = 'PERS-STATUS-1234';
      normalizeKey.mockReturnValue(licenseKey);
      const { isValidFormat } = require('../services/licenseGenerator');
      isValidFormat.mockReturnValue(true);
      
      db.licenses.findByKey.mockResolvedValue({
        license_key: licenseKey,
        status: 'active',
        plan_type: 'personal',
        is_activated: true,
        activation_count: 1,
        transfer_count: 0,
      });

      const response = await request(app)
        .get(`/api/lpv/license/status/${licenseKey}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.plan_type).toBe('personal');
      expect(response.body.is_activated).toBe(true);
    });

    it('should return invalid for non-existent license', async () => {
      const licenseKey = 'PERS-NOTFOUND-1234';
      normalizeKey.mockReturnValue(licenseKey);
      const { isValidFormat } = require('../services/licenseGenerator');
      isValidFormat.mockReturnValue(true);
      db.licenses.findByKey.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/lpv/license/status/${licenseKey}`);

      expect(response.status).toBe(404);
      expect(response.body.valid).toBe(false);
    });
  });
});






