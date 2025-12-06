/**
 * SettingsModals Component
 * 
 * Extracted modal dialogs from Settings component for better organization.
 * Includes: Clear Data, Export, Import, Regenerate Recovery, Password Hint modals.
 */

import React, { useState } from "react";
import {
  Shield,
  AlertTriangle,
  Upload,
  Check,
} from "lucide-react";

// Color palette
const colors = {
  steelBlue600: "#4A6FA5",
  steelBlue500: "#5B82B8",
  steelBlue400: "#7A9DC7",
  warmIvory: "#F3F4F6",
  brandGold: "#C9AE66",
};

// Clear All Data Confirmation Modal
interface ClearDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalEntries: number;
}

export const ClearDataModal: React.FC<ClearDataModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  totalEntries,
}) => {
  if (!isOpen) return null;

  return (
    <div className="form-modal-backdrop">
      <div 
        className="rounded-2xl p-8 w-full max-w-sm animate-fade-in"
        style={{
          backgroundColor: "rgba(30, 41, 59, 0.98)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5), 0 0 100px rgba(239, 68, 68, 0.1)",
        }}
      >
        <div className="text-center">
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ 
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "2px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            <AlertTriangle className="w-10 h-10 text-red-400" strokeWidth={1.5} />
          </div>
          <h3 style={{ color: colors.warmIvory }} className="text-xl font-bold mb-3">
            Clear All Data?
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            This will permanently delete all{" "}
            <span className="text-red-400 font-semibold">{totalEntries} accounts</span>,
            your master password, and all settings.
          </p>
          <p className="text-red-400 text-xs mb-8 font-medium bg-red-500/10 py-2 px-4 rounded-lg inline-block">
            ⚠️ This action cannot be undone
          </p>
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3.5 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-red-500/30"
            >
              Delete All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Encrypted Export Modal
interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (password: string) => Promise<void>;
}

export const EncryptedExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
}) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!password) {
      setError("Password is required");
      return;
    }
    
    setIsProcessing(true);
    setError("");
    
    try {
      await onExport(password);
      setPassword("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setError("");
    onClose();
  };

  return (
    <div className="form-modal-backdrop">
      <div 
        className="rounded-2xl p-6 w-full max-w-md animate-fade-in"
        style={{
          backgroundColor: "rgba(30, 41, 59, 0.98)",
          border: `1px solid ${colors.steelBlue500}40`,
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 flex items-center justify-center">
            <Shield className="w-6 h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
          </div>
          <div>
            <h3 style={{ color: colors.warmIvory }} className="text-lg font-bold">
              Secure Backup
            </h3>
            <p className="text-slate-400 text-xs">Confirm to create encrypted backup</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div 
            className="p-4 rounded-lg"
            style={{ backgroundColor: 'rgba(91, 130, 184, 0.1)', border: '1px solid rgba(91, 130, 184, 0.2)' }}
          >
            <p className="text-slate-300 text-sm mb-3">
              Enter your <strong style={{ color: colors.brandGold }}>master password</strong> to create an encrypted backup.
            </p>
            <p className="text-slate-400 text-xs">
              You'll need this same password to restore the backup later.
            </p>
          </div>
          
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Confirm Master Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="Enter your master password"
            />
          </div>
          
          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 p-2 rounded">{error}</p>
          )}
          
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm font-medium transition-all"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isProcessing || !password}
              className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: colors.steelBlue500 }}
            >
              {isProcessing ? "Creating Backup..." : "Create Backup"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Encrypted Import Modal
interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: string, password: string) => Promise<void>;
}

export const EncryptedImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [password, setPassword] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setFileContent(content);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    if (!fileContent) {
      setError("Please select a backup file");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }
    
    setIsProcessing(true);
    setError("");
    
    try {
      await onImport(fileContent, password);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setFileContent("");
    setFileName("");
    setError("");
    onClose();
  };

  return (
    <div className="form-modal-backdrop">
      <div 
        className="rounded-2xl p-6 w-full max-w-md animate-fade-in"
        style={{
          backgroundColor: "rgba(30, 41, 59, 0.98)",
          border: `1px solid ${colors.steelBlue500}40`,
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 flex items-center justify-center">
            <Upload className="w-6 h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
          </div>
          <div>
            <h3 style={{ color: colors.warmIvory }} className="text-lg font-bold">
              Restore Secure Backup
            </h3>
            <p className="text-slate-400 text-xs">Import your encrypted backup file</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Select Backup File</label>
            <div className="relative">
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="backup-file-input"
              />
              <label
                htmlFor="backup-file-input"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 border-dashed rounded-lg text-slate-400 text-sm cursor-pointer hover:bg-slate-700/70 hover:border-slate-500 transition-all"
              >
                <Upload className="w-4 h-4" strokeWidth={1.5} />
                {fileName || "Choose backup file..."}
              </label>
            </div>
            {fileName && (
              <p className="text-green-400 text-xs mt-1.5 flex items-center gap-1">
                <Check className="w-3 h-3" /> File loaded successfully
              </p>
            )}
          </div>
          
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Confirm Master Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="Enter your master password to confirm"
            />
          </div>
          
          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 p-2 rounded">{error}</p>
          )}
          
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm font-medium transition-all"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isProcessing || !fileContent || !password}
              className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: colors.steelBlue500 }}
            >
              {isProcessing ? "Restoring..." : "Restore Backup"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default {
  ClearDataModal,
  EncryptedExportModal,
  EncryptedImportModal,
};



