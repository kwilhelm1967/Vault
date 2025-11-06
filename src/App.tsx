import { useState, useEffect, useCallback, useMemo } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { LicenseScreen } from "./components/LicenseScreen";
import { MainVault } from "./components/MainVault";
import { FloatingPanel } from "./components/FloatingPanel";
import { ElectronFloatingPanel } from "./components/ElectronFloatingPanel";
import { PasswordEntry, Category } from "./types";
import { storageService } from "./utils/storage";
import { importService } from "./utils/importService";
import { licenseService, AppLicenseStatus } from "./utils/licenseService";
import { trialService } from "./utils/trialService";
import { features } from "./config/environment";
import { useElectron } from "./hooks/useElectron";
import { LicenseKeyDisplay } from "./components/LicenseKeyDisplay";
import { DownloadPage } from "./components/DownloadPage";

// Fixed categories with proper typing
const FIXED_CATEGORIES: Category[] = [
  { id: "all", name: "All", color: "#3b82f6", icon: "Grid3X3" },
  { id: "banking", name: "Banking", color: "#10b981", icon: "CircleDollarSign" },
  { id: "shopping", name: "Shopping", color: "#f59e0b", icon: "ShoppingCart" },
  { id: "entertainment", name: "Entertainment", color: "#ef4444", icon: "Ticket" },
  { id: "email", name: "Email", color: "#f43f5e", icon: "Mail" },
  { id: "work", name: "Work", color: "#f43f5e", icon: "Briefcase" },
  { id: "business", name: "Business", color: "#8b5cf6", icon: "TrendingUp" },
  { id: "other", name: "Other", color: "#6b7280", icon: "FileText" },
] as const;

// Custom hook for app status management
const useAppStatus = () => {
  const [appStatus, setAppStatus] = useState<AppLicenseStatus | null>(null);
  const [checkingEnabled, setCheckingEnabled] = useState(true);

  const updateAppStatus = useCallback(async () => {
    const newStatus = await licenseService.getAppStatus();
    setAppStatus(newStatus);
    return newStatus;
  }, []);

  // Initialize app status on mount
  useEffect(() => {
    updateAppStatus();
  }, [updateAppStatus]);

  // Handle trial expiration with immediate redirect
  const handleTrialExpiration = useCallback(() => {
    // Force multiple immediate updates to ensure redirect happens
    setTimeout(() => updateAppStatus(), 0);
    setTimeout(() => updateAppStatus(), 10);
    setTimeout(() => updateAppStatus(), 50);

    // Clear any vault data to prevent access
    if (storageService.isVaultUnlocked()) {
      storageService.lockVault();
    }

    // Disable further checking after a few confirmations
    setTimeout(() => {
      setCheckingEnabled(false);
    }, 10000); // Stop checking after 10 seconds
  }, [updateAppStatus]);

  // Immediate status check function
  const checkStatusImmediately = useCallback(async () => {
    const currentStatus = await licenseService.getAppStatus();

    // If trial has expired and we're not on license screen, force redirect
    if (currentStatus.trialInfo.isExpired && currentStatus.canUseApp) {
      // Force the license service to re-evaluate status
      setAppStatus({
        ...currentStatus,
        canUseApp: false,
        requiresPurchase: true
      });
    } else {
      setAppStatus(currentStatus);
    }
  }, []);

  useEffect(() => {
    // Set up trial expiration callback
    trialService.addExpirationCallback(handleTrialExpiration);

    // Check trial status every 5 seconds in development mode, every 30 seconds in production
    // But only if checking is enabled
    const checkInterval = import.meta.env.DEV ? 5000 : 30000;
    const interval = checkingEnabled ? setInterval(async () => {
      const expirationDetected = await trialService.checkAndHandleExpiration();
      await checkStatusImmediately();

      // Force immediate lock if trial expired
      const currentStatus = await licenseService.getAppStatus();
      if (currentStatus.trialInfo.isExpired && currentStatus.canUseApp) {
        // Force multiple status updates to ensure lock
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            window.location.reload();
          }, i * 1000);
        }
      }

      // If expiration detected 3+ times, stop checking
      if (expirationDetected && trialService.isExpirationConfirmed()) {
        setCheckingEnabled(false);
      }
    }, checkInterval) : null;

    // Initial check
    checkStatusImmediately();

    return () => {
      trialService.removeExpirationCallback(handleTrialExpiration);
      if (interval) clearInterval(interval);
    };
  }, [updateAppStatus, handleTrialExpiration, checkStatusImmediately, checkingEnabled]);

  return { appStatus, updateAppStatus, checkStatusImmediately };
};

