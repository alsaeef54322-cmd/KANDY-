
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

let mainWindow = null;
let serverProcess = null;
let isQuitting = false;
let isStarting = false;
let serverPort = 3000;
let startupError = null;

const isDev = !app.isPackaged;
const gotSingleInstanceLock = app.requestSingleInstanceLock();

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(
      `http://127.0.0.1:${serverPort}/api/health`,
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      }
    );

    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });

    req.on('error', () => resolve(false));
  });
}

function prepareDatabase() {
  const userDataDir = app.getPath('userData');
  const dataDir = path.join(userDataDir, 'data');
  const destination = path.join(dataDir, 'kandy_server_db.json');

  fs.mkdirSync(dataDir, { recursive: true });

  // قاعدة البيانات الموجودة لا يتم استبدالها.
  if (fs.existsSync(destination)) {
    console.log('[KANDY] Existing database preserved:', destination);
    return dataDir;
  }

  const candidates = [
    path.join(app.getAppPath(), 'data', 'kandy_server_db.json'),
    path.join(process.cwd(), 'data', 'kandy_server_db.json'),
    path.join(__dirname, '..', 'data', 'kandy_server_db.json'),
    path.join(
      process.resourcesPath || '',
      'app.asar.unpacked',
      'data',
      'kandy_server_db.json'
    )
  ];

  for (const candidate of candidates) {
    try {
      if (
        candidate !== destination &&
        fs.existsSync(candidate) &&
        fs.statSync(candidate).isFile()
      ) {
        // لا تنسخ فوق أي قاعدة بيانات موجودة.
        if (!fs.existsSync(destination)) {
          fs.copyFileSync(candidate, destination);
          console.log('[KANDY] Database initialized from:', candidate);
        }

        return dataDir;
      }
    } catch (error) {
      console.warn(
        '[KANDY] Database candidate unavailable:',
        candidate,
        error.message
      );
    }
  }

  console.warn('[KANDY] No source database found; using data directory:', dataDir);
  return dataDir;
}

function getServerPaths() {
  const serverRoot = isDev
    ? path.resolve(__dirname, '..')
    : path.join(process.resourcesPath, 'app.asar.unpacked');

  return {
    serverRoot,
    tsxCli: path.join(
      serverRoot,
      'node_modules',
      'tsx',
      'dist',
      'cli.mjs'
    ),
    serverEntry: path.join(serverRoot, 'server.ts')
  };
}

function startServer() {
  return new Promise((resolve, reject) => {
    let dataDir;

    try {
      dataDir = prepareDatabase();
    } catch (error) {
      reject(error);
      return;
    }

    const { serverRoot, tsxCli, serverEntry } = getServerPaths();

    if (!fs.existsSync(tsxCli)) {
      reject(new Error(`tsx CLI not found: ${tsxCli}`));
      return;
    }

    if (!fs.existsSync(serverEntry)) {
      reject(new Error(`Server entry not found: ${serverEntry}`));
      return;
    }

    startupError = null;

    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(serverPort),
      KANDY_DATA_DIR: dataDir,
      ELECTRON_RUN_AS_NODE: '1'
    };

    console.log('[KANDY] Starting server...');
    console.log('[KANDY] Server root:', serverRoot);
    console.log('[KANDY] Server entry:', serverEntry);
    console.log('[KANDY] Database directory:', dataDir);
    console.log('[KANDY] Port:', serverPort);

    const child = spawn(process.execPath, [tsxCli, serverEntry], {
      cwd: serverRoot,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess = child;

    child.stdout.on('data', (data) => {
      console.log(`[KANDY Server] ${data.toString().trimEnd()}`);
    });

    child.stderr.on('data', (data) => {
      console.error(`[KANDY Server Error] ${data.toString().trimEnd()}`);
    });

    child.once('error', (error) => {
      startupError = error;
      console.error('[KANDY] Could not start server:', error);
      reject(error);
    });

    child.once('spawn', () => {
      console.log('[KANDY] Server process spawned.');
      resolve();
    });

    child.once('exit', (code, signal) => {
      const message = `Server exited. Code: ${code}, signal: ${signal}`;

      console.error('[KANDY] Server process exited:', {
        code,
        signal
      });

      if (!isQuitting) {
        startupError = new Error(message);
      }
    });
  });
}

async function waitForServer(timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (isQuitting) {
      throw new Error('KANDY is shutting down.');
    }

    if (startupError) {
      throw startupError;
    }

    if (serverProcess && serverProcess.exitCode !== null) {
      throw new Error(
        `KANDY server stopped before becoming ready. Exit code: ${serverProcess.exitCode}`
      );
    }

    if (await checkHealth()) {
      console.log('[KANDY] Server health check passed.');
      return;
    }

    await wait(300);
  }

  throw new Error(
    `KANDY server did not become ready on port ${serverPort}.`
  );
}

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'كاندي | KANDY Management System',
    backgroundColor: '#FAF7F2',
    icon: path.join(
      __dirname,
      'build',
      process.platform === 'win32' ? 'KANDY.ico' : 'KANDY-icon.png'
    ),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.on(
    'did-fail-load',
    (_event, code, description, url) => {
      console.error('[KANDY] Page failed to load:', {
        code,
        description,
        url
      });
    }
  );

  mainWindow.loadURL(`http://127.0.0.1:${serverPort}`).catch((error) => {
    console.error('[KANDY] Failed to load application:', error);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function registerIpcHandlers() {
  ipcMain.on('window-minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
  });

  ipcMain.on('window-maximize', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
  });

  function registerPrintHandler(channel, defaults) {
    ipcMain.handle(channel, async (_event, options) => {
      try {
        const win = BrowserWindow.getFocusedWindow() || mainWindow;

        if (!win || win.isDestroyed()) {
          return {
            success: false,
            error: 'No active window found'
          };
        }

        return await new Promise((resolve) => {
          win.webContents.print(
            {
              silent: false,
              printBackground: true,
              ...defaults,
              ...(options || {})
            },
            (success, failureReason) => {
              if (!success && failureReason !== 'cancelled') {
                console.error(
                  `[KANDY] ${channel} failed:`,
                  failureReason
                );
              }

              resolve(
                success
                  ? { success: true }
                  : {
                      success: false,
                      error: failureReason || 'Printing cancelled'
                    }
              );
            }
          );
        });
      } catch (error) {
        console.error(`[KANDY] ${channel} error:`, error);

        return {
          success: false,
          error: error.message
        };
      }
    });
  }

  registerPrintHandler('print-receipt', {});
  registerPrintHandler('print-report', {
    pageSize: 'A4',
    landscape: false
  });
}

async function startApplication() {
  if (isStarting || isQuitting) return;

  isStarting = true;

  try {
    if (process.platform === 'darwin' && app.dock) {
      const iconPath = path.join(__dirname, 'build', 'KANDY-icon.png');

      if (fs.existsSync(iconPath)) {
        app.dock.setIcon(iconPath);
      }
    }

    registerIpcHandlers();

    await startServer();
    await waitForServer();

    if (!isQuitting) createWindow();
  } catch (error) {
    console.error('[KANDY] Startup failed:', error);

    if (!isQuitting) app.quit();
  } finally {
    isStarting = false;
  }
}

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(startApplication);

  app.on('activate', () => {
    if (isQuitting) return;

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      return;
    }

    if (serverProcess && serverProcess.exitCode === null) {
      createWindow();
    } else if (!isStarting) {
      startApplication();
    }
  });

  app.on('before-quit', () => {
    isQuitting = true;

    if (serverProcess && serverProcess.exitCode === null) {
      serverProcess.kill();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
