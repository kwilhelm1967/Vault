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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [licenseKeys, setLicenseKeys] = useState<string[]>([]);
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [planName, setPlanName] = useState<string>("Lifetime License");
  const [planType, setPlanType] = useState<string>("single");
  const detectedOS = getOS();

  // Extract license keys and other params from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Support multiple keys: ?keys=KEY1,KEY2,KEY3 or ?key=KEY1&key2=KEY2&key3=KEY3
    const keysParam = urlParams.get("keys");
    const singleKey = urlParams.get("key") || urlParams.get("license") || urlParams.get("licenseKey");
    
    const keys: string[] = [];
    
    if (keysParam) {
      // Comma-separated keys
      keys.push(...keysParam.split(",").map(k => k.trim()).filter(k => k));
    } else if (singleKey) {
      keys.push(singleKey);
      // Check for additional numbered keys (key2, key3, etc.)
      for (let i = 2; i <= 10; i++) {
        const additionalKey = urlParams.get(`key${i}`);
        if (additionalKey) {
          keys.push(additionalKey);
        }
      }
    }
    
    setLicenseKeys(keys);
    
    const email = urlParams.get("email");
    const plan = urlParams.get("plan");
    const type = urlParams.get("type"); // single, family, business

    if (email) {
      setCustomerEmail(decodeURIComponent(email));
    }
    if (plan) {
      setPlanName(decodeURIComponent(plan));
    }
    if (type) {
      setPlanType(type);
    } else if (keys.length >= 5) {
      setPlanType("family");
      if (!plan) setPlanName("Family Vault");
    } else {
      setPlanType("single");
      if (!plan) setPlanName("Personal Vault");
    }
  }, []);

  const handleCopyKey = async (key: string, index: number) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = key;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const handleCopyAllKeys = async () => {
    const allKeys = licenseKeys.join("\n");
    try {
      await navigator.clipboard.writeText(allKeys);
      setCopiedIndex(-1); // -1 indicates "all copied"
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = allKeys;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedIndex(-1);
      setTimeout(() => setCopiedIndex(null), 2000);
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

          {/* License Keys Card */}
          {licenseKeys.length > 0 && (
            <div
              className="rounded-xl p-6 mb-8"
              style={{
                backgroundColor: `${colors.slateBackground}`,
                border: `1px solid ${colors.steelBlue400}40`,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${colors.softGold}20` }}
                  >
                    <Key className="w-4 h-4" style={{ color: colors.softGold }} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      {licenseKeys.length === 1 ? "Your License Key" : `Your ${licenseKeys.length} License Keys`}
                    </h2>
                    <p className="text-xs" style={{ color: colors.warmIvory, opacity: 0.6 }}>
                      {licenseKeys.length === 1 
                        ? "Save this key — you'll need it to activate the app"
                        : "Click any key to copy • One key per device"}
                    </p>
                  </div>
                </div>
                
                {licenseKeys.length > 1 && (
                  <button
                    onClick={handleCopyAllKeys}
                    className="px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all text-xs"
                    style={{
                      backgroundColor: copiedIndex === -1 ? `${colors.successGreen}20` : `${colors.steelBlue500}20`,
                      border: `1px solid ${copiedIndex === -1 ? colors.successGreen : colors.steelBlue400}40`,
                      color: copiedIndex === -1 ? colors.successGreen : colors.steelBlue400,
                    }}
                  >
                    {copiedIndex === -1 ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span className="font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="font-medium">Copy All</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Compact display for license keys */}
              {licenseKeys.length === 1 ? (
                /* Single key - prominent display */
                <div
                  className="rounded-lg p-4 flex items-center justify-between"
                  style={{ backgroundColor: colors.deepNavy, border: `1px solid ${colors.steelBlue400}30` }}
                >
                  <code
                    className="text-lg font-mono tracking-wider select-all"
                    style={{ color: colors.steelBlue400 }}
                  >
                    {licenseKeys[0]}
                  </code>
                  <button
                    onClick={() => handleCopyKey(licenseKeys[0], 0)}
                    className="ml-4 px-4 py-2 rounded-lg flex items-center space-x-2 transition-all"
                    style={{
                      backgroundColor: copiedIndex === 0 ? `${colors.successGreen}20` : `${colors.steelBlue500}20`,
                      border: `1px solid ${copiedIndex === 0 ? colors.successGreen : colors.steelBlue400}40`,
                      color: copiedIndex === 0 ? colors.successGreen : colors.steelBlue400,
                    }}
                  >
                    {copiedIndex === 0 ? (
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
              ) : (
                /* Multiple keys - compact inline list */
                <div
                  className="rounded-lg p-3"
                  style={{ backgroundColor: colors.deepNavy, border: `1px solid ${colors.steelBlue400}30` }}
                >
                  <div className="flex flex-wrap gap-1.5">
                    {licenseKeys.map((key, index) => (
                      <button
                        key={index}
                        onClick={() => handleCopyKey(key, index)}
                        className="rounded px-2 py-1 flex items-center space-x-1.5 transition-all hover:scale-[1.02] group"
                        style={{ 
                          backgroundColor: copiedIndex === index ? `${colors.successGreen}20` : `${colors.slateBackground}`, 
                          border: `1px solid ${copiedIndex === index ? colors.successGreen : colors.steelBlue400}25` 
                        }}
                        title={`Click to copy Key ${index + 1}`}
                      >
                        <span 
                          className="text-[9px] font-bold w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                          style={{ 
                            backgroundColor: copiedIndex === index ? `${colors.successGreen}30` : `${colors.steelBlue500}25`, 
                            color: copiedIndex === index ? colors.successGreen : colors.steelBlue400 
                          }}
                        >
                          {index + 1}
                        </span>
                        <code
                          className="text-[11px] font-mono tracking-wide"
                          style={{ color: copiedIndex === index ? colors.successGreen : colors.steelBlue400 }}
                        >
                          {key}
                        </code>
                        {copiedIndex === index ? (
                          <Check className="w-3 h-3 flex-shrink-0" style={{ color: colors.successGreen }} />
                        ) : (
                          <Copy className="w-3 h-3 flex-shrink-0 opacity-30 group-hover:opacity-80" style={{ color: colors.steelBlue400 }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Download className="w-5 h-5" style={{ color: colors.steelBlue400 }} />
              <span>Download for Your Platform</span>
            </h2>

            <div className="grid grid-cols-3 gap-3">
              {sortedPlatforms.map((platform) => {
                const isRecommended = platform.id === detectedOS;
                return (
                  <div
                    key={platform.id}
                    className="rounded-lg transition-all overflow-hidden text-center flex flex-col"
                    style={{
                      backgroundColor: colors.slateBackground,
                      border: isRecommended
                        ? `2px solid ${colors.steelBlue400}`
                        : `1px solid ${colors.steelBlue400}30`,
                    }}
                  >
                    {/* Badge row - fixed height */}
                    <div className="h-6 flex items-center justify-center">
                      {isRecommended && (
                        <div
                          className="px-2 py-0.5 text-[10px] font-medium rounded-b"
                          style={{ backgroundColor: colors.steelBlue500, color: "white" }}
                        >
                          Your OS
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-3 pt-0 flex flex-col flex-1">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2"
                        style={{ backgroundColor: `${colors.steelBlue500}20` }}
                      >
                        <span style={{ color: colors.steelBlue400 }}>{platform.icon}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-white">{platform.name}</h3>
                      <p className="text-[11px] mb-3" style={{ color: colors.warmIvory, opacity: 0.5 }}>
                        {platform.fileType}
                      </p>

                      {/* Button aligned at bottom */}
                      <div className="mt-auto">
                        <button
                          onClick={() => handleDownload(platform)}
                          className="w-full px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center space-x-1.5 transition-all hover:scale-[1.02]"
                          style={{
                            backgroundColor: colors.steelBlue500,
                            color: "white",
                          }}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
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

