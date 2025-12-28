/**
 * Electron API Type Definitions
 * 
 * Type definitions for Electron IPC bridge APIs exposed to the renderer process.
 * These are injected by the preload script in Electron builds.
 */

export interface ElectronAPI {
  /** Save encrypted vault data to secure file storage */
  saveVaultEncrypted?: (data: string) => Promise<void>;
  
  /** Load encrypted vault data from secure file storage */
  loadVaultEncrypted?: () => Promise<string | null>;
  
  /** Notify main process that vault was unlocked */
  vaultUnlocked?: () => Promise<void>;
  
  /** Notify main process that vault was locked */
  vaultLocked?: () => Promise<void>;
  
  /** Show floating panel window */
  showFloatingPanel?: () => void;
  
  /** Hide floating panel window */
  hideFloatingPanel?: () => void;
  
  /** Show floating button */
  showFloatingButton?: () => void;
  
  /** Hide floating button */
  hideFloatingButton?: () => void;
  
  /** Restore main window */
  restoreMainWindow?: () => void;
  
  /** Hide main window */
  hideMainWindow?: () => Promise<void>;
  
  /** Minimize main window */
  minimizeMainWindow?: () => Promise<void>;
  
  /** Open external URL */
  openExternal?: (url: string) => void;
  
  /** Broadcast entries changed event to all windows */
  broadcastEntriesChanged?: () => Promise<void>;
  
  /** Save shared entries to main process */
  saveSharedEntries?: (entries: unknown[]) => Promise<boolean>;
  
  /** Load shared entries from main process */
  loadSharedEntries?: () => Promise<unknown[] | null>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    __DEV__?: boolean;
  }
}

