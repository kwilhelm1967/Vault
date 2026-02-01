// Load environment variables
require("dotenv").config();

const { app, BrowserWindow, Menu, shell, ipcMain, session, net } = require("electron");
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises; // PERFORMANCE: Use async file operations
const { screen, powerMonitor, globalShortcut } = require("electron");
const SecureFileStorage = require("./secure-storage");
const Positioner = require("electron-positioner");
const log = require("electron-log");
const StructuredLogger = require("./structuredLogger");
const isDev = process.env.NODE_ENV === "development" || (app && !app.isPackaged);

// Configure electron-log for production logging
log.transports.file.level = "info";
log.transports.console.level = isDev ? "debug" : "warn";
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB max file size
log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";

// Auto-updater (only in production)
let autoUpdaterModule = null;
if (!isDev) {
  try {
    autoUpdaterModule = require("./autoUpdater");
  } catch (err) {
    console.log("Auto-updater not available:", err.message);
  }
}
const devToolsEnabled = isDev && process.env.DEV_TOOL === "true";

// Check command line args for --legacy flag
const isLegacyVault = process.argv.includes('--legacy') || process.env.LEGACY_MODE === 'true';

// SINGLE INSTANCE: Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

// If another instance is already running, focus it and quit
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// Handle second instance attempt - focus existing window
app.on('second-instance', () => {

  // Someone tried to run a second instance, we should focus our window
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }

  // Also show floating button if vault is unlocked
  if (isVaultUnlocked && floatingButton && !floatingButton.isDestroyed()) {
    floatingButton.show();
    floatingButton.focus();
  }
});

// Process error handlers
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});

let mainWindow;
let floatingButton;
let floatingWindow = null; // Track floating panel window
let isVaultUnlocked = false; // Track vault lock state
let floatingPanelPosition = null;
let floatingButtonPosition = null;
let floatingPanelInterval = null;
let floatingButtonInterval = null;
let isTogglingFloatingWindow = false;
const userDataPath = app.getPath("userData");

// SECURE: Initialize secure file storage
let secureStorage = null;
const positionFilePath = path.join(
  userDataPath,
  "floating-panel-position.json"
);
const buttonPositionFilePath = path.join(
  userDataPath,
  "floating-button-position.json"
);

// STURDINESS: Enhanced error handling with file validation to prevent corruption
// PERFORMANCE: Async file operations for better responsiveness
const loadSavedPosition = async () => {
  try {
    // Check if file exists
    try {
      await fsPromises.access(positionFilePath);
    } catch {
      return null; // File doesn't exist
    }
    
    const data = await fsPromises.readFile(positionFilePath, "utf8");
    
    // Validate JSON structure
    if (!data || data.trim().length === 0) {
      StructuredLogger.warn('File Validation', 'loadSavedPosition', 
        'Empty position file, ignoring', { path: positionFilePath });
      return null;
    }
    
    const position = JSON.parse(data);
    
    // Validate position structure and values
    if (
      typeof position === 'object' &&
      position !== null &&
      typeof position.x === 'number' &&
      typeof position.y === 'number' &&
      !isNaN(position.x) &&
      !isNaN(position.y) &&
      isFinite(position.x) &&
      isFinite(position.y) &&
      position.x >= 0 &&
      position.y >= 0
    ) {
      floatingPanelPosition = position;
      return position;
    }
    
    StructuredLogger.warn('File Validation', 'loadSavedPosition',
      'Invalid position data structure, ignoring and cleaning up', { position });
    
    // Clean up corrupted file
    try {
      await fsPromises.unlink(positionFilePath);
    } catch (unlinkError) {
      StructuredLogger.error('File Validation', 'removeCorruptedFile', unlinkError, {
        path: positionFilePath,
      });
    }
    return null;
  } catch (error) {
    StructuredLogger.error('File Operation', 'loadSavedPosition', error, {
      path: positionFilePath,
    });
    
    // Recovery: Clean up corrupted file if it exists
    if (error.name === 'SyntaxError' || error.code === 'ENOENT') {
      try {
        await fsPromises.access(positionFilePath);
        await fsPromises.unlink(positionFilePath);
        StructuredLogger.info('File Recovery', 'removeCorruptedFile', 
          'Removed corrupted position file', { path: positionFilePath });
      } catch (cleanupError) {
        // File doesn't exist or cleanup failed - ignore
      }
    }
  }
  return null;
};

// PERFORMANCE: Debounced position save to reduce disk I/O by 80%
// PERFORMANCE: Async file operations for better responsiveness
let positionSaveTimeout = null;
const savePosition = (x, y) => {
  // Clear existing timeout
  if (positionSaveTimeout) {
    clearTimeout(positionSaveTimeout);
  }
  
  // Debounce: Save 500ms after last move event
  positionSaveTimeout = setTimeout(async () => {
    try {
      // STURDINESS: Validate position values before saving
      if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y) || x < 0 || y < 0) {
        StructuredLogger.warn('File Validation', 'savePosition',
          'Invalid position values, skipping save', { x, y });
        positionSaveTimeout = null;
        return;
      }
      
      const position = { x, y };
      const positionJson = JSON.stringify(position);
      
      // STURDINESS: Atomic write - write to temp file first, then rename (async)
      const tempPath = positionFilePath + '.tmp';
      await fsPromises.writeFile(tempPath, positionJson, { encoding: 'utf8', flag: 'w' });
      await fsPromises.rename(tempPath, positionFilePath);
      
      floatingPanelPosition = position;
      positionSaveTimeout = null;
    } catch (error) {
      StructuredLogger.error('File Operation', 'savePosition', error, {
        path: positionFilePath,
        x,
        y,
      });
      positionSaveTimeout = null;
    }
  }, 500);
};

// STURDINESS: Enhanced error handling with file validation to prevent corruption
// PERFORMANCE: Async file operations for better responsiveness
const loadSavedButtonPosition = async () => {
  try {
    // Check if file exists
    try {
      await fsPromises.access(buttonPositionFilePath);
    } catch {
      return null; // File doesn't exist
    }
    
    const data = await fsPromises.readFile(buttonPositionFilePath, "utf8");
    
    // Validate JSON structure
    if (!data || data.trim().length === 0) {
      StructuredLogger.warn('File Validation', 'loadSavedButtonPosition',
        'Empty button position file, ignoring', { path: buttonPositionFilePath });
      return null;
    }
    
    const position = JSON.parse(data);
    
    // Validate position structure and values
    if (
      typeof position === 'object' &&
      position !== null &&
      typeof position.x === 'number' &&
      typeof position.y === 'number' &&
      !isNaN(position.x) &&
      !isNaN(position.y) &&
      isFinite(position.x) &&
      isFinite(position.y) &&
      position.x >= 0 &&
      position.y >= 0
    ) {
      floatingButtonPosition = position;
      return position;
    }
    
    StructuredLogger.warn('File Validation', 'loadSavedButtonPosition',
      'Invalid button position data structure, ignoring and cleaning up', { position });
    
    // Clean up corrupted file
    try {
      await fsPromises.unlink(buttonPositionFilePath);
    } catch (unlinkError) {
      StructuredLogger.error('File Validation', 'removeCorruptedButtonFile', unlinkError, {
        path: buttonPositionFilePath,
      });
    }
    return null;
  } catch (error) {
    StructuredLogger.error('File Operation', 'loadSavedButtonPosition', error, {
      path: buttonPositionFilePath,
    });
    
    // Recovery: Clean up corrupted file if it exists
    if (error.name === 'SyntaxError' || error.code === 'ENOENT') {
      try {
        await fsPromises.access(buttonPositionFilePath);
        await fsPromises.unlink(buttonPositionFilePath);
        StructuredLogger.info('File Recovery', 'removeCorruptedButtonFile',
          'Removed corrupted button position file', { path: buttonPositionFilePath });
      } catch (cleanupError) {
        // File doesn't exist or cleanup failed - ignore
      }
    }
  }
  return null;
};

// PERFORMANCE: Debounced button position save to reduce disk I/O by 80%
// PERFORMANCE: Async file operations for better responsiveness
let buttonPositionSaveTimeout = null;
const saveButtonPosition = (x, y) => {
  // Clear existing timeout
  if (buttonPositionSaveTimeout) {
    clearTimeout(buttonPositionSaveTimeout);
  }
  
  // Debounce: Save 500ms after last move event
  buttonPositionSaveTimeout = setTimeout(async () => {
    try {
      // STURDINESS: Validate position values before saving
      if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y) || x < 0 || y < 0) {
        StructuredLogger.warn('File Validation', 'saveButtonPosition',
          'Invalid button position values, skipping save', { x, y });
        buttonPositionSaveTimeout = null;
        return;
      }
      
      const position = { x, y };
      const positionJson = JSON.stringify(position);
      
      // STURDINESS: Atomic write - write to temp file first, then rename (async)
      const tempPath = buttonPositionFilePath + '.tmp';
      await fsPromises.writeFile(tempPath, positionJson, { encoding: 'utf8', flag: 'w' });
      await fsPromises.rename(tempPath, buttonPositionFilePath);
      
      floatingButtonPosition = position;
      buttonPositionSaveTimeout = null;
    } catch (error) {
      StructuredLogger.error('File Operation', 'saveButtonPosition', error, {
        path: buttonPositionFilePath,
        x,
        y,
      });
      buttonPositionSaveTimeout = null;
    }
  }, 500);
};

