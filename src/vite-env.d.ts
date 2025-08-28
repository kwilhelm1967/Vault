/// <reference types="vite/client" />

declare global {
  interface Window {
    electronAPI: {
      // Version and platform
      getVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;

      // Event listeners
      onLockVault: (callback: () => void) => void;
      removeAllListeners: (channel: string) => void;

      // Floating panel controls
      showFloatingPanel: () => Promise<void>;
      hideFloatingPanel: () => Promise<void>;
      isFloatingPanelOpen: () => Promise<boolean>;
      getFloatingPanelPosition: () => Promise<{ x: number; y: number } | null>;
      saveFloatingPanelPosition: (x: number, y: number) => Promise<void>;
      setAlwaysOnTop: (flag: boolean) => Promise<void>;

      // Window controls
      minimizeMainWindow: () => Promise<void>;
      hideMainWindow: () => Promise<void>;
      restoreMainWindow: () => Promise<void>;
      showMainWindow: () => Promise<boolean>;

      // Floating button controls
      showFloatingButton: () => Promise<void>;
      hideFloatingButton: () => Promise<void>;
      isFloatingButtonOpen: () => Promise<boolean>;
      toggleFloatingPanelFromButton: () => Promise<void>;
      saveFloatingButtonPosition: (x: number, y: number) => Promise<void>;
      moveFloatingButton: (x: number, y: number) => Promise<boolean>;

      // Vault security controls
      vaultUnlocked: () => Promise<void>;
      vaultLocked: () => Promise<void>;
      isVaultUnlocked: () => Promise<boolean>;
      onVaultStatusChange: (
        callback: (event: any, data: { unlocked: boolean }) => void
      ) => void;
      removeVaultStatusListener: () => void;

      // Allow for dynamic properties
      [key: string]: any;
    };
  }
}

export {};
