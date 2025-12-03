import React, { useState } from "react";
import { Key, ArrowLeft, HelpCircle, Loader2 } from "lucide-react";

// Consistent color palette
const colors = {
  steelBlue600: "#4A6FA5",
  steelBlue500: "#5B82B8",
  steelBlue400: "#7A9DC7",
  warmIvory: "#F3F4F6",
};

interface KeyActivationScreenProps {
  onBack: () => void;
  onKeyEntered: (key: string) => void;
  isActivating: boolean;
  error: string | null;
  onNeedHelp?: () => void;
}

export const KeyActivationScreen: React.FC<KeyActivationScreenProps> = ({
  onBack,
  onKeyEntered,
  isActivating,
  error,
  onNeedHelp,
}) => {
  const [licenseKey, setLicenseKey] = useState("");

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleActivate();
    }
  };

  const handleActivate = () => {
    if (licenseKey.trim()) {
      onKeyEntered(licenseKey.trim());
    }
  };

  const handleLicenseKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatLicenseKey(e.target.value.toUpperCase());
    setLicenseKey(formatted);
  };

  const formatLicenseKey = (value: string) => {
    const cleaned = value.replace(/[^A-Z0-9]/g, "");
    const formatted = cleaned.match(/.{1,4}/g)?.join("-") || cleaned;
    return formatted.substring(0, 19);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ 
                background: `linear-gradient(135deg, ${colors.steelBlue500}, ${colors.steelBlue600})`,
                boxShadow: `0 8px 32px ${colors.steelBlue500}30`,
              }}
            >
              <Key className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2" style={{ color: colors.warmIvory }}>
              Enter Your Lifetime Key
            </h2>
            <p className="text-slate-400 text-sm">
              Your license key was provided in your purchase confirmation email
            </p>
          </div>

          {/* License Key Input */}
          <div className="space-y-4 mb-6">
            <input
              type="text"
              value={licenseKey}
              onChange={handleLicenseKeyChange}
              onKeyPress={handleKeyPress}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="w-full px-4 py-3 bg-slate-700/30 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-center tracking-wider text-lg font-mono"
              style={{ color: colors.warmIvory }}
              maxLength={19}
              disabled={isActivating}
            />

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleActivate}
              disabled={isActivating || !licenseKey.trim()}
              className="w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-white disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: colors.steelBlue500,
                opacity: isActivating || !licenseKey.trim() ? 0.6 : 1
              }}
              onMouseOver={(e) => { if (!isActivating && licenseKey.trim()) e.currentTarget.style.backgroundColor = colors.steelBlue600 }}
              onMouseOut={(e) => { if (!isActivating && licenseKey.trim()) e.currentTarget.style.backgroundColor = colors.steelBlue500 }}
            >
              {isActivating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Activating...</span>
                </>
              ) : (
                <span>Activate Lifetime Access</span>
              )}
            </button>

            <button
              onClick={onBack}
              className="w-full text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2 py-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              <span>I Don't Have My Key</span>
            </button>
          </div>

          {/* Error-specific actions */}
          {error && onNeedHelp && (
            <div className="mb-4">
              <button
                onClick={onNeedHelp}
                className="w-full text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2 py-2 text-sm"
              >
                <HelpCircle className="w-4 h-4" strokeWidth={1.5} />
                <span>I Need Help With My Key</span>
              </button>
            </div>
          )}

          {/* Help Section */}
          <div className="p-4 bg-slate-700/20 rounded-xl border border-slate-700/30">
            <div className="flex items-start gap-3 text-slate-500 text-xs">
              <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <p>
                Can't find your key? Check your email from Local Password Vault or contact support at support@localpasswordvault.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};