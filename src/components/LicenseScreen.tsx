import React, { useState, useCallback, useEffect } from "react";
import {
  Lock,
  Key,
  Shield,
  Users,
  CheckCircle,
  XCircle,
  ExternalLink,
  CreditCard,
  ArrowLeft,
  Download,
  Rocket,
} from "lucide-react";
import { analyticsService } from "../utils/analyticsService";
import { licenseService, AppLicenseStatus } from "../utils/licenseService";
import { devError } from "../utils/devLog";
import { EulaAgreement } from "./EulaAgreement";
import { DownloadInstructions } from "./DownloadInstructions";
import { DownloadPage } from "./DownloadPage";
import { TrialExpirationBanner } from "./TrialExpirationBanner";
import { ExpiredTrialScreen } from "./ExpiredTrialScreen";
import { KeyActivationScreen } from "./KeyActivationScreen";
import { RecoveryOptionsScreen } from "./RecoveryOptionsScreen";
import { LicenseTransferDialog } from "./LicenseTransferDialog";

interface LicenseScreenProps {
  onLicenseValid: () => void;
  showPricingPlans?: boolean;
  onHidePricingPlans?: () => void;
  appStatus: AppLicenseStatus; // Receive appStatus as a prop
}

export const LicenseScreen: React.FC<LicenseScreenProps> = ({
  onLicenseValid,
  showPricingPlans = false,
  onHidePricingPlans,
  appStatus, // Destructure appStatus
}) => {
  const [licenseKey, setLicenseKey] = useState("");
  const [trialKey, setTrialKey] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [isActivatingTrial, setIsActivatingTrial] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trialKeyError, setTrialKeyError] = useState<string | null>(null);

  // Flow state variables
  const [showExpiredTrialScreen, setShowExpiredTrialScreen] = useState(false);
  const [showKeyActivationScreen, setShowKeyActivationScreen] = useState(false);
  const [showRecoveryOptions, setShowRecoveryOptions] = useState(false);
  
  // License transfer state (for device mismatch)
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [pendingTransferKey, setPendingTransferKey] = useState<string>("");
  

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
  const [showEula, setShowEula] = useState(false);
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

  const localStorageTrialInfo = getTrialInfoFromLocalStorage();

  const handleApplyLicenseKey = () => {
    setShowKeyActivationScreen(true);
    setShowExpiredTrialScreen(false);
    setError(null);
    setLicenseKey("");
  };


  // New flow handlers
  const handleBuyLifetimeAccess = () => {
    const url = "https://localpasswordvault.com/#plans";
    if (window.electronAPI) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
    analyticsService.trackConversion("purchase_started", { source: "expired_trial" });

    // Hide floating button when user goes to purchase
    if (window.electronAPI?.hideFloatingButton) {
      window.electronAPI.hideFloatingButton();
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
    setLicenseKey(key);
    await handleActivateLicense();
  };

  // Show expired trial screen when trial is expired
  useEffect(() => {
    if (localStorageTrialInfo.isExpired && !showExpiredTrialScreen && !showKeyActivationScreen && !showRecoveryOptions) {
      setShowExpiredTrialScreen(true);
    }
  }, [localStorageTrialInfo.isExpired, showExpiredTrialScreen, showKeyActivationScreen, showRecoveryOptions]);

  // Hide floating button when expired trial screen is shown
  useEffect(() => {
    if (showExpiredTrialScreen && window.electronAPI?.hideFloatingButton) {
      // Hide floating button when trial expires
      window.electronAPI.hideFloatingButton();
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

  const handleActivateLicense = async () => {

    setShowEula(true);
  };

  const handleEulaAccept = async () => {

    setIsActivating(true);
    setError(null);

    try {
      const cleanKey = licenseKey.trim().toUpperCase();
      const result = await licenseService.activateLicense(cleanKey);

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
        setShowEula(false);

        // Show floating button again when license is successfully activated
        if (window.electronAPI?.showFloatingButton) {
          window.electronAPI.showFloatingButton();
        }
      } else if (result.requiresTransfer) {
        // Device mismatch - show transfer dialog
        setShowEula(false);
        setPendingTransferKey(cleanKey);
        setShowTransferDialog(true);
        analyticsService.trackLicenseEvent(
          "device_mismatch_detected",
          undefined,
          { status: result.status }
        );
      } else {
        // Enhanced error messages based on the new flow specifications
        let enhancedError = result.error || "License activation failed";

        if (result.error?.includes("fetch")) {
          enhancedError =
            "Unable to connect to license server. Please check your internet connection and try again.";
        } else if (result.error?.includes("409")) {
          enhancedError =
            "This key is already activated on another device. You need to purchase an additional key.";
        } else if (result.error?.includes("404")) {
          enhancedError =
            "This is not a valid lifetime key.";
        } else if (result.error?.includes("trial") && result.error?.includes("expir")) {
          enhancedError =
            "This key was for your trial. To continue, purchase a lifetime key.";
        } else if (result.error?.includes("trial") && result.error?.includes("once")) {
          enhancedError =
            "This key was for your trial. To continue, purchase a lifetime key.";
        } else if (result.error?.includes("validation")) {
          enhancedError =
            "This is not a valid lifetime key.";
        } else if (result.error?.includes("network")) {
          enhancedError =
            "Network error occurred. Please check your connection and try again.";
        }

        setError(enhancedError);
        analyticsService.trackLicenseEvent(
          "license_activation_failed",
          undefined,
          {
            error: result.error || "Unknown error",
            enhancedError,
          }
        );
      }
    } catch (error) {
      let enhancedError = "License activation failed. Please try again.";

      if (error instanceof TypeError && error.message.includes("fetch")) {
        enhancedError =
          "Unable to connect to license server. Please check your internet connection and try again.";
      } else if (error instanceof Error) {
        enhancedError = `License activation failed: ${error.message}`;
      }

      setError(enhancedError);
      analyticsService.trackLicenseEvent(
        "license_activation_error",
        undefined,
        {
          error: error instanceof Error ? error.message : "Unknown error",
          enhancedError,
        }
      );
    } finally {
      setIsActivating(false);
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
        window.electronAPI.showFloatingButton();
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

  const handleEulaDecline = () => {
    setShowEula(false);
    setPendingLicenseKey("");
    analyticsService.trackUserAction("eula_declined", {
      licenseType: "unknown",
    });

    // Show a message to the user
    setError(
      "License activation cancelled. You must accept the EULA to use the software."
    );
  };

  const handlePurchase = (plan: "single" | "family") => {
    setSelectedPlan(plan);
    analyticsService.trackConversion("purchase_started", { plan });

    // Hide floating button during purchase flow
    if (window.electronAPI?.hideFloatingButton) {
      window.electronAPI.hideFloatingButton();
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
        setTrialKeyError(result.error || 'Invalid trial key');
      }
    } catch (err) {
      setTrialKeyError('Failed to activate trial key. Please try again.');
    } finally {
      setIsActivatingTrial(false);
    }
  };

  const handleTrialKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && trialKey.trim()) {
      handleActivateTrialKey();
    }
  };

  // Show loading state while app status is being determined
  if (!appStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading license screen...</p>
        </div>
      </div>
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
        {/* EULA Modal */}
        {showEula && (
          <EulaAgreement
            onAccept={handleEulaAccept}
            error={error}
            isLoading={isActivating}
            onDecline={handleEulaDecline}
          />
        )}
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
        />
        {/* EULA Modal */}
        {showEula && (
          <EulaAgreement
            onAccept={handleEulaAccept}
            error={error}
            isLoading={isActivating}
            onDecline={handleEulaDecline}
          />
        )}
      </>
    );
  }

  if (showRecoveryOptions) {
    return <RecoveryOptionsScreen onBack={handleBackToActivation} />;
  }

  return (
    <div className="min-h-screen overflow-y-auto">
      {/* EULA Modal */}
      {showEula && (
        <EulaAgreement
          onAccept={handleEulaAccept}
          error={error}
          isLoading={isActivating}
          onDecline={handleEulaDecline}
        />
      )}

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
                    window.open("https://localpasswordvault.com", "_blank");
                  }
                }}
                className="text-xs text-slate-400 hover:underline cursor-pointer"
              >
                LocalPasswordVault.com
              </button>
            </p>
          </div>

          {/* Trial Expiration Banner - Show based on localStorage trial data */}
          {localStorageTrialInfo.hasTrialBeenUsed && (
            <TrialExpirationBanner
              trialInfo={localStorageTrialInfo}
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
                  <Key className="w-6 h-6 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">
                    Activate License
                  </h2>
                </div>

                <div className="space-y-4 bg-transparent flex-1 flex flex-col">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      License Key
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
                    <div className="flex items-center space-x-2 text-red-400 text-sm">
                      <XCircle className="w-4 h-4" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    onClick={handleActivateLicense}
                    disabled={isActivating || !licenseKey.trim()}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white py-3 px-4 rounded-lg font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center space-x-2 mt-auto"
                  >
                    {isActivating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Activating...</span>
                      </>
                    ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Activate License</span>
                        </>
                      )}
                    </button>

                  <div className="text-center">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        if (window.electronAPI) {
                          window.electronAPI.openExternal(
                            "https://localpasswordvault.com/#plans"
                          );
                        } else {
                          window.open(
                            "https://localpasswordvault.com/#plans",
                            "_blank"
                          );
                        }
                        if (window.electronAPI?.hideFloatingButton) {
                          window.electronAPI.hideFloatingButton();
                        }
                      }}
                      className="text-blue-400 hover:text-blue-300 text-sm transition-colors inline-flex items-center space-x-1"
                    >
                      <span>Don't have a key? Buy now</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Trial Key Input */}
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
                      Trial Key
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
                    <div className="flex items-center space-x-2 text-red-400 text-sm">
                      <XCircle className="w-4 h-4" />
                      <span>{trialKeyError}</span>
                    </div>
                  )}

                  <button
                    onClick={handleActivateTrialKey}
                    disabled={isActivatingTrial || !trialKey.trim()}
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

                  <p className="text-xs text-slate-400 text-center">
                    All features unlocked • Key expires in 7 days
                  </p>
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

              <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {/* Personal Vault */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-all">
                  <div className="text-center mb-6">
                    <Shield className="w-12 h-12 text-blue-400 mx-auto mb-4" />
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
                    <Users className="w-12 h-12 text-purple-400 mx-auto mb-4" />
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