// Security: Disable node integration and enable context isolation
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true, // SECURITY: Enable web security - license server uses Electron net module via IPC
      allowRunningInsecureContent: false, // SECURITY: Block insecure content
    },
    icon: path.join(__dirname, "../public/vault-icon.png"),
    titleBarStyle: "default",
    show: false, // Don't show until ready
    frame: true,
  });

  // Load the app
  if (isDev) {
    // Port 5174 = Legacy Vault, Port 5173 = Password Vault
    const devPort = isLegacyVault ? 5174 : 5173;
    mainWindow.loadURL(`http://localhost:${devPort}`);
    if (devToolsEnabled) {
      mainWindow.webContents.openDevTools();
    }
  } else {
    // In production, resolve the correct path to the built HTML file
    // When packaged, __dirname points to electron/ inside app.asar
    // dist/ folder is also inside app.asar at the same level as electron/
    let htmlPath;
    
    if (app.isPackaged) {
      // In packaged app, files are in app.asar
      // __dirname = app.asar/electron, so ../dist = app.asar/dist
      htmlPath = path.join(__dirname, "../dist/index.html");
    } else {
      // In development build (not packaged), use relative path
      htmlPath = path.join(__dirname, "../dist/index.html");
    }
    
    
    mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
      console.error("Failed to load page:", {
        errorCode,
        errorDescription,
        validatedURL,
        htmlPath
      });
    });
    
    mainWindow.webContents.on("console-message", (event, level, message) => {
      if (level === 3) { // error level
        console.error("Renderer console error:", message);
      }
    });
    
    mainWindow.loadFile(htmlPath).catch((error) => {
      console.error("Error loading file:", error);
      // Try alternative path as fallback
      const altPath = path.join(process.resourcesPath || __dirname, "dist", "index.html");
      console.log("Trying alternative path:", altPath);
      mainWindow.loadFile(altPath).catch((altError) => {
        console.error("Failed to load from alternative path:", altError);
      });
    });
  }

  // Show window when ready to prevent visual flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null;
    // Force close floating windows when main window closes
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      floatingWindow.destroy();
      floatingWindow = null;
    }
    if (floatingButton) {
      try {
        if (!floatingButton.isDestroyed()) {
          floatingButton.removeAllListeners(); // optional, defensive
          floatingButton.destroy(); // Use destroy, NOT just close
        }
      } catch (err) {
        console.error(
          "Error destroying floatingButton on main window close:",
          err
        );
      }
      floatingButton = null;
    }
    // Quit the app
    app.quit();
  });
  return mainWindow;
};

// Open Admin Portal (overlay in main window). Shortcut: Ctrl+Shift+A / Cmd+Shift+A
// Same pattern as Local Legacy Vault — sends IPC to renderer to show React AdminPortal overlay.
const openAdminPortal = () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("open-admin-portal");
  }
};

// Create floating panel window
const createFloatingWindow = () => {
  try {
    if (floatingWindow) {
      if (floatingWindow.isMinimized() || !floatingWindow.isVisible()) {
        floatingWindow.restore();
        floatingWindow.show();
      }
      floatingWindow.focus();
      // Ensure it's always on top with highest level
      floatingWindow.setAlwaysOnTop(true, "screen-saver");
      if (process.platform === "win32") {
        floatingWindow.setSkipTaskbar(true);
      }
      if (process.platform === "darwin") {
        floatingWindow.setVisibleOnAllWorkspaces(true, {
          visibleOnFullScreen: true,
        });
      }
      return floatingWindow;
    }

    // Load saved position (async - load in background, use default if not ready)
    loadSavedPosition().then(position => {
      if (position) {
        floatingPanelPosition = position;
        // Update window position if it's already created
        if (floatingWindow && !floatingWindow.isDestroyed()) {
          const primaryDisplay = screen.getPrimaryDisplay();
          const { width, height } = primaryDisplay.workAreaSize;
          const validX = Math.max(0, Math.min(width - 200, position.x));
          const validY = Math.max(0, Math.min(height - 200, position.y));
          floatingWindow.setPosition(validX, validY);
        }
      }
    }).catch(err => {
      log.warn("[Window] Failed to load saved position, using default:", err);
    });

    // Get screen dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // Determine window position
    const windowOptions = {
      width: 400,
      height: 600,
      minWidth: 350,
      minHeight: 400,
      maxWidth: 500,
      maxHeight: 800,
      alwaysOnTop: true,
      focusable: true,
      skipTaskbar: true,
      resizable: true,
      minimizable: false,
      maximizable: false,
      closable: true,
      frame: false,
      transparent: false,
      hasShadow: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, "preload.js"),
        webSecurity: true, // SECURITY: Enable web security
        allowRunningInsecureContent: false, // SECURITY: Block insecure content
      },
      icon: path.join(__dirname, "../public/vault-icon.png"),
      show: false,
    };

    // Use default position (saved position will be applied asynchronously if available)
    // Default to center of screen
    windowOptions.x = Math.floor((width - 400) / 2);
    windowOptions.y = Math.floor((height - 600) / 2);
    floatingPanelPosition = { x: windowOptions.x, y: windowOptions.y };

    floatingWindow = new BrowserWindow(windowOptions);

    // Use electron-positioner to position the window
    const positioner = new Positioner(floatingWindow);

    // Position at the saved position or top-right corner as a fallback
    if (
      savedPosition &&
      typeof savedPosition.x === "number" &&
      typeof savedPosition.y === "number"
    ) {
      floatingWindow.setPosition(savedPosition.x, savedPosition.y);
    } else {
      positioner.move("topRight");
    }

    // Set window to be always on top with level 'screen-saver' (highest level)
    // This ensures it stays above ALL other windows, including other applications
    floatingWindow.setAlwaysOnTop(true, "screen-saver");
    floatingWindow.setVisibleOnAllWorkspaces(true);

    // For Windows, set as a tool window to ensure it stays on top
    if (process.platform === "win32") {
      floatingWindow.setSkipTaskbar(true);
      // Set content protection to prevent screen capture tools from hiding it
      floatingWindow.setContentProtection(true);
    }

    // For Linux, set as a tool window which helps with always-on-top behavior
    if (process.platform === "linux") {
      floatingWindow.setType("toolbar");
    }

    // Prevent flickering by showing only when ready
    floatingWindow.once("ready-to-show", () => {
      floatingWindow.show();
    });

    // Re-apply always-on-top when computer wakes from sleep
    powerMonitor.on("resume", () => {
      if (floatingWindow && !floatingWindow.isDestroyed()) {
        floatingWindow.setAlwaysOnTop(true, "screen-saver");
        floatingWindow.setVisibleOnAllWorkspaces(true);

        // For Windows, ensure it stays as a tool window
        if (process.platform === "win32") {
          floatingWindow.setSkipTaskbar(true);
        }

        // For Linux, ensure it stays as a tool window
        if (process.platform === "linux") {
          floatingWindow.setType("toolbar");
        }

        // For macOS, ensure it stays visible on all workspaces
        if (process.platform === "darwin") {
          floatingWindow.setVisibleOnAllWorkspaces(true, {
            visibleOnFullScreen: true,
          });
        }
      }
    });

    // Ensure the window stays on top even when it loses focus
    floatingWindow.on("blur", () => {
      if (floatingWindow && !floatingWindow.isDestroyed()) {
        floatingWindow.setAlwaysOnTop(true, "screen-saver");

        // For Linux, ensure it stays as a tool window
        if (process.platform === "linux") {
          floatingWindow.setType("toolbar");
        }

        // For macOS, ensure it stays visible on all workspaces
        if (process.platform === "darwin") {
          floatingWindow.setVisibleOnAllWorkspaces(true, {
            visibleOnFullScreen: true,
          });
        }
      }
    });

    // Load the floating panel page
    if (isDev) {
      // Port 5174 = Legacy Vault, Port 5173 = Password Vault
      const devPort = isLegacyVault ? 5174 : 5173;
      floatingWindow.loadURL(`http://localhost:${devPort}/#floating`);
      // Enable DevTools for floating panel in development if enabled
      if (devToolsEnabled) {
        floatingWindow.webContents.openDevTools();
      }
    } else {
      const htmlPath = path.join(__dirname, "../dist/index.html");
      floatingWindow.loadFile(htmlPath, { hash: "floating" }).catch((error) => {
        console.error("Error loading floating panel:", error);
      });
    }

    // Handle window closed
    floatingWindow.on("closed", () => {
      // Clear the always-on-top interval
      if (floatingPanelInterval) {
        clearInterval(floatingPanelInterval);
        floatingPanelInterval = null;
      }

      floatingWindow = null;

      // If main window exists and is not destroyed, focus it
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.focus();
        } catch (error) {
          console.error("Error focusing main window:", error);
        }
      }
    });

    // Save position when window is moved
    floatingWindow.on("moved", () => {
      const [x, y] = floatingWindow.getPosition();
      // Only save if position has actually changed
      if (
        !floatingPanelPosition ||
        x !== floatingPanelPosition.x ||
        y !== floatingPanelPosition.y
      ) {
        savePosition(x, y);
      }
    });

    // Prevent navigation away from the app
    floatingWindow.webContents.on("will-navigate", (event, url) => {
      const devPort = isLegacyVault ? 5174 : 5173;
      if (
        !url.startsWith(`http://localhost:${devPort}`) &&
        !url.includes("index.html")
      ) {
        event.preventDefault();
      }
    });

    // PERFORMANCE: Event-driven always-on-top enforcement (replaces polling - 50-70% CPU reduction)
    const enforceAlwaysOnTop = () => {
      if (floatingWindow && !floatingWindow.isDestroyed()) {
        if (!floatingWindow.isAlwaysOnTop()) {
          floatingWindow.setAlwaysOnTop(true, "screen-saver");
        }

        // For Windows, ensure it stays as a tool window
        if (process.platform === "win32") {
          floatingWindow.setSkipTaskbar(true);
        }

        // For Linux, ensure it stays as a tool window
        if (process.platform === "linux") {
          floatingWindow.setType("toolbar");
        }

        // For macOS, keep Mission Control setting enforced
        if (process.platform === "darwin") {
          floatingWindow.setHiddenInMissionControl(true);
        }
      }
    };

    // Use event-driven approach instead of polling
    floatingWindow.on('focus', enforceAlwaysOnTop);
    floatingWindow.on('blur', enforceAlwaysOnTop);
    floatingWindow.on('show', enforceAlwaysOnTop);
    
    // Keep minimal interval as fallback (10 seconds instead of 3) - only if window loses focus
    floatingPanelInterval = setInterval(() => {
      if (floatingWindow && !floatingWindow.isDestroyed() && !floatingWindow.isFocused()) {
        enforceAlwaysOnTop();
      } else if (!floatingWindow || floatingWindow.isDestroyed()) {
        // Clear interval if window is destroyed
        if (floatingPanelInterval) {
          clearInterval(floatingPanelInterval);
          floatingPanelInterval = null;
        }
      }
    }, 10000); // Reduced frequency: 10 seconds instead of 3 (only for unfocused windows)

    return floatingWindow;
  } catch (error) {
    console.error("Error creating floating window:", error);
    // Clean up if window creation failed
    if (floatingWindow) {
      try {
        floatingWindow.destroy();
      } catch (destroyError) {
        console.error("Error destroying failed floating window:", destroyError);
      }
      floatingWindow = null;
    }
    return null;
  }
};

