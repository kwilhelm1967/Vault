import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { LicenseScreen } from './components/LicenseScreen';
import { MainVault } from './components/MainVault';
import { FloatingPanel } from './components/FloatingPanel';
import { ElectronFloatingPanel } from './components/ElectronFloatingPanel';
import { PasswordEntry, Category } from './types'; 
import { storageService } from './utils/storage'; 
import { environment, features } from './config/environment';
import { useElectron } from './hooks/useElectron';
import { LicenseKeyDisplay } from './components/LicenseKeyDisplay';
import { DownloadPage } from './components/DownloadPage';

// FIXED CATEGORIES - NO DUPLICATES ALLOWED
const FIXED_CATEGORIES: Category[] = [
  { id: 'all', name: 'All', color: '#3b82f6', icon: 'Grid3X3' },
  { id: 'banking', name: 'Banking', color: '#10b981', icon: 'CreditCard' },
  { id: 'shopping', name: 'Shopping', color: '#f59e0b', icon: 'ShoppingCart' },
  { id: 'entertainment', name: 'Entertainment', color: '#ef4444', icon: 'Play' },
  { id: 'business', name: 'Business', color: '#8b5cf6', icon: 'Briefcase' },
  { id: 'other', name: 'Other', color: '#6b7280', icon: 'Folder' }
];

