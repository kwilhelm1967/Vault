const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('app-version'),
  getPlatform: () => ipcRenderer.invoke('platform'),
  onLockVault: (callback) => ipcRenderer.on('lock-vault', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // Floating panel controls
  showFloatingPanel: () => ipcRenderer.invoke('show-floating-panel'),
  hideFloatingPanel: () => ipcRenderer.invoke('hide-floating-panel'),
  isFloatingPanelOpen: () => ipcRenderer.invoke('is-floating-panel-open'),
  getFloatingPanelPosition: () => ipcRenderer.invoke('get-floating-panel-position'),
  saveFloatingPanelPosition: (x, y) => ipcRenderer.invoke('save-floating-panel-position', x, y),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('set-always-on-top', flag),
  
  // Window controls
  minimizeMainWindow: () => ipcRenderer.invoke('minimize-main-window'),
  hideMainWindow: () => ipcRenderer.invoke('hide-main-window'),
  restoreMainWindow: () => ipcRenderer.invoke('restore-main-window')
});

// Security: Remove any node globals in renderer
delete window.require;
delete window.exports;
delete window.module;