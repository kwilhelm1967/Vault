import { useMemo, useEffect } from "react";

/**
 * Custom hook for detecting and managing floating panel mode
 * 
 * Detects if the app is running in floating panel mode (via #floating hash)
 * and configures Electron's always-on-top behavior if applicable.
 * 
 * @param isElectron - Whether the app is running in Electron
 * @returns Boolean indicating if floating mode is active
 * 
 * @example
 * ```typescript
 * const isFloating = useFloatingMode(isElectron);
 * if (isFloating) {
 *   // Adjust UI for floating panel
 * }
 * ```
 */
export const useFloatingMode = (isElectron: boolean) => {
  const isFloatingMode = useMemo(() => window.location.hash === "#floating", []);

  useEffect(() => {
    if (isElectron && isFloatingMode && window.electronAPI?.setAlwaysOnTop) {
      window.electronAPI.setAlwaysOnTop(true);
    }
  }, [isElectron, isFloatingMode]);

  return isFloatingMode;
};

