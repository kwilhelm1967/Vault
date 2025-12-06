import React from "react";
import { trialService } from "../utils/trialService";
import { safeParseJWT } from "../utils/safeUtils";

// Constant determined at build time - never changes at runtime
const IS_DEV = import.meta.env.DEV;

interface TrialTestingToolsProps {
  onShowWarning: (type: 'expiring' | 'final') => void;
}

interface TrialInfo {
  isActive: boolean;
  endDate?: Date | string | null;
  daysRemaining?: number;
  hoursRemaining?: number;
  minutesRemaining?: number;
  secondsRemaining?: number;
}

export const TrialTestingTools: React.FC<TrialTestingToolsProps> = ({ onShowWarning }) => {
  const [, setCurrentTime] = React.useState(new Date());
  const [trialInfo, setTrialInfo] = React.useState<TrialInfo | null>(null);

  // Update time every second - only in dev mode
  // IS_DEV is a build-time constant, so empty deps array is correct
  React.useEffect(() => {
    if (!IS_DEV) return;
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Get trial info every second
    const trialInterval = setInterval(async () => {
      const info = await trialService.getTrialInfo();
      setTrialInfo(info);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(trialInterval);
    };
  }, []); // Empty deps - IS_DEV never changes at runtime
  
  // Only render in development mode - hidden in production
  if (!IS_DEV) {
    return null;
  }

  const handleTriggerExpiringWarning = () => {
    // Simulate the expiring warning state
    trialService.resetWarningPopups();
    setTimeout(() => {
      onShowWarning('expiring');
    }, 100);
  };

  const handleTriggerFinalWarning = () => {
    // Simulate the final warning state
    trialService.resetWarningPopups();
    setTimeout(() => {
      onShowWarning('final');
    }, 100);
  };

  const handleResetWarnings = () => {
    trialService.resetWarningPopups();
  };

  const handleCheckWarningPopups = async () => {
    console.log('🧪 MANUAL TRIGGER: Checking warning popups');
    await trialService.checkWarningPopups();
  };

  const handleLogTrialStatus = async () => {
    console.log('📊 MANUAL TRIGGER: Logging trial status');
    await trialService.logTrialStatus();
  };

  const handleDecodeJWT = () => {
    const token = localStorage.getItem('license_token');
    if (token) {
      const tokenData = safeParseJWT<{
        warningPopup1Timestamp?: string;
        warningPopup2Timestamp?: string;
        trialExpiryDate?: string;
        isTrial?: boolean;
      }>(token);
      
      if (tokenData) {
        console.log('🔑 JWT TOKEN DECODED:', tokenData);
        console.log('⚠️ WARNING TIMESTAMPS:', {
          warning1: tokenData.warningPopup1Timestamp,
          warning2: tokenData.warningPopup2Timestamp,
          expiry: tokenData.trialExpiryDate,
          isTrial: tokenData.isTrial
        });
      } else {
        console.log('❌ FAILED TO DECODE JWT - invalid format');
      }
    } else {
      console.log('❌ NO LICENSE TOKEN FOUND');
    }
  };

  const handleQuickJWTParse = () => {
    console.log('🚀 TESTING QUICK JWT PARSE...');
    const result = trialService.quickJWTParse();
    console.log('🎯 QUICK JWT RESULT:', result);
  };

  return (
    <div className="fixed bottom-4 left-4 bg-slate-800 border border-slate-600 rounded-lg p-4 text-white text-xs z-40 w-80">
      <div className="font-bold mb-2">Trial Testing Tools</div>

      {/* Real-time trial status */}
      {trialInfo && (
        <div className="mb-3 p-2 bg-slate-700 rounded">
          <div className="text-xs mb-1">
            <span className="text-green-400">Time remaining: </span>
            <span className="font-mono font-bold">{trialInfo.timeRemaining}</span>
          </div>
          <div className="text-xs text-slate-400">
            Trial Active: {trialInfo.isTrialActive ? '✅ Yes' : '❌ No'}
          </div>
          {trialInfo.warningPopup1Timestamp && (
            <div className="text-xs text-yellow-400">
              Warning 1: {new Date(trialInfo.warningPopup1Timestamp).toLocaleTimeString()}
            </div>
          )}
          {trialInfo.warningPopup2Timestamp && (
            <div className="text-xs text-red-400">
              Warning 2: {new Date(trialInfo.warningPopup2Timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
      <div className="space-y-2">
        <button
          onClick={handleQuickJWTParse}
          className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded text-xs"
        >
          Quick JWT Parse
        </button>
        <button
          onClick={handleDecodeJWT}
          className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-xs"
        >
          Decode JWT Token
        </button>
        <button
          onClick={handleLogTrialStatus}
          className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-xs"
        >
          Log Trial Status
        </button>
        <button
          onClick={handleCheckWarningPopups}
          className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-xs"
        >
          Check Warning Timings
        </button>
        <button
          onClick={handleTriggerExpiringWarning}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-xs"
        >
          Test Expiring Warning
        </button>
        <button
          onClick={handleTriggerFinalWarning}
          className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-xs"
        >
          Test Final Warning
        </button>
        <button
          onClick={handleResetWarnings}
          className="w-full px-3 py-2 bg-slate-600 hover:bg-slate-700 rounded text-xs"
        >
          Reset Warnings
        </button>
      </div>
    </div>
  );
};