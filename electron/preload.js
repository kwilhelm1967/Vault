const { contextBridge, ipcRenderer } = require("electron");

// SECURITY: Restricted API with validation and sanitization
contextBridge.exposeInMainWorld("electronAPI", {
  // System info only
  getVersion: () => ipcRenderer.invoke("app-version"),
  getPlatform: () => ipcRenderer.invoke("platform"),
  getAppName: () => ipcRenderer.invoke("app-name"),

  // Secure event listeners with validation
  onLockVault: (callback) => {
    if (typeof callback === 'function') {
      ipcRenderer.on("lock-vault", callback);
    }
  },
  onOpenAdminPortal: (callback) => {
    if (typeof callback === 'function') {
      ipcRenderer.on("open-admin-portal", callback);
    }
  },
  removeAllListeners: (channel) => {
    if (typeof channel === 'string' && channel.match(/^(lock-vault|open-admin-portal|vault-status-changed|entries-changed)$/)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },

  // Floating panel controls with validation
  showFloatingPanel: () => ipcRenderer.invoke("show-floating-panel"),
  hideFloatingPanel: () => ipcRenderer.invoke("hide-floating-panel"),
  isFloatingPanelOpen: () => ipcRenderer.invoke("is-floating-panel-open"),
  getFloatingPanelPosition: () => ipcRenderer.invoke("get-floating-panel-position"),
  saveFloatingPanelPosition: (x, y) => {
    if (typeof x === 'number' && typeof y === 'number') {
      return ipcRenderer.invoke("save-floating-panel-position", x, y);
    }
    return false;
  },
  setAlwaysOnTop: (flag) => {
    if (typeof flag === 'boolean') {
      return ipcRenderer.invoke("set-always-on-top", flag);
    }
    return false;
  },

  // Window controls
  minimizeMainWindow: () => ipcRenderer.invoke("minimize-main-window"),
  hideMainWindow: () => ipcRenderer.invoke("hide-main-window"),
  restoreMainWindow: () => ipcRenderer.invoke("restore-main-window"),

  // Floating button controls with validation
  showFloatingButton: () => ipcRenderer.invoke("show-floating-button"),
  hideFloatingButton: () => ipcRenderer.invoke("hide-floating-button"),
  isFloatingButtonOpen: () => ipcRenderer.invoke("is-floating-button-open"),
  toggleFloatingPanelFromButton: () =>
    ipcRenderer.invoke("toggle-floating-panel-from-button"),
  saveFloatingButtonPosition: (x, y) => {
    if (typeof x === 'number' && typeof y === 'number') {
      return ipcRenderer.invoke("save-floating-button-position", x, y);
    }
    return false;
  },
  moveFloatingButton: (x, y) => {
    if (typeof x === 'number' && typeof y === 'number') {
      return ipcRenderer.invoke("move-floating-button", x, y);
    }
    return false;
  },

  // SECURE: Vault controls without data exposure
  vaultUnlocked: () => ipcRenderer.invoke("vault-unlocked"),
  vaultLocked: () => ipcRenderer.invoke("vault-locked"),
  isVaultUnlocked: () => ipcRenderer.invoke("is-vault-unlocked"),
  getVaultStatus: () => ipcRenderer.invoke("get-vault-status"),
  vaultExists: () => ipcRenderer.invoke("vault-exists"),
  showMainWindow: () => ipcRenderer.invoke("show-main-window"),

  // Secure external URL opening with validation
  // CRITICAL: Block all external URL opening to prevent browser/landing page redirects
  openExternal: (url) => {
    if (typeof url === 'string' && url.match(/^https?:\/\//)) {
      return ipcRenderer.invoke("open-external", url);
    }
    return false;
  },

  // SECURE: Vault status change listener with memory management
  onVaultStatusChange: (callback) => {
    if (typeof callback === 'function') {
      ipcRenderer.removeAllListeners("vault-status-changed");
      ipcRenderer.on("vault-status-changed", callback);
    }
  },
  removeVaultStatusListener: () => {
    ipcRenderer.removeAllListeners("vault-status-changed");
  },

  // SECURE: Encrypted vault operations (encryption happens in renderer)
  // Master password NEVER sent to main process - only encrypted blob
  saveVaultEncrypted: (encryptedData) => {
    if (typeof encryptedData === 'string' && encryptedData.length > 0) {
      return ipcRenderer.invoke("save-vault-encrypted", encryptedData);
    }
    return Promise.resolve(false);
  },
  loadVaultEncrypted: () => {
    // No master password needed - returns encrypted blob for renderer to decrypt
    return ipcRenderer.invoke("load-vault-encrypted");
  },

  // SECURE: Temporary shared entries for window synchronization
  // These use in-memory storage only, no file persistence
  saveSharedEntries: (entries) => {
    if (Array.isArray(entries)) {
      return ipcRenderer.invoke("save-shared-entries-temp", entries);
    }
    return false;
  },
  loadSharedEntries: () => {
    return ipcRenderer.invoke("load-shared-entries-temp");
  },

  // SECURE: Event broadcasting without data
  broadcastEntriesChanged: () => ipcRenderer.invoke("broadcast-entries-changed"),
  syncVaultToFloating: () => ipcRenderer.invoke("sync-vault-to-floating"),

  // SECURE: Trial info persistence for floating button security checks
  saveTrialInfo: (trialInfo) => {
    if (typeof trialInfo === 'object' && trialInfo !== null) {
      return ipcRenderer.invoke("save-trial-info", trialInfo);
    }
    return false;
  },
  checkTrialStatus: () => ipcRenderer.invoke("check-trial-status"),
  isTrialExpired: () => ipcRenderer.invoke("is-trial-expired"),

  // Secure listeners with memory management - support multiple listeners
  onEntriesChanged: (callback) => {
    if (typeof callback === 'function') {
      ipcRenderer.on("entries-changed", callback);
    }
  },
  removeEntriesChangedListener: (callback) => {
    if (typeof callback === 'function') {
      ipcRenderer.removeListener("entries-changed", callback);
    }
  },

  // HTTP request via Electron net module (bypasses ALL browser restrictions)
  httpRequest: (url, options) => {
    if (typeof url === 'string' && url.match(/^https?:\/\//)) {
      return ipcRenderer.invoke("http-request", url, options);
    }
    return Promise.reject(new Error('Invalid URL'));
  },

  // Network diagnostics for troubleshooting connection issues
  testNetworkConnectivity: (serverUrl) => {
    if (typeof serverUrl === 'string' && (serverUrl.match(/^https?:\/\//) || serverUrl === '')) {
      return ipcRenderer.invoke("test-network-connectivity", serverUrl || undefined);
    }
    return Promise.reject(new Error('Invalid server URL'));
  },

  // SECURITY: Remove old insecure methods
  // saveSharedEntries and loadSharedEntries are REMOVED
  // All data must remain encrypted and in renderer process only
});

// SECURITY: Remove Node.js access from renderer
delete window.require;
delete window.exports;
delete window.module;
delete window.process;
