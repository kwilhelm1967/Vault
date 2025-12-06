import { useEffect, useState } from "react";
import { PasswordEntry } from "../types";
import { devError } from "../utils/devLog";

// Using the global ElectronAPI type from vite-env.d.ts

export const useElectron = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [version, setVersion] = useState<string>("");
  const [platform, setPlatform] = useState<string>("");
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);

  useEffect(() => {
    const checkElectron = async () => {
      if (window.electronAPI) {
        setIsElectron(true);
        try {
          const appVersion = await window.electronAPI.getVersion();
          const appPlatform = await window.electronAPI.getPlatform();
          const vaultUnlocked = await window.electronAPI.isVaultUnlocked();

          setVersion(appVersion);
          setPlatform(appPlatform);
          setIsVaultUnlocked(vaultUnlocked);
        } catch (error) {
          devError("Failed to get electron info:", error);
        }
      }
    };

    checkElectron();
  }, []);

  // Listen for vault status changes from main process
  useEffect(() => {
    if (!window.electronAPI?.onVaultStatusChange) return;

    const handleVaultStatusChange = (_event: unknown, unlocked: boolean) => {
      setIsVaultUnlocked(unlocked);
    };

    // Set up the listener
    window.electronAPI.onVaultStatusChange(handleVaultStatusChange);

    // Cleanup listener on unmount
    return () => {
      if (window.electronAPI?.removeVaultStatusListener) {
        window.electronAPI.removeVaultStatusListener();
      }
    };
  }, []);

  // Shared data methods
  const saveSharedEntries = async (entries: PasswordEntry[]) => {
    if (!window.electronAPI?.saveSharedEntries) return false;
    return await window.electronAPI.saveSharedEntries(entries);
  };

  const loadSharedEntries = async () => {
    if (!window.electronAPI?.loadSharedEntries) return [];
    return await window.electronAPI.loadSharedEntries();
  };

  const broadcastEntriesChanged = async () => {
    if (!window.electronAPI?.broadcastEntriesChanged) return false;
    return await window.electronAPI.broadcastEntriesChanged();
  };

  return {
    isElectron,
    version,
    platform,
    electronAPI: window.electronAPI,
    isVaultUnlocked,
    saveSharedEntries,
    loadSharedEntries,
    broadcastEntriesChanged,
  };
};
