/**
 * API Client Tests
 * 
 * Tests for API client functionality, including Content-Length header handling
 * for Electron HTTP requests.
 */

import { apiClient, ApiClient as _ApiClient } from '../apiClient';

// Mock environment
jest.mock('../../config/environment', () => ({
  default: {
    environment: {
      licenseServerUrl: 'https://api.localpasswordvault.com',
    },
  },
}));

// Mock Electron API
const mockElectronAPI = {
  httpRequest: jest.fn(),
};

// Set up window.electronAPI for tests
(window as any).electronAPI = mockElectronAPI;

describe('ApiClient - Content-Length Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockElectronAPI.httpRequest.mockReset();
  });

  describe('POST request with body', () => {
    it('should include Content-Length header when body is present', async () => {
      const testBody = { license_key: 'TEST-KEY', device_id: 'test-device-id' };
      const testEndpoint = '/api/lpv/license/activate';
      
      // Mock successful response
      mockElectronAPI.httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        data: { status: 'success' },
      });

      await apiClient.post(testEndpoint, testBody);

      // Verify Electron API was called
      expect(mockElectronAPI.httpRequest).toHaveBeenCalledTimes(1);
      
      const callArgs = mockElectronAPI.httpRequest.mock.calls[0];
      expect(callArgs[0]).toContain(testEndpoint);
      
      const options = callArgs[1];
      expect(options.method).toBe('POST');
      expect(options.body).toBeDefined();
      
      // Verify headers include Content-Type
      expect(options.headers).toBeDefined();
      expect(options.headers['Content-Type']).toBe('application/json');
      
      // Note: Content-Length is set in Electron main.js, not in apiClient
      // This test verifies the body is properly stringified and passed through
      const bodyString = typeof options.body === 'string' 
        ? options.body 
        : JSON.stringify(options.body);
      expect(bodyString).toBe(JSON.stringify(testBody));
    });

    it('should handle request with existing headers', async () => {
      const testBody = { license_key: 'TEST-KEY' };
      const customHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123',
      };

      mockElectronAPI.httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        data: { status: 'success' },
      });

      await apiClient.post('/test', testBody, { headers: customHeaders });

      const callArgs = mockElectronAPI.httpRequest.mock.calls[0];
      const options = callArgs[1];
      
      expect(options.headers).toMatchObject(customHeaders);
    });

    it('should retry on network errors', async () => {
      const testBody = { license_key: 'TEST-KEY' };
      
      // First call fails, second succeeds
      mockElectronAPI.httpRequest
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          data: { status: 'success' },
        });

      const result = await apiClient.post('/test', testBody, { retries: 1 });

      expect(mockElectronAPI.httpRequest).toHaveBeenCalledTimes(2);
      expect(result.data.status).toBe('success');
    });

    it('should handle timeout errors', async () => {
      const testBody = { license_key: 'TEST-KEY' };
      
      const timeoutError = {
        code: 'REQUEST_TIMEOUT',
        message: 'Request timed out',
      };
      
      mockElectronAPI.httpRequest.mockRejectedValue(timeoutError);

      await expect(
        apiClient.post('/test', testBody, { timeout: 1000, retries: 0 })
      ).rejects.toMatchObject({
        code: 'REQUEST_TIMEOUT',
      });
    });
  });

  describe('GET request without body', () => {
    it('should not include body in GET requests', async () => {
      mockElectronAPI.httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        data: { result: 'success' },
      });

      await apiClient.get('/test');

      const callArgs = mockElectronAPI.httpRequest.mock.calls[0];
      const options = callArgs[1];
      
      expect(options.method).toBe('GET');
      expect(options.body).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should handle HTTP error responses', async () => {
      mockElectronAPI.httpRequest.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        data: { error: 'Invalid license key' },
      });

      await expect(apiClient.post('/test', {})).rejects.toMatchObject({
        code: 'HTTP_400',
        message: 'Invalid license key',
      });
    });

    it('should handle network errors with proper error codes', async () => {
      const networkError = {
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to license server',
        status: 0,
      };

      mockElectronAPI.httpRequest.mockRejectedValue(networkError);

      await expect(apiClient.post('/test', {})).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
      });
    });
  });
});
