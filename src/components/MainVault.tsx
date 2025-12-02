/**
 * MainVault Component
 * 
 * Primary vault interface with sidebar navigation and password grid.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Edit3,
  X,
  Shield,
  Key,
  Settings as SettingsIcon,
  Lock,
  LayoutDashboard,
  AlertTriangle,
  Minimize2,
  Star,
  ArrowUpDown,
  ChevronDown,
  Globe,
  ExternalLink,
  History,
  RotateCcw,
  Clock,
  AlertCircle,
  CheckSquare,
  Square,
  FileText,
  Check,
} from "lucide-react";

// Refined color palette
const colors = {
  steelBlue600: "#4A6FA5",
  steelBlue500: "#5B82B8",
  steelBlue400: "#6C93C9", // lighter blue variant
  mutedSky: "#93B4D1",
  warmIvory: "#F3F4F6",
  brandGold: "#C9AE66",
};

// Helper function to get password age text
const getPasswordAge = (entry: PasswordEntry): { text: string; daysOld: number; isOld: boolean } => {
  const changeDate = entry.passwordChangedAt || entry.createdAt;
  const now = new Date();
  const changed = new Date(changeDate);
  const diffTime = Math.abs(now.getTime() - changed.getTime());
  const daysOld = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  let text: string;
  if (daysOld === 0) text = "Changed today";
  else if (daysOld === 1) text = "Changed yesterday";
  else if (daysOld < 30) text = `Changed ${daysOld} days ago`;
  else if (daysOld < 60) text = "Changed 1 month ago";
  else if (daysOld < 365) text = `Changed ${Math.floor(daysOld / 30)} months ago`;
  else text = `Changed ${Math.floor(daysOld / 365)} year${Math.floor(daysOld / 365) > 1 ? 's' : ''} ago`;
  
  // Consider password old if > 90 days
  const isOld = daysOld > 90;
  
  return { text, daysOld, isOld };
};

// Helper function to find duplicate passwords
const findDuplicates = (entries: PasswordEntry[], currentEntry: PasswordEntry): PasswordEntry[] => {
  return entries.filter(
    e => e.id !== currentEntry.id && e.password === currentEntry.password
  );
};

// Custom Field Display Component
const CustomFieldDisplay: React.FC<{ field: CustomField }> = ({ field }) => {
  const [visible, setVisible] = React.useState(!field.isSecret);
  const [copied, setCopied] = React.useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(field.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    const settings = getVaultSettings();
    clearClipboardAfterTimeout(settings.clipboardClearTimeout, field.value);
  };
  
  return (
    <div className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <span className="text-xs text-slate-500 block">{field.label}</span>
        <span className="text-sm text-slate-200 font-mono truncate block">
          {field.isSecret && !visible ? "••••••••" : field.value}
        </span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
        {field.isSecret && (
          <button
            onClick={() => setVisible(!visible)}
            className="p-1.5 text-slate-500 hover:text-white rounded transition-colors"
            title={visible ? "Hide" : "Show"}
          >
            {visible 
              ? <EyeOff className="w-4 h-4" strokeWidth={1.5} />
              : <Eye className="w-4 h-4" strokeWidth={1.5} />
            }
          </button>
        )}
        <button
          onClick={handleCopy}
          className="p-1.5 text-slate-500 hover:text-blue-400 rounded transition-colors"
          title="Copy"
        >
          {copied ? <Check className="w-4 h-4 text-green-400" strokeWidth={1.5} /> : <Copy className="w-4 h-4" strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  );
};

import { PasswordEntry, Category, CustomField } from "../types";
import { CategoryIcon } from "./CategoryIcon";
import { EntryForm } from "./EntryForm";
import { Dashboard } from "./Dashboard";
import { Settings, clearClipboardAfterTimeout, getVaultSettings } from "./Settings";
import { generateTOTP, getTimeRemaining, isValidTOTPSecret } from "../utils/totp";
import { TrialStatusBanner } from "./TrialStatusBanner";
import { playLockSound, playCopySound, playDeleteSound } from "../utils/soundEffects";

interface MainVaultProps {
  entries: PasswordEntry[];
  categories: Category[];
  onAddEntry: (entry: Omit<PasswordEntry, "id" | "createdAt" | "updatedAt">) => void;
  onUpdateEntry: (entry: PasswordEntry) => void;
  onDeleteEntry: (id: string) => void;
  onLock: () => void;
  onExport: () => void;
  onExportEncrypted: (password: string) => Promise<void>;
  onImport: () => void;
  onImportEncrypted: (data: string, password: string) => Promise<void>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onMinimize?: () => void;
  onShowPricingPlans?: () => void;
}

export const MainVault: React.FC<MainVaultProps> = ({
  entries,
  categories,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onLock,
  onExport,
  onExportEncrypted,
  onImport,
  onImportEncrypted,
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onMinimize,
  onShowPricingPlans,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null);
  const [viewingEntry, setViewingEntry] = useState<PasswordEntry | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<PasswordEntry | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<"dashboard" | "passwords" | "settings">("dashboard");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showWeakOnly, setShowWeakOnly] = useState(false);
  const [showReusedOnly, setShowReusedOnly] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "date" | "category">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [showPasswordHistory, setShowPasswordHistory] = useState(false);
  const [totpCode, setTotpCode] = useState<string>("");
  const [totpTimeRemaining, setTotpTimeRemaining] = useState(30);
  
  // Local search input state for debouncing
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const searchDebounceRef = useRef<NodeJS.Timeout>();
  
  // Sync local search with parent when prop changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);
  
  // Debounced search handler (150ms delay)
  const handleSearchInput = useCallback((value: string) => {
    setLocalSearchTerm(value);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 150);
  }, [onSearchChange]);
  
  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);
  
  // Bulk select state
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  const toggleSelectEntry = (entryId: string) => {
    setSelectedEntries((prev) => {
      const next = new Set(prev);
      next.has(entryId) ? next.delete(entryId) : next.add(entryId);
      return next;
    });
  };
  
  const selectAllVisible = () => {
    const visibleIds = filteredEntries.map(e => e.id);
    setSelectedEntries(new Set(visibleIds));
  };
  
  const clearSelection = () => {
    setSelectedEntries(new Set());
  };
  
  const handleBulkDelete = () => {
    selectedEntries.forEach(id => {
      onDeleteEntry(id);
    });
    setSelectedEntries(new Set());
    setBulkSelectMode(false);
  };

  const toggleEntryExpanded = (entryId: string) => {
    try {
      setExpandedEntries((prev) => {
        const next = new Set(prev);
        next.has(entryId) ? next.delete(entryId) : next.add(entryId);
        return next;
      });
    } catch (error) {
      console.error("Error toggling entry expansion:", error);
    }
  };

  const filteredEntries = useMemo(() => {
    // Helper to check if a password is weak (defined inside useMemo to avoid dependency issues)
    const isWeakPassword = (password: string): boolean => {
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      const isLong = password.length >= 12;
      const strength = [hasUpper, hasLower, hasNumber, hasSymbol, isLong].filter(Boolean).length;
      return strength <= 2;
    };

    // Build password count map for reuse detection
    const passwordCounts: Record<string, number> = {};
    entries.forEach((entry) => {
      if (entry.password && entry.entryType !== "secure_note") {
        passwordCounts[entry.password] = (passwordCounts[entry.password] || 0) + 1;
      }
    });
    const isReusedPassword = (password: string): boolean => {
      return (passwordCounts[password] || 0) > 1;
    };

    // Filter entries (includes search in notes)
    let filtered = entries.filter((entry) => {
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        entry.accountName.toLowerCase().includes(searchLower) ||
        entry.username.toLowerCase().includes(searchLower) ||
        (entry.notes && entry.notes.toLowerCase().includes(searchLower)) ||
        (entry.website && entry.website.toLowerCase().includes(searchLower));
      const matchesCategory =
        selectedCategory === "all" || entry.category === selectedCategory;
      const matchesWeakFilter = !showWeakOnly || isWeakPassword(entry.password);
      const matchesReusedFilter = !showReusedOnly || isReusedPassword(entry.password);
      const matchesFavorites = !showFavoritesOnly || entry.isFavorite;
      return matchesSearch && matchesCategory && matchesWeakFilter && matchesReusedFilter && matchesFavorites;
    });

    // Sort entries (favorites always first, then by selected sort)
    filtered.sort((a, b) => {
      // Favorites always come first
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;

      // Then sort by selected criteria
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.accountName.localeCompare(b.accountName);
          break;
        case "date":
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          break;
        case "category":
          comparison = a.category.localeCompare(b.category);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [entries, searchTerm, selectedCategory, showWeakOnly, showReusedOnly, showFavoritesOnly, sortBy, sortOrder]);

  const togglePasswordVisibility = (entryId: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      next.has(entryId) ? next.delete(entryId) : next.add(entryId);
      return next;
    });
  };

  const toggleFavorite = (entry: PasswordEntry) => {
    onUpdateEntry({ ...entry, isFavorite: !entry.isFavorite });
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Ctrl/Cmd + N = New Account
    if ((e.ctrlKey || e.metaKey) && e.key === "n") {
      e.preventDefault();
      setShowAddForm(true);
      setCurrentView("passwords");
    }
    // Ctrl/Cmd + F = Focus Search
    if ((e.ctrlKey || e.metaKey) && e.key === "f") {
      e.preventDefault();
      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
      if (searchInput) searchInput.focus();
    }
    // Ctrl/Cmd + L = Lock Vault
    if ((e.ctrlKey || e.metaKey) && e.key === "l") {
      e.preventDefault();
      onLock();
    }
    // Escape = Close modals
    if (e.key === "Escape") {
      if (showAddForm) setShowAddForm(false);
      else if (editingEntry) setEditingEntry(null);
      else if (viewingEntry) setViewingEntry(null);
      else if (showDeleteConfirm) setShowDeleteConfirm(false);
    }
    // 1-4 for views
    if (e.key === "1") {
      setCurrentView("dashboard");
    }
    if (e.key === "2") {
      setCurrentView("passwords");
      setShowFavoritesOnly(false);
      setShowWeakOnly(false);
    }
    if (e.key === "3") {
      setCurrentView("settings");
    }
  }, [showAddForm, editingEntry, viewingEntry, showDeleteConfirm, onLock]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // TOTP code generation
  useEffect(() => {
    if (!viewingEntry?.totpSecret || !isValidTOTPSecret(viewingEntry.totpSecret)) {
      setTotpCode("");
      return;
    }

    const updateTOTP = async () => {
      try {
        const code = await generateTOTP(viewingEntry.totpSecret!);
        setTotpCode(code);
        setTotpTimeRemaining(getTimeRemaining());
      } catch {
        setTotpCode("Error");
      }
    };

    updateTOTP();
    const interval = setInterval(() => {
      setTotpTimeRemaining(getTimeRemaining());
      // Regenerate code when timer hits 30 (new period)
      if (getTimeRemaining() === 30) {
        updateTOTP();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [viewingEntry?.totpSecret]);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    playCopySound();
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    
    // Auto-clear clipboard based on settings (pass copied text for verification)
    const settings = getVaultSettings();
    clearClipboardAfterTimeout(settings.clipboardClearTimeout, text);
  };

  const handleDeleteClick = (entry: PasswordEntry) => {
    setEntryToDelete(entry);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (entryToDelete) {
      playDeleteSound();
      onDeleteEntry(entryToDelete.id);
      // Close any modals showing this entry
      if (viewingEntry?.id === entryToDelete.id) {
        setViewingEntry(null);
      }
      if (editingEntry?.id === entryToDelete.id) {
        setEditingEntry(null);
      }
      setEntryToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: "#0f172a" }}>
      
      {/* Left Sidebar */}
      <aside className="w-64 bg-slate-800/50 backdrop-blur-sm border-r border-slate-700/50 flex flex-col">
        
        {/* Brand */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${colors.steelBlue500}, ${colors.steelBlue600})` }}
            >
              <Shield className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-sm font-semibold" style={{ color: colors.warmIvory }}>Local Password Vault</h1>
              <p className="text-[10px] text-slate-500">AES-256 Encrypted</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search accounts..."
              aria-label="Search accounts"
              value={localSearchTerm}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm placeholder-slate-400 focus:outline-none transition-all"
              style={{ 
                color: colors.warmIvory,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = colors.steelBlue500;
                e.target.style.boxShadow = `0 0 0 2px ${colors.steelBlue500}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '';
                e.target.style.boxShadow = '';
              }}
            />
            {localSearchTerm && (
              <button
                onClick={() => handleSearchInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>

        {/* Add New Button */}
        <div className="px-3 mb-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            style={{ 
              backgroundColor: colors.steelBlue600,
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue500}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue600}
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            Add Account
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto pr-2 py-2" aria-label="Main navigation">
          {/* Dashboard Link */}
          <button
            onClick={() => setCurrentView("dashboard")}
            className={`nav-item-hover w-full pl-5 pr-3 py-2 mb-1 rounded-r-lg text-left text-sm transition-all flex items-center gap-2.5 ${
              currentView === "dashboard"
                ? "nav-item-selected text-white"
                : "text-slate-400"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 opacity-70" strokeWidth={1.5} />
            Dashboard
          </button>

          {/* Favorites Link */}
          <button
            onClick={() => {
              setShowFavoritesOnly(true);
              setShowWeakOnly(false);
              onCategoryChange("all");
              setCurrentView("passwords");
            }}
            className={`nav-item-hover w-full pl-5 pr-3 py-2 mb-2 rounded-r-lg text-left text-sm transition-all flex items-center gap-2.5 ${
              currentView === "passwords" && showFavoritesOnly
                ? "nav-item-selected text-white"
                : "text-slate-400"
            }`}
          >
            <Star className="w-4 h-4 opacity-70" strokeWidth={1.5} style={{ color: colors.brandGold }} />
            Favorites
            {entries.filter(e => e.isFavorite).length > 0 && (
              <span className="ml-auto text-xs text-slate-500">{entries.filter(e => e.isFavorite).length}</span>
            )}
          </button>

          <p className="pl-5 pr-2 mb-2 mt-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Categories
          </p>
          
          {/* All Accounts */}
          <button
            onClick={() => {
              onCategoryChange("all");
              setShowWeakOnly(false);
              setShowFavoritesOnly(false);
              setCurrentView("passwords");
            }}
            className={`nav-item-hover w-full pl-5 pr-3 py-2 mb-0.5 rounded-r-lg text-left text-sm transition-all flex items-center gap-2.5 ${
              currentView === "passwords" && selectedCategory === "all" && !showWeakOnly && !showReusedOnly && !showFavoritesOnly
                ? "nav-item-selected text-white"
                : "text-slate-400"
            }`}
          >
            <Shield className="w-4 h-4 opacity-70" strokeWidth={1.5} />
            All Accounts
            <span className="ml-auto text-xs text-slate-500">{entries.length}</span>
          </button>
          {categories.filter(c => c.id !== "all").map((category) => {
            const isSelected = currentView === "passwords" && selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => {
                  onCategoryChange(category.id);
                  setShowWeakOnly(false);
                  setCurrentView("passwords");
                }}
                className={`nav-item-hover w-full pl-5 pr-3 py-2 mb-0.5 rounded-r-lg text-left text-sm transition-all flex items-center gap-2.5 ${
                  isSelected
                    ? "nav-item-selected text-white"
                    : "text-slate-400"
                }`}
              >
                <CategoryIcon name={category.icon} size={16} className="opacity-70" strokeWidth={1.5} />
                {category.name}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="pr-3 pb-3 pt-3 border-t border-slate-700/50 space-y-1">
          <button
            onClick={() => setCurrentView("settings")}
            className={`nav-item-hover w-full pl-5 pr-3 py-2 rounded-r-lg text-sm flex items-center gap-2.5 transition-colors ${
              currentView === "settings"
                ? "nav-item-selected text-white"
                : "text-slate-400"
            }`}
          >
            <SettingsIcon className="w-4 h-4" strokeWidth={1.5} />
            Settings
          </button>
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="w-full pl-5 pr-3 py-2 text-slate-300 hover:text-white bg-slate-700/30 hover:bg-slate-700/50 rounded-r-lg text-sm flex items-center gap-2.5 transition-colors border border-l-0 border-slate-600/30"
            >
              <Minimize2 
                className="w-4 h-4" 
                strokeWidth={1.5}
                style={{ color: colors.steelBlue500 }}
              />
              <span>Mini Vault</span>
            </button>
          )}
          <button
            onClick={() => { playLockSound(); onLock(); }}
            aria-label="Lock vault and return to login"
            className="nav-item-hover w-full pl-5 pr-3 py-2 text-slate-400 rounded-r-lg text-sm flex items-center gap-2.5 transition-colors"
          >
            <Lock 
              className="w-4 h-4" 
              strokeWidth={1.5}
              style={{ color: colors.brandGold }}
            />
            <span>Lock Vault</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Trial Status Banner */}
        <div className="px-6 pt-4">
          <TrialStatusBanner 
            onPurchase={onShowPricingPlans}
            onExport={onExport}
            previewMode={
              import.meta.env.DEV 
                ? new URLSearchParams(window.location.search).get('trial') as 'active' | 'urgent' | 'expired' | undefined
                : undefined
            }
          />
        </div>

        {currentView === "dashboard" ? (
          <div key="dashboard" className="page-transition-enter">
            <Dashboard
              entries={entries}
              categories={categories}
              onAddEntry={() => setShowAddForm(true)}
              onViewCategory={(categoryId) => {
                onCategoryChange(categoryId);
                setShowWeakOnly(false);
                setShowReusedOnly(false);
                setCurrentView("passwords");
              }}
              onViewEntry={(entry) => setViewingEntry(entry)}
              onViewWeakPasswords={() => {
                onCategoryChange("all");
                setShowWeakOnly(true);
                setShowReusedOnly(false);
                setCurrentView("passwords");
              }}
              onViewReusedPasswords={() => {
                onCategoryChange("all");
                setShowWeakOnly(false);
                setShowReusedOnly(true);
                setCurrentView("passwords");
              }}
            />
          </div>
        ) : currentView === "settings" ? (
          <div key="settings" className="page-transition-enter">
            <Settings
              onExport={onExport}
              onExportEncrypted={onExportEncrypted}
              onImport={onImport}
              onImportEncrypted={onImportEncrypted}
              onChangePassword={() => setShowChangePassword(true)}
              onClearAllData={() => {
                // Clear all entries and lock the vault
                entries.forEach(entry => onDeleteEntry(entry.id));
                localStorage.clear();
                onLock();
              }}
              totalEntries={entries.length}
            />
          </div>
        ) : (
          <div key={`passwords-${selectedCategory}-${showWeakOnly}-${showReusedOnly}-${showFavoritesOnly}`} className="page-transition-enter flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: colors.warmIvory }}>
                  {showWeakOnly ? (
                    <>
                      <AlertTriangle className="w-6 h-6 text-amber-400" strokeWidth={1.5} />
                      <span className="text-amber-400">Weak Passwords</span>
                    </>
                  ) : showReusedOnly ? (
                    <>
                      <AlertTriangle className="w-6 h-6" strokeWidth={1.5} style={{ color: '#C9AE66' }} />
                      <span style={{ color: '#C9AE66' }}>Reused Passwords</span>
                    </>
                  ) : showFavoritesOnly ? (
                    <>
                      <Star className="w-6 h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
                      <span>Favorites</span>
                    </>
                  ) : selectedCategory === "all" 
                    ? "All Accounts" 
                    : categories.find(c => c.id === selectedCategory)?.name || "Accounts"}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {filteredEntries.length} {filteredEntries.length === 1 ? "item" : "items"}
                  {searchTerm && ` matching "${searchTerm}"`}
                  {showWeakOnly && " • These need stronger passwords"}
                  {showReusedOnly && " • Consider using unique passwords"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Sort Dropdown */}
                <div ref={sortDropdownRef} className="relative">
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setShowSortDropdown(false);
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShowSortDropdown(!showSortDropdown);
                      }
                    }}
                    aria-haspopup="listbox"
                    aria-expanded={showSortDropdown}
                    aria-label="Sort entries"
                    className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-xs text-slate-300 px-3 py-1.5 hover:border-slate-600 hover:bg-slate-800/70 transition-all"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.5} />
                    <span>
                      {sortBy === "name" && sortOrder === "asc" && "Name (A-Z)"}
                      {sortBy === "name" && sortOrder === "desc" && "Name (Z-A)"}
                      {sortBy === "date" && sortOrder === "desc" && "Newest First"}
                      {sortBy === "date" && sortOrder === "asc" && "Oldest First"}
                      {sortBy === "category" && sortOrder === "asc" && "Category (A-Z)"}
                      {sortBy === "category" && sortOrder === "desc" && "Category (Z-A)"}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {showSortDropdown && (
                    <div 
                      className="absolute right-0 top-full mt-1 w-44 rounded-xl py-1 z-50 isolate"
                      role="listbox"
                      aria-label="Sort options"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setShowSortDropdown(false);
                      }}
                      style={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                        boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.6), 0 4px 6px -2px rgba(0, 0, 0, 0.3)",
                      }}
                    >
                      {[
                        { value: "name-asc", label: "Name (A-Z)" },
                        { value: "name-desc", label: "Name (Z-A)" },
                        { value: "date-desc", label: "Newest First" },
                        { value: "date-asc", label: "Oldest First" },
                        { value: "category-asc", label: "Category (A-Z)" },
                        { value: "category-desc", label: "Category (Z-A)" },
                      ].map((option, index) => {
                        const isSelected = `${sortBy}-${sortOrder}` === option.value;
                        return (
                          <button
                            key={option.value}
                            role="option"
                            aria-selected={isSelected}
                            tabIndex={showSortDropdown ? 0 : -1}
                            autoFocus={index === 0 && showSortDropdown}
                            onClick={() => {
                              const [newSortBy, newSortOrder] = option.value.split("-") as ["name" | "date" | "category", "asc" | "desc"];
                              setSortBy(newSortBy);
                              setSortOrder(newSortOrder);
                              setShowSortDropdown(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                const [newSortBy, newSortOrder] = option.value.split("-") as ["name" | "date" | "category", "asc" | "desc"];
                                setSortBy(newSortBy);
                                setSortOrder(newSortOrder);
                                setShowSortDropdown(false);
                              }
                            }}
                            className="w-full text-left px-3 py-2 text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
                            style={{
                              backgroundColor: isSelected ? "#334155" : "#1e293b",
                              color: isSelected ? "#ffffff" : "#94a3b8",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = "#334155";
                                e.currentTarget.style.color = "#ffffff";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = "#1e293b";
                                e.currentTarget.style.color = "#94a3b8";
                              }
                            }}
                          >
                            <span className="flex items-center justify-between">
                              {option.label}
                              {isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#5B82B8]"></span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Clear Filters */}
                {(showWeakOnly || showReusedOnly || showFavoritesOnly) && (
                  <button
                    onClick={() => {
                      setShowWeakOnly(false);
                      setShowReusedOnly(false);
                      setShowFavoritesOnly(false);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    Clear Filter
                  </button>
                )}
                
                {/* Bulk Select Toggle */}
                <button
                  onClick={() => {
                    setBulkSelectMode(!bulkSelectMode);
                    if (bulkSelectMode) clearSelection();
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    bulkSelectMode 
                      ? "bg-[#5B82B8] text-white" 
                      : "bg-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Select
                </button>
              </div>
            </header>
            
            {/* Bulk Select Actions Bar */}
            {bulkSelectMode && (
              <div className="px-6 py-2 bg-slate-800/80 border-b border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">
                    {selectedEntries.size} selected
                  </span>
                  <button
                    onClick={selectAllVisible}
                    className="text-xs text-[#5B82B8] hover:text-[#93B4D1] transition-colors"
                  >
                    Select All ({filteredEntries.length})
                  </button>
                  {selectedEntries.size > 0 && (
                    <button
                      onClick={clearSelection}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {selectedEntries.size > 0 && (
                  <button
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Delete Selected
                  </button>
                )}
              </div>
            )}

            {/* Password Grid */}
            <div className="flex-1 overflow-y-auto p-6">
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center pb-24">
              <div className="w-16 h-16 bg-slate-800/50 border border-slate-700/50 rounded-2xl flex items-center justify-center mb-4">
                <Key className="w-8 h-8 text-slate-600" strokeWidth={1.5} />
              </div>
              <h3 style={{ color: colors.warmIvory }} className="font-medium mb-1">No accounts found</h3>
              <p className="text-slate-500 text-sm mb-4">
                {searchTerm ? "Try a different search term" : "Add your first account to get started"}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  style={{ backgroundColor: colors.steelBlue600 }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue500}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue600}
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  Add Account
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredEntries.map((entry) => {
                const category = categories.find((c) => c.id === entry.category);
                const isPasswordVisible = visiblePasswords.has(entry.id);
                const isExpanded = expandedEntries.has(entry.id);
                const passwordAge = getPasswordAge(entry);
                const duplicates = findDuplicates(entries, entry);
                const hasDuplicates = duplicates.length > 0;
                const isSelected = selectedEntries.has(entry.id);

                return (
                  <div
                    key={entry.id}
                    className={`bg-slate-800/50 backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 ease-out hover:scale-[1.02] hover:-translate-y-1 hover:border-[#5B82B8] hover:shadow-lg cursor-pointer group ${
                      isSelected ? "border-[#5B82B8] ring-2 ring-[#5B82B8]/30" : "border-[#5B82B8]/40"
                    }`}
                  >
                    {/* Card Header - Clickable to expand/collapse */}
                    <div 
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => toggleEntryExpanded(entry.id)}
                    >
                      {/* Bulk Select Checkbox */}
                      {bulkSelectMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectEntry(entry.id);
                          }}
                          className="flex-shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-[#5B82B8]" strokeWidth={1.5} />
                          ) : (
                            <Square className="w-5 h-5 text-slate-500 hover:text-slate-300" strokeWidth={1.5} />
                          )}
                        </button>
                      )}
                      <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center flex-shrink-0">
                        {category && (
                          <CategoryIcon name={category.icon} size={20} className="text-slate-400" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 style={{ color: colors.warmIvory }} className="font-medium text-sm truncate">{entry.accountName}</h3>
                          {/* Entry Type Badge */}
                          {entry.entryType === "secure_note" && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500/15 border border-blue-500/30 rounded text-[10px] text-blue-400 flex-shrink-0">
                              <FileText className="w-3 h-3" strokeWidth={1.5} />
                              <span className="hidden sm:inline">Note</span>
                            </span>
                          )}
                          {/* Warning Badges - only for password entries */}
                          {entry.entryType !== "secure_note" && hasDuplicates && (
                            <span 
                              className="flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[10px] flex-shrink-0"
                              style={{ backgroundColor: 'rgba(201, 174, 102, 0.4)', color: '#C9AE66' }}
                              title={`Duplicate password with: ${duplicates.map(d => d.accountName).join(", ")}`}
                            >
                              <AlertCircle className="w-2.5 h-2.5" strokeWidth={1.5} />
                              <span className="hidden sm:inline">Reused</span>
                            </span>
                          )}
                          {entry.entryType !== "secure_note" && passwordAge.isOld && (
                            <span 
                              className="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-500/15 border border-orange-500/30 rounded text-[10px] text-orange-400 flex-shrink-0"
                              title={`Password is ${passwordAge.daysOld} days old`}
                            >
                              <Clock className="w-3 h-3" strokeWidth={1.5} />
                              <span className="hidden sm:inline">Old</span>
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-xs truncate">
                          {entry.entryType === "secure_note" ? "Secure Note" : entry.username}
                        </p>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleFavorite(entry)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            entry.isFavorite 
                              ? "text-amber-400 hover:text-amber-300" 
                              : "text-slate-500 hover:text-amber-400"
                          }`}
                          title={entry.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                        >
                          <Star className="w-4 h-4" strokeWidth={1.5} fill={entry.isFavorite ? "currentColor" : "none"} />
                        </button>
                        <button
                          onClick={() => setViewingEntry(entry)}
                          className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => setEditingEntry(entry)}
                          className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(entry)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Content */}
                    {isExpanded && (
                      <div className="mt-3 bg-slate-700/30 rounded-lg p-3 animate-fadeIn">
                        {/* Secure Note shows notes content */}
                        {entry.entryType === "secure_note" ? (
                          <div>
                            <p className="text-slate-300 text-sm whitespace-pre-wrap">{entry.notes}</p>
                            <button
                              onClick={() => copyToClipboard(entry.notes || "", entry.id)}
                              className={`mt-2 flex items-center gap-1.5 text-xs transition-colors ${
                                copiedId === entry.id 
                                  ? "text-emerald-400" 
                                  : "text-slate-500 hover:text-white"
                              }`}
                            >
                              <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                              {copiedId === entry.id ? "Copied!" : "Copy note"}
                            </button>
                          </div>
                        ) : (
                          /* Password Entry shows password */
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300 text-sm font-mono">
                              {isPasswordVisible ? entry.password : "••••••••••••"}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => togglePasswordVisibility(entry.id)}
                                className="p-1.5 text-slate-500 hover:text-white rounded transition-colors"
                                title={isPasswordVisible ? "Hide" : "Show"}
                              >
                                {isPasswordVisible ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                              </button>
                              <button
                                onClick={() => copyToClipboard(entry.password, entry.id)}
                                className={`p-1.5 rounded transition-colors ${
                                  copiedId === entry.id 
                                  ? "text-emerald-400" 
                                  : "text-slate-500 hover:text-white"
                                }`}
                                title="Copy"
                              >
                                <Copy className="w-4 h-4" strokeWidth={1.5} />
                              </button>
                            </div>
                          </div>
                        )}
                      
                      {/* Additional info for password entries only */}
                      {entry.entryType !== "secure_note" && (
                        <>
                          {/* Website Link - inside expanded section */}
                          {entry.website && (
                            <a
                              href={entry.website.startsWith('http') ? entry.website : `https://${entry.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 flex items-center gap-2 text-blue-400 hover:text-blue-300 text-xs transition-colors group"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
                              <span className="truncate">{entry.website}</span>
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                            </a>
                          )}
                          
                          {/* Notes Preview - inside expanded section */}
                          {entry.notes && (
                            <p className="mt-3 text-slate-500 text-xs line-clamp-2">{entry.notes}</p>
                          )}

                          {/* Custom Fields Preview - inside expanded section */}
                          {entry.customFields && entry.customFields.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {entry.customFields.slice(0, 3).map((field: CustomField) => (
                                <span key={field.id} className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-400">
                                  {field.label}
                                </span>
                              ))}
                              {entry.customFields.length > 3 && (
                                <span className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-500">
                                  +{entry.customFields.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Password Age - inside expanded section */}
                          <p className={`mt-2 text-xs flex items-center gap-1 ${passwordAge.isOld ? 'text-orange-400' : 'text-slate-500'}`}>
                            <Clock className="w-3 h-3" strokeWidth={1.5} />
                            {passwordAge.text}
                          </p>
                        </>
                      )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && entryToDelete && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-start justify-center pt-[30vh] p-4 z-50">
          <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" strokeWidth={1.5} />
              </div>
              <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-2">Delete Account</h3>
              <p className="text-slate-400 text-sm mb-6">
                Delete "<span style={{ color: colors.warmIvory }}>{entryToDelete.accountName}</span>"? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-start justify-center pt-[30vh] p-4 z-50">
          <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" strokeWidth={1.5} />
              </div>
              <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-2">Delete {selectedEntries.size} Accounts</h3>
              <p className="text-slate-400 text-sm mb-6">
                This will permanently delete {selectedEntries.size} selected account{selectedEntries.size > 1 ? 's' : ''}. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleBulkDelete();
                    setShowBulkDeleteConfirm(false);
                  }}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingEntry && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-start justify-center pt-[15vh] p-4 z-50">
          <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold tracking-tight" style={{ color: colors.warmIvory }}>{viewingEntry.accountName}</h3>
                <button
                  onClick={() => setViewingEntry(null)}
                  className="p-2 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Username</label>
                  <div className="mt-1 flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                    <span style={{ color: colors.warmIvory }} className="text-sm">{viewingEntry.username}</span>
                    <button
                      onClick={() => copyToClipboard(viewingEntry.username, `user-${viewingEntry.id}`)}
                      className="p-1.5 text-slate-500 hover:text-white rounded transition-colors"
                    >
                      <Copy className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Password</label>
                  <div className="mt-1 flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                    <span style={{ color: colors.warmIvory }} className="text-sm font-mono">
                      {visiblePasswords.has(viewingEntry.id) ? viewingEntry.password : "••••••••••••"}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => togglePasswordVisibility(viewingEntry.id)}
                        className="p-1.5 text-slate-500 hover:text-white rounded transition-colors"
                      >
                        {visiblePasswords.has(viewingEntry.id) ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(viewingEntry.password, `pwd-${viewingEntry.id}`)}
                        className="p-1.5 text-slate-500 hover:text-white rounded transition-colors"
                      >
                        <Copy className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2FA Code */}
                {viewingEntry.totpSecret && isValidTOTPSecret(viewingEntry.totpSecret) && totpCode && (
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🔐</span> 2FA Code
                    </label>
                    <div className="mt-1 flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <span 
                          className="text-2xl font-mono font-bold tracking-widest"
                          style={{ color: totpTimeRemaining <= 5 ? '#ef4444' : colors.warmIvory }}
                        >
                          {totpCode.slice(0, 3)} {totpCode.slice(3)}
                        </span>
                        <div className="flex flex-col items-center">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ 
                              backgroundColor: totpTimeRemaining <= 5 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(91, 130, 184, 0.2)',
                              color: totpTimeRemaining <= 5 ? '#ef4444' : colors.steelBlue400
                            }}
                          >
                            {totpTimeRemaining}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(totpCode, `totp-${viewingEntry.id}`)}
                        className={`p-1.5 rounded transition-colors ${
                          copiedId === `totp-${viewingEntry.id}` 
                            ? "text-emerald-400" 
                            : "text-slate-500 hover:text-white"
                        }`}
                        title="Copy code"
                      >
                        <Copy className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Code refreshes every 30 seconds</p>
                  </div>
                )}

                {viewingEntry.website && (
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Website</label>
                    <div className="mt-1 flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                      <a
                        href={viewingEntry.website.startsWith('http') ? viewingEntry.website : `https://${viewingEntry.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm truncate flex items-center gap-2 transition-colors"
                      >
                        <Globe className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                        <span className="truncate">{viewingEntry.website}</span>
                      </a>
                      <a
                        href={viewingEntry.website.startsWith('http') ? viewingEntry.website : `https://${viewingEntry.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-500 hover:text-blue-400 rounded transition-colors flex-shrink-0"
                        title="Open in browser"
                      >
                        <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                      </a>
                    </div>
                  </div>
                )}

                {viewingEntry.notes && (
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Notes</label>
                    <div className="mt-1 bg-slate-700/30 rounded-lg p-3">
                      <p className="text-slate-300 text-sm whitespace-pre-wrap">{viewingEntry.notes}</p>
                    </div>
                  </div>
                )}

                {/* Custom Fields */}
                {viewingEntry.customFields && viewingEntry.customFields.length > 0 && (
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Custom Fields</label>
                    <div className="mt-1 space-y-2">
                      {viewingEntry.customFields.map((field: CustomField) => (
                        <CustomFieldDisplay key={field.id} field={field} />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Password Age & Security Info */}
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <div className="flex flex-wrap gap-3">
                    {/* Password Age */}
                    {(() => {
                      const age = getPasswordAge(viewingEntry);
                      return (
                        <div className={`flex items-center gap-1.5 text-xs ${age.isOld ? 'text-orange-400' : 'text-slate-500'}`}>
                          <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                          {age.text}
                          {age.isOld && <span className="text-orange-400">(consider updating)</span>}
                        </div>
                      );
                    })()}
                    
                    {/* Duplicate Warning */}
                    {(() => {
                      const dupes = findDuplicates(entries, viewingEntry);
                      if (dupes.length === 0) return null;
                      return (
                        <div 
                          className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg"
                          style={{ backgroundColor: 'rgba(201, 174, 102, 0.15)', color: '#C9AE66' }}
                        >
                          <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                          This password is reused in {dupes.length} {dupes.length === 1 ? 'entry' : 'entries'}: {dupes.map(d => d.accountName).join(", ")}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                
                {/* Password History */}
                {viewingEntry.passwordHistory && viewingEntry.passwordHistory.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <button
                      onClick={() => setShowPasswordHistory(!showPasswordHistory)}
                      className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      <History className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Password History ({viewingEntry.passwordHistory.length})</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPasswordHistory ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                    </button>
                    
                    {showPasswordHistory && (
                      <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-150">
                        {viewingEntry.passwordHistory.map((item, index) => (
                          <div 
                            key={index}
                            className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between group"
                          >
                            <div className="flex-1 min-w-0">
                              <code className="text-xs text-slate-400 font-mono truncate block">
                                {visiblePasswords.has(`history-${index}`) 
                                  ? item.password 
                                  : "••••••••••••"}
                              </code>
                              <span className="text-[10px] text-slate-500 mt-1 block">
                                Changed {new Date(item.changedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                onClick={() => {
                                  const key = `history-${index}`;
                                  setVisiblePasswords(prev => {
                                    const next = new Set(prev);
                                    next.has(key) ? next.delete(key) : next.add(key);
                                    return next;
                                  });
                                }}
                                className="p-1.5 text-slate-500 hover:text-white rounded transition-colors"
                                title={visiblePasswords.has(`history-${index}`) ? "Hide" : "Show"}
                              >
                                {visiblePasswords.has(`history-${index}`) 
                                  ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.5} />
                                  : <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />}
                              </button>
                              <button
                                onClick={() => copyToClipboard(item.password, `history-${index}`)}
                                className={`p-1.5 rounded transition-colors ${
                                  copiedId === `history-${index}` 
                                    ? "text-emerald-400" 
                                    : "text-slate-500 hover:text-white"
                                }`}
                                title="Copy"
                              >
                                <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </button>
                              <button
                                onClick={() => {
                                  // Restore this password - edit the entry with the old password
                                  const updatedEntry = {
                                    ...viewingEntry,
                                    password: item.password,
                                    passwordChangedAt: new Date(),
                                    passwordHistory: [
                                      { password: viewingEntry.password, changedAt: viewingEntry.passwordChangedAt || new Date() },
                                      ...(viewingEntry.passwordHistory || []).filter((_, i) => i !== index)
                                    ].slice(0, 10),
                                    updatedAt: new Date(),
                                  };
                                  onUpdateEntry(updatedEntry);
                                  setViewingEntry(updatedEntry);
                                  setShowPasswordHistory(false);
                                }}
                                className="p-1.5 text-slate-500 hover:text-blue-400 rounded transition-colors"
                                title="Restore this password"
                              >
                                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setViewingEntry(null);
                    setEditingEntry(viewingEntry);
                  }}
                  className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  style={{ backgroundColor: colors.steelBlue600 }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue500}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue600}
                >
                  <Edit3 className="w-4 h-4" strokeWidth={1.5} />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setViewingEntry(null);
                    setShowPasswordHistory(false);
                  }}
                  className="px-4 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingEntry) && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-start justify-center pt-[10vh] p-4 z-50">
          <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
            <EntryForm
              entry={editingEntry}
              categories={categories}
              allEntries={entries}
              onSubmit={(data) => {
                if (editingEntry) {
                  onUpdateEntry({ ...editingEntry, ...data, updatedAt: new Date() });
                  setEditingEntry(null);
                } else {
                  onAddEntry(data);
                  setShowAddForm(false);
                }
              }}
              onCancel={() => {
                setShowAddForm(false);
                setEditingEntry(null);
              }}
              onDelete={editingEntry ? () => {
                onDeleteEntry(editingEntry.id);
                setEditingEntry(null);
                setViewingEntry(null);
              } : undefined}
            />
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-start justify-center pt-[30vh] p-4 z-50">
          <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <div className="text-center">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${colors.steelBlue600}20` }}
              >
                <Key className="w-6 h-6" strokeWidth={1.5} style={{ color: colors.steelBlue400 }} />
              </div>
              <h3 style={{ color: colors.warmIvory }} className="font-semibold mb-2">Change Master Password</h3>
              <p className="text-slate-400 text-sm mb-6">
                To change your master password, you'll need to lock the vault and create a new one during setup.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowChangePassword(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowChangePassword(false);
                    localStorage.removeItem("vault_password_hash");
                    onLock();
                  }}
                  className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: colors.steelBlue600 }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue500}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue600}
                >
                  Lock & Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
