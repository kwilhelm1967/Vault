import React, { useState } from 'react';
import { Key, Calendar, Tag, Copy, CheckCircle } from 'lucide-react';
import { singleUserLicenses, proLicenses, familyLicenses, businessLicenses, LicenseKey } from '../utils/licenseKeys';

interface LicenseKeyDisplayProps {
  onClose?: () => void;
}

export const LicenseKeyDisplay: React.FC<LicenseKeyDisplayProps> = ({ onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(text);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const renderLicenseSection = (title: string, licenses: LicenseKey[], colorClass: string) => (
    <div className="mb-6">
      <h3 className={`text-lg font-medium ${colorClass} mb-3`}>{title}</h3>
      <div className="space-y-3">
        {licenses.map((license, index) => (
          <div key={`${license.type}-${index}`} className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
            <div 
              className={`font-mono ${colorClass.replace('text-', 'text-')} bg-slate-800/70 p-3 rounded text-center select-all mb-2 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors`}
              onClick={() => copyToClipboard(license.key)}
            >
              <span>{license.key}</span>
              {copiedKey === license.key ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-slate-400 hover:text-white" />
              )}
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Calendar className="w-3 h-3" />
              <span>Expires: {license.expires}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-white mb-4">License Keys (120-day expiration)</h2>
      <p className="text-slate-400 text-sm mb-6">
        These license keys are for testing purposes. Click on any key to copy it to your clipboard.
      </p>
      
      {/* Single User Licenses */}
      {renderLicenseSection("Single User Licenses", singleUserLicenses, "text-blue-400")}

      {/* Family Plan Licenses */}
      {renderLicenseSection("Family Plan Licenses", familyLicenses, "text-purple-400")}
      
      {/* Pro Licenses */}
      {renderLicenseSection("Pro Licenses", proLicenses, "text-indigo-400")}
      
      {/* Business Plan Licenses */}
      {renderLicenseSection("Business Plan Licenses", businessLicenses, "text-green-400")}
      
      <div className="mt-6 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-500 text-center">
          All license keys are valid for 120 days from today.
        </p>
      </div>
      
      {onClose && (
        <div className="text-center mt-6">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};