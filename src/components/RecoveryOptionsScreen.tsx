import React from "react";
import { Mail, ExternalLink, ArrowLeft } from "lucide-react";

interface RecoveryOptionsScreenProps {
  onBack: () => void;
}

export const RecoveryOptionsScreen: React.FC<RecoveryOptionsScreenProps> = ({
  onBack,
}) => {
  const handleResendKey = () => {
    const url = "https://localpasswordvault.com/support";

    if (window.electronAPI) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const handleContactSupport = () => {
    const email = "mailto:support@localpasswordvault.com?subject=License Recovery Request";

    if (window.electronAPI) {
      window.electronAPI.openExternal(email);
    } else {
      window.location.href = email;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              Need Help?
            </h2>
            <p className="text-slate-400">
              Don't worry, we can help you recover your license
            </p>
          </div>

          {/* Recovery Options */}
          <div className="space-y-4 mb-8">
            <button
              onClick={handleResendKey}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3"
            >
              <Mail className="w-5 h-5" />
              <span className="text-left">
                <div className="font-semibold">Resend My Key</div>
                <div className="text-sm text-blue-200">Get your license file via email</div>
              </span>
            </button>

            <button
              onClick={handleContactSupport}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3"
            >
              <ExternalLink className="w-5 h-5" />
              <span className="text-left">
                <div className="font-semibold">Contact Support</div>
                <div className="text-sm text-slate-300">Get help from our support team</div>
              </span>
            </button>
          </div>

          {/* Back Button */}
          <button
            onClick={onBack}
            className="w-full text-slate-400 hover:text-white transition-colors flex items-center justify-center space-x-2 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Key Activation</span>
          </button>

          {/* Note */}
          <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
            <p className="text-slate-400 text-sm text-center">
              <strong>Note:</strong> For security reasons, all recovery options are handled through our secure website. The app stays completely offline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};