import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  Download,
  Copy,
  Check,
  Shield,
  Key,
  Monitor,
  Apple,
  Terminal,
  ExternalLink,
  Mail,
} from "lucide-react";

// Color palette matching LPV design system
const colors = {
  deepNavy: "#0F172A",
  slateBackground: "#1E293B",
  steelBlue400: "#5B82B8",
  steelBlue500: "#4A6FA5",
  warmIvory: "#F3F4F6",
  softGold: "#C9AE66",
  successGreen: "#22C55E",
};

interface PlatformDownload {
  id: string;
  name: string;
  icon: React.ReactNode;
  fileType: string;
  fileSize: string;
  requirements: string;
  downloadUrl: string;
}

const platforms: PlatformDownload[] = [
  {
    id: "windows",
    name: "Windows",
    icon: <Monitor className="w-6 h-6" />,
    fileType: ".exe installer",
    fileSize: "~85 MB",
    requirements: "Windows 10 or later (64-bit)",
    downloadUrl: "https://localpasswordvault.com/download/windows",
  },
  {
    id: "macos",
    name: "macOS",
    icon: <Apple className="w-6 h-6" />,
    fileType: ".dmg installer",
    fileSize: "~95 MB",
    requirements: "macOS 10.15 (Catalina) or later",
    downloadUrl: "https://localpasswordvault.com/download/macos",
  },
  {
    id: "linux",
    name: "Linux",
    icon: <Terminal className="w-6 h-6" />,
    fileType: ".AppImage",
    fileSize: "~90 MB",
    requirements: "Ubuntu 18.04+ or equivalent",
    downloadUrl: "https://localpasswordvault.com/download/linux",
  },
];

// Detect user's operating system
const getOS = (): string => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  if (userAgent.includes("win")) return "windows";
  if (userAgent.includes("mac")) return "macos";
  if (userAgent.includes("linux")) return "linux";
  return "windows";
};

