import { useEffect, useState } from "react";

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

          console.log("Initial vault status:", vaultUnlocked);
        } catch (error) {
          console.error("Failed to get electron info:", error);
        }
      }
    };

    checkElectron();
  }, []);

  // Listen for vault status changes from main process
  useEffect(() => {
    if (!window.electronAPI?.onVaultStatusChange) return;

    const handleVaultStatusChange = (
      _event: any,
      data: { unlocked: boolean }
    ) => {
      console.log("Vault status changed via push channel:", data.unlocked);
      setIsVaultUnlocked(data.unlocked);
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

  return {
    isElectron,
    version,
    platform,
    electronAPI: window.electronAPI,
    isVaultUnlocked,
  };
};