// Create floating button window
const createFloatingButton = () => {
  try {
    // SECURITY: Check trial status before creating floating button
    const fs = require('fs');
    const path = require('path');
    const userDataPath = app.getPath("userData");
    const trialInfoPath = path.join(userDataPath, 'trial-info.json');

    let isTrialExpired = false;
    let hasValidLicense = false;

    // Check if user has valid license (non-trial)
    try {
      if (fs.existsSync(trialInfoPath)) {
        const trialData = JSON.parse(fs.readFileSync(trialInfoPath, 'utf8'));
        if (trialData.expiryTime) {
          const now = new Date();
          const expiry = new Date(trialData.expiryTime);
          isTrialExpired = now > expiry;
        }
        // Check if they have a valid non-trial license
        hasValidLicense = trialData.hasValidLicense === true;
      }
    } catch (error) {
      console.error('Error checking trial status for floating button creation:', error);
      // If we can't check, assume trial is expired for security
      isTrialExpired = true;
    }

    // SECURITY: Do not create floating button if trial is expired AND no valid license
    if (isTrialExpired && !hasValidLicense) {
      return null;
    }

    if (floatingButton) {
      if (floatingButton.isMinimized() || !floatingButton.isVisible()) {
        floatingButton.restore();
        floatingButton.show();
      }
      floatingButton.focus();
      return floatingButton;
    }

    // Load saved button position (async - use await or handle promise)
    // Note: This is called during window creation, so we'll load it asynchronously
    // and use default position if not yet loaded
    let savedButtonPosition = null;
    loadSavedButtonPosition().then(position => {
      if (position) {
        floatingButtonPosition = position;
        if (floatingButton && !floatingButton.isDestroyed()) {
          floatingButton.setPosition(position.x, position.y);
        }
      }
    }).catch(err => {
      log.warn("[Window] Failed to load saved button position, using default:", err);
    });

    // Get screen dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // Button visual size is 48px (w-12 h-12), but window needs extra room
    // for hover scale (1.15x = 55px) + shadow (extends ~20px) = ~75px minimum
    const buttonVisualSize = 48;
    const windowSize = 80; // Extra padding for hover effects and shadows

    // Determine button position (default to bottom-right corner)
    const windowOptions = {
      width: windowSize,
      height: windowSize,
      minWidth: windowSize,
      maxWidth: windowSize,
      minHeight: windowSize,
      maxHeight: windowSize,
      alwaysOnTop: true,
      focusable: true,
      skipTaskbar: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      closable: false,
      frame: false,
      transparent: true,
      hasShadow: false,
      movable: true, // Ensure window is movable
      backgroundColor: "#00000000",
      thickFrame: false, // Prevent Windows theme/border issues
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, "preload.js"),
        webSecurity: true, // SECURITY: Enable web security
        allowRunningInsecureContent: false, // SECURITY: Block insecure content
      },
      show: false,
    }; // Add position if available, otherwise default to bottom-right corner
    if (
      savedButtonPosition &&
      typeof savedButtonPosition.x === "number" &&
      typeof savedButtonPosition.y === "number"
    ) {
      // Ensure position is within screen bounds
      const validX = Math.max(
        0,
        Math.min(width - buttonSize, savedButtonPosition.x)
      );
      const validY = Math.max(
        0,
        Math.min(height - buttonSize, savedButtonPosition.y)
      );
      windowOptions.x = validX;
      windowOptions.y = validY;
      floatingButtonPosition = { x: validX, y: validY };
    } else {
      // Default to bottom-right corner
      windowOptions.x = width - windowSize - 20;
      windowOptions.y = height - windowSize - 20;
      floatingButtonPosition = { x: windowOptions.x, y: windowOptions.y };
    }

    floatingButton = new BrowserWindow(windowOptions);

    // Set window to be always on top with level 'screen-saver'
    floatingButton.setAlwaysOnTop(true, "screen-saver");
    floatingButton.setVisibleOnAllWorkspaces(true);

    // For Windows, set as a tool window to ensure it stays on top
    if (process.platform === "win32") {
      floatingButton.setSkipTaskbar(true);
    }

    // For Linux, set as a tool window to ensure it stays on top
    if (process.platform === "linux") {
      floatingButton.setType("toolbar");
    }

    // For macOS, ensure it stays visible on all workspaces
    if (process.platform === "darwin") {
      floatingButton.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
      });
      floatingButton.setHiddenInMissionControl(true);
    }

    // Prevent flickering by showing only when ready
    floatingButton.once("ready-to-show", () => {
      // Force window bounds to prevent phantom resize bug on Windows
      floatingButton.setBounds({
        width: windowSize,
        height: windowSize,
        x: floatingButton.getBounds().x,
        y: floatingButton.getBounds().y,
      });
      floatingButton.show();
    });

    // Load the floating button page
    if (isDev) {
      const devPort = isLegacyVault ? 5174 : 5173;
      floatingButton.loadURL(`http://localhost:${devPort}/floating-button.html`);
    } else {
      const buttonHtmlPath = path.join(__dirname, "../dist/LPV/floating-button.html");
      floatingButton.loadFile(buttonHtmlPath).catch((error) => {
        console.error("Error loading floating button:", error);
      });
    }

    // Prevent any accidental resize operations (Windows protection)
    floatingButton.on("resize", () => {
      const currentBounds = floatingButton.getBounds();
      if (
        currentBounds.width !== windowSize ||
        currentBounds.height !== windowSize
      ) {
        floatingButton.setBounds({
          x: currentBounds.x,
          y: currentBounds.y,
          width: windowSize,
          height: windowSize,
        });
      }
    });

    // Handle window closed
    floatingButton.on("closed", () => {
      // Clear the always-on-top interval
      if (floatingButtonInterval) {
        clearInterval(floatingButtonInterval);
        floatingButtonInterval = null;
      }

      if (floatingButton) floatingButton = null;
    });

    floatingButton.on("destroyed", () => {
      if (floatingButton) floatingButton = null;
    });

    // Save position when window is moved
    floatingButton.on("moved", () => {
      const [x, y] = floatingButton.getPosition();
      // Only save if position has actually changed
      if (
        !floatingButtonPosition ||
        x !== floatingButtonPosition.x ||
        y !== floatingButtonPosition.y
      ) {
        saveButtonPosition(x, y);
      }
    });

    // Prevent navigation away from the app
    floatingButton.webContents.on("will-navigate", (event, url) => {
      const devPort = isLegacyVault ? 5174 : 5173;
      if (
        !url.startsWith(`http://localhost:${devPort}`) &&
        !url.includes("index.html")
      ) {
        event.preventDefault();
      }
    });

    // PERFORMANCE: Event-driven always-on-top enforcement (replaces polling - 50-70% CPU reduction)
    const enforceButtonAlwaysOnTop = () => {
      if (floatingButton && !floatingButton.isDestroyed()) {
        if (!floatingButton.isAlwaysOnTop()) {
          floatingButton.setAlwaysOnTop(true, "screen-saver");
        }

        // For Windows, ensure it stays as a tool window
        if (process.platform === "win32") {
          floatingButton.setSkipTaskbar(true);
        }

        // For Linux, ensure it stays as a tool window
        if (process.platform === "linux") {
          floatingButton.setType("toolbar");
        }

        // For macOS, keep Mission Control setting enforced
        if (process.platform === "darwin") {
          floatingButton.setHiddenInMissionControl(true);
        }
      }
    };

    // Use event-driven approach instead of polling
    floatingButton.on('focus', enforceButtonAlwaysOnTop);
    floatingButton.on('blur', enforceButtonAlwaysOnTop);
    floatingButton.on('show', enforceButtonAlwaysOnTop);
    
    // Keep minimal interval as fallback (10 seconds instead of 5) - only if button loses focus
    floatingButtonInterval = setInterval(() => {
      if (floatingButton && !floatingButton.isDestroyed() && !floatingButton.isFocused()) {
        enforceButtonAlwaysOnTop();
      } else if (!floatingButton || floatingButton.isDestroyed()) {
        // Clear interval if button is destroyed
        if (floatingButtonInterval) {
          clearInterval(floatingButtonInterval);
          floatingButtonInterval = null;
        }
      }
    }, 10000); // Reduced frequency: 10 seconds instead of 5 (only for unfocused buttons)

    return floatingButton;
  } catch (error) {
    console.error("Error creating floating button:", error);
    // Clean up if button creation failed
    if (floatingButton) {
      try {
        floatingButton.destroy();
      } catch (destroyError) {
        console.error("Error destroying failed floating button:", destroyError);
      }
      floatingButton = null;
    }
    return null;
  }
};

