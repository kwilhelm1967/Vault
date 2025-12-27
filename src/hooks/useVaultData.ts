import { useState, useEffect, useCallback, useMemo } from "react";
import { PasswordEntry, RawPasswordEntry } from "../types";
import { storageService } from "../utils/storage";
import { devError } from "../utils/devLog";

// Fixed categories for the vault
const FIXED_CATEGORIES = [
  { id: "all", name: "All", color: "#3b82f6", icon: "Grid3X3" },
  { id: "banking", name: "Banking", color: "#10b981", icon: "CircleDollarSign" },
  { id: "shopping", name: "Shopping", color: "#f59e0b", icon: "ShoppingCart" },
  { id: "entertainment", name: "Entertainment", color: "#a855f7", icon: "Ticket" },
  { id: "email", name: "Email", color: "#f43f5e", icon: "Mail" },
  { id: "work", name: "Work", color: "#3b82f6", icon: "Briefcase" },
  { id: "business", name: "Business", color: "#8b5cf6", icon: "TrendingUp" },
  { id: "other", name: "Other", color: "#6b7280", icon: "FileText" },
] as const;

/**
 * Custom hook for managing vault data (password entries)
 * 
 * Handles loading, synchronization, and state management for password entries.
 * Supports both localStorage (browser) and Electron shared storage for cross-window
 * synchronization. Automatically handles vault lock/unlock states.
 * 
 * @param isLocked - Whether the vault is currently locked
 * @param isElectron - Whether running in Electron environment
 * @param loadSharedEntries - Optional function to load entries from Electron shared storage
 * @param saveSharedEntries - Optional function to save entries to Electron shared storage
 * @returns Object containing entries, setEntries, loadEntries function, and isInitialized flag
 * 
 * @example
 * ```typescript
 * const { entries, setEntries, isInitialized } = useVaultData(
 *   isLocked,
 *   isElectron,
 *   loadSharedEntries,
 *   saveSharedEntries
 * );
 * ```
 */
export const useVaultData = (
  isLocked: boolean,
  isElectron: boolean,
  loadSharedEntries?: () => Promise<RawPasswordEntry[]>,
  saveSharedEntries?: (entries: PasswordEntry[]) => Promise<boolean>
) => {
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadEntries = useCallback(async () => {
    if (isLocked || !storageService.isVaultUnlocked()) {
      setEntries([]);
      setIsInitialized(true);
      return;
    }

    try {
      let loadedEntries: PasswordEntry[] = [];

      // In Electron, try to load from shared storage first
      if (isElectron && loadSharedEntries) {
        try {
          const sharedEntries = await loadSharedEntries();
          if (sharedEntries && sharedEntries.length > 0) {
            loadedEntries = sharedEntries.map((entry: RawPasswordEntry) => ({
              ...entry,
              createdAt: new Date(entry.createdAt),
              updatedAt: new Date(entry.updatedAt),
            }));
            // Also save to localStorage as backup
            await storageService.saveEntries(loadedEntries);
          }
        } catch (error) {
          // Fallback to localStorage
          devError("Shared entries load failed, using localStorage:", error);
        }
      }

      // If no shared entries or failed to load, use localStorage
      if (loadedEntries.length === 0) {
        loadedEntries = await storageService.loadEntries();

        // Sync to shared storage for Electron floating panel
        if (isElectron && saveSharedEntries && loadedEntries && loadedEntries.length > 0) {
          try {
            await saveSharedEntries(loadedEntries);
          } catch (error) {
            // Shared storage unavailable
            devError("Failed to sync to shared storage:", error);
          }
        }
      }

      setEntries(loadedEntries || []);
      setIsInitialized(true);

      // Ensure fixed categories are saved
      await storageService.saveCategories(FIXED_CATEGORIES);
    } catch (error) {
      devError("Failed to load entries:", error);
      setEntries([]);
      setIsInitialized(true);
      if (error instanceof Error && error.message?.includes("locked")) {
        throw error;
      }
    }
  }, [isLocked, isElectron, loadSharedEntries, saveSharedEntries]);

  // Initial load only
  useEffect(() => {
    if (!isInitialized) {
      loadEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]); // Remove loadEntries dependency to prevent infinite loop

  // Handle cross-window synchronization (only after initial load)
  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onEntriesChanged || !isInitialized) return;

    const handleEntriesChanged = async () => {
      try {
        if (isLocked || !storageService.isVaultUnlocked()) {
          setEntries([]);
          return;
        }

        // Reload from shared storage
        if (loadSharedEntries) {
          const sharedEntries = await loadSharedEntries();
          if (sharedEntries) {
            const mappedEntries = sharedEntries.map((entry: RawPasswordEntry) => ({
              ...entry,
              createdAt: new Date(entry.createdAt),
              updatedAt: new Date(entry.updatedAt),
            }));
            setEntries(mappedEntries);
            // Also update localStorage
            await storageService.saveEntries(mappedEntries);
          }
        } else {
          const loadedEntries = await storageService.loadEntries();
          setEntries(loadedEntries || []);
        }
      } catch (error) {
        devError("Failed to reload entries:", error);
        setEntries([]);
      }
    };

    window.electronAPI.onEntriesChanged(handleEntriesChanged);
    return () => {
      window.electronAPI?.removeEntriesChangedListener?.(handleEntriesChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isElectron, isLocked, isInitialized]); // Remove loadSharedEntries dependency

  // Reset initialization when vault locks/unlocks
  useEffect(() => {
    if (isLocked) {
      setIsInitialized(false);
    } else {
      // When vault is unlocked, trigger data loading if not initialized
      if (!isInitialized && storageService.isVaultUnlocked()) {
        loadEntries();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, isInitialized]); // Remove loadEntries dependency

  return useMemo(
    () => ({
      entries,
      setEntries,
      loadEntries,
      isInitialized,
    }),
    [entries, loadEntries, isInitialized]
  );
};


