/**
 * LicenseTransferDialog Component
 * 
 * Displayed when a device mismatch is detected during license activation.
 * Allows users to transfer their license from their previous device to
 * the current device.
 * 
 * Security:
 * - Only license key and device hash are transmitted
 * - No user data is ever sent to the server
 * - After transfer, app works fully offline
 */

import React, { useState } from "react";
import {
  AlertTriangle,
  Monitor,
  ArrowRight,
  X,
  Loader2,
  CheckCircle,
  XCircle,
  Mail,
} from "lucide-react";

interface LicenseTransferDialogProps {
  isOpen: boolean;
  licenseKey: string;
  onConfirmTransfer: () => Promise<{ success: boolean; error?: string; status?: string }>;
  onCancel: () => void;
}

export const LicenseTransferDialog: React.FC<LicenseTransferDialogProps> = ({
  isOpen,
  licenseKey,
  onConfirmTransfer,
  onCancel,
}) => {
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState<{
    success?: boolean;
    error?: string;
    status?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleTransfer = async () => {
    setIsTransferring(true);
    setTransferResult(null);

    try {
      const result = await onConfirmTransfer();
      setTransferResult(result);
      
      if (result.success) {
        // Auto-close after successful transfer
        setTimeout(() => {
          onCancel();
        }, 2000);
      }
    } catch (error) {
      setTransferResult({
        success: false,
        error: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const handleContactSupport = () => {
    const url = "mailto:support@localpasswordvault.com?subject=License Transfer Help&body=License Key: " + licenseKey;
    if (window.electronAPI) {
      window.electronAPI.openExternal(url);
    } else {
      window.location.href = url;
    }
  };

  // Transfer limit reached state
  if (transferResult?.status === "transfer_limit_reached") {
    return (
      <div className="form-modal-backdrop">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white text-center mb-4">
            Transfer Limit Reached
          </h2>

          {/* Message */}
          <p className="text-slate-300 text-center mb-6 leading-relaxed">
            Your license has reached its automatic transfer limit.
            <br /><br />
            Please contact support so we can help you move it to your new computer.
          </p>

          {/* Contact Support Button */}
          <button
            onClick={handleContactSupport}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 mb-4"
          >
            <Mail className="w-5 h-5" />
            Contact Support
          </button>

          {/* Close Button */}
          <button
            onClick={onCancel}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg font-medium transition-all"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (transferResult?.success) {
    return (
      <div className="form-modal-backdrop">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white text-center mb-4">
            License Transferred!
          </h2>
          <p className="text-slate-300 text-center mb-4">
            Your license has been moved to this computer. You can now use the app offline.
          </p>
          <p className="text-slate-500 text-sm text-center">
            Closing in a moment...
          </p>
        </div>
      </div>
    );
  }

  // Error state (non-transfer-limit)
  if (transferResult && !transferResult.success) {
    return (
      <div className="form-modal-backdrop">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white text-center mb-4">
            Transfer Failed
          </h2>
          <p className="text-slate-300 text-center mb-6">
            {transferResult.error || "Unable to transfer license. Please try again."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleTransfer}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main transfer confirmation dialog
  return (
    <div className="form-modal-backdrop">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-lg w-full shadow-2xl relative">
        {/* Close button */}
        <button
          onClick={onCancel}
          disabled={isTransferring}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-all disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
            <Monitor className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          New Device Detected
        </h2>

        {/* Subtitle */}
        <p className="text-slate-400 text-center mb-6">
          Your Local Password Vault license can only be used on one computer at a time.
        </p>

        {/* Explanation Box */}
        <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span className="text-slate-200 font-medium">What happens?</span>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            If you continue, your license will <span className="text-amber-300 font-medium">deactivate</span> on your previous device and <span className="text-emerald-300 font-medium">activate here</span>.
          </p>
        </div>

        {/* Visual Transfer Indicator */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center mb-2">
              <Monitor className="w-6 h-6 text-slate-400" />
            </div>
            <span className="text-xs text-slate-500">Previous Device</span>
          </div>
          <ArrowRight className="w-6 h-6 text-blue-400" />
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-500/20 border-2 border-blue-500 rounded-lg flex items-center justify-center mb-2">
              <Monitor className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-xs text-blue-400">This Device</span>
          </div>
        </div>

        {/* Question */}
        <p className="text-white text-center font-medium mb-6">
          Do you want to move your license to this computer?
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isTransferring}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleTransfer}
            disabled={isTransferring}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isTransferring ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Transferring...
              </>
            ) : (
              "Move License Here"
            )}
          </button>
        </div>

        {/* Privacy Note */}
        <p className="text-xs text-slate-500 text-center mt-4">
          Only your license key and device identifier are sent. No vault data is transmitted.
        </p>
      </div>
    </div>
  );
};

export default LicenseTransferDialog;

