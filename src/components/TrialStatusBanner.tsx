/**
 * TrialStatusBanner Component
 * 
 * Displays trial status with live countdown timer and purchase option.
 * Styled to match Local Password Vault design system.
 */

import React, { useState, useEffect } from "react";
import { Clock, ShoppingCart, AlertTriangle, Download, Shield } from "lucide-react";
import { trialService } from "../utils/trialService";

// Consistent color palette
const colors = {
  steelBlue600: "#4A6FA5",
  steelBlue500: "#5B82B8",
  steelBlue400: "#7A9DC7",
  warmIvory: "#F3F4F6",
  brandGold: "#C9AE66",
};

interface TrialStatusBannerProps {
  onPurchase?: () => void;
  onExport?: () => void;
  /** Dev mode: 'active' | 'urgent' | 'expired' to force show banner */
  previewMode?: 'active' | 'urgent' | 'expired';
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isActive: boolean;
}

export const TrialStatusBanner: React.FC<TrialStatusBannerProps> = ({ 
  onPurchase,
  onExport,
  previewMode,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Dev preview mode - show mock data
    if (previewMode) {
      const mockTimes: Record<string, TimeRemaining> = {
        active: { days: 5, hours: 12, minutes: 30, seconds: 45, isExpired: false, isActive: true },
        urgent: { days: 0, hours: 3, minutes: 45, seconds: 20, isExpired: false, isActive: true },
        expired: { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, isActive: false },
      };
      setTimeRemaining(mockTimes[previewMode]);
      setIsLoading(false);
      
      // Countdown for preview
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (!prev || prev.isExpired) return prev;
          let { days, hours, minutes, seconds } = prev;
          seconds--;
          if (seconds < 0) { seconds = 59; minutes--; }
          if (minutes < 0) { minutes = 59; hours--; }
          if (hours < 0) { hours = 23; days--; }
          if (days < 0) return { ...prev, isExpired: true, isActive: false };
          return { ...prev, days, hours, minutes, seconds };
        });
      }, 1000);
      return () => clearInterval(interval);
    }

    const loadTrialStatus = async () => {
      try {
        const trialInfo = await trialService.getTrialInfo();
        
        if (trialInfo.isTrialActive || trialInfo.isExpired) {
          updateTimeRemaining(trialInfo);
        } else {
          setTimeRemaining(null);
        }
      } catch {
        setTimeRemaining(null);
      } finally {
        setIsLoading(false);
      }
    };

    const updateTimeRemaining = (trialInfo: any) => {
      if (!trialInfo.endDate) {
        setTimeRemaining(null);
        return;
      }

      const now = new Date();
      const endDate = new Date(trialInfo.endDate);
      const diff = endDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
          isActive: false,
        });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false,
        isActive: true,
      });
    };

    loadTrialStatus();

    // Update countdown every second
    const interval = setInterval(async () => {
      const trialInfo = await trialService.getTrialInfo();
      if (trialInfo.isTrialActive || trialInfo.isExpired) {
        updateTimeRemaining(trialInfo);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [previewMode]);

  // Don't show if loading or no trial
  if (isLoading || !timeRemaining) {
    return null;
  }

  // Format time display
  const formatTime = () => {
    if (!timeRemaining) return "";
    
    const { days, hours, minutes, seconds } = timeRemaining;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Determine urgency
  const isUrgent = timeRemaining.days <= 1;
  const isVeryUrgent = timeRemaining.days === 0 && timeRemaining.hours <= 4;

  // Handle purchase click
  const handlePurchase = () => {
    if (onPurchase) {
      onPurchase();
    } else {
      const url = "https://localpasswordvault.com/#plans";
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(url);
      } else {
        window.open(url, "_blank");
      }
    }
  };

  // Alert palette for warning/expired states - subtle, translucent red
  const alertColors = {
    background: 'rgba(255, 75, 75, 0.10)',
    border: 'rgba(255, 75, 75, 0.25)',
    text: '#FF6B6B',
    textMuted: 'rgba(255, 107, 107, 0.7)',
    iconBg: 'rgba(255, 75, 75, 0.15)',
  };

  // Expired state
  if (timeRemaining.isExpired) {
    return (
      <div 
        className="rounded-xl px-4 py-3 mb-4"
        style={{ 
          backgroundColor: alertColors.background,
          border: `1px solid ${alertColors.border}`,
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: alertColors.iconBg }}
            >
              <AlertTriangle className="w-5 h-5" strokeWidth={1.5} style={{ color: alertColors.text }} />
            </div>
            <div>
              <h3 className="font-semibold text-sm" style={{ color: alertColors.text }}>Trial Expired</h3>
              <p className="text-xs" style={{ color: alertColors.textMuted }}>Purchase a license to continue</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onExport && (
              <button
                onClick={onExport}
                className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                Export
              </button>
            )}
            <button
              onClick={handlePurchase}
              className="px-4 py-2 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
              style={{ backgroundColor: colors.steelBlue500 }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue600}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue500}
            >
              <ShoppingCart className="w-3.5 h-3.5" strokeWidth={1.5} />
              Purchase License
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Warning state (urgent) - uses same alert palette for very urgent, gold for regular urgent
  if (isUrgent) {
    const useAlertStyle = isVeryUrgent;
    
    return (
      <div 
        className="rounded-xl px-4 py-3 mb-4"
        style={{ 
          backgroundColor: useAlertStyle ? alertColors.background : `${colors.brandGold}12`,
          border: `1px solid ${useAlertStyle ? alertColors.border : colors.brandGold}50`,
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: useAlertStyle ? alertColors.iconBg : `${colors.brandGold}20` }}
            >
              <AlertTriangle 
                className="w-5 h-5" 
                strokeWidth={1.5} 
                style={{ color: useAlertStyle ? alertColors.text : colors.brandGold }}
              />
            </div>
            <div>
              <h3 
                className="font-semibold text-sm"
                style={{ color: useAlertStyle ? alertColors.text : colors.brandGold }}
              >
                {isVeryUrgent ? 'Trial Expiring Soon!' : 'Trial Ending Soon'}
              </h3>
              <div className="flex items-center gap-2">
                <span 
                  className="font-mono font-bold text-base"
                  style={{ color: useAlertStyle ? alertColors.text : colors.warmIvory }}
                >
                  {formatTime()}
                </span>
                <span className="text-slate-500 text-xs">remaining</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onExport && (
              <button
                onClick={onExport}
                className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                Export
              </button>
            )}
            <button
              onClick={handlePurchase}
              className="px-4 py-2 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
              style={{ backgroundColor: colors.steelBlue500 }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue600}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue500}
            >
              <ShoppingCart className="w-3.5 h-3.5" strokeWidth={1.5} />
              Purchase Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Normal active trial state
  return (
    <div 
      className="rounded-xl px-4 py-2.5 mb-4 border"
      style={{ 
        backgroundColor: `${colors.steelBlue500}10`,
        borderColor: `${colors.steelBlue500}30`,
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${colors.steelBlue500}20` }}
          >
            <Clock className="w-5 h-5" strokeWidth={1.5} style={{ color: colors.steelBlue400 }} />
          </div>
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm" style={{ color: colors.warmIvory }}>
                  7-Day Trial
                </h3>
                <span 
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}
                >
                  Active
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span 
                  className="font-mono font-bold text-lg"
                  style={{ color: colors.warmIvory }}
                >
                  {formatTime()}
                </span>
                <span className="text-slate-500 text-xs">remaining</span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-500 text-xs">
              <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Full functionality available</span>
            </div>
          </div>
        </div>
        <button
          onClick={handlePurchase}
          className="px-4 py-2 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
          style={{ backgroundColor: colors.steelBlue500 }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue600}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue500}
        >
          <ShoppingCart className="w-3.5 h-3.5" strokeWidth={1.5} />
          Purchase License
        </button>
      </div>
    </div>
  );
};

