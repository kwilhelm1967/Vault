/**
 * Settings Component
 * 
 * Comprehensive settings interface for vault configuration. Handles:
 * - Auto-lock timeout configuration (minutes)
 * - Clipboard auto-clear timeout (seconds)
 * - Default password visibility setting
 * - Sound effects toggle
 * - Master password change
 * - Data export (CSV, encrypted JSON)
 * - Data import (CSV, encrypted JSON)
 * - Complete data deletion
 * - Recovery phrase generation and display
 * - Mobile access token management
 * - App version and information display
 * 
 * @component
 * 
 * @example
 * ```tsx
 * <Settings
 *   onExport={handleExport}
 *   onExportEncrypted={handleExportEncrypted}
 *   onImport={handleImport}
 *   onImportEncrypted={handleImportEncrypted}
 *   onChangePassword={handleChangePassword}
 *   onClearAllData={handleClearAllData}
 *   totalEntries={entries.length}
 * />
 * ```
 * 
 * @remarks
 * Settings are persisted to localStorage using keys:
 * - vault_auto_lock_timeout
 * - vault_clipboard_clear_timeout
 * - vault_show_passwords_default
 * - vault_sound_effects_enabled
 * 
 * Uses bouncy card animations for visual feedback on interactions.
 */

import React, { useState, useEffect } from "react";
import {
  Shield,
  Clock,
  Clipboard,
  Eye,
  EyeOff,
  Key,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Check,
  Info,
  Lock,
  ChevronDown,
  Database,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Edit3,
  Volume2,
  VolumeX,
  Lightbulb,
  BookOpen,
  Keyboard,
  Smartphone,
  ExternalLink,
  Globe,
  FileText,
} from "lucide-react";
import { APP_VERSION } from "../config/changelog";
import { generateRecoveryPhrase, storeRecoveryPhrase } from "../utils/recoveryPhrase";
import { storageService } from "../utils/storage";
import { devError, devWarn } from "../utils/devLog";
import { getErrorLogger } from "../utils/errorHandling";
import { MobileAccess } from "./MobileAccess";

// Color palette
const colors = {
  steelBlue600: "#4A6FA5",
  steelBlue500: "#5B82B8",
  steelBlue400: "#7A9DC7",
  mutedSky: "#93B4D1",
  warmIvory: "#F3F4F6",
  brandGold: "#C9AE66",
  goldLight: "#D4BC7D",
  goldDark: "#B89B4D",
};

// Settings storage keys
const SETTINGS_KEYS = {
  AUTO_LOCK_TIMEOUT: "vault_auto_lock_timeout",
  CLIPBOARD_CLEAR_TIMEOUT: "vault_clipboard_clear_timeout",
  SHOW_PASSWORDS_DEFAULT: "vault_show_passwords_default",
};

export interface VaultSettings {
  autoLockTimeout: number;
  clipboardClearTimeout: number;
  showPasswordsDefault: boolean;
  soundEffectsEnabled: boolean;
}

const DEFAULT_SETTINGS: VaultSettings = {
  autoLockTimeout: 5,
  clipboardClearTimeout: 30,
  showPasswordsDefault: false,
  soundEffectsEnabled: false, // OFF by default
};

export interface SettingsProps {
  onExport: () => void;
  onExportEncrypted: (password: string) => Promise<void>;
  onImport: () => void;
  onImportEncrypted: (data: string, password: string) => Promise<void>;
  onChangePassword: () => void;
  onClearAllData: () => void;
  onClose?: () => void;
  totalEntries: number;
}