// Custom hook for dark theme enforcement
const useDarkTheme = () => {
  useEffect(() => {
    const applyDarkTheme = () => {
      document.documentElement.style.backgroundColor = "#0f172a";
      document.body.style.backgroundColor = "#0f172a";
      document.documentElement.style.color = "white";
      document.body.style.color = "white";

      const elements = document.querySelectorAll("*");
      elements.forEach((el) => {
        const computed = window.getComputedStyle(el);
        if (
          computed.backgroundColor === "rgb(255, 255, 255)" ||
          computed.backgroundColor === "white"
        ) {
          (el as HTMLElement).style.backgroundColor = "#0f172a";
        }
      });
    };

    applyDarkTheme();
    const timeout = setTimeout(applyDarkTheme, 500);
    return () => clearTimeout(timeout);
  }, []);
};

// Custom hook for vault data management
const useVaultData = (isLocked: boolean, isElectron: boolean, loadSharedEntries?: () => Promise<any[]>, saveSharedEntries?: (entries: PasswordEntry[]) => Promise<boolean>) => {
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadEntries = useCallback(async () => {
    if (isLocked || !storageService.isVaultUnlocked()) {
      setEntries([]);
      setIsInitialized(true);
      return;
    }

    try {
      let loadedEntries: PasswordEntry[] = [];

      // In Electron, try to load from shared storage first
      if (isElectron && loadSharedEntries) {
        try {
          const sharedEntries = await loadSharedEntries();
          if (sharedEntries && sharedEntries.length > 0) {
            console.log("Loading entries from shared storage:", sharedEntries.length);
            loadedEntries = sharedEntries.map((entry: any) => ({
              ...entry,
              createdAt: new Date(entry.createdAt),
              updatedAt: new Date(entry.updatedAt),
            }));
            // Also save to localStorage as backup
            await storageService.saveEntries(loadedEntries);
          }
        } catch (error) {
          console.log("Failed to load from shared storage, using localStorage");
        }
      }

      // If no shared entries or failed to load, use localStorage
      if (loadedEntries.length === 0) {
        loadedEntries = await storageService.loadEntries();
        console.log("Loading entries from localStorage:", loadedEntries.length);

        // Save to shared storage if we're in Electron and we have entries
        if (isElectron && saveSharedEntries && loadedEntries && loadedEntries.length > 0) {
          try {
            await saveSharedEntries(loadedEntries);
            console.log("Saved entries to shared storage:", loadedEntries.length);
          } catch (error) {
            console.log("Failed to save to shared storage");
          }
        }
      }

      setEntries(loadedEntries || []);
      setIsInitialized(true);

      // Ensure fixed categories are saved
      await storageService.saveCategories(FIXED_CATEGORIES);
    } catch (error) {
      console.error("Failed to load entries:", error);
      setEntries([]);
      setIsInitialized(true);
      if (error instanceof Error && error.message?.includes("locked")) {
        throw error;
      }
    }
  }, [isLocked, isElectron, loadSharedEntries, saveSharedEntries]);

  // Initial load only
  useEffect(() => {
    if (!isInitialized) {
      loadEntries();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]); // Remove loadEntries dependency to prevent infinite loop

  // Handle cross-window synchronization (only after initial load)
  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onEntriesChanged || !isInitialized) return;

    const handleEntriesChanged = async () => {
      try {
        if (isLocked || !storageService.isVaultUnlocked()) {
          setEntries([]);
          return;
        }

        console.log("Entries changed event received, reloading from shared storage");
        // Reload from shared storage
        if (loadSharedEntries) {
          const sharedEntries = await loadSharedEntries();
          if (sharedEntries) {
            const mappedEntries = sharedEntries.map((entry: any) => ({
              ...entry,
              createdAt: new Date(entry.createdAt),
              updatedAt: new Date(entry.updatedAt),
            }));
            setEntries(mappedEntries);
            // Also update localStorage
            await storageService.saveEntries(mappedEntries);
          }
        } else {
          const loadedEntries = await storageService.loadEntries();
          setEntries(loadedEntries || []);
        }
      } catch (error) {
        console.error("Failed to reload entries:", error);
        setEntries([]);
      }
    };

    window.electronAPI.onEntriesChanged(handleEntriesChanged);
    return () => {
      window.electronAPI?.removeEntriesChangedListener?.(handleEntriesChanged);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isElectron, isLocked, isInitialized]); // Remove loadSharedEntries dependency

  // Reset initialization when vault locks/unlocks
  useEffect(() => {
    if (isLocked) {
      setIsInitialized(false);
    } else {
      // When vault is unlocked, trigger data loading if not initialized
      if (!isInitialized && storageService.isVaultUnlocked()) {
        loadEntries();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, isInitialized]); // Remove loadEntries dependency

  return { entries, setEntries, loadEntries };
};


// Custom hook for floating mode
const useFloatingMode = (isElectron: boolean) => {
  const isFloatingMode = useMemo(() => window.location.hash === "#floating", []);

  useEffect(() => {
    if (isElectron && isFloatingMode && window.electronAPI?.setAlwaysOnTop) {
      window.electronAPI.setAlwaysOnTop(true);
    }
  }, [isElectron, isFloatingMode]);

  return isFloatingMode;
};

// Custom hook for vault status synchronization
const useVaultStatusSync = (isElectron: boolean, setIsLocked: (locked: boolean) => void) => {
  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onVaultStatusChange) return;

    const handleVaultStatusChange = (_event: any, unlocked: boolean) => {
      setIsLocked(!unlocked);
    };

    window.electronAPI.onVaultStatusChange(handleVaultStatusChange);
    return () => {
      window.electronAPI?.removeVaultStatusListener?.();
    };
  }, [isElectron, setIsLocked]);
};

