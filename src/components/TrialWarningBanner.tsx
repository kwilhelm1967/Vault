import React from "react";
import { Clock, AlertTriangle, CreditCard } from "lucide-react";
import { licenseService } from "../utils/licenseService";

interface TrialWarningBannerProps {
  onPurchase: () => void;
}

export const TrialWarningBanner: React.FC<TrialWarningBannerProps> = ({
  onPurchase,
}) => {
  const appStatus = licenseService.getAppStatus();

  // Don't show if licensed or trial not active
  if (appStatus.isLicensed || !appStatus.trialInfo.isTrialActive) {
    return null;
  }

  // Show warning when 2 days or less remaining
  if (appStatus.trialInfo.daysRemaining > 2) {
    return null;
  }

  const isUrgent = appStatus.trialInfo.daysRemaining <= 1;
  const bgColor = isUrgent
    ? "bg-red-600/20 border-red-500/30"
    : "bg-orange-600/20 border-orange-500/30";
  const iconColor = isUrgent ? "text-red-400" : "text-orange-400";
  const textColor = isUrgent ? "text-red-300" : "text-orange-300";

  return (
    <div
      className={`${bgColor} border rounded-lg p-4 mb-4 flex items-center justify-between`}
    >
      <div className="flex items-center space-x-3">
        {isUrgent ? (
          <AlertTriangle className={`w-5 h-5 ${iconColor}`} />
        ) : (
          <Clock className={`w-5 h-5 ${iconColor}`} />
        )}
        <div>
          <p className={`font-medium ${textColor}`}>
            {isUrgent ? "Trial expires soon!" : "Trial ending soon"}
          </p>
          <p className="text-slate-400 text-sm">
            {licenseService.getTrialTimeRemaining()} - Don't lose access to your
            vault
          </p>
        </div>
      </div>

      <button
        onClick={onPurchase}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 text-sm"
      >
        <CreditCard className="w-4 h-4" />
        <span>Purchase Now</span>
      </button>
    </div>
  );
};