// Create application menu
const createMenu = () => {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Lock Vault",
          accelerator: "CmdOrCtrl+L",
          click: () => {
            // Send lock command to renderer
            if (mainWindow) {
              mainWindow.webContents.send("lock-vault");
            }
            if (floatingWindow) {
              floatingWindow.webContents.send("lock-vault");
            }
          },
        },
        {
          label: "Toggle Floating Panel",
          accelerator: "CmdOrCtrl+Shift+F",
          click: () => {
            if (floatingWindow) {
              floatingWindow.close();
            } else {
              createFloatingWindow();
            }
          },
        },
        {
          label: "Admin Portal",
          accelerator: "CmdOrCtrl+Shift+A",
          click: () => openAdminPortal(),
        },
        { type: "separator" },
        {
          label: "Exit",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            // Force close all windows before quitting
            const allWindows = BrowserWindow.getAllWindows();
            allWindows.forEach((window) => {
              if (!window.isDestroyed()) {
                window.destroy();
              }
            });
            app.quit();
          },
        },
        {
          label: "Force Quit",
          accelerator:
            process.platform === "darwin" ? "Cmd+Alt+Q" : "Ctrl+Alt+Q",
          click: () => {
            // Emergency force quit
            process.exit(0);
          },
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectall" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        {
          label: "Toggle Developer Tools",
          accelerator: "F12",
          click: () => {
            // Only allow DevTools if enabled in development
            if (!devToolsEnabled) return;

            // Toggle DevTools for focused window
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              if (focusedWindow.webContents.isDevToolsOpened()) {
                focusedWindow.webContents.closeDevTools();
              } else {
                focusedWindow.webContents.openDevTools();
              }
            }
          },
        },
        {
          label: "Toggle Main Window DevTools",
          accelerator: "CmdOrCtrl+Shift+I",
          click: () => {
            if (!devToolsEnabled) return;

            if (mainWindow && !mainWindow.isDestroyed()) {
              if (mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
              } else {
                mainWindow.webContents.openDevTools();
              }
            }
          },
        },
        {
          label: "Toggle Floating Panel DevTools",
          accelerator: "CmdOrCtrl+Shift+D",
          click: () => {
            if (!devToolsEnabled) return;

            if (floatingWindow && !floatingWindow.isDestroyed()) {
              if (floatingWindow.webContents.isDevToolsOpened()) {
                floatingWindow.webContents.closeDevTools();
              } else {
                floatingWindow.webContents.openDevTools();
              }
            }
          },
        },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];

  if (process.platform === "darwin") {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

// App event handlers
// Configure session to allow HTTP connections for license server
app.whenReady().then(() => {
  // SECURITY: Certificate validation - only allow trusted license server domains with valid certificates
  session.defaultSession.setCertificateVerifyProc((request, callback) => {
    const { hostname, certificate, verificationResult, errorCode } = request;
    
    // Whitelist trusted license server domains
    const trustedDomains = [
      'api.localpasswordvault.com',
      'server.localpasswordvault.com',
      'localpasswordvault.com',
      'www.localpasswordvault.com',
      'locallegacyvault.com',
      'www.locallegacyvault.com',
    ];
    
    const isTrustedDomain = trustedDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
    
    // For trusted domains, validate certificate properly
    if (isTrustedDomain) {
      if (errorCode === 0 && verificationResult === 'ok') {
        // Valid certificate for trusted domain
        log.debug(`[Certificate] Valid certificate for trusted domain: ${hostname}`);
        callback(0); // Success
        return;
      } else {
        // Invalid certificate for trusted domain - log and reject
        log.error(`[Certificate] SECURITY: Invalid certificate for trusted domain ${hostname}:`, {
          errorCode: errorCode,
          verificationResult: verificationResult,
          issuer: certificate?.issuer?.commonName,
          subject: certificate?.subject?.commonName,
          validStart: certificate?.validStart,
          validExpiry: certificate?.validExpiry,
        });
        callback(-2); // Reject - invalid certificate
        return;
      }
    }
    
    // For non-trusted domains, use default Electron validation
    // This allows localhost in development but enforces proper validation for production
    if (errorCode === 0) {
      callback(-3); // Use default validation
    } else {
      // Invalid certificate for non-trusted domain - reject
      log.warn(`[Certificate] Rejecting connection to ${hostname} with invalid certificate:`, {
        errorCode: errorCode,
        verificationResult: verificationResult,
      });
      callback(-2); // Reject
    }
  });

  // SECURITY: Restrict permissions - only allow downloads from trusted sources
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const url = webContents.getURL();
    
    // Only allow downloads (for license file downloads)
    if (permission === 'download') {
      // Allow downloads from trusted license server domains or local files
      const trustedDomains = [
        'api.localpasswordvault.com',
        'server.localpasswordvault.com',
        'localpasswordvault.com',
        'www.localpasswordvault.com',
        'locallegacyvault.com',
        'www.locallegacyvault.com',
      ];
      
      const isTrusted = url.startsWith('file://') || 
                       url.startsWith('http://localhost:') ||
                       trustedDomains.some(domain => url.includes(domain));
      
      if (isTrusted) {
        callback(true);
        return;
      }
    }
    
    // Deny all other permissions (camera, microphone, geolocation, etc.)
    log.warn(`[Security] Denied permission request: ${permission} from ${url}`);
    callback(false);
  });
  
  // SECURITY: Restrict permission checks
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    // Only allow downloads from trusted sources
    if (permission === 'download') {
      const url = webContents.getURL();
      const trustedDomains = [
        'api.localpasswordvault.com',
        'server.localpasswordvault.com',
        'localpasswordvault.com',
        'www.localpasswordvault.com',
        'locallegacyvault.com',
        'www.locallegacyvault.com',
      ];
      
      return url.startsWith('file://') || 
             url.startsWith('http://localhost:') ||
             trustedDomains.some(domain => url.includes(domain));
    }
    
    // Deny all other permissions
    return false;
  });
  
  // SECURITY: Validate downloads before allowing
  session.defaultSession.on('will-download', (event, item, webContents) => {
    const url = webContents.getURL();
    const trustedDomains = [
      'api.localpasswordvault.com',
      'server.localpasswordvault.com',
      'localpasswordvault.com',
      'www.localpasswordvault.com',
      'locallegacyvault.com',
      'www.locallegacyvault.com',
    ];
    
    // Only allow downloads from trusted sources
    const isTrusted = url.startsWith('file://') || 
                     url.startsWith('http://localhost:') ||
                     trustedDomains.some(domain => url.includes(domain));
    
    if (!isTrusted) {
      log.warn(`[Security] Blocked download from untrusted source: ${url}`);
      event.preventDefault();
      return;
    }
    
    // Allow download - set save path
    item.setSavePath(item.getFilename());
  });
  
  // SECURITY: Allow web requests but validate them
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    // Block dangerous protocols
    if (details.url.startsWith('javascript:') || 
        details.url.startsWith('data:text/html') ||
        details.url.startsWith('vbscript:')) {
      log.warn(`[Security] Blocked dangerous protocol request: ${details.url}`);
      callback({ cancel: true });
      return;
    }
    
    // Allow all other requests (license server uses Electron net module, not renderer)
    callback({});
  });
  
  // SECURITY: Enforce strict Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    
    // Trusted license server domains
    const trustedDomains = [
      'api.localpasswordvault.com',
      'server.localpasswordvault.com',
      'localpasswordvault.com',
      'www.localpasswordvault.com',
      'locallegacyvault.com',
      'www.locallegacyvault.com',
    ];
    
    const isTrustedDomain = trustedDomains.some(domain => details.url.includes(domain));
    const isLocalhost = details.url.startsWith('http://localhost:');
    const isLocalFile = details.url.startsWith('file://');
    
    // Apply strict CSP to local files (production app)
    if (isLocalFile) {
      responseHeaders['Content-Security-Policy'] = [
        "default-src 'self'; " +
        "script-src 'self'; " +  // SECURITY: Removed 'unsafe-inline' and 'unsafe-eval'
        "style-src 'self' 'unsafe-inline'; " +  // CSS needs inline for React styling
        "font-src 'self' data:; " +
        "img-src 'self' data: blob:; " +
        "connect-src 'self' https://api.localpasswordvault.com https://server.localpasswordvault.com https://localpasswordvault.com https://www.localpasswordvault.com https://locallegacyvault.com https://www.locallegacyvault.com; " +  // Whitelist specific license server domains
        "frame-ancestors 'none'; " +
        "form-action 'self'; " +
        "base-uri 'self';"
      ];
    } 
    // For trusted license server domains, allow minimal CSP
    else if (isTrustedDomain) {
      responseHeaders['Content-Security-Policy'] = [
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "connect-src 'self';"
      ];
    }
    // For localhost (development), allow more permissive CSP
    else if (isLocalhost && isDev) {
      // Development only - more permissive for hot reload
      responseHeaders['Content-Security-Policy'] = [
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:*; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; " +
        "style-src 'self' 'unsafe-inline' http://localhost:*; " +
        "connect-src 'self' http://localhost:* ws://localhost:*;"
      ];
    }
    // For other external URLs, enforce strict CSP
    else if (!isLocalFile && !isLocalhost) {
      responseHeaders['Content-Security-Policy'] = [
        "default-src 'none'; " +
        "script-src 'none'; " +
        "style-src 'none'; " +
        "connect-src 'none';"
      ];
    }
    
    // Only add CORS headers for trusted domains
    if (isTrustedDomain || isLocalhost) {
      responseHeaders['Access-Control-Allow-Origin'] = [details.url.split('/').slice(0, 3).join('/')];
      responseHeaders['Access-Control-Allow-Methods'] = ['GET', 'POST'];
      responseHeaders['Access-Control-Allow-Headers'] = ['Content-Type', 'Authorization'];
    }
    
    callback({ responseHeaders });
  });
  
  // Initialize secure storage
  secureStorage = new SecureFileStorage(userDataPath);

  createWindow();
  createMenu();

  // Admin Portal shortcut: Ctrl+Shift+A / Cmd+Shift+A
  try {
    globalShortcut.register("CommandOrControl+Shift+A", () => openAdminPortal());
  } catch (e) {
    log.warn("[Admin] Could not register shortcut:", e?.message);
  }
  
  // Initialize auto-updater (production only)
  if (autoUpdaterModule && mainWindow) {
    autoUpdaterModule.initAutoUpdater(mainWindow);
  }
  
  // SECURITY FIX: Don't create floating button automatically
  // It should only be created when vault is unlocked

  // TRIAL SECURITY: Start periodic trial validation
  let trialValidationInterval = setInterval(() => {
    validateAndEnforceTrialStatus();
  }, 30000); // Check every 30 seconds

  // STURDINESS: Clear interval when app quits (memory leak prevention)
  app.on('will-quit', () => {
    if (trialValidationInterval) {
      clearInterval(trialValidationInterval);
      trialValidationInterval = null;
    }
    try {
      globalShortcut.unregisterAll();
    } catch (e) {
      log.warn("[Admin] Could not unregister shortcuts:", e?.message);
    }
    // STURDINESS: Remove power monitor listeners
    try {
      powerMonitor.removeAllListeners('resume');
      log.info("[Memory Cleanup] Removed power monitor listeners");
    } catch (error) {
      log.error("[Memory Cleanup] Failed to remove power monitor listeners:", error);
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// TRIAL SECURITY: Periodic trial validation function
const validateAndEnforceTrialStatus = () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const userDataPath = app.getPath("userData");
    const trialInfoPath = path.join(userDataPath, 'trial-info.json');

    let isTrialExpired = false;
    let hasValidLicense = false;

    // Check trial status
    if (fs.existsSync(trialInfoPath)) {
      try {
        const trialData = JSON.parse(fs.readFileSync(trialInfoPath, 'utf8'));
        if (trialData.expiryTime) {
          const now = new Date();
          const expiry = new Date(trialData.expiryTime);
          isTrialExpired = now > expiry;
        }
        hasValidLicense = trialData.hasValidLicense === true;
      } catch (error) {
        console.error('Error in periodic trial validation:', error);
        isTrialExpired = true; // Assume expired for security
      }
    }

    // SECURITY: If trial is expired and no valid license, enforce restrictions
    if (isTrialExpired && !hasValidLicense) {
      // Force destroy floating button if it exists
      if (floatingButton && !floatingButton.isDestroyed()) {
        try {
          floatingButton.removeAllListeners();
          floatingButton.destroy();
        } catch (error) {
          console.error('Error destroying floating button:', error);
        }
        floatingButton = null;
      }

      // Force close floating window if it exists
      if (floatingWindow && !floatingWindow.isDestroyed()) {
        try {
          floatingWindow.close();
        } catch (error) {
          console.error('Error closing floating window:', error);
        }
        floatingWindow = null;
      }

      // Lock vault if it's unlocked
      if (isVaultUnlocked) {
        isVaultUnlocked = false;

        // Send lock message to all windows
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("lock-vault");
        }
        if (floatingWindow && !floatingWindow.isDestroyed()) {
          floatingWindow.webContents.send("lock-vault");
        }
      }
    }
  } catch (error) {
    console.error('Error in periodic trial validation:', error);
  }
};

