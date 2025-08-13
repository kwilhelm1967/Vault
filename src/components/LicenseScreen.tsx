import React, { useState, useEffect } from "react";
import {
  Lock,
  Key,
  Shield,
  Users,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  CreditCard,
  ArrowLeft,
  Download,
} from "lucide-react";
import { analyticsService } from "../utils/analyticsService";
import { licenseService } from "../utils/licenseService";
import { EulaAgreement } from "./EulaAgreement";
import { DownloadInstructions } from "./DownloadInstructions";
import { PaymentScreen } from "./PaymentScreen";
import { DownloadPage } from "./DownloadPage";

interface LicenseScreenProps {
  onLicenseValid: () => void;
  onShowPricingPlans?: () => void;
  showPricingPlans?: boolean;
  onHidePricingPlans?: () => void;
}

export const LicenseScreen: React.FC<LicenseScreenProps> = ({
  onLicenseValid,
  onShowPricingPlans,
  showPricingPlans = false,
  onHidePricingPlans,
}) => {
  const [licenseKey, setLicenseKey] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appStatus, setAppStatus] = useState(() =>
    licenseService.getAppStatus()
  );
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<
    "single" | "pro" | "family" | "business"
  >("single");
  const [showEula, setShowEula] = useState(false);
  const [showDownloadInstructions, setShowDownloadInstructions] =
    useState(false);
  const [pendingLicenseKey, setPendingLicenseKey] = useState("");
  const [showDownloadPage, setShowDownloadPage] = useState(false);

  useEffect(() => {
    // Update app status every minute to check trial expiration
    const interval = setInterval(() => {
      setAppStatus(licenseService.getAppStatus());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) {
      setError("Please enter a license key");
      return;
    }

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
        setAppStatus(licenseService.getAppStatus());
        onLicenseValid();
      } else {
        setError(result.error || "License activation failed");
        analyticsService.trackLicenseEvent(
          "license_activation_failed",
          undefined,
          {
            error: result.error || "Unknown error",
          }
        );
      }
    } catch (error) {
      setError("License activation failed. Please try again.");
      analyticsService.trackLicenseEvent(
        "license_activation_error",
        undefined,
        {
          error: "Server error",
        }
      );
    } finally {
      setIsActivating(false);
    }
  };

  const handleEulaAccept = async () => {
    setIsActivating(true);
    setError(null);

    try {
      // In a real app, this would validate with a server
      const result = { success: true };

      if (result.success) {
        analyticsService.trackLicenseEvent("license_activated", "pro");
        onLicenseValid();
      } else {
        setError("License activation failed");
        analyticsService.trackLicenseEvent(
          "license_activation_failed",
          undefined,
          {
            error: "Invalid license",
            eulaAccepted: true,
          }
        );
      }
    } catch (error) {
      setError("License activation failed. Please try again.");
      analyticsService.trackLicenseEvent(
        "license_activation_error",
        undefined,
        {
          error: "Server error",
          eulaAccepted: true,
        }
      );
    } finally {
      setIsActivating(false);
      setShowEula(false);
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

  const handleStartTrial = () => {
    if (appStatus.trialInfo.isTrialActive) {
      // Show EULA before continuing trial
      setPendingLicenseKey("TRIAL");
      setShowEula(true);
    } else if (licenseService.canStartTrial()) {
      // Start new trial
      setPendingLicenseKey("TRIAL");
      setShowEula(true);
    } else {
      // Trial expired or already used
      if (onShowPricingPlans) {
        onShowPricingPlans();
      }
      analyticsService.trackConversion("trial_expired_purchase_shown");
    }
  };

  const handleTrialEulaAccept = () => {
    if (!appStatus.trialInfo.isTrialActive && licenseService.canStartTrial()) {
      // Start new trial
      licenseService.startTrial();
      setAppStatus(licenseService.getAppStatus());
      analyticsService.trackLicenseEvent("trial_started");
    } else {
      // Continue existing trial
      analyticsService.trackLicenseEvent("trial_continued");
    }
    onLicenseValid();
    setShowEula(false);
  };

  const handlePurchase = (plan: "single" | "pro" | "family" | "business") => {
    setSelectedPlan(plan);
    setShowPayment(true);
    analyticsService.trackConversion("purchase_started", { plan });
  };

  const handlePaymentComplete = (licenseKey: string) => {
    setPendingLicenseKey(licenseKey);
    setShowEula(true);
    setShowPayment(false);
    analyticsService.trackConversion("payment_completed", {
      plan: selectedPlan,
      licenseKey: licenseKey.substring(0, 8) + "****",
      amount:
        selectedPlan === "single"
          ? 29.99
          : selectedPlan === "pro"
          ? 68.0
          : selectedPlan === "family"
          ? 49.99
          : 99.99,
    });

    // Show download instructions
    setShowDownloadInstructions(true);
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

  return (
    <>
      {/* EULA Modal */}
      {showEula && (
        <EulaAgreement
          onAccept={
            pendingLicenseKey === "TRIAL"
              ? handleTrialEulaAccept
              : handleEulaAccept
          }
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

      {showPayment && (
        <PaymentScreen
          onBack={() => {
            setShowPayment(false);
            window.scrollTo(0, 0);
          }}
          onPaymentComplete={handlePaymentComplete}
          selectedPlan={selectedPlan}
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

      <div className="max-w-4xl w-full mx-auto">
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
          <p className="text-slate-400">Local offline password management</p>
          <p className="text-xs text-slate-500 mt-2">
            by{" "}
            <a
              href="https://LocalPasswordVault.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              LocalPasswordVault.com
            </a>
          </p>
        </div>

        {!showPricingPlans ? (
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* License Activation */}
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
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-center tracking-wider"
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
                  <a
                    href="https://LocalPasswordVault.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm transition-colors inline-flex items-center space-x-1"
                  >
                    <span>Don't have a license? Purchase one</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Trial Status */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <div className="bg-transparent">
                <div className="flex items-center space-x-3 mb-6">
                  <Clock className="w-6 h-6 text-green-400" />
                  <h2 className="text-xl font-semibold text-white">
                    Trial Status
                  </h2>
                </div>

                {appStatus.trialInfo.isTrialActive ||
                licenseService.canStartTrial() ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-400 mb-2">
                        {appStatus.trialInfo.daysRemaining}
                      </div>
                      <p className="text-slate-300">
                        {appStatus.trialInfo.daysRemaining === 1
                          ? "day"
                          : "days"}{" "}
                        {appStatus.trialInfo.isTrialActive
                          ? "remaining in trial"
                          : "available"}
                      </p>

                      {appStatus.trialInfo.isTrialActive && (
                        <div className="mt-3">
                          <div className="w-full bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${licenseService.getTrialProgress()}%`,
                              }}
                            ></div>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {licenseService.getTrialTimeRemaining()}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="bg-transparent">
                        <h3 className="font-medium text-white mb-2">
                          Trial includes:
                        </h3>
                        <ul className="space-y-1 text-sm text-slate-300">
                          <li>• Unlimited password storage</li>
                          <li>• All premium features</li>
                          <li>• Import/Export functionality</li>
                          <li>• Floating panel access</li>
                        </ul>
                      </div>
                    </div>

                    <button
                      onClick={handleStartTrial}
                      className="w-full bg-green-400 text-white py-3 px-4 rounded-lg font-medium transition-all"
                    >
                      {appStatus.trialInfo.isTrialActive
                        ? "Continue Trial"
                        : "Start Free Trial"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-400 mb-2">
                        Expired
                      </div>
                      <p className="text-slate-300">Your trial has ended</p>
                    </div>

                    <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
                      <p className="text-red-300 text-sm text-center">
                        Purchase a license to continue using Local Password
                        Vault
                      </p>
                    </div>

                    <button
                      onClick={onShowPricingPlans}
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-all"
                    >
                      View Pricing Plans
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Pricing Plans */
          <div className="space-y-6 mb-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                Choose Your Plan
              </h2>
              <p className="text-slate-400 mb-4">
                Local password management for every need
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              {/* Single User */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-all">
                <div className="text-center mb-6">
                  <Shield className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Single User
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
                    <span>Import/Export data</span>
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
                  <span>Purchase Single User</span>
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
                    <span>3 devices</span>
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

              {/* Pro */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500 rounded-xl p-6 hover:border-indigo-400/50 transition-all">
                <div className="text-center mb-6">
                  <Shield className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Pro License
                  </h3>
                  <div className="text-3xl font-bold text-white mb-1">
                    $68.00
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
                    <span>Import/Export data</span>
                  </li>
                  <li className="flex items-center space-x-2 text-slate-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Floating panel</span>
                  </li>
                  <li className="flex items-center space-x-2 text-slate-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>6 devices</span>
                  </li>
                </ul>

                <button
                  onClick={() => handlePurchase("pro")}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-medium transition-all text-center flex items-center justify-center space-x-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Purchase Pro</span>
                </button>
              </div>

              {/* Business Plan */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-green-500/50 transition-all">
                <div className="text-center mb-6">
                  <Building className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Business Plan
                  </h3>
                  <div className="text-3xl font-bold text-white mb-1">
                    $99.99
                  </div>
                  <p className="text-slate-400 text-sm">One-time purchase</p>
                </div>

                <ul className="space-y-3 mb-6">
                  <li className="flex items-center space-x-2 text-slate-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Everything in Family Plan</span>
                  </li>
                  <li className="flex items-center space-x-2 text-slate-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>10 devices</span>
                  </li>
                  <li className="flex items-center space-x-2 text-slate-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Floating panel</span>
                  </li>
                  <li className="flex items-center space-x-2 text-slate-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Team management</span>
                  </li>
                  <li className="hidden items-center space-x-2 text-slate-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Enterprise support</span>
                  </li>
                </ul>

                <button
                  onClick={() => handlePurchase("business")}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-all text-center flex items-center justify-center space-x-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Purchase Business Plan</span>
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

        {/* Footer */}
        <div className="text-center mt-8 pt-8 border-t border-slate-700">
          <p className="text-xs text-slate-500">
            Secure • Private • Offline • Local Password Management
          </p>
          <p className="text-xs text-slate-600 mt-2">
            Need help? Visit{" "}
            <a
              href="mailto:support@LocalPasswordVault.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              support@LocalPasswordVault.com
            </a>
          </p>
        </div>
      </div>
    </>
  );
};
