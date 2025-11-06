import React from "react";
import { Lock, Clock, AlertTriangle, CreditCard, Shield, ChevronRight, Key } from "lucide-react";

interface TrialExpirationBannerProps {
  trialInfo: {
    hasTrialBeenUsed: boolean;
    isExpired: boolean;
    isTrialActive: boolean;
    daysRemaining: number;
    startDate: Date | null;
    endDate: Date | null;
  };
  onApplyLicenseKey?: () => void;
}

export const TrialExpirationBanner: React.FC<TrialExpirationBannerProps> = ({ trialInfo, onApplyLicenseKey }) => {
  const isDevelopmentMode = import.meta.env.DEV;
  const timeUnit = isDevelopmentMode ? "minutes" : "days";

  const handlePurchaseNow = () => {
    const url = "https://localpasswordvault.com/#plans";
    if (window.electronAPI) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const handleApplyKey = () => {
    if (onApplyLicenseKey) {
      onApplyLicenseKey();
    }
  };

  // Don't show banner if trial hasn't been used at all
  if (!trialInfo.hasTrialBeenUsed) {
    return null;
  }

  // Always show banner when trial is expired
  if (trialInfo.isExpired) {
    return (
      <div className="w-full max-w-4xl mx-auto mb-8">
        {/* Enhanced Expiration Alert with Countdown */}
        <div className="bg-gradient-to-r from-red-900/95 to-red-800/95 border-2 border-red-600 rounded-2xl p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden">
          {/* Countdown overlay */}
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl font-bold text-red-300 mb-2">
                EXPIRED
              </div>
              <div className="text-xl text-red-400">
                Trial Access Terminated
              </div>
              </div>
          </div>

          {/* Header Section */}
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Your Trial Has Expired
                </h1>
                <p className="text-red-200 text-lg">
                  Thank you for trying Local Password Vault!
                </p>
              </div>
            </div>
          </div>

          {/* Message Section */}
          <div className="bg-red-950/50 rounded-xl p-6 mb-6 border border-red-700/50 relative z-10">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-400 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Access to Your Vault Has Been Suspended
                </h3>
                <p className="text-red-200 leading-relaxed">
                  Your trial period has ended and access to your password vault has been permanently suspended.
                  To continue using Local Password Vault and protect your sensitive data, you must purchase a license.
                </p>
                <p className="text-red-300 text-sm mt-2 font-medium">
                  ⚠️ Trial keys cannot be reused. Each trial key can only be activated once.
                </p>
              </div>
            </div>
          </div>

          {/* Trial Details */}
          <div className="grid md:grid-cols-2 gap-6 mb-6 relative z-10">
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300 font-medium">Trial Period</span>
              </div>
              <p className="text-white text-sm">
                {trialInfo.startDate && `Started: ${new Date(trialInfo.startDate).toLocaleDateString()}`}
              </p>
              <p className="text-red-400 text-sm">
                {trialInfo.endDate && `Expired: ${new Date(trialInfo.endDate).toLocaleDateString()}`}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300 font-medium">Security Notice</span>
              </div>
              <p className="text-white text-sm">
                Your data remains securely encrypted. No access is possible without a valid license.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 relative z-10">
            <button
              onClick={handlePurchaseNow}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <CreditCard className="w-5 h-5" />
              <span>Purchase License</span>
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleApplyKey}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Key className="w-5 h-5" />
              <span>Activate License Key</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Final Warning */}
          <div className="mt-6 text-center relative z-10">
            <p className="text-red-300 text-sm font-medium">
              🔒 Your passwords remain secure and encrypted. Purchase a license to regain access.
            </p>
            <p className="text-red-400 text-xs mt-1">
              This device is permanently locked from trial access. Trial keys are single-use only.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (trialInfo.isTrialActive && trialInfo.daysRemaining <= 3) {
    return (
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className="bg-gradient-to-r from-amber-900/90 to-orange-900/90 border-2 border-amber-600 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center animate-pulse">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">
                Trial Ending Soon
              </h2>
              <p className="text-amber-200">
                You have <strong>{trialInfo.daysRemaining} {timeUnit}</strong> remaining in your trial.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handlePurchaseNow}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Get License Now</span>
            </button>
            <button
              onClick={handleApplyKey}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2"
            >
              <Key className="w-4 h-4" />
              <span>Apply Your Key</span>
            </button>
          </div>
          <div className="mt-4 bg-amber-800/30 rounded-lg p-3 text-center">
            <p className="text-amber-300 text-sm">
              Expires: {trialInfo.endDate ? new Date(trialInfo.endDate).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};