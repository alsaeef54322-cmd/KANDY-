const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

/**
 * KANDY Desktop - Main Electron Process
 * Configured with secure window settings, local offline storage, and safe IPC
 */
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'كاندي | KANDY Management System',
    backgroundColor: '#FAF7F2',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Remove native menu bar for cleaner desktop POS look
  mainWindow.setMenuBarVisibility(false);

  // IPC Handlers
  ipcMain.on('window-minimize', () => mainWindow.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow.close());

  ipcMain.handle('print-receipt', async (event, options) => {
    try {
      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      if (win) {
        win.webContents.print({ silent: false, printBackground: true, ...options }, (success, failureReason) => {
          if (!success && failureReason !== 'cancelled') {
            console.error('Electron print error:', failureReason);
          }
        });
        return { success: true };
      }
      return { success: false, error: 'No active window found' };
    } catch (err) {
      console.error('Electron print-receipt error:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('print-report', async (event, options) => {
    try {
      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      if (win) {
        win.webContents.print({
          silent: false,
          printBackground: true,
          pageSize: 'A4',
          landscape: options?.landscape || false,
          ...options,
        }, (success, failureReason) => {
          if (!success && failureReason !== 'cancelled') {
            console.error('Electron print-report error:', failureReason);
          }
        });
        return { success: true };
      }
      return { success: false, error: 'No active window found' };
    } catch (err) {
      console.error('Electron print-report error:', err);
      return { success: false, error: err.message };
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
