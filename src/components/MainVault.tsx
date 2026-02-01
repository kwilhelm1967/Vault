/**
 * MainVault Component
 * 
 * Primary vault interface with sidebar navigation, password grid, and entry management.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import {
  Search, Plus, Trash2, Eye, EyeOff, Copy, Edit3, X, Check,
  Shield, Key, Lock, LockOpen,
  Settings as SettingsIcon, LayoutDashboard, Minimize2,
  AlertTriangle, AlertCircle, HelpCircle,
  Star, ArrowUpDown, ChevronDown, Globe, ExternalLink, History, Clock,
  CheckSquare, Square, FileEdit,
  Grid3X3, CircleDollarSign, ShoppingCart, Ticket, Mail, Briefcase, TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { PasswordEntry, Category, CustomField } from "../types";
import { generateTOTP, getTimeRemaining, isValidTOTPSecret } from "../utils/totp";
import { playLockSound, playCopySound, playDeleteSound } from "../utils/soundEffects";
import { devError } from "../utils/devLog";
import { useRenderTracking } from "../hooks/usePerformance";
import { CategoryIcon } from "./CategoryIcon";
import { SettingsLazy as Settings, FAQLazy as FAQ } from "./LazyComponents";
import { clearClipboardAfterTimeout, getVaultSettings } from "../utils/settingsUtils";
import { TrialStatusBanner } from "./TrialStatusBanner";
import { PerformanceProfiler } from "./PerformanceProfiler";
import { colors, getPasswordAge, DeleteConfirmModal, BulkDeleteConfirmModal, CustomFieldDisplay } from "./vault";

const EntryForm = lazy(() => import("./EntryForm").then(m => ({ default: m.EntryForm })));
const Dashboard = lazy(() => import("./Dashboard").then(m => ({ default: m.Dashboard })));

const findDuplicates = (entries: PasswordEntry[], currentEntry: PasswordEntry): PasswordEntry[] => {
  return entries.filter(
    e => e.id !== currentEntry.id && e.password === currentEntry.password
  );
};
const categoryIconMap: Record<string, LucideIcon> = {
  Grid3X3,
  CircleDollarSign,
  ShoppingCart,
  Ticket,
  Mail,
  Briefcase,
  TrendingUp,
  FileText: FileEdit, // Map "FileText" string to FileEdit icon component
  Key, // fallback
};

/**
 * Get the icon component for a category
 * 
 * @param iconName - Name of the icon to retrieve
 * @returns Lucide icon component, defaults to Key if not found
 */
const getCategoryIcon = (iconName: string): LucideIcon => {
  return categoryIconMap[iconName] || Key;
};

