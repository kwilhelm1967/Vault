// Load environment variables
require("dotenv").config();

const { app, BrowserWindow, Menu, shell, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { screen, powerMonitor, globalShortcut } = require("electron");
const Positioner = require("electron-positioner");
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const devToolsEnabled = isDev && process.env.DEV_TOOL === "true";

// Add process error handlers for debugging
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  console.error("Stack:", error.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
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
const positionFilePath = path.join(
  userDataPath,
  "floating-panel-position.json"
);
const buttonPositionFilePath = path.join(
  userDataPath,
  "floating-button-position.json"
);

// Load saved position from file
const loadSavedPosition = () => {
  try {
    if (fs.existsSync(positionFilePath)) {
      const data = fs.readFileSync(positionFilePath, "utf8");
      const position = JSON.parse(data);
      floatingPanelPosition = position;
      return position;
    }
  } catch (error) {
    console.error("Failed to load floating panel position:", error);
  }
  return null;
};

// Save position to file
const savePosition = (x, y) => {
  try {
    const position = { x, y };
    fs.writeFileSync(positionFilePath, JSON.stringify(position));
    floatingPanelPosition = position;
  } catch (error) {
    console.error("Failed to save floating panel position:", error);
  }
};

// Load saved button position from file
const loadSavedButtonPosition = () => {
  try {
    if (fs.existsSync(buttonPositionFilePath)) {
      const data = fs.readFileSync(buttonPositionFilePath, "utf8");
      const position = JSON.parse(data);
      floatingButtonPosition = position;
      return position;
    }
  } catch (error) {
    console.error("Failed to load floating button position:", error);
  }
  return null;
};

// Save button position to file
const saveButtonPosition = (x, y) => {
  try {
    const position = { x, y };
    fs.writeFileSync(buttonPositionFilePath, JSON.stringify(position));
    floatingButtonPosition = position;
  } catch (error) {
    console.error("Failed to save floating button position:", error);
  }
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
    },
    icon: path.join(__dirname, "../public/vault-icon.png"),
    titleBarStyle: "default",
    show: false, // Don't show until ready
    frame: true,
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    if (devToolsEnabled) {
      mainWindow.webContents.openDevTools();
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
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

    // Load saved position
    const savedPosition = loadSavedPosition();

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
      },
      icon: path.join(__dirname, "../public/vault-icon.png"),
      show: false,
    };

    // Add position if available
    if (
      savedPosition &&
      typeof savedPosition.x === "number" &&
      typeof savedPosition.y === "number"
    ) {
      // Ensure position is within screen bounds
      const validX = Math.max(0, Math.min(width - 200, savedPosition.x));
      const validY = Math.max(0, Math.min(height - 200, savedPosition.y));
      windowOptions.x = validX;
      windowOptions.y = validY;
      floatingPanelPosition = { x: validX, y: validY };
    } else {
      // Default to center of screen if no saved position
      windowOptions.x = Math.floor((width - 400) / 2);
      windowOptions.y = Math.floor((height - 600) / 2);
      floatingPanelPosition = { x: windowOptions.x, y: windowOptions.y };
    }

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
      floatingWindow.loadURL("http://localhost:5173/#floating");
      // Enable DevTools for floating panel in development if enabled
      if (devToolsEnabled) {
        floatingWindow.webContents.openDevTools();
      }
    } else {
      floatingWindow.loadFile(path.join(__dirname, "../dist/index.html"), {
        hash: "floating",
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
      if (
        !url.startsWith("http://localhost:5173") &&
        !url.includes("index.html")
      ) {
        event.preventDefault();
      }
    });

    // Ensure it stays on top periodically (light-touch)
    floatingPanelInterval = setInterval(() => {
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
      } else {
        // Clear interval if window is destroyed
        if (floatingPanelInterval) {
          clearInterval(floatingPanelInterval);
          floatingPanelInterval = null;
        }
      }
    }, 3000); // Light cadence to reduce flicker

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
    if (floatingButton) {
      if (floatingButton.isMinimized() || !floatingButton.isVisible()) {
        floatingButton.restore();
        floatingButton.show();
      }
      floatingButton.focus();
      return floatingButton;
    }

    // Load saved button position
    const savedButtonPosition = loadSavedButtonPosition();

    // Get screen dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // Button size - match Tailwind w-12 h-12 (48px)
    const buttonSize = 48;

    // Determine button position (default to bottom-right corner)
    const windowOptions = {
      width: buttonSize,
      height: buttonSize,
      minWidth: buttonSize,
      maxWidth: buttonSize,
      minHeight: buttonSize,
      maxHeight: buttonSize,
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
      windowOptions.x = width - buttonSize - 20;
      windowOptions.y = height - buttonSize - 20;
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
        width: buttonSize,
        height: buttonSize,
        x: floatingButton.getBounds().x,
        y: floatingButton.getBounds().y,
      });
      floatingButton.show();
    });

    // Load the floating button page
    if (isDev) {
      floatingButton.loadURL("http://localhost:5173/floating-button.html");
    } else {
      floatingButton.loadFile(
        path.join(__dirname, "../dist/floating-button.html")
      );
    }

    // Prevent any accidental resize operations (Windows protection)
    floatingButton.on("resize", () => {
      const currentBounds = floatingButton.getBounds();
      if (
        currentBounds.width !== buttonSize ||
        currentBounds.height !== buttonSize
      ) {
        floatingButton.setBounds({
          x: currentBounds.x,
          y: currentBounds.y,
          width: buttonSize,
          height: buttonSize,
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
      if (
        !url.startsWith("http://localhost:5173") &&
        !url.includes("index.html")
      ) {
        event.preventDefault();
      }
    });

    // Ensure it stays on top periodically (light-touch)
    floatingButtonInterval = setInterval(() => {
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
      } else {
        // Clear interval if window is destroyed
        if (floatingButtonInterval) {
          clearInterval(floatingButtonInterval);
          floatingButtonInterval = null;
        }
      }
    }, 5000); // Light cadence to reduce flicker

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
app.whenReady().then(() => {
  createWindow();
  createMenu();
  // SECURITY FIX: Don't create floating button automatically
  // It should only be created when vault is unlocked

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  console.log("All windows closed! Platform:", process.platform);
  // Force close all floating windows
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    console.log("Destroying floating window...");
    floatingWindow.destroy();
  }
  if (floatingButton) {
    try {
      if (!floatingButton.isDestroyed()) {
        floatingButton.removeAllListeners(); // optional, defensive
        floatingButton.destroy(); // Use destroy, NOT just close
      }
    } catch (err) {
      console.error(
        "Error destroying floatingButton on window-all-closed:",
        err
      );
    }
    floatingButton = null;
    console.log("Destroying floating button...");
  }

  // On macOS, also quit the app when all windows are closed
  console.log("Quitting app...");
  app.quit();
});

// Handle app quit properly
app.on("before-quit", () => {
  // Clear all intervals
  if (floatingPanelInterval) {
    clearInterval(floatingPanelInterval);
    floatingPanelInterval = null;
  }
  if (floatingButtonInterval) {
    clearInterval(floatingButtonInterval);
    floatingButtonInterval = null;
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
  const isOpen =
    floatingWindow !== null &&
    floatingWindow !== undefined &&
    !floatingWindow.isDestroyed() &&
    floatingWindow.isVisible();
  console.log("Floating panel open check:", isOpen);
  return isOpen;
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
ipcMain.handle("get-floating-panel-position", () => {
  // If we don't have a position yet, try to load it
  if (!floatingPanelPosition) {
    floatingPanelPosition = loadSavedPosition();
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
    console.log("Manually saved position:", x, y);
  }
  return true;
});

// Vault status handlers
const vaultHandlers = {
  "vault-unlocked": () => {
    try {
      console.log("Vault unlocked");
      isVaultUnlocked = true;

      mainWindow?.webContents.send("vault-status-changed", isVaultUnlocked);
      floatingWindow?.webContents.send("vault-status-changed", isVaultUnlocked);
      floatingButton?.webContents.send("vault-status-changed", isVaultUnlocked);
      // Show floating button when vault is unlocked
      // Force cleanup before creation to prevent overlap or race conditions
      if (floatingButton && !floatingButton.isDestroyed()) {
        floatingButton.removeAllListeners();
        floatingButton.destroy();
        floatingButton = null;
      }

      if (!floatingButton || floatingButton.isDestroyed()) {
        console.log("Creating floating button for unlocked vault...");
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
      console.log("Vault locked");
      isVaultUnlocked = false;

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
        console.log("Closing floatingWindow for locked vault...");
        floatingWindow.close();
        floatingWindow = null;
      }

      // Restore and show main window when vault is locked
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log("Restoring main window for locked vault...");
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
    console.log("IPC: show-floating-button requested");
    const button = createFloatingButton();
    const success = button !== null;
    console.log("IPC: show-floating-button result:", success);
    return success;
  } catch (error) {
    console.error("Error in show-floating-button IPC handler:", error);
    return false;
  }
});

ipcMain.handle("hide-floating-button", () => {
  try {
    console.log("IPC: hide-floating-button requested");
    if (floatingButton) {
      try {
        if (!floatingButton.isDestroyed()) {
          floatingButton.removeAllListeners(); // optional, defensive
          floatingButton.destroy(); // Use destroy, NOT just close
        }
      } catch (err) {
        console.error("Error destroying floatingButton in IPC handler:", err);
      }
      floatingButton = null;
      console.log("IPC: floating button destroyed");
      return true;
    }
    console.log("IPC: no floating button to destroy");
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
  console.log("Toggle floating panel requested");

  try {
    // Check if we have a valid floating window that's visible
    const isWindowOpen =
      floatingWindow &&
      !floatingWindow.isDestroyed() &&
      floatingWindow.isVisible();

    if (isWindowOpen) {
      // Close the existing window
      console.log("Closing floating panel");
      floatingWindow.close();
      floatingWindow = null;
      return false;
    } else {
      // Create a new window
      console.log("Opening floating panel");
      floatingWindow = createFloatingWindow();

      if (!floatingWindow) {
        console.error("Failed to create floating window");
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
    console.log("Manually saved button position:", x, y);
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
      const buttonSize = 48; // Match Tailwind w-12 h-12

      const validX = Math.max(0, Math.min(width - buttonSize, x));
      const validY = Math.max(0, Math.min(height - buttonSize, y));

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

// Shared data storage in main process
let sharedEntries = null;

// Entries synchronization IPC handlers
ipcMain.handle("broadcast-entries-changed", () => {
  try {
    // Send entries-changed event to all renderer processes
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("entries-changed");
    }
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      floatingWindow.webContents.send("entries-changed");
    }
    return true;
  } catch (error) {
    console.error("Failed to broadcast entries changed:", error);
    return false;
  }
});

// Save entries to shared storage
ipcMain.handle("save-shared-entries", (event, entries) => {
  try {
    sharedEntries = entries;
    console.log("Entries saved to shared storage:", entries.length);
    return true;
  } catch (error) {
    console.error("Failed to save shared entries:", error);
    return false;
  }
});

// Load entries from shared storage
ipcMain.handle("load-shared-entries", () => {
  try {
    console.log("Loading entries from shared storage:", sharedEntries ? sharedEntries.length : 0);
    return sharedEntries || [];
  } catch (error) {
    console.error("Failed to load shared entries:", error);
    return [];
  }
});

// Get vault status
ipcMain.handle("get-vault-status", () => {
  return isVaultUnlocked;
});

// Initialize vault in floating window using existing localStorage data
ipcMain.handle("sync-vault-to-floating", async () => {
  try {
    console.log("Syncing vault state to floating window");
    return true;
  } catch (error) {
    console.error("Failed to sync vault to floating window:", error);
    return false;
  }
});
