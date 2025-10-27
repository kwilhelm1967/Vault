import { useState, useEffect, useCallback, useMemo } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { LicenseScreen } from "./components/LicenseScreen";
import { MainVault } from "./components/MainVault";
import { FloatingPanel } from "./components/FloatingPanel";
import { ElectronFloatingPanel } from "./components/ElectronFloatingPanel";
import { PasswordEntry, Category } from "./types";
import { storageService } from "./utils/storage";
import { importService } from "./utils/importService";
import { licenseService } from "./utils/licenseService";
import { features } from "./config/environment";
import { useElectron } from "./hooks/useElectron";
import { LicenseKeyDisplay } from "./components/LicenseKeyDisplay";
import { DownloadPage } from "./components/DownloadPage";
import { TrialTestingTools } from "./components/TrialTestingTools";

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
  const [appStatus, setAppStatus] = useState(() => licenseService.getAppStatus());

  const updateAppStatus = useCallback(() => {
    const newStatus = licenseService.getAppStatus();
    setAppStatus(newStatus);
    return newStatus;
  }, []);

  useEffect(() => {
    const interval = setInterval(updateAppStatus, 60000);
    return () => clearInterval(interval);
  }, [updateAppStatus]);

  return { appStatus, updateAppStatus };
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
const useVaultData = (isLocked: boolean, isElectron: boolean) => {
  const [entries, setEntries] = useState<PasswordEntry[]>([]);

  const loadEntries = useCallback(async () => {
    if (isLocked || !storageService.isVaultUnlocked()) {
      setEntries([]);
      return;
    }

    try {
      const loadedEntries = await storageService.loadEntries();
      setEntries(loadedEntries || []);

      // Ensure fixed categories are saved
      await storageService.saveCategories(FIXED_CATEGORIES);
    } catch (error) {
      console.error("Failed to load entries:", error);
      setEntries([]);
      if (error instanceof Error && error.message?.includes("locked")) {
        throw error;
      }
    }
  }, [isLocked]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Handle cross-window synchronization
  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onEntriesChanged) return;

    const handleEntriesChanged = async () => {
      try {
        if (isLocked || !storageService.isVaultUnlocked()) {
          setEntries([]);
          return;
        }
        const loadedEntries = await storageService.loadEntries();
        setEntries(loadedEntries || []);
      } catch (error) {
        console.error("Failed to reload entries:", error);
        setEntries([]);
      }
    };

    window.electronAPI.onEntriesChanged(handleEntriesChanged);
    return () => {
      window.electronAPI?.removeEntriesChangedListener?.(handleEntriesChanged);
    };
  }, [isElectron, isLocked]);

  return { entries, setEntries, loadEntries };
};

// Custom hook for auto-lock functionality
const useAutoLock = (isLocked: boolean, onLock: () => Promise<void>) => {
  useEffect(() => {
    if (isLocked) return;

    let timeout: NodeJS.Timeout;
    const AUTO_LOCK_DURATION = 30 * 60 * 1000; // 30 minutes

    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(onLock, AUTO_LOCK_DURATION);
    };

    const handleActivity = () => resetTimeout();

    const events = ["mousedown", "keydown", "scroll", "click", "input"];
    events.forEach(event => document.addEventListener(event, handleActivity));
    resetTimeout();

    return () => {
      clearTimeout(timeout);
      events.forEach(event => document.removeEventListener(event, handleActivity));
    };
  }, [isLocked, onLock]);
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
  isElectron: boolean
) => {
  const broadcastChange = useCallback(() => {
    if (isElectron && window.electronAPI?.broadcastEntriesChanged) {
      window.electronAPI.broadcastEntriesChanged();
    }
  }, [isElectron]);

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
      await storageService.saveEntries(updatedEntries);
      broadcastChange();
    } catch (error) {
      console.error("Failed to add entry:", error);
      setEntries(entries); // Rollback on error
    }
  }, [entries, setEntries, broadcastChange]);

  const handleUpdateEntry = useCallback(async (updatedEntry: PasswordEntry) => {
    const updatedEntries = entries.map((entry) =>
      entry.id === updatedEntry.id
        ? { ...updatedEntry, updatedAt: new Date() }
        : entry
    );

    setEntries(updatedEntries);

    try {
      await storageService.saveEntries(updatedEntries);
      broadcastChange();
    } catch (error) {
      console.error("Failed to update entry:", error);
      setEntries(entries); // Rollback on error
    }
  }, [entries, setEntries, broadcastChange]);

  const handleDeleteEntry = useCallback(async (id: string) => {
    const updatedEntries = entries.filter((entry) => entry.id !== id);
    setEntries(updatedEntries);

    try {
      await storageService.saveEntries(updatedEntries);
      broadcastChange();
    } catch (error) {
      console.error("Failed to delete entry:", error);
      setEntries(entries); // Rollback on error
    }
  }, [entries, setEntries, broadcastChange]);

  return { handleAddEntry, handleUpdateEntry, handleDeleteEntry };
};

function App() {
  const { isElectron, isVaultUnlocked } = useElectron();
  const { appStatus, updateAppStatus } = useAppStatus();
  const [isLocked, setIsLocked] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showMainVault, setShowMainVault] = useState(true);
  const [showFloatingPanel, setShowFloatingPanel] = useState(false);
  const [showPricingPlans, setShowPricingPlans] = useState(false);
  const [showDownloadPage, setShowDownloadPage] = useState(false);
  const [showLicenseKeys, setShowLicenseKeys] = useState(features.showTestingTools);
  const [showTrialTestingTools, setShowTrialTestingTools] = useState(false);

  useDarkTheme();
  const { entries, setEntries } = useVaultData(isLocked, isElectron);
  const isFloatingMode = useFloatingMode(isElectron);
  useVaultStatusSync(isElectron, setIsLocked);

  const { handleAddEntry, handleUpdateEntry, handleDeleteEntry } = useEntryManagement(
    entries,
    setEntries,
    isElectron
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

  useAutoLock(isLocked, handleLock);

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
  }), [entries, handleAddEntry, handleUpdateEntry, handleDeleteEntry, searchTerm, selectedCategory, handleLock, handleExport, handleImport]);

  const mainVaultProps = useMemo(() => ({
    ...floatingPanelProps,
    onLock: handleLock,
    onMinimize: toggleVaultView,
    onShowPricingPlans: () => {
      if (!appStatus.canUseApp || appStatus.requiresPurchase) {
        updateAppStatus();
      } else {
        setShowPricingPlans(true);
      }
    },
  }), [floatingPanelProps, handleLock, toggleVaultView, appStatus, updateAppStatus]);

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

  // License screen
  if (!appStatus.canUseApp) {
    return (
      <LicenseScreen
        onLicenseValid={updateAppStatus}
        showPricingPlans={showPricingPlans}
        onShowPricingPlans={() => setShowPricingPlans(true)}
        onHidePricingPlans={() => setShowPricingPlans(false)}
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

  // Login screen
  if (isLocked) {
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
        <>
          <div className="fixed bottom-4 right-4 z-40 bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-medium">
            Test Environment
          </div>
          <button
            onClick={() => setShowTrialTestingTools(true)}
            className="fixed bottom-4 left-4 z-40 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-full text-xs font-medium"
          >
            Trial Tools
          </button>
        </>
      )}

      {/* Trial Testing Tools */}
      {showTrialTestingTools && features.showTestingTools && (
        <TrialTestingTools onClose={() => setShowTrialTestingTools(false)} />
      )}
    </div>
  );
}

export default App;