/**
 * WhatsNewModal Component
 * 
 * Displays changelog and version history.
 */

import React, { useState, useEffect } from "react";
import { X, Sparkles, Plus, Zap, Wrench, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { changelog, APP_VERSION, ChangelogEntry } from "../config/changelog";

const colors = {
  steelBlue600: "#4A6FA5",
  steelBlue500: "#5B82B8",
  warmIvory: "#F3F4F6",
  brandGold: "#C9AE66",
};

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangeTypeIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'added':
      return <Plus className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2} />;
    case 'improved':
      return <Zap className="w-3.5 h-3.5 text-blue-400" strokeWidth={2} />;
    case 'fixed':
      return <Wrench className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} />;
    case 'security':
      return <Shield className="w-3.5 h-3.5 text-red-400" strokeWidth={2} />;
    default:
      return <Plus className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />;
  }
};

const VersionSection: React.FC<{ entry: ChangelogEntry; isLatest: boolean }> = ({ entry, isLatest }) => {
  const [isExpanded, setIsExpanded] = useState(isLatest);

  return (
    <div className={`rounded-xl overflow-hidden ${isLatest ? 'bg-slate-700/50 border border-slate-600/50' : 'bg-slate-800/30'}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span 
            className="text-sm font-bold"
            style={{ color: isLatest ? colors.brandGold : colors.warmIvory }}
          >
            v{entry.version}
          </span>
          {isLatest && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
              Current
            </span>
          )}
          <span className="text-xs text-slate-500">{entry.date}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 animate-fadeIn">
          {/* Highlights */}
          <div className="flex flex-wrap gap-2 mb-4">
            {entry.highlights.map((highlight, idx) => (
              <span
                key={idx}
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ 
                  backgroundColor: `${colors.steelBlue500}20`,
                  color: colors.steelBlue500,
                }}
              >
                {highlight}
              </span>
            ))}
          </div>

          {/* Changes */}
          <div className="space-y-2">
            {entry.changes.map((change, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="mt-0.5">
                  <ChangeTypeIcon type={change.type} />
                </div>
                <span className="text-sm text-slate-300">{change.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ isOpen, onClose }) => {
  // Mark as seen when opened
  useEffect(() => {
    if (isOpen) {
      localStorage.setItem('last_seen_version', APP_VERSION);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="form-modal-backdrop"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${colors.steelBlue500}, ${colors.steelBlue600})` }}
            >
              <Sparkles className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: colors.warmIvory }}>
                What's New
              </h2>
              <p className="text-xs text-slate-500">Version {APP_VERSION}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close what's new"
            className="p-2 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
          {changelog.map((entry, idx) => (
            <VersionSection key={entry.version} entry={entry} isLatest={idx === 0} />
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/50">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-white text-sm font-medium rounded-lg transition-all"
            style={{ backgroundColor: colors.steelBlue500 }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue600}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue500}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook to check if user should see What's New
export const useWhatsNew = () => {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem('last_seen_version');
    if (!lastSeenVersion || lastSeenVersion !== APP_VERSION) {
      setShouldShow(true);
    }
  }, []);

  return { shouldShow, dismiss: () => setShouldShow(false) };
};

