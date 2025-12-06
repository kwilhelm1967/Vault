/**
 * CustomFieldDisplay Component
 * 
 * Displays a custom field with show/hide toggle for secrets and copy functionality.
 */

import React, { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { CustomField } from "../../types";
import { clearClipboardAfterTimeout, getVaultSettings } from "../Settings";

interface CustomFieldDisplayProps {
  field: CustomField;
}

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
        <span className="text-sm text-slate-200 truncate block">
          {field.isSecret && !visible ? "••••••••" : field.value}
        </span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
        {field.isSecret && (
          <button
            onClick={() => setVisible(!visible)}
            className="p-1.5 text-slate-500 hover:text-white rounded transition-colors"
            title={visible ? "Hide" : "Show"}
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
          title="Copy"
        >
          {copied 
            ? <Check className="w-4 h-4 text-green-400" strokeWidth={1.5} /> 
            : <Copy className="w-4 h-4" strokeWidth={1.5} />
          }
        </button>
      </div>
    </div>
  );
};

export default CustomFieldDisplay;



