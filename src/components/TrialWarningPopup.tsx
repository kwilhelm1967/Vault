import React from "react";
import { X, Download, ArrowRight, AlertTriangle, Clock } from "lucide-react";

// Consistent color palette
const colors = {
  steelBlue600: "#4A6FA5",
  steelBlue500: "#5B82B8",
  steelBlue400: "#7A9DC7",
  warmIvory: "#F3F4F6",
  brandGold: "#C9AE66",
};

interface TrialWarningPopupProps {
  warningType: "expiring" | "final";
  onClose: () => void;
  onPurchaseNow: () => void;
  onDownloadContent: () => void;
}

export const TrialWarningPopup: React.FC<TrialWarningPopupProps> = ({
  warningType,
  onClose,
  onPurchaseNow,
  onDownloadContent,
}) => {
  const content = {
    expiring: {
      headline: "Trial Expiring Soon",
      body: "Your trial period is almost over. Don't lose access to your saved passwords and premium features.",
      icon: Clock,
      iconBg: `${colors.brandGold}20`,
      iconColor: colors.brandGold,
    },
    final: {
      headline: "Final Notice",
      body: "Your trial ends today. After this, you'll need a lifetime key to access your vault.",
      icon: AlertTriangle,
      iconBg: "rgba(239, 68, 68, 0.1)",
      iconColor: "#f87171",
    },
  };

  const currentContent = content[warningType];
  const IconComponent = currentContent.icon;

  return (
    <div className="form-modal-backdrop" style={{ zIndex: 9999 }}>
      <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-600/50 shadow-2xl w-full max-w-md">
        <div className="p-8 relative flex flex-col items-center text-center">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
            title="Close"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>

          {/* Icon */}
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
            style={{ backgroundColor: currentContent.iconBg }}
          >
            <IconComponent className="w-7 h-7" strokeWidth={1.5} style={{ color: currentContent.iconColor }} />
          </div>

          {/* Headline */}
          <h3 className="text-xl font-bold tracking-tight mb-3" style={{ color: colors.warmIvory }}>
            {currentContent.headline}
          </h3>

          {/* Body Text */}
          <p className="text-slate-400 text-sm mb-8 max-w-sm leading-relaxed">
            {currentContent.body}
          </p>

          {/* Action Buttons */}
          <div className="w-full flex flex-col items-center gap-3">
            <button
              onClick={onPurchaseNow}
              className="w-full max-w-xs flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all text-sm text-white"
              style={{ backgroundColor: colors.steelBlue500 }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue600}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue500}
            >
              <span>Purchase Now</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>

            <button
              onClick={onDownloadContent}
              className="flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors text-sm"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
              <span>Export Your Data First</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
