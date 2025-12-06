import React from "react";
import { FileText, Download, Monitor, Apple, Server, Shield } from "lucide-react";

interface DownloadInstructionsProps {
  licenseKey: string;
  licenseType: "single" | "family";
  onClose: () => void;
}

export const DownloadInstructions: React.FC<DownloadInstructionsProps> = ({
  licenseKey,
  licenseType,
  onClose,
}) => {
  const handleDownload = (platform: string) => {
    // Open download URL for specific platform
    const urls: Record<string, string> = {
      windows: "https://localpasswordvault.com/download/windows",
      macos: "https://localpasswordvault.com/download/macos",
      linux: "https://localpasswordvault.com/download/linux",
    };
    window.open(urls[platform], "_blank");
  };

  return (
    <div className="form-modal-backdrop">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-8">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">
              Download Local Password Vault
            </h2>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* License Info */}
            <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
              <h3 className="text-blue-300 font-medium mb-2">
                Your License Information
              </h3>
              <p className="text-slate-300 text-sm mb-2">
                <strong>License Type:</strong>{" "}
                {licenseType === "single" ? "Personal Vault" : "Family Vault"}
              </p>
              <p className="text-slate-300 text-sm mb-2">
                <strong>License Key:</strong>
              </p>
              <div className="bg-slate-800 p-3 rounded text-blue-400 text-sm select-all font-mono">
                {licenseKey}
              </div>
              <p className="text-slate-400 text-xs mt-2">
                Save this key — you'll need it to activate the app.
              </p>
            </div>

            {/* Download Options */}
            <div>
              <h3 className="text-white font-medium mb-4">
                Download for Your Platform
              </h3>
              
              <div className="space-y-3">
                {/* Windows */}
                <button
                  onClick={() => handleDownload("windows")}
                  className="w-full flex items-center justify-between p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Monitor className="w-6 h-6 text-blue-400" />
                    <div className="text-left">
                      <p className="text-white font-medium">Windows</p>
                      <p className="text-slate-400 text-sm">.exe installer • ~85 MB</p>
                    </div>
                  </div>
                  <Download className="w-5 h-5 text-blue-400" />
                </button>

                {/* macOS */}
                <button
                  onClick={() => handleDownload("macos")}
                  className="w-full flex items-center justify-between p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Apple className="w-6 h-6 text-blue-400" />
                    <div className="text-left">
                      <p className="text-white font-medium">macOS</p>
                      <p className="text-slate-400 text-sm">.dmg installer • ~95 MB</p>
                    </div>
                  </div>
                  <Download className="w-5 h-5 text-blue-400" />
                </button>

                {/* Linux */}
                <button
                  onClick={() => handleDownload("linux")}
                  className="w-full flex items-center justify-between p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Server className="w-6 h-6 text-blue-400" />
                    <div className="text-left">
                      <p className="text-white font-medium">Linux</p>
                      <p className="text-slate-400 text-sm">.AppImage • ~90 MB</p>
                    </div>
                  </div>
                  <Download className="w-5 h-5 text-blue-400" />
                </button>
              </div>
            </div>

            {/* Installation Steps */}
            <div className="bg-slate-700/30 rounded-lg p-4">
              <h3 className="text-white font-medium mb-3 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span>Quick Start</span>
              </h3>
              <ol className="space-y-2 text-slate-300 text-sm">
                <li>1. Download the installer for your operating system</li>
                <li>2. Run the installer and follow the setup wizard</li>
                <li>3. Launch Local Password Vault</li>
                <li>4. Enter your license key when prompted</li>
                <li>5. Create your master password and start securing your accounts</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-700 bg-slate-800/80">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
