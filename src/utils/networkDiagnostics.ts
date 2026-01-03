/**
 * Network Diagnostics Utility
 * 
 * Provides network connectivity testing before attempting license activation
 * to help diagnose connection issues.
 */

import { devLog, devError } from "./devLog";
import environment from "../config/environment";

export interface NetworkDiagnosticResult {
  success: boolean;
  serverUrl: string;
  tests: Array<{
    name: string;
    status: 'success' | 'failed' | 'warning' | 'info';
    message: string;
    error?: string;
    data?: string;
    note?: string;
  }>;
  timestamp: string;
  diagnosticId: string;
  summary?: string;
}

/**
 * Test network connectivity to license server
 * This helps diagnose connection issues before attempting activation
 */
export async function testNetworkConnectivity(
  serverUrl?: string
): Promise<NetworkDiagnosticResult> {
  const testUrl = serverUrl || environment.environment.licenseServerUrl;
  const apiUrl = testUrl.replace('server.', 'api.') || testUrl;
  
  devLog('[Network Diagnostics] Starting connectivity test for:', testUrl);

  // Check if Electron API is available
  const hasElectronAPI = typeof window !== 'undefined' && 
                         window.electronAPI && 
                         typeof window.electronAPI.testNetworkConnectivity === 'function';

  if (hasElectronAPI) {
    try {
      const result = await window.electronAPI.testNetworkConnectivity(testUrl);
      devLog('[Network Diagnostics] Result:', result);
      return result;
    } catch (error) {
      devError('[Network Diagnostics] Electron API call failed:', error);
      return {
        success: false,
        serverUrl: testUrl,
        tests: [{
          name: 'Diagnostic API',
          status: 'failed',
          message: `Failed to run diagnostic: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
        timestamp: new Date().toISOString(),
        diagnosticId: `diag_${Date.now()}`,
        summary: 'Network diagnostic failed to run',
      };
    }
  }

  // Fallback: Basic browser-based test
  try {
    const healthUrl = `${apiUrl}/health`;
    devLog('[Network Diagnostics] Testing health endpoint:', healthUrl);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const data = await response.json().catch(() => ({}));

    return {
      success: response.ok,
      serverUrl: testUrl,
      tests: [
        {
          name: 'Health Endpoint',
          status: response.ok ? 'success' : 'warning',
          message: `Health endpoint responded with status ${response.status}`,
          data: JSON.stringify(data),
        },
      ],
      timestamp: new Date().toISOString(),
      diagnosticId: `diag_${Date.now()}`,
      summary: response.ok 
        ? 'Network connectivity test passed'
        : `Health endpoint returned status ${response.status}`,
    };
  } catch (error) {
    devError('[Network Diagnostics] Browser-based test failed:', error);
    
    let errorMessage = 'Unknown error';
    let errorCode = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout';
        errorCode = 'TIMEOUT';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network request failed';
        errorCode = 'NETWORK_ERROR';
      }
    }

    return {
      success: false,
      serverUrl: testUrl,
      tests: [
        {
          name: 'Health Endpoint',
          status: 'failed',
          message: `Failed to reach health endpoint: ${errorMessage}`,
          error: errorCode,
        },
      ],
      timestamp: new Date().toISOString(),
      diagnosticId: `diag_${Date.now()}`,
      summary: `Network connectivity test failed: ${errorMessage}`,
    };
  }
}

/**
 * Format diagnostic results for display to user
 */
export function formatDiagnosticResults(result: NetworkDiagnosticResult): string {
  const lines: string[] = [];
  lines.push(`Network Diagnostic Results (${new Date(result.timestamp).toLocaleString()})`);
  lines.push(`Server: ${result.serverUrl}`);
  lines.push(`Status: ${result.success ? '✓ PASSED' : '✗ FAILED'}`);
  lines.push('');
  lines.push('Test Results:');
  
  result.tests.forEach((test, index) => {
    const statusIcon = test.status === 'success' ? '✓' : 
                      test.status === 'failed' ? '✗' : 
                      test.status === 'warning' ? '⚠' : 'ℹ';
    lines.push(`${index + 1}. ${statusIcon} ${test.name}: ${test.message}`);
    if (test.error) {
      lines.push(`   Error Code: ${test.error}`);
    }
    if (test.note) {
      lines.push(`   Note: ${test.note}`);
    }
  });

  if (result.summary) {
    lines.push('');
    lines.push(`Summary: ${result.summary}`);
  }

  return lines.join('\n');
}
