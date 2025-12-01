/**
 * DownloadPage Component
 * 
 * End-user download page for Local Password Vault.
 * Offers platform-specific downloads (no source code).
 */

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Monitor, 
  Apple, 
  Server,
  FileText, 
  CheckCircle, 
  Shield,
  Lock,
  Zap,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

// Color palette matching LPV design system
const colors = {
  steelBlue600: "#4A6FA5",
  steelBlue500: "#5B82B8",
  steelBlue400: "#7A9DC7",
  warmIvory: "#F3F4F6",
  brandGold: "#C9AE66",
};

// Platform detection
const detectPlatform = (): 'windows' | 'macos' | 'linux' | 'unknown' => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('mac')) return 'macos';
  if (userAgent.includes('linux')) return 'linux';
  return 'unknown';
};

// Platform info
const platforms = {
  windows: {
    name: 'Windows',
    icon: Monitor,
    extension: '.exe',
    filename: 'LocalPasswordVault-Setup.exe',
    size: '~85 MB',
    requirements: 'Windows 10 or later (64-bit)',
    color: '#0078D4',
  },
  macos: {
    name: 'macOS',
    icon: Apple,
    extension: '.dmg',
    filename: 'LocalPasswordVault.dmg',
    size: '~95 MB',
    requirements: 'macOS 10.15 (Catalina) or later',
    color: '#000000',
  },
  linux: {
    name: 'Linux',
    icon: Server,
    extension: '.AppImage',
    filename: 'LocalPasswordVault.AppImage',
    size: '~90 MB',
    requirements: 'Ubuntu 18.04+ or equivalent',
    color: '#FCC624',
  },
};

interface DownloadCardProps {
  platform: 'windows' | 'macos' | 'linux';
  isRecommended?: boolean;
  onDownload: (platform: string) => void;
  downloading: string | null;
}

const DownloadCard: React.FC<DownloadCardProps> = ({ 
  platform, 
  isRecommended, 
  onDownload,
  downloading 
}) => {
  const info = platforms[platform];
  const Icon = info.icon;
  const isDownloading = downloading === platform;

  return (
    <div 
      className={`relative rounded-2xl p-6 transition-all duration-300 ${
        isRecommended 
          ? 'border-2 ring-2 ring-offset-2 ring-offset-slate-900' 
          : 'border hover:border-slate-600'
      }`}
      style={{
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        borderColor: isRecommended ? colors.steelBlue500 : 'rgba(71, 85, 105, 0.5)',
        ...(isRecommended && { ringColor: `${colors.steelBlue500}40` }),
      }}
    >
      {isRecommended && (
        <div 
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: colors.steelBlue500 }}
        >
          Recommended for You
        </div>
      )}

      <div className="flex items-center gap-4 mb-4">
        <div 
          className="w-14 h-14 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${colors.steelBlue500}15` }}
        >
          <Icon className="w-7 h-7" strokeWidth={1.5} style={{ color: colors.steelBlue400 }} />
        </div>
        <div>
          <h3 className="text-xl font-bold" style={{ color: colors.warmIvory }}>{info.name}</h3>
          <p className="text-slate-500 text-sm">{info.extension} installer</p>
        </div>
      </div>

      <div className="space-y-2 mb-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">File size</span>
          <span style={{ color: colors.warmIvory }}>{info.size}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Requirements</span>
          <span className="text-right text-xs" style={{ color: colors.warmIvory }}>{info.requirements}</span>
        </div>
      </div>

      <button
        onClick={() => onDownload(platform)}
        disabled={isDownloading}
        className="w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2"
        style={{ 
          backgroundColor: isDownloading ? '#475569' : colors.steelBlue500,
        }}
        onMouseEnter={(e) => {
          if (!isDownloading) e.currentTarget.style.backgroundColor = colors.steelBlue600;
        }}
        onMouseLeave={(e) => {
          if (!isDownloading) e.currentTarget.style.backgroundColor = colors.steelBlue500;
        }}
      >
        {isDownloading ? (
          <>
            <div className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
            <span>Preparing Download...</span>
          </>
        ) : (
          <>
            <Download className="w-5 h-5" strokeWidth={1.5} />
            <span>Download for {info.name}</span>
          </>
        )}
      </button>
    </div>
  );
};

