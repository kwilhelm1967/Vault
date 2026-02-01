/**
 * Mobile Viewer Component
 * 
 * Read-only view of vault contents for mobile devices.
 * Accessed via QR code with time-limited token.
 */

import { useState, useEffect, useCallback } from "react";
import { Shield, Eye, EyeOff, Copy, Check, Clock, Lock, AlertTriangle, Search, X } from "lucide-react";
import { mobileService } from "../utils/mobileService";
import type { PasswordEntry } from "../types";
import { devError, devLog } from "../utils/devLog";

interface MobileViewerProps {
  token: string;
}

export const MobileViewer = ({ token }: MobileViewerProps) => {
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string>("");
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [permissions, setPermissions] = useState<'view-only' | 'full'>('view-only');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<PasswordEntry | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Validate token on mount
  useEffect(() => {
    const validateAndLoad = async () => {
      setIsValidating(true);
      
      try {
        // Load tokens from storage first
        await mobileService.loadTokens();
        
        // Validate the token
        const validation = mobileService.validateToken(token);
        
        if (!validation.valid) {
          setError(validation.error || "Invalid or expired token");
          setIsValid(false);
          setIsValidating(false);
          return;
        }

        setPermissions(validation.permissions || 'view-only');
        setIsValid(true);

        // Get entries from mobileService shared storage
        const sharedEntries = mobileService.getSharedEntries();
        if (sharedEntries && sharedEntries.length > 0) {
          setEntries(sharedEntries as PasswordEntry[]);
          devLog("Loaded entries for mobile view:", sharedEntries.length);
        } else {
          setError("No entries available. Please create a new access token from your main device.");
          setIsValid(false);
        }
      } catch (err) {
        devError("Token validation failed:", err);
        setError("Token validation failed. Please request a new QR code.");
        setIsValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateAndLoad();
  }, [token]);

  // Update time remaining
  useEffect(() => {
    if (!isValid) return;

    const updateTimeRemaining = async () => {
      await mobileService.loadTokens();
      const tokens = mobileService.getActiveTokens();
      const activeToken = tokens.find(t => t.token === token);
      
      if (activeToken) {
        const now = new Date();
        const diff = activeToken.expiresAt.getTime() - now.getTime();
        
        if (diff <= 0) {
          setError("Token has expired. Please request a new QR code.");
          setIsValid(false);
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m remaining`);
        } else {
          setTimeRemaining(`${minutes}m remaining`);
        }
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isValid, token]);

  // Filter entries by search
  const filteredEntries = entries.filter(entry => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      entry.accountName?.toLowerCase().includes(term) ||
      entry.username?.toLowerCase().includes(term) ||
      entry.url?.toLowerCase().includes(term) ||
      entry.category?.toLowerCase().includes(term)
    );
  });

  // Toggle password visibility
  const togglePasswordVisibility = useCallback((entryId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [entryId]: !prev[entryId]
    }));
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      devError("Failed to copy:", err);
    }
  }, []);

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0F172A' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Validating access...</p>
          <p className="text-gray-400 text-sm mt-2">Please wait while we verify your token</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!isValid || error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0F172A' }}>
        <div className="max-w-sm w-full text-center">
          <div 
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
          >
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 text-sm mb-6">{error || "Invalid or expired token"}</p>
          <div 
            className="p-4 rounded-lg text-left"
            style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(71, 85, 105, 0.5)' }}
          >
            <p className="text-xs text-gray-400 mb-2">To view your vault on this device:</p>
            <ol className="text-xs text-gray-300 space-y-1 list-decimal list-inside">
              <li>Open Local Password Vault on your computer</li>
              <li>Go to Settings → Mobile Access</li>
              <li>Create a new access token</li>
              <li>Scan the new QR code</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Entry detail view
  if (selectedEntry) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0F172A' }}>
        {/* Header */}
        <header 
          className="sticky top-0 z-10 px-4 py-3"
          style={{ backgroundColor: '#1E293B', borderBottom: '1px solid rgba(71, 85, 105, 0.5)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedEntry(null)}
              className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-semibold truncate">{selectedEntry.accountName}</h1>
              <p className="text-xs text-gray-400">{selectedEntry.category || 'Uncategorized'}</p>
            </div>
            {permissions === 'view-only' && (
              <span 
                className="px-2 py-1 rounded text-xs font-medium flex-shrink-0"
                style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}
              >
                View Only
              </span>
            )}
          </div>
        </header>

        {/* Entry Details */}
        <div className="p-4 space-y-3">
          {/* Username */}
          {selectedEntry.username && (
            <div 
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(71, 85, 105, 0.3)' }}
            >
              <p className="text-xs text-gray-400 mb-1">Username</p>
              <div className="flex items-center justify-between">
                <p className="text-white font-mono text-sm">{selectedEntry.username}</p>
                <button
                  onClick={() => copyToClipboard(selectedEntry.username || '', `username-${selectedEntry.id}`)}
                  className="p-2 rounded-lg text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  {copiedField === `username-${selectedEntry.id}` ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Password */}
          {selectedEntry.password && (
            <div 
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(71, 85, 105, 0.3)' }}
            >
              <p className="text-xs text-gray-400 mb-1">Password</p>
              <div className="flex items-center justify-between">
                <p className="text-white font-mono text-sm flex-1 mr-2 break-all">
                  {visiblePasswords[selectedEntry.id] ? selectedEntry.password : '••••••••••••'}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => togglePasswordVisibility(selectedEntry.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-cyan-400 transition-colors"
                  >
                    {visiblePasswords[selectedEntry.id] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(selectedEntry.password || '', `password-${selectedEntry.id}`)}
                    className="p-2 rounded-lg text-gray-400 hover:text-cyan-400 transition-colors"
                  >
                    {copiedField === `password-${selectedEntry.id}` ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* URL */}
          {selectedEntry.url && (
            <div 
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(71, 85, 105, 0.3)' }}
            >
              <p className="text-xs text-gray-400 mb-1">Website</p>
              <div className="flex items-center justify-between">
                <a 
                  href={selectedEntry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 text-sm truncate hover:underline"
                >
                  {selectedEntry.url}
                </a>
                <button
                  onClick={() => copyToClipboard(selectedEntry.url || '', `url-${selectedEntry.id}`)}
                  className="p-2 rounded-lg text-gray-400 hover:text-cyan-400 transition-colors flex-shrink-0"
                >
                  {copiedField === `url-${selectedEntry.id}` ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          {selectedEntry.notes && (
            <div 
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(71, 85, 105, 0.3)' }}
            >
              <p className="text-xs text-gray-400 mb-1">Notes</p>
              <p className="text-white text-sm whitespace-pre-wrap">{selectedEntry.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main list view
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F172A' }}>
      {/* Header */}
      <header 
        className="sticky top-0 z-10 px-4 py-3"
        style={{ backgroundColor: '#1E293B', borderBottom: '1px solid rgba(71, 85, 105, 0.5)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h1 className="text-white font-semibold">Local Password Vault</h1>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">{timeRemaining}</span>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-white text-sm placeholder-gray-500"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(71, 85, 105, 0.5)' }}
          />
        </div>
      </header>

      {/* Entries list */}
      <div className="p-4">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <Lock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">
              {searchTerm ? "No entries match your search" : "No entries found"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEntries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="w-full text-left p-4 rounded-lg transition-colors"
                style={{ 
                  backgroundColor: 'rgba(30, 41, 59, 0.6)', 
                  border: '1px solid rgba(71, 85, 105, 0.3)' 
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)' }}
                  >
                    <span className="text-cyan-400 font-semibold text-sm">
                      {entry.accountName?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{entry.accountName}</p>
                    <p className="text-xs text-gray-400 truncate">{entry.username || 'No username'}</p>
                  </div>
                  <span className="text-gray-500 text-xs">{entry.category || ''}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer 
        className="fixed bottom-0 left-0 right-0 px-4 py-3 text-center"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderTop: '1px solid rgba(71, 85, 105, 0.3)' }}
      >
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <Lock className="w-3 h-3" />
          <span>Read-only access • {filteredEntries.length} entries</span>
        </div>
      </footer>
    </div>
  );
};