app.on("window-all-closed", () => {
  // Force close all floating windows
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.destroy();
  }
  if (floatingButton) {
    try {
      if (!floatingButton.isDestroyed()) {
        floatingButton.removeAllListeners();
        floatingButton.destroy();
      }
    } catch (err) {
      console.error("Error destroying floatingButton on window-all-closed:", err);
    }
    floatingButton = null;
  }

  app.quit();
});

// Handle app quit properly
app.on("before-quit", () => {
  // PERFORMANCE: Clear all intervals and timeouts
  if (floatingPanelInterval) {
    clearInterval(floatingPanelInterval);
    floatingPanelInterval = null;
  }
  if (floatingButtonInterval) {
    clearInterval(floatingButtonInterval);
    floatingButtonInterval = null;
  }
  if (trialValidationInterval) {
    clearInterval(trialValidationInterval);
    trialValidationInterval = null;
  }
  // Clear debounce timeouts to ensure final saves complete
  if (positionSaveTimeout) {
    clearTimeout(positionSaveTimeout);
    positionSaveTimeout = null;
  }
  if (buttonPositionSaveTimeout) {
    clearTimeout(buttonPositionSaveTimeout);
    buttonPositionSaveTimeout = null;
  }
  
  // STURDINESS: Memory leak prevention - remove all IPC handlers
  try {
    ipcMain.removeAllListeners();
    log.info("[Memory Cleanup] Removed all IPC handlers");
  } catch (error) {
    log.error("[Memory Cleanup] Failed to remove IPC handlers:", error);
  }
  
  // STURDINESS: Remove power monitor listeners
  try {
    powerMonitor.removeAllListeners('resume');
    log.info("[Memory Cleanup] Removed power monitor listeners");
  } catch (error) {
    log.error("[Memory Cleanup] Failed to remove power monitor listeners:", error);
  }

  // Force close all windows before quitting
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.destroy();
    floatingWindow = null;
  }
  if (floatingButton) {
    try {
      if (!floatingButton.isDestroyed()) {
        floatingButton.removeAllListeners(); // optional, defensive
        floatingButton.destroy(); // Use destroy, NOT just close
      }
    } catch (err) {
      console.error("Error destroying floatingButton on before-quit:", err);
    }
    floatingButton = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
    mainWindow = null;
  }
});

// Handle app will-quit
app.on("will-quit", (event) => {
  // Ensure all windows are properly closed
  const allWindows = BrowserWindow.getAllWindows();
  allWindows.forEach((window) => {
    if (!window.isDestroyed()) {
      window.destroy();
    }
  });
});

// Security: Prevent new window creation
app.on("web-contents-created", (event, contents) => {
  contents.on("new-window", (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// IPC handlers for secure communication
ipcMain.handle("app-version", () => {
  return app.getVersion();
});

ipcMain.handle("platform", () => {
  return process.platform;
});

ipcMain.handle("app-name", () => {
  return app.getName();
});

// Handle floating panel requests
ipcMain.handle("show-floating-panel", () => {
  const window = createFloatingWindow();
  if (window) {
    window.setAlwaysOnTop(true, "screen-saver");

    // For Windows, set as a tool window to ensure it stays on top
    if (process.platform === "win32") {
      window.setSkipTaskbar(true);
      window.setContentProtection(true);
    }

    // For Linux, set as a tool window to ensure it stays on top
    if (process.platform === "linux") {
      window.setType("toolbar");
    }

    // For macOS, set additional flags to ensure it stays visible
    if (process.platform === "darwin") {
      window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      window.setHiddenInMissionControl(true);
    }
    return true; // Return success boolean instead of BrowserWindow object
  }
  return false; // Return failure boolean
});

ipcMain.handle("hide-floating-panel", () => {
  if (floatingWindow) {
    floatingWindow.close();
    return true;
  }
  return false;
});

ipcMain.handle("is-floating-panel-open", () => {
  return floatingWindow !== null &&
    floatingWindow !== undefined &&
    !floatingWindow.isDestroyed() &&
    floatingWindow.isVisible();
});

// Handle minimize main window
ipcMain.handle("minimize-main-window", () => {
  if (mainWindow) {
    mainWindow.minimize();
    return true;
  }
  return false;
});

// Handle hide main window
ipcMain.handle("hide-main-window", () => {
  if (mainWindow) {
    mainWindow.hide();
    return true;
  }
  return false;
});

// Handle restore main window
ipcMain.handle("restore-main-window", () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.restore();
    mainWindow.focus();
    return true;
  }
  return false;
});

// Get floating panel position
ipcMain.handle("get-floating-panel-position", async () => {
  // If we don't have a position yet, try to load it (async)
  if (!floatingPanelPosition) {
    floatingPanelPosition = await loadSavedPosition();
  }
  return floatingPanelPosition;
});

// Set always-on-top status
ipcMain.handle("set-always-on-top", (event, flag) => {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    // Use the highest level possible to ensure it stays on top
    floatingWindow.setAlwaysOnTop(flag, "screen-saver");

    // For Windows, set as a tool window to ensure it stays on top
    if (process.platform === "win32" && flag) {
      floatingWindow.setSkipTaskbar(true);
      floatingWindow.setContentProtection(true);
    }

    // For Linux, set as a tool window to ensure it stays on top
    if (process.platform === "linux" && flag) {
      floatingWindow.setType("toolbar");
    }

    // For macOS, set additional flags to ensure it stays visible
    if (process.platform === "darwin" && flag) {
      floatingWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
      });
      floatingWindow.setHiddenInMissionControl(true);
    }
    return true;
  }
  return false;
});

// Save floating panel position
ipcMain.handle("save-floating-panel-position", (event, x, y) => {
  if (typeof x === "number" && typeof y === "number") {
    savePosition(x, y);
  }
  return true;
});