export const DownloadPage: React.FC = () => {
  const [detectedPlatform, setDetectedPlatform] = useState<'windows' | 'macos' | 'linux' | 'unknown'>('unknown');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadComplete, setDownloadComplete] = useState<string | null>(null);

  useEffect(() => {
    setDetectedPlatform(detectPlatform());
  }, []);

  const handleDownload = async (platform: string) => {
    setDownloading(platform);
    setDownloadComplete(null);
    
    try {
      // Simulate download initialization
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Open download URL
      const downloadUrl = `https://localpasswordvault.com/download/${platform}`;
      window.open(downloadUrl, '_blank');
      
      setDownloadComplete(platform);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  const handleDocDownload = (docType: string) => {
    const docUrls: Record<string, string> = {
      quickstart: 'https://localpasswordvault.com/docs/quickstart',
      userguide: 'https://localpasswordvault.com/docs/user-guide',
      security: 'https://localpasswordvault.com/docs/security',
    };
    window.open(docUrls[docType] || '#', '_blank');
  };

  // Sort platforms to show recommended first
  const sortedPlatforms = (['windows', 'macos', 'linux'] as const).sort((a, b) => {
    if (a === detectedPlatform) return -1;
    if (b === detectedPlatform) return 1;
    return 0;
  });

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)' }}
    >
      {/* Header */}
      <header className="py-6 px-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${colors.steelBlue500}, ${colors.steelBlue600})` }}
            >
              <Shield className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-xl font-bold" style={{ color: colors.warmIvory }}>
              Local Password Vault
            </span>
          </div>
          <a 
            href="https://localpasswordvault.com"
            className="text-sm flex items-center gap-1 transition-colors"
            style={{ color: colors.steelBlue400 }}
          >
            Visit Website
            <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4" style={{ color: colors.warmIvory }}>
              Download Local Password Vault
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Secure, offline password management for your desktop. 
              Your data stays on your device — always encrypted, always private.
            </p>
          </div>

          {/* Version Info */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${colors.steelBlue500}20`, color: colors.steelBlue400 }}>
              Version 1.2.0
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              Latest Release
            </span>
          </div>

          {/* Download Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {sortedPlatforms.map((platform) => (
              <DownloadCard
                key={platform}
                platform={platform}
                isRecommended={platform === detectedPlatform}
                onDownload={handleDownload}
                downloading={downloading}
              />
            ))}
          </div>

          {/* Download Success Message */}
          {downloadComplete && (
            <div 
              className="mb-8 p-4 rounded-xl flex items-center gap-3"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}
            >
              <CheckCircle className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
              <span className="text-emerald-300">
                Download started! Check your browser's download folder.
              </span>
            </div>
          )}

          {/* Features Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)' }}>
              <Lock className="w-5 h-5" style={{ color: colors.steelBlue400 }} strokeWidth={1.5} />
              <div>
                <p className="font-medium" style={{ color: colors.warmIvory }}>AES-256 Encryption</p>
                <p className="text-xs text-slate-500">Military-grade security</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)' }}>
              <Shield className="w-5 h-5" style={{ color: colors.steelBlue400 }} strokeWidth={1.5} />
              <div>
                <p className="font-medium" style={{ color: colors.warmIvory }}>100% Offline</p>
                <p className="text-xs text-slate-500">No cloud, no servers</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)' }}>
              <Zap className="w-5 h-5" style={{ color: colors.steelBlue400 }} strokeWidth={1.5} />
              <div>
                <p className="font-medium" style={{ color: colors.warmIvory }}>Lifetime License</p>
                <p className="text-xs text-slate-500">One-time purchase</p>
              </div>
            </div>
          </div>

          {/* Documentation Section */}
          <div 
            className="rounded-2xl p-6"
            style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(71, 85, 105, 0.3)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5" style={{ color: colors.steelBlue400 }} strokeWidth={1.5} />
              <h2 className="text-lg font-semibold" style={{ color: colors.warmIvory }}>Documentation</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleDocDownload('quickstart')}
                className="flex items-center justify-between p-3 rounded-xl transition-colors group"
                style={{ backgroundColor: 'rgba(30, 41, 59, 0.6)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.6)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.6)'}
              >
                <div className="text-left">
                  <p className="font-medium text-sm" style={{ color: colors.warmIvory }}>Quick Start Guide</p>
                  <p className="text-xs text-slate-500">Get up and running fast</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" strokeWidth={1.5} />
              </button>

              <button
                onClick={() => handleDocDownload('userguide')}
                className="flex items-center justify-between p-3 rounded-xl transition-colors group"
                style={{ backgroundColor: 'rgba(30, 41, 59, 0.6)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.6)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.6)'}
              >
                <div className="text-left">
                  <p className="font-medium text-sm" style={{ color: colors.warmIvory }}>User Manual</p>
                  <p className="text-xs text-slate-500">Complete feature guide</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" strokeWidth={1.5} />
              </button>

              <button
                onClick={() => handleDocDownload('security')}
                className="flex items-center justify-between p-3 rounded-xl transition-colors group"
                style={{ backgroundColor: 'rgba(30, 41, 59, 0.6)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.6)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.6)'}
              >
                <div className="text-left">
                  <p className="font-medium text-sm" style={{ color: colors.warmIvory }}>Security Overview</p>
                  <p className="text-xs text-slate-500">How we protect your data</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-slate-500 mb-2">
            Need help? Contact{' '}
            <a 
              href="mailto:support@localpasswordvault.com" 
              className="transition-colors"
              style={{ color: colors.steelBlue400 }}
            >
              support@localpasswordvault.com
            </a>
          </p>
          <p className="text-xs text-slate-600">
            © 2025 Local Password Vault. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
