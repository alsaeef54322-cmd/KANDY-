const { contextBridge, ipcRenderer } = require('electron');

/**
 * Electron Preload script
 * Enforces strict context isolation and safe IPC communication
 */
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
  appVersion: '1.0.0',
  isDesktop: true,

  // Window Controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // Native Printing Handlers
  printReceipt: (options) => ipcRenderer.invoke('print-receipt', options),
  printReport: (options) => ipcRenderer.invoke('print-report', options),

  // Native File Dialogs (Save Excel, Backup JSON, Restore JSON)
  saveFile: (options) => ipcRenderer.invoke('dialog-save-file', options),
  openFile: (options) => ipcRenderer.invoke('dialog-open-file', options),

  // Application Info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
});
