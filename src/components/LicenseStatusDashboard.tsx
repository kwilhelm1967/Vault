/**
 * License Status Dashboard Component
 * 
 * Displays comprehensive license information including:
 * - License type and status
 * - Device information and binding
 * - Transfer history and limits
 * - Device management for family plans
 * 
 * @component
 */

import React, { useState, useEffect } from "react";
import {
  Shield,
  Key,
  Users2,
  Calendar,
  Monitor,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Lock,
  Unlock,
} from "lucide-react";
import { licenseService, LicenseType, LicenseInfo } from "../utils/licenseService";
import { devError } from "../utils/devLog";

const colors = {
  deepNavy: "#0F172A",
  slateBackground: "#1E293B",
  steelBlue400: "#5B82B8",
  steelBlue500: "#4A6FA5",
  warmIvory: "#F3F4F6",
  successGreen: "#22C55E",
  errorRed: "#EF4444",
  warningAmber: "#F59E0B",
  brandGold: "#C9AE66",
};

interface LicenseStatusDashboardProps {
  onBack: () => void;
  onManageDevices?: () => void;
  onUpgrade?: () => void;
}

export const LicenseStatusDashboard: React.FC<LicenseStatusDashboardProps> = ({
  onBack,
  onManageDevices,
  onUpgrade,
}) => {
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<{ deviceId: string; deviceName: string } | null>(null);
  const [localLicense, setLocalLicense] = useState<any>(null);
  const [maxDevices, setMaxDevices] = useState<number>(1);

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    const loadLicenseStatus = async () => {
      setIsLoading(true);
      try {
        const info = await licenseService.getLicenseInfo();
        if (!signal.aborted) {
          setLicenseInfo(info);
        }
        
        const device = await licenseService.getCurrentDeviceInfo();
        if (!signal.aborted) {
          setDeviceInfo(device);
        }

        const localLicenseFile = await licenseService.getLocalLicenseFile();
        if (!signal.aborted) {
          setLocalLicense(localLicenseFile);
        }
        
        const maxDevicesCount = await licenseService.getMaxDevices();
        if (!signal.aborted) {
          setMaxDevices(maxDevicesCount);
        }
      } catch (error) {
        if (!signal.aborted) {
          devError('Failed to load license status:', error);
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadLicenseStatus();

    return () => {
      abortController.abort();
    };
  }, []);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const maskLicenseKey = (key: string | null): string => {
    if (!key) return 'No license';
    if (key.length < 8) return key;
    return `${key.substring(0, 4)}-****-****-${key.substring(key.length - 4)}`;
  };

  const getLicenseTypeDisplay = (type: LicenseType | null): string => {
    const types: Record<string, string> = {
      personal: 'Personal License',
      family: 'Family License',
      trial: '7-Day Trial',
    };
    return types[type || ''] || 'Unknown';
  };

  const getLicenseTypeColor = (type: LicenseType | null): string => {
    if (type === 'trial') return colors.warningAmber;
    if (type === 'family') return colors.steelBlue400;
    return colors.successGreen;
  };

  const getLicenseTypeIcon = (type: LicenseType | null) => {
    if (type === 'family') {
      return <Users2 className="w-5 h-5" strokeWidth={1.5} />;
    }
    if (type === 'trial') {
      return <Clock className="w-5 h-5" />;
    }
    return <Shield className="w-5 h-5" />;
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen p-6 flex items-center justify-center"
        style={{ backgroundColor: colors.deepNavy }}
      >
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: colors.steelBlue400 }} />
          <p className="text-slate-400">Loading license status...</p>
        </div>
      </div>
    );
  }

  if (!licenseInfo || !licenseInfo.isValid) {
    return (
      <div
        className="min-h-screen p-6"
        style={{ backgroundColor: colors.deepNavy }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
              style={{ color: colors.warmIvory }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold" style={{ color: colors.warmIvory }}>
              License Status
            </h1>
          </div>

          <div
            className="p-8 rounded-lg border text-center"
            style={{
              backgroundColor: colors.slateBackground,
              borderColor: 'rgba(148, 163, 184, 0.2)',
            }}
          >
            <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: colors.errorRed }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: colors.warmIvory }}>
              No Active License
            </h2>
            <p className="text-slate-400 mb-6">
              You don't have an active license. Import a license file to continue.
            </p>
            {onUpgrade && (
              <button
                onClick={onUpgrade}
                className="px-6 py-3 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: colors.steelBlue500,
                  color: 'white',
                }}
              >
                View Pricing & Purchase
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isFamilyPlan = licenseService.isFamilyPlan();
  const activatedDevices = 1; // Current device is activated

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: colors.deepNavy }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
            style={{ color: colors.warmIvory }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: colors.warmIvory }}>
              License Status Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              View your license details and device information
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* License Information Card */}
          <div
            className="rounded-lg p-6 border"
            style={{
              backgroundColor: colors.slateBackground,
              borderColor: 'rgba(148, 163, 184, 0.2)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="p-2 rounded-lg"
                style={{
                  backgroundColor: `${getLicenseTypeColor(licenseInfo.type)}20`,
                  color: getLicenseTypeColor(licenseInfo.type),
                }}
              >
                {getLicenseTypeIcon(licenseInfo.type)}
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: colors.warmIvory }}>
                  License Type
                </h2>
                <p className="text-sm" style={{ color: getLicenseTypeColor(licenseInfo.type) }}>
                  {getLicenseTypeDisplay(licenseInfo.type)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                <span className="text-sm text-slate-400">License Code</span>
                <code className="text-sm font-mono" style={{ color: colors.steelBlue400 }}>
                  {maskLicenseKey(licenseInfo.key)}
                </code>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                <span className="text-sm text-slate-400">Status</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" style={{ color: colors.successGreen }} />
                  <span className="text-sm font-medium" style={{ color: colors.successGreen }}>
                    Active
                  </span>
                </div>
              </div>

              {licenseInfo.activatedDate && (
                <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                  <span className="text-sm text-slate-400">Activated</span>
                  <span className="text-sm text-slate-300">
                    {formatDate(licenseInfo.activatedDate)}
                  </span>
                </div>
              )}

              {localLicense && typeof localLicense.transfer_count === 'number' && (
                <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                  <span className="text-sm text-slate-400">Transfers Used</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-300">
                      {localLicense.transfer_count} / 3
                    </span>
                    {localLicense.transfer_count >= 3 && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ 
                        backgroundColor: 'rgba(245, 158, 11, 0.2)',
                        color: colors.warningAmber 
                      }}>
                        Limit Reached
                      </span>
                    )}
                  </div>
                </div>
              )}

              {localLicense?.last_transfer_at && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-400">Last Transfer</span>
                  <span className="text-sm text-slate-300">
                    {formatDate(localLicense.last_transfer_at)}
                  </span>
                </div>
              )}

              {licenseInfo.type === 'trial' && (
                <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4" style={{ color: colors.warningAmber }} />
                    <span className="text-sm font-medium" style={{ color: colors.warningAmber }}>
                      Trial License
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Your trial expires in 7 days. Purchase a lifetime license to continue using the app.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Device Information Card */}
          <div
            className="rounded-lg p-6 border"
            style={{
              backgroundColor: colors.slateBackground,
              borderColor: 'rgba(148, 163, 184, 0.2)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="p-2 rounded-lg"
                style={{
                  backgroundColor: `${colors.steelBlue400}20`,
                  color: colors.steelBlue400,
                }}
              >
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: colors.warmIvory }}>
                  Current Device
                </h2>
                <p className="text-sm text-slate-400">
                  {deviceInfo?.deviceName || 'Unknown Device'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                <span className="text-sm text-slate-400">Device Binding</span>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" style={{ color: colors.successGreen }} />
                  <span className="text-sm font-medium" style={{ color: colors.successGreen }}>
                    Bound
                  </span>
                </div>
              </div>

              {deviceInfo && (
                <div className="py-2">
                  <span className="text-sm text-slate-400 block mb-1">Device ID</span>
                  <code className="text-xs font-mono text-slate-500 break-all">
                    {deviceInfo.deviceId.substring(0, 32)}...
                  </code>
                </div>
              )}

              {isFamilyPlan && (
                <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(91, 130, 184, 0.1)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{ color: colors.steelBlue400 }}>
                      Devices Used
                    </span>
                    <span className="text-sm font-bold" style={{ color: colors.warmIvory }}>
                      {activatedDevices} / {maxDevices}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${(activatedDevices / maxDevices) * 100}%`,
                        backgroundColor: colors.steelBlue400,
                      }}
                    />
                  </div>
                  {onManageDevices && (
                    <button
                      onClick={onManageDevices}
                      className="w-full mt-2 px-3 py-1.5 rounded text-xs font-medium transition-all"
                      style={{
                        backgroundColor: `${colors.steelBlue400}20`,
                        color: colors.steelBlue400,
                        border: `1px solid ${colors.steelBlue400}30`,
                      }}
                    >
                      Manage Devices
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div
          className="mt-6 rounded-lg p-6 border"
          style={{
            backgroundColor: colors.slateBackground,
            borderColor: 'rgba(148, 163, 184, 0.2)',
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.warmIvory }}>
            License Details
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-slate-400 block mb-1">Product</span>
              <span className="text-sm text-slate-300">
                Local Password Vault
              </span>
            </div>

            <div>
              <span className="text-sm text-slate-400 block mb-1">Validation</span>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: colors.successGreen }} />
                <span className="text-sm text-slate-300">Offline Validation Active</span>
              </div>
            </div>

            {localLicense?.signed_at && (
              <div>
                <span className="text-sm text-slate-400 block mb-1">License Signed</span>
                <span className="text-sm text-slate-300">
                  {formatDate(localLicense.signed_at)}
                </span>
              </div>
            )}

            <div>
              <span className="text-sm text-slate-400 block mb-1">Privacy</span>
              <div className="flex items-center gap-2">
                <Unlock className="w-4 h-4" style={{ color: colors.successGreen }} />
                <span className="text-sm text-slate-300">100% Offline Operation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          {isFamilyPlan && onManageDevices && (
            <button
              onClick={onManageDevices}
              className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
              style={{
                backgroundColor: `${colors.steelBlue400}20`,
                color: colors.steelBlue400,
                border: `1px solid ${colors.steelBlue400}30`,
              }}
            >
              <Users2 className="w-4 h-4" strokeWidth={1.5} />
              Manage Devices
            </button>
          )}

          {licenseInfo.type === 'trial' && onUpgrade && (
            <button
              onClick={onUpgrade}
              className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
              style={{
                backgroundColor: colors.steelBlue500,
                color: 'white',
              }}
            >
              <ExternalLink className="w-4 h-4" />
              Upgrade to Lifetime
            </button>
          )}

          <button
            onClick={loadLicenseStatus}
            className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
            style={{
              backgroundColor: `${colors.slateBackground}`,
              color: colors.warmIvory,
              border: `1px solid rgba(148, 163, 184, 0.2)`,
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Status
          </button>
        </div>

        {/* Privacy Note */}
        <div
          className="mt-6 p-4 rounded-lg border"
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.05)',
            borderColor: 'rgba(34, 197, 94, 0.2)',
          }}
        >
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.successGreen }} />
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: colors.successGreen }}>
                Privacy Guarantee
              </p>
              <p className="text-xs text-slate-400">
                Your license is validated locally using a signed license file. After activation, 
                the app never contacts our servers. All validation happens offline on your device.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

