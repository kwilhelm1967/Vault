/**
 * VaultSidebar Component
 * 
 * Left navigation panel with search, categories, and actions.
 */

import React, { useCallback, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  Shield,
  Key,
  Settings as SettingsIcon,
  Lock,
  LayoutDashboard,
  AlertTriangle,
  Minimize2,
  Star,
  X,
} from "lucide-react";
import { PasswordEntry, Category } from "../../types";
import { CategoryIcon } from "../CategoryIcon";
import { colors } from "./vaultColors";

interface VaultSidebarProps {
  entries: PasswordEntry[];
  categories: Category[];
  currentView: "dashboard" | "passwords" | "settings";
  selectedCategory: string;
  searchTerm: string;
  showFavoritesOnly: boolean;
  showWeakOnly: boolean;
  showReusedOnly: boolean;
  weakPasswordCount: number;
  reusedPasswordCount: number;
  onViewChange: (view: "dashboard" | "passwords" | "settings") => void;
  onCategoryChange: (category: string) => void;
  onSearchChange: (term: string) => void;
  onShowFavoritesOnly: (show: boolean) => void;
  onShowWeakOnly: (show: boolean) => void;
  onShowReusedOnly: (show: boolean) => void;
  onAddEntry: () => void;
  onLock: () => void;
  onMinimize?: () => void;
}

