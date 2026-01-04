/**
 * License Activation Diagnostic Script
 * 
 * This script tests the exact URL and endpoint used for license activation
 * to diagnose connection errors.
 * 
 * Run: node scripts/diagnose-activation-error.js
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration - matches what the app uses
const LICENSE_SERVER_URL = process.env.VITE_LICENSE_SERVER_URL || 'https://api.localpasswordvault.com';
const ACTIVATION_ENDPOINT = '/api/lpv/license/activate';
const FULL_URL = `${LICENSE_SERVER_URL}${ACTIVATION_ENDPOINT}`;

console.log('================================================================================');
console.log('LICENSE ACTIVATION DIAGNOSTIC');
console.log('================================================================================\n');

console.log('Configuration:');
console.log(`  License Server URL: ${LICENSE_SERVER_URL}`);
console.log(`  Activation Endpoint: ${ACTIVATION_ENDPOINT}`);
console.log(`  Full URL: ${FULL_URL}\n`);

// Parse URL
let urlObj;
try {
  urlObj = new URL(FULL_URL);
  console.log('URL Parsing:');
  console.log(`  Protocol: ${urlObj.protocol}`);
  console.log(`  Hostname: ${urlObj.hostname}`);
  console.log(`  Port: ${urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80')}`);
  console.log(`  Path: ${urlObj.pathname}`);
  console.log(`  Using IP Address: ${/^\d+\.\d+\.\d+\.\d+$/.test(urlObj.hostname) ? 'YES (WARNING: IP in URL)' : 'NO (Using domain name)'}\n`);
} catch (error) {
  console.error('ERROR: Invalid URL format:', error.message);
  process.exit(1);
}

// Test payload (dummy license key for testing)
const testPayload = JSON.stringify({
  license_key: 'PERS-TEST-TEST-TEST',
  device_id: 'a'.repeat(64) // 64-char hex device ID
});

console.log('Test Payload:');
console.log(`  ${testPayload}\n`);

// Test 1: DNS Resolution
console.log('================================================================================');
console.log('TEST 1: DNS Resolution');
console.log('================================================================================');

const dns = require('dns').promises;
dns.resolve4(urlObj.hostname)
  .then(addresses => {
    console.log(`✓ DNS Resolution Successful:`);
    addresses.forEach(addr => console.log(`  ${urlObj.hostname} → ${addr}`));
    console.log('');
    return addresses[0];
  })
  .catch(error => {
    console.error(`✗ DNS Resolution Failed:`);
    console.error(`  Error Code: ${error.code}`);
    console.error(`  Error Message: ${error.message}`);
    console.error('');
    process.exit(1);
  })
  .then(ipAddress => {
    // Test 2: HTTPS Connection with Certificate Check
    console.log('================================================================================');
    console.log('TEST 2: HTTPS Connection and Certificate');
    console.log('================================================================================');
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(testPayload),
          'User-Agent': 'LocalPasswordVault-Diagnostic/1.0'
        },
        // Reject unauthorized certificates to see the actual error
        rejectUnauthorized: true
      };

      console.log('Request Options:');
      console.log(`  Hostname: ${options.hostname}`);
      console.log(`  Port: ${options.port}`);
      console.log(`  Path: ${options.path}`);
      console.log(`  Method: ${options.method}`);
      console.log(`  Reject Unauthorized: ${options.rejectUnauthorized}\n`);

      const req = https.request(options, (res) => {
        console.log(`✓ HTTPS Connection Established`);
        console.log(`  Status Code: ${res.statusCode}`);
        console.log(`  Status Message: ${res.statusMessage}`);
        console.log(`  Headers:`);
        Object.keys(res.headers).forEach(key => {
          console.log(`    ${key}: ${res.headers[key]}`);
        });
        console.log('');

        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk.toString();
        });

        res.on('end', () => {
          console.log('Response Body:');
          try {
            const json = JSON.parse(responseData);
            console.log(JSON.stringify(json, null, 2));
          } catch (e) {
            console.log(responseData);
          }
          console.log('');

          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('✓ HTTP Request Successful (2xx status)');
          } else if (res.statusCode === 400 || res.statusCode === 404) {
            console.log(`✓ HTTP Request Reached Server (${res.statusCode} - Expected for test key)`);
            console.log('  This confirms the endpoint is working - the 400/404 is expected for a test key.');
          } else {
            console.log(`⚠ HTTP Request Returned ${res.statusCode}`);
          }
          resolve();
        });
      });

      req.on('error', (error) => {
        console.error(`✗ HTTPS Request Failed:`);
        console.error(`  Error Code: ${error.code}`);
        console.error(`  Error Message: ${error.message}`);
        if (error.code === 'CERT_HAS_EXPIRED') {
          console.error(`  Issue: SSL Certificate has expired`);
        } else if (error.code === 'CERT_COMMON_NAME_INVALID') {
          console.error(`  Issue: SSL Certificate common name does not match hostname`);
          console.error(`  Expected: ${urlObj.hostname}`);
        } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
          console.error(`  Issue: Unable to verify SSL certificate chain`);
        } else if (error.code === 'ENOTFOUND') {
          console.error(`  Issue: DNS resolution failed`);
        } else if (error.code === 'ECONNREFUSED') {
          console.error(`  Issue: Connection refused by server`);
        } else if (error.code === 'ETIMEDOUT') {
          console.error(`  Issue: Connection timeout`);
        }
        console.error('');
        reject(error);
      });

      req.on('socket', (socket) => {
        socket.on('secureConnect', () => {
          const cert = socket.getPeerCertificate(true);
          if (cert) {
            console.log('SSL Certificate Info:');
            console.log(`  Subject: ${cert.subject?.CN || 'N/A'}`);
            console.log(`  Issuer: ${cert.issuer?.CN || 'N/A'}`);
            console.log(`  Valid From: ${cert.valid_from || 'N/A'}`);
            console.log(`  Valid To: ${cert.valid_to || 'N/A'}`);
            const now = new Date();
            const validTo = new Date(cert.valid_to);
            if (validTo < now) {
              console.error(`  ⚠ CERTIFICATE EXPIRED on ${cert.valid_to}`);
            } else {
              console.log(`  ✓ Certificate is valid`);
            }
            console.log('');
          }
        });
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout after 30 seconds'));
      });

      req.write(testPayload);
      req.end();
    });
  })
  .then(() => {
    console.log('================================================================================');
    console.log('TEST 3: Backend Endpoint Verification');
    console.log('================================================================================');
    console.log('To verify the backend endpoint is working, run this on the server:');
    console.log('');
    console.log(`  curl -X POST ${FULL_URL} \\`);
    console.log(`    -H "Content-Type: application/json" \\`);
    console.log(`    -d '${testPayload}'`);
    console.log('');
    console.log('Expected: 400 or 404 (invalid test key) - confirms endpoint is reachable');
    console.log('');
    console.log('================================================================================');
    console.log('DIAGNOSIS COMPLETE');
    console.log('================================================================================');
  })
  .catch(error => {
    console.error('================================================================================');
    console.error('DIAGNOSIS FAILED');
    console.error('================================================================================');
    console.error(`Error: ${error.code || error.message}`);
    console.error('');
    console.error('Next Steps:');
    console.error('1. Check if the domain resolves correctly');
    console.error('2. Verify SSL certificate is valid');
    console.error('3. Check if backend server is running');
    console.error('4. Review firewall/network settings');
    process.exit(1);
  });
