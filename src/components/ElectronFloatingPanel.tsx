import React, { useState, useEffect } from "react";
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
  Star,
  StarOff,
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
  useEffect(() => {
    const stored = localStorage.getItem("floating_panel_favorites");
    if (stored) {
      try {
        setFavorites(new Set(JSON.parse(stored)));
      } catch (error) {
        console.error("Failed to parse favorites:", error);
      }
    }
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem(
      "floating_panel_favorites",
      JSON.stringify([...favorites])
    );
  }, [favorites]);

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.notes || "").toLowerCase().includes(searchTerm.toLowerCase());

    // If there's a search term, search across all categories
    // If no search term, filter by selected category
    if (searchTerm.trim()) {
      return matchesSearch;
    } else {
      const matchesCategory =
        selectedCategory === "all" || entry.category === selectedCategory;
      return matchesCategory;
    }
  });

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
      className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col"
      style={{ zIndex: 9999, backgroundColor: "#0f172a" }}
    >
      {/* Header with controls */}
      <div className="bg-slate-800/50 border-b border-slate-700 p-3 flex items-center justify-between drag-region">
        <div className="flex items-center space-x-2">
          <Lock className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Password Vault</span>
        </div>

        <div className="flex items-center space-x-1 no-drag">
          {/* Auto-lock timer */}
          <div className="flex items-center space-x-1 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            <span>{formatTime(timeRemaining)}</span>
            <div className="w-8 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-1000"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>

          <button
            onClick={onMaximize}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-all no-drag"
            title="Maximize"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-slate-700 no-drag">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400 w-3 h-3" />
          <input
            type="text"
            placeholder="Quick search..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 bg-slate-800/50 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all text-xs no-drag"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors no-drag"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Category Quick Filters */}
      <div className="p-2 border-b border-slate-700 no-drag">
        <div className="flex space-x-1 overflow-x-auto">
          {categories.slice(0, 6).map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs whitespace-nowrap transition-all no-drag ${
                selectedCategory === category.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
              }`}
            >
              <CategoryIcon name={category.icon} size={12} />
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto no-drag">
        {favoriteEntries.length > 0 && (
          <div className="p-2 border-b border-slate-700/50">
            <div className="text-xs text-slate-400 mb-2 flex items-center">
              <Star className="w-3 h-3 mr-1" />
              Favorites
            </div>
            {favoriteEntries.slice(0, 5).map((entry) => (
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
          </div>
        )}

        <div className="p-2">
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
            <div className="text-center py-6 text-slate-400">
              <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No passwords found</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="bg-slate-800/30 border-t border-slate-700 p-2 flex items-center justify-between no-drag">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowAddForm(true)}
            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-all no-drag"
            title="Add Password"
          >
            <Plus className="w-3 h-3" />
          </button>

          <button
            onClick={onExport}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-all no-drag"
            title="Export"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>

        <button
          onClick={onLock}
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-all no-drag"
          title="Lock Vault"
        >
          <Lock className="w-3 h-3" />
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingEntry) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
  favorites,
  onTogglePassword,
  onCopy,
  onToggleFavorite,
  onEdit,
  onDelete,
}) => {
  const category = categories.find((c) => c.id === entry.category);
  const isPasswordVisible = visiblePasswords.has(entry.id);
  const isFavorite = favorites.has(entry.id);

  return (
    <div className="bg-slate-800/30 rounded-lg p-2 mb-2 hover:bg-slate-700/30 transition-all group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {category && (
            <CategoryIcon
              name={category.icon}
              size={14}
              className="text-blue-400 flex-shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-white truncate text-xs">
              {entry.accountName}
            </h4>
            <p className="text-slate-400 truncate text-xs">{entry.username}</p>
          </div>
        </div>

        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onToggleFavorite(entry.id)}
            className="p-1 text-slate-400 hover:text-yellow-400 transition-colors"
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? (
              <Star className="w-3 h-3 fill-current" />
            ) : (
              <StarOff className="w-3 h-3" />
            )}
          </button>

          <button
            onClick={() => onEdit(entry)}
            className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
            title="Edit"
          >
            <Edit3 className="w-3 h-3" />
          </button>

          <button
            onClick={() => onDelete(entry.id)}
            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-xs">Password</span>
          <div className="flex items-center space-x-1">
            <span className="text-slate-300 font-mono text-xs">
              {isPasswordVisible ? entry.password : "••••••••"}
            </span>
            <button
              onClick={() => onTogglePassword(entry.id)}
              className="p-0.5 text-slate-400 hover:text-white transition-colors"
              title={isPasswordVisible ? "Hide password" : "Show password"}
            >
              {isPasswordVisible ? (
                <EyeOff className="w-3 h-3" />
              ) : (
                <Eye className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={() => onCopy(entry.password)}
              className="p-0.5 text-slate-400 hover:text-white transition-colors"
              title="Copy password"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-xs">Username</span>
          <div className="flex items-center space-x-1">
            <span className="text-slate-300 font-mono text-xs truncate max-w-24">
              {entry.username}
            </span>
            <button
              onClick={() => onCopy(entry.username)}
              className="p-0.5 text-slate-400 hover:text-white transition-colors"
              title="Copy username"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>

        {entry.balance && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs">Account Details</span>
            <span className="text-slate-300 font-mono text-xs">
              {entry.balance}
            </span>
          </div>
        )}

        {entry.notes && (
          <div className="pt-1 border-t border-slate-700/50">
            <p className="text-slate-400 text-xs truncate">{entry.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};
