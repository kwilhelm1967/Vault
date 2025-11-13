import React from "react";
import { X, ExternalLink, ArrowRight } from "lucide-react";

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
      headline: "Trial Expiring Soon!",
      body: "Your trial period is almost over. Don't lose access to your work or the premium features you've been enjoying.",
    },
    final: {
      headline: "Final Notice: Your Trial Ends Today",
      body: "Your trial period ends today — after this, you'll lose access to your trial features.",
    },
  };

  const currentContent = content[warningType];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
      {/* Main content box */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-2xl overflow-hidden border border-slate-600/50 shadow-2xl w-full max-w-md">
        {/* Using the layout from your images (centered, no header) */}
        <div className="p-8 pt-12 relative flex flex-col items-center text-center">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Headline - Styled like EntryForm header */}
          <h3 className="text-2xl font-bold text-white mb-4">
            {currentContent.headline}
          </h3>

          {/* Body Text - Styled like EntryForm body text */}
          <p className="text-slate-400 text-base mb-8 max-w-sm">
            {currentContent.body}
          </p>

          {/* Action Buttons Container */}
          <div className="w-full flex flex-col items-center space-y-4">
            {/* Purchase Now Button - Styled like EntryForm primary button */}
            <button
              onClick={onPurchaseNow}
              className="w-full max-w-xs flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-3 px-4 rounded-xl font-medium transition-all text-sm shadow-lg"
            >
              <span>Purchase Now</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Download Content Link - Styled as a simple text link */}
            <button
              onClick={onDownloadContent}
              className="flex items-center justify-center space-x-1.5 text-slate-400 hover:text-white transition-colors text-sm font-medium"
            >
              <span>Download Your Current Content</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
