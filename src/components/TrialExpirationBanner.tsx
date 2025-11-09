import React from "react";
import { Lock, Clock, CreditCard, Key } from "lucide-react";

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
  showLicenseInput?: boolean;
}

export const TrialExpirationBanner: React.FC<TrialExpirationBannerProps> = ({ trialInfo, onApplyLicenseKey, showLicenseInput = false }) => {

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

  // Always show banner when trial is expired - SIMPLIFIED VERSION
  // Hide if user has clicked "I Already Purchased a Key"
  if (trialInfo.isExpired && !showLicenseInput) {
    return (
      <div className="w-full max-w-2xl mx-auto mb-8">
        <div className="bg-slate-800 border-2 border-slate-600 rounded-xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">
            Your Trial Has Ended
          </h1>

          <p className="text-slate-300 text-lg mb-8">
            Your 7 day trial has expired.
            <br />
            Your vault is still safely stored on your device.
            <br />
            To continue using Local Password Vault, you need a lifetime key.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handlePurchaseNow}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-8 rounded-xl font-semibold transition-all duration-200"
            >
              Buy Lifetime Access
            </button>
            <button
              onClick={handleApplyKey}
              className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-8 rounded-xl font-semibold transition-all duration-200"
            >
              I Already Purchased a Key
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (trialInfo.isTrialActive && trialInfo.daysRemaining <= 3) {
    return (
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className="bg-slate-800 border border-amber-600 rounded-xl p-6 shadow-xl">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center animate-pulse">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">
                Trial Ending Soon
              </h2>
              <p className="text-amber-200">
                You have <strong>{trialInfo.daysRemaining}</strong> remaining in your trial.
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
          <div className="mt-4 bg-amber-900/30 rounded-lg p-3 text-center">
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