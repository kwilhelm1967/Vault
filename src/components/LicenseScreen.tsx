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
} from "lucide-react";
import { analyticsService } from "../utils/analyticsService";
import { licenseService, AppLicenseStatus } from "../utils/licenseService";
import { EulaAgreement } from "./EulaAgreement";
import { DownloadInstructions } from "./DownloadInstructions";
import { DownloadPage } from "./DownloadPage";
import { TrialExpirationBanner } from "./TrialExpirationBanner";

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
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [appStatus, setAppStatus] = useState<AppLicenseStatus | null>(null); // Removed
  // const [isLoading, setIsLoading] = useState(true); // Removed

  // Initialize app status on mount - Removed
  // useEffect(() => {
  //   const initAppStatus = async () => {
  //     try {
  //       const status = await licenseService.getAppStatus();
  //       setAppStatus(status);
  //     } catch (error) {
  //       console.error('Error initializing app status:', error);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };
  //   initAppStatus();
  // }, []);

  const updateAppStatus = useCallback(async () => {
    try {
      // We call onLicenseValid, which is updateAppStatus from App.tsx
      // This will trigger a re-render with a new appStatus prop
      onLicenseValid();
      // No need to fetch status internally anymore
      // const status = await licenseService.getAppStatus();
      // setAppStatus(status);
      // return status;
    } catch (error) {
      console.error('Error updating app status:', error);
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
  const [showLicenseInput, setShowLicenseInput] = useState(false);

  const handleApplyLicenseKey = () => {
    setShowLicenseInput(true);
    // Reset any previous errors when showing license input
    setError(null);
    setLicenseKey("");
    // Scroll to the license activation section
    setTimeout(() => {
      const licenseSection = document.getElementById(
        "license-activation-section"
      );
      if (licenseSection) {
        licenseSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  // Reset license input when trial expires
  useEffect(() => {
    if (appStatus?.trialInfo?.isExpired && showLicenseInput) {
      // Keep license input visible if user already clicked apply key
      // But clear any previous errors
      setError(null);
    }
  }, [appStatus?.trialInfo?.isExpired, showLicenseInput]);

  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) {
      setError("Please enter a license key");
      return;
    }

    setShowEula(true);
  };

  const handleEulaAccept = async () => {
    setIsActivating(true);
    setError(null);

    try {
      const result = await licenseService.activateLicense(
        licenseKey.trim().toUpperCase()
      );

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
      } else {
        // Enhanced error messages based on specific errors
        let enhancedError = result.error || "License activation failed";

        if (result.error?.includes("fetch")) {
          enhancedError =
            "Unable to connect to license server. Please check your internet connection and ensure the backend server is running.";
        } else if (result.error?.includes("409")) {
          enhancedError =
            "This license key is already activated on another device. Each license can only be used on one device at a time.";
        } else if (result.error?.includes("404")) {
          enhancedError =
            "License key not found. Please double-check your license key and try again.";
        } else if (result.error?.includes("trial") && result.error?.includes("expir")) {
          enhancedError =
            "Your trial period has expired. Trial licenses can only be used once. Please purchase a license to continue using the app.";
        } else if (result.error?.includes("trial") && result.error?.includes("once")) {
          enhancedError =
            "This trial license has already been used. Trial licenses can only be activated once. Please purchase a license to continue using the app.";
        } else if (result.error?.includes("validation")) {
          enhancedError =
            "Invalid license key format. Please ensure your key is in the format: XXXX-XXXX-XXXX-XXXX";
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

  // Show loading state while app status is being determined
  if (!appStatus) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading license screen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 overflow-y-auto">
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
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
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

      <div className="min-h-screen flex flex-col bg-slate-900 overflow-y-auto">
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

          {/* Trial Expiration Banner - Always show when trial is expired */}
          {(() => {
            const shouldShowBanner = appStatus?.trialInfo?.isExpired;
            console.log('🚨 Banner Render Check:', {
              trialExpired: appStatus?.trialInfo?.isExpired,
              shouldShowBanner,
              trialInfo: appStatus?.trialInfo
            });
            return shouldShowBanner;
          })() && (
            <TrialExpirationBanner
              trialInfo={appStatus.trialInfo}
              onApplyLicenseKey={handleApplyLicenseKey}
            />
          )}

          {/* License Activation - Hide when trial is expired unless user clicks apply key */}
          {!showPricingPlans ? (
            <div className="max-w-md mx-auto mb-8">
              {/* License Activation */}
              <div
                id="license-activation-section"
                className={`${
                  // Debug logging
                  (() => {
                    console.log('🔧 License Screen Visibility Check:', {
                      trialExpired: appStatus?.trialInfo?.isExpired,
                      showLicenseInput,
                      showPricingPlans,
                      canUseApp: appStatus?.canUseApp,
                      condition1: appStatus?.trialInfo?.isExpired && showLicenseInput,
                      condition2: !appStatus?.trialInfo?.isExpired,
                      shouldShow: (appStatus?.trialInfo?.isExpired && showLicenseInput) || !appStatus?.trialInfo?.isExpired
                    });
                    return '';
                  })()
                } ${
                  // if trial is expired, only show if user clicks 'apply key'
                  (appStatus?.trialInfo?.isExpired && showLicenseInput) ||
                  // if trial is not expired (or not started), show it
                  !appStatus?.trialInfo?.isExpired
                    ? "block"
                    : "hidden"
                }`}
              >
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                  <div className="flex bg-transparent items-center space-x-3 mb-6">
                    <Key className="w-6 h-6 text-blue-400" />
                    <h2 className="text-xl font-semibold text-white">
                      Activate License
                    </h2>
                  </div>

                  <div className="space-y-4 bg-transparent">
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
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all  text-center tracking-wider"
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
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white py-3 px-4 rounded-lg font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
                              "https://localpasswordvault.com"
                            );
                          } else {
                            window.open(
                              "https://localpasswordvault.com",
                              "_blank"
                            );
                          }
                        }}
                        className="text-blue-400 hover:text-blue-300 text-sm transition-colors inline-flex items-center space-x-1"
                      >
                        <span>Don't have a license? Purchase one</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
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

              <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {/* Single User */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-all">
                  <div className="text-center mb-6">
                    <Shield className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Personal License
                    </h3>
                    <div className="text-3xl font-bold text-white mb-1">
                      $29.99
                    </div>
                    <p className="text-slate-400 text-sm">One-time purchase</p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Unlimited passwords</span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Advanced encryption</span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Export data</span>
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
                    <span>Purchase Personal</span>
                  </button>
                </div>

                {/* Family Plan */}
                <div className="bg-slate-800/50 backdrop-blur-sm border-2 border-purple-500 rounded-xl p-6 relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Most Popular
                    </span>
                  </div>

                  <div className="text-center mb-6">
                    <Users className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Family Plan
                    </h3>
                    <div className="text-3xl font-bold text-white mb-1">
                      $49.99
                    </div>
                    <p className="text-slate-400 text-sm">One-time purchase</p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Everything in Single User</span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>5 separate license keys</span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Floating panel</span>
                    </li>
                    <li className="hidden items-center space-x-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Priority support</span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Family sharing</span>
                    </li>
                  </ul>

                  <button
                    onClick={() => handlePurchase("family")}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-all text-center flex items-center justify-center space-x-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Purchase Family Plan</span>
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
              Need help? Visit{" "}
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
