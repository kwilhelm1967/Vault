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

  const loadEntries = useCallback(async (signal?: AbortSignal) => {
    if (isLocked || !storageService.isVaultUnlocked()) {
      setEntries([]);
      setIsInitialized(true);
      return;
    }

    try {
      let loadedEntries: PasswordEntry[] = [];

      // Check if aborted before starting
      if (signal?.aborted) return;

      // In Electron, try to load from shared storage first
      if (isElectron && loadSharedEntries) {
        try {
          const sharedEntries = await loadSharedEntries();
          if (signal?.aborted) return;
          
          if (sharedEntries && sharedEntries.length > 0) {
            loadedEntries = sharedEntries.map((entry: RawPasswordEntry) => ({
              ...entry,
              createdAt: new Date(entry.createdAt),
              updatedAt: new Date(entry.updatedAt),
            }));
            // Also save to localStorage as backup
            if (!signal?.aborted) {
              await storageService.saveEntries(loadedEntries);
            }
          }
        } catch (error) {
          if (signal?.aborted) return;
          // Fallback to localStorage
          devError("Shared entries load failed, using localStorage:", error);
        }
      }

      // Check if aborted before continuing
      if (signal?.aborted) return;

      // If no shared entries or failed to load, use localStorage
      if (loadedEntries.length === 0) {
        loadedEntries = await storageService.loadEntries();
        if (signal?.aborted) return;

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

      if (signal?.aborted) return;

      setEntries(loadedEntries || []);
      setIsInitialized(true);

      // Ensure fixed categories are saved
      if (!signal?.aborted) {
        await storageService.saveCategories(FIXED_CATEGORIES);
      }
    } catch (error) {
      if (signal?.aborted) return;
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
      const abortController = new AbortController();
      loadEntries(abortController.signal);
      
      return () => {
        abortController.abort();
      };
    }
    // Note: loadEntries is intentionally omitted from dependencies to prevent infinite loops.
    // It's stable due to useCallback with proper dependencies (isLocked, isElectron, loadSharedEntries, saveSharedEntries)
  }, [isInitialized, loadEntries]);

  // Handle cross-window synchronization (only after initial load)
  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onEntriesChanged || !isInitialized) return;

    const abortController = new AbortController();
    const signal = abortController.signal;

    const handleEntriesChanged = async () => {
      if (signal.aborted) return;
      
      try {
        if (isLocked || !storageService.isVaultUnlocked()) {
          setEntries([]);
          return;
        }

        // Reload from shared storage
        if (loadSharedEntries) {
          const sharedEntries = await loadSharedEntries();
          if (signal.aborted) return;
          
          if (sharedEntries) {
            const mappedEntries = sharedEntries.map((entry: RawPasswordEntry) => ({
              ...entry,
              createdAt: new Date(entry.createdAt),
              updatedAt: new Date(entry.updatedAt),
            }));
            if (!signal.aborted) {
              setEntries(mappedEntries);
              // Also update localStorage
              await storageService.saveEntries(mappedEntries);
            }
          }
        } else {
          const loadedEntries = await storageService.loadEntries();
          if (!signal.aborted) {
            setEntries(loadedEntries || []);
          }
        }
      } catch (error) {
        if (!signal.aborted) {
          devError("Failed to reload entries:", error);
          setEntries([]);
        }
      }
    };

    window.electronAPI.onEntriesChanged(handleEntriesChanged);
    return () => {
      abortController.abort();
      window.electronAPI?.removeEntriesChangedListener?.(handleEntriesChanged);
    };
    // Note: loadSharedEntries is intentionally omitted to prevent unnecessary re-subscriptions.
    // The handler closure captures the current loadSharedEntries value at effect execution time.
  }, [isElectron, isLocked, isInitialized, loadSharedEntries]);

  // Reset initialization when vault locks/unlocks
  useEffect(() => {
    if (isLocked) {
      setIsInitialized(false);
    } else {
      // When vault is unlocked, trigger data loading if not initialized
      if (!isInitialized && storageService.isVaultUnlocked()) {
        const abortController = new AbortController();
        loadEntries(abortController.signal);
        
        return () => {
          abortController.abort();
        };
      }
    }
    // Note: loadEntries is stable due to useCallback, safe to include in dependencies
  }, [isLocked, isInitialized, loadEntries]);

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