// Entry management utilities
const useEntryManagement = (
  entries: PasswordEntry[],
  setEntries: (entries: PasswordEntry[]) => void,
  isElectron: boolean,
  saveSharedEntries?: (entries: PasswordEntry[]) => Promise<boolean>,
  broadcastEntriesChanged?: () => Promise<boolean>
) => {
  const broadcastChange = useCallback(async () => {
    if (isElectron && broadcastEntriesChanged) {
      await broadcastEntriesChanged();
    }
  }, [isElectron, broadcastEntriesChanged]);

  const handleAddEntry = useCallback(async (
    entryData: Omit<PasswordEntry, "id" | "createdAt" | "updatedAt">
  ) => {
    if (!entryData.accountName || !entryData.username || !entryData.password || !entryData.category) {
      console.error("Invalid entry data:", entryData);
      return;
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
        console.log("Floating panel: Saving only to shared storage");
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
      console.error("Failed to add entry:", error);
      setEntries(entries); // Rollback on error
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
        console.log("Floating panel: Updating only in shared storage");
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
      console.error("Failed to update entry:", error);
      setEntries(entries); // Rollback on error
    }
  }, [entries, setEntries, broadcastChange, isElectron, saveSharedEntries]);

  const handleDeleteEntry = useCallback(async (id: string) => {
    const updatedEntries = entries.filter((entry) => entry.id !== id);
    setEntries(updatedEntries);

    try {
      // Check if we're in floating mode and vault is locked in this window
      const isFloatingMode = window.location.hash === "#floating";
      const isVaultLockedLocally = !storageService.isVaultUnlocked();

      if (isElectron && isFloatingMode && isVaultLockedLocally) {
        // In floating panel with locked local storage, only save to shared storage
        console.log("Floating panel: Deleting only from shared storage");
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
      console.error("Failed to delete entry:", error);
      setEntries(entries); // Rollback on error
    }
  }, [entries, setEntries, broadcastChange, isElectron, saveSharedEntries]);

  return { handleAddEntry, handleUpdateEntry, handleDeleteEntry };
};

function App() {
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

  useDarkTheme();
  const { entries, setEntries } = useVaultData(isLocked, isElectron, loadSharedEntries, saveSharedEntries);
  const isFloatingMode = useFloatingMode(isElectron);
  useVaultStatusSync(isElectron, setIsLocked);

  const { handleAddEntry, handleUpdateEntry, handleDeleteEntry } = useEntryManagement(
    entries,
    setEntries,
    isElectron,
    saveSharedEntries,
    broadcastEntriesChanged
  );

  const handleLock = useCallback(async () => {
    storageService.lockVault();

    if (isElectron && window.electronAPI?.vaultLocked) {
      await window.electronAPI.vaultLocked();
    }

    setIsLocked(true);
    setShowMainVault(true);
    setShowFloatingPanel(false);
  }, [isElectron]);

  const handleLogin = useCallback(async (password: string) => {
    try {
      if (!storageService.vaultExists()) {
        await storageService.initializeVault(password);
        setIsLocked(false);
        if (isElectron && window.electronAPI?.vaultUnlocked) {
          await window.electronAPI.vaultUnlocked();
        }
        return;
      }

      const isValid = await storageService.unlockVault(password);
      if (isValid) {
        setIsLocked(false);
        if (isElectron && window.electronAPI?.vaultUnlocked) {
          await window.electronAPI.vaultUnlocked();
        }
      } else {
        throw new Error("Invalid password");
      }
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }, [isElectron]);

  const handleExport = useCallback(async () => {
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
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data");
    }
  }, []);

  const handleImport = useCallback(async () => {
    try {
      if (isLocked || !storageService.isVaultUnlocked()) {
        alert("Unlock the vault first.");
        return;
      }

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,.json,text/csv,application/json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;

        const text = await file.text();
        const result = importService.importContent(text);

        if (!result.entries.length) {
          alert('No valid entries found in file.');
          return;
        }

        const existingKey = new Set(entries.map(e => `${e.accountName}||${e.username}||${e.password}`));
        const newEntries = result.entries.filter(e => !existingKey.has(`${e.accountName}||${e.username}||${e.password}`));
        const merged = [...entries, ...newEntries];

        await storageService.saveEntries(merged);
        setEntries(merged);

        if (result.warnings.length) {
          console.warn('Import warnings:', result.warnings);
        }

        alert(`Imported ${newEntries.length} new entr${newEntries.length === 1 ? 'y' : 'ies'} (${result.format.toUpperCase()}).`);
      };
      input.click();
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import data');
    }
  }, [isLocked, entries, setEntries]);

  const toggleVaultView = useCallback(() => {
    if (isElectron) {
      if (window.electronAPI) {
        if (showMainVault) {
          window.electronAPI.showFloatingPanel();
          window.electronAPI.hideMainWindow?.() ?? window.electronAPI.minimizeMainWindow?.();
        } else {
          window.electronAPI.restoreMainWindow();
          window.electronAPI.hideFloatingPanel();
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
    onImport: handleImport,
    onEntriesReload: handleEntriesReload,
  }), [entries, handleAddEntry, handleUpdateEntry, handleDeleteEntry, searchTerm, selectedCategory, handleLock, handleExport, handleImport, handleEntriesReload]);

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
      console.log("🚨 SAFETY CHECK: Forcing redirect due to expired trial without valid license");
      checkStatusImmediately();
    }
  }, [appStatus?.trialInfo.isExpired, appStatus?.canUseApp, appStatus?.isLicensed, checkStatusImmediately]);

  // Show loading state while app status is being determined
  if (!appStatus) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading application...</p>
        </div>
      </div>
    );
  }

  // Electron floating mode
  if (isElectron && isFloatingMode) {
    if (!isVaultUnlocked) return null;

    return (
      <div className="bg-slate-900">
        <ElectronFloatingPanel
          key={`floating-panel-${entries.length}`}
          {...floatingPanelProps}
          onMaximize={() => {
            window.electronAPI?.restoreMainWindow()?.then(() => {
              window.electronAPI?.hideFloatingPanel();
            });
          }}
        />
      </div>
    );
  }

  // License screen - Check both canUseApp and trial expiration
  if (!appStatus.canUseApp || appStatus.trialInfo.isExpired) {
    return (
      <LicenseScreen
        onLicenseValid={updateAppStatus}
        showPricingPlans={showPricingPlans}
        onHidePricingPlans={() => setShowPricingPlans(false)}
        appStatus={appStatus}
      />
    );
  }

  // Download page
  if (showDownloadPage) {
    return (
      <div className="relative">
        <DownloadPage />
        <button
          onClick={toggleDownloadPage}
          className="fixed top-4 left-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all flex items-center space-x-2"
        >
          <span>Back to Vault</span>
        </button>
      </div>
    );
  }

  // SAFETY CHECK: Don't allow login screen if trial is expired
  if (isLocked) {
    // Double-check trial status before showing login screen
    if (appStatus.trialInfo.isExpired) {
      return (
        <LicenseScreen
          onLicenseValid={updateAppStatus}
          showPricingPlans={showPricingPlans}
          onHidePricingPlans={() => setShowPricingPlans(false)}
          appStatus={appStatus}
        />
      );
    }
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Main app
  return (
    <div className="relative">
      {/* License Keys Display */}
      {showLicenseKeys && features.showTestingTools && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full">
            <LicenseKeyDisplay />
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

      {/* Main Vault */}
      {showMainVault && (
        <MainVault
          key={`main-vault-${entries.length}`}
          {...mainVaultProps}
        />
      )}

      {/* Floating Panel (Web) */}
      {!isElectron && showFloatingPanel && (
        <FloatingPanel
          {...floatingPanelProps}
          onMaximize={toggleVaultView}
        />
      )}

      {/* Environment indicators */}
      {features.showTestingTools && (
        <div className="fixed bottom-4 right-4 z-40 bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-medium">
          Test Environment
        </div>
      )}
    </div>
  );
}

export default App;