export const PurchaseSuccessPage: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [licenseKey, setLicenseKey] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [planName, setPlanName] = useState<string>("Lifetime License");
  const detectedOS = getOS();

  // Extract license key and other params from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const key = urlParams.get("key") || urlParams.get("license") || urlParams.get("licenseKey");
    const email = urlParams.get("email");
    const plan = urlParams.get("plan");

    if (key) {
      setLicenseKey(key);
    }
    if (email) {
      setCustomerEmail(decodeURIComponent(email));
    }
    if (plan) {
      setPlanName(decodeURIComponent(plan));
    }
  }, []);

  const handleCopyKey = async () => {
    if (!licenseKey) return;
    
    try {
      await navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = licenseKey;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = (platform: PlatformDownload) => {
    window.open(platform.downloadUrl, "_blank");
  };

  // Sort platforms to show detected OS first
  const sortedPlatforms = [...platforms].sort((a, b) => {
    if (a.id === detectedOS) return -1;
    if (b.id === detectedOS) return 1;
    return 0;
  });

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: `linear-gradient(135deg, ${colors.deepNavy} 0%, #1a2744 50%, ${colors.deepNavy} 100%)` }}
    >
      {/* Header */}
      <header className="border-b border-slate-700/50 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${colors.steelBlue500}20`, border: `1px solid ${colors.steelBlue400}40` }}
            >
              <Shield className="w-5 h-5" style={{ color: colors.steelBlue400 }} />
            </div>
            <span className="text-lg font-semibold text-white">Local Password Vault</span>
          </div>
          <a
            href="https://localpasswordvault.com"
            className="text-sm flex items-center space-x-1 transition-colors"
            style={{ color: colors.steelBlue400 }}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Visit Website</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Success Banner */}
          <div className="text-center mb-10">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${colors.steelBlue500}20`, border: `2px solid ${colors.steelBlue400}40` }}
            >
              <CheckCircle className="w-10 h-10" style={{ color: colors.steelBlue400 }} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              Thank You for Your Purchase!
            </h1>
            <p className="text-lg" style={{ color: colors.warmIvory, opacity: 0.7 }}>
              Your {planName} is ready. Download Local Password Vault below.
            </p>
          </div>

          {/* License Key Card */}
          {licenseKey && (
            <div
              className="rounded-xl p-6 mb-8"
              style={{
                backgroundColor: `${colors.slateBackground}`,
                border: `1px solid ${colors.steelBlue400}40`,
              }}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${colors.softGold}20` }}
                >
                  <Key className="w-5 h-5" style={{ color: colors.softGold }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Your License Key</h2>
                  <p className="text-sm" style={{ color: colors.warmIvory, opacity: 0.6 }}>
                    Save this key — you'll need it to activate the app
                  </p>
                </div>
              </div>

              <div
                className="rounded-lg p-4 flex items-center justify-between"
                style={{ backgroundColor: colors.deepNavy, border: `1px solid ${colors.steelBlue400}30` }}
              >
                <code
                  className="text-lg font-mono tracking-wider select-all"
                  style={{ color: colors.steelBlue400 }}
                >
                  {licenseKey}
                </code>
                <button
                  onClick={handleCopyKey}
                  className="ml-4 px-4 py-2 rounded-lg flex items-center space-x-2 transition-all"
                  style={{
                    backgroundColor: copied ? `${colors.successGreen}20` : `${colors.steelBlue500}20`,
                    border: `1px solid ${copied ? colors.successGreen : colors.steelBlue400}40`,
                    color: copied ? colors.successGreen : colors.steelBlue400,
                  }}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-sm font-medium">Copy</span>
                    </>
                  )}
                </button>
              </div>

              {customerEmail && (
                <div className="mt-4 flex items-center space-x-2 text-sm" style={{ color: colors.warmIvory, opacity: 0.6 }}>
                  <Mail className="w-4 h-4" />
                  <span>A copy has been sent to {customerEmail}</span>
                </div>
              )}
            </div>
          )}

          {/* Download Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
              <Download className="w-5 h-5" style={{ color: colors.steelBlue400 }} />
              <span>Download for Your Platform</span>
            </h2>

            <div className="grid gap-4">
              {sortedPlatforms.map((platform) => {
                const isRecommended = platform.id === detectedOS;
                return (
                  <div
                    key={platform.id}
                    className="rounded-xl transition-all overflow-hidden"
                    style={{
                      backgroundColor: colors.slateBackground,
                      border: isRecommended
                        ? `2px solid ${colors.steelBlue400}`
                        : `1px solid ${colors.steelBlue400}30`,
                    }}
                  >
                    {isRecommended && (
                      <div
                        className="px-3 py-1.5 text-xs font-medium text-center"
                        style={{ backgroundColor: colors.steelBlue500, color: "white" }}
                      >
                        Recommended for You
                      </div>
                    )}

                    <div className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${colors.steelBlue500}20` }}
                          >
                            <span style={{ color: colors.steelBlue400 }}>{platform.icon}</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">{platform.name}</h3>
                            <p className="text-sm" style={{ color: colors.warmIvory, opacity: 0.6 }}>
                              {platform.fileType} • {platform.fileSize}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDownload(platform)}
                          className="px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all hover:scale-[1.02]"
                          style={{
                            backgroundColor: colors.steelBlue500,
                            color: "white",
                          }}
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </button>
                      </div>

                      <div className="mt-3 text-sm" style={{ color: colors.warmIvory, opacity: 0.5 }}>
                        Requires: {platform.requirements}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Start Guide */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: `${colors.slateBackground}80`,
              border: `1px solid ${colors.steelBlue400}20`,
            }}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Quick Start</h3>
            <ol className="space-y-3">
              <li className="flex items-start space-x-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                  style={{ backgroundColor: colors.steelBlue500, color: "white" }}
                >
                  1
                </span>
                <span style={{ color: colors.warmIvory, opacity: 0.8 }}>
                  Download and install Local Password Vault for your platform
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                  style={{ backgroundColor: colors.steelBlue500, color: "white" }}
                >
                  2
                </span>
                <span style={{ color: colors.warmIvory, opacity: 0.8 }}>
                  Launch the app and enter your license key when prompted
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                  style={{ backgroundColor: colors.steelBlue500, color: "white" }}
                >
                  3
                </span>
                <span style={{ color: colors.warmIvory, opacity: 0.8 }}>
                  Create your master password and start securing your accounts
                </span>
              </li>
            </ol>
          </div>

          {/* Support Link */}
          <div className="text-center mt-8">
            <p className="text-sm" style={{ color: colors.warmIvory, opacity: 0.5 }}>
              Need help? Contact{" "}
              <a
                href="mailto:support@localpasswordvault.com"
                style={{ color: colors.steelBlue400 }}
                className="hover:underline"
              >
                support@localpasswordvault.com
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-4 px-6">
        <div className="max-w-4xl mx-auto text-center text-sm" style={{ color: colors.warmIvory, opacity: 0.4 }}>
          © 2025 Local Password Vault. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

