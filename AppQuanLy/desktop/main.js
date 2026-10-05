const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { setupAutoUpdater } = require('./updater');

let mainWindow;

function createWindow() {
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    frame: isMac, // Keep frame on macOS for traffic lights, hide on Win/Linux
    titleBarStyle: isMac ? 'hidden' : 'default', // Hidden titlebar on macOS
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'NewStarTour CRM',
    icon: path.join(__dirname, 'assets/icon.png'),
    backgroundColor: '#0F172A', // Match client CSS background color
    show: false,
    autoHideMenuBar: true
  });

  // Check if we are running in development mode.
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'dist/index.html')}`;
  mainWindow.loadURL(startUrl).catch(err => {
    console.error('Failed to load URL:', err);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // DevTools will not open automatically on startup. Use Ctrl+Shift+I manually if needed.
    
    // Setup auto-updater and trigger initial check
    try {
      setupAutoUpdater(mainWindow);
    } catch (e) {
      console.error('Failed to setup auto updater:', e);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Expose app version to renderer
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Window controls IPC
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// Helper lấy Wi-Fi SSID
function getWifiSSID() {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec('netsh wlan show interfaces', (err, stdout) => {
        if (err) {
          resolve(null);
          return;
        }
        const match = stdout.match(/^\s*SSID\s*:\s*(.+)$/im);
        resolve(match ? match[1].trim() : null);
      });
    } else if (process.platform === 'darwin') {
      exec('/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I', (err, stdout) => {
        if (err) {
          resolve(null);
          return;
        }
        const match = stdout.match(/^\s*SSID\s*:\s*(.+)$/im);
        resolve(match ? match[1].trim() : null);
      });
    } else if (process.platform === 'linux') {
      exec('iwgetid -r', (err, stdout) => {
        if (err) {
          resolve(null);
          return;
        }
        resolve(stdout.trim() || null);
      });
    } else {
      resolve(null);
    }
  });
}

// Expose Wi-Fi SSID to renderer
ipcMain.handle('get-wifi-ssid', async () => {
  return await getWifiSSID();
});