interface MainVaultProps {
  entries: PasswordEntry[];
  categories: Category[];
  onAddEntry: (entry: Omit<PasswordEntry, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onUpdateEntry: (entry: PasswordEntry) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
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

const MainVaultComponent: React.FC<MainVaultProps> = ({
  entries,
  categories,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onLock,
  onExport,
  onExportPDF,
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
  // Track render performance in development
  useRenderTracking('MainVault');

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
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  
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
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
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
        if (next.has(entryId)) {
          next.delete(entryId);
        } else {
          next.add(entryId);
        }
        return next;
      });
    } catch (error) {
      devError("Error toggling entry expansion:", error);
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
    const filtered = entries.filter((entry) => {
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
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
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
    <PerformanceProfiler id="MainVault">
      <div className="h-screen flex overflow-hidden">
      
      {/* Left Sidebar */}
      <aside className="w-64 bg-slate-800/50 backdrop-blur-sm border-r flex flex-col" style={{ borderColor: 'rgba(201, 174, 102, 0.2)' }}>
        
        {/* Brand */}
        <div className="p-4 border-b" style={{ borderColor: 'rgba(201, 174, 102, 0.2)' }}>
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${colors.steelBlue500}, ${colors.steelBlue600})`,
                boxShadow: '0 0 12px rgba(6, 182, 212, 0.4), 0 0 24px rgba(6, 182, 212, 0.2)'
              }}
            >
              <LockOpen className="w-5 h-5 text-cyan-300" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-sm font-semibold" style={{ color: colors.warmIvory }}>Local Password Vault</h1>
              <p className="text-[10px] text-emerald-400/80">● Vault Unlocked</p>
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
                aria-label="Clear search"
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
            aria-label="Add new password entry"
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
            <LayoutDashboard className="w-4 h-4 opacity-70" strokeWidth={1.5} style={{ color: colors.brandGold }} />
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

          <p className="pl-5 pr-2 mb-2 mt-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: colors.brandGold }}>
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
            <Grid3X3 className="w-4 h-4 opacity-70" strokeWidth={1.5} style={{ color: colors.brandGold }} />
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
                className={`nav-item-hover w-full pl-5 pr-3 pt-1 pb-2 mb-0.5 rounded-r-lg text-left text-sm transition-all flex items-center gap-2.5 ${
                  isSelected
                    ? "nav-item-selected text-white"
                    : "text-slate-400"
                }`}
              >
                <CategoryIcon name={category.icon} size={16} className="opacity-70" strokeWidth={1.5} style={{ color: colors.brandGold }} />
                {category.name}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="pr-3 pb-3 pt-3 border-t space-y-1" style={{ borderColor: 'rgba(201, 174, 102, 0.2)' }}>
          <button
            onClick={() => setCurrentView("settings")}
            className={`nav-item-hover w-full pl-5 pr-3 py-2 rounded-r-lg text-sm flex items-center gap-2.5 transition-colors ${
              currentView === "settings"
                ? "nav-item-selected text-white"
                : "text-slate-400"
            }`}
          >
            <SettingsIcon className="w-4 h-4" strokeWidth={1.5} style={{ color: colors.brandGold }} />
            <span>Settings</span>
          </button>
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="nav-item-hover w-full pl-5 pr-3 py-2 text-slate-400 rounded-r-lg text-sm flex items-center gap-2.5 transition-colors"
            >
              <Minimize2 
                className="w-4 h-4" 
                strokeWidth={1.5}
                style={{ color: colors.brandGold }}
              />
              <span>Mini Vault</span>
            </button>
          )}
          <button
            onClick={() => setCurrentView("help")}
            aria-label="FAQs"
            className={`nav-item-hover w-full pl-5 pr-3 py-2 rounded-r-lg text-sm flex items-center gap-2.5 transition-colors ${
              currentView === "help"
                ? "nav-item-selected text-white"
                : "text-slate-400"
            }`}
          >
            <HelpCircle 
              className="w-4 h-4" 
              strokeWidth={1.5}
              style={{ color: colors.brandGold }}
            />
            <span>FAQs</span>
          </button>
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
        <div className="px-6 pt-2">
          <TrialStatusBanner 
            onPurchase={onShowPricingPlans}
            onExport={onExport}
          />
        </div>

        {currentView === "dashboard" ? (
          <div key="dashboard" className="page-transition-enter flex-1 overflow-hidden">
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
              onEditEntry={(entry) => setEditingEntry(entry)}
              onDeleteEntry={onDeleteEntry}
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
              onImport={onImport}
            />
          </div>
        ) : currentView === "settings" ? (
          <div key="settings" className="page-transition-enter flex-1 overflow-hidden">
            <Settings
              onExport={onExport}
              onExportPDF={onExportPDF}
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
        ) : currentView === "help" ? (
          <div key="help" className="page-transition-enter flex-1 overflow-hidden">
            <FAQ />
          </div>
        ) : (
          <div key={`passwords-${selectedCategory}-${showWeakOnly}-${showReusedOnly}-${showFavoritesOnly}`} className="page-transition-enter flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: 'rgba(201, 174, 102, 0.2)' }}>
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: colors.warmIvory }}>
                  {showWeakOnly ? (
                    <>
                      <AlertTriangle className="w-6 h-6" strokeWidth={1.5} style={{ color: '#C9AE66' }} />
                      <span style={{ color: '#C9AE66' }}>Weak Passwords</span>
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
                      className="absolute right-0 top-full mt-1 w-48 rounded-xl py-2 z-50 isolate"
                      role="listbox"
                      aria-label="Sort options"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setShowSortDropdown(false);
                      }}
                      style={{
                        background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
                        border: "1px solid rgba(91, 130, 184, 0.3)",
                        boxShadow: "0 20px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(91, 130, 184, 0.1)",
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
                            className="w-full text-left px-3 py-2.5 text-xs transition-all focus:outline-none rounded-lg mx-1"
                            style={{
                              width: "calc(100% - 8px)",
                              backgroundColor: isSelected ? "rgba(91, 130, 184, 0.15)" : "transparent",
                              color: isSelected ? "#C9AE66" : "#E8EDF2",
                              borderLeft: isSelected ? "2px solid #C9AE66" : "2px solid transparent",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = "rgba(91, 130, 184, 0.1)";
                                e.currentTarget.style.borderLeftColor = "rgba(91, 130, 184, 0.5)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = "transparent";
                                e.currentTarget.style.borderLeftColor = "transparent";
                              }
                            }}
                          >
                            <span className="flex items-center justify-between w-full">
                              {option.label}
                              {isSelected && (
                                <Check className="w-3.5 h-3.5" style={{ color: '#C9AE66' }} />
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
              <div className="px-6 py-2 bg-slate-800/80 border-b flex items-center justify-between" style={{ borderColor: 'rgba(201, 174, 102, 0.2)' }}>
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
            (() => {
              // First check if there are NO accounts at all
              const hasAnyAccounts = entries.length > 0;

              // Handle Weak Passwords empty state
              if (showWeakOnly) {
                return (
                  <div className="flex flex-col items-center justify-center h-full text-center pb-24">
                    {hasAnyAccounts ? (
                      <>
                        <AlertTriangle 
                          className="w-10 h-10 mb-4" 
                          strokeWidth={1.5} 
                          style={{ color: '#22c55e' }}
                        />
                        <h3 style={{ color: '#22c55e' }} className="font-medium mb-1">All passwords are strong!</h3>
                        <p className="text-slate-500 text-sm mb-4">
                          Great job! None of your passwords need attention.
                        </p>
                      </>
                    ) : (
                      <>
                        <Key 
                          className="w-10 h-10 mb-4" 
                          strokeWidth={1.5} 
                          style={{ color: colors.slate400 }}
                        />
                        <h3 style={{ color: colors.warmIvory }} className="font-medium mb-1">No passwords yet</h3>
                        <p className="text-slate-500 text-sm mb-4">
                          Add some accounts to check their strength.
                        </p>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setShowWeakOnly(false);
                        onCategoryChange("all");
                      }}
                      className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                      style={{ backgroundColor: colors.steelBlue600 }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue500}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue600}
                    >
                      <Key className="w-4 h-4" strokeWidth={1.5} />
                      View All Accounts
                    </button>
                  </div>
                );
              }

              // Handle Reused Passwords empty state
              if (showReusedOnly) {
                return (
                  <div className="flex flex-col items-center justify-center h-full text-center pb-24">
                    {hasAnyAccounts ? (
                      <>
                        <AlertTriangle 
                          className="w-10 h-10 mb-4" 
                          strokeWidth={1.5} 
                          style={{ color: '#22c55e' }}
                        />
                        <h3 style={{ color: '#22c55e' }} className="font-medium mb-1">All passwords are unique!</h3>
                        <p className="text-slate-500 text-sm mb-4">
                          Great job! You're not reusing any passwords.
                        </p>
                      </>
                    ) : (
                      <>
                        <Key 
                          className="w-10 h-10 mb-4" 
                          strokeWidth={1.5} 
                          style={{ color: colors.slate400 }}
                        />
                        <h3 style={{ color: colors.warmIvory }} className="font-medium mb-1">No passwords yet</h3>
                        <p className="text-slate-500 text-sm mb-4">
                          Add some accounts to check for reused passwords.
                        </p>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setShowReusedOnly(false);
                        onCategoryChange("all");
                      }}
                      className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                      style={{ backgroundColor: colors.steelBlue600 }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue500}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue600}
                    >
                      <Key className="w-4 h-4" strokeWidth={1.5} />
                      View All Accounts
                    </button>
                  </div>
                );
              }

              // Handle Favorites empty state differently
              if (showFavoritesOnly) {
                return (
                  <div className="flex flex-col items-center justify-center h-full text-center pb-24">
                    <Star 
                      className="w-10 h-10 mb-4" 
                      strokeWidth={1.5} 
                      style={{ color: colors.brandGold }}
                    />
                    <h3 style={{ color: colors.warmIvory }} className="font-medium mb-1">No favorites yet</h3>
                    <p className="text-slate-500 text-sm mb-4">
                      {hasAnyAccounts ? "Mark accounts as favorites from All Accounts" : "Add some accounts first"}
                    </p>
                    <button
                      onClick={() => {
                        setShowFavoritesOnly(false);
                        onCategoryChange("all");
                      }}
                      className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                      style={{ backgroundColor: colors.steelBlue600 }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue500}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue600}
                    >
                      <Key className="w-4 h-4" strokeWidth={1.5} />
                      View All Accounts
                    </button>
                  </div>
                );
              }

              // Get the current category's icon
              const currentCategory = categories.find(c => c.id === selectedCategory);
              const CategoryIcon = currentCategory?.icon 
                ? getCategoryIcon(currentCategory.icon) 
                : (selectedCategory === "all" ? Grid3X3 : Key);
              
              return (
                <div className="flex flex-col items-center justify-center h-full text-center pb-6">
                  <CategoryIcon 
                    className="w-10 h-10 mb-4" 
                    strokeWidth={1.5} 
                    style={{ color: colors.brandGold }}
                  />
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
              );
            })()
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
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
                      <div className="flex items-center justify-center flex-shrink-0">
                        {category && (
                          <CategoryIcon name={category.icon} size={24} style={{ color: category.color }} strokeWidth={1.5} />
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
                      <div className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleFavorite(entry)}
                          aria-label={entry.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
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
                          aria-label={`View details for ${entry.accountName}`}
                          className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => setEditingEntry(entry)}
                          aria-label={`Edit ${entry.accountName}`}
                          className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(entry)}
                          aria-label={`Delete ${entry.accountName}`}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                        {/* Expand/Collapse Arrow */}
                        <button
                          onClick={() => toggleEntryExpanded(entry.id)}
                          aria-label={isExpanded ? `Collapse ${entry.accountName} details` : `Expand ${entry.accountName} details`}
                          aria-expanded={isExpanded}
                          className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all ml-1"
                          title={isExpanded ? "Collapse" : "Expand"}
                        >
                          <ChevronDown 
                            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} 
                            strokeWidth={1.5} 
                          />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Content */}
                    {isExpanded && (
                      <div className="mt-3 bg-slate-700/30 rounded-lg p-4 animate-fadeIn space-y-3">
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
                          /* Password Entry shows full login info */
                          <div className="space-y-3">
                            {/* Username Row */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-slate-500 text-xs w-20 flex-shrink-0">Username</span>
                                <span className="text-slate-200 text-sm truncate font-medium">{entry.username || "—"}</span>
                              </div>
                              {entry.username && (
                                <button
                                  onClick={() => copyToClipboard(entry.username, entry.id + "-user")}
                                  aria-label={`Copy username for ${entry.accountName}`}
                                  className={`p-1.5 rounded transition-colors flex-shrink-0 ${
                                    copiedId === entry.id + "-user"
                                    ? "text-emerald-400" 
                                    : "text-slate-500 hover:text-white"
                                  }`}
                                  title="Copy username"
                                >
                                  <Copy className="w-4 h-4" strokeWidth={1.5} />
                                </button>
                              )}
                            </div>
                            
                            {/* Password Row */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-slate-500 text-xs w-20 flex-shrink-0">Password</span>
                                <span className="text-slate-200 text-sm font-mono truncate">
                                  {isPasswordVisible ? entry.password : "••••••••••••"}
                                </span>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => togglePasswordVisibility(entry.id)}
                                  aria-label={isPasswordVisible ? `Hide password for ${entry.accountName}` : `Show password for ${entry.accountName}`}
                                  aria-pressed={isPasswordVisible}
                                  className="p-1.5 text-slate-500 hover:text-white rounded transition-colors"
                                  title={isPasswordVisible ? "Hide" : "Show"}
                                >
                                  {isPasswordVisible ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(entry.password, entry.id)}
                                  aria-label={`Copy password for ${entry.accountName}`}
                                  className={`p-1.5 rounded transition-colors ${
                                    copiedId === entry.id 
                                    ? "text-emerald-400" 
                                    : "text-slate-500 hover:text-white"
                                  }`}
                                  title="Copy password"
                                >
                                  <Copy className="w-4 h-4" strokeWidth={1.5} />
                                </button>
                              </div>
                            </div>

                            {/* Website Row */}
                            {entry.website && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="text-slate-500 text-xs w-20 flex-shrink-0">Website</span>
                                  <a
                                    href={entry.website.startsWith('http') ? entry.website : `https://${entry.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 text-sm truncate flex items-center gap-1 group"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="truncate">{entry.website}</span>
                                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" strokeWidth={1.5} />
                                  </a>
                                </div>
                              </div>
                            )}
                            
