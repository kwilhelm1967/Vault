// ==================== React Imports ====================
import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";

// ==================== Type Imports ====================
import type { PasswordEntry, Category, RawPasswordEntry } from "./types";
import type { AppLicenseStatus } from "./utils/licenseService";
import type { WarningPopupState } from "./utils/trialService";

// ==================== Config Imports ====================
import { features } from "./config/environment";

// ==================== Utils Imports ====================
import { storageService, FIXED_CATEGORIES } from "./utils/storage";
import { importService } from "./utils/importService";
import { devError, devWarn } from "./utils/devLog";
import { licenseService } from "./utils/licenseService";
import { trialService } from "./utils/trialService";

// ==================== Hooks Imports ====================
import {
  useElectron,
  useAppStatus,
  useVaultData,
  useDarkTheme,
  useFloatingMode,
  useVaultStatusSync,
} from "./hooks";

// ==================== Component Hooks (Direct Imports) ====================
import { useNotification, Notification } from "./components/Notification";
import { useWhatsNew } from "./components/WhatsNewModal";
import { useOnboarding } from "./components/OnboardingTutorial";
import { useKeyboardShortcuts } from "./components/KeyboardShortcutsModal";
import { useSecurityBriefing } from "./components/SecurityBriefing";
import { SkipLink } from "./components/accessibility";

// ==================== Lazy-Loaded Core Components ====================
const LoginScreen = lazy(() => import("./components/LoginScreen").then(m => ({ default: m.LoginScreen })));
const LicenseScreen = lazy(() => import("./components/LicenseScreen").then(m => ({ default: m.LicenseScreen })));
const MainVault = lazy(() => import("./components/MainVault").then(m => ({ default: m.MainVault })));
const OfflineIndicator = lazy(() => import("./components/OfflineIndicator").then(m => ({ default: m.OfflineIndicator })));

// ==================== Lazy-Loaded License Components ====================
const LicenseTransferDialog = lazy(() => import("./components/LicenseTransferDialog").then(m => ({ default: m.LicenseTransferDialog })));
const LicenseKeyDisplay = lazy(() => import("./components/LicenseKeyDisplay").then(m => ({ default: m.LicenseKeyDisplay })));

// ==================== Lazy-Loaded Floating Panel Components ====================
const FloatingPanel = lazy(() => import("./components/FloatingPanel").then(m => ({ default: m.FloatingPanel })));
const ElectronFloatingPanel = lazy(() => import("./components/ElectronFloatingPanel").then(m => ({ default: m.ElectronFloatingPanel })));

// ==================== Lazy-Loaded Trial Components ====================
const TrialWarningPopup = lazy(() => import("./components/TrialWarningPopup").then(m => ({ default: m.TrialWarningPopup })));

// ==================== Lazy-Loaded Page Components ====================
const DownloadPage = lazy(() => import("./components/DownloadPage").then(m => ({ default: m.DownloadPage })));
const PurchaseSuccessPage = lazy(() => import("./components/PurchaseSuccessPage").then(m => ({ default: m.PurchaseSuccessPage })));

// ==================== Lazy-Loaded UI Components ====================
const UndoToast = lazy(() => import("./components/UndoToast").then(m => ({ default: m.UndoToast })));

// ==================== Lazy-Loaded Modal Components ====================
const WhatsNewModal = lazy(() => import("./components/WhatsNewModal").then(m => ({ default: m.WhatsNewModal })));
const OnboardingTutorial = lazy(() => import("./components/OnboardingTutorial").then(m => ({ default: m.OnboardingTutorial })));
const KeyboardShortcutsModal = lazy(() => import("./components/KeyboardShortcutsModal").then(m => ({ default: m.KeyboardShortcutsModal })));
const SecurityBriefing = lazy(() => import("./components/SecurityBriefing").then(m => ({ default: m.SecurityBriefing })));

// Simple loading fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);

/**
 * Reset all license and trial data when ?reset is in the URL
 * Usage: http://localhost:5173/?reset
 */
const checkForReset = () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('reset')) {
    // Clear ALL localStorage - complete fresh start
    localStorage.clear();
    
    // Also clear sessionStorage for good measure
    sessionStorage.clear();
    
    // Remove the ?reset from URL and reload
    window.history.replaceState({}, document.title, window.location.pathname);
    window.location.reload();
  }
};

