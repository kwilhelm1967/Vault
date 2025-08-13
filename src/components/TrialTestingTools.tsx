import React from "react";
import { Settings, RefreshCw, Calendar, Trash2 } from "lucide-react";
import { licenseService } from "../utils/licenseService";
import { trialService } from "../utils/trialService";

interface TrialTestingToolsProps {
  onClose: () => void;
}

export const TrialTestingTools: React.FC<TrialTestingToolsProps> = ({
  onClose,
}) => {
  const appStatus = licenseService.getAppStatus();

  const handleResetTrial = () => {
    trialService.resetTrial();
    window.location.reload();
  };

  const handleStartTrial = () => {
    if (licenseService.canStartTrial()) {
      licenseService.startTrial();
      window.location.reload();
    }
  };

  const handleSimulateExpiry = () => {
    // Manually set trial to expired for testing
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 8); // 8 days ago
    localStorage.setItem("trial_start_date", pastDate.toISOString());
    localStorage.setItem("trial_used", "true");
    window.location.reload();
  };

  const handleSimulateLastDay = () => {
    // Set trial to expire in 1 day
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 6); // 6 days ago (1 day remaining)
    localStorage.setItem("trial_start_date", pastDate.toISOString());
    localStorage.setItem("trial_used", "true");
    window.location.reload();
  };

  const handleRemoveLicense = () => {
    licenseService.removeLicense();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">
              Trial Testing Tools
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ×
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h3 className="font-medium text-white mb-2">Current Status</h3>
            <div className="text-sm text-slate-300 space-y-1">
              <p>Licensed: {appStatus.isLicensed ? "Yes" : "No"}</p>
              <p>
                Trial Active: {appStatus.trialInfo.isTrialActive ? "Yes" : "No"}
              </p>
              <p>
                Trial Used:{" "}
                {appStatus.trialInfo.hasTrialBeenUsed ? "Yes" : "No"}
              </p>
              <p>Days Remaining: {appStatus.trialInfo.daysRemaining}</p>
              <p>Can Use App: {appStatus.canUseApp ? "Yes" : "No"}</p>
              <p>
                Requires Purchase: {appStatus.requiresPurchase ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleResetTrial}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-all flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Trial</span>
          </button>

          <button
            onClick={handleStartTrial}
            disabled={!licenseService.canStartTrial()}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-all flex items-center justify-center space-x-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Start Trial</span>
          </button>

          <button
            onClick={handleSimulateLastDay}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition-all flex items-center justify-center space-x-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Simulate Last Day</span>
          </button>

          <button
            onClick={handleSimulateExpiry}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-all flex items-center justify-center space-x-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Simulate Expired Trial</span>
          </button>

          <button
            onClick={handleRemoveLicense}
            className="w-full bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded-lg transition-all flex items-center justify-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove License</span>
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-400 text-center">
            Development tools - only visible in test environment
          </p>
        </div>
      </div>
    </div>
  );
};