                            {/* Category Row */}
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-xs w-20 flex-shrink-0">Category</span>
                              <span className="text-slate-400 text-sm capitalize">{category?.label || entry.category}</span>
                            </div>

                            {/* Notes Preview */}
                            {entry.notes && (
                              <div className="pt-2 border-t border-slate-600/50">
                                <span className="text-slate-500 text-xs block mb-1">Notes</span>
                                <p className="text-slate-400 text-xs line-clamp-3 whitespace-pre-wrap">{entry.notes}</p>
                              </div>
                            )}

                            {/* Custom Fields */}
                            {entry.customFields && entry.customFields.length > 0 && (
                              <div className="pt-2 border-t border-slate-600/50">
                                <span className="text-slate-500 text-xs block mb-2">Custom Fields</span>
                                <div className="space-y-2">
                                  {entry.customFields.map((field: CustomField) => (
                                    <div key={field.id} className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className="text-slate-500 text-xs w-20 flex-shrink-0 truncate">{field.label}</span>
                                        <span className="text-slate-300 text-sm truncate">
                                          {field.isSecret ? "••••••••" : field.value}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => copyToClipboard(field.value, entry.id + "-" + field.id)}
                                        className={`p-1 rounded transition-colors flex-shrink-0 ${
                                          copiedId === entry.id + "-" + field.id
                                          ? "text-emerald-400" 
                                          : "text-slate-500 hover:text-white"
                                        }`}
                                        title={`Copy ${field.label}`}
                                      >
                                        <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      
                      {/* Metadata footer for all entries */}
                      {entry.entryType !== "secure_note" && (
                        <div className="pt-2 border-t border-slate-600/50 flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" strokeWidth={1.5} />
                            {passwordAge.text}
                          </span>
                          {passwordAge.isOld && (
                            <span className="text-orange-400 text-[10px]">Consider updating</span>
                          )}
                        </div>
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
      <DeleteConfirmModal
        entry={entryToDelete}
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
      />

      {/* Bulk Delete Confirmation Modal */}
      <BulkDeleteConfirmModal
        count={selectedEntries.size}
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={() => {
          handleBulkDelete();
          setShowBulkDeleteConfirm(false);
        }}
      />

      {/* View Details Modal */}
      {viewingEntry && (
        <div className="form-modal-backdrop">
          <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold tracking-tight" style={{ color: colors.warmIvory }}>{viewingEntry.accountName}</h3>
                <button
                  onClick={() => setViewingEntry(null)}
                  aria-label="Close entry details"
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
                      aria-label={`Copy username for ${viewingEntry.accountName}`}
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
                        aria-label={visiblePasswords.has(viewingEntry.id) ? `Hide password for ${viewingEntry.accountName}` : `Show password for ${viewingEntry.accountName}`}
                        aria-pressed={visiblePasswords.has(viewingEntry.id)}
                        className="p-1.5 text-slate-500 hover:text-white rounded transition-colors"
                      >
                        {visiblePasswords.has(viewingEntry.id) ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(viewingEntry.password, `pwd-${viewingEntry.id}`)}
                        aria-label={`Copy password for ${viewingEntry.accountName}`}
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
                                    if (next.has(key)) {
                                      next.delete(key);
                                    } else {
                                      next.add(key);
                                    }
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
        <div className="form-modal-backdrop">
          <div className="form-modal-content">
            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div></div>}>
              <EntryForm
                entry={editingEntry}
                categories={categories}
                allEntries={entries}
                defaultCategory={!editingEntry && selectedCategory !== "all" ? selectedCategory : undefined}
                onSubmit={async (data) => {
                setIsSavingEntry(true);
                try {
                  if (editingEntry) {
                    await onUpdateEntry({ ...editingEntry, ...data, updatedAt: new Date() });
                    setEditingEntry(null);
                  } else {
                    await onAddEntry(data);
                    setShowAddForm(false);
                  }
                } finally {
                  setIsSavingEntry(false);
                }
              }}
              onCancel={() => {
                setShowAddForm(false);
                setEditingEntry(null);
              }}
              onDelete={editingEntry ? async () => {
                setIsDeletingEntry(true);
                try {
                  await onDeleteEntry(editingEntry.id);
                  setEditingEntry(null);
                  setViewingEntry(null);
                } finally {
                  setIsDeletingEntry(false);
                }
              } : undefined}
              isLoading={isSavingEntry || isDeletingEntry}
            />
            </Suspense>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="form-modal-backdrop">
          <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <div className="text-center">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${colors.steelBlue600}20` }}
              >
                <Key className="w-6 h-6" strokeWidth={1.5} style={{ color: colors.brandGold }} />
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
    </PerformanceProfiler>
  );
};

// Memoize component to prevent unnecessary re-renders
// Custom comparison: return true if props are equal (skip re-render), false if different (re-render)
export const MainVault = React.memo(MainVaultComponent, (prevProps, nextProps) => {
  // Re-render if entries array length or identity changed
  if (prevProps.entries.length !== nextProps.entries.length || prevProps.entries !== nextProps.entries) {
    return false; // Props changed, re-render needed
  }
  
  // Re-render if search term changed
  if (prevProps.searchTerm !== nextProps.searchTerm) {
    return false; // Props changed, re-render needed
  }
  
  // Re-render if selected category changed
  if (prevProps.selectedCategory !== nextProps.selectedCategory) {
    return false; // Props changed, re-render needed
  }
  
  // Re-render if categories array changed
  if (prevProps.categories !== nextProps.categories) {
    return false; // Props changed, re-render needed
  }
  
  // All props are equal, skip re-render
  return true;
});