// Bouncy Card Component - with visible border and bounce animation
const BouncyCard: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "danger" | "accent";
  className?: string;
}> = ({ children, onClick, variant = "default", className = "" }) => {
  const getBorderColor = () => {
    switch (variant) {
      case "danger": return "rgba(239, 68, 68, 0.4)";
      case "accent": return `${colors.steelBlue500}50`;
      default: return `${colors.steelBlue500}30`;
    }
  };

  const getHoverBorderColor = () => {
    switch (variant) {
      case "danger": return "rgba(239, 68, 68, 0.7)";
      case "accent": return colors.steelBlue400;
      default: return colors.steelBlue500;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-xl p-3 sm:p-4 lg:p-5 cursor-pointer
        transition-all duration-200 ease-out
        ${className}
      `}
      style={{
        backgroundColor: "rgba(30, 41, 59, 0.6)",
        border: `1px solid ${getBorderColor()}`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.15)`,
        transform: 'translateY(0) scale(1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = getHoverBorderColor();
        e.currentTarget.style.boxShadow = `0 8px 30px rgba(0,0,0,0.25), 0 0 25px ${variant === "danger" ? "rgba(239, 68, 68, 0.15)" : `${colors.steelBlue500}20`}`;
        e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)';
        e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.8)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = getBorderColor();
        e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.15)`;
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.6)";
      }}
    >
      {children}
    </div>
  );
};

// Custom Select Component
const BlueSelect: React.FC<{
  value: number;
  options: { value: number; label: string }[];
  onChange: (value: number) => void;
  saved?: boolean;
}> = ({ value, options, onChange, saved }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || "";

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150"
        style={{
          backgroundColor: "#334155",
          color: colors.steelBlue400,
          border: "1px solid #64748b",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#475569";
          e.currentTarget.style.borderColor = "#94a3b8";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#334155";
          e.currentTarget.style.borderColor = "#64748b";
        }}
      >
        <span>{selectedLabel}</span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} 
          strokeWidth={1.5} 
        />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div 
            className="absolute right-0 top-full mt-2 py-2 rounded-xl z-50 min-w-[160px] overflow-hidden isolate"
            style={{
              backgroundColor: "#1e293b",
              border: "1px solid #475569",
              boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.6), 0 4px 6px -2px rgba(0, 0, 0, 0.3)",
            }}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between"
                  style={{ 
                    color: isSelected ? colors.steelBlue400 : colors.warmIvory,
                    backgroundColor: isSelected ? "#334155" : "#1e293b",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "#334155";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "#1e293b";
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <Check className="w-4 h-4" strokeWidth={2} style={{ color: colors.brandGold }} />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
      
      {saved && (
        <span 
          className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold animate-bounce"
          style={{ backgroundColor: "#10b981" }}
        >
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
        </span>
      )}
    </div>
  );
};

// Blue Toggle Component
const BlueToggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  saved?: boolean;
}> = ({ checked, onChange, saved }) => {
  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onChange(!checked);
        }}
        className="relative w-11 h-6 rounded-full transition-all duration-300 flex items-center"
        style={{
          backgroundColor: checked ? colors.steelBlue500 : "#334155",
          boxShadow: checked ? `0 0 12px ${colors.steelBlue500}30` : "inset 0 1px 2px rgba(0,0,0,0.2)",
          border: `1px solid ${checked ? colors.steelBlue500 : "#475569"}`,
        }}
      >
        <div 
          className={`w-4 h-4 rounded-full transition-all duration-300 flex items-center justify-center ${
            checked ? "ml-[22px]" : "ml-[3px]"
          }`}
          style={{
            backgroundColor: checked ? "#1e293b" : "#64748b",
            boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
          }}
        >
          {checked && (
            <Check className="w-2.5 h-2.5" strokeWidth={3} style={{ color: colors.brandGold }} />
          )}
        </div>
      </button>
      
      {saved && (
        <span 
          className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold animate-bounce"
          style={{ backgroundColor: "#10b981" }}
        >
          <Check className="w-3 h-3" strokeWidth={3} />
        </span>
      )}
    </div>
  );
};

// Section Title Component
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-3 mb-4">
    <div 
      className="h-px flex-1"
      style={{ background: `linear-gradient(90deg, ${colors.steelBlue500}40, transparent)` }}
    />
    <span 
      className="text-xs font-semibold tracking-widest uppercase"
      style={{ color: colors.steelBlue400 }}
    >
      {children}
    </span>
    <div 
      className="h-px flex-1"
      style={{ background: `linear-gradient(-90deg, ${colors.steelBlue500}40, transparent)` }}
    />
  </div>
);

export const Settings: React.FC<SettingsProps> = ({
  onExport,
  onExportEncrypted,
  onImport,
  onImportEncrypted,
  onChangePassword,
  onClearAllData,
  onClose,
  totalEntries,
}) => {
  const [settings, setSettings] = useState<VaultSettings>(DEFAULT_SETTINGS);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState<string | null>(null);
  
  // Encrypted export/import states
  const [showEncryptedExportModal, setShowEncryptedExportModal] = useState(false);
  const [showEncryptedImportModal, setShowEncryptedImportModal] = useState(false);
  const [encryptPassword, setEncryptPassword] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [importData, setImportData] = useState("");
  const [encryptError, setEncryptError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Recovery phrase states
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [newRecoveryPhrase, setNewRecoveryPhrase] = useState("");
  const [phraseConfirmed, setPhraseConfirmed] = useState(false);
  const [showPhrase, setShowPhrase] = useState(false);
  const [phraseCopied, setPhraseCopied] = useState(false);
  
  // Password hint states
  const [showHintModal, setShowHintModal] = useState(false);
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const [newHint, setNewHint] = useState("");
  const [showCurrentHint, setShowCurrentHint] = useState(false);
  
  // Mobile access state
  const [showMobileAccess, setShowMobileAccess] = useState(false);

  useEffect(() => {
    // Load settings including sound effects from vault_settings JSON
    let soundEffectsEnabled = DEFAULT_SETTINGS.soundEffectsEnabled;
    try {
      const vaultSettings = localStorage.getItem('vault_settings');
      if (vaultSettings) {
        const parsed = JSON.parse(vaultSettings);
        soundEffectsEnabled = parsed.soundEffectsEnabled ?? false;
      }
    } catch (error) {
      devError("Failed to parse vault settings:", error);
    }
    
    const loadedSettings: VaultSettings = {
      autoLockTimeout: parseInt(localStorage.getItem(SETTINGS_KEYS.AUTO_LOCK_TIMEOUT) || String(DEFAULT_SETTINGS.autoLockTimeout)),
      clipboardClearTimeout: parseInt(localStorage.getItem(SETTINGS_KEYS.CLIPBOARD_CLEAR_TIMEOUT) || String(DEFAULT_SETTINGS.clipboardClearTimeout)),
      showPasswordsDefault: localStorage.getItem(SETTINGS_KEYS.SHOW_PASSWORDS_DEFAULT) === "true",
      soundEffectsEnabled,
    };
    setSettings(loadedSettings);
    
    // Load current password hint
    const loadPasswordHint = async () => {
      try {
        const hint = await storageService.getPasswordHint();
        setCurrentHint(hint);
        setNewHint(hint || "");
      } catch (error) {
        devError('Failed to load password hint:', error);
      }
    };
    loadPasswordHint();
  }, []);
  
  // Handle regenerating recovery phrase
  const handleStartRegenerate = () => {
    const phrase = generateRecoveryPhrase();
    setNewRecoveryPhrase(phrase);
    setPhraseConfirmed(false);
    setShowPhrase(false);
    setPhraseCopied(false);
    setShowRegenerateModal(true);
  };
  
  const handleConfirmRegenerate = async () => {
    if (!phraseConfirmed) return;
    try {
      await storeRecoveryPhrase(newRecoveryPhrase);
      setShowRegenerateModal(false);
      setNewRecoveryPhrase("");
      showSavedIndicator("Recovery phrase updated!");
    } catch (error) {
      devError("Failed to store recovery phrase:", error);
    }
  };
  
  const handleCopyPhrase = async () => {
    await navigator.clipboard.writeText(newRecoveryPhrase);
    setPhraseCopied(true);
    setTimeout(() => setPhraseCopied(false), 2000);
  };
  
  // Handle password hint
  const handleSaveHint = async () => {
    try {
      await storageService.setPasswordHint(newHint.trim() || null);
      setCurrentHint(newHint.trim() || null);
      setShowHintModal(false);
      showSavedIndicator(newHint.trim() ? "Hint saved!" : "Hint removed!");
    } catch (error) {
      devError("Failed to save hint:", error);
    }
  };
  
  const handleRemoveHint = async () => {
    try {
      await storageService.setPasswordHint(null);
      setCurrentHint(null);
      setNewHint("");
      setShowHintModal(false);
      showSavedIndicator("Hint removed!");
    } catch (error) {
      devError("Failed to remove hint:", error);
    }
  };

  const showSavedIndicator = (message: string) => {
    setSavedIndicator(message);
    setTimeout(() => setSavedIndicator(null), 2000);
  };

  const saveSetting = (key: string, value: string | number | boolean, settingName: string) => {
    localStorage.setItem(key, String(value));
    showSavedIndicator(settingName);
  };

  const handleAutoLockChange = (value: number) => {
    setSettings(prev => ({ ...prev, autoLockTimeout: value }));
    saveSetting(SETTINGS_KEYS.AUTO_LOCK_TIMEOUT, value, "autoLock");
  };

  const handleClipboardClearChange = (value: number) => {
    setSettings(prev => ({ ...prev, clipboardClearTimeout: value }));
    saveSetting(SETTINGS_KEYS.CLIPBOARD_CLEAR_TIMEOUT, value, "clipboard");
  };

  const handleEncryptedExport = async () => {
    if (!encryptPassword) {
      setEncryptError("Please enter your master password");
      return;
    }
    
    setIsProcessing(true);
    setEncryptError("");
    try {
      await onExportEncrypted(encryptPassword);
      setShowEncryptedExportModal(false);
      setEncryptPassword("");
    } catch (err) {
      setEncryptError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEncryptedImport = async () => {
    if (!importData.trim()) {
      setEncryptError("Please paste the encrypted backup data");
      return;
    }
    if (!importPassword) {
      setEncryptError("Please enter the backup password");
      return;
    }
    
    setIsProcessing(true);
    setEncryptError("");
    try {
      await onImportEncrypted(importData, importPassword);
      setShowEncryptedImportModal(false);
      setImportData("");
      setImportPassword("");
    } catch (err) {
      setEncryptError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShowPasswordsChange = (value: boolean) => {
    setSettings(prev => ({ ...prev, showPasswordsDefault: value }));
    saveSetting(SETTINGS_KEYS.SHOW_PASSWORDS_DEFAULT, value, "showPasswords");
  };

  const handleSoundEffectsChange = (value: boolean) => {
    setSettings(prev => ({ ...prev, soundEffectsEnabled: value }));
    // Save to vault_settings JSON for the soundEffects utility to read
    try {
      const existing = localStorage.getItem('vault_settings');
      const parsed = existing ? JSON.parse(existing) : {};
      parsed.soundEffectsEnabled = value;
      localStorage.setItem('vault_settings', JSON.stringify(parsed));
      showSavedIndicator("soundEffects");
    } catch (error) {
      devError("Failed to save sound effects setting:", error);
    }
  };

  const autoLockOptions = [
    { value: 0, label: "Never" },
    { value: 1, label: "1 minute" },
    { value: 5, label: "5 minutes" },
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 60, label: "1 hour" },
  ];

  const clipboardOptions = [
    { value: 0, label: "Never" },
    { value: 15, label: "15 seconds" },
    { value: 30, label: "30 seconds" },
    { value: 60, label: "1 minute" },
    { value: 120, label: "2 minutes" },
  ];

  return (
    <div className="p-8 overflow-y-auto h-full">
      {/* Header */}
      <div className="text-center mb-6">
        <div 
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
          style={{ 
            background: `linear-gradient(135deg, ${colors.steelBlue500}, ${colors.steelBlue600})`,
            boxShadow: `0 8px 32px ${colors.steelBlue500}30`,
          }}
        >
          <Sparkles className="w-7 h-7 text-white" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-bold mb-1" style={{ color: colors.warmIvory }}>Settings</h1>
        <p className="text-slate-500 text-xs flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3" strokeWidth={1.5} style={{ color: colors.brandGold }} />
          <span>AES-256 encrypted • Data never leaves your device</span>
        </p>
      </div>

      {/* Security Settings */}
      <SectionTitle>Security</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
        <BouncyCard variant="accent">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
              </div>
              <div className="min-w-0">
                <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Auto-Lock</h3>
                <p className="text-slate-500 text-xs">Lock after inactivity</p>
              </div>
            </div>
            <BlueSelect
              value={settings.autoLockTimeout}
              options={autoLockOptions}
              onChange={handleAutoLockChange}
              saved={savedIndicator === "autoLock"}
            />
          </div>
        </BouncyCard>

        <BouncyCard variant="accent">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
                <Clipboard className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
              </div>
              <div className="min-w-0">
                <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Clipboard</h3>
                <p className="text-slate-500 text-xs">Auto-clear copied data</p>
              </div>
            </div>
            <BlueSelect
              value={settings.clipboardClearTimeout}
              options={clipboardOptions}
              onChange={handleClipboardClearChange}
              saved={savedIndicator === "clipboard"}
            />
          </div>
        </BouncyCard>

        <BouncyCard variant="accent">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
                {settings.showPasswordsDefault 
                  ? <Eye className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
                  : <EyeOff className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
                }
              </div>
              <div className="min-w-0">
                <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Show Passwords</h3>
                <p className="text-slate-500 text-xs">Visible by default</p>
              </div>
            </div>
            <BlueToggle
              checked={settings.showPasswordsDefault}
              onChange={handleShowPasswordsChange}
              saved={savedIndicator === "showPasswords"}
            />
          </div>
        </BouncyCard>

        <BouncyCard variant="accent">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
                {settings.soundEffectsEnabled 
                  ? <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
                  : <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
                }
              </div>
              <div className="min-w-0">
                <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Sound Effects</h3>
                <p className="text-slate-500 text-xs">Subtle audio feedback</p>
              </div>
            </div>
            <BlueToggle
              checked={settings.soundEffectsEnabled}
              onChange={handleSoundEffectsChange}
              saved={savedIndicator === "soundEffects"}
            />
          </div>
        </BouncyCard>

        <BouncyCard variant="accent" onClick={onChangePassword}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
              <Key className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Master Password</h3>
              <p className="text-slate-500 text-xs">Change encryption key</p>
            </div>
            <span style={{ color: colors.brandGold }} className="flex-shrink-0">→</span>
          </div>
        </BouncyCard>

        {/* Recovery Phrase */}
        <BouncyCard onClick={handleStartRegenerate} variant="accent">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Recovery Phrase</h3>
              <p className="text-slate-500 text-xs">Generate new 12-word phrase</p>
            </div>
            <span style={{ color: colors.brandGold }} className="flex-shrink-0">→</span>
          </div>
        </BouncyCard>

        {/* Password Hint */}
        <BouncyCard onClick={() => setShowHintModal(true)} variant="accent">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Password Hint</h3>
              <p className="text-slate-500 text-xs">
                {currentHint ? "Hint is set" : "No hint configured"}
              </p>
            </div>
            <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" style={{ color: colors.brandGold }} />
          </div>
        </BouncyCard>
      </div>

      {/* Quick Actions */}
      <SectionTitle>Quick Actions</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
        <BouncyCard onClick={onExport} variant="accent">
          <div className="flex flex-col gap-2 sm:gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Export to Excel</h3>
                <p className="text-slate-500 text-xs">Opens in Excel or Google Sheets</p>
              </div>
              <span 
                className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: `${colors.steelBlue500}20`, color: colors.steelBlue400 }}
              >
                {totalEntries}
              </span>
            </div>
            <div 
              className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg"
              style={{ backgroundColor: 'rgba(201, 174, 102, 0.1)', border: '1px solid rgba(201, 174, 102, 0.2)' }}
            >
              <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" strokeWidth={1.5} style={{ color: colors.brandGold }} />
              <span className="text-[10px] sm:text-[11px]" style={{ color: '#9CA3AF' }}>
                Contains sensitive data. Store securely.
              </span>
            </div>
          </div>
        </BouncyCard>

        <BouncyCard onClick={onImport} variant="accent">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
              <Upload className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Import from File</h3>
              <p className="text-slate-500 text-xs">Restore from backup</p>
            </div>
            <span style={{ color: colors.brandGold }} className="flex-shrink-0">→</span>
          </div>
        </BouncyCard>

        <BouncyCard onClick={() => setShowEncryptedExportModal(true)} variant="accent">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Secure Backup</h3>
              <p className="text-slate-500 text-xs">Password-protected file</p>
            </div>
            <span 
              className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: "rgba(34, 197, 94, 0.2)", color: "rgb(34, 197, 94)" }}
            >
              SECURE
            </span>
          </div>
        </BouncyCard>

        <BouncyCard onClick={() => setShowEncryptedImportModal(true)} variant="accent">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Restore Secure Backup</h3>
              <p className="text-slate-500 text-xs">Upload .csv file</p>
            </div>
            <span 
              className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: "rgba(34, 197, 94, 0.2)", color: "rgb(34, 197, 94)" }}
            >
              SECURE
            </span>
          </div>
        </BouncyCard>

        <BouncyCard onClick={() => setShowMobileAccess(true)} variant="accent">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5 sm:mb-1 text-sm sm:text-base">Mobile Access</h3>
              <p className="text-slate-500 text-xs">View vault on your phone</p>
            </div>
            <span style={{ color: colors.brandGold }}>→</span>
          </div>
        </BouncyCard>
      </div>

      {/* About */}
      <SectionTitle>About</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
        {[
          { label: "Version", value: APP_VERSION, icon: Info },
          { label: "Encryption", value: "AES-256", icon: Shield },
          { label: "Key", value: "PBKDF2", icon: Key },
          { label: "Storage", value: "Local", icon: Database },
        ].map((item, i) => (
          <BouncyCard key={i} variant="accent" className="!p-3">
            <div className="flex items-center gap-2.5">
              <div 
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${colors.steelBlue500}10` }}
              >
                <item.icon className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: colors.brandGold }} />
              </div>
              <p className="text-slate-400 text-xs">{item.label}</p>
              <p style={{ color: colors.warmIvory }} className="font-medium text-xs">{item.value}</p>
            </div>
          </BouncyCard>
        ))}
      </div>
      
      {/* What's New Button */}
      <BouncyCard 
        variant="accent" 
        className="mb-8"
        onClick={() => {
          // Dispatch custom event to open What's New modal
          window.dispatchEvent(new CustomEvent('open-whats-new'));
        }}
      >
        <div className="flex items-center gap-4">
          <Lightbulb className="w-6 h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
          <div className="flex-1">
            <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5">What's New in v{APP_VERSION}</h3>
            <p className="text-slate-500 text-xs">See the latest features and improvements</p>
          </div>
          <Sparkles className="w-5 h-5" strokeWidth={1.5} style={{ color: colors.brandGold }} />
        </div>
      </BouncyCard>

      {/* Help Section */}
      <SectionTitle>Help & Support</SectionTitle>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-8">
        {/* Replay Tutorial */}
        <BouncyCard 
          variant="accent" 
          onClick={() => {
            localStorage.removeItem("onboarding_completed");
            window.dispatchEvent(new CustomEvent('replay-onboarding'));
          }}
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
            <div className="flex-1 min-w-0">
              <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5 text-sm">Replay Tutorial</h3>
              <p className="text-slate-500 text-xs truncate">Learn how to use the app</p>
            </div>
            <span style={{ color: colors.brandGold }}>→</span>
          </div>
        </BouncyCard>

        {/* Keyboard Shortcuts */}
        <BouncyCard 
          variant="accent" 
          onClick={() => {
            // Close settings first, then show shortcuts after a brief delay
            onClose?.();
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('show-keyboard-shortcuts'));
            }, 100);
          }}
        >
          <div className="flex items-center gap-3">
            <Keyboard className="w-6 h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
            <div className="flex-1 min-w-0">
              <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5 text-sm">Keyboard Shortcuts</h3>
              <p className="text-slate-500 text-xs truncate">Press ? to see all shortcuts</p>
            </div>
            <kbd className="px-2 py-1 text-xs font-mono bg-slate-700 text-slate-300 rounded border border-slate-600">?</kbd>
          </div>
        </BouncyCard>

        {/* Visit Website */}
        <BouncyCard 
          variant="accent" 
          onClick={() => {
            const url = "https://localpasswordvault.com";
            void (window.electronAPI?.openExternal?.(url) ?? window.open(url, "_blank"));
          }}
        >
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
            <div className="flex-1 min-w-0">
              <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5 text-sm">Visit Website</h3>
              <p className="text-slate-500 text-xs truncate">LocalPasswordVault.com</p>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
          </div>
        </BouncyCard>

        {/* Export Error Logs */}
        <BouncyCard 
          variant="accent" 
          onClick={() => {
            try {
              const errorLogger = getErrorLogger();
              const errorLogs = errorLogger.exportErrorLogs();
              const blob = new Blob([errorLogs], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `lpv-error-logs-${new Date().toISOString().split('T')[0]}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            } catch (error) {
              devError('Failed to export error logs:', error);
            }
          }}
        >
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
            <div className="flex-1 min-w-0">
              <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-0.5 text-sm">Export Error Logs</h3>
              <p className="text-slate-500 text-xs truncate">For support requests</p>
            </div>
            <Download className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
          </div>
        </BouncyCard>
      </div>

      {/* Danger Zone */}
      <SectionTitle>Danger Zone</SectionTitle>
      <BouncyCard onClick={() => setShowClearConfirm(true)} variant="danger">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-700/50">
            <Trash2 className="w-6 h-6 text-slate-400" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h3 className="text-red-400 font-semibold mb-1">Clear All Data</h3>
            <p className="text-slate-500 text-xs">Permanently delete everything</p>
          </div>
          <span className="text-red-400">→</span>
        </div>
      </BouncyCard>

      {/* Clear Data Confirmation Modal */}
      {showClearConfirm && (
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
              <h3 style={{ color: colors.warmIvory }} className="text-xl font-bold mb-3">Clear All Data?</h3>
              <p className="text-slate-400 text-sm mb-6">
                This will permanently delete all <span className="text-red-400 font-semibold">{totalEntries} accounts</span>, 
                your master password, and all settings.
              </p>
              <p className="text-red-400 text-xs mb-8 font-medium bg-red-500/10 py-2 px-4 rounded-lg inline-block">
                ⚠️ This action cannot be undone
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-6 py-3.5 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onClearAllData();
                    setShowClearConfirm(false);
                  }}
                  className="flex-1 px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-red-500/30"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Encrypted Export Modal */}
      {showEncryptedExportModal && (
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
                <h3 style={{ color: colors.warmIvory }} className="text-lg font-bold">Secure Backup</h3>
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
                  value={encryptPassword}
                  onChange={(e) => setEncryptPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Enter your master password"
                />
              </div>
              
              {encryptError && (
                <p className="text-red-400 text-xs bg-red-500/10 p-2 rounded">{encryptError}</p>
              )}
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowEncryptedExportModal(false);
                    setEncryptPassword("");
                    setEncryptError("");
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm font-medium transition-all"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEncryptedExport}
                  disabled={isProcessing || !encryptPassword}
                  className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  style={{ backgroundColor: colors.steelBlue500 }}
                >
                  {isProcessing ? "Creating Backup..." : "Create Backup"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Encrypted Import Modal */}
      {showEncryptedImportModal && (
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
                <Lock className="w-6 h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
              </div>
              <div>
                <h3 style={{ color: colors.warmIvory }} className="text-lg font-bold">Restore Backup</h3>
                <p className="text-slate-400 text-xs">Restore from encrypted backup file</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Select Backup File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setImportData(event.target?.result as string || "");
                      };
                      reader.readAsText(file);
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-500 file:cursor-pointer"
                />
                {importData && (
                  <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1">
                    <Check className="w-3 h-3" /> File loaded successfully
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Confirm Master Password</label>
                <input
                  type="password"
                  value={importPassword}
                  onChange={(e) => setImportPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Enter your master password to confirm"
                />
              </div>
              
              {encryptError && (
                <p className="text-red-400 text-xs bg-red-500/10 p-2 rounded">{encryptError}</p>
              )}
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowEncryptedImportModal(false);
                    setImportData("");
                    setImportPassword("");
                    setEncryptError("");
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-xl text-sm font-medium transition-all"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEncryptedImport}
                  disabled={isProcessing || !importData.trim() || !importPassword}
                  className="flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                  style={{ 
                    background: `linear-gradient(135deg, ${colors.steelBlue500}, ${colors.steelBlue600})`,
                  }}
                >
                  {isProcessing ? "Restoring..." : "Restore"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Recovery Phrase Modal */}
      {showRegenerateModal && (
        <div className="form-modal-backdrop">
          <div 
            className="rounded-2xl p-6 w-full max-w-lg animate-fade-in"
            style={{
              backgroundColor: "rgba(30, 41, 59, 0.98)",
              border: `1px solid ${colors.steelBlue500}40`,
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div className="text-center mb-6">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ 
                  backgroundColor: `${colors.steelBlue500}15`,
                  border: `2px solid ${colors.steelBlue500}30`,
                }}
              >
                <RefreshCw className="w-8 h-8" strokeWidth={1.5} style={{ color: colors.brandGold }} />
              </div>
              <h3 style={{ color: colors.warmIvory }} className="text-xl font-bold mb-2">New Recovery Phrase</h3>
              <p className="text-slate-400 text-sm">
                Save this phrase to recover your vault if you forget your password
              </p>
            </div>

            {/* Warning */}
            <div 
              className="rounded-xl p-4 mb-6 flex gap-3"
              style={{
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
              }}
            >
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-amber-200 text-sm font-medium mb-1">Important</p>
                <p className="text-slate-400 text-xs leading-relaxed">
                  This will replace your existing recovery phrase. Write down these 12 words and store them safely. Your old phrase will no longer work.
                </p>
              </div>
            </div>

            {/* Phrase Display */}
            <div 
              className="rounded-xl p-4 mb-4"
              style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", border: `1px solid ${colors.steelBlue500}30` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-xs uppercase tracking-wider">12-Word Phrase</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPhrase(!showPhrase)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{ backgroundColor: `${colors.steelBlue500}15`, color: colors.steelBlue400 }}
                  >
                    {showPhrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPhrase ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={handleCopyPhrase}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{ backgroundColor: `${colors.steelBlue500}15`, color: phraseCopied ? "#10b981" : colors.steelBlue400 }}
                  >
                    {phraseCopied ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
                    {phraseCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              
              {showPhrase ? (
                <div className="grid grid-cols-3 gap-2">
                  {newRecoveryPhrase.split(" ").map((word, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
                    >
                      <span className="text-slate-500 text-xs w-4">{index + 1}.</span>
                      <span className="text-white text-sm font-mono">{word}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-slate-500 text-sm">Click "Show" to reveal your phrase</p>
                </div>
              )}
            </div>

            {/* Confirmation */}
            <label className="flex items-center gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={phraseConfirmed}
                onChange={(e) => setPhraseConfirmed(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700/50 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className="text-slate-300 text-sm">I have written down this phrase securely</span>
            </label>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRegenerateModal(false);
                  setNewRecoveryPhrase("");
                  setPhraseConfirmed(false);
                }}
                className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRegenerate}
                disabled={!phraseConfirmed}
                className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: phraseConfirmed ? colors.steelBlue500 : "rgba(91, 130, 184, 0.3)" }}
              >
                Save New Phrase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Hint Modal */}
      {showHintModal && (
        <div className="form-modal-backdrop">
          <div 
            className="rounded-2xl p-6 w-full max-w-md animate-fade-in"
            style={{
              backgroundColor: "rgba(30, 41, 59, 0.98)",
              border: `1px solid ${colors.steelBlue500}40`,
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 flex items-center justify-center">
                <HelpCircle className="w-6 h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
              </div>
              <div>
                <h3 style={{ color: colors.warmIvory }} className="text-lg font-bold">Password Hint</h3>
                <p className="text-slate-400 text-xs">A reminder shown on the login screen</p>
              </div>
            </div>

            {/* Current Hint Display */}
            {currentHint && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-slate-400">Current Hint</label>
                  <button
                    onClick={() => setShowCurrentHint(!showCurrentHint)}
                    className="flex items-center gap-1 text-xs"
                    style={{ color: colors.steelBlue400 }}
                  >
                    {showCurrentHint ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showCurrentHint ? "Hide" : "Show"}
                  </button>
                </div>
                <div 
                  className="px-3 py-2.5 rounded-lg text-sm"
                  style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", border: `1px solid ${colors.steelBlue500}20` }}
                >
                  {showCurrentHint ? (
                    <span className="text-slate-200">{currentHint}</span>
                  ) : (
                    <span className="text-slate-500">••••••••••</span>
                  )}
                </div>
              </div>
            )}

            {/* New/Edit Hint Input */}
            <div className="mb-6">
              <label className="text-xs text-slate-400 mb-1.5 block">
                {currentHint ? "Update Hint" : "Set Hint"}
              </label>
              <input
                type="text"
                value={newHint}
                onChange={(e) => setNewHint(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="A hint to help you remember your password"
                maxLength={100}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                ⚠️ This hint is visible without your password
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowHintModal(false);
                  setNewHint(currentHint || "");
                  setShowCurrentHint(false);
                }}
                className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm font-medium transition-all"
              >
                Cancel
              </button>
              {currentHint && (
                <button
                  onClick={handleRemoveHint}
                  className="px-4 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-all"
                >
                  Remove
                </button>
              )}
              <button
                onClick={handleSaveHint}
                className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-all"
                style={{ backgroundColor: colors.steelBlue500 }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Access Modal */}
      {showMobileAccess && (
        <MobileAccess onClose={() => setShowMobileAccess(false)} />
      )}

      <style>{`
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

// Export settings utilities
export const getVaultSettings = (): VaultSettings => {
  let soundEffectsEnabled = false;
  try {
    const vaultSettings = localStorage.getItem('vault_settings');
    if (vaultSettings) {
      const parsed = JSON.parse(vaultSettings);
      soundEffectsEnabled = parsed.soundEffectsEnabled ?? false;
    }
  } catch (error) {
    devError("Failed to parse vault settings in getVaultSettings:", error);
  }
  
  return {
    autoLockTimeout: parseInt(localStorage.getItem(SETTINGS_KEYS.AUTO_LOCK_TIMEOUT) || String(DEFAULT_SETTINGS.autoLockTimeout)),
    clipboardClearTimeout: parseInt(localStorage.getItem(SETTINGS_KEYS.CLIPBOARD_CLEAR_TIMEOUT) || String(DEFAULT_SETTINGS.clipboardClearTimeout)),
    showPasswordsDefault: localStorage.getItem(SETTINGS_KEYS.SHOW_PASSWORDS_DEFAULT) === "true",
    soundEffectsEnabled,
  };
};

// Track the last copied text to verify before clearing
let lastCopiedText: string | null = null;
let clearTimeoutId: NodeJS.Timeout | null = null;

export const clearClipboardAfterTimeout = (timeout: number, copiedText?: string) => {
  // Store the copied text for verification
  if (copiedText) {
    lastCopiedText = copiedText;
  }
  
  // Clear any existing timeout
  if (clearTimeoutId) {
    clearTimeout(clearTimeoutId);
    clearTimeoutId = null;
  }
  
  if (timeout > 0) {
    clearTimeoutId = setTimeout(async () => {
      try {
        // Try to read clipboard to verify it still has our content
        // Note: This may fail due to permissions, in which case we clear anyway
        try {
          const currentClipboard = await navigator.clipboard.readText();
          
          // Only clear if clipboard still contains our copied text
          if (currentClipboard === lastCopiedText) {
            await navigator.clipboard.writeText("");
          }
        } catch (readError) {
          // If we can't read clipboard (permission denied), clear it anyway for safety
          devWarn("Clipboard read denied, clearing anyway:", readError);
          await navigator.clipboard.writeText("");
        }
      } catch (clearError) {
        // Clipboard clear failed - non-critical
        devWarn("Clipboard clear failed:", clearError);
      } finally {
        lastCopiedText = null;
        clearTimeoutId = null;
      }
    }, timeout * 1000);
  }
};
