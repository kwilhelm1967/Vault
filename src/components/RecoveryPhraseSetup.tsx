/**
 * RecoveryPhraseSetup Component
 * 
 * Displays the recovery phrase during vault setup and requires user confirmation.
 */

import React, { useState } from "react";
import { Shield, Copy, Check, AlertTriangle, ChevronRight, Eye, EyeOff } from "lucide-react";

const colors = {
  steelBlue600: "#4A6FA5",
  steelBlue500: "#5B82B8",
  steelBlue400: "#7A9DC7",
  warmIvory: "#F3F4F6",
  brandGold: "#C9AE66",
};

interface RecoveryPhraseSetupProps {
  phrase: string;
  onConfirm: () => void;
  onBack: () => void;
}

export const RecoveryPhraseSetup: React.FC<RecoveryPhraseSetupProps> = ({
  phrase,
  onConfirm,
  onBack,
}) => {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showPhrase, setShowPhrase] = useState(false);
  
  const words = phrase.split(" ");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(phrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-lg mx-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          {/* Content */}
          <div className="p-6">
            {/* Header */}
            <header className="text-center mb-4">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ 
                  background: `linear-gradient(135deg, ${colors.steelBlue500}, ${colors.steelBlue600})`,
                }}
              >
                <Shield className="w-7 h-7 text-white" strokeWidth={1.5} />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Recovery Phrase
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Save these words to recover your vault
              </p>
            </header>

            {/* Warning Card */}
            <div 
              className="rounded-xl p-3 mb-4 flex gap-2"
              style={{
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
              }}
            >
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <p className="text-slate-300 text-sm leading-snug">
                Write down these 12 words and store safely. This is the only way to recover your vault.
              </p>
            </div>

            {/* Phrase Card */}
            <div 
              className="rounded-xl p-4 mb-4"
              style={{
                backgroundColor: "rgba(30, 41, 59, 0.8)",
                border: `1px solid ${colors.steelBlue500}30`,
              }}
            >
              {/* Reveal Toggle */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-xs uppercase tracking-wider font-medium">
                  Your 12-Word Recovery Phrase
                </span>
                <button
                  onClick={() => setShowPhrase(!showPhrase)}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: `${colors.steelBlue500}15`,
                    color: colors.steelBlue400,
                  }}
                >
                  {showPhrase ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                  {showPhrase ? "Hide" : "Reveal"}
                </button>
              </div>

              {/* Words Grid */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {words.map((word, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.6)" }}
                  >
                    <span className="text-slate-500 text-sm w-5">{index + 1}.</span>
                    <span 
                      className="text-sm font-medium"
                      style={{ 
                        color: showPhrase ? colors.warmIvory : "transparent",
                        textShadow: showPhrase ? "none" : "0 0 8px rgba(255,255,255,0.5)",
                        userSelect: showPhrase ? "text" : "none",
                      }}
                    >
                      {showPhrase ? word : "••••••"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Copy Button */}
              <button
                onClick={handleCopy}
                disabled={!showPhrase}
                className="w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: copied ? "rgba(16, 185, 129, 0.15)" : `${colors.steelBlue500}15`,
                  color: copied ? "#10b981" : colors.steelBlue400,
                  border: `1px solid ${copied ? "rgba(16, 185, 129, 0.3)" : `${colors.steelBlue500}30`}`,
                  opacity: showPhrase ? 1 : 0.5,
                  cursor: showPhrase ? "pointer" : "not-allowed",
                }}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" strokeWidth={2} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" strokeWidth={1.5} />
                    Copy Phrase
                  </>
                )}
              </button>
            </div>

            {/* Confirmation Checkbox */}
            <label className="flex items-center gap-3 mb-4 cursor-pointer">
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="sr-only"
                />
                <div 
                  className="w-5 h-5 rounded border-2 transition-all flex items-center justify-center"
                  style={{
                    borderColor: confirmed ? colors.steelBlue500 : "#475569",
                    backgroundColor: confirmed ? colors.steelBlue500 : "transparent",
                  }}
                >
                  {confirmed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
              </div>
              <span className="text-slate-300 text-sm">
                I have saved my recovery phrase in a safe place.
              </span>
            </label>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onBack}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-all hover:bg-slate-600/50"
                style={{
                  backgroundColor: "rgba(51, 65, 85, 0.5)",
                  color: colors.warmIvory,
                }}
              >
                Back
              </button>
              <button
                onClick={onConfirm}
                disabled={!confirmed}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                style={{
                  background: confirmed 
                    ? `linear-gradient(135deg, ${colors.steelBlue500}, ${colors.steelBlue600})`
                    : "rgba(51, 65, 85, 0.5)",
                  color: "white",
                  opacity: confirmed ? 1 : 0.5,
                  cursor: confirmed ? "pointer" : "not-allowed",
                }}
              >
                Continue
                <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