// Run reset check immediately on load
checkForReset();

/**
 * Entry management hook (local implementation for App.tsx)
 * 
 * Handles CRUD operations for password entries with Electron cross-window sync.
 * This is a local implementation with a different signature than the hook in hooks/.
 */
const useEntryManagement = (
  entries: PasswordEntry[],
  setEntries: (entries: PasswordEntry[]) => void,
  isElectron: boolean,
  saveSharedEntries?: (entries: PasswordEntry[]) => Promise<boolean>,
  broadcastEntriesChanged?: () => Promise<boolean>,
  onEntryDeleted?: (entry: PasswordEntry) => void
) => {
  const broadcastChange = useCallback(async () => {
    if (isElectron && broadcastEntriesChanged) {
      await broadcastEntriesChanged();
    }
  }, [isElectron, broadcastEntriesChanged]);

  const handleAddEntry = useCallback(async (
    entryData: Omit<PasswordEntry, "id" | "createdAt" | "updatedAt">
  ) => {
    // Validate required fields based on entry type
    const isSecureNote = entryData.entryType === "secure_note";
    
    if (!entryData.accountName || !entryData.accountName.trim()) {
      const error = new Error("Account name is required");
      devError("Invalid entry data: missing accountName", entryData);
      throw error;
    }
    
    // For password entries, require username and password (must have content, not just whitespace)
    if (!isSecureNote) {
      if (!entryData.username || !entryData.username.trim()) {
        const error = new Error("Username is required");
        devError("Invalid entry data: password entries require username", entryData);
        throw error;
      }
      if (!entryData.password || !entryData.password.trim()) {
        const error = new Error("Password is required");
        devError("Invalid entry data: password entries require password", entryData);
        throw error;
      }
    }

    const newEntry: PasswordEntry = {
      ...entryData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedEntries = [...entries, newEntry];
    setEntries(updatedEntries);

    try {
      // Check if we're in floating mode and vault is locked in this window
      const isFloatingMode = window.location.hash === "#floating";
      const isVaultLockedLocally = !storageService.isVaultUnlocked();

      if (isElectron && isFloatingMode && isVaultLockedLocally) {
        // In floating panel with locked local storage, only save to shared storage
        if (saveSharedEntries) {
          await saveSharedEntries(updatedEntries);
        }
      } else {
        // Normal save to localStorage and shared storage
        await storageService.saveEntries(updatedEntries);

        // Also save to shared storage in Electron
        if (isElectron && saveSharedEntries) {
          await saveSharedEntries(updatedEntries);
        }
      }

      await broadcastChange();
    } catch (error) {
      devError("Failed to add entry:", error);
      setEntries(entries); // Rollback on error
      // Re-throw so the form knows the save failed
      throw error;
    }
  }, [entries, setEntries, broadcastChange, isElectron, saveSharedEntries]);

  const handleUpdateEntry = useCallback(async (updatedEntry: PasswordEntry) => {
    const updatedEntries = entries.map((entry) =>
      entry.id === updatedEntry.id
        ? { ...updatedEntry, updatedAt: new Date() }
        : entry
    );

    setEntries(updatedEntries);

    try {
      // Check if we're in floating mode and vault is locked in this window
      const isFloatingMode = window.location.hash === "#floating";
      const isVaultLockedLocally = !storageService.isVaultUnlocked();

      if (isElectron && isFloatingMode && isVaultLockedLocally) {
        // In floating panel with locked local storage, only save to shared storage
        if (saveSharedEntries) {
          await saveSharedEntries(updatedEntries);
        }
      } else {
        // Normal save to localStorage and shared storage
        await storageService.saveEntries(updatedEntries);

        // Also save to shared storage in Electron
        if (isElectron && saveSharedEntries) {
          await saveSharedEntries(updatedEntries);
        }
      }

      await broadcastChange();
    } catch (error) {
      devError("Failed to update entry:", error);
      setEntries(entries); // Rollback on error
      throw error;
    }
  }, [entries, setEntries, broadcastChange, isElectron, saveSharedEntries]);

  const handleDeleteEntry = useCallback(async (id: string) => {
    const deletedEntry = entries.find((entry) => entry.id === id);
    const updatedEntries = entries.filter((entry) => entry.id !== id);
    setEntries(updatedEntries);

    try {
      // Check if we're in floating mode and vault is locked in this window
      const isFloatingMode = window.location.hash === "#floating";
      const isVaultLockedLocally = !storageService.isVaultUnlocked();

      if (isElectron && isFloatingMode && isVaultLockedLocally) {
        // In floating panel with locked local storage, only save to shared storage
        if (saveSharedEntries) {
          await saveSharedEntries(updatedEntries);
        }
      } else {
        // Normal save to localStorage and shared storage
        await storageService.saveEntries(updatedEntries);

        // Also save to shared storage in Electron
        if (isElectron && saveSharedEntries) {
          await saveSharedEntries(updatedEntries);
        }
      }

      await broadcastChange();
      
      // Notify that entry was deleted (for undo functionality)
      if (deletedEntry && onEntryDeleted) {
        onEntryDeleted(deletedEntry);
      }
    } catch (error) {
      devError("Failed to delete entry:", error);
      setEntries(entries); // Rollback on error
    }
  }, [entries, setEntries, broadcastChange, isElectron, saveSharedEntries, onEntryDeleted]);

  // Restore a deleted entry (for undo)
  const handleRestoreEntry = useCallback(async (entry: PasswordEntry) => {
    const updatedEntries = [...entries, entry];
    setEntries(updatedEntries);

    try {
      const isFloatingMode = window.location.hash === "#floating";
      const isVaultLockedLocally = !storageService.isVaultUnlocked();

      if (isElectron && isFloatingMode && isVaultLockedLocally) {
        if (saveSharedEntries) {
          await saveSharedEntries(updatedEntries);
        }
      } else {
        await storageService.saveEntries(updatedEntries);
        if (isElectron && saveSharedEntries) {
          await saveSharedEntries(updatedEntries);
        }
      }

      await broadcastChange();
    } catch (error) {
      devError("Failed to restore entry:", error);
      setEntries(entries);
    }
  }, [entries, setEntries, broadcastChange, isElectron, saveSharedEntries]);

  return { handleAddEntry, handleUpdateEntry, handleDeleteEntry, handleRestoreEntry };
};

function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname;
  const hasSessionId = urlParams.get('session_id');
  const hasKey = urlParams.get('key') || urlParams.get('license');
  const isPurchaseSuccessPath = pathname === '/purchase/success' || pathname.includes('purchase/success');
  
  const isStaticHtmlFile = pathname.endsWith('.html') && 
                          (pathname.includes('trial-success') || 
                           pathname.includes('success.html') ||
                           pathname.includes('purchase-success.html'));
  
  if ((hasSessionId || isPurchaseSuccessPath) || (hasKey && !isStaticHtmlFile)) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PurchaseSuccessPage />
      </Suspense>
    );
  }

  const { isElectron, isVaultUnlocked, saveSharedEntries, loadSharedEntries, broadcastEntriesChanged } = useElectron();
  const { appStatus, updateAppStatus, checkStatusImmediately } = useAppStatus();

  const [isLocked, setIsLocked] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showMainVault, setShowMainVault] = useState(true);
  const [showFloatingPanel, setShowFloatingPanel] = useState(false);
  const [showPricingPlans, setShowPricingPlans] = useState(false);
  const [showDownloadPage, setShowDownloadPage] = useState(false);
  const [showLicenseKeys, setShowLicenseKeys] = useState(features.showTestingTools);

  // Device mismatch check on startup
  const [showStartupTransferDialog, setShowStartupTransferDialog] = useState(false);
  const [startupTransferKey, setStartupTransferKey] = useState<string>("");

  // Trial warning popup state (state stored for potential future use)
  const [, setWarningPopupState] = useState<WarningPopupState>({
    shouldShowExpiringWarning: false,
    shouldShowFinalWarning: false,
    timeRemaining: '',
  });
  const [showWarningPopup, setShowWarningPopup] = useState(false);
  const [currentWarningType, setCurrentWarningType] = useState<'expiring' | 'final'>('expiring');

  // Loading states for async operations
  const [_isImporting, setIsImporting] = useState(false);
  const [_isExporting, setIsExporting] = useState(false);

  useDarkTheme();
  const { entries, setEntries } = useVaultData(isLocked, isElectron, loadSharedEntries, saveSharedEntries);
  const isFloatingMode = useFloatingMode(isElectron);
  useVaultStatusSync(isElectron, setIsLocked);

  // What's New modal state (moved here to comply with React hook rules)
  const { shouldShow: showWhatsNew, dismiss: dismissWhatsNew } = useWhatsNew();
  const [whatsNewOpen, setWhatsNewOpen] = useState(showWhatsNew);

  // Onboarding tutorial state - only show after vault is unlocked
  const { showOnboarding, setShowOnboarding, completeOnboarding } = useOnboarding(!isLocked);

  // Keyboard shortcuts modal state
  const { isShortcutsOpen, openShortcuts, closeShortcuts } = useKeyboardShortcuts();

  // Security briefing state (first-run security essentials)
  const { showBriefing, checkBriefing, completeBriefing } = useSecurityBriefing();

  // Notification system (replaces browser alert())
  const { notification, dismissNotification, notify } = useNotification();

  // Listen for "What's New" open event from Settings
  useEffect(() => {
    const handleOpenWhatsNew = () => setWhatsNewOpen(true);
    window.addEventListener('open-whats-new', handleOpenWhatsNew);
    return () => window.removeEventListener('open-whats-new', handleOpenWhatsNew);
  }, []);

  // Listen for "Replay Onboarding" event from Settings
  useEffect(() => {
    const handleReplayOnboarding = () => setShowOnboarding(true);
    window.addEventListener('replay-onboarding', handleReplayOnboarding);
    return () => window.removeEventListener('replay-onboarding', handleReplayOnboarding);
  }, [setShowOnboarding]);

  // Listen for "Show Keyboard Shortcuts" event from Settings
  useEffect(() => {
    const handleShowShortcuts = () => openShortcuts();
    window.addEventListener('show-keyboard-shortcuts', handleShowShortcuts);
    return () => window.removeEventListener('show-keyboard-shortcuts', handleShowShortcuts);
  }, [openShortcuts]);

  // Check for device mismatch on app startup - defer to avoid blocking render
  useEffect(() => {
    const checkDeviceMismatch = async () => {
      try {
        const mismatch = await licenseService.checkDeviceMismatch();
        if (mismatch.hasMismatch && mismatch.licenseKey) {
          setStartupTransferKey(mismatch.licenseKey);
          setShowStartupTransferDialog(true);
        }
      } catch (error) {
        devError('Device mismatch check failed:', error);
      }
    };

    // Defer check to allow initial render
    const timeoutId = setTimeout(() => {
      checkDeviceMismatch();
    }, 200);

    return () => clearTimeout(timeoutId);
  }, []);

  // Check for security briefing when vault is unlocked
  useEffect(() => {
    if (!isLocked) {
      // Small delay to let the main UI settle
      const timer = setTimeout(() => {
        checkBriefing();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLocked, checkBriefing]);

  // Warning popup callback
  const handleWarningPopup = useCallback((state: WarningPopupState) => {
    setWarningPopupState(state);

    if (state.shouldShowExpiringWarning) {
      setCurrentWarningType('expiring');
      setShowWarningPopup(true);
    } else if (state.shouldShowFinalWarning) {
      setCurrentWarningType('final');
      setShowWarningPopup(true);
    }
  }, []);

  // Setup warning popup monitoring
  useEffect(() => {
    // Add warning popup callback
    trialService.addWarningPopupCallback(handleWarningPopup);

    // Check warning popups every 10 seconds
    const checkInterval = 10000;

    const warningInterval = setInterval(async () => {
      await trialService.checkWarningPopups();
    }, checkInterval);

    // Defer initial check to avoid blocking render
    const initialCheckTimeout = setTimeout(() => {
      trialService.checkWarningPopups();
    }, 300);

    return () => {
      clearTimeout(initialCheckTimeout);
      trialService.removeWarningPopupCallback(handleWarningPopup);
      if (warningInterval) clearInterval(warningInterval);
    };
  }, [handleWarningPopup]);

  // Popup event handlers
  const handleWarningPopupClose = useCallback(() => {
    setShowWarningPopup(false);
  }, []);

  const handlePurchaseNow = useCallback(() => {
    setShowWarningPopup(false);
    // Instant redirect to pricing plans URL
    window.open('https://localpasswordvault.com/#plans', '_blank');
  }, []);

  // Undo delete state
  const [deletedEntry, setDeletedEntry] = useState<PasswordEntry | null>(null);
  
  const handleEntryDeleted = useCallback((entry: PasswordEntry) => {
    setDeletedEntry(entry);
  }, []);
  
  const { handleAddEntry, handleUpdateEntry, handleDeleteEntry, handleRestoreEntry } = useEntryManagement(
    entries,
    setEntries,
    isElectron,
    saveSharedEntries,
    broadcastEntriesChanged,
    handleEntryDeleted
  );
  
  const handleUndoDelete = useCallback(() => {
    if (deletedEntry) {
      handleRestoreEntry(deletedEntry);
      setDeletedEntry(null);
    }
  }, [deletedEntry, handleRestoreEntry]);

  const handleLock = useCallback(async () => {
    storageService.lockVault();

    if (isElectron && window.electronAPI?.vaultLocked) {
      try {
        await window.electronAPI.vaultLocked();
      } catch (error) {
        devError('Failed to notify Electron of vault lock:', error);
      }
    }

    setIsLocked(true);
    setShowMainVault(true);
    setShowFloatingPanel(false);
  }, [isElectron]);

  // Auto-lock timeout enforcement
  useEffect(() => {
    if (isLocked) return; // Don't set timer if already locked
    
    const SETTINGS_KEY = "vault_auto_lock";
    const getAutoLockTimeout = () => {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? parseInt(stored) : 300000; // Default 5 minutes
    };
    
    let timeoutId: NodeJS.Timeout | null = null;
    let lastActivity = Date.now();
    
    const resetTimer = () => {
      lastActivity = Date.now();
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      const timeout = getAutoLockTimeout();
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          handleLock();
        }, timeout);
      }
    };
    
    // Activity events to track
    const activityEvents = [
      'mousedown', 'mousemove', 'keydown', 'scroll', 
      'touchstart', 'click', 'wheel'
    ];
    
    // Throttle activity tracking to avoid performance issues
    let throttleTimer: NodeJS.Timeout | null = null;
    const handleActivity = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        resetTimer();
      }, 1000); // Throttle to once per second
    };
    
    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    
    // Also check on visibility change (tab switch back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeout = getAutoLockTimeout();
        const elapsed = Date.now() - lastActivity;
        
        // If been away longer than timeout, lock immediately
        if (timeout > 0 && elapsed > timeout) {
          handleLock();
        } else {
          resetTimer();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Start the timer
    resetTimer();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (throttleTimer) clearTimeout(throttleTimer);
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLocked, handleLock]);

  const handleLogin = useCallback(async (password: string) => {
    try {
      if (!storageService.vaultExists()) {
        await storageService.initializeVault(password);
        setIsLocked(false);
        if (isElectron && window.electronAPI?.vaultUnlocked) {
          try {
            await window.electronAPI.vaultUnlocked();
          } catch (error) {
            devError('Failed to notify Electron of vault unlock:', error);
            // Don't throw - initialization was successful, just notification failed
          }
        }
        return;
      }

      const isValid = await storageService.unlockVault(password);
      if (isValid) {
        setIsLocked(false);
        if (isElectron && window.electronAPI?.vaultUnlocked) {
          try {
            await window.electronAPI.vaultUnlocked();
          } catch (error) {
            devError('Failed to notify Electron of vault unlock:', error);
            // Don't throw - unlock was successful, just notification failed
          }
        }
      } else {
        throw new Error("Invalid password");
      }
    } catch (error) {
      devError("Login failed:", error);
      throw error;
    }
  }, [isElectron]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const data = await storageService.exportData();
      const blob = new Blob([data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `password-vault-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify.success("Data exported successfully!");
    } catch (error) {
      devError("Export failed:", error);
      notify.error("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, [notify]);

  const handleDownloadContent = useCallback(() => {
    setShowWarningPopup(false);
    // Trigger the export functionality
    setTimeout(() => {
      handleExport();
    }, 100);
  }, [handleExport]);

  const handleImport = useCallback(async () => {
    // If user is viewing Settings, they must already be logged in
    if (isLocked) {
      notify.warning("Please log in first to import data.");
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json,text/csv,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setIsImporting(true);
      try {
        const text = await file.text();
        const result = importService.importContent(text);

        if (!result.entries.length) {
          notify.warning('No valid entries found in the file.');
          return;
        }

        // Deduplicate by accountName + username (not password - password changes shouldn't create duplicates)
        const existingKey = new Set(entries.map(e => `${e.accountName}||${e.username}`));
        const newEntries = result.entries.filter(e => !existingKey.has(`${e.accountName}||${e.username}`));
        const merged = [...entries, ...newEntries];

        await storageService.saveEntries(merged);
        setEntries(merged);

        // Update shared storage so ElectronFloatingPanel can access the imported entries
        if (isElectron && saveSharedEntries) {
          try {
            await saveSharedEntries(merged);

            // Trigger cross-window sync for floating panel
            if (window.electronAPI?.broadcastEntriesChanged) {
              await window.electronAPI.broadcastEntriesChanged();
            }
          } catch (error) {
            devError("Failed to update shared storage after import:", error);
          }
        }

        if (result.warnings.length) {
          devWarn('Import warnings:', result.warnings);
        }

        notify.success(`Imported ${newEntries.length} new entr${newEntries.length === 1 ? 'y' : 'ies'} (${result.format.toUpperCase()}).`);
      } catch (error) {
        devError('Import failed:', error);
        notify.error('Failed to import data. Please check the file format.');
      } finally {
        setIsImporting(false);
      }
    };
    input.click();
  }, [isLocked, entries, setEntries, isElectron, saveSharedEntries, notify]);

  const handleExportEncrypted = useCallback(async (password: string) => {
    try {
      const data = await storageService.exportEncrypted(password);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `password-vault-encrypted-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify.success("Encrypted backup exported successfully!");
    } catch (error) {
      devError("Encrypted export failed:", error);
      notify.error("Failed to export encrypted backup.");
      throw error;
    }
  }, [notify]);

  const handleImportEncrypted = useCallback(async (data: string, password: string) => {
    try {
      if (isLocked) {
        throw new Error("Please log in first.");
      }

      await storageService.importEncrypted(data, password);
      
      // Reload entries after import
      const newEntries = await storageService.loadEntries();
      setEntries(newEntries);

      // Update shared storage for Electron
      if (isElectron && saveSharedEntries) {
        try {
          await saveSharedEntries(newEntries);
          if (window.electronAPI?.broadcastEntriesChanged) {
            await window.electronAPI.broadcastEntriesChanged();
          }
        } catch (error) {
          devError("Failed to update shared storage after encrypted import:", error);
        }
      }

      notify.success('Successfully imported encrypted backup.');
    } catch (error) {
      devError('Encrypted import failed:', error);
      throw error;
    }
  }, [isLocked, setEntries, isElectron, saveSharedEntries, notify]);

  const toggleVaultView = useCallback(() => {
    if (isElectron) {
      if (window.electronAPI) {
        if (showMainVault) {
          try {
            window.electronAPI.showFloatingPanel();
            const hidePromise = window.electronAPI.hideMainWindow?.() ?? window.electronAPI.minimizeMainWindow?.();
            if (hidePromise) {
              hidePromise.catch((error: unknown) => {
                devError('Failed to hide/minimize main window:', error);
              });
            }
          } catch (error) {
            devError('Failed to show floating panel:', error);
          }
        } else {
          try {
            window.electronAPI.restoreMainWindow();
            window.electronAPI.hideFloatingPanel();
          } catch (error) {
            devError('Failed to restore main window:', error);
          }
        }
      }
    } else {
      setShowMainVault(!showMainVault);
      setShowFloatingPanel(!showFloatingPanel);
    }
  }, [isElectron, showMainVault]);

  const toggleDownloadPage = useCallback(() => {
    setShowDownloadPage(!showDownloadPage);
    if (showDownloadPage) {
      setShowMainVault(true);
      setShowFloatingPanel(false);
    } else {
      setShowMainVault(false);
      setShowFloatingPanel(false);
    }
  }, [showDownloadPage]);

  const handleEntriesReload = useCallback(async (reloadedEntries: PasswordEntry[]) => {
    setEntries(reloadedEntries);
  }, [setEntries]);

  const floatingPanelProps = useMemo(() => ({
    entries,
    categories: FIXED_CATEGORIES,
    onAddEntry: handleAddEntry,
    onUpdateEntry: handleUpdateEntry,
    onDeleteEntry: handleDeleteEntry,
    searchTerm,
    onSearchChange: setSearchTerm,
    selectedCategory,
    onCategoryChange: setSelectedCategory,
    onLock: handleLock,
    onExport: handleExport,
    onExportEncrypted: handleExportEncrypted,
    onImport: handleImport,
    onImportEncrypted: handleImportEncrypted,
    onEntriesReload: handleEntriesReload,
  }), [entries, handleAddEntry, handleUpdateEntry, handleDeleteEntry, searchTerm, selectedCategory, handleLock, handleExport, handleExportEncrypted, handleImport, handleImportEncrypted, handleEntriesReload]);

  const mainVaultProps = useMemo(() => ({
    ...floatingPanelProps,
    onLock: handleLock,
    onMinimize: toggleVaultView,
    onShowPricingPlans: () => {
      if (!appStatus?.canUseApp || appStatus?.requiresPurchase) {
        updateAppStatus();
      } else {
        setShowPricingPlans(true);
      }
    },
  }), [floatingPanelProps, handleLock, toggleVaultView, appStatus, updateAppStatus]);

  // SAFETY CHECK: Force redirect if trial has expired but user doesn't have a valid license
  useEffect(() => {
    if (appStatus && appStatus.trialInfo.isExpired && appStatus.canUseApp && !appStatus.isLicensed) {
      checkStatusImmediately();
    }
  }, [appStatus?.trialInfo.isExpired, appStatus?.canUseApp, appStatus?.isLicensed, checkStatusImmediately]);

  // Show loading state while app status is being determined
  // Add timeout fallback to prevent infinite loading
  // CRITICAL: If loading takes more than 10 seconds, show license screen instead of infinite spinner
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  useEffect(() => {
    if (isLoading && !appStatus) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000); // 10 second timeout
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading, appStatus]);
  
  if (!appStatus && isLoading && !loadingTimeout) {
    // Show loading for max 10 seconds, then show license screen
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading application...</p>
          <p className="text-sm text-slate-400 mt-2">If this takes too long, please check your connection</p>
        </div>
      </div>
    );
  }
  
  // If loading timed out or finished without status, show license screen
  if (!appStatus && (loadingTimeout || !isLoading)) {
    return <LicenseScreen />;
  }
  
  // If loading failed or timed out, show license screen
  if (!appStatus && !isLoading) {
    // Force show license screen if status check failed
    return (
      <Suspense fallback={<LoadingFallback />}>
        <LicenseScreen />
      </Suspense>
    );
  }

  // Electron floating mode
  if (isElectron && isFloatingMode) {
    if (!isVaultUnlocked) {
      // Show a locked state UI instead of blank screen
      return (
        <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm mb-4">Vault is locked</p>
            <button
              onClick={async () => {
                try {
                  await window.electronAPI?.restoreMainWindow();
                } catch (error) {
                  devError('Failed to restore main window:', error);
                }
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              Unlock in Main Window
            </button>
          </div>
        </div>
      );
    }

    return (
      <Suspense fallback={<LoadingFallback />}>
        <div className="bg-slate-900">
          <ElectronFloatingPanel
            key={`floating-panel-${entries.length}`}
            {...floatingPanelProps}
            onMaximize={async () => {
              try {
                await window.electronAPI?.restoreMainWindow();
                window.electronAPI?.hideFloatingPanel();
              } catch (error) {
                devError('Failed to restore main window:', error);
              }
            }}
          />
        </div>
      </Suspense>
    );
  }


  /**
   * License Gate: Redirect to license screen if:
   * - User cannot use app (no valid license/trial)
   * - Trial has expired
   */
  // Show loading state while app status is being determined
  if (!appStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1F2534' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  const requiresLicense = !appStatus.canUseApp || appStatus.trialInfo.isExpired;
  
  if (requiresLicense) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <LicenseScreen
          onLicenseValid={updateAppStatus}
          showPricingPlans={showPricingPlans}
          onHidePricingPlans={() => setShowPricingPlans(false)}
          appStatus={appStatus}
        />
      </Suspense>
    );
  }

  if (showDownloadPage) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <div className="relative">
          <DownloadPage />
          <button
            onClick={toggleDownloadPage}
            className="fixed top-4 left-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all flex items-center space-x-2"
          >
            <span>Back to Vault</span>
          </button>
        </div>
      </Suspense>
    );
  }

  if (isLocked) {
    if (appStatus?.trialInfo.isExpired) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <LicenseScreen
            onLicenseValid={updateAppStatus}
            showPricingPlans={showPricingPlans}
            onHidePricingPlans={() => setShowPricingPlans(false)}
            appStatus={appStatus}
          />
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<LoadingFallback />}>
        <LoginScreen onLogin={handleLogin} />
      </Suspense>
    );
  }

  // Main app
  return (
    <div className="relative">
      {/* Skip to main content link for keyboard users */}
      <SkipLink targetId="main-content" />

      {/* Lazy-loaded modals wrapped in Suspense */}
      <Suspense fallback={null}>
        {/* Security Briefing - first-run security essentials (shows before onboarding) */}
        <SecurityBriefing
          isOpen={showBriefing}
          onComplete={completeBriefing}
        />

        {/* What's New Modal */}
        <WhatsNewModal 
          isOpen={whatsNewOpen} 
          onClose={() => {
            setWhatsNewOpen(false);
            dismissWhatsNew();
          }} 
        />

        {/* Onboarding Tutorial */}
        <OnboardingTutorial
          isOpen={showOnboarding && !showBriefing}
          onClose={() => setShowOnboarding(false)}
          onComplete={completeOnboarding}
        />

        {/* Keyboard Shortcuts Modal */}
        <KeyboardShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={closeShortcuts}
        />
      </Suspense>

      {/* License Keys Display */}
      {showLicenseKeys && features.showTestingTools && (
        <div className="fixed inset-0 z-[9998] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full">
            <Suspense fallback={<LoadingFallback />}>
              <LicenseKeyDisplay />
            </Suspense>
            <div className="text-center mt-6">
              <button
                onClick={() => setShowLicenseKeys(false)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
              >
                Close and Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trial Warning Popup */}
      {showWarningPopup && (
        <Suspense fallback={null}>
          <TrialWarningPopup
            warningType={currentWarningType}
            onClose={handleWarningPopupClose}
            onPurchaseNow={handlePurchaseNow}
            onDownloadContent={handleDownloadContent}
          />
        </Suspense>
      )}

      {/* Main Vault */}
      {showMainVault && (
        <div id="main-content" tabIndex={-1}>
          <Suspense fallback={<LoadingFallback />}>
            <MainVault
              key={`main-vault-${entries.length}`}
              {...mainVaultProps}
            />
          </Suspense>
        </div>
      )}

      {/* Floating Panel (Web) */}
      {!isElectron && showFloatingPanel && (
        <Suspense fallback={null}>
          <FloatingPanel
            {...floatingPanelProps}
            onMaximize={toggleVaultView}
          />
        </Suspense>
      )}


      {/* Device Mismatch Dialog (Startup Check) */}
      {showStartupTransferDialog && (
        <Suspense fallback={null}>
          <LicenseTransferDialog
            isOpen={showStartupTransferDialog}
            licenseKey={startupTransferKey}
            onConfirmTransfer={async () => {
              const result = await licenseService.transferLicense(startupTransferKey);
              if (result.success) {
                setShowStartupTransferDialog(false);
                await updateAppStatus();
                notify.success("License transferred successfully!");
              }
              return result;
            }}
            onCancel={() => {
              setShowStartupTransferDialog(false);
              // User cancelled - they'll need to transfer later
            }}
          />
        </Suspense>
      )}

      {/* Offline indicator */}
      <Suspense fallback={null}>
        <OfflineIndicator />
      </Suspense>

      {/* Toast notifications */}
      <Notification notification={notification} onDismiss={dismissNotification} />

      {/* Undo delete toast */}
      {deletedEntry && (
        <Suspense fallback={null}>
          <UndoToast
            message={`"${deletedEntry.accountName}" deleted`}
            onUndo={handleUndoDelete}
            onDismiss={() => setDeletedEntry(null)}
            duration={5000}
          />
        </Suspense>
      )}

    </div>
  );
}

export default App;
