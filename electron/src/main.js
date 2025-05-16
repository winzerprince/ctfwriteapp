const { app, BrowserWindow, ipcMain, Menu, Tray, dialog } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';
const url = require('url');
const portfinder = require('portfinder');

// Global references to prevent garbage collection
let mainWindow = null;
let tray = null;
let backendProcess = null;
let backendPort = 5001; // Default port for the backend

// Application state management
const appState = {
  isInitializing: false,
  isInitialized: false,
  isQuitting: false
};

// Ensure only one instance of the app can run
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance is already running - quitting');
  app.quit();
} else {
  // This is the first instance - continue normally
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Fix @electron/remote path resolution
  if (!isDev) {
    const Module = require('module');
    const originalResolveFilename = Module._resolveFilename;
    Module._resolveFilename = function(request, parent, isMain) {
      if (request === '../dist/src/main' && 
          parent && parent.filename && parent.filename.includes('@electron/remote')) {
        return require.resolve('@electron/remote/dist/src/main');
      }
      return originalResolveFilename(request, parent, isMain);
    };
  }

  const remoteMain = require('@electron/remote/main');

  // Initialize @electron/remote
  remoteMain.initialize();

  // Auto-reload in development
  if (isDev) {
    try {
      require('electron-reloader')(module, {
        debug: true,
        watchRenderer: true
      });
    } catch (_) { console.log('Error setting up hot reload'); }
  }

  async function startBackend() {
    try {
      // Find an available port for the backend
      backendPort = await portfinder.getPortPromise({
        port: 5001 // Start with default port
      });

      console.log(`Starting backend on port: ${backendPort}`);
      
      // Set environment variables for the backend process
      const env = Object.assign({}, process.env, {
        PORT: backendPort,
        ELECTRON_RUN: true,
        // Add any other environment variables the backend needs
        GITHUB_REPO_URL: process.env.GITHUB_REPO_URL || 'https://github.com/yourusername/writeapp-uploads.git'
      });
      
      // Determine how to start the backend based on environment
      if (isDev) {
        // Development mode - use fork
        const backendPath = path.join(__dirname, '..', '..', 'backend', 'src', 'app.js');
        console.log(`Backend path (dev): ${backendPath}`);
        
        // Start the backend as a child process
        backendProcess = fork(backendPath, [], {
          env,
          stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });
      } else {
        // Production mode - use node directly to ensure proper module resolution
        const { spawn } = require('child_process');
        
        // Use embedded Node.js executable
        const nodePath = process.execPath;
        
        // Fix: Use the correct path to the backend in production
        // The backend code is in app.asar.unpacked folder, but the modules should be resolved relative to this path
        const backendPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'src', 'app.js');
        
        // Set the NODE_PATH environment variable to help Node.js find modules
        env.NODE_PATH = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'node_modules');
        
        console.log(`Node path: ${nodePath}`);
        console.log(`Backend path (prod): ${backendPath}`);
        console.log(`NODE_PATH: ${env.NODE_PATH}`);
        
        // Start the backend as a spawned process with explicit node executable and module path
        backendProcess = spawn(nodePath, [backendPath], {
          env,
          stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });
      }

      // Handle backend stdout (logs)
      backendProcess.stdout.on('data', (data) => {
        console.log(`Backend: ${data}`);
      });

      // Handle backend stderr (errors)
      backendProcess.stderr.on('data', (data) => {
        console.error(`Backend Error: ${data}`);
      });

      // Handle backend exit
      backendProcess.on('exit', (code, signal) => {
        console.log(`Backend process exited with code: ${code} and signal: ${signal}`);
        if (code !== 0 && !appState.isQuitting) {
          dialog.showErrorBox('Backend Error', `The backend process exited unexpectedly. The application may not function correctly.`);
        }
      });

      // Wait a bit for the backend to start
      return new Promise((resolve) => {
        setTimeout(() => resolve(backendPort), 1000);
      });
    } catch (error) {
      console.error('Failed to start backend:', error);
      throw error;
    }
  }

  function createWindow() {
    // Check if window already exists and is valid
    if (mainWindow !== null && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      return mainWindow;
    }

    // Check for any existing windows that might not be tracked properly
    const existingWindows = BrowserWindow.getAllWindows();
    if (existingWindows.length > 0) {
      // Use the first existing window
      mainWindow = existingWindows[0];
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      return mainWindow;
    }

    console.log('Creating new browser window');
    
    // Create the browser window
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, '..', 'assets', 'icon.png')
    });

    // Enable @electron/remote for the main window
    remoteMain.enable(mainWindow.webContents);

    // Set window title
    mainWindow.setTitle('WriteApp - CTF Writeup Manager');

    // Load the frontend
    if (isDev) {
      // In development mode, load from the dev server
      console.log('Loading development URL: http://localhost:3000');
      mainWindow.loadURL('http://localhost:3000');
      mainWindow.webContents.openDevTools();
    } else {
      // In production, load the built React app
      try {
        // Try multiple possible locations for the index.html file
        let indexPath = path.join(app.getAppPath(), 'frontend', 'build', 'index.html');
        
        // Check if the file exists at the calculated path
        if (!require('fs').existsSync(indexPath)) {
          console.log(`Index not found at ${indexPath}, trying alternative paths...`);
          
          // Try the path relative to __dirname
          indexPath = path.join(__dirname, '..', '..', 'frontend', 'build', 'index.html');
          
          if (!require('fs').existsSync(indexPath)) {
            console.log(`Index not found at ${indexPath}, trying another alternative...`);
            
            // Try one more fallback path
            indexPath = path.join(process.resourcesPath, 'app', 'frontend', 'build', 'index.html');
          }
        }
        
        console.log(`Loading production file: ${indexPath}`);
        
        if (require('fs').existsSync(indexPath)) {
          // Use loadFile for local files
          mainWindow.loadFile(indexPath);
        } else {
          // As a last resort, try with a file URL
          const fileUrl = url.format({
            pathname: indexPath,
            protocol: 'file:',
            slashes: true
          });
          console.log(`Falling back to loadURL with: ${fileUrl}`);
          mainWindow.loadURL(fileUrl);
        }
        
        // Add this line for debugging in production builds
        mainWindow.webContents.openDevTools();
      } catch (error) {
        console.error('Error loading frontend:', error);
        dialog.showErrorBox('Loading Error', `Failed to load the frontend: ${error.message}`);
      }
    }

    // Emit event when window is ready
    mainWindow.webContents.on('did-finish-load', () => {
      if (mainWindow) {
        console.log('Window loaded successfully, sending backend port:', backendPort);
        mainWindow.webContents.send('backend-port', backendPort);
      }
    });

    // Log any loading errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription);
      dialog.showErrorBox('Loading Error', `Failed to load the application: ${errorDescription}`);
    });

    // Handle window close
    mainWindow.on('close', (event) => {
      if (!appState.isQuitting) {
        event.preventDefault();
        mainWindow.hide();
        return false;
      }
      return true;
    });

    // Clear reference when window is closed
    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    return mainWindow;
  }

  function createTray() {
    // Create tray icon
    tray = new Tray(path.join(__dirname, '..', 'assets', 'icon.png'));
    
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Open WriteApp', 
        click: () => {
          if (mainWindow === null) {
            createWindow();
          } else {
            mainWindow.show();
          }
        }
      },
      { type: 'separator' },
      { 
        label: 'Quit', 
        click: () => {
          appState.isQuitting = true;
          app.quit();
        }
      }
    ]);
    
    tray.setToolTip('WriteApp - CTF Writeup Manager');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
      if (mainWindow === null) {
        createWindow();
      } else {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
      }
    });
  }

  // When Electron is ready - guarantee this runs only once
  let appReadyPromise = null;
  
  function handleAppReady() {
    if (appState.isInitializing) return appReadyPromise;
    
    appState.isInitializing = true;
    appReadyPromise = (async () => {
      try {
        console.log('Starting application...');
        
        // Start the backend first
        await startBackend();
        
        // Create assets directory if it doesn't exist
        const assetsDir = path.join(__dirname, '..', 'assets');
        if (!require('fs').existsSync(assetsDir)) {
          require('fs').mkdirSync(assetsDir, { recursive: true });
        }
        
        // Create window and tray only if not already initialized
        if (!appState.isInitialized) {
          createWindow();
          createTray();
          appState.isInitialized = true;
        }
        
        console.log('Application started successfully');
      } catch (error) {
        console.error('Failed to start the application:', error);
        dialog.showErrorBox('Application Error', `Failed to start the application: ${error.message}`);
        app.quit();
      }
    })();
    
    return appReadyPromise;
  }

  // Clean up app ready handler to ensure it only executes once
  app.whenReady().then(handleAppReady).catch(err => {
    console.error('Error during app initialization:', err);
    app.quit();
  });

  // On macOS it's common to re-create a window when the dock icon is clicked
  app.on('activate', () => {
    // Only create a window if there are no windows at all
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      // Otherwise just show the existing window
      mainWindow.show();
    }
  });

  // Quit when all windows are closed, except on macOS
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // Handle app quit
  app.on('before-quit', () => {
    appState.isQuitting = true;
    
    // Kill the backend process if it exists
    if (backendProcess !== null) {
      backendProcess.kill();
      backendProcess = null;
    }
  });

  // IPC handlers
  ipcMain.handle('get-backend-url', () => {
    return `http://localhost:${backendPort}`;
  });
}