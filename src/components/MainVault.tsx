import React, { useState } from "react";
import {
  Search,
  Plus,
  Download,
  Lock,
  Minimize2,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Edit3,
  X,
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
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onMinimize,
  onShowPricingPlans,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(
    new Set()
  );

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

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
      style={{ backgroundColor: "#0f172a" }}
    >
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-40">
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
                <p className="text-xs text-slate-400">
                  by LocalPasswordVault.com
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={onExport}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                title="Export Vault"
              >
                <Download className="w-5 h-5" />
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
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                title="Lock Vault"
              >
                <Lock className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Trial Warning Banner */}
        {onShowPricingPlans && (
          <TrialWarningBanner onPurchase={onShowPricingPlans} />
        )}

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

            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="px-4 py-3 bg-slate-900 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              <option value="all">All Categories</option>
              {categories
                .filter((c) => c.id !== "all")
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>

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

            return (
              <div
                key={entry.id}
                className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800/50 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {category && (
                      <CategoryIcon
                        name={category.icon}
                        size={20}
                        className="text-blue-400"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {entry.accountName}
                      </h3>
                      <p className="text-sm text-slate-400">{entry.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingEntry(entry)}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded-lg transition-all"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteEntry(entry.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Username</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-slate-300 font-mono">
                        {entry.username}
                      </span>
                      <button
                        onClick={() => copyToClipboard(entry.username)}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                        title="Copy username"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Password</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-slate-300 font-mono">
                        {isPasswordVisible ? entry.password : "••••••••"}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(entry.id)}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                        title={
                          isPasswordVisible ? "Hide password" : "Show password"
                        }
                      >
                        {isPasswordVisible ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(entry.password)}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                        title="Copy password"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {entry.balance && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">
                        Account Details
                      </span>
                      <span className="text-sm text-slate-300 font-mono">
                        {entry.balance}
                      </span>
                    </div>
                  )}

                  {entry.notes && (
                    <div className="pt-2 border-t border-slate-700/50">
                      <p className="text-xs text-slate-400">{entry.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredEntries.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              No accounts found
            </h3>
            <p className="text-slate-400 mb-6">
              {searchTerm || selectedCategory !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Get started by adding your first account"}
            </p>
            {!searchTerm && selectedCategory === "all" && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all transform hover:scale-105"
              >
                Add Your First Account
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="py-6 text-center">
          <p className="text-xs text-slate-500">
            Local Password Management by LocalPasswordVault.com
          </p>
        </div>
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