function App() {
  const { isElectron } = useElectron();
  const [isLicensed, setIsLicensed] = useState(true); // For demo, always licensed
  const [isLocked, setIsLocked] = useState(true);
  // Initialize state without triggering re-renders
  const [entries, setEntries] = useState<PasswordEntry[]>(() => []);
  const [categories, setCategories] = useState<Category[]>(() => FIXED_CATEGORIES);
  const [searchTerm, setSearchTerm] = useState(() => '');
  const [selectedCategory, setSelectedCategory] = useState(() => 'all');
  const [showMainVault, setShowMainVault] = useState(() => true);
  const [showFloatingPanel, setShowFloatingPanel] = useState(() => false);
  const [showPricingPlans, setShowPricingPlans] = useState(() => false); 
  // Initialize state without triggering re-renders
  const [showDownloadPage, setShowDownloadPage] = useState(() => false); 
  const [showLicenseKeys, setShowLicenseKeys] = useState(() => features.showTestingTools);

  // Prevent flash by ensuring dark background is always present
  useEffect(() => {
    document.documentElement.style.backgroundColor = '#0f172a';
    document.body.style.backgroundColor = '#0f172a';
    document.documentElement.style.color = 'white';
    document.body.style.color = 'white';
    
    // Remove any potential white backgrounds from the DOM
    const removeWhiteBackgrounds = () => {
      const elements = document.querySelectorAll('*');
      elements.forEach(el => {
        const computed = window.getComputedStyle(el);
        if (computed.backgroundColor === 'rgb(255, 255, 255)' || computed.backgroundColor === 'white') {
          (el as HTMLElement).style.backgroundColor = '#0f172a';
        }
      });
    };
    
    removeWhiteBackgrounds();
    
    // Run again after a short delay to catch any late-loading elements
    setTimeout(removeWhiteBackgrounds, 500);
  }, []);

  // Check if we're in floating panel mode (for Electron)
  const isFloatingMode = window.location.hash === '#floating';

  // Load data from localStorage on initial load
  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedEntries = await storageService.loadEntries();
        if (loadedEntries && loadedEntries.length > 0) {
          setEntries(loadedEntries);
        }
        
        // ALWAYS use fixed categories - never load from storage
        setCategories(FIXED_CATEGORIES);
        // Save fixed categories to storage to overwrite any duplicates
        await storageService.saveCategories(FIXED_CATEGORIES);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    
    loadData();
  }, []);

  // Auto-lock after 15 minutes of inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const resetTimeout = () => {
      clearTimeout(timeout);
      if (!isLocked) {
        timeout = setTimeout(() => {
          console.log('Auto-lock triggered after 15 minutes of inactivity');
          handleLock();
        }, 30 * 60 * 1000); // Increased to 30 minutes to prevent accidental locks
      }
    };

    const handleActivity = () => {
      resetTimeout();
    };

    if (!isLocked) {
      document.addEventListener('mousedown', handleActivity);
      document.addEventListener('keydown', handleActivity);
      document.addEventListener('scroll', handleActivity);
      document.addEventListener('click', handleActivity);
      document.addEventListener('input', handleActivity);
      resetTimeout();
    }

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('scroll', handleActivity);
      document.removeEventListener('click', handleActivity);
      document.removeEventListener('input', handleActivity);
    };
  }, [isLocked]);

  const handleLogin = (password: string) => {
    // In a real app, this would verify the password hash
    setIsLocked(false);
  };

  const handleLock = () => {
    setIsLocked(true);
    setShowMainVault(true);
    setShowFloatingPanel(false); 
  };

  // Toggle download page
  const toggleDownloadPage = () => {
    setShowDownloadPage(!showDownloadPage);
    if (showDownloadPage) {
      setShowMainVault(true);
      setShowFloatingPanel(false);
    } else {
      setShowMainVault(false);
      setShowFloatingPanel(false);
    }
  };


  const handleAddEntry = async (entryData: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Validate entry data
      if (!entryData.accountName || !entryData.username || !entryData.password || !entryData.category) {
        console.error('Invalid entry data:', entryData);
        return;
      }

      const newEntry: PasswordEntry = {
        ...entryData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedEntries = [...entries, newEntry];
      setEntries(updatedEntries);
      await storageService.saveEntries(updatedEntries);
    } catch (error) {
      console.error('Failed to add entry:', error);
      // Don't crash the app, just log the error
    }
  };

  const handleUpdateEntry = async (updatedEntry: PasswordEntry) => {
    const updatedEntries = entries.map(entry => 
      entry.id === updatedEntry.id ? { ...updatedEntry, updatedAt: new Date() } : entry
    );
    setEntries(updatedEntries);
    await storageService.saveEntries(updatedEntries);
  };

  const handleDeleteEntry = async (id: string) => {
    const updatedEntries = entries.filter(entry => entry.id !== id);
    setEntries(updatedEntries);
    await storageService.saveEntries(updatedEntries);
  };

  const handleExport = async () => {
    try {
      const data = await storageService.exportData();
      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `password-vault-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
    }
  };

  // Toggle between main vault and floating panel
  const toggleVaultView = () => {
    if (isElectron) {
      if (window.electronAPI) {
        if (showMainVault) {
          window.electronAPI.showFloatingPanel();
          if (window.electronAPI.hideMainWindow) {
            window.electronAPI.hideMainWindow();
          } else {
            window.electronAPI.minimizeMainWindow();
          }
        } else {
          window.electronAPI.restoreMainWindow();
          window.electronAPI.hideFloatingPanel();
        }
      }
    } else {
      // Use web-based floating panel
      if (showMainVault) {
        setShowMainVault(false);
        setShowFloatingPanel(true);
      } else {
        setShowFloatingPanel(false);
        setShowMainVault(true);
      }
    }
  };

  // If we're in Electron floating mode, show the floating panel
  if (isElectron && isFloatingMode) {
    // Ensure the floating panel is always on top when in floating mode
    useEffect(() => {
      const setAlwaysOnTop = async () => {
        if (window.electronAPI && window.electronAPI.setAlwaysOnTop) {
          // Set to always be on top with highest priority
          await window.electronAPI.setAlwaysOnTop(true);
        }
      }
      setAlwaysOnTop();
    }, []);

    return (
      <ElectronFloatingPanel
        entries={entries}
        categories={FIXED_CATEGORIES}
        onAddEntry={handleAddEntry}
        onUpdateEntry={handleUpdateEntry}
        onDeleteEntry={handleDeleteEntry}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onMaximize={() => {
          if (window.electronAPI) {
            window.electronAPI.restoreMainWindow().then(() => {
              window.electronAPI.hideFloatingPanel();
            });
          }
        }}
        onLock={handleLock}
        onExport={handleExport}
      />
    );
  }

  if (!isLicensed) {
    return (
      <LicenseScreen 
        onLicenseValid={() => setIsLicensed(true)} 
        showPricingPlans={showPricingPlans}
        onShowPricingPlans={() => setShowPricingPlans(true)}
        onHidePricingPlans={() => setShowPricingPlans(false)}
      />
    );
  }

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

  if (isLocked) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="relative">
      {/* License Keys Display - Only shown in test mode */}
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
      
      {showMainVault && (
        <MainVault
          entries={entries}
          categories={FIXED_CATEGORIES}
          onAddEntry={handleAddEntry}
          onUpdateEntry={handleUpdateEntry}
          onDeleteEntry={handleDeleteEntry}
          onLock={handleLock}
          onExport={handleExport} 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onMinimize={toggleVaultView}
        />
      )}

      {/* Floating Panel */}
      {!isElectron && showFloatingPanel && (
        <FloatingPanel
          entries={entries}
          categories={FIXED_CATEGORIES}
          onAddEntry={handleAddEntry}
          onUpdateEntry={handleUpdateEntry}
          onDeleteEntry={handleDeleteEntry}
          onLock={handleLock}
          onExport={handleExport}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onMaximize={toggleVaultView}
        />
      )}
      
      {/* Environment indicator for test mode */}
      {features.showTestingTools && (
        <div className="fixed bottom-4 right-4 z-40 bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-medium">
          Test Environment
        </div>
      )}
    </div>
  );
}

export default App;