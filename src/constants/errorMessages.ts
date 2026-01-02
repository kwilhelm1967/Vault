/**
 * Centralized Error Messages
 * 
 * All user-facing error messages are defined here for consistency and easy maintenance.
 * This ensures error messages are uniform across the application and can be easily updated.
 */

export const ERROR_MESSAGES = {
  // License Activation Errors
  LICENSE: {
    INVALID_FORMAT: "Invalid license key format. Please check that your key follows the format: XXXX-XXXX-XXXX-XXXX (no spaces or special characters).",
    INVALID_KEY: "This license key is not valid. Please check that you entered it correctly (format: XXXX-XXXX-XXXX-XXXX). If you believe this is an error, contact support@LocalPasswordVault.com",
    ALREADY_ACTIVATED: "This license is already activated on another device. Use the transfer option to move it to this device.",
    REVOKED: "This license has been revoked. If you believe this is an error, please contact support@LocalPasswordVault.com for assistance.",
    TRIAL_EXPIRED: "This key was for your trial period. To continue using the app, please purchase a lifetime license key at LocalPasswordVault.com",
    VERIFICATION_FAILED: "License verification failed. The license file appears to be corrupted. Please try activating again, or contact support@LocalPasswordVault.com if the problem persists.",
    ACTIVATION_FAILED: "License activation failed. Please try again.",
    ACTIVATION_FAILED_RETRY: "License activation failed. Please check your internet connection and try again. If the problem continues, contact support@LocalPasswordVault.com",
    ACTIVATION_CANCELLED: "License activation cancelled. You must accept the EULA to use the software.",
  },

  // Network Errors
  NETWORK: {
    UNABLE_TO_CONNECT: "Unable to connect to license server. Please check your internet connection and try again.",
    UNABLE_TO_CONNECT_ACTIVATION_ONLY: "Unable to connect to license server. Please check your internet connection and try again. The app requires internet access for initial activation only.",
    UNABLE_TO_CONNECT_TRIAL: "Unable to connect to license server. Please check your internet connection and try again. Internet access is required for trial activation.",
    UNABLE_TO_CONNECT_TRANSFER: "Unable to connect to license server. Please check your internet connection and try again. Internet access is required for license transfers.",
    NETWORK_ERROR: "Network error occurred. Please check your internet connection and try again. Internet access is required for initial activation only.",
    REQUEST_TIMEOUT: "Request timed out. Please check your internet connection and try again.",
  },

  // Trial Errors
  TRIAL: {
    INVALID_TRIAL_KEY: "Invalid trial key. Please check your email for the correct trial key (format: TRIA-XXXX-XXXX-XXXX-XXXX).",
    TRIAL_ACTIVATION_FAILED: "Failed to activate trial key. Please check your internet connection and try again. If the problem persists, contact support@LocalPasswordVault.com",
    TRIAL_EXPIRED: "Your trial has expired. To continue using the app, please purchase a lifetime license key at LocalPasswordVault.com",
  },

  // License Transfer Errors
  TRANSFER: {
    TRANSFER_FAILED: "License transfer failed. Please check your internet connection and try again. If the problem continues, contact support@LocalPasswordVault.com",
  },

  // Generic Errors
  GENERIC: {
    UNKNOWN_ERROR: "An unexpected error occurred. Please try again, or contact support@LocalPasswordVault.com if the problem persists.",
    OPERATION_FAILED: "Operation failed. Please try again.",
    RETRY_SUGGESTION: "Please try again in a few moments, or contact support@LocalPasswordVault.com if the problem persists.",
  },
} as const;

/**
 * License key format pattern
 */
export const LICENSE_KEY_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4,5}$/;

/**
 * Trial key format pattern
 */
export const TRIAL_KEY_PATTERN = /^TRIA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/**
 * Get error message based on error content
 * 
 * @param error - Error string or error object
 * @returns User-friendly error message
 */
export function getErrorMessage(error: string | Error | unknown): string {
  if (typeof error === 'string') {
    const errorLower = error.toLowerCase();
    
    // Network errors
    if (errorLower.includes('fetch') || errorLower.includes('unable to connect') || errorLower.includes('network')) {
      return ERROR_MESSAGES.NETWORK.UNABLE_TO_CONNECT;
    }
    
    // License errors
    if (errorLower.includes('404') || errorLower.includes('not found') || errorLower.includes('not a valid')) {
      return ERROR_MESSAGES.LICENSE.INVALID_KEY;
    }
    
    if (errorLower.includes('409') || errorLower.includes('already activated')) {
      return ERROR_MESSAGES.LICENSE.ALREADY_ACTIVATED;
    }
    
    if (errorLower.includes('revoked')) {
      return ERROR_MESSAGES.LICENSE.REVOKED;
    }
    
    if (errorLower.includes('trial')) {
      return ERROR_MESSAGES.LICENSE.TRIAL_EXPIRED;
    }
    
    if (errorLower.includes('signature') || errorLower.includes('verification failed')) {
      return ERROR_MESSAGES.LICENSE.VERIFICATION_FAILED;
    }
  }
  
  if (error instanceof Error) {
    return getErrorMessage(error.message);
  }
  
  return ERROR_MESSAGES.GENERIC.UNKNOWN_ERROR;
}









