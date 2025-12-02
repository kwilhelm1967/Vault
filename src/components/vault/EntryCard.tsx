/**
 * EntryCard Component
 * 
 * Individual password entry card with expand/collapse animations.
 */

import React from "react";
import {
  Eye,
  EyeOff,
  Copy,
  Edit3,
  Trash2,
  Star,
  Globe,
  ExternalLink,
  Clock,
  CheckSquare,
  Square,
  FileText,
  Check,
} from "lucide-react";
import { PasswordEntry, CustomField } from "../../types";
import { CategoryIcon } from "../CategoryIcon";
import { colors } from "./vaultColors";

// Helper to calculate password age
export const getPasswordAge = (entry: PasswordEntry): { text: string; daysOld: number; isOld: boolean } => {
  const changeDate = entry.passwordChangedAt || entry.createdAt;
  const now = new Date();
  const changed = new Date(changeDate);
  const diffTime = Math.abs(now.getTime() - changed.getTime());
  const daysOld = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  let text: string;
  if (daysOld === 0) text = "Changed today";
  else if (daysOld === 1) text = "Changed yesterday";
  else if (daysOld < 30) text = `Changed ${daysOld} days ago`;
  else if (daysOld < 60) text = "Changed 1 month ago";
  else if (daysOld < 365) text = `Changed ${Math.floor(daysOld / 30)} months ago`;
  else text = `Changed ${Math.floor(daysOld / 365)} year${Math.floor(daysOld / 365) > 1 ? 's' : ''} ago`;
  
  const isOld = daysOld > 90;
  return { text, daysOld, isOld };
};

// Helper to calculate password strength
export const calculatePasswordStrength = (password: string): "weak" | "medium" | "strong" => {
  if (!password) return "weak";
  const hasLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  if (score >= 4) return "strong";
  if (score >= 2) return "medium";
  return "weak";
};

interface EntryCardProps {
  entry: PasswordEntry;
  isExpanded: boolean;
  isPasswordVisible: boolean;
  isSelected: boolean;
  isCopied: boolean;
  bulkSelectMode: boolean;
  categoryColor: string;
  onToggleExpand: () => void;
  onTogglePassword: () => void;
  onToggleFavorite: () => void;
  onToggleSelect: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}

