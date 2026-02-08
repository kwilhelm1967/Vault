/**
 * useVaultData Hook
 * 
 * Provides vault entries data with Electron integration support.
 */

import { useState, useEffect, useCallback } from "react";
import { PasswordEntry } from "../types";
import { useElectron } from "./useElectron";
import { devError } from "../utils/devLog";

interface _UseVaultDataParams {
  isLocked: boolean;
  isElectron: boolean;
  loadSharedEntries: () => Promise<PasswordEntry[]>;
  saveSharedEntries: (entries: PasswordEntry[]) => Promise<void>;
}

export const useVaultData = (
  isLocked: boolean,
  isElectron: boolean,
  loadSharedEntries: () => Promise<PasswordEntry[]>,
  saveSharedEntries: (entries: PasswordEntry[]) => Promise<void>
) => {
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const { ipcRenderer } = useElectron();

  const loadEntries = useCallback(async () => {
    if (isLocked) {
      setEntries([]);
      return;
    }

    try {
      if (isElectron && ipcRenderer) {
        const loadedEntries = await loadSharedEntries();
        setEntries(loadedEntries);
      } else {
        // Web version - use localStorage
        const stored = localStorage.getItem("vault_entries");
        if (stored) {
          setEntries(JSON.parse(stored));
        }
      }
    } catch (error) {
      devError("Failed to load entries:", error);
      setEntries([]);
    }
  }, [isLocked, isElectron, ipcRenderer, loadSharedEntries]);

  useEffect(() => {
    // Load entries immediately if vault is unlocked (critical)
    // Otherwise defer loading to avoid blocking render
    if (!isLocked) {
      loadEntries();
    } else {
      // Defer loading when locked to avoid blocking initial render
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          loadEntries();
        }, { timeout: 100 });
      } else {
        setTimeout(() => {
          loadEntries();
        }, 0);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, isElectron]);

  const updateEntries = useCallback(async (newEntries: PasswordEntry[]) => {
    setEntries(newEntries);
    
    if (!isLocked) {
      try {
        if (isElectron && ipcRenderer) {
          await saveSharedEntries(newEntries);
        } else {
          localStorage.setItem("vault_entries", JSON.stringify(newEntries));
        }
      } catch (error) {
        devError("Failed to save entries:", error);
      }
    }
  }, [isLocked, isElectron, ipcRenderer, saveSharedEntries]);

  return {
    entries,
    setEntries: updateEntries,
  };
};
