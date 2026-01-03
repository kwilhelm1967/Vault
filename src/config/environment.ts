/**
 * Environment Configuration
 * 
 * Centralized configuration management with validation and type safety.
 */

interface Environment {
  isProduction: boolean;
  isTest: boolean;
  isTrialVersion: boolean;
  appVersion: string;
  stripePublishableKey: string;
  licenseServerUrl: string;
  analyticsEnabled: boolean;
  licenseSigningSecret?: string;
}

interface EnvironmentConfig {
  environment: Environment;
  features: {
    enableCloudSync: boolean;
    enableDebugMode: boolean;
    showTestingTools: boolean;
    enableAnalytics: boolean;
    isTrialMode: boolean;
    trialDays: number;
    maxTrialPasswords: number;
    maxDevicesPerLicense: {
      personal: number;
      family: number;
    };
  };
}

/**
 * Get environment variable with fallback
 */
const getEnvVar = (key: string, defaultValue: string = ""): string => {
  return import.meta.env[key] || defaultValue;
};

/**
 * Validate required environment variables
 */
function validateEnvironment(): void {
  const requiredVars: Array<{ key: string; name: string }> = [
    { key: "VITE_STRIPE_PUBLISHABLE_KEY", name: "Stripe Publishable Key" },
    { key: "VITE_LICENSE_SERVER_URL", name: "License Server URL" },
  ];

  const missing: string[] = [];
  for (const { key, name } of requiredVars) {
    if (!import.meta.env[key]) {
      missing.push(name);
    }
  }

  if (missing.length > 0 && import.meta.env.DEV) {
    // Only warn in development - production uses defaults silently
    // Using console.warn here is acceptable for startup configuration warnings
    // eslint-disable-next-line no-console
    console.warn(
      `[Config] Missing environment variables: ${missing.join(", ")}. Using defaults.`
    );
  }
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize and validate configuration values
 */
function sanitizeConfig(): Environment {
  const appMode = getEnvVar("VITE_APP_MODE", "development");
  const licenseServerUrl = getEnvVar(
    "VITE_LICENSE_SERVER_URL",
    "https://api.localpasswordvault.com"
  );

  // Validate URL - only warn in development
  if (!isValidUrl(licenseServerUrl) && import.meta.env.DEV) {
    // Using console.warn here is acceptable for startup configuration warnings
    // eslint-disable-next-line no-console
    console.warn(
      `[Config] Invalid license server URL: ${licenseServerUrl}. Using default.`
    );
  }

  return {
    isProduction: appMode === "production",
    isTest: appMode === "test",
    isTrialVersion: getEnvVar("VITE_TRIAL_MODE", "false") === "true",
    appVersion: getEnvVar("VITE_APP_VERSION", "1.2.0"),
    stripePublishableKey: getEnvVar(
      "VITE_STRIPE_PUBLISHABLE_KEY",
      "pk_test_TYooMQauvdEDq54NiTphI7jx"
    ),
    licenseServerUrl: isValidUrl(licenseServerUrl)
      ? licenseServerUrl
      : "https://api.localpasswordvault.com",
    analyticsEnabled: getEnvVar("VITE_ANALYTICS_ENABLED", "false") === "true",
    licenseSigningSecret: getEnvVar("VITE_LICENSE_SIGNING_SECRET", ""),
  };
}

// Validate on load
validateEnvironment();

// Create environment configuration
const environment = sanitizeConfig();

// Feature flags based on environment
export const features = {
  enableCloudSync: false, // Always disabled as per requirements
  enableDebugMode: !environment.isProduction,
  showTestingTools: environment.isTest,
  enableAnalytics: environment.analyticsEnabled,
  isTrialMode: environment.isTrialVersion,
  trialDays: 7,
  maxTrialPasswords: environment.isTrialVersion ? 10 : -1,
  maxDevicesPerLicense: {
    personal: 1,
    family: 5,
  },
};

/**
 * Configuration object
 */
const config: EnvironmentConfig = {
  environment,
  features,
};

// Export default configuration
export default config;

// Export types for use in other modules
export type { Environment, EnvironmentConfig };
