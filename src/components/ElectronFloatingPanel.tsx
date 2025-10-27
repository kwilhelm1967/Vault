import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Download,
  Lock,
  Maximize2,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Edit3,
  X,
  Clock,
  FileText,
} from "lucide-react";
import { PasswordEntry, Category } from "../types";
import { CategoryIcon } from "./CategoryIcon";
import { EntryForm } from "./EntryForm";

interface ElectronFloatingPanelProps {
  entries: PasswordEntry[];
  categories: Category[];
  onAddEntry: (
    entry: Omit<PasswordEntry, "id" | "createdAt" | "updatedAt">
  ) => void;
  onUpdateEntry: (entry: PasswordEntry) => void;
  onDeleteEntry: (id: string) => void;
  onLock: () => void;
  onExport: () => void;
  onImport: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onMaximize: () => void;
}

export const ElectronFloatingPanel: React.FC<ElectronFloatingPanelProps> = ({
  entries,
  categories,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onLock,
  onExport,
  onImport,
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onMaximize,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(
    new Set()
  );
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [autoLockTime] = useState(15);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerActive, setTimerActive] = useState(false);
  // Removed unused positionLoaded state to avoid lint errors

  // Load and set window position on component mount
  useEffect(() => {
    const initializeFloatingPanel = async () => {
      if (window.electronAPI && window.electronAPI.setAlwaysOnTop) {
        await window.electronAPI.setAlwaysOnTop(true);
      }

      // Then load position if available
      if (window.electronAPI && window.electronAPI.getFloatingPanelPosition) {
        await window.electronAPI.getFloatingPanelPosition();
      }
    };

    initializeFloatingPanel();

    // Re-apply always-on-top periodically to ensure it stays on top
    const interval = setInterval(() => {
      try {
        if (window.electronAPI && window.electronAPI.setAlwaysOnTop) {
          window.electronAPI.setAlwaysOnTop(true);
        }
      } catch (e) {
        // Silent error handling
      }
    }, 500); // Check more frequently (every 500ms)

    return () => clearInterval(interval);
  }, []);

  // Auto-lock countdown
  useEffect(() => {
    if (!timerActive) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          onLock();
          setTimerActive(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, onLock]);

  // Reset timer on user activity
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const startTimer = () => {
      setTimerActive(true);
      setTimeRemaining(autoLockTime * 60);
    };

    const resetTimer = (e: Event) => {
      // Don't reset timer if clicking on category buttons
      const target = e.target as HTMLElement;
      if (target.closest('[data-category-button]')) {
        return;
      }

      // Clear existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Stop current timer if active
      setTimerActive(false);
      setTimeRemaining(null);

      // Start timer after 5 seconds of inactivity
      timeoutId = setTimeout(() => {
        startTimer();
      }, 5000);
    };

    document.addEventListener("mousedown", resetTimer);
    document.addEventListener("keydown", resetTimer);

    // Initial timer start after 5 seconds
    timeoutId = setTimeout(() => {
      startTimer();
    }, 5000);

    return () => {
      document.removeEventListener("mousedown", resetTimer);
      document.removeEventListener("keydown", resetTimer);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [autoLockTime]);

  // Load favorites from localStorage
  // useEffect(() => {
  //   const stored = localStorage.getItem("floating_panel_favorites");
  //   if (stored) {
  //     try {
  //       setFavorites(new Set(JSON.parse(stored)));
  //     } catch (error) {
  //       console.error("Failed to parse favorites:", error);
  //     }
  //   }
  // }, []);

  // Save favorites to localStorage
  // useEffect(() => {
  //   localStorage.setItem(
  //     "floating_panel_favorites",
  //     JSON.stringify([...favorites])
  //   );
  // }, [favorites]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Search filter: if no search term, all entries match search
      const matchesSearch =
        !searchTerm.trim() ||
        entry.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.notes || "").toLowerCase().includes(searchTerm.toLowerCase());

      // Category filter: if "all" is selected, all entries match category
      const matchesCategory =
        selectedCategory === "all" || entry.category === selectedCategory;

      // Both filters must pass for entry to be included
      return matchesSearch && matchesCategory;
    });
  }, [entries, searchTerm, selectedCategory]);

  const favoriteEntries = filteredEntries.filter((entry) =>
    favorites.has(entry.id)
  );
  const regularEntries = filteredEntries.filter(
    (entry) => !favorites.has(entry.id)
  );
  const displayEntries = [...favoriteEntries, ...regularEntries];

  const togglePasswordVisibility = (entryId: string) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(entryId)) {
      newVisible.delete(entryId);
    } else {
      newVisible.add(entryId);
      // Auto-hide after 10 seconds
      setTimeout(() => {
        setVisiblePasswords((prev) => {
          const updated = new Set(prev);
          updated.delete(entryId);
          return updated;
        });
      }, 10000);
    }
    setVisiblePasswords(newVisible);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Auto-clear clipboard after 30 seconds for security
      setTimeout(() => {
        navigator.clipboard.writeText("");
      }, 30000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const toggleFavorite = (entryId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(entryId)) {
      newFavorites.delete(entryId);
    } else {
      newFavorites.add(entryId);
    }
    setFavorites(newFavorites);
  };

  const handleAddEntry = (
    entryData: Omit<PasswordEntry, "id" | "createdAt" | "updatedAt">
  ) => {
    onAddEntry(entryData);
    setShowAddForm(false);
  };

  const handleUpdateEntry = (
    entryData: Omit<PasswordEntry, "id" | "createdAt" | "updatedAt">
  ) => {
    if (editingEntry) {
      onUpdateEntry({ ...editingEntry, ...entryData, updatedAt: new Date() });
      setEditingEntry(null);
    }
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "15:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getProgressPercentage = () => {
    if (timeRemaining === null) return 0;
    return ((autoLockTime * 60 - timeRemaining) / (autoLockTime * 60)) * 100;
  };

  return (
    <div
      className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col backdrop-blur-xl border border-slate-800/50 shadow-2xl"
      style={{ zIndex: 9999 }}
    >
      {/* Header with enhanced glassmorphism and controls */}
      <div className="relative">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-pink-600/20 animate-pulse"></div>

        <div className="relative bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-blue-900/80 backdrop-blur-xl border-b border-slate-700/30 drag-region shadow-2xl">
          {/* Title Section */}
          <div className="p-4 pb-3 flex items-center justify-between">
            <div className="flex items-center space-x-3 group">
              <div className="relative p-2.5 bg-gradient-to-br from-blue-500/30 to-cyan-500/20 rounded-xl border border-blue-400/40 shadow-lg transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-blue-500/25">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-xl animate-pulse"></div>
                <Lock className="relative w-5 h-5 text-blue-300 drop-shadow-sm" />
              </div>
              <div className="transform transition-transform duration-300 group-hover:translate-x-1">
                <span className="text-sm font-bold text-white tracking-wide drop-shadow-sm">
                  Password Vault
                </span>
                <p className="text-xs text-slate-300 font-medium">Secure Access Panel</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 no-drag">
              {/* Enhanced Auto-lock timer */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg blur-sm animate-pulse"></div>
                <div className="relative flex items-center space-x-2 bg-slate-800/60 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-orange-500/30 shadow-lg">
                  <Clock className="w-3.5 h-3.5 text-orange-400 drop-shadow-sm" />
                  <span className="text-xs font-semibold text-slate-200">
                    {formatTime(timeRemaining)}
                  </span>
                  <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 transition-all duration-1000 ease-out rounded-full shadow-sm"
                      style={{ width: `${getProgressPercentage()}%` }}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={onMaximize}
                className="relative group p-2 text-slate-400 hover:text-white hover:bg-gradient-to-br hover:from-blue-600/30 hover:to-purple-600/30 rounded-xl transition-all duration-300 border border-slate-600/30 hover:border-blue-400/50 shadow-lg hover:shadow-xl hover:shadow-blue-500/20 transform hover:scale-105"
                title="Maximize"
              >
                <Maximize2 className="w-4 h-4 transform transition-transform duration-300 group-hover:rotate-12" />
              </button>
            </div>
          </div>

          {/* Controls Section */}
          <div className="px-4 pb-4 flex items-center space-x-3 no-drag">
            <div className="flex items-center space-x-2">
              <button
                onClick={onExport}
                className="group relative px-3 py-1.5 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/40 hover:to-teal-600/40 border border-emerald-500/30 hover:border-emerald-400/50 rounded-lg text-xs font-medium text-emerald-300 hover:text-emerald-200 transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 transform hover:scale-105 flex items-center space-x-1.5"
                title="Export"
              >
                <Download className="w-3.5 h-3.5 transform transition-transform duration-300 group-hover:translate-y-0.5" />
                <span>Export</span>
              </button>
              <button
                onClick={onImport}
                className="group relative px-3 py-1.5 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/40 hover:to-indigo-600/40 border border-blue-500/30 hover:border-blue-400/50 rounded-lg text-xs font-medium text-blue-300 hover:text-blue-200 transition-all duration-300 shadow-lg hover:shadow-blue-500/25 transform hover:scale-105 flex items-center space-x-1.5"
                title="Import"
              >
                <FileText className="w-3.5 h-3.5 transform transition-transform duration-300 group-hover:translate-y-0.5" />
                <span>Import</span>
              </button>
            </div>

            {/* Enhanced Search Bar */}
            <div className="flex-1 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 group-hover:text-blue-300 w-4 h-4 transition-all duration-300" />
              <input
                type="text"
                placeholder="Quick Search..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="relative w-full pl-10 pr-10 py-2.5 bg-slate-800/60 backdrop-blur-sm border border-slate-600/50 hover:border-slate-500/50 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 rounded-xl text-white placeholder-slate-400 focus:placeholder-slate-500 transition-all duration-300 text-sm font-medium shadow-lg"
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg p-1 transition-all duration-300"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Category Pills */}
      <div className="relative group bg-gradient-to-r from-slate-800/40 via-slate-700/30 to-slate-800/40 backdrop-blur-sm border-b border-slate-700/40 no-drag">
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        <div className="relative p-3">
          <div
            className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`group/category flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-300 no-drag border flex-shrink-0 transform hover:scale-105 ${selectedCategory === category.id
                    ? "bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-600 text-white border-blue-400/50 shadow-lg shadow-blue-500/25 ring-2 ring-blue-400/30"
                    : "bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border-slate-600/50 hover:border-slate-500/50 hover:shadow-lg hover:shadow-slate-500/20"
                  }`}
              >
                <CategoryIcon
                  name={category.icon}
                  size={14}
                  className={`transform transition-all duration-300 ${selectedCategory === category.id
                      ? "text-white drop-shadow-sm scale-110"
                      : "text-slate-400 group-hover/category:text-slate-200 group-hover/category:scale-110"
                    }`}
                />
                <span className="max-w-[70px] truncate font-medium">{category.name}</span>
                {selectedCategory === category.id && (
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                )}
              </button>
            ))}
          </div>

          {/* Enhanced fade gradient with subtle animation */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-800/80 via-slate-800/40 to-transparent pointer-events-none animate-pulse"></div>
        </div>
      </div>

      {/* Enhanced Entries List */}
      <div className="flex-1 overflow-y-auto no-drag bg-gradient-to-b from-slate-900/10 via-slate-900/20 to-slate-900/30">
        <div className="p-4 space-y-3">
          {regularEntries.slice(0, 8).map((entry, index) => (
            <EntryItem
              key={entry.id}
              entry={entry}
              categories={categories}
              visiblePasswords={visiblePasswords}
              favorites={favorites}
              onTogglePassword={togglePasswordVisibility}
              onCopy={copyToClipboard}
              onToggleFavorite={toggleFavorite}
              onEdit={setEditingEntry}
              onDelete={onDeleteEntry}
              index={index}
            />
          ))}

          {displayEntries.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-xl animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-700/40 backdrop-blur-sm rounded-3xl p-10 border border-slate-600/30 shadow-2xl">
                  <div className="relative p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl w-fit mx-auto mb-6 border border-blue-400/30 shadow-lg">
                    <Search className="w-16 h-16 text-blue-300 drop-shadow-sm" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">No passwords found</h3>
                  <p className="text-sm text-slate-300 mb-2 max-w-xs mx-auto">
                    Try adjusting your search or category filter
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    or add a new password to get started
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Footer Actions */}
      <div className="relative group bg-gradient-to-r from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl border-t border-slate-700/40 no-drag shadow-2xl">
        {/* Ambient glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        <div className="relative p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="group/btn relative flex items-center space-x-2.5 px-5 py-3 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-600 hover:from-blue-700 hover:via-blue-600 hover:to-cyan-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/30 transform hover:scale-105 no-drag border border-blue-400/40 hover:border-blue-300/50"
              title="Add New Password"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
              <Plus className="relative w-4 h-4 transform transition-transform duration-300 group-hover/btn:rotate-90" />
              <span className="relative text-sm font-bold">Add Account</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={onExport}
                className="group/icon relative p-3 text-slate-400 hover:text-emerald-400 hover:bg-gradient-to-br hover:from-emerald-600/20 hover:to-teal-600/20 rounded-xl transition-all duration-300 border border-slate-600/40 hover:border-emerald-500/40 shadow-lg hover:shadow-emerald-500/20 transform hover:scale-110 no-drag"
                title="Export Vault"
              >
                <Download className="w-4 h-4 transform transition-transform duration-300 group-hover/icon:translate-y-0.5" />
              </button>

              <button
                onClick={onLock}
                className="group/icon relative p-3 text-slate-400 hover:text-red-400 hover:bg-gradient-to-br hover:from-red-600/20 hover:to-pink-600/20 rounded-xl transition-all duration-300 border border-slate-600/40 hover:border-red-500/40 shadow-lg hover:shadow-red-500/20 transform hover:scale-110 no-drag"
                title="Lock Vault"
              >
                <Lock className="w-4 h-4 transform transition-transform duration-300 group-hover/icon:scale-110" />
              </button>
            </div>
          </div>

          <div className="relative group/counter">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg blur-sm opacity-0 group-hover/counter:opacity-100 transition-opacity duration-300"></div>
            <div className="relative px-4 py-2 bg-slate-800/60 backdrop-blur-sm rounded-lg border border-slate-600/40 group-hover/counter:border-blue-400/50 transition-all duration-300">
              <div className="text-sm font-bold text-slate-200 group-hover/counter:text-blue-300 transition-colors duration-300">
                {displayEntries.length}
              </div>
              <div className="text-xs text-slate-400 group-hover/counter:text-blue-400 transition-colors duration-300">
                {displayEntries.length === 1 ? "entry" : "entries"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Add/Edit Form Modal */}
      {(showAddForm || editingEntry) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-600/50 shadow-2xl">
            <EntryForm
              entry={editingEntry}
              categories={categories}
              onSubmit={editingEntry ? handleUpdateEntry : handleAddEntry}
              onCancel={() => {
                setShowAddForm(false);
                setEditingEntry(null);
              }}
              onDelete={
                editingEntry
                  ? () => {
                    onDeleteEntry(editingEntry.id);
                    setEditingEntry(null);
                  }
                  : undefined
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Entry Item Component
interface EntryItemProps {
  entry: PasswordEntry;
  categories: Category[];
  visiblePasswords: Set<string>;
  favorites: Set<string>;
  onTogglePassword: (id: string) => void;
  onCopy: (text: string) => void;
  onToggleFavorite: (id: string) => void;
  onEdit: (entry: PasswordEntry) => void;
  onDelete: (id: string) => void;
  index?: number;
}

const EntryItem: React.FC<EntryItemProps> = ({
  entry,
  categories,
  visiblePasswords,
  onTogglePassword,
  onCopy,
  onEdit,
  onDelete,
  index = 0,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const category = categories.find((c) => c.id === entry.category);
  const isPasswordVisible = visiblePasswords.has(entry.id);

  const handleDelete = () => {
    onDelete(entry.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div
      className="group relative bg-gradient-to-br from-slate-800/60 via-slate-800/40 to-slate-700/50 backdrop-blur-md rounded-2xl p-5 mb-4 border border-slate-600/40 hover:border-slate-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 transform hover:scale-[1.02] hover:-translate-y-1"
      style={{
        animationDelay: `${index * 100}ms`,
        animation: 'slideInUp 0.6s ease-out forwards'
      }}
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      <div className="relative">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            {category && (
              <div className="relative group/category">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-cyan-500/20 rounded-xl blur-sm group-hover/category:blur-md transition-all duration-300"></div>
                <div className="relative p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-xl border border-blue-400/40 shadow-lg group-hover/category:shadow-blue-500/25 transform transition-all duration-300 group-hover/category:scale-110">
                  <CategoryIcon
                    name={category.icon}
                    size={18}
                    className="text-blue-300 drop-shadow-sm"
                  />
                </div>
              </div>
            )}
            <div className="min-w-0 flex-1 transform transition-transform duration-300 group-hover:translate-x-2">
              <h4 className="font-bold text-white text-base mb-2 truncate group-hover:text-blue-200 transition-colors duration-300">
                {entry.accountName}
              </h4>
              <p className="text-slate-300 text-sm truncate flex items-center font-medium">
                <div className="relative">
                  <span className="absolute inset-0 bg-green-400 rounded-full blur-md opacity-60 animate-pulse"></span>
                  <span className="relative w-2.5 h-2.5 bg-green-400 rounded-full mr-3 shadow-lg shadow-green-400/50"></span>
                </div>
                {entry.username}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 opacity-70 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-2">
            <button
              onClick={() => onEdit(entry)}
              className="group/btn relative p-2.5 text-slate-400 hover:text-blue-400 hover:bg-gradient-to-br hover:from-blue-600/20 hover:to-blue-500/20 rounded-xl transition-all duration-300 border border-transparent hover:border-blue-400/40 shadow-lg hover:shadow-blue-500/20 transform hover:scale-110 hover:rotate-12"
              title="Edit entry"
            >
              <Edit3 className="w-4 h-4 transform transition-transform duration-300 group-hover/btn:rotate-12" />
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="group/btn relative p-2.5 text-slate-400 hover:text-red-400 hover:bg-gradient-to-br hover:from-red-600/20 hover:to-pink-600/20 rounded-xl transition-all duration-300 border border-transparent hover:border-red-400/40 shadow-lg hover:shadow-red-500/20 transform hover:scale-110 hover:rotate-12"
              title="Delete entry"
            >
              <Trash2 className="w-4 h-4 transform transition-transform duration-300 group-hover/btn:rotate-12" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Enhanced Password Field */}
          <div className="group/field relative bg-gradient-to-br from-slate-800/50 to-slate-700/40 rounded-xl p-4 border border-slate-600/40 hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <label className="text-slate-300 text-xs font-bold uppercase tracking-wider flex items-center">
                <div className="w-1 h-1 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                Password
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onTogglePassword(entry.id)}
                  className="group/icon relative p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all duration-300 transform hover:scale-110"
                  title={isPasswordVisible ? "Hide password" : "Show password"}
                >
                  {isPasswordVisible ? (
                    <EyeOff className="w-4 h-4 transform transition-transform duration-300 group-hover/icon:scale-110" />
                  ) : (
                    <Eye className="w-4 h-4 transform transition-transform duration-300 group-hover/icon:scale-110" />
                  )}
                </button>
                <button
                  onClick={() => onCopy(entry.password)}
                  className="group/icon relative p-2 text-slate-400 hover:text-green-400 hover:bg-green-500/20 rounded-lg transition-all duration-300 transform hover:scale-110"
                  title="Copy password"
                >
                  <Copy className="w-4 h-4 transform transition-transform duration-300 group-hover/icon:scale-110" />
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg blur-sm"></div>
              <div className="relative text-sm font-medium text-white bg-slate-900/60 backdrop-blur-sm rounded-lg px-4 py-3 border border-slate-700/40 font-mono">
                {isPasswordVisible ? entry.password : "••••••••••••"}
              </div>
            </div>
          </div>

          {/* Enhanced Username Field */}
          <div className="group/field relative bg-gradient-to-br from-slate-800/50 to-slate-700/40 rounded-xl p-4 border border-slate-600/40 hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <label className="text-slate-300 text-xs font-bold uppercase tracking-wider flex items-center">
                <div className="w-1 h-1 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                Username
              </label>
              <button
                onClick={() => onCopy(entry.username)}
                className="group/icon relative p-2 text-slate-400 hover:text-green-400 hover:bg-green-500/20 rounded-lg transition-all duration-300 transform hover:scale-110"
                title="Copy username"
              >
                <Copy className="w-4 h-4 transform transition-transform duration-300 group-hover/icon:scale-110" />
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg blur-sm"></div>
              <div className="relative text-sm font-medium text-white bg-slate-900/60 backdrop-blur-sm rounded-lg px-4 py-3 border border-slate-700/40 truncate">
                {entry.username}
              </div>
            </div>
          </div>

          {/* Enhanced Account Details */}
          {entry.balance && (
            <div className="group/field relative bg-gradient-to-br from-blue-900/30 to-indigo-900/30 rounded-xl p-4 border border-blue-600/40 hover:border-blue-400/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/20">
              <label className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-3 block flex items-center">
                <div className="w-1 h-1 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                Account Details
              </label>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg blur-sm"></div>
                <div className="relative text-sm font-medium text-blue-100 bg-blue-900/40 backdrop-blur-sm rounded-lg px-4 py-3 border border-blue-700/40">
                  {entry.balance}
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Notes */}
          {entry.notes && (
            <div className="group/field relative bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-600/40 hover:border-purple-400/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-purple-500/20">
              <label className="text-purple-200 text-xs font-bold uppercase tracking-wider mb-3 block flex items-center">
                <div className="w-1 h-1 bg-purple-400 rounded-full mr-2 animate-pulse"></div>
                Notes
              </label>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg blur-sm"></div>
                <div className="relative text-sm font-medium text-purple-100 bg-purple-900/40 backdrop-blur-sm rounded-lg px-4 py-3 border border-purple-700/40">
                  {entry.notes}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 w-full max-w-md border border-slate-600/50 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 via-pink-600/10 to-orange-600/10 rounded-3xl blur-xl"></div>
            <div className="relative text-center">
              <div className="relative p-4 bg-gradient-to-br from-red-500/30 to-pink-500/20 rounded-2xl w-fit mx-auto mb-6 border border-red-400/40 shadow-xl shadow-red-500/25">
                <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-pink-400/20 rounded-2xl animate-pulse"></div>
                <Trash2 className="relative w-8 h-8 text-red-300 drop-shadow-sm" />
              </div>

              <h3 className="text-white font-bold text-xl mb-3">
                Delete Account
              </h3>

              <p className="text-slate-300 text-sm mb-8 leading-relaxed">
                Are you sure you want to delete "
                <span className="text-red-400 font-bold">
                  {entry.accountName}
                </span>
                "? This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-slate-600/50 to-slate-700/50 hover:from-slate-600 hover:to-slate-700 text-white rounded-2xl font-bold transition-all duration-300 text-sm border border-slate-500/50 hover:border-slate-400/50 transform hover:scale-105 shadow-lg"
                >
                  Cancel
                </button>

                <button
                  onClick={handleDelete}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-red-600 via-red-500 to-pink-600 hover:from-red-700 hover:via-red-600 hover:to-pink-700 text-white rounded-2xl font-bold transition-all duration-300 text-sm shadow-xl shadow-red-500/30 transform hover:scale-105"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
