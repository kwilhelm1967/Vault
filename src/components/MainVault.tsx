import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Search,
  Plus,
  FileUp,
  FileDown,
  Lock,
  Minimize2,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Edit3,
  X,
  FileText,
  ChevronDown,
  ChevronRight,
  Check,
} from "lucide-react";
import { PasswordEntry, Category } from "../types";
import { CategoryIcon } from "./CategoryIcon";
import { EntryForm } from "./EntryForm";
import { TrialWarningBanner } from "./TrialWarningBanner";

interface MainVaultProps {
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
  onImport,
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
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(
    new Set()
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<PasswordEntry | null>(
    null
  );
  const [collapsedEntries, setCollapsedEntries] = useState<Set<string>>(
    new Set()
  );
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  console.log(entries, "entries");

  // Handle cross-window synchronization
  useEffect(() => {
    if (!window.electronAPI?.onEntriesChanged) return;

    const handleEntriesChanged = async () => {
      console.log("Main vault: Entries changed event received");
      // Trigger a reload through the parent component if available
      // This will be handled by the parent App.tsx component
    };

    window.electronAPI.onEntriesChanged(handleEntriesChanged);
    return () => {
      window.electronAPI?.removeEntriesChangedListener?.(handleEntriesChanged);
    };
  }, []);

  // Initialize all entries as collapsed by default
  useEffect(() => {
    const allEntryIds = new Set(entries.map(entry => entry.id));
    setCollapsedEntries(allEntryIds);
  }, [entries.length]); // Only update when entries array length changes

  // Handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const togglePasswordVisibility = (entryId: string) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(entryId)) {
      newVisible.delete(entryId);
    } else {
      newVisible.add(entryId);
    }
    setVisiblePasswords(newVisible);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const handleAddEntry = (
    entryData: Omit<PasswordEntry, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      onAddEntry(entryData);
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding entry:", error);
      // Keep the form open if there's an error
    }
  };

  const handleUpdateEntry = (
    entryData: Omit<PasswordEntry, "id" | "createdAt" | "updatedAt">
  ) => {
    if (editingEntry) {
      onUpdateEntry({ ...editingEntry, ...entryData, updatedAt: new Date() });
      setEditingEntry(null);
    }
  };

  const handleDeleteClick = (entry: PasswordEntry) => {
    setEntryToDelete(entry);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (entryToDelete) {
      onDeleteEntry(entryToDelete.id);
      setEntryToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const toggleCollapsed = (entryId: string) => {
    const newCollapsed = new Set(collapsedEntries);
    if (newCollapsed.has(entryId)) {
      newCollapsed.delete(entryId);
    } else {
      newCollapsed.add(entryId);
    }
    setCollapsedEntries(newCollapsed);
  };

  return (
    <div
      className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden"
      style={{ backgroundColor: "#0f172a" }}
    >
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-40 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div
                className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: "transparent",
                  boxShadow: "none",
                  border: "none",
                  outline: "none",
                }}
              >
                <Lock
                  className="w-4 h-4 text-white"
                  style={{
                    filter: "none",
                    backgroundColor: "transparent",
                    boxShadow: "none",
                    border: "none",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Local Password Vault
                </h1>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    const url = "https://localpasswordvault.com";
                    if (window.electronAPI) {
                      window.electronAPI.openExternal(url);
                    } else {
                      window.open("https://localpasswordvault.com", "_blank");
                    }
                  }}
                  className="text-xs text-slate-400 hover:underline cursor-pointer"
                >
                  by LocalPasswordVault.com
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={onExport}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                title="Export Vault"
              >
                <FileDown className="w-5 h-5" />
              </button>
              <button
                onClick={onImport}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                title="Import Vault"
              >
                <FileUp className="w-5 h-5" />
              </button>

              {onMinimize && (
                <button
                  onClick={onMinimize}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                  title="Minimize"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={onLock}
                className="p-2 mt-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                title="Lock Vault"
              >
                <Lock className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Trial Warning Banner */}
          {onShowPricingPlans && <TrialWarningBanner />}

          {/* Search and Controls */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => onSearchChange("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    title="Clear search"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm flex items-center justify-between text-left whitespace-nowrap min-w-[150px]"
                >
                  <span className={selectedCategory !== "all" ? "text-white" : "text-slate-400"}>
                    {selectedCategory !== "all"
                      ? categories.find(c => c.id === selectedCategory)?.name || "Select a category"
                      : "All Categories"
                    }
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${showCategoryDropdown ? 'rotate-180' : ''}`}
                  />
                </button>

                {showCategoryDropdown && (
                  <div className="absolute z-[9999] top-full left-0 mt-1 bg-slate-800 border border-slate-600/50 rounded-xl shadow-2xl max-h-60 overflow-y-auto whitespace-nowrap min-w-[200px]">
                    <div className="p-1">
                      <button
                        type="button"
                        onClick={() => {
                          onCategoryChange("all");
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm rounded-lg transition-all flex items-center justify-between ${
                          selectedCategory === "all"
                            ? "bg-blue-600/30 text-white"
                            : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                        }`}
                      >
                        <span>All Categories</span>
                        {selectedCategory === "all" && (
                          <Check className="w-3 h-3 text-blue-400" />
                        )}
                      </button>
                      {categories
                        .filter((c) => c.id !== "all")
                        .map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => {
                              onCategoryChange(category.id);
                              setShowCategoryDropdown(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm rounded-lg transition-all flex items-center justify-between ${
                              selectedCategory === category.id
                                ? "bg-blue-600/30 text-white"
                                : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                            }`}
                          >
                            <span>{category.name}</span>
                            {selectedCategory === category.id && (
                              <Check className="w-3 h-3 text-blue-400" />
                            )}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all transform hover:scale-105 flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Add Account</span>
              </button>
            </div>
          </div>

          {/* Entries Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredEntries.map((entry) => {
              const category = categories.find((c) => c.id === entry.category);
              const isPasswordVisible = visiblePasswords.has(entry.id);
              const isCollapsed = collapsedEntries.has(entry.id);

              return (
                <div
                  key={entry.id}
                  className="bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-900/40 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-4 hover:bg-gradient-to-br hover:from-slate-800/60 hover:via-slate-800/50 hover:to-slate-900/60 transition-all duration-300 group shadow-xl hover:shadow-2xl hover:border-slate-500/60 h-fit"
                >
                  {/* Header with gradient accent */}
                  <div className={`flex items-start justify-between ${!isCollapsed && "mb-5"}`}>
                    <div
                      className="flex items-center flex-1 min-w-0 cursor-pointer"
                      onClick={() => toggleCollapsed(entry.id)}
                    >
                      <button className="p-1 text-slate-400 hover:text-white transition-colors">
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {category && (
                        <div className="p-2 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl border border-blue-500/30">
                          <CategoryIcon
                            name={category.icon}
                            size={18}
                            className="text-blue-400"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 ml-2">
                        <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors text-base">
                          {entry.accountName}
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                          {entry.username}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 mt-2">
                      <button
                        onClick={() => setViewingEntry(entry)}
                        className="p-2 text-slate-400 hover:text-green-400 hover:bg-green-500/20 rounded-xl transition-all border border-transparent hover:border-green-500/30"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingEntry(entry)}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 rounded-xl transition-all border border-transparent hover:border-blue-500/30"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(entry)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded-xl transition-all border border-transparent hover:border-red-500/30"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Content with enhanced styling */}
                  {!isCollapsed && (
                    <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl border border-slate-600/30">
                      <span className="text-sm font-medium text-slate-300">
                        Username
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-white font-medium max-w-32 truncate">
                          {entry.username}
                        </span>
                        <button
                          onClick={() => copyToClipboard(entry.username)}
                          className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-slate-600/50 rounded-lg transition-all"
                          title="Copy username"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl border border-slate-600/30">
                      <span className="text-sm font-medium text-slate-300">
                        Password
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-white font-medium max-w-32 truncate">
                          {isPasswordVisible ? entry.password : "••••••••"}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(entry.id)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-600/50 rounded-lg transition-all"
                          title={
                            isPasswordVisible
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {isPasswordVisible ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(entry.password)}
                          className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-slate-600/50 rounded-lg transition-all"
                          title="Copy password"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {entry.balance && (
                      <div className="p-3 bg-gradient-to-r from-slate-700/20 to-slate-600/20 rounded-xl border border-slate-600/30">
                        <span className="text-xs font-medium text-slate-300 mb-2 block">
                          Account Details
                        </span>
                        <p className="text-sm text-slate-400 leading-relaxed">
                          {entry.balance}
                        </p>
                      </div>
                    )}

                    {entry.notes && (
                      <div className="p-3 bg-gradient-to-r from-slate-700/20 to-slate-600/20 rounded-xl border border-slate-600/30">
                        <span className="text-xs font-medium text-slate-300 mb-2 block">
                          Notes
                        </span>
                        <p className="text-sm text-slate-400 leading-relaxed">
                          {entry.notes}
                        </p>
                      </div>
                    )}
                  </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredEntries.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-800/60 to-slate-700/40 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-600/50 shadow-xl">
                <Search className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                No accounts found
              </h3>
              <p className="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                {searchTerm || selectedCategory !== "all"
                  ? "Try adjusting your search or filter criteria to find what you're looking for"
                  : "Get started by adding your first account to secure your credentials"}
              </p>
              {!searchTerm && selectedCategory === "all" && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl font-bold transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl border border-blue-500/30"
                >
                  Add Your First Account
                </button>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="py-6 text-center">
            <p className="text-xs text-slate-500">
              Local Password Management by{" "}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  const url = "https://localpasswordvault.com";
                  if (window.electronAPI) {
                    window.electronAPI.openExternal(url);
                  } else {
                    window.open("https://localpasswordvault.com", "_blank");
                  }
                }}
                className="text-xs text-slate-400 hover:underline cursor-pointer"
              >
                LocalPasswordVault.com
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && entryToDelete && (
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
                  {entryToDelete.accountName}
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
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl font-medium transition-all text-sm shadow-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-2xl p-6 w-full max-w-lg border border-slate-600/50 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl border border-blue-500/30">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">
                    {viewingEntry.accountName}
                  </h3>
                  <p className="text-slate-400 text-sm">Account Details</p>
                </div>
              </div>

              <button
                onClick={() => setViewingEntry(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {/* Account Name */}
              <div className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
                <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2 block">
                  Account Name
                </label>
                <div className="text-white font-medium text-lg">
                  {viewingEntry.accountName}
                </div>
              </div>

              {/* Username */}
              <div className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
                <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2 block">
                  Username
                </label>
                <div className="flex items-center justify-between">
                  <div className="text-white font-medium">
                    {viewingEntry.username}
                  </div>
                  <button
                    onClick={() => copyToClipboard(viewingEntry.username)}
                    className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-600/50 rounded-lg transition-all"
                    title="Copy username"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
                <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2 block">
                  Password
                </label>
                <div className="flex items-center justify-between">
                  <div className="text-white font-medium font-mono">
                    {visiblePasswords.has(viewingEntry.id)
                      ? viewingEntry.password
                      : "••••••••••••"}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => togglePasswordVisibility(viewingEntry.id)}
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-600/50 rounded-lg transition-all"
                      title={
                        visiblePasswords.has(viewingEntry.id)
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {visiblePasswords.has(viewingEntry.id) ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(viewingEntry.password)}
                      className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-600/50 rounded-lg transition-all"
                      title="Copy password"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Category */}
              <div className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
                <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2 block">
                  Category
                </label>
                <div className="flex items-center space-x-2">
                  {(() => {
                    const category = categories.find(
                      (c) => c.id === viewingEntry.category
                    );
                    return category ? (
                      <>
                        <CategoryIcon
                          name={category.icon}
                          size={16}
                          className="text-blue-400"
                        />
                        <span className="text-white font-medium">
                          {category.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400">Unknown Category</span>
                    );
                  })()}
                </div>
              </div>

              {/* Account Details */}
              {viewingEntry.balance && (
                <div className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
                  <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2 block">
                    Account Details
                  </label>
                  <div className="text-white font-medium">
                    {viewingEntry.balance}
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewingEntry.notes && (
                <div className="p-4 bg-gradient-to-r from-slate-700/20 to-slate-600/20 rounded-xl border border-slate-600/30">
                  <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2 block">
                    Notes
                  </label>
                  <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {viewingEntry.notes}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/30">
                  <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2 block">
                    Created
                  </label>
                  <div className="text-slate-300 text-sm">
                    {new Date(viewingEntry.createdAt).toLocaleDateString()} at{" "}
                    {new Date(viewingEntry.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/30">
                  <label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2 block">
                    Last Updated
                  </label>
                  <div className="text-slate-300 text-sm">
                    {new Date(viewingEntry.updatedAt).toLocaleDateString()} at{" "}
                    {new Date(viewingEntry.updatedAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700/50">
              <button
                onClick={() => {
                  setViewingEntry(null);
                  setEditingEntry(viewingEntry);
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-medium transition-all text-sm shadow-lg flex items-center justify-center space-x-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Account</span>
              </button>

              <button
                onClick={() => setViewingEntry(null)}
                className="px-6 py-3 bg-slate-600/50 hover:bg-slate-600 text-white rounded-xl font-medium transition-all text-sm border border-slate-500/50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingEntry) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
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