export const VaultSidebar: React.FC<VaultSidebarProps> = ({
  entries,
  categories,
  currentView,
  selectedCategory,
  searchTerm,
  showFavoritesOnly,
  showWeakOnly,
  showReusedOnly,
  weakPasswordCount,
  reusedPasswordCount,
  onViewChange,
  onCategoryChange,
  onSearchChange,
  onShowFavoritesOnly,
  onShowWeakOnly,
  onShowReusedOnly,
  onAddEntry,
  onLock,
  onMinimize,
}) => {
  // Local search state for debouncing
  const [localSearchTerm, setLocalSearchTerm] = React.useState(searchTerm);
  const searchDebounceRef = useRef<NodeJS.Timeout>();

  // Sync local search with parent
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  // Debounced search handler
  const handleSearchInput = useCallback((value: string) => {
    setLocalSearchTerm(value);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 150);
  }, [onSearchChange]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const favoritesCount = entries.filter(e => e.isFavorite).length;

  return (
    <aside className="w-64 bg-slate-800/50 backdrop-blur-sm border-r border-slate-700/50 flex flex-col">
      {/* Brand */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${colors.steelBlue500}, ${colors.steelBlue600})` }}
          >
            <Shield className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-sm font-semibold" style={{ color: colors.warmIvory }}>
              Local Password Vault
            </h1>
            <p className="text-[10px] text-slate-500">AES-256 Encrypted</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-slate-300" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search accounts..."
            aria-label="Search accounts"
            value={localSearchTerm}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:border-[#5B82B8] focus:ring-2 focus:ring-[#5B82B8]/20 transition-all"
            style={{ color: colors.warmIvory }}
          />
          {localSearchTerm && (
            <button
              onClick={() => handleSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Add New Button */}
      <div className="px-3 mb-2">
        <button
          onClick={onAddEntry}
          aria-label="Add new account"
          className="w-full py-2 text-white text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          style={{ backgroundColor: colors.steelBlue600 }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue500}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue600}
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          Add Account
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto pr-2 py-2" aria-label="Main navigation">
        {/* Dashboard */}
        <NavItem
          icon={<LayoutDashboard className="w-4 h-4 opacity-70" strokeWidth={1.5} />}
          label="Dashboard"
          isActive={currentView === "dashboard"}
          onClick={() => onViewChange("dashboard")}
        />

        {/* Favorites */}
        <NavItem
          icon={<Star className="w-4 h-4 opacity-70" strokeWidth={1.5} style={{ color: colors.brandGold }} />}
          label="Favorites"
          count={favoritesCount > 0 ? favoritesCount : undefined}
          isActive={currentView === "passwords" && showFavoritesOnly}
          onClick={() => {
            onShowFavoritesOnly(true);
            onShowWeakOnly(false);
            onShowReusedOnly(false);
            onCategoryChange("all");
            onViewChange("passwords");
          }}
        />

        <p className="pl-5 pr-2 mb-2 mt-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Categories
        </p>

        {/* All Accounts */}
        <NavItem
          icon={<Shield className="w-4 h-4 opacity-70" strokeWidth={1.5} />}
          label="All Accounts"
          count={entries.length}
          isActive={currentView === "passwords" && selectedCategory === "all" && !showWeakOnly && !showReusedOnly && !showFavoritesOnly}
          onClick={() => {
            onCategoryChange("all");
            onShowWeakOnly(false);
            onShowReusedOnly(false);
            onShowFavoritesOnly(false);
            onViewChange("passwords");
          }}
        />

        {/* Category Items */}
        {categories.filter(c => c.id !== "all").map((category) => (
          <NavItem
            key={category.id}
            icon={<CategoryIcon name={category.icon} size={16} className="opacity-70" strokeWidth={1.5} />}
            label={category.name}
            isActive={currentView === "passwords" && selectedCategory === category.id && !showFavoritesOnly}
            onClick={() => {
              onCategoryChange(category.id);
              onShowWeakOnly(false);
              onShowReusedOnly(false);
              onShowFavoritesOnly(false);
              onViewChange("passwords");
            }}
          />
        ))}

        <p className="pl-5 pr-2 mb-2 mt-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Security
        </p>

        {/* Weak Passwords */}
        <NavItem
          icon={<AlertTriangle className="w-4 h-4 opacity-70" strokeWidth={1.5} style={{ color: '#C9AE66' }} />}
          label="Weak Passwords"
          count={weakPasswordCount > 0 ? weakPasswordCount : undefined}
          countColor={weakPasswordCount > 0 ? "text-[#C9AE66]" : undefined}
          isActive={currentView === "passwords" && showWeakOnly}
          onClick={() => {
            onShowWeakOnly(true);
            onShowReusedOnly(false);
            onShowFavoritesOnly(false);
            onCategoryChange("all");
            onViewChange("passwords");
          }}
        />

        {/* Reused Passwords */}
        <NavItem
          icon={<Key className="w-4 h-4 opacity-70 text-orange-400" strokeWidth={1.5} />}
          label="Reused Passwords"
          count={reusedPasswordCount > 0 ? reusedPasswordCount : undefined}
          countColor={reusedPasswordCount > 0 ? "text-orange-400" : undefined}
          isActive={currentView === "passwords" && showReusedOnly}
          onClick={() => {
            onShowReusedOnly(true);
            onShowWeakOnly(false);
            onShowFavoritesOnly(false);
            onCategoryChange("all");
            onViewChange("passwords");
          }}
        />
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-slate-700/50 space-y-1">
        <NavItem
          icon={<SettingsIcon className="w-4 h-4 opacity-70" strokeWidth={1.5} />}
          label="Settings"
          isActive={currentView === "settings"}
          onClick={() => onViewChange("settings")}
        />
        
        <button
          onClick={onLock}
          aria-label="Lock vault"
          className="w-full pl-5 pr-3 py-2 rounded-r-lg text-left text-sm transition-all duration-200 flex items-center gap-2.5 text-slate-400 hover:text-white hover:bg-slate-700/30"
        >
          <Lock className="w-4 h-4 opacity-70" strokeWidth={1.5} />
          Lock Vault
        </button>

        {onMinimize && (
          <button
            onClick={onMinimize}
            aria-label="Minimize to tray"
            className="w-full pl-5 pr-3 py-2 rounded-r-lg text-left text-sm transition-all duration-200 flex items-center gap-2.5 text-slate-400 hover:text-white hover:bg-slate-700/30"
          >
            <Minimize2 className="w-4 h-4 opacity-70" strokeWidth={1.5} />
            Minimize to Tray
          </button>
        )}
      </div>
    </aside>
  );
};

// NavItem sub-component
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  countColor?: string;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  count,
  countColor,
  isActive,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`nav-item-hover w-full pl-5 pr-3 py-2 mb-0.5 rounded-r-lg text-left text-sm transition-all duration-200 flex items-center gap-2.5 ${
      isActive
        ? "nav-item-selected text-white"
        : "text-slate-400 hover:text-white"
    }`}
  >
    {icon}
    {label}
    {count !== undefined && (
      <span className={`ml-auto text-xs ${countColor || "text-slate-500"}`}>
        {count}
      </span>
    )}
  </button>
);

