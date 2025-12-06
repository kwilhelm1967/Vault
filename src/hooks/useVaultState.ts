/**
 * useVaultState Hook
 * 
 * Manages vault state including lock status, entries loading, and categories.
 */

import { useCallback, useEffect, useState } from "react";
import { PasswordEntry, Category } from "../types";
import { storageService } from "../utils/storage";
import { devError } from "../utils/devLog";

interface UseVaultStateReturn {
  entries: PasswordEntry[];
  setEntries: React.Dispatch<React.SetStateAction<PasswordEntry[]>>;
  isLocked: boolean;
  setIsLocked: React.Dispatch<React.SetStateAction<boolean>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  selectedCategory: string;
  setSelectedCategory: React.Dispatch<React.SetStateAction<string>>;
  loadEntries: () => Promise<void>;
  lockVault: () => void;
  unlockVault: (password: string) => Promise<boolean>;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "banking", name: "Banking", color: "#22c55e", icon: "CircleDollarSign" },
  { id: "shopping", name: "Shopping", color: "#f59e0b", icon: "ShoppingCart" },
  { id: "entertainment", name: "Entertainment", color: "#8b5cf6", icon: "Ticket" },
  { id: "email", name: "Email", color: "#3b82f6", icon: "Mail" },
  { id: "work", name: "Work", color: "#64748b", icon: "Briefcase" },
  { id: "business", name: "Business", color: "#06b6d4", icon: "TrendingUp" },
  { id: "other", name: "Other", color: "#6b7280", icon: "FileText" },
];

export const useVaultState = (): UseVaultStateReturn => {
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [isLocked, setIsLocked] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const loadEntries = useCallback(async () => {
    try {
      const loadedEntries = await storageService.loadEntries();
      setEntries(loadedEntries);
    } catch (error) {
      devError("Failed to load entries:", error);
      setEntries([]);
    }
  }, []);

  const lockVault = useCallback(() => {
    storageService.lockVault();
    setIsLocked(true);
    setEntries([]);
    setSearchTerm("");
    setSelectedCategory("all");
  }, []);

  const unlockVault = useCallback(async (password: string): Promise<boolean> => {
    try {
      const success = await storageService.unlockVault(password);
      if (success) {
        setIsLocked(false);
        await loadEntries();
        return true;
      }
      return false;
    } catch (error) {
      devError("Failed to unlock vault:", error);
      return false;
    }
  }, [loadEntries]);

  // Check initial vault state
  useEffect(() => {
    const checkVaultState = () => {
      const vaultExists = storageService.vaultExists();
      const isUnlocked = storageService.isVaultUnlocked();
      
      if (vaultExists && isUnlocked) {
        setIsLocked(false);
        loadEntries();
      }
    };
    
    checkVaultState();
  }, [loadEntries]);

  return {
    entries,
    setEntries,
    isLocked,
    setIsLocked,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    loadEntries,
    lockVault,
    unlockVault,
  };
};

export default useVaultState;



