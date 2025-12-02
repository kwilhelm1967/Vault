/**
 * VaultHeader Component
 * 
 * Header area with title, entry count, sort controls, and filter badges.
 */

import React, { useRef, useEffect } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  X,
  CheckSquare,
  Square,
} from "lucide-react";
import { colors } from "./vaultColors";

interface VaultHeaderProps {
  entryCount: number;
  totalCount: number;
  sortBy: "name" | "date" | "category";
  sortOrder: "asc" | "desc";
  showSortDropdown: boolean;
  showWeakOnly: boolean;
  showReusedOnly: boolean;
  showFavoritesOnly: boolean;
  isBulkSelectMode: boolean;
  onSortByChange: (sortBy: "name" | "date" | "category") => void;
  onSortOrderToggle: () => void;
  onShowSortDropdown: (show: boolean) => void;
  onClearFilters: () => void;
  onToggleBulkSelect: () => void;
}

export const VaultHeader: React.FC<VaultHeaderProps> = ({
  entryCount,
  totalCount,
  sortBy,
  sortOrder,
  showSortDropdown,
  showWeakOnly,
  showReusedOnly,
  showFavoritesOnly,
  isBulkSelectMode,
  onSortByChange,
  onSortOrderToggle,
  onShowSortDropdown,
  onClearFilters,
  onToggleBulkSelect,
}) => {
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const hasActiveFilters = showWeakOnly || showReusedOnly || showFavoritesOnly;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        onShowSortDropdown(false);
      }
    };

    if (showSortDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSortDropdown, onShowSortDropdown]);

  const getSortLabel = () => {
    const labels = {
      name: "Name",
      date: "Date",
      category: "Category",
    };
    return labels[sortBy];
  };

  return (
    <div className="flex items-center justify-between mb-4">
      {/* Title and Count */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: colors.warmIvory }}>
          Your Accounts
        </h1>
        <p className="text-sm text-slate-500">
          {entryCount === totalCount
            ? `${entryCount} account${entryCount !== 1 ? "s" : ""}`
            : `${entryCount} of ${totalCount} accounts`}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Sort Dropdown */}
        <div className="relative" ref={sortDropdownRef}>
          <button
            onClick={() => onShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-sm text-slate-300 transition-colors"
            aria-label="Sort entries"
            aria-expanded={showSortDropdown}
          >
            <ArrowUpDown className="w-4 h-4" strokeWidth={1.5} />
            <span>{getSortLabel()}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showSortDropdown ? "rotate-180" : ""}`}
              strokeWidth={1.5}
            />
          </button>

          {/* Dropdown Menu */}
          {showSortDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden animate-fadeIn">
              <div className="p-2">
                <p className="text-xs text-slate-500 px-2 mb-1">Sort by</p>
                {(["name", "date", "category"] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      onSortByChange(option);
                      onShowSortDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      sortBy === option
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-700/50"
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-700 p-2">
                <p className="text-xs text-slate-500 px-2 mb-1">Order</p>
                <button
                  onClick={() => {
                    onSortOrderToggle();
                    onShowSortDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
                >
                  {sortOrder === "asc" ? "↑ Ascending" : "↓ Descending"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg text-sm transition-colors"
            title="Clear all filters"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
            <span>Clear</span>
          </button>
        )}

        {/* Bulk Select Toggle */}
        <button
          onClick={onToggleBulkSelect}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            isBulkSelectMode
              ? "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
              : "bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
          }`}
          title={isBulkSelectMode ? "Exit bulk select" : "Bulk select mode"}
        >
          {isBulkSelectMode ? (
            <CheckSquare className="w-4 h-4" strokeWidth={1.5} />
          ) : (
            <Square className="w-4 h-4" strokeWidth={1.5} />
          )}
          <span>{isBulkSelectMode ? "Cancel" : "Select"}</span>
        </button>
      </div>
    </div>
  );
};

// Bulk Actions Bar
interface BulkActionsBarProps {
  selectedCount: number;
  visibleCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteSelected: () => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  visibleCount,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center justify-between bg-slate-800/60 rounded-lg p-3 mb-4 border border-slate-700/50 animate-fadeIn">
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-300">
          <span className="font-medium text-white">{selectedCount}</span> selected
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onSelectAll}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Select all ({visibleCount})
          </button>
          <span className="text-slate-600">|</span>
          <button
            onClick={onDeselectAll}
            className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            Deselect all
          </button>
        </div>
      </div>
      <button
        onClick={onDeleteSelected}
        className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors"
      >
        Delete selected
      </button>
    </div>
  );
};

