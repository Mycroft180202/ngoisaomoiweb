const { autoUpdater } = require('electron-updater');
const { ipcMain } = require('electron');

function setupAutoUpdater(mainWindow) {
  // Disable auto download, so we can prompt the user first
  autoUpdater.autoDownload = true; 

  autoUpdater.on('checking-for-update', () => {
    console.log('🔄 Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('✨ Update available:', info);
    mainWindow.webContents.send('update-available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('✅ App is up to date.');
    mainWindow.webContents.send('update-not-available', info);
  });

  autoUpdater.on('error', (err) => {
    console.error('❌ Auto updater error:', err);
    mainWindow.webContents.send('update-error', err.message || 'Lỗi kiểm tra cập nhật');
  });

  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow.webContents.send('download-progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('🎉 Update downloaded, ready to install.');
    mainWindow.webContents.send('update-downloaded', info);
  });

  // Listen to IPC triggers from the React renderer
  ipcMain.on('check-for-updates', () => {
    autoUpdater.checkForUpdates().catch(err => {
      console.error('Check update failed:', err);
    });
  });

  ipcMain.on('restart-app', () => {
    autoUpdater.quitAndInstall();
  });
}

module.exports = { setupAutoUpdater };
