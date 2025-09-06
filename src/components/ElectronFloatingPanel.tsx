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
  const [timeRemaining, setTimeRemaining] = useState(autoLockTime * 60);
  const [positionLoaded, setPositionLoaded] = useState(false);

  // Load and set window position on component mount
  useEffect(() => {
    const initializeFloatingPanel = async () => {
      if (window.electronAPI && window.electronAPI.setAlwaysOnTop) {
        await window.electronAPI.setAlwaysOnTop(true);
      }

      // Then load position if available
      if (window.electronAPI && window.electronAPI.getFloatingPanelPosition) {
        const position = await window.electronAPI.getFloatingPanelPosition();
        if (
          position &&
          typeof position.x === "number" &&
          typeof position.y === "number"
        ) {
          setPositionLoaded(true);
        }
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
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          onLock();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onLock]);

  // Reset timer on user activity
  useEffect(() => {
    const resetTimer = () => {
      setTimeRemaining(autoLockTime * 60);
    };

    document.addEventListener("mousedown", resetTimer);
    document.addEventListener("keydown", resetTimer);

    return () => {
      document.removeEventListener("mousedown", resetTimer);
      document.removeEventListener("keydown", resetTimer);
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getProgressPercentage = () => {
    return ((autoLockTime * 60 - timeRemaining) / (autoLockTime * 60)) * 100;
  };

  return (
    <div
      className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col backdrop-blur-xl border border-slate-800/50 shadow-2xl"
      style={{ zIndex: 9999 }}
    >
      {/* Header with gradient and enhanced controls */}
      <div className="bg-gradient-to-r from-slate-800/80 via-slate-800/60 to-blue-900/40 backdrop-blur-md border-b border-slate-700/50 p-4 flex items-center justify-between drag-region shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30 shadow-inner">
            <Lock className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white">
              Password Vault
            </span>
            <p className="text-xs text-slate-400">Secure Access Panel</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 no-drag">
          {/* Enhanced Auto-lock timer */}
          <div className="flex items-center space-x-2 bg-slate-800/50 rounded-lg px-3 py-1.5 border border-slate-700/50">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs  text-slate-300">
              {formatTime(timeRemaining)}
            </span>
            <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-1000 rounded-full"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>

          <button
            onClick={onMaximize}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 border border-transparent hover:border-slate-600/50 no-drag"
            title="Maximize"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Enhanced Search Bar */}
      <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/20 to-slate-700/20 no-drag">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 w-4 h-4 transition-colors" />
          <input
            type="text"
            placeholder="Quick Search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm backdrop-blur-sm no-drag"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-md p-1 transition-all no-drag"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Compact Category Pills */}
      <div className="p-2 border-b border-slate-700/50 bg-slate-800/20 no-drag relative">
        <div
          className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 no-drag border flex-shrink-0 ${
                selectedCategory === category.id
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-400/30 shadow-md"
                  : "bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border-slate-600/40"
              }`}
            >
              <CategoryIcon
                name={category.icon}
                size={12}
                className={
                  selectedCategory === category.id
                    ? "text-white"
                    : "text-slate-400"
                }
              />
              <span className="max-w-[60px] truncate">{category.name}</span>
            </button>
          ))}
        </div>
        {/* Subtle fade gradient on the right edge */}
        <div className="absolute right-2 top-0 bottom-0 w-4 bg-gradient-to-l from-slate-800/20 to-transparent pointer-events-none"></div>
      </div>

      {/* Enhanced Entries List */}
      <div className="flex-1 overflow-y-auto no-drag bg-gradient-to-b from-transparent to-slate-900/20">
        <div className="p-4 space-y-2">
          {regularEntries.slice(0, 8).map((entry) => (
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
            />
          ))}

          {displayEntries.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <div className="bg-slate-800/30 rounded-2xl p-8 border border-slate-700/30">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-40" />
                <p className="text-sm font-medium mb-2">No passwords found</p>
                <p className="text-xs opacity-60">
                  Try adjusting your search or add a new password
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Footer Actions */}
      <div className="bg-gradient-to-r from-slate-800/60 via-slate-800/40 to-slate-700/60 backdrop-blur-md border-t border-slate-700/50 p-4 flex items-center justify-between no-drag shadow-2xl">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/25 no-drag border border-blue-400/30"
            title="Add New Password"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Account</span>
          </button>

          <button
            onClick={onExport}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 border border-slate-600/30 hover:border-slate-500/50 no-drag"
            title="Export Vault"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={onLock}
            className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 border border-slate-600/30 hover:border-red-500/30 no-drag"
            title="Lock Vault"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-slate-500 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/30">
          {displayEntries.length}{" "}
          {displayEntries.length === 1 ? "entry" : "entries"}
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

// Entry Item Component
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
}

const EntryItem: React.FC<EntryItemProps> = ({
  entry,
  categories,
  visiblePasswords,
  onTogglePassword,
  onCopy,
  onEdit,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const category = categories.find((c) => c.id === entry.category);
  const isPasswordVisible = visiblePasswords.has(entry.id);

  const handleDelete = () => {
    onDelete(entry.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-700/40 backdrop-blur-sm rounded-xl p-4 mb-3 border border-slate-600/30 hover:border-slate-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {category && (
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30">
              <CategoryIcon
                name={category.icon}
                size={16}
                className="text-blue-400"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-white text-sm mb-1 truncate">
              {entry.accountName}
            </h4>
            <p className="text-slate-400 text-xs truncate flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              {entry.username}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => onEdit(entry)}
            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all duration-200"
            title="Edit entry"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all duration-200"
            title="Delete entry"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Password Field */}
        <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50 hover:border-slate-600/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">
              Password
            </label>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onTogglePassword(entry.id)}
                className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded-md transition-all"
                title={isPasswordVisible ? "Hide password" : "Show password"}
              >
                {isPasswordVisible ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => onCopy(entry.password)}
                className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-slate-700/50 rounded-md transition-all"
                title="Copy password"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className=" text-sm text-white bg-slate-900/50 rounded px-3 py-2 border border-slate-700/30">
            {isPasswordVisible ? entry.password : "••••••••••••"}
          </div>
        </div>

        {/* Username Field */}
        <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50 hover:border-slate-600/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">
              Username
            </label>
            <button
              onClick={() => onCopy(entry.username)}
              className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-slate-700/50 rounded-md transition-all"
              title="Copy username"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-sm text-white bg-slate-900/50 rounded px-3 py-2 border border-slate-700/30 truncate">
            {entry.username}
          </div>
        </div>

        {/* Account Details */}
        {entry.balance && (
          <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 rounded-lg p-3 border border-blue-700/30">
            <label className="text-blue-300 text-xs font-medium uppercase tracking-wider mb-2 block">
              Account Details
            </label>
            <div className="text-sm text-blue-100 bg-blue-900/30 rounded px-3 py-2 border border-blue-700/30">
              {entry.balance}
            </div>
          </div>
        )}

        {/* Notes */}
        {entry.notes && (
          <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 rounded-lg p-3 border border-blue-700/30">
            <label className="text-blue-300 text-xs font-medium uppercase tracking-wider mb-2 block">
              Notes
            </label>
            <div className="text-sm text-blue-100 bg-blue-900/30 rounded px-3 py-2 border border-blue-700/30">
              {entry.notes}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-600/50 shadow-2xl">
            <div className="text-center">
              <div className="p-3 bg-red-500/20 rounded-full w-fit mx-auto mb-4 border border-red-500/30">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>

              <h3 className="text-white font-bold text-lg mb-2">
                Delete Account
              </h3>

              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Are you sure you want to delete "
                <span className="text-white font-medium">
                  {entry.accountName}
                </span>
                "? This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 bg-slate-600/50 hover:bg-slate-600 text-white rounded-xl font-medium transition-all text-sm border border-slate-500/50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl font-medium transition-all text-sm shadow-lg"
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
