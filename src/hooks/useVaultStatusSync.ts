import { useEffect } from "react";

/**
 * Custom hook for synchronizing vault lock status across Electron windows
 * 
 * Listens for vault status changes from Electron's main process and updates
 * the local lock state accordingly. This ensures all windows stay in sync
 * when the vault is locked or unlocked.
 * 
 * @param isElectron - Whether the app is running in Electron
 * @param setIsLocked - Function to update the locked state
 * 
 * @example
 * ```typescript
 * const [isLocked, setIsLocked] = useState(true);
 * useVaultStatusSync(isElectron, setIsLocked);
 * ```
 */
export const useVaultStatusSync = (
  isElectron: boolean,
  setIsLocked: (locked: boolean) => void
) => {
  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onVaultStatusChange) return;

    const handleVaultStatusChange = (_event: unknown, unlocked: boolean) => {
      setIsLocked(!unlocked);
    };

    window.electronAPI.onVaultStatusChange(handleVaultStatusChange);
    return () => {
      window.electronAPI?.removeVaultStatusListener?.();
    };
  }, [isElectron, setIsLocked]);
};

