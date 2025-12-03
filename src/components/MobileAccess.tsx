/**
 * Mobile Access Component
 * 
 * Manages mobile companion app access with QR codes and view-only tokens.
 */

import { useState, useEffect } from "react";
import { Smartphone, Clock, Plus, Trash2, Info, Shield, X } from "lucide-react";
import { mobileService, MobileAccessToken } from "../utils/mobileService";

// Dynamically import qrcode
let QRCode: any = null;
const loadQRCode = async () => {
  try {
    // @ts-ignore - qrcode may not be installed
    QRCode = (await import("qrcode")).default;
  } catch (error) {
    console.warn("QRCode library not available:", error);
  }
};

interface MobileAccessProps {
  onClose: () => void;
}

export const MobileAccess = ({ onClose }: MobileAccessProps) => {
  const [tokens, setTokens] = useState<MobileAccessToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTokenDuration, setNewTokenDuration] = useState(24);
  const [newTokenPermissions, setNewTokenPermissions] = useState<'view-only' | 'full'>('view-only');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<Record<string, string>>({});
  const [revokeConfirmToken, setRevokeConfirmToken] = useState<string | null>(null);

  useEffect(() => {
    loadTokens();
    loadQRCode();
  }, []);

  const loadTokens = async () => {
    setIsLoading(true);
    try {
      await mobileService.loadTokens();
      const activeTokens = mobileService.getActiveTokens();
      setTokens(activeTokens);
      
      // Generate QR codes for active tokens
      await generateQRCodes(activeTokens);
    } catch (error) {
      console.error("Failed to load tokens:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCodes = async (tokenList: MobileAccessToken[]) => {
    await loadQRCode();
    if (!QRCode) return;

    const qrCodes: Record<string, string> = {};
    
    for (const token of tokenList) {
      try {
        const qrData = mobileService.generateQRCodeData(token.token);
        const dataUrl = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 2,
          color: {
            dark: "#1a1f2e",
            light: "#ffffff",
          },
        });
        qrCodes[token.token] = dataUrl;
      } catch (error) {
        console.error(`Failed to generate QR code for token ${token.token}:`, error);
      }
    }
    
    setQrCodeDataUrl(qrCodes);
  };

  const handleCreateToken = async () => {
    try {
      const deviceInfo = mobileService.getDeviceInfo();
      await mobileService.generateAccessToken(
        newTokenDuration,
        newTokenPermissions,
        deviceInfo
      );
      
      await loadTokens();
      setShowCreateForm(false);
      setNewTokenDuration(24);
      setNewTokenPermissions('view-only');
      setError("");
    } catch (error) {
      console.error("Failed to create token:", error);
      setError("Unable to create token. Please ensure your vault is unlocked and try again.");
    }
  };

  const handleRevokeToken = async (token: string) => {
    setError("");
    try {
      await mobileService.revokeToken(token);
      await loadTokens();
      setRevokeConfirmToken(null);
    } catch (error) {
      console.error("Failed to revoke token:", error);
      setError("Unable to revoke token. Please try again.");
    }
  };

  const formatTimeRemaining = (expiresAt: Date): string => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="relative w-full max-w-lg mx-4 rounded-xl overflow-hidden"
        style={{ 
          backgroundColor: '#1E293B',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }}
            >
              <Smartphone className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Mobile Access</h2>
              <p className="text-xs text-gray-400">View your vault on mobile devices</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white transition-colors"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Instructions */}
          <div 
            className="rounded-lg p-4 mb-4"
            style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
          >
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-white font-medium mb-2">How Mobile Access works:</p>
                <ol className="text-xs text-gray-300 space-y-1 list-decimal list-inside">
                  <li>Create a temporary access token with an expiration time</li>
                  <li>Scan the QR code with your mobile device's camera</li>
                  <li>View your passwords securely on your phone or tablet</li>
                </ol>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-blue-500/20">
              <Shield className="w-4 h-4 text-green-400" />
              <p className="text-xs text-gray-400">Tokens auto-expire for security. Revoke anytime if needed.</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div 
              className="rounded-lg p-3 mb-4 flex items-center gap-2"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
            >
              <span className="text-sm text-red-400">{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
                <p className="text-xs text-gray-400">Loading...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Action bar */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-400">{tokens.length} active token{tokens.length !== 1 ? 's' : ''}</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(true);
                    setError("");
                  }}
                  className="flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Token
                </button>
              </div>

              {/* Create Token Form */}
              {showCreateForm && (
                <div 
                  className="rounded-lg p-4 mb-4"
                  style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-white font-medium">New Access Token</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setError("");
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">Duration</label>
                      <select
                        value={newTokenDuration}
                        onChange={(e) => setNewTokenDuration(parseInt(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg text-sm text-white"
                        style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                      >
                        <option value="1">1 hour</option>
                        <option value="4">4 hours</option>
                        <option value="12">12 hours</option>
                        <option value="24">24 hours</option>
                        <option value="48">48 hours</option>
                        <option value="72">3 days</option>
                        <option value="168">7 days</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">Access Level</label>
                      <select
                        value={newTokenPermissions}
                        onChange={(e) => setNewTokenPermissions(e.target.value as 'view-only' | 'full')}
                        className="w-full px-3 py-2 rounded-lg text-sm text-white"
                        style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                      >
                        <option value="view-only">View Only (Recommended)</option>
                        <option value="full">Full Access</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <button
                      type="button"
                      onClick={handleCreateToken}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                      style={{ backgroundColor: '#3B82F6' }}
                    >
                      <Plus className="w-4 h-4" />
                      Create Token
                    </button>
                  </div>
                </div>
              )}

              {/* Active Tokens */}
              <div className="space-y-3">
                {tokens.length > 0 ? (
                  tokens.map((token) => (
                    <div
                      key={token.token}
                      className="rounded-lg p-4"
                      style={{ backgroundColor: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                    >
                      {/* Header Row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span 
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: token.permissions === 'view-only' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: token.permissions === 'view-only' ? '#60A5FA' : '#FBBF24',
                              border: `1px solid ${token.permissions === 'view-only' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                            }}
                          >
                            {token.permissions === 'view-only' ? 'View Only' : 'Full Access'}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            Expires in {formatTimeRemaining(token.expiresAt)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRevokeConfirmToken(token.token)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Revoke token"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Token ID */}
                      <div className="text-xs text-gray-500 mb-3">
                        Token: <span className="text-gray-400 font-mono">{token.token.substring(0, 16)}...</span>
                      </div>

                      {/* QR Code */}
                      {qrCodeDataUrl[token.token] && (
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Scan with your mobile device:</p>
                          <div 
                            className="inline-block p-2 rounded-lg"
                            style={{ backgroundColor: '#FFFFFF' }}
                          >
                            <img
                              src={qrCodeDataUrl[token.token]}
                              alt="QR Code"
                              className="w-24 h-24"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : !showCreateForm && (
                  <div className="text-center py-8">
                    <div 
                      className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                    >
                      <Smartphone className="w-7 h-7 text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-300 mb-1">No active tokens</p>
                    <p className="text-xs text-gray-500 mb-4">Create a token to access your vault from a mobile device</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(true);
                        setError("");
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                      style={{ backgroundColor: '#3B82F6' }}
                    >
                      <Plus className="w-4 h-4" />
                      Create Your First Token
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Revoke Confirmation Dialog */}
        {revokeConfirmToken && (
          <div 
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          >
            <div 
              className="mx-4 p-5 rounded-xl max-w-sm w-full"
              style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            >
              <h3 className="text-lg font-semibold text-white mb-2">Revoke Token?</h3>
              <p className="text-sm text-gray-400 mb-4">
                This will immediately revoke access for any device using this token. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setRevokeConfirmToken(null)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleRevokeToken(revokeConfirmToken)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: '#EF4444' }}
                >
                  Revoke
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

