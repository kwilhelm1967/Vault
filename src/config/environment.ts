// Environment configuration
interface Environment {
  isProduction: boolean;
  isTest: boolean;
  isTrialVersion: boolean;
  appVersion: string;
  stripePublishableKey: string;
  licenseServerUrl: string;
  analyticsEnabled: boolean;
}

// Get environment variables with fallbacks
const getEnvVar = (key: string, defaultValue: string = ""): string => {
  return import.meta.env[key] || defaultValue;
};

// Check if we're in production mode
const isProductionMode = getEnvVar("VITE_APP_MODE") === "production";

// Create environment configuration
export const environment: Environment = {
  isProduction: isProductionMode,
  isTest: getEnvVar("VITE_APP_MODE") === "test",
  isTrialVersion: getEnvVar("VITE_TRIAL_MODE") === "true",
  appVersion: getEnvVar("VITE_APP_VERSION", "1.0.0"),
  stripePublishableKey: getEnvVar(
    "VITE_STRIPE_PUBLISHABLE_KEY",
    "pk_test_TYooMQauvdEDq54NiTphI7jx"
  ),
  licenseServerUrl: getEnvVar(
    "VITE_LICENSE_SERVER_URL",
    isProductionMode ? "https://server.localpasswordvault.com" : "http://localhost:5000"
  ),
  analyticsEnabled: getEnvVar("VITE_ANALYTICS_ENABLED", "false") === "true",
};


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
    single: 1,
    family: 3,
    business: 10,
  },
};

export default {
  environment,
  features,
};