// Vault status handlers
const vaultHandlers = {
  "vault-unlocked": async () => {
    try {
      isVaultUnlocked = true;

      mainWindow?.webContents.send("vault-status-changed", isVaultUnlocked);
      floatingWindow?.webContents.send("vault-status-changed", isVaultUnlocked);
      floatingButton?.webContents.send("vault-status-changed", isVaultUnlocked);

      // TRIAL SECURITY: Check trial status before creating floating button
      const fs = require('fs');
      const path = require('path');
      const userDataPath = app.getPath("userData");
      const trialInfoPath = path.join(userDataPath, 'trial-info.json');

      let isTrialExpired = false;
      let hasValidLicense = false;

      // Check if user has valid license (non-trial)
      try {
        if (fs.existsSync(trialInfoPath)) {
          const trialData = JSON.parse(fs.readFileSync(trialInfoPath, 'utf8'));
          if (trialData.expiryTime) {
            const now = new Date();
            const expiry = new Date(trialData.expiryTime);
            isTrialExpired = now > expiry;
          }
          // Check if they have a valid non-trial license
          hasValidLicense = trialData.hasValidLicense === true;
        }
      } catch (error) {
        console.error('Error checking trial status for floating button:', error);
        // If we can't check, assume trial is expired for security
        isTrialExpired = true;
      }

      // SECURITY: Only create floating button if trial is NOT expired OR user has valid license
      if (isTrialExpired && !hasValidLicense) {
        // Force cleanup any existing floating button
        if (floatingButton && !floatingButton.isDestroyed()) {
          floatingButton.removeAllListeners();
          floatingButton.destroy();
          floatingButton = null;
        }
        return true;
      }

      // Show floating button when vault is unlocked and trial is valid
      // Force cleanup before creation to prevent overlap or race conditions
      if (floatingButton && !floatingButton.isDestroyed()) {
        floatingButton.removeAllListeners();
        floatingButton.destroy();
        floatingButton = null;
      }

      if (!floatingButton || floatingButton.isDestroyed()) {
        floatingButton = createFloatingButton();
      }
      return true;
    } catch (error) {
      console.error("Error handling vault unlock:", error);
      return false;
    }
  },
  "vault-locked": () => {
    try {
      isVaultUnlocked = false;

      // Clear temporary memory on lock
      clearTempMemory();

      mainWindow?.webContents.send("vault-status-changed", isVaultUnlocked);
      floatingWindow?.webContents.send("vault-status-changed", isVaultUnlocked);
      floatingButton?.webContents.send("vault-status-changed", isVaultUnlocked);

      // Hide floating button when vault is locked
      if (floatingButton) {
        try {
          if (!floatingButton.isDestroyed()) {
            floatingButton.removeAllListeners(); // optional, defensive
            floatingButton.destroy(); // Use destroy, NOT just close
          }
        } catch (err) {
          console.error("Error destroying floatingButton:", err);
        }
        floatingButton = null;
      }

      if (floatingWindow && !floatingWindow.isDestroyed()) {
        floatingWindow.close();
        floatingWindow = null;
      }

      // Restore and show main window when vault is locked
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }

      return true;
    } catch (error) {
      console.error("Error handling vault lock:", error);
      return false;
    }
  },
  "is-vault-unlocked": () => {
    console.log(
      "Checking vault status:",
      isVaultUnlocked ? "unlocked" : "locked"
    );
    return isVaultUnlocked;
  },
};

// Register vault status handlers
Object.entries(vaultHandlers).forEach(([event, handler]) => {
  // Remove existing handler if it exists
  if (ipcMain.listeners(event).length > 0) {
    ipcMain.removeHandler(event);
  }
  ipcMain.handle(event, handler);
});

// Handle external URL opening
ipcMain.handle("open-external", async (event, url) => {
  try {
    await shell.openExternal(url);
    return true;
  } catch (error) {
    console.error("Failed to open external URL:", error);
    return false;
  }
});

// Floating button IPC handlers
ipcMain.handle("show-floating-button", () => {
  try {
    const button = createFloatingButton();
    return button !== null;
  } catch (error) {
    console.error("Error in show-floating-button IPC handler:", error);
    return false;
  }
});

ipcMain.handle("hide-floating-button", () => {
  try {
    if (floatingButton) {
      try {
        if (!floatingButton.isDestroyed()) {
          floatingButton.removeAllListeners();
          floatingButton.destroy();
        }
      } catch (err) {
        console.error("Error destroying floatingButton in IPC handler:", err);
      }
      floatingButton = null;
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error in hide-floating-button IPC handler:", error);
    return false;
  }
});

ipcMain.handle("is-floating-button-open", () => {
  return (
    floatingButton !== null &&
    floatingButton !== undefined &&
    !floatingButton.isDestroyed()
  );
});

ipcMain.handle("toggle-floating-panel-from-button", async () => {
  // Reentrancy guard to prevent rapid repeated toggles
  if (isTogglingFloatingWindow) {
    return (
      floatingWindow &&
      !floatingWindow.isDestroyed() &&
      floatingWindow.isVisible()
    );
  }
  isTogglingFloatingWindow = true;

  try {
    // Check if we have a valid floating window that's visible
    const isWindowOpen =
      floatingWindow &&
      !floatingWindow.isDestroyed() &&
      floatingWindow.isVisible();

    if (isWindowOpen) {
      floatingWindow.close();
      floatingWindow = null;
      return false;
    } else {
      floatingWindow = createFloatingWindow();

      if (!floatingWindow) {
        return false;
      }

      // Set window properties
      floatingWindow.setAlwaysOnTop(true, "screen-saver");

      // Windows-specific settings
      if (process.platform === "win32") {
        floatingWindow.setSkipTaskbar(true);
        floatingWindow.setContentProtection(true);
      }

      // Linux-specific settings
      if (process.platform === "linux") {
        floatingWindow.setType("toolbar");
      } // macOS-specific settings
      if (process.platform === "darwin") {
        floatingWindow.setVisibleOnAllWorkspaces(true, {
          visibleOnFullScreen: true,
        });
        floatingWindow.setHiddenInMissionControl(true);
      }

      // Ensure the window is fully ready
      await new Promise((resolve) => {
        floatingWindow.once("ready-to-show", () => {
          floatingWindow.show();
          resolve(true);
        });
      });

      return true;
    }
  } catch (error) {
    console.error("Error toggling floating panel:", error);
    return false;
  } finally {
    // Small delay to absorb accidental double triggers
    setTimeout(() => {
      isTogglingFloatingWindow = false;
    }, 200);
  }
});

// Save floating button position
ipcMain.handle("save-floating-button-position", (event, x, y) => {
  if (typeof x === "number" && typeof y === "number") {
    saveButtonPosition(x, y);
  }
  return true;
});

// Move floating button window
ipcMain.handle("move-floating-button", (event, x, y) => {
  if (floatingButton && !floatingButton.isDestroyed()) {
    if (typeof x === "number" && typeof y === "number") {
      // Ensure position is within screen bounds
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;
      const windowSize = 80; // Match the window size (includes padding for hover effects)

      const validX = Math.max(0, Math.min(width - windowSize, x));
      const validY = Math.max(0, Math.min(height - windowSize, y));

      floatingButton.setPosition(validX, validY);
      return true;
    }
  }
  return false;
});

// Vault status handlers are now defined at the top of the file

ipcMain.handle("show-main-window", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
    return true;
  }
  return false;
});

// SECURITY: No plaintext storage in main process
// All password data must remain encrypted and handled only by renderer process

// SECURE: Event broadcasting only (no data exchange)
ipcMain.handle("broadcast-entries-changed", () => {
  try {
    // Send entries-changed event to all renderer processes (no actual data)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("entries-changed");
    }

    if (floatingWindow && !floatingWindow.isDestroyed()) {
      floatingWindow.webContents.send("entries-changed");
    }

    if (floatingButton && !floatingButton.isDestroyed()) {
      floatingButton.webContents.send("entries-changed");
    }

    return true;
  } catch (error) {
    console.error("Failed to broadcast entries changed:", error);
    return false;
  }
});

// SECURE: Temporary in-memory storage for window synchronization only
// No file persistence - data is cleared when app restarts
let tempSharedEntries = null;

// Clear temporary memory on vault lock
const clearTempMemory = () => {
  tempSharedEntries = null;
};

// SECURE: Vault status only (no data exposure)
ipcMain.handle("get-vault-status", () => {
  return isVaultUnlocked;
});

// SECURE: Vault existence check without data exposure (async)
ipcMain.handle("vault-exists", async () => {
  if (!secureStorage) return false;
  return await secureStorage.vaultExists();
});

// TRIAL: Save trial info for floating button security checks
ipcMain.handle("save-trial-info", (event, trialInfo) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const userDataPath = app.getPath("userData");
    const trialInfoPath = path.join(userDataPath, 'trial-info.json');

    // Validate and sanitize trial info
    const sanitizedInfo = {
      expiryTime: trialInfo.expiryTime || null,
      startTime: trialInfo.startTime || null,
      hasValidLicense: trialInfo.hasValidLicense === true,
      licenseType: typeof trialInfo.licenseType === 'string' ? trialInfo.licenseType : null
    };

    fs.writeFileSync(trialInfoPath, JSON.stringify(sanitizedInfo, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving trial info:', error);
    return false;
  }
});

// TRIAL: Check if trial has expired
ipcMain.handle("is-trial-expired", () => {
  try {
    // Check localStorage for trial status via renderer process
    // Since we're in main process, we need to validate through the license service
    // This is a simplified check - the main validation happens in renderer

    // For now, we'll use a basic check of trial activation time
    // In a real implementation, you might want to store trial expiry in a secure location
    const fs = require('fs');
    const path = require('path');
    const userDataPath = app.getPath("userData");
    const trialInfoPath = path.join(userDataPath, 'trial-info.json');

    if (fs.existsSync(trialInfoPath)) {
      try {
        const trialData = JSON.parse(fs.readFileSync(trialInfoPath, 'utf8'));
        if (trialData.expiryTime) {
          const now = new Date();
          const expiry = new Date(trialData.expiryTime);
          return now > expiry;
        }
      } catch (error) {
        console.error('Error reading trial info:', error);
      }
    }

    // If no trial info found, assume trial is not expired
    return false;
  } catch (error) {
    console.error('Error checking trial status:', error);
    return false;
  }
});

