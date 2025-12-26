/**
 * CustomFieldDisplay Component
 * 
 * Displays custom fields (e.g., security questions, PINs) with:
 * - Visibility toggle for secret fields
 * - Copy to clipboard functionality
 * - Auto-clear clipboard after timeout
 * - Visual feedback for copied state
 * 
 * @component
 * 
 * @example
 * ```tsx
 * <CustomFieldDisplay
 *   field={{
 *     label: "Security Question",
 *     value: "What is your mother's maiden name?",
 *     isSecret: false
 *   }}
 * />
 * ```
 */

import React, { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { CustomField } from "../../types";
import { clearClipboardAfterTimeout, getVaultSettings } from "../Settings";

interface CustomFieldDisplayProps {
  /** Custom field to display */
  field: CustomField;
}

/**
 * Component for displaying custom fields with visibility and copy functionality
 */
export const CustomFieldDisplay: React.FC<CustomFieldDisplayProps> = ({ field }) => {
  const [visible, setVisible] = useState(!field.isSecret);
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(field.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    const settings = getVaultSettings();
    clearClipboardAfterTimeout(settings.clipboardClearTimeout, field.value);
  };
  
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
            title={visible ? "Hide" : "Show"}
            aria-label={visible ? "Hide field value" : "Show field value"}
          >
            {visible 
              ? <EyeOff className="w-4 h-4" strokeWidth={1.5} />
              : <Eye className="w-4 h-4" strokeWidth={1.5} />
            }
          </button>
        )}
        <button
          onClick={handleCopy}
          className="p-1.5 text-slate-500 hover:text-blue-400 rounded transition-colors"
          title="Copy to clipboard"
          aria-label="Copy field value to clipboard"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" strokeWidth={1.5} />
          ) : (
            <Copy className="w-4 h-4" strokeWidth={1.5} />
          )}
        </button>
      </div>
    </div>
  );
};
