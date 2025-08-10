import { useEffect, useState } from 'react';

interface ElectronAPI {
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  onLockVault: (callback: () => void) => void;
  removeAllListeners: (channel: string) => void;
  showFloatingPanel: () => Promise<any>;
  hideFloatingPanel: () => Promise<boolean>;
  isFloatingPanelOpen: () => Promise<boolean>;
  getFloatingPanelPosition: () => Promise<{x: number, y: number}>;
  saveFloatingPanelPosition: (x: number, y: number) => Promise<boolean>;
  setAlwaysOnTop: (flag: boolean) => Promise<boolean>;
  minimizeMainWindow: () => Promise<boolean>;
  hideMainWindow: () => Promise<boolean>;
  restoreMainWindow: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export const useElectron = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [version, setVersion] = useState<string>('');
  const [platform, setPlatform] = useState<string>('');

  useEffect(() => {
    const checkElectron = async () => {
      if (window.electronAPI) {
        setIsElectron(true);
        try {
          const appVersion = await window.electronAPI.getVersion();
          const appPlatform = await window.electronAPI.getPlatform();
          setVersion(appVersion);
          setPlatform(appPlatform);
        } catch (error) {
          console.error('Failed to get electron info:', error);
        }
      }
    };

    checkElectron();
  }, []);

  return {
    isElectron,
    version,
    platform,
    electronAPI: window.electronAPI
  };
};