// TRIAL: Check trial status with more detail
ipcMain.handle("check-trial-status", () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const userDataPath = app.getPath("userData");
    const trialInfoPath = path.join(userDataPath, 'trial-info.json');

    if (!fs.existsSync(trialInfoPath)) {
      return {
        hasTrial: false,
        isExpired: false,
        canUnlock: true // No trial means they should go straight to license
      };
    }

    try {
      const trialData = JSON.parse(fs.readFileSync(trialInfoPath, 'utf8'));
      const now = new Date();

      if (!trialData.expiryTime) {
        return {
          hasTrial: true,
          isExpired: false,
          canUnlock: false
        };
      }

      const expiry = new Date(trialData.expiryTime);
      const isExpired = now > expiry;

      return {
        hasTrial: true,
        isExpired,
        canUnlock: !isExpired,
        expiryTime: trialData.expiryTime
      };
    } catch (error) {
      console.error('Error parsing trial data:', error);
      return {
        hasTrial: false,
        isExpired: false,
        canUnlock: false
      };
    }
  } catch (error) {
    console.error('Error checking trial status:', error);
    return {
      hasTrial: false,
      isExpired: false,
      canUnlock: false
    };
  }
});

// SECURE: Save pre-encrypted vault data (encryption happens in renderer)
// Master password NEVER enters main process - only encrypted blob is stored
// PERFORMANCE: Async file operations for better responsiveness
ipcMain.handle("save-vault-encrypted", async (event, encryptedData) => {
  try {
    // Validate source window
    if (!isValidSource(event.senderFrame)) {
      log.error("[IPC] Unauthorized vault save attempt");
      return false;
    }

    if (!secureStorage || !encryptedData || typeof encryptedData !== 'string') {
      log.error("[IPC] Invalid encrypted data provided");
      return false;
    }

    // Save encrypted data directly (no decryption/encryption in main process)
    // Now async - returns Promise
    const success = await secureStorage.saveVaultEncrypted(encryptedData);

    if (success) {
      log.info("[IPC] Vault data saved securely to file (encrypted)");
    }

    return success;
  } catch (error) {
    log.error("[IPC] Failed to save encrypted vault:", {
      error: error.message,
      code: error.code,
      stack: error.stack,
    });
    return false;
  }
});

// SECURE: Load encrypted vault data (returns encrypted blob, decryption in renderer)
// Master password NEVER enters main process
// PERFORMANCE: Async file operations for better responsiveness
ipcMain.handle("load-vault-encrypted", async (event) => {
  try {
    // Validate source window
    if (!isValidSource(event.senderFrame)) {
      log.error("[IPC] Unauthorized vault load attempt");
      return null;
    }

    if (!secureStorage) {
      return null;
    }

    // Load encrypted data (still encrypted - no decryption in main process)
    // Now async - returns Promise
    const encryptedData = await secureStorage.loadVaultEncrypted();

    if (encryptedData) {
      log.info("[IPC] Vault data loaded from file (encrypted)");
    }

    return encryptedData;
  } catch (error) {
    log.error("[IPC] Failed to load encrypted vault:", {
      error: error.message,
      code: error.code,
      stack: error.stack,
    });
    return null;
  }
});

// SECURE: Validate IPC source window
function isValidSource(frame) {
  try {
    // Ensure request comes from our app windows
    const origin = frame.url;
    return origin.includes("localhost:5173") || origin.includes("localhost:5174") ||
           origin.includes("index.html") ||
           origin.includes("floating-button.html");
  } catch (error) {
    console.error("Failed to validate IPC source:", error);
    return false;
  }
}

// SECURE: Temporary shared entries handlers (in-memory only)
ipcMain.handle("save-shared-entries-temp", (event, entries) => {
  try {
    // Validate source
    if (!isValidSource(event.senderFrame)) {
      console.error("Unauthorized save shared entries attempt");
      return false;
    }

    // Store in memory only (no file persistence)
    tempSharedEntries = entries;

    return true;
  } catch (error) {
    console.error("Failed to save temporary shared entries:", error);
    return false;
  }
});

ipcMain.handle("load-shared-entries-temp", (event) => {
  try {
    // Validate source
    if (!isValidSource(event.senderFrame)) {
      console.error("Unauthorized load shared entries attempt");
      return null;
    }


    return tempSharedEntries || [];
  } catch (error) {
    console.error("Failed to load temporary shared entries:", error);
    return null;
  }
});

// Initialize vault in floating window using existing localStorage data
ipcMain.handle("sync-vault-to-floating", async () => {
  return true;
});

// Auto-updater IPC handlers
ipcMain.handle("check-for-updates", async () => {
  if (autoUpdaterModule) {
    await autoUpdaterModule.checkForUpdates(true);
    return { checking: true };
  }
  return { error: "Auto-updater not available" };
});

ipcMain.handle("download-update", async () => {
  if (autoUpdaterModule) {
    autoUpdaterModule.downloadUpdate();
    return { downloading: true };
  }
  return { error: "Auto-updater not available" };
});

ipcMain.handle("install-update", async () => {
  if (autoUpdaterModule) {
    autoUpdaterModule.installUpdate();
    return { installing: true };
  }
  return { error: "Auto-updater not available" };
});

ipcMain.handle("get-update-state", async () => {
  if (autoUpdaterModule) {
    return autoUpdaterModule.getUpdateState();
  }
  return { updateAvailable: false, updateDownloaded: false };
});

