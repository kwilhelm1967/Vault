import React, { useState, useEffect, useRef } from "react";
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
import { devError } from "../utils/devLog";
import { CategoryIcon } from "./CategoryIcon";
import { EntryForm } from "./EntryForm";

// Define constant for floating panel styles
const FLOATING_PANEL_STYLES = {
  zIndex: 9999,
  position: "fixed",
  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
  willChange: "transform",
  transform: "translateZ(0)",
  backfaceVisibility: "hidden",
  perspective: 1000,
  isolation: "isolate",
} as const;

interface FloatingPanelProps {
  entries: PasswordEntry[];
  categories: Category[];
  onAddEntry: (
    entry: Omit<PasswordEntry, "id" | "createdAt" | "updatedAt">
  ) => Promise<void>;
  onUpdateEntry: (entry: PasswordEntry) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onLock: () => void;
  onExport: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onMaximize: () => void;
}

// Main component
export const FloatingPanel: React.FC<FloatingPanelProps> = ({
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
  // State variables with explicit types
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(
    new Set()
  );
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [autoLockTime] = useState<number>(15);
  const [timeRemaining, setTimeRemaining] = useState<number>(autoLockTime * 60);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 20,
    y: 20,
  });
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [lastPosition, setLastPosition] = useState<{ x: number; y: number }>({
    x: 20,
    y: 20,
  });
  const [positionLoaded, setPositionLoaded] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Keep track of window dimensions
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

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
        devError("Failed to parse favorites:", error);
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

  // Load panel position from localStorage
  useEffect(() => {
    const storedPosition = localStorage.getItem("floating_panel_position");
    if (storedPosition && !positionLoaded && !isInitialized) {
      try {
        const savedPosition = JSON.parse(storedPosition);
        // Validate position is within screen bounds before applying
        const validX = Math.max(
          0,
          Math.min(window.innerWidth - 300, savedPosition.x)
        );
        const validY = Math.max(
          0,
          Math.min(window.innerHeight - 300, savedPosition.y)
        );
        const validatedPosition = { x: validX, y: validY };
        setPosition(validatedPosition);
        setLastPosition(validatedPosition);
        setPositionLoaded(true);
        setIsInitialized(true);
      } catch (error) {
        devError("FloatingPanel position load failed:", error);
        setIsInitialized(true);
      }
    }
  }, [
    positionLoaded,
    isDragging,
    isInitialized,
    windowDimensions.width,
    windowDimensions.height,
  ]);

  // Save panel position to localStorage
  useEffect(() => {
    // Only save position when not dragging to avoid saving intermediate positions
    if (positionLoaded && !isDragging && !isMinimized && isInitialized) {
      localStorage.setItem("floating_panel_position", JSON.stringify(position));
      if (!isMinimized) {
        setLastPosition(position);
      }
    }
  }, [position, isDragging, isMinimized, positionLoaded, isInitialized]);

  // Update window dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Ensure panel stays within viewport bounds
  useEffect(() => {
    if (panelRef.current && !isMinimized) {
      try {
        const panel = panelRef.current;
        const rect = panel.getBoundingClientRect();

        let newX = position.x;
        let newY = position.y;

        // Check right edge
        if (newX + rect.width > windowDimensions.width) {
          newX = windowDimensions.width - rect.width;
        }

        // Check bottom edge
        if (newY + rect.height > windowDimensions.height) {
          newY = windowDimensions.height - rect.height;
        }

        // Check left edge
        if (newX < 0) {
          newX = 0;
        }

        // Check top edge
        if (newY < 0) {
          newY = 0;
        }

        // Update position if needed
        if (newX !== position.x || newY !== position.y) {
          setPosition({ x: newX, y: newY });
        }
      } catch (error) {
        devError("FloatingPanel drag position update failed:", error);
      }
    }
  }, [position, windowDimensions, isMinimized]);

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.username.toLowerCase().includes(searchTerm.toLowerCase());

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
      devError("Failed to copy to clipboard:", err);
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

  const handleAddEntry = async (
    entryData: Omit<PasswordEntry, "id" | "createdAt" | "updatedAt">
  ) => {
    await onAddEntry(entryData);
    setShowAddForm(false);
  };

  const handleUpdateEntry = async (
    entryData: Omit<PasswordEntry, "id" | "createdAt" | "updatedAt">
  ) => {
    if (editingEntry) {
      await onUpdateEntry({ ...editingEntry, ...entryData, updatedAt: new Date() });
      setEditingEntry(null);
    }
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      e.target === e.currentTarget ||
      (e.target as HTMLElement).classList.contains("drag-handle")
    ) {
      e.preventDefault();
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      
      // Safety timeout: reset isDragging after 10 seconds to prevent stuck state
      setTimeout(() => {
        setIsDragging(false);
      }, 10000);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      try {
        e.preventDefault();

        // Calculate new position
        let newX = e.clientX - dragOffset.x;
        let newY = e.clientY - dragOffset.y;

        // Ensure we have valid numbers
        if (isNaN(newX) || isNaN(newY)) {
          setIsDragging(false);
          return;
        }

        // Apply bounds checking for minimized state
        if (isMinimized) {
          // For minimized state, we just need to keep it on screen
          newX = Math.max(0, Math.min(windowDimensions.width - 50, newX));
          newY = Math.max(0, Math.min(windowDimensions.height - 50, newY));
        } else if (panelRef.current) {
          // For expanded state, ensure panel stays within viewport
          const rect = panelRef.current.getBoundingClientRect();

          // Check right edge
          if (newX + rect.width > windowDimensions.width) {
            newX = windowDimensions.width - rect.width;
          }

          // Check bottom edge
          if (newY + rect.height > windowDimensions.height) {
            newY = windowDimensions.height - rect.height;
          }

          // Check left edge
          if (newX < 0) {
            newX = 0;
          }

          // Check top edge
          if (newY < 0) {
            newY = 0;
          }
        }

        setPosition({ x: newX, y: newY });
      } catch (error) {
        devError("Error during drag:", error);
        setIsDragging(false);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    // Also stop dragging if mouse leaves window or window loses focus
    const handleMouseLeave = () => {
      setIsDragging(false);
    };
    
    const handleBlur = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("mouseleave", handleMouseLeave);
      window.addEventListener("blur", handleBlur);
      
      // Also add a contextmenu handler to stop drag on right-click
      const handleContextMenu = () => setIsDragging(false);
      document.addEventListener("contextmenu", handleContextMenu);
      
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("mouseleave", handleMouseLeave);
        window.removeEventListener("blur", handleBlur);
        document.removeEventListener("contextmenu", handleContextMenu);
      };
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isDragging, dragOffset]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getProgressPercentage = () => {
    return ((autoLockTime * 60 - timeRemaining) / (autoLockTime * 60)) * 100;
  };

  if (isMinimized) {
    return (
      <div
        className="fixed z-[9999] bg-slate-800 border border-slate-600 rounded-full p-3 cursor-move hover:bg-slate-700 shadow-lg"
        style={{ left: position.x, top: position.y }}
        onMouseDown={handleMouseDown}
      >
        <div
          className="w-5 h-5 flex items-center justify-center cursor-pointer"
          onClick={() => {
            setIsMinimized(false);
            setPosition(lastPosition);
          }}
        >
          <Lock className="w-5 h-5 text-blue-400" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        id="floating-panel"
        ref={panelRef}
        className="fixed bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-96 flex flex-col"
        style={{
          left: position.x,
          top: position.y,
          height: "600px",
          maxHeight: "85vh",
          ...FLOATING_PANEL_STYLES,
        }}
      >
        {/* Header */}
        <div
          className="drag-handle bg-slate-800 border-b border-slate-700 p-3 cursor-move flex items-center justify-between"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Mini Vault</span>
          </div>

          <div className="flex items-center space-x-1">
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
              onClick={() => setIsMinimized(true)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-all"
              title="Minimize"
            >
              <X className="w-3 h-3" />
            </button>

            <button
              onClick={onMaximize}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-all"
              title="Maximize"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-700 bg-slate-900">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400 w-3 h-3" />
            <input
              type="text"
              placeholder="Quick search..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 text-xs"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Category Quick Filters */}
        <div className="p-2 border-b border-slate-700 bg-slate-900">
          <div className="flex space-x-1 overflow-x-auto">
            {categories.slice(0, 6).map((category) => (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs whitespace-nowrap transition-all ${
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

        {/* Entries List - flex-1 to fill remaining space */}
        <div className="flex-1 overflow-y-auto bg-slate-900">
          {favoriteEntries.length > 0 && (
            <div className="p-2 border-b border-slate-700">
              <div className="text-xs text-slate-400 mb-2 flex items-center">
                <Star className="w-3 h-3 mr-1" />
                Favorites
              </div>
              {favoriteEntries.map((entry) => (
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
            {regularEntries.map((entry) => (
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
        <div className="bg-slate-800 border-t border-slate-700 p-2 flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowAddForm(true)}
              className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-all"
              title="Add Account"
            >
              <Plus className="w-3 h-3" />
            </button>

            <button
              onClick={onExport}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-all"
              title="Export"
            >
              <Download className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={onLock}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-all"
            title="Lock Vault"
          >
            <Lock className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingEntry) && (
        <div className="form-modal-backdrop" style={{ zIndex: 10000 }}>
          <div className="form-modal-content">
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
    </>
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
    <div className="bg-slate-800 rounded-lg p-2 mb-2 hover:bg-slate-700 group">
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
            <span className="text-slate-300  text-xs">
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
            <span className="text-slate-300  text-xs truncate max-w-24">
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
            <span className="text-slate-300  text-xs">{entry.balance}</span>
          </div>
        )}

        {entry.notes && (
          <div className="pt-1 border-t border-slate-700">
            <p className="text-slate-400 text-xs truncate">{entry.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};
