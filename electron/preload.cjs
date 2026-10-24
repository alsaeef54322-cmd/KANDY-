const { contextBridge, ipcRenderer } = require('electron');

/**
 * Electron Preload script
 * Enforces strict context isolation and safe IPC communication
 */
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
  isDesktop: true,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  printReceipt: (content) => ipcRenderer.invoke('print-receipt', content),
  printReport: (options) => ipcRenderer.invoke('print-report', options),
});