export const EntryCard: React.FC<EntryCardProps> = ({
  entry,
  isExpanded,
  isPasswordVisible,
  isSelected,
  isCopied,
  bulkSelectMode,
  categoryColor,
  onToggleExpand,
  onTogglePassword,
  onToggleFavorite,
  onToggleSelect,
  onCopy,
  onEdit,
  onDelete,
  onView,
}) => {
  const passwordAge = getPasswordAge(entry);
  const passwordStrength = entry.entryType !== "secure_note" ? calculatePasswordStrength(entry.password) : null;
  
  const strengthColors = {
    weak: "bg-red-400",
    medium: "bg-yellow-400",
    strong: "bg-emerald-400",
  };

  return (
    <div
      className={`group relative bg-slate-800/50 backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 ease-out hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg cursor-pointer ${
        isSelected 
          ? "border-[#5B82B8] ring-2 ring-[#5B82B8]/30 scale-[1.01]" 
          : "border-[#5B82B8]/40 hover:border-[#5B82B8]"
      }`}
      onClick={onView}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View ${entry.accountName} details`}
    >
      {/* Selection Checkbox */}
      {bulkSelectMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
          className="absolute top-3 left-3 p-1 text-slate-400 hover:text-white transition-colors z-10"
          aria-label={isSelected ? "Deselect entry" : "Select entry"}
        >
          {isSelected 
            ? <CheckSquare className="w-5 h-5 text-[#5B82B8]" strokeWidth={1.5} />
            : <Square className="w-5 h-5" strokeWidth={1.5} />
          }
        </button>
      )}

      {/* Favorite Star */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className={`absolute top-3 right-3 p-1 transition-all duration-200 ${
          entry.isFavorite 
            ? "text-[#C9AE66] scale-110" 
            : "text-slate-600 opacity-0 group-hover:opacity-100 hover:text-[#C9AE66]"
        }`}
        aria-label={entry.isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Star className="w-4 h-4" fill={entry.isFavorite ? "#C9AE66" : "none"} strokeWidth={1.5} />
      </button>

      {/* Header */}
      <div className={`flex items-start gap-3 ${bulkSelectMode ? 'ml-6' : ''}`}>
        {/* Icon */}
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${categoryColor}20` }}
        >
          {entry.entryType === "secure_note" ? (
            <FileText className="w-5 h-5" style={{ color: categoryColor }} strokeWidth={1.5} />
          ) : (
            <div style={{ color: categoryColor }}>
              <CategoryIcon name="Key" size={20} strokeWidth={1.5} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <h3 
            className="font-medium text-sm truncate transition-colors"
            style={{ color: colors.warmIvory }}
          >
            {entry.accountName}
          </h3>
          
          {entry.entryType === "secure_note" ? (
            <p className="text-xs text-slate-500 mt-0.5">Secure Note</p>
          ) : (
            <>
              <p className="text-xs text-slate-400 truncate mt-0.5">{entry.username}</p>
              
              {/* Password Strength Indicator */}
              {passwordStrength && (
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="flex gap-0.5">
                    <div className={`w-6 h-1 rounded-full ${passwordStrength === "weak" ? strengthColors.weak : "bg-slate-700"}`} />
                    <div className={`w-6 h-1 rounded-full ${passwordStrength === "medium" || passwordStrength === "strong" ? strengthColors.medium : "bg-slate-700"}`} />
                    <div className={`w-6 h-1 rounded-full ${passwordStrength === "strong" ? strengthColors.strong : "bg-slate-700"}`} />
                  </div>
                  <span className={`text-[10px] capitalize ${
                    passwordStrength === "strong" ? "text-emerald-400" :
                    passwordStrength === "medium" ? "text-yellow-400" : "text-red-400"
                  }`}>
                    {passwordStrength}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Quick Actions - visible on hover */}
      <div className="flex items-center justify-end gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
          className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded transition-all duration-200"
          title={isExpanded ? "Collapse" : "Expand"}
          aria-label={isExpanded ? "Collapse details" : "Expand details"}
        >
          <Eye className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onCopy(); }}
          className={`p-1.5 rounded transition-all duration-200 ${
            isCopied ? "text-emerald-400 bg-emerald-400/10" : "text-slate-500 hover:text-white hover:bg-slate-700/50"
          }`}
          title="Copy password"
          aria-label="Copy password"
        >
          {isCopied ? <Check className="w-4 h-4" strokeWidth={1.5} /> : <Copy className="w-4 h-4" strokeWidth={1.5} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded transition-all duration-200"
          title="Edit"
          aria-label="Edit entry"
        >
          <Edit3 className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all duration-200"
          title="Delete"
          aria-label="Delete entry"
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div 
          className="mt-3 bg-slate-700/30 rounded-lg p-3 animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          {entry.entryType === "secure_note" ? (
            <div>
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{entry.notes}</p>
              <button
                onClick={onCopy}
                className={`mt-2 flex items-center gap-1.5 text-xs transition-colors ${
                  isCopied ? "text-emerald-400" : "text-slate-500 hover:text-white"
                }`}
              >
                <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                {isCopied ? "Copied!" : "Copy note"}
              </button>
            </div>
          ) : (
            <>
              {/* Password */}
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-sm font-mono">
                  {isPasswordVisible ? entry.password : "••••••••••••"}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={onTogglePassword}
                    className="p-1.5 text-slate-500 hover:text-white rounded transition-colors"
                    title={isPasswordVisible ? "Hide" : "Show"}
                  >
                    {isPasswordVisible 
                      ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> 
                      : <Eye className="w-4 h-4" strokeWidth={1.5} />
                    }
                  </button>
                  <button
                    onClick={onCopy}
                    className={`p-1.5 rounded transition-colors ${
                      isCopied ? "text-emerald-400" : "text-slate-500 hover:text-white"
                    }`}
                    title="Copy"
                  >
                    <Copy className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Website */}
              {entry.website && (
                <a
                  href={entry.website.startsWith('http') ? entry.website : `https://${entry.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2 text-blue-400 hover:text-blue-300 text-xs transition-colors group/link"
                >
                  <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span className="truncate">{entry.website}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" strokeWidth={1.5} />
                </a>
              )}

              {/* Notes */}
              {entry.notes && (
                <p className="mt-3 text-slate-500 text-xs line-clamp-2">{entry.notes}</p>
              )}

              {/* Custom Fields */}
              {entry.customFields && entry.customFields.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {entry.customFields.slice(0, 3).map((field: CustomField) => (
                    <span 
                      key={field.id} 
                      className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-400"
                    >
                      {field.label}
                    </span>
                  ))}
                  {entry.customFields.length > 3 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-500">
                      +{entry.customFields.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Password Age */}
              <p className={`mt-2 text-xs flex items-center gap-1 ${passwordAge.isOld ? 'text-orange-400' : 'text-slate-500'}`}>
                <Clock className="w-3 h-3" strokeWidth={1.5} />
                {passwordAge.text}
                {passwordAge.isOld && <span className="text-orange-400">(consider updating)</span>}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

