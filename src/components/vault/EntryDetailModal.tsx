/**
 * EntryDetailModal Component
 * 
 * Full-screen modal for viewing entry details including password history,
 * custom fields, and 2FA codes.
 */

import React, { useState, useEffect } from "react";
import {
  X,
  Eye,
  EyeOff,
  Copy,
  Edit3,
  Trash2,
  Globe,
  ExternalLink,
  History,
  Clock,
  AlertCircle,
  Check,
  Star,
} from "lucide-react";
import { PasswordEntry, CustomField } from "../../types";
import { CategoryIcon } from "../CategoryIcon";
import { colors } from "./vaultColors";
import { getPasswordAge } from "./EntryCard";
import { generateTOTP, getTimeRemaining } from "../../utils/totp";

interface EntryDetailModalProps {
  entry: PasswordEntry | null;
  entries: PasswordEntry[]; // For duplicate detection
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onCopyPassword: () => void;
  onCopyUsername: () => void;
}

export const EntryDetailModal: React.FC<EntryDetailModalProps> = ({
  entry,
  entries,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopyPassword,
  onCopyUsername,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordHistory, setShowPasswordHistory] = useState(false);
  const [visibleHistoryPasswords, setVisibleHistoryPasswords] = useState<Set<number>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState<string>("");
  const [totpTimeRemaining, setTotpTimeRemaining] = useState(30);

  // Generate TOTP code
  useEffect(() => {
    if (!entry?.totpSecret || !generateTOTP || !getTimeRemaining) return;

    const updateTOTP = () => {
      try {
        const code = generateTOTP(entry.totpSecret!);
        setTotpCode(code);
        setTotpTimeRemaining(getTimeRemaining!());
      } catch {
        setTotpCode("");
      }
    };

    updateTOTP();
    const interval = setInterval(updateTOTP, 1000);
    return () => clearInterval(interval);
  }, [entry?.totpSecret]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowPassword(false);
      setShowPasswordHistory(false);
      setVisibleHistoryPasswords(new Set());
      setCopiedField(null);
    }
  }, [isOpen]);

  if (!isOpen || !entry) return null;

  const passwordAge = getPasswordAge(entry);
  const isSecureNote = entry.category === "secure-note";
  
  // Find duplicate passwords
  const duplicates = entries.filter(
    e => e.id !== entry.id && e.password === entry.password
  );

  const handleCopy = async (text: string, fieldName: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1500);
    
    if (fieldName === "password") {
      onCopyPassword();
    } else if (fieldName === "username") {
      onCopyUsername();
    }
  };

  const toggleHistoryPassword = (index: number) => {
    setVisibleHistoryPasswords(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-start justify-center pt-[10vh] p-4 z-50 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${colors.steelBlue500}20` }}
            >
              <CategoryIcon 
                categoryId={entry.category} 
                className="w-6 h-6" 
                style={{ color: colors.steelBlue400 }}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: colors.warmIvory }}>
                {entry.accountName}
              </h2>
              <p className="text-sm text-slate-400">{entry.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleFavorite}
              className={`p-2 rounded-lg transition-colors ${
                entry.isFavorite 
                  ? "text-yellow-400 bg-yellow-400/10" 
                  : "text-slate-400 hover:text-yellow-400 hover:bg-slate-700/50"
              }`}
            >
              <Star className="w-5 h-5" fill={entry.isFavorite ? "currentColor" : "none"} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Username */}
          <div className="bg-slate-700/30 rounded-xl p-4">
            <label className="text-xs text-slate-500 block mb-1">Username</label>
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-mono">{entry.username}</span>
              <button
                onClick={() => handleCopy(entry.username, "username")}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-600/50 transition-colors"
              >
                {copiedField === "username" ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Password (for password entries) */}
          {!isSecureNote && (
            <div className="bg-slate-700/30 rounded-xl p-4">
              <label className="text-xs text-slate-500 block mb-1">Password</label>
              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-mono">
                  {showPassword ? entry.password : "••••••••••••"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-600/50 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleCopy(entry.password, "password")}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-600/50 transition-colors"
                  >
                    {copiedField === "password" ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2FA Code */}
          {entry.totpSecret && totpCode && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <label className="text-xs text-emerald-400 block mb-1">2FA Code</label>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-mono font-bold text-emerald-400 tracking-wider">
                  {totpCode.slice(0, 3)} {totpCode.slice(3)}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 relative">
                    <svg className="w-8 h-8 -rotate-90">
                      <circle
                        cx="16"
                        cy="16"
                        r="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-slate-700"
                      />
                      <circle
                        cx="16"
                        cy="16"
                        r="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={88}
                        strokeDashoffset={88 - (88 * totpTimeRemaining) / 30}
                        className="text-emerald-400 transition-all duration-1000"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-emerald-400">
                      {totpTimeRemaining}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(totpCode, "totp")}
                    className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
                  >
                    {copiedField === "totp" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Website */}
          {entry.websiteUrl && (
            <div className="bg-slate-700/30 rounded-xl p-4">
              <label className="text-xs text-slate-500 block mb-1">Website</label>
              <div className="flex items-center justify-between">
                <a
                  href={entry.websiteUrl.startsWith("http") ? entry.websiteUrl : `https://${entry.websiteUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-2 truncate"
                >
                  <Globe className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{entry.websiteUrl}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            </div>
          )}

          {/* Notes */}
          {entry.notes && (
            <div className="bg-slate-700/30 rounded-xl p-4">
              <label className="text-xs text-slate-500 block mb-1">Notes</label>
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{entry.notes}</p>
            </div>
          )}

          {/* Custom Fields */}
          {entry.customFields && entry.customFields.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs text-slate-500">Custom Fields</label>
              {entry.customFields.map((field) => (
                <CustomFieldItem
                  key={field.id}
                  field={field}
                  copiedField={copiedField}
                  onCopy={(text) => handleCopy(text, `custom-${field.id}`)}
                />
              ))}
            </div>
          )}

          {/* Password Age & Security Info */}
          {!isSecureNote && (
            <div className="grid grid-cols-2 gap-3">
              {/* Password Age */}
              <div className={`rounded-xl p-3 ${passwordAge.isOld ? "bg-amber-500/10 border border-amber-500/20" : "bg-slate-700/30"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className={`w-4 h-4 ${passwordAge.isOld ? "text-amber-400" : "text-slate-500"}`} />
                  <span className="text-xs text-slate-500">Password Age</span>
                </div>
                <p className={`text-sm ${passwordAge.isOld ? "text-amber-400" : "text-slate-300"}`}>
                  {passwordAge.text}
                </p>
              </div>

              {/* Duplicate Warning */}
              {duplicates.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-400">Reused Password</span>
                  </div>
                  <p className="text-sm text-red-400">
                    Used in {duplicates.length} other account{duplicates.length > 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Password History */}
          {entry.passwordHistory && entry.passwordHistory.length > 0 && (
            <div className="border-t border-slate-700/50 pt-4">
              <button
                onClick={() => setShowPasswordHistory(!showPasswordHistory)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors w-full"
              >
                <History className="w-4 h-4" />
                <span>Password History ({entry.passwordHistory.length})</span>
                <ChevronIcon isOpen={showPasswordHistory} />
              </button>
              
              {showPasswordHistory && (
                <div className="mt-3 space-y-2 animate-fadeIn">
                  {entry.passwordHistory
                    .filter((item): item is { password: string; changedAt: Date | string } => 
                      item !== null && item !== undefined && typeof item.password === 'string'
                    )
                    .map((item, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between bg-slate-700/20 rounded-lg p-3"
                      >
                        <div>
                          <code className="text-sm text-slate-300 font-mono">
                            {visibleHistoryPasswords.has(index) ? item.password : "••••••••••••"}
                          </code>
                          <span className="text-xs text-slate-500 block mt-1">
                            {new Date(item.changedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleHistoryPassword(index)}
                            className="p-1.5 text-slate-500 hover:text-white rounded transition-colors"
                          >
                            {visibleHistoryPasswords.has(index) ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleCopy(item.password, `history-${index}`)}
                            className="p-1.5 text-slate-500 hover:text-white rounded transition-colors"
                          >
                            {copiedField === `history-${index}` ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-slate-700/50">
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

// Custom Field Item
const CustomFieldItem: React.FC<{
  field: CustomField;
  copiedField: string | null;
  onCopy: (text: string) => void;
}> = ({ field, copiedField, onCopy }) => {
  const [visible, setVisible] = useState(!field.isSecret);
  const fieldId = `custom-${field.id}`;

  return (
    <div className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <span className="text-xs text-slate-500 block">{field.label}</span>
        <span className="text-sm text-slate-200 font-mono truncate block">
          {field.isSecret && !visible ? "••••••••" : field.value}
        </span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
        {field.isSecret && (
          <button
            onClick={() => setVisible(!visible)}
            className="p-1.5 text-slate-500 hover:text-white rounded transition-colors"
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        <button
          onClick={() => onCopy(field.value)}
          className="p-1.5 text-slate-500 hover:text-white rounded transition-colors"
        >
          {copiedField === fieldId ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

// Chevron Icon
const ChevronIcon: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
  <svg
    className={`w-4 h-4 ml-auto transition-transform ${isOpen ? "rotate-180" : ""}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

