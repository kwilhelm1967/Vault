/**
 * Auto-Updater Module
 * 
 * Handles automatic updates for Local Password Vault.
 * Uses electron-updater to check GitHub releases.
 */

const { autoUpdater } = require('electron-updater');
const { dialog, BrowserWindow } = require('electron');
const log = require('electron-log');

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Update state
let updateAvailable = false;
let updateDownloaded = false;
let mainWindow = null;

/**
 * Initialize auto-updater
 * @param {BrowserWindow} win - Main window reference
 */
function initAutoUpdater(win) {
  mainWindow = win;

  // Check for updates on startup (after a delay)
  setTimeout(() => {
    checkForUpdates(false);
  }, 10000); // Wait 10 seconds after app start

  // Check for updates every 4 hours
  setInterval(() => {
    checkForUpdates(false);
  }, 4 * 60 * 60 * 1000);
}

/**
 * Check for updates
 * @param {boolean} showNoUpdateDialog - Show dialog if no update available
 */
async function checkForUpdates(showNoUpdateDialog = false) {
  try {
    const result = await autoUpdater.checkForUpdates();
    if (!result && showNoUpdateDialog) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'No Updates',
        message: 'You are running the latest version.',
        buttons: ['OK']
      });
    }
  } catch (error) {
    log.error('Error checking for updates:', error);
    if (showNoUpdateDialog) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Update Error',
        message: 'Could not check for updates. Please try again later.',
        buttons: ['OK']
      });
    }
  }
}

/**
 * Download the available update
 */
function downloadUpdate() {
  if (updateAvailable && !updateDownloaded) {
    autoUpdater.downloadUpdate();
  }
}

/**
 * Install the downloaded update
 */
function installUpdate() {
  if (updateDownloaded) {
    autoUpdater.quitAndInstall(false, true);
  }
}

// Event handlers
autoUpdater.on('checking-for-update', () => {
  log.info('Checking for updates...');
  sendStatusToWindow('checking-for-update');
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info.version);
  updateAvailable = true;
  sendStatusToWindow('update-available', info);

  // Show notification to user
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: `A new version (${info.version}) is available!`,
    detail: 'Would you like to download it now?',
    buttons: ['Download', 'Later'],
    defaultId: 0
  }).then(({ response }) => {
    if (response === 0) {
      downloadUpdate();
    }
  });
});

autoUpdater.on('update-not-available', (info) => {
  log.info('Update not available. Current version:', info.version);
  updateAvailable = false;
  sendStatusToWindow('update-not-available', info);
});

autoUpdater.on('error', (err) => {
  log.error('Update error:', err);
  sendStatusToWindow('update-error', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  log.info(`Download progress: ${progressObj.percent.toFixed(2)}%`);
  sendStatusToWindow('download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info.version);
  updateDownloaded = true;
  sendStatusToWindow('update-downloaded', info);

  // Show notification to user
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message: 'Update downloaded successfully!',
    detail: 'The update will be installed when you restart the app. Would you like to restart now?',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0
  }).then(({ response }) => {
    if (response === 0) {
      installUpdate();
    }
  });
});

/**
 * Send update status to renderer
 */
function sendStatusToWindow(status, data = null) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update-status', { status, data });
  }
}

/**
 * Get current update state
 */
function getUpdateState() {
  return {
    updateAvailable,
    updateDownloaded
  };
}

module.exports = {
  initAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  getUpdateState
};