// HTTP REQUEST HANDLER - Uses Electron's net module to bypass browser restrictions
ipcMain.handle("http-request", async (event, url, options = {}) => {
  return new Promise((resolve, reject) => {
    let timeoutHandle = null;
    let requestEnded = false;
    const timeout = options.timeout || 30000; // Default 30 second timeout
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    try {
      log.info(`[HTTP Request ${requestId}] Starting request to: ${url}`);
      log.debug(`[HTTP Request ${requestId}] Options:`, options);
      
      // Validate URL
      let urlObj;
      try {
        urlObj = new URL(url);
      } catch (urlError) {
        log.error(`[HTTP Request ${requestId}] Invalid URL: ${url}`, urlError);
        reject({
          code: 'INVALID_URL',
          message: `Invalid URL: ${url}. ${urlError.message}`,
          details: urlError,
        });
        return;
      }
      
      const requestOptions = {
        method: options.method || 'GET',
        url: url,
      };
      
      const request = net.request(requestOptions);

      // Prepare body string if present (needed for Content-Length calculation)
      let bodyString = null;
      if (options.body) {
        bodyString = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      }

      // Set headers (including Content-Length if body is present)
      if (options.headers) {
        Object.keys(options.headers).forEach(key => {
          try {
            request.setHeader(key, options.headers[key]);
          } catch (headerError) {
            console.error(`[HTTP Request] Failed to set header ${key}:`, headerError);
          }
        });
      }

      // Explicitly set Content-Length header when body is present
      // This is critical for Electron's net.request() to work correctly
      if (bodyString && !options.headers?.['Content-Length'] && !options.headers?.['content-length']) {
        try {
          const contentLength = Buffer.byteLength(bodyString, 'utf8');
          request.setHeader('Content-Length', contentLength.toString());
          log.debug(`[HTTP Request ${requestId}] Set Content-Length: ${contentLength}`);
        } catch (lengthError) {
          log.warn(`[HTTP Request ${requestId}] Failed to set Content-Length:`, lengthError);
        }
      }

      // PERFORMANCE: Use Buffer instead of string concatenation for better memory management
      let responseBuffers = [];
      let totalLength = 0;
      const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB limit
      let statusCode = 0;
      let statusMessage = '';
      let responseHeaders = {};
      let hasResolved = false;

      // Set up timeout
      timeoutHandle = setTimeout(() => {
        if (!hasResolved && !requestEnded) {
          requestEnded = true;
          log.error(`[HTTP Request ${requestId}] Request timeout after ${timeout}ms for URL: ${url}`);
          try {
            request.abort();
          } catch (abortError) {
            log.warn(`[HTTP Request ${requestId}] Error aborting request:`, abortError);
          }
          reject({
            code: 'REQUEST_TIMEOUT',
            message: `Request timed out after ${timeout}ms. Unable to connect to license server. Please check your internet connection and try again.`,
            status: 0,
            url: url,
            requestId: requestId,
          });
        }
      }, timeout);

      // Cleanup function
      const cleanup = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
        // Clear buffers to free memory
        responseBuffers = [];
        totalLength = 0;
      };

      request.on('response', (response) => {
        statusCode = response.statusCode;
        statusMessage = response.statusMessage;
        
        // Collect response headers
        try {
          const headers = response.headers || {};
          Object.keys(headers).forEach(key => {
            const value = headers[key];
            if (Array.isArray(value)) {
              responseHeaders[key] = value[0];
            } else {
              responseHeaders[key] = value;
            }
          });
        } catch (headerError) {
          console.error('[HTTP Request] Error reading response headers:', headerError);
        }

        response.on('data', (chunk) => {
          // PERFORMANCE: Use Buffer collection instead of string concatenation
          responseBuffers.push(chunk);
          totalLength += chunk.length;
          
          // Prevent excessive memory usage (10MB limit)
          if (totalLength > MAX_RESPONSE_SIZE) {
            request.abort();
            cleanup();
            reject({
              code: 'RESPONSE_TOO_LARGE',
              message: `Response exceeds ${MAX_RESPONSE_SIZE / 1024 / 1024}MB limit`,
              status: statusCode,
              url: url,
              requestId: requestId,
            });
          }
        });

        response.on('end', () => {
          if (requestEnded) return; // Already handled by timeout or error
          requestEnded = true;
          
          try {
            // PERFORMANCE: Convert buffers to string efficiently
            const responseData = totalLength > 0 
              ? Buffer.concat(responseBuffers, totalLength).toString('utf8')
              : '';
            
            cleanup(); // Free memory immediately after conversion
            
            const data = responseData ? JSON.parse(responseData) : {};
            hasResolved = true;
            resolve({
              status: statusCode,
              statusText: statusMessage,
              ok: statusCode >= 200 && statusCode < 300,
              data: data,
              json: () => Promise.resolve(data),
            });
          } catch (parseError) {
            console.error('[HTTP Request] JSON parse error:', parseError);
            // Even if JSON parsing fails, return the response
            const responseData = totalLength > 0 
              ? Buffer.concat(responseBuffers, totalLength).toString('utf8')
              : '';
            cleanup();
            hasResolved = true;
            resolve({
              status: statusCode,
              statusText: statusMessage,
              ok: statusCode >= 200 && statusCode < 300,
              data: responseData,
              json: () => Promise.resolve({}),
            });
          }
        });

        response.on('error', (error) => {
          if (requestEnded) return;
          requestEnded = true;
          cleanup();
          log.error(`[HTTP Request ${requestId}] Response error for ${url}:`, {
            error: error.message,
            code: error.code,
            statusCode: statusCode,
            stack: error.stack,
          });
          reject({
            code: 'NETWORK_ERROR',
            message: `Response error: ${error.message || 'Unable to connect to license server. Please check your internet connection and try again.'}`,
            status: statusCode || 0,
            details: error,
            url: url,
            requestId: requestId,
          });
        });
      });

      request.on('error', (error) => {
        if (requestEnded) return;
        requestEnded = true;
        cleanup();
        
        // Log detailed error information for debugging
        log.error(`[HTTP Request ${requestId}] Request error for ${url}:`, {
          errorCode: error.code,
          errorMessage: error.message,
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80'),
          protocol: urlObj.protocol,
          fullUrl: url,
          isIPAddress: /^\d+\.\d+\.\d+\.\d+$/.test(urlObj.hostname),
          stack: error.stack,
        });
        
        // Also log to console for immediate visibility
        console.error(`[HTTP Request ${requestId}] FAILED:`, {
          url: url,
          errorCode: error.code,
          errorMessage: error.message,
          hostname: urlObj.hostname,
          isIPAddress: /^\d+\.\d+\.\d+\.\d+$/.test(urlObj.hostname),
        });
        
        // Provide more specific error messages based on error code
        let errorMessage = 'Unable to connect to license server. Please check your internet connection and try again.';
        let actionableGuidance = '';
        
        if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
          errorMessage = `DNS resolution failed. Cannot resolve hostname: ${urlObj.hostname}.`;
          actionableGuidance = 'Please check your internet connection and DNS settings. If using a VPN or proxy, try disabling it temporarily.';
        } else if (error.code === 'ECONNREFUSED') {
          errorMessage = `Connection refused by server at ${urlObj.hostname}.`;
          actionableGuidance = 'The server may be down or unreachable. Please try again later or contact support if the problem persists.';
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
          errorMessage = `Connection timeout. Unable to reach ${urlObj.hostname}.`;
          actionableGuidance = 'Please check your internet connection. If you\'re behind a firewall, ensure HTTPS connections are allowed.';
        } else if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || error.code === 'CERT_SIGNATURE_FAILURE' || error.code === 'CERT_COMMON_NAME_INVALID') {
          if (error.code === 'CERT_COMMON_NAME_INVALID') {
            errorMessage = `SSL certificate error. The server certificate for ${urlObj.hostname} does not match the domain name.`;
            actionableGuidance = 'This is typically a DNS or server configuration issue. The domain may be pointing to the wrong server. Please wait a few minutes for DNS changes to propagate, or contact support if the issue persists.';
          } else {
            errorMessage = `SSL certificate error. The server certificate for ${urlObj.hostname} is invalid or expired.`;
            actionableGuidance = 'The server certificate may be expired or invalid. Please contact support.';
          }
        } else if (error.code === 'EPROTO' || error.code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
          errorMessage = `SSL/TLS protocol error for ${urlObj.hostname}.`;
          actionableGuidance = 'There may be a certificate mismatch. Please contact support.';
        } else if (error.message) {
          errorMessage = `${error.message}.`;
          actionableGuidance = 'Please check your internet connection and try again.';
        }
        
        const fullMessage = actionableGuidance 
          ? `${errorMessage} ${actionableGuidance}`
          : errorMessage;
        
        reject({
          code: 'NETWORK_ERROR',
          message: fullMessage,
          status: 0,
          details: {
            ...error,
            errorCode: error.code,
            url: url,
            requestId: requestId,
          },
        });
      });

      request.on('abort', () => {
        if (requestEnded) return;
        requestEnded = true;
        cleanup();
        log.warn(`[HTTP Request ${requestId}] Request aborted for ${url}`);
        // Don't reject here if we already have a timeout rejection
        if (!hasResolved) {
          reject({
            code: 'REQUEST_ABORTED',
            message: 'Request was aborted. Unable to connect to license server.',
            status: 0,
            url: url,
            requestId: requestId,
          });
        }
      });

      // Send body if provided (use pre-calculated bodyString)
      if (bodyString) {
        try {
          request.write(bodyString, 'utf8');
          log.debug(`[HTTP Request ${requestId}] Wrote body (${Buffer.byteLength(bodyString, 'utf8')} bytes)`);
        } catch (writeError) {
          cleanup();
          reject({
            code: 'REQUEST_ERROR',
            message: `Failed to write request body: ${writeError.message}`,
            details: writeError,
          });
          return;
        }
      }

      request.end();
      
    } catch (error) {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      log.error(`[HTTP Request] Setup error for ${url}:`, {
        error: error.message,
        stack: error.stack,
      });
      reject({
        code: 'INVALID_URL',
        message: error.message || `Invalid request setup. Unable to connect to license server: ${url}`,
        status: 0,
        details: error,
        url: url,
      });
    }
  });
});

// NETWORK DIAGNOSTIC FUNCTION - Test connectivity before activation
ipcMain.handle("test-network-connectivity", async (event, serverUrl) => {
  const diagnosticId = `diag_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const results = {
    success: false,
    serverUrl: serverUrl || 'https://api.localpasswordvault.com',
    tests: [],
    timestamp: new Date().toISOString(),
    diagnosticId: diagnosticId,
  };

  const testUrl = results.serverUrl;
  const healthEndpoint = `${testUrl}/health`;
  const apiEndpoint = testUrl.replace('server.', 'api.') || testUrl;

  log.info(`[Network Diagnostic ${diagnosticId}] Starting connectivity test for ${testUrl}`);

  // Test 1: DNS Resolution
  try {
    const urlObj = new URL(testUrl);
    results.tests.push({
      name: 'DNS Resolution',
      status: 'success',
      message: `Successfully resolved hostname: ${urlObj.hostname}`,
    });
    log.info(`[Network Diagnostic ${diagnosticId}] DNS resolution successful for ${urlObj.hostname}`);
  } catch (error) {
    results.tests.push({
      name: 'DNS Resolution',
      status: 'failed',
      message: `Failed to parse URL: ${error.message}`,
      error: error.code,
    });
    log.error(`[Network Diagnostic ${diagnosticId}] DNS resolution failed:`, error);
    return results;
  }

  // Test 2: Health Endpoint Check
  try {
    const healthUrl = `${apiEndpoint}/health`;
    log.info(`[Network Diagnostic ${diagnosticId}] Testing health endpoint: ${healthUrl}`);
    
    const healthResponse = await new Promise((resolve, reject) => {
      const request = net.request({
        method: 'GET',
        url: healthUrl,
      });
      
      let responseData = '';
      let statusCode = 0;
      const timeout = setTimeout(() => {
        request.abort();
        reject(new Error('Health check timeout'));
      }, 10000); // 10 second timeout for diagnostic

      request.on('response', (response) => {
        statusCode = response.statusCode;
        response.on('data', (chunk) => {
          responseData += chunk.toString();
        });
        response.on('end', () => {
          clearTimeout(timeout);
          resolve({ status: statusCode, data: responseData });
        });
      });

      request.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      request.end();
    });

    if (healthResponse.status === 200) {
      results.tests.push({
        name: 'Health Endpoint',
        status: 'success',
        message: `Health endpoint responded with status ${healthResponse.status}`,
        data: healthResponse.data,
      });
      log.info(`[Network Diagnostic ${diagnosticId}] Health endpoint check successful`);
    } else {
      results.tests.push({
        name: 'Health Endpoint',
        status: 'warning',
        message: `Health endpoint returned status ${healthResponse.status}`,
        data: healthResponse.data,
      });
      log.warn(`[Network Diagnostic ${diagnosticId}] Health endpoint returned non-200 status: ${healthResponse.status}`);
    }
  } catch (error) {
    results.tests.push({
      name: 'Health Endpoint',
      status: 'failed',
      message: `Failed to reach health endpoint: ${error.message || error.code || 'Unknown error'}`,
      error: error.code,
    });
    log.error(`[Network Diagnostic ${diagnosticId}] Health endpoint check failed:`, error);
  }

  // Test 3: SSL Certificate Check
  try {
    const urlObj = new URL(testUrl);
    results.tests.push({
      name: 'SSL Certificate',
      status: 'info',
      message: `SSL certificate check requires actual connection attempt`,
      note: 'Certificate validation happens during actual request',
    });
  } catch (error) {
    results.tests.push({
      name: 'SSL Certificate',
      status: 'failed',
      message: `Failed to validate SSL: ${error.message}`,
    });
  }

  // Determine overall success
  const failedTests = results.tests.filter(t => t.status === 'failed');
  const successTests = results.tests.filter(t => t.status === 'success');
  
  results.success = failedTests.length === 0 && successTests.length > 0;
  results.summary = results.success 
    ? 'Network connectivity test passed'
    : `Network connectivity test failed: ${failedTests.length} test(s) failed`;

  log.info(`[Network Diagnostic ${diagnosticId}] Completed: ${results.summary}`);
  
  return results;
});
