/**
 * Error Messages Constants
 * 
 * Centralized error messages for license, trial, and network operations.
 */

// License key patterns
export const LICENSE_KEY_PATTERN = /^(PERS|FMLY)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
// Trial key pattern: LPVT- for LPV, LLVT- for LLV
export const TRIAL_KEY_PATTERN = /^(LPVT|LLVT)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export const ERROR_MESSAGES = {
  LICENSE: {
    ACTIVATION_FAILED: "License activation failed. Please check your license key and try again.",
    ACTIVATION_CANCELLED: "License activation was cancelled.",
    INVALID_LICENSE_KEY: "Invalid license key format. Please check and try again.",
    LICENSE_EXPIRED: "Your license has expired. Please renew to continue using the app.",
    LICENSE_REVOKED: "This license has been revoked. Please contact support.",
    DEVICE_MISMATCH: "This license is already activated on another device.",
    NETWORK_ERROR: "Network error. Please check your connection and try again.",
  },
  TRIAL: {
    INVALID_TRIAL_KEY: "Invalid trial key. Please check and try again.",
    TRIAL_ACTIVATION_FAILED: "Trial activation failed. Please try again or contact support.",
    TRIAL_EXPIRED: "Your trial has expired. Please purchase a license to continue.",
    TRIAL_ALREADY_USED: "This trial key has already been used.",
  },
  NETWORK: {
    UNABLE_TO_CONNECT_ACTIVATION_ONLY: "Unable to connect to activation server. You can still use the app in offline mode with your existing license.",
    CONNECTION_TIMEOUT: "Connection timeout. Please check your internet connection and try again.",
    SERVER_ERROR: "Server error. Please try again later.",
  },
} as const;
