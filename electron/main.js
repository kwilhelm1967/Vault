const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { screen, powerMonitor, globalShortcut } = require('electron');
const Positioner = require('electron-positioner');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let floatingWindow;
let floatingPanelPosition = null;
const userDataPath = app.getPath('userData');
const positionFilePath = path.join(userDataPath, 'floating-panel-position.json');

// Load saved position from file
const loadSavedPosition = () => {
  try {
    if (fs.existsSync(positionFilePath)) {
      const data = fs.readFileSync(positionFilePath, 'utf8');
      const position = JSON.parse(data);
      floatingPanelPosition = position;
      return position;
    }
  } catch (error) {
    console.error('Failed to load floating panel position:', error);
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
    console.error('Failed to save floating panel position:', error);
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
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/vault-icon.png'),
    titleBarStyle: 'default',
    show: false, // Don't show until ready
    frame: true
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (floatingWindow) {
      floatingWindow.close();
    }
  });
  return mainWindow;
};

// Create floating panel window
const createFloatingWindow = () => {
  if (floatingWindow) {
    if (floatingWindow.isMinimized() || !floatingWindow.isVisible()) {
      floatingWindow.restore();
      floatingWindow.show();
    }
    floatingWindow.focus();
    // Ensure it's always on top with highest level
    floatingWindow.setAlwaysOnTop(true, 'screen-saver');
    if (process.platform === 'win32') {
      floatingWindow.setSkipTaskbar(true);
    }
    if (process.platform === 'darwin') {
      floatingWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
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
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/vault-icon.png'),
    show: false
  };

  // Add position if available
  if (savedPosition && typeof savedPosition.x === 'number' && typeof savedPosition.y === 'number') {
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
  if (savedPosition && typeof savedPosition.x === 'number' && typeof savedPosition.y === 'number') {
    floatingWindow.setPosition(savedPosition.x, savedPosition.y);
  } else {
    positioner.move('topRight');
  }

  // Set window to be always on top with level 'screen-saver' (highest level)
  // This ensures it stays above ALL other windows, including other applications
  floatingWindow.setAlwaysOnTop(true, 'screen-saver');
  floatingWindow.setVisibleOnAllWorkspaces(true);
  
  // For Windows, set as a tool window to ensure it stays on top
  if (process.platform === 'win32') {
    floatingWindow.setSkipTaskbar(true);
    // Set as a tool window which helps with always-on-top behavior
    floatingWindow.setType('toolbar');
    // Set content protection to prevent screen capture tools from hiding it
    floatingWindow.setContentProtection(true);
  }

  // Prevent flickering by showing only when ready
  floatingWindow.once('ready-to-show', () => {
    floatingWindow.show();
  });

  // Re-apply always-on-top when computer wakes from sleep
  powerMonitor.on('resume', () => {
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      floatingWindow.setAlwaysOnTop(true, 'screen-saver'); 
      floatingWindow.setVisibleOnAllWorkspaces(true);
      
      // For Windows, ensure it stays as a tool window
      if (process.platform === 'win32') {
        floatingWindow.setSkipTaskbar(true);
        floatingWindow.setType('toolbar');
      }
      
      // For macOS, ensure it stays visible on all workspaces
      if (process.platform === 'darwin') {
        floatingWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      }
    }
  });
  
  // Ensure the window stays on top even when it loses focus
  floatingWindow.on('blur', () => {
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      floatingWindow.setAlwaysOnTop(true, 'screen-saver');
      
      // For Windows, ensure it stays as a tool window
      if (process.platform === 'win32') {
        floatingWindow.setType('toolbar');
      }
      
      // For macOS, ensure it stays visible on all workspaces
      if (process.platform === 'darwin') {
        floatingWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      }
    }
  });
  
  // Load the floating panel page
  if (isDev) {
    floatingWindow.loadURL('http://localhost:5173/#floating');
    // Don't show dev tools by default to prevent flashing
    // floatingWindow.webContents.openDevTools();
  } else {
    floatingWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'floating' });
  }

  // Handle window closed
  floatingWindow.on('closed', () => {
    floatingWindow = null;
    
    // If main window exists, focus it
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
    }
  });

  // Save position when window is moved
  floatingWindow.on('moved', () => {
    const [x, y] = floatingWindow.getPosition();
    // Only save if position has actually changed
    if (!floatingPanelPosition || x !== floatingPanelPosition.x || y !== floatingPanelPosition.y) {
      savePosition(x, y);
      console.log('Saved floating panel position:', x, y);
    }
  });

  // Prevent navigation away from the app
  floatingWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost:5173') && !url.includes('index.html')) {
      event.preventDefault();
    }
  });

  // Ensure it stays on top periodically
  const alwaysOnTopInterval = setInterval(() => {
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      floatingWindow.setAlwaysOnTop(true, 'screen-saver');
      floatingWindow.setVisibleOnAllWorkspaces(true);
      
      // For Windows, ensure it stays as a tool window
      if (process.platform === 'win32') {
        floatingWindow.setSkipTaskbar(true);
        floatingWindow.setType('toolbar');
      }
      
      // For macOS, ensure it stays visible on all workspaces
      if (process.platform === 'darwin') {
        floatingWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        floatingWindow.setHiddenInMissionControl(true);
      }
    }
  }, 500); // Check more frequently (every 500ms)

  return floatingWindow;
};

