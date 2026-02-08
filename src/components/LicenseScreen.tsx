/**
 * LicenseScreen Component
 * 
 * Main license management and activation interface. Handles:
 * - License key activation (single and family plans)
 * - Trial activation with 7-day limit
 * - License transfer for device mismatches
 * - Device management for family plans
 * - License status dashboard
 * - Recovery options (forgot license key)
 * - Download instructions and purchase flow
 * - Trial expiration handling
 * 
 * @component
 * 
 * @example
 * ```tsx
 * <LicenseScreen
 *   onLicenseValid={handleLicenseValid}
 *   appStatus={appStatus}
 *   showPricingPlans={false}
 * />
 * ```
 * 
 * @remarks
 * This component orchestrates multiple sub-screens:
 * - ExpiredTrialScreen
 * - KeyActivationScreen
 * - RecoveryOptionsScreen
 * - LicenseTransferDialog
 * - DeviceManagementScreen
 * - LicenseStatusDashboard
 * - DownloadInstructions
 * - DownloadPage
 * 
 * State management handles transitions between these screens based on
 * user actions and license status.
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Lock,
  Key,
  Shield,
  Users,
  Users2,
  CheckCircle,
  XCircle,
  ExternalLink,
  CreditCard,
  ArrowLeft,
  Download,
  Rocket,
  RefreshCw,
  Mail,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { analyticsService } from "../utils/analyticsService";
import { licenseService, AppLicenseStatus } from "../utils/licenseService";
import { devError, devLog } from "../utils/devLog";
import { withErrorHandling } from "../utils/errorHandling";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { DownloadInstructions } from "./DownloadInstructions";
import { DownloadPage } from "./DownloadPage";
import { TrialExpirationBanner } from "./TrialExpirationBanner";
import { ExpiredTrialScreen } from "./ExpiredTrialScreen";
import { KeyActivationScreen } from "./KeyActivationScreen";
import { RecoveryOptionsScreen } from "./RecoveryOptionsScreen";
import { LicenseTransferDialog } from "./LicenseTransferDialog";
import { DeviceManagementScreen } from "./DeviceManagementScreen";
import { LicenseStatusDashboard } from "./LicenseStatusDashboard";
import { LoadingSpinner } from "./LoadingSpinner";
import { testNetworkConnectivity } from "../utils/networkDiagnostics";
import { apiClient } from "../utils/apiClient";

interface LicenseScreenProps {
  onLicenseValid: () => void;
  showPricingPlans?: boolean;
  onHidePricingPlans?: () => void;
  appStatus: AppLicenseStatus; // Receive appStatus as a prop
}

const LicenseScreenComponent: React.FC<LicenseScreenProps> = ({
  onLicenseValid,
  showPricingPlans = false,
  onHidePricingPlans,
  appStatus, // Destructure appStatus
}) => {
  // Update document title - Password Vault only
  useEffect(() => {
    document.title = 'Local Password Vault';
  }, []);
  
  const [licenseKey, setLicenseKey] = useState("");
  const [trialKey, setTrialKey] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [isActivatingTrial, setIsActivatingTrial] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trialKeyError, setTrialKeyError] = useState<string | null>(null);
  const [showTrialSignupForm, setShowTrialSignupForm] = useState(false);
  const [trialSignupEmail, setTrialSignupEmail] = useState("");
  const [trialSignupLoading, setTrialSignupLoading] = useState(false);
  const [trialSignupError, setTrialSignupError] = useState<string | null>(null);
  const [trialSignupSuccess, setTrialSignupSuccess] = useState<string | null>(null);
  const [trialSignupKey, setTrialSignupKey] = useState<string | null>(null);
  const [activationProgress, setActivationProgress] = useState<{
    stage: 'checking' | 'connecting' | 'sending' | 'receiving' | 'processing' | null;
    retryAttempt?: number;
    totalRetries?: number;
    retryDelay?: number;
  }>({ stage: null });

  // Flow state variables
  const [showExpiredTrialScreen, setShowExpiredTrialScreen] = useState(false);
  const [showKeyActivationScreen, setShowKeyActivationScreen] = useState(false);
  const [showRecoveryOptions, setShowRecoveryOptions] = useState(false);
  
  // License transfer state (for device mismatch)
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [pendingTransferKey, setPendingTransferKey] = useState<string>("");
  
  // Device management state (for family plans)
  const [showDeviceManagement, setShowDeviceManagement] = useState(false);
  // Type definition for local license file
  interface LocalLicenseFileInfo {
    license_key: string;
    max_devices: number;
  }

  const [localLicenseFile, setLocalLicenseFile] = useState<LocalLicenseFileInfo | null>(null);
  const [maxDevices, setMaxDevices] = useState<number>(1);
  
  // License status dashboard state
  const [showStatusDashboard, setShowStatusDashboard] = useState(false);
  

  const updateAppStatus = useCallback(async () => {
    try {
      // Trigger re-render with new appStatus prop via parent
      onLicenseValid();
    } catch (error) {
      devError('Error updating app status:', error);
      return null;
    }
  }, [onLicenseValid]);
  const [selectedPlan, setSelectedPlan] = useState<"single" | "family">(
    "single"
  );
  const [showDownloadInstructions, setShowDownloadInstructions] =
    useState(false);
  const [pendingLicenseKey, setPendingLicenseKey] = useState("");
  const [showDownloadPage, setShowDownloadPage] = useState(false);
  const [showLicenseInput] = useState(false);

  // Get trial information from localStorage
  const getTrialInfoFromLocalStorage = useCallback(() => {
    try {
      const trialUsed = localStorage.getItem('trial_used') === 'true';
      const trialActivationTime = localStorage.getItem('trial_activation_time');
      const trialExpiryTime = localStorage.getItem('trial_expiry_time');

      if (!trialUsed || !trialActivationTime || !trialExpiryTime) {
        return {
          hasTrialBeenUsed: false,
          isExpired: false,
          isTrialActive: false,
          daysRemaining: 0,
          startDate: null,
          endDate: null,
        };
      }

      const startDate = new Date(trialActivationTime);
      const endDate = new Date(trialExpiryTime);
      const now = new Date();
      const isExpired = now > endDate;
      const isTrialActive = !isExpired;
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        hasTrialBeenUsed: trialUsed,
        isExpired,
        isTrialActive,
        daysRemaining,
        startDate,
        endDate,
      };
    } catch (error) {
      devError('Error reading trial info from localStorage:', error);
      return {
        hasTrialBeenUsed: false,
        isExpired: false,
        isTrialActive: false,
        daysRemaining: 0,
        startDate: null,
        endDate: null,
      };
    }
  }, []);

  const localStorageTrialInfo = getTrialInfoFromLocalStorage() || {
    hasTrialBeenUsed: false,
    isExpired: false,
    isTrialActive: false,
    daysRemaining: 0,
    startDate: null,
    endDate: null,
  };

  const handleApplyLicenseKey = () => {
    setShowKeyActivationScreen(true);
    setShowExpiredTrialScreen(false);
    setError(null);
    setLicenseKey("");
  };


  // New flow handlers
  const handleBuyLifetimeAccess = () => {
    const url = "https://localpasswordvault.com/pricing.html";
    if (window.electronAPI) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
    analyticsService.trackConversion("purchase_started", { source: "expired_trial" });

    if (window.electronAPI?.hideFloatingButton) {
      try {
        window.electronAPI.hideFloatingButton();
      } catch (error) {
        devError('Failed to hide floating button:', error);
      }
    }
  };

  const handleAlreadyPurchased = () => {
    setShowKeyActivationScreen(true);
    setShowExpiredTrialScreen(false);
    analyticsService.trackUserAction("already_purchased_clicked");
  };

  const handleBackToActivation = () => {
    setShowKeyActivationScreen(false);
    setShowRecoveryOptions(false);
    if (localStorageTrialInfo.isExpired) {
      setShowExpiredTrialScreen(true);
    }
  };

  const handleNeedHelp = () => {
    setShowRecoveryOptions(true);
    setShowKeyActivationScreen(false);
    analyticsService.trackUserAction("recovery_options_viewed");
  };

  const handleKeyActivation = async (key: string) => {
    // File import succeeded in KeyActivationScreen — go straight to vault
    if (key === "__FILE_IMPORTED__") {
      onLicenseValid();
      return;
    }
    setLicenseKey(key);
    await handleActivateLicense();
  };

  // AbortController for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load max devices on mount
  useEffect(() => {
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const loadMaxDevices = async () => {
      const { data, error } = await withErrorHandling(
        () => licenseService.getMaxDevices(),
        'load-max-devices'
      );
      
      if (!signal.aborted) {
        if (error) {
          devError('Failed to load max devices:', error);
          setMaxDevices(1);
        } else if (data !== null) {
          setMaxDevices(data);
        }
      }
    };
    loadMaxDevices();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (localStorageTrialInfo.isExpired && !showExpiredTrialScreen && !showKeyActivationScreen && !showRecoveryOptions) {
      setShowExpiredTrialScreen(true);
    }
  }, [localStorageTrialInfo.isExpired, showExpiredTrialScreen, showKeyActivationScreen, showRecoveryOptions]);

  // Show key activation screen for new users without license/trial
  useEffect(() => {
    if (!appStatus || showKeyActivationScreen || showExpiredTrialScreen || showRecoveryOptions) return;
    
    // Safely check trial info
    const hasTrial = appStatus.trialInfo?.hasTrial || false;
    const hasNoLicense = !appStatus.isLicensed && !hasTrial;
    const hasNoExpiredTrial = !localStorageTrialInfo.isExpired;
    
    if (hasNoLicense && hasNoExpiredTrial) {
      setShowKeyActivationScreen(true);
    }
  }, [appStatus?.isLicensed, appStatus?.trialInfo?.hasTrial, localStorageTrialInfo.isExpired, showExpiredTrialScreen, showKeyActivationScreen, showRecoveryOptions]);

  useEffect(() => {
    if (showExpiredTrialScreen && window.electronAPI?.hideFloatingButton) {
      try {
        window.electronAPI.hideFloatingButton();
      } catch (error) {
        devError('Failed to hide floating button:', error);
      }
    }
  }, [showExpiredTrialScreen]);

  // Reset license input when trial expires
  useEffect(() => {
    if (localStorageTrialInfo.isExpired && showLicenseInput) {
      // Keep license input visible if user already clicked apply key
      // But clear any previous errors
      setError(null);
    }
  }, [localStorageTrialInfo.isExpired, showLicenseInput]);

  // Load license file and max devices when device management screen is shown
  useEffect(() => {
    if (showDeviceManagement) {
      const abortController = new AbortController();
      const signal = abortController.signal;

      const loadLicenseData = async () => {
        try {
          const [file, maxDevicesCount] = await Promise.all([
            licenseService.getLocalLicenseFile(),
            licenseService.getMaxDevices()
          ]);
          if (!signal.aborted) {
            if (file) {
              setLocalLicenseFile({
                license_key: file.license_key,
                max_devices: file.max_devices || maxDevicesCount,
              });
            }
            setMaxDevices(maxDevicesCount);
          }
        } catch (error) {
          if (!signal.aborted) {
            devError('Failed to load license file:', error);
            setMaxDevices(1);
          }
        }
      };
      loadLicenseData();

      return () => {
        abortController.abort();
      };
    }
  }, [showDeviceManagement]);

  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) return;
    
    setIsActivating(true);
    setError(null);
    setActivationProgress({ stage: 'checking' });
    setPendingLicenseKey(licenseKey.trim().toUpperCase());

    // Add timeout safeguard to ensure loading state is always cleared
    const timeoutId = setTimeout(() => {
      if (isActivating) {
        devError('[LicenseScreen] Activation timeout - clearing loading state');
        setIsActivating(false);
        setActivationProgress({ stage: null });
        setError('Activation timed out. Please check your internet connection and try again.');
      }
    }, 60000);

    try {
      setActivationProgress({ stage: 'checking' });
      try {
        const connectivityTest = await Promise.race([
          testNetworkConnectivity(),
          new Promise(resolve => setTimeout(() => resolve({ success: true }), 2000))
        ]);
        
        if (connectivityTest && typeof connectivityTest === 'object' && 'success' in connectivityTest && !connectivityTest.success) {
          devError('[LicenseScreen] Pre-flight connectivity check failed, but continuing with activation');
        }
      } catch (preCheckError) {
        devError('[LicenseScreen] Pre-flight check error (non-fatal):', preCheckError);
      }

      setActivationProgress({ stage: 'connecting' });
      const keyToActivate = licenseKey.trim().toUpperCase();
      if (!keyToActivate) {
                        setError('No license code provided. Please enter a code or import your license file.');
        setIsActivating(false);
        setActivationProgress({ stage: null });
        return;
      }
      const cleanKey = keyToActivate.trim().toUpperCase();
      const result = await licenseService.activateLicense(cleanKey, {
        onProgress: (stage) => {
          setActivationProgress({ stage: stage as any });
        },
        onRetry: (attempt, total, delay) => {
          setActivationProgress({ 
            stage: 'connecting', 
            retryAttempt: attempt, 
            totalRetries: total, 
            retryDelay: delay 
          });
        }
      });
      
      // Clear timeout on success
      clearTimeout(timeoutId);

      if (result.success) {
        analyticsService.trackLicenseEvent(
          "license_activated",
          result.licenseType || "unknown"
        );
        // Refresh app status
        const updatedStatus = await updateAppStatus();
        if (updatedStatus) {
          onLicenseValid();
        }
        setError(null);
        setLicenseKey("");
        setPendingLicenseKey("");

        // Show floating button again when license is successfully activated
        if (window.electronAPI?.showFloatingButton) {
          try {
            window.electronAPI.showFloatingButton();
          } catch (error) {
            devError('Failed to show floating button:', error);
          }
        }
      } else if (result.requiresTransfer) {
        // Device mismatch - show transfer dialog
        setPendingTransferKey(cleanKey);
        setShowTransferDialog(true);
        analyticsService.trackLicenseEvent(
          "device_mismatch_detected",
          undefined,
          { status: result.status }
        );
      } else {
        // Show the actual API error message (don't transform it with getErrorMessage)
        const errorMessage = result.error || ERROR_MESSAGES.LICENSE.ACTIVATION_FAILED;
        let errorType: 'network' | 'invalid' | 'revoked' | 'device' | 'generic' = 'generic';

        // Determine error type for analytics
        if (errorMessage.includes("fetch") || errorMessage.includes("Unable to connect") || errorMessage.includes("network")) {
          errorType = 'network';
          // Store the license key for retry
          setPendingLicenseKey(cleanKey);
        } else if (errorMessage.includes("409") || errorMessage.includes("already activated")) {
          errorType = 'device';
        } else if (errorMessage.includes("404") || errorMessage.includes("not found") || errorMessage.includes("not a valid")) {
          errorType = 'invalid';
        } else if (errorMessage.includes("revoked")) {
          errorType = 'revoked';
        }

        setError(errorMessage);
        analyticsService.trackLicenseEvent(
          "license_activation_failed",
          undefined,
          {
            error: result.error || "Unknown error",
            errorMessage,
          }
        );
      }
    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutId);
      setActivationProgress({ stage: null });
      
      // Only catch unexpected exceptions (shouldn't happen for API errors)
      // API errors come through as result.error, not exceptions
      devError("Unexpected error during license activation:", error);
      
      // Check if this is a real network error (no HTTP response)
      const isNetworkError = error instanceof TypeError && error.message.includes("fetch");
      
      // Check if it's an ApiError with network error code
      const isApiNetworkError = error && typeof error === 'object' && 'code' in error && 
        (error.code === 'NETWORK_ERROR' || error.code === 'REQUEST_TIMEOUT' || error.code === 'REQUEST_ABORTED');
      
      if (isNetworkError || isApiNetworkError) {
        setPendingLicenseKey(licenseKey);
        const networkError = isApiNetworkError && typeof error === 'object' && 'message' in error
          ? (error.message as string)
          : ERROR_MESSAGES.NETWORK.UNABLE_TO_CONNECT_ACTIVATION_ONLY;
        setError(networkError);
      } else {
        // For other unexpected errors, show generic message
        const errorMessage = error instanceof Error ? error.message : 
          (error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error));
        setError(`An unexpected error occurred: ${errorMessage}. Please try again or contact support@LocalPasswordVault.com`);
      }
      
      analyticsService.trackLicenseEvent(
        "license_activation_error",
        undefined,
        {
          error: error instanceof Error ? error.message : 
            (error && typeof error === 'object' && 'message' in error ? String(error.message) : "Unknown error"),
          errorType: (isNetworkError || isApiNetworkError) ? "network" : "unexpected",
        }
      );
    } finally {
      clearTimeout(timeoutId);
      setIsActivating(false);
      setActivationProgress({ stage: null });
    }
  };

  // Handle license transfer confirmation
  const handleConfirmTransfer = async () => {
    const result = await licenseService.transferLicense(pendingTransferKey);
    
    if (result.success) {
      analyticsService.trackLicenseEvent(
        "license_transferred",
        undefined,
        { status: result.status }
      );
      // Refresh app status and close dialogs
      await updateAppStatus();
      onLicenseValid();
      
      // Show floating button again
      if (window.electronAPI?.showFloatingButton) {
        try {
          window.electronAPI.showFloatingButton();
        } catch (error) {
          devError('Failed to show floating button after transfer:', error);
        }
      }
    }
    
    return result;
  };

  // Handle transfer dialog cancel
  const handleCancelTransfer = () => {
    setShowTransferDialog(false);
    setPendingTransferKey("");
    setError(null);
  };


  const handlePurchase = async (plan: "single" | "family") => {
    setSelectedPlan(plan);
    analyticsService.trackConversion("purchase_started", { plan });

    // Hide floating button during purchase flow
    if (window.electronAPI?.hideFloatingButton) {
      try {
        window.electronAPI.hideFloatingButton();
      } catch (error) {
        devError('Failed to hide floating button:', error);
      }
    }

    try {
      // Use relative path for same-origin API calls (proxied via Nginx)
      // For Electron apps, this will still work if they're served from the same domain
      const apiUrl = '/api/checkout/session';
      
      // Map plan types: "single" -> "personal", "family" -> "family"
      const planType = plan === "single" ? "personal" : "family";
      
      // Log purchase attempt for verification
      devLog("[Purchase] Creating checkout session", {
        frontendPlan: plan,
        backendPlanType: planType,
        expectedProduct: plan === "single" ? "Personal Vault - $49" : "Family Vault - $79",
        apiUrl: apiUrl,
      });
      
      // Create checkout session
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planType,
          email: null, // Stripe will collect email during checkout
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }
      
      if (data.success && data.url) {
        devLog("[Purchase] Checkout session created successfully", {
          sessionId: data.sessionId,
          checkoutUrl: data.url,
          planType,
          frontendPlan: plan,
        });
        
        // Redirect to Stripe checkout
        // In Electron, open in external browser; in web, redirect current window
        if (window.electronAPI?.openExternal) {
          window.electronAPI.openExternal(data.url);
        } else {
          // Web version: redirect current window to Stripe checkout
          window.location.href = data.url;
        }
      } else {
        throw new Error(data.error || "Failed to create checkout session");
      }
    } catch (error) {
      devError("Purchase error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (import.meta.env.DEV) {
        devError("[Purchase] Full error details:", {
          message: errorMessage,
          name: error instanceof Error ? error.name : "Unknown",
          stack: error instanceof Error ? error.stack : undefined,
          plan,
        });
      }
      setError(`Failed to start checkout: ${errorMessage}. Please try again or contact support@localpasswordvault.com`);
    }
  };

  const handleBundlePurchase = async (bundleType: "personal" | "family") => {
    analyticsService.trackConversion("bundle_purchase_started", { bundleType });

    // Hide floating button during purchase flow
    if (window.electronAPI?.hideFloatingButton) {
      try {
        window.electronAPI.hideFloatingButton();
      } catch (error) {
        devError('Failed to hide floating button:', error);
      }
    }

    try {
      // Bundle purchases are not available in Local Password Vault
      // This function should not be called in LPV repository
      throw new Error("Bundle purchases are not available");
      
      // Use relative path for same-origin API calls (proxied via Nginx)
      const apiUrl = '/api/checkout/bundle';
      
      // Create bundle checkout session
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items,
          email: null, // Stripe will collect email during checkout
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create checkout session' }));
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const data = await response.json();
      
      if (data.success && data.url) {
        // Open Stripe checkout in external browser (Electron)
        if (window.electronAPI?.openExternal) {
          window.electronAPI.openExternal(data.url);
        } else {
          // Fallback for web version
          window.open(data.url, "_blank");
        }
      } else {
        throw new Error(data.error || "Failed to create checkout session");
      }
    } catch (error) {
      devError("Bundle purchase error:", error);
      setError("Failed to start checkout. Please try again or contact support@localpasswordvault.com");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleActivateLicense();
    }
  };

  const formatLicenseKey = (value: string) => {
    const cleaned = value.replace(/[^A-Z0-9]/g, "");
    const formatted = cleaned.match(/.{1,4}/g)?.join("-") || cleaned;
    return formatted.substring(0, 19); // XXXX-XXXX-XXXX-XXXX
  };

  const handleViewDownloads = () => {
    setShowDownloadPage(true);
  };

  const handleLicenseKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatLicenseKey(e.target.value.toUpperCase());

    setLicenseKey(formatted);
    setError(null);
  };

  const handleTrialKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatLicenseKey(e.target.value.toUpperCase());
    setTrialKey(formatted);
    setTrialKeyError(null);
  };

  const handleActivateTrialKey = async () => {
    if (!trialKey.trim()) return;

    setIsActivatingTrial(true);
    setTrialKeyError(null);

    try {
      const result = await licenseService.activateLicense(trialKey.trim());

      if (result.success) {
        analyticsService.trackLicenseActivated(trialKey.trim(), 'trial');
        onLicenseValid();
      } else {
        setTrialKeyError(result.error || ERROR_MESSAGES.TRIAL.INVALID_TRIAL_KEY);
      }
    } catch (err) {
      setTrialKeyError(ERROR_MESSAGES.TRIAL.TRIAL_ACTIVATION_FAILED);
    } finally {
      setIsActivatingTrial(false);
    }
  };

  const handleTrialKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && trialKey.trim()) {
      handleActivateTrialKey();
    }
  };

  const handleRequestTrialByEmail = async () => {
    const email = trialSignupEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setTrialSignupError("Please enter a valid email address.");
      return;
    }
    setTrialSignupLoading(true);
    setTrialSignupError(null);
    setTrialSignupSuccess(null);
    setTrialSignupKey(null);
    try {
      const res = await apiClient.post<{ success?: boolean; trialKey?: string; error?: string; message?: string }>(
        "/api/lpv/license/trial/signup",
        { email }
      );
      const data = res.data;
      if (data?.success && data.trialKey) {
        setTrialSignupSuccess("License file sent! Check your email and import the .license file into the app.");
        setTrialSignupKey(data.trialKey);
        setTrialKey(data.trialKey);
      } else if (data?.success) {
        setTrialSignupSuccess("Check your email for your trial license file.");
      } else {
        setTrialSignupError(data?.error || data?.message || "Could not create trial. Please try again.");
      }
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Could not reach trial service. Please check your connection and try again.";
      setTrialSignupError(msg);
      devError("Trial signup failed:", err);
    } finally {
      setTrialSignupLoading(false);
    }
  };

  // Show loading state while app status is being determined
  if (!appStatus) {
    return (
      <LoadingSpinner 
        size="xl" 
        text="Loading license screen..." 
        fullScreen 
      />
    );
  }

  // License Status Dashboard
  if (showStatusDashboard) {
    return (
      <LicenseStatusDashboard
        onBack={() => setShowStatusDashboard(false)}
        onManageDevices={licenseService.isFamilyPlan() ? () => {
          setShowStatusDashboard(false);
          setShowDeviceManagement(true);
        } : undefined}
        onUpgrade={() => {
          setShowStatusDashboard(false);
          // Could navigate to pricing or show pricing plans
        }}
      />
    );
  }

  // License Status Dashboard
  if (showStatusDashboard) {
    return (
      <LicenseStatusDashboard
        onBack={() => setShowStatusDashboard(false)}
        onManageDevices={licenseService.isFamilyPlan() ? () => {
          setShowStatusDashboard(false);
          setShowDeviceManagement(true);
        } : undefined}
        onUpgrade={() => {
          setShowStatusDashboard(false);
          // Could navigate to pricing or show pricing plans
        }}
      />
    );
  }

  // Device Management Screen (for family plans)
  if (showDeviceManagement) {
    if (!localLicenseFile) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0F172A' }}>
          <div className="text-white">Loading...</div>
        </div>
      );
    }
    return (
      <DeviceManagementScreen
        onBack={() => setShowDeviceManagement(false)}
        licenseKey={localLicenseFile.license_key}
        maxDevices={localLicenseFile.max_devices}
      />
    );
  }

  // License Transfer Dialog (shown on device mismatch)
  if (showTransferDialog) {
    return (
      <LicenseTransferDialog
        isOpen={showTransferDialog}
        licenseKey={pendingTransferKey}
        onConfirmTransfer={handleConfirmTransfer}
        onCancel={handleCancelTransfer}
      />
    );
  }

  // Handle new flow screens first
  if (showExpiredTrialScreen) {
    return (
      <>
        <ExpiredTrialScreen
          onBuyLifetimeAccess={handleBuyLifetimeAccess}
          onAlreadyPurchased={handleAlreadyPurchased}
        />
      </>
    );
  }

  if (showKeyActivationScreen) {
    return (
      <>
        <KeyActivationScreen
          onBack={handleBackToActivation}
          onKeyEntered={handleKeyActivation}
          isActivating={isActivating}
          error={error}
          onNeedHelp={handleNeedHelp}
          onPurchaseClick={handleBuyLifetimeAccess}
        />
      </>
    );
  }

  if (showRecoveryOptions) {
    return <RecoveryOptionsScreen onBack={handleBackToActivation} />;
  }

  return (
    <div className="min-h-screen overflow-y-auto">

      {showDownloadInstructions && (
        <DownloadInstructions
          licenseKey={pendingLicenseKey}
          licenseType={selectedPlan}
          onClose={() => {
            setShowDownloadInstructions(false);
            onLicenseValid();
          }}
        />
      )}

      {showDownloadPage && (
        <div className="form-modal-backdrop">
          <div className="max-w-4xl w-full">
            <DownloadPage />
            <button
              onClick={() => setShowDownloadPage(false)}
              className="mt-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg mx-auto block"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="min-h-screen flex flex-col overflow-y-auto">
        <div className="flex-1 max-w-4xl w-full mx-auto py-6 px-4 overflow-y-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                backgroundColor: "transparent",
                boxShadow: "none",
                border: "none",
                outline: "none",
              }}
            >
              <Lock
                className="w-8 h-8 text-white"
                style={{
                  filter: "none",
                  backgroundColor: "transparent",
                  boxShadow: "none",
                  border: "none",
                  outline: "none",
                }}
              />
            </div>
            {/* App Identity Fingerprint Banner - Runtime values only */}
            <div className="bg-slate-900/80 border border-yellow-500/50 rounded p-2 mb-4 text-xs font-mono text-yellow-400 space-y-0.5">
              <div>APP_ID: {import.meta.env.VITE_APP_ID || 'UNKNOWN'}</div>
              <div>MODE: {import.meta.env.MODE || 'UNKNOWN'}</div>
              <div>PORT: {typeof window !== 'undefined' ? window.location.port || 'UNKNOWN' : 'UNKNOWN'}</div>
              <div>HOST: {typeof window !== 'undefined' ? window.location.host || 'UNKNOWN' : 'UNKNOWN'}</div>
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2">
              Local Password Vault
            </h1>
            <p className="text-slate-400">Local Offline Password Management</p>
            <p className="text-xs text-slate-500 mt-2">
              by{" "}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  const url = "https://localpasswordvault.com";
                  if (window.electronAPI) {
                    window.electronAPI.openExternal(url);
                  } else {
                    window.open(url, "_blank");
                  }
                }}
                className="text-xs text-slate-400 hover:underline cursor-pointer"
              >
                LocalPasswordVault.com
              </button>
            </p>
            
            {/* License Status & Device Management Buttons */}
            {appStatus?.isLicensed && (
              <div className="mt-4 flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => setShowStatusDashboard(true)}
                  aria-label="View license status and details"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: 'rgba(91, 130, 184, 0.1)',
                    border: '1px solid rgba(91, 130, 184, 0.3)',
                    color: '#5B82B8',
                  }}
                >
                  <Shield className="w-4 h-4" />
                  <span>View License Status</span>
                </button>
                {licenseService.isFamilyPlan() && (
                  <button
                    onClick={() => setShowDeviceManagement(true)}
                    aria-label={`Manage devices (${maxDevices} max devices allowed)`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: 'rgba(91, 130, 184, 0.1)',
                      border: '1px solid rgba(91, 130, 184, 0.3)',
                      color: '#5B82B8',
                    }}
                  >
                    <Users2 className="w-4 h-4" />
                    <span>Manage Devices ({maxDevices} max)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Trial Expiration Banner - Show based on localStorage trial data */}
          {localStorageTrialInfo?.hasTrialBeenUsed && (
            <TrialExpirationBanner
              trialInfo={{
                hasTrialBeenUsed: localStorageTrialInfo.hasTrialBeenUsed || false,
                isExpired: localStorageTrialInfo.isExpired || false,
                isTrialActive: localStorageTrialInfo.isTrialActive || false,
                daysRemaining: localStorageTrialInfo.daysRemaining || 0,
                startDate: localStorageTrialInfo.startDate || null,
                endDate: localStorageTrialInfo.endDate || null,
              }}
              onApplyLicenseKey={handleApplyLicenseKey}
              showLicenseInput={showLicenseInput}
            />
          )}

          {/* License Activation - Two columns side by side */}
          {!showPricingPlans ? (
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
              {/* Left: Activate Paid License */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 flex flex-col">
                <div className="flex bg-transparent items-center space-x-3 mb-6">
                  <Shield className="w-6 h-6 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">
                    Activate License
                  </h2>
                </div>

                <div className="space-y-4 bg-transparent flex-1 flex flex-col">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      License Code
                    </label>
                    <input
                      type="text"
                      value={licenseKey}
                      onChange={handleLicenseKeyChange}
                      onKeyPress={handleKeyPress}
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-center tracking-wider"
                      maxLength={19}
                    />
                  </div>

                  {error && (
                    <div 
                      className="rounded-lg p-3 flex items-start gap-2.5"
                      style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.4)' }}
                    >
                      <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                      <div className="flex-1">
                        <p className="text-xs font-semibold mb-0.5" style={{ color: '#D97706' }}>Activation Error</p>
                        <p className="text-xs text-slate-200 mb-2">{error}</p>
                        {(error.includes("connect") || error.includes("network") || error.includes("timeout") || error.includes("DNS")) && pendingLicenseKey && (
                          <div className="mt-2 space-y-2">
                            <button
                              onClick={async () => {
                                setError(null);
                                setLicenseKey(pendingLicenseKey);
                                // Quick connectivity check before retry
                                setActivationProgress({ stage: 'checking' });
                                try {
                                  const connectivity = await testNetworkConnectivity();
                                  if (!connectivity.success) {
                                    setError(`Connection test failed: ${connectivity.summary || 'Unable to reach server'}. Please check your internet connection and try again.`);
                                    setActivationProgress({ stage: null });
                                    return;
                                  }
                                } catch (checkError) {
                                  // Continue anyway - might be false negative
                                  devError('[LicenseScreen] Connectivity check failed, but continuing:', checkError);
                                }
                                await handleActivateLicense();
                              }}
                              disabled={isActivating}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ 
                                backgroundColor: 'rgba(91, 130, 184, 0.2)',
                                border: '1px solid rgba(91, 130, 184, 0.4)',
                                color: '#5B82B8'
                              }}
                            >
                              <RefreshCw className={`w-3 h-3 ${isActivating ? 'animate-spin' : ''}`} />
                              <span>Retry with Connection Check</span>
                            </button>
                            <div className="p-2 rounded text-xs" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                              <p className="text-slate-300">Troubleshooting:</p>
                              <ul className="list-disc list-inside text-slate-400 mt-1 space-y-0.5">
                                <li>Check your internet connection</li>
                                <li>Try again in a few moments</li>
                                <li>Contact support if problem persists</li>
                              </ul>
                            </div>
                          </div>
                        )}
                        {error.includes("connect") && !pendingLicenseKey && (
                          <div className="mt-2 p-2 rounded text-xs" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                            <p className="text-slate-300">Troubleshooting:</p>
                            <ul className="list-disc list-inside text-slate-400 mt-1 space-y-0.5">
                              <li>Check your internet connection</li>
                              <li>Try again in a few moments</li>
                              <li>Contact support if problem persists</li>
                            </ul>
                          </div>
                        )}
                        {error.includes("already activated") && (
                          <div className="mt-2 p-2 rounded text-xs" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                            <p className="text-slate-300">Solution:</p>
                            <p className="text-slate-400 mt-1">Use the transfer option to move this license to your current device.</p>
                          </div>
                        )}
                        {error.includes("not a valid") && (
                          <div className="mt-2 p-2 rounded text-xs" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                            <p className="text-slate-300">Check:</p>
                            <ul className="list-disc list-inside text-slate-400 mt-1 space-y-0.5">
                              <li>License code format: XXXX-XXXX-XXXX-XXXX</li>
                              <li>No spaces or special characters</li>
                              <li>Or import your .license file instead</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleActivateLicense}
                    disabled={isActivating || !licenseKey.trim()}
                    aria-label={isActivating ? "Activating license..." : "Activate license"}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white py-3 px-4 rounded-lg font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center space-x-2 mt-auto"
                  >
                    {isActivating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>
                          {activationProgress.stage === 'checking' && 'Checking connection...'}
                          {activationProgress.stage === 'connecting' && activationProgress.retryAttempt 
                            ? `Retrying (${activationProgress.retryAttempt}/${activationProgress.totalRetries})...`
                            : activationProgress.stage === 'connecting' && 'Connecting...'}
                          {activationProgress.stage === 'sending' && 'Sending request...'}
                          {activationProgress.stage === 'receiving' && 'Receiving response...'}
                          {activationProgress.stage === 'processing' && 'Processing...'}
                          {!activationProgress.stage && 'Activating...'}
                        </span>
                      </>
                    ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Activate</span>
                        </>
                      )}
                    </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px bg-slate-700" />
                    <span className="text-xs text-slate-500 uppercase tracking-wider">or</span>
                    <div className="flex-1 h-px bg-slate-700" />
                  </div>

                  {/* File Import */}
                  <div
                    className="relative border-2 border-dashed border-slate-600 hover:border-blue-500/50 rounded-lg p-4 text-center transition-all cursor-pointer group"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('border-blue-400', 'bg-blue-500/5'); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('border-blue-400', 'bg-blue-500/5'); }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove('border-blue-400', 'bg-blue-500/5');
                      const file = e.dataTransfer.files[0];
                      if (file) {
                        try {
                          setIsActivating(true);
                          setError(null);
                          const text = await file.text();
                          const result = await licenseService.importLicenseFile(text);
                          if (result.success) {
                            onLicenseValid();
                          } else {
                            setError(result.error || "Failed to import license file.");
                          }
                        } catch (err) {
                          setError("Failed to read license file.");
                        } finally {
                          setIsActivating(false);
                        }
                      }
                    }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.license,.txt,.json';
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          try {
                            setIsActivating(true);
                            setError(null);
                            const text = await file.text();
                            const result = await licenseService.importLicenseFile(text);
                            if (result.success) {
                              onLicenseValid();
                            } else {
                              setError(result.error || "Failed to import license file.");
                            }
                          } catch (err) {
                            setError("Failed to read license file.");
                          } finally {
                            setIsActivating(false);
                          }
                        }
                      };
                      input.click();
                    }}
                  >
                    <Shield className="w-5 h-5 text-slate-500 group-hover:text-blue-400 mx-auto mb-1.5 transition-colors" />
                    <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                      <span className="font-medium text-blue-400">Import license file</span> from email
                    </p>
                    <p className="text-xs text-slate-600 mt-1">Drop .license file here or click to browse</p>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleBuyLifetimeAccess();
                      }}
                      className="text-blue-400 hover:text-blue-300 text-sm transition-colors inline-flex items-center space-x-1"
                    >
                      <span>Don't have a license? Buy now</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Free Trial */}
              <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 backdrop-blur-sm border border-emerald-500/30 rounded-xl p-6 flex flex-col">
                  <div className="flex items-center space-x-3 mb-6">
                    <Rocket className="w-6 h-6 text-emerald-400" />
                    <h2 className="text-xl font-semibold text-white">
                      7-Day Free Trial
                    </h2>
                  </div>

                <div className="space-y-4 flex-1 flex flex-col">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Trial License Code
                    </label>
                    <input
                      type="text"
                      value={trialKey}
                      onChange={handleTrialKeyChange}
                      onKeyPress={handleTrialKeyPress}
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      className="w-full px-4 py-3 bg-emerald-900/30 border border-emerald-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all text-center tracking-wider"
                      maxLength={19}
                    />
                  </div>

                  {trialKeyError && (
                    <div 
                      className="rounded-lg p-3 flex items-start gap-2.5"
                      style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.4)' }}
                    >
                      <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                      <div>
                        <p className="text-xs font-semibold mb-0.5" style={{ color: '#D97706' }}>Warning</p>
                        <p className="text-xs text-slate-200">{trialKeyError}</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleActivateTrialKey}
                    disabled={isActivatingTrial || !trialKey.trim()}
                    aria-label={isActivatingTrial ? "Activating trial..." : "Start 7-day free trial"}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-600 disabled:to-slate-600 text-white py-3 px-4 rounded-lg font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center space-x-2 mt-auto"
                  >
                    {isActivatingTrial ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Activating...</span>
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4" />
                        <span>Start Trial</span>
                      </>
                    )}
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px bg-emerald-500/20" />
                    <span className="text-xs text-slate-500 uppercase tracking-wider">or</span>
                    <div className="flex-1 h-px bg-emerald-500/20" />
                  </div>

                  {/* File Import for Trial */}
                  <div
                    className="relative border-2 border-dashed border-emerald-500/30 hover:border-emerald-400/50 rounded-lg p-4 text-center transition-all cursor-pointer group"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('border-emerald-400', 'bg-emerald-500/5'); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('border-emerald-400', 'bg-emerald-500/5'); }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove('border-emerald-400', 'bg-emerald-500/5');
                      const file = e.dataTransfer.files[0];
                      if (file) {
                        try {
                          setIsActivatingTrial(true);
                          setTrialKeyError(null);
                          const text = await file.text();
                          const result = await licenseService.importLicenseFile(text);
                          if (result.success) {
                            onLicenseValid();
                          } else {
                            setTrialKeyError(result.error || "Failed to import license file.");
                          }
                        } catch {
                          setTrialKeyError("Failed to read license file.");
                        } finally {
                          setIsActivatingTrial(false);
                        }
                      }
                    }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.license,.txt,.json';
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          try {
                            setIsActivatingTrial(true);
                            setTrialKeyError(null);
                            const text = await file.text();
                            const result = await licenseService.importLicenseFile(text);
                            if (result.success) {
                              onLicenseValid();
                            } else {
                              setTrialKeyError(result.error || "Failed to import license file.");
                            }
                          } catch {
                            setTrialKeyError("Failed to read license file.");
                          } finally {
                            setIsActivatingTrial(false);
                          }
                        }
                      };
                      input.click();
                    }}
                  >
                    <Shield className="w-5 h-5 text-emerald-500/50 group-hover:text-emerald-400 mx-auto mb-1.5 transition-colors" />
                    <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                      <span className="font-medium text-emerald-400">Import license file</span> from email
                    </p>
                    <p className="text-xs text-slate-600 mt-1">Drop .license file here or click to browse</p>
                  </div>

                  <p className="text-xs text-slate-400 text-center">
                    All features unlocked • Trial expires in 7 days
                  </p>

                  <div className="mt-3 pt-3 border-t border-emerald-500/20">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTrialSignupForm(!showTrialSignupForm);
                        setTrialSignupError(null);
                        setTrialSignupSuccess(null);
                        if (!showTrialSignupForm) setTrialSignupKey(null);
                      }}
                      className="w-full flex items-center justify-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Don&apos;t have a license? Get a free trial</span>
                      {showTrialSignupForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {showTrialSignupForm && (
                      <div className="mt-3 space-y-2">
                        <input
                          type="email"
                          value={trialSignupEmail}
                          onChange={(e) => {
                            setTrialSignupEmail(e.target.value);
                            setTrialSignupError(null);
                          }}
                          placeholder="your@email.com"
                          className="w-full px-3 py-2 bg-emerald-900/30 border border-emerald-500/30 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400"
                          disabled={trialSignupLoading}
                        />
                        <button
                          type="button"
                          onClick={handleRequestTrialByEmail}
                          disabled={trialSignupLoading}
                          className="w-full py-2 bg-emerald-600/80 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          {trialSignupLoading ? "Sending..." : "Send Trial License"}
                        </button>
                        {trialSignupError && (
                          <p className="text-xs text-amber-400">{trialSignupError}</p>
                        )}
                        {trialSignupSuccess && (
                          <p className="text-xs text-emerald-400">{trialSignupSuccess}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 mb-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Choose Your Plan
                </h2>
                <p className="text-slate-400 mb-4">
                  Local password management for every need
                </p>
              </div>

              {error && (
                <div 
                  className="rounded-lg p-4 flex items-start gap-2.5 max-w-4xl mx-auto"
                  style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.4)' }}
                >
                  <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold mb-1" style={{ color: '#D97706' }}>Purchase Error</p>
                    <p className="text-sm text-slate-200">{error}</p>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {/* Personal Vault */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 transition-all hover:border-blue-500/50">
                  <div className="text-center mb-6">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Personal Vault
                    </h3>
                    <div className="text-3xl font-bold text-white mb-1">
                      $49
                    </div>
                    <p className="text-slate-400 text-sm">Lifetime License</p>
                  </div>

                  <p className="text-slate-400 text-sm mb-4">
                    <span className="text-cyan-400 font-medium">Best for:</span> Individuals who want full control and zero online exposure.
                  </p>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Unlimited passwords</span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>AES-256 encryption</span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>100% offline & private</span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Floating panel</span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>1 device</span>
                    </li>
                  </ul>

                  <button
                    type="button"
                    onClick={() => handlePurchase("single")}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-all text-center flex items-center justify-center space-x-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Buy the Personal Vault - $49</span>
                  </button>
                </div>

                {/* Family Vault */}
                <div className="bg-slate-800/50 backdrop-blur-sm border-2 border-purple-500 rounded-xl p-6 relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Best Value
                    </span>
                  </div>

                  <div className="text-center mb-6">
                    <Users2 className="w-12 h-12 text-purple-400 mx-auto mb-4" strokeWidth={1.5} />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Family Vault
                    </h3>
                    <div className="text-3xl font-bold text-white mb-1">
                      $79
                    </div>
                    <p className="text-slate-400 text-sm">Lifetime License</p>
                  </div>

                  <p className="text-slate-400 text-sm mb-4">
                    <span className="text-cyan-400 font-medium">Best for:</span> Families who want to protect everyone under one roof.
                  </p>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Everything in Personal Vault</span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>5 Keys to install on 5 devices</span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Ability to create 5 encrypted vaults</span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>One-time lifetime ownership</span>
                    </li>
                  </ul>

                  <button
                    type="button"
                    onClick={() => handlePurchase("family")}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-all text-center flex items-center justify-center space-x-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Buy the Family Vault - $79</span>
                  </button>
                </div>
              </div>


              <div className="text-center mt-6">
                <button
                  onClick={onHidePricingPlans}
                  className="text-slate-400 hover:text-white transition-colors flex items-center justify-center mx-auto space-x-2 mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to License Activation</span>
                </button>

                <button
                  onClick={handleViewDownloads}
                  className="text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center mx-auto space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>View Downloads</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-slate-800/30 backdrop-blur-sm border-t border-slate-700/50 py-8 mt-auto">
          <div className="max-w-4xl w-full mx-auto text-center">
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Secure • Private • Offline • Local Password Management
            </p>
            <p className="text-xs text-slate-600">
              Need help?{" "}
              <a
                href="mailto:support@LocalPasswordVault.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
              >
                support@LocalPasswordVault.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export component directly (memoization can cause issues with state)
export const LicenseScreen = LicenseScreenComponent;