/**
 * VaultEmptyStates Component
 * 
 * Handles all empty state displays for the vault:
 * - No accounts
 * - No weak passwords (positive)
 * - No reused passwords (positive)
 * - No favorites
 * - No search results
 */

import React from "react";
import { Key, Star, AlertTriangle, Search, Plus } from "lucide-react";
import { colors } from "./vaultColors";

interface EmptyStateProps {
  type: "empty" | "weak" | "reused" | "favorites" | "search" | "category";
  hasAnyAccounts: boolean;
  searchTerm?: string;
  categoryName?: string;
  onViewAll: () => void;
  onAddAccount: () => void;
}

export const VaultEmptyState: React.FC<EmptyStateProps> = ({
  type,
  hasAnyAccounts,
  searchTerm,
  categoryName,
  onViewAll,
  onAddAccount,
}) => {
  // Weak passwords empty state
  if (type === "weak") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center pb-24">
        {hasAnyAccounts ? (
          <>
            <AlertTriangle 
              className="w-10 h-10 mb-4" 
              strokeWidth={1.5} 
              style={{ color: '#22c55e' }}
            />
            <h3 style={{ color: '#22c55e' }} className="font-medium mb-1">
              All passwords are strong!
            </h3>
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
            <h3 style={{ color: colors.warmIvory }} className="font-medium mb-1">
              No passwords yet
            </h3>
            <p className="text-slate-500 text-sm mb-4">
              Add some accounts to check their strength.
            </p>
          </>
        )}
        <button
          onClick={onViewAll}
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

  // Reused passwords empty state
  if (type === "reused") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center pb-24">
        {hasAnyAccounts ? (
          <>
            <AlertTriangle 
              className="w-10 h-10 mb-4" 
              strokeWidth={1.5} 
              style={{ color: '#22c55e' }}
            />
            <h3 style={{ color: '#22c55e' }} className="font-medium mb-1">
              All passwords are unique!
            </h3>
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
            <h3 style={{ color: colors.warmIvory }} className="font-medium mb-1">
              No passwords yet
            </h3>
            <p className="text-slate-500 text-sm mb-4">
              Add some accounts to check for reused passwords.
            </p>
          </>
        )}
        <button
          onClick={onViewAll}
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

  // Favorites empty state
  if (type === "favorites") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center pb-24">
        <Star 
          className="w-10 h-10 mb-4" 
          strokeWidth={1.5} 
          style={{ color: colors.brandGold }}
        />
        <h3 style={{ color: colors.warmIvory }} className="font-medium mb-1">
          No favorites yet
        </h3>
        <p className="text-slate-500 text-sm mb-4">
          {hasAnyAccounts 
            ? "Mark accounts as favorites from All Accounts" 
            : "Add some accounts first"}
        </p>
        <button
          onClick={onViewAll}
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

  // Search empty state
  if (type === "search" && searchTerm) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center pb-24">
        <Search 
          className="w-10 h-10 mb-4" 
          strokeWidth={1.5} 
          style={{ color: colors.slate400 }}
        />
        <h3 style={{ color: colors.warmIvory }} className="font-medium mb-1">
          No results found
        </h3>
        <p className="text-slate-500 text-sm mb-4">
          No accounts match "{searchTerm}"
        </p>
        <button
          onClick={onViewAll}
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

  // Category empty state
  if (type === "category" && categoryName) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center pb-24">
        <Key 
          className="w-10 h-10 mb-4" 
          strokeWidth={1.5} 
          style={{ color: colors.slate400 }}
        />
        <h3 style={{ color: colors.warmIvory }} className="font-medium mb-1">
          No {categoryName} accounts yet
        </h3>
        <p className="text-slate-500 text-sm mb-4">
          Add your first {categoryName.toLowerCase()} account
        </p>
        <button
          onClick={onAddAccount}
          className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 bouncy-card-clickable"
          style={{ backgroundColor: colors.steelBlue600 }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue500}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue600}
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          Add Account
        </button>
      </div>
    );
  }

  // Default empty state (no accounts at all)
  return (
    <div className="flex flex-col items-center justify-center h-full text-center pb-24">
      <Key 
        className="w-10 h-10 mb-4" 
        strokeWidth={1.5} 
        style={{ color: colors.slate400 }}
      />
      <h3 style={{ color: colors.warmIvory }} className="font-medium mb-1">
        No accounts yet
      </h3>
      <p className="text-slate-500 text-sm mb-4">
        Add your first password to get started
      </p>
      <button
        onClick={onAddAccount}
        className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 bouncy-card-clickable"
        style={{ backgroundColor: colors.steelBlue600 }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue500}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.steelBlue600}
      >
        <Plus className="w-4 h-4" strokeWidth={1.5} />
        Add Account
      </button>
    </div>
  );
};

export default VaultEmptyState;