// Create application menu
const createMenu = () => {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Lock Vault',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            // Send lock command to renderer
            if (mainWindow) {
              mainWindow.webContents.send('lock-vault');
            }
            if (floatingWindow) {
              floatingWindow.webContents.send('lock-vault');
            }
          }
        },
        {
          label: 'Toggle Floating Panel',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => {
            if (floatingWindow) {
              floatingWindow.close();
            } else {
              createFloatingWindow();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// IPC handlers for secure communication
ipcMain.handle('app-version', () => {
  return app.getVersion();
});

ipcMain.handle('platform', () => {
  return process.platform;
});

// Handle floating panel requests
ipcMain.handle('show-floating-panel', () => {
  const window = createFloatingWindow();
  if (window) {
    window.setAlwaysOnTop(true, 'screen-saver');
    
    // For Windows, set as a tool window to ensure it stays on top
    if (process.platform === 'win32') {
      window.setType('toolbar');
      window.setSkipTaskbar(true);
      window.setContentProtection(true);
    }
    
    // For macOS, set additional flags to ensure it stays visible
    if (process.platform === 'darwin') {
      window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      window.setHiddenInMissionControl(true);
    }
  }
  return window;
});

ipcMain.handle('hide-floating-panel', () => {
  if (floatingWindow) {
    floatingWindow.close();
    return true;
  }
  return false;
});

ipcMain.handle('is-floating-panel-open', () => {
  return floatingWindow !== null && !floatingWindow.isDestroyed();
});

// Handle minimize main window
ipcMain.handle('minimize-main-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
    return true;
  }
  return false;
});

// Handle hide main window
ipcMain.handle('hide-main-window', () => {
  if (mainWindow) {
    mainWindow.hide();
    return true;
  }
  return false;
});

// Handle restore main window
ipcMain.handle('restore-main-window', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.restore();
    mainWindow.focus();
    return true;
  }
  return false;
});

// Get floating panel position
ipcMain.handle('get-floating-panel-position', () => {
  // If we don't have a position yet, try to load it
  if (!floatingPanelPosition) {
    floatingPanelPosition = loadSavedPosition();
  }
  return floatingPanelPosition;
});

// Set always-on-top status
ipcMain.handle('set-always-on-top', (event, flag) => {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    // Use the highest level possible to ensure it stays on top
    floatingWindow.setAlwaysOnTop(flag, 'screen-saver');
    
    // For Windows, set as a tool window to ensure it stays on top
    if (process.platform === 'win32' && flag) {
      floatingWindow.setType('toolbar');
    }
    
    // For macOS, set additional flags to ensure it stays visible
    if (process.platform === 'darwin' && flag) {
      floatingWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      floatingWindow.setHiddenInMissionControl(true);
    }
    return true;
  }
  return false;
});

// Save floating panel position
ipcMain.handle('save-floating-panel-position', (event, x, y) => {
  if (typeof x === 'number' && typeof y === 'number') {
    savePosition(x, y);
    console.log('Manually saved position:', x, y);
  }
  return true;
});