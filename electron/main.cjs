const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');

app.setName('KANDY');

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

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(startPort = 3000, maxAttempts = 20) {
  for (let p = startPort; p < startPort + maxAttempts; p++) {
    if (await isPortAvailable(p)) {
      return p;
    }
  }
  return startPort;
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

  // قاعدة البيانات الموجودة لا يتم استبدالها أبداً للحفاظ على بيانات الأستاذ إبراهيم راغب.
  if (fs.existsSync(destination)) {
    console.log('[KANDY] Existing database preserved in userData:', destination);
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
        if (!fs.existsSync(destination)) {
          fs.copyFileSync(candidate, destination);
          console.log('[KANDY] Database initialized from candidate:', candidate);
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

  console.warn('[KANDY] Using primary user data directory for new database:', dataDir);
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
      reject(new Error(`مترجم tsx غير موجود في المسار: ${tsxCli}`));
      return;
    }

    if (!fs.existsSync(serverEntry)) {
      reject(new Error(`ملف بدء تشغيل الخادم server.ts غير موجود في: ${serverEntry}`));
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

    console.log('[KANDY] Starting local server...');
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
      console.error('[KANDY] Could not start server process:', error);
      reject(error);
    });

    child.once('spawn', () => {
      console.log('[KANDY] Server process spawned successfully.');
      resolve();
    });

    child.once('exit', (code, signal) => {
      const message = `توقف خادم كاندي الداخلي (الرمز: ${code}, الإشارة: ${signal})`;
      console.error('[KANDY] Server process exited:', { code, signal });

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
      throw new Error('جاري إغلاق التطبيق.');
    }

    if (startupError) {
      throw startupError;
    }

    if (serverProcess && serverProcess.exitCode !== null) {
      throw new Error(
        `توقف خادم كاندي قبل اكتمال التهيئة (رمز الخروج: ${serverProcess.exitCode})`
      );
    }

    if (await checkHealth()) {
      console.log('[KANDY] Server health check passed.');
      return;
    }

    await wait(300);
  }

  throw new Error(
    `لم يتمكن خادم كاندي من العمل على المنفذ ${serverPort} خلال المهلة المحددة.`
  );
}

function resolveApplicationIcon() {
  const buildDir = path.join(__dirname, 'build');
  const winIcon = path.join(buildDir, 'KANDY.ico');
  const macIcon = path.join(buildDir, 'KANDY.icns');
  const pngIcon = path.join(buildDir, 'KANDY-icon.png');

  if (process.platform === 'win32' && fs.existsSync(winIcon)) return winIcon;
  if (process.platform === 'darwin' && fs.existsSync(macIcon)) return macIcon;
  if (fs.existsSync(pngIcon)) return pngIcon;
  if (fs.existsSync(winIcon)) return winIcon;
  return undefined;
}

function setupApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [
          {
            label: 'كاندي | KANDY',
            submenu: [
              { role: 'about', label: 'عن برنامج كاندي' },
              { type: 'separator' },
              { role: 'services', label: 'الخدمات' },
              { type: 'separator' },
              { role: 'hide', label: 'إخفاء كاندي' },
              { role: 'hideOthers', label: 'إخفاء التطبيقات الأخرى' },
              { role: 'unhide', label: 'إظهار الكل' },
              { type: 'separator' },
              { role: 'quit', label: 'إنهاء كاندي' },
            ],
          },
        ]
      : []),
    {
      label: 'تعديل',
      submenu: [
        { role: 'undo', label: 'تراجع (Undo)' },
        { role: 'redo', label: 'إعادة (Redo)' },
        { type: 'separator' },
        { role: 'cut', label: 'قص (Cut)' },
        { role: 'copy', label: 'نسخ (Copy)' },
        { role: 'paste', label: 'لصق (Paste)' },
        { role: 'selectAll', label: 'تحديد الكل (Select All)' },
      ],
    },
    {
      label: 'عرض',
      submenu: [
        { role: 'reload', label: 'إعادة تحميل الصفحة' },
        { role: 'forceReload', label: 'إعادة تحميل إجبارية' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'الحجم الطبيعي' },
        { role: 'zoomIn', label: 'تكبير (+)' },
        { role: 'zoomOut', label: 'تصغير (-)' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'ملء الشاشة' },
      ],
    },
    {
      label: 'نافذة',
      submenu: [
        { role: 'minimize', label: 'تصغير النافذة' },
        { role: 'zoom', label: 'تكبير النافذة' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front', label: 'إحضار للأمام' },
              { type: 'separator' },
              { role: 'window', label: 'نافذة كاندي' },
            ]
          : [{ role: 'close', label: 'إغلاق' }]),
      ],
    },
    {
      label: 'مساعدة',
      submenu: [
        {
          label: 'حول نظام كاندي',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'كاندي | KANDY Roastery Management System',
              message: 'كاندي | KANDY Management System',
              detail:
                'نظام إدارة المحمصة والمبيعات والمخزون والحسابات للأستاذ إبراهيم راغب.\nالإصدار: 1.0.0 Desktop\nمخصص لأنظمة Windows و macOS مع حفظ بيانات دائم ومحلي.',
              buttons: ['موافق'],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  const appIcon = resolveApplicationIcon();

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'كاندي | KANDY Management System',
    backgroundColor: '#FAF7F2',
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    }
  });

  // Safe external navigation: open web links in default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isLocalApp = url.startsWith(`http://127.0.0.1:${serverPort}`) || url.startsWith(`http://localhost:${serverPort}`);
    if (!isLocalApp && (url.startsWith('http://') || url.startsWith('https://'))) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, code, description, url) => {
    console.error('[KANDY] Page failed to load:', { code, description, url });
  });

  mainWindow.loadURL(`http://127.0.0.1:${serverPort}`).catch((error) => {
    console.error('[KANDY] Failed to load application URL:', error);
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

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow && !mainWindow.isDestroyed() ? mainWindow.isMaximized() : false;
  });

  // Native Save File Dialog (Excel / JSON)
  ipcMain.handle('dialog-save-file', async (_event, options = {}) => {
    try {
      const { title, defaultPath, filters, data, isBase64 } = options;
      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: title || 'حفظ الملف',
        defaultPath: defaultPath || 'kandy-export',
        filters: filters || [{ name: 'جميع الملفات', extensions: ['*'] }],
      });

      if (canceled || !filePath) return { success: false, canceled: true };

      const buffer = isBase64 ? Buffer.from(data, 'base64') : Buffer.from(data || '', 'utf-8');
      fs.writeFileSync(filePath, buffer);
      return { success: true, filePath };
    } catch (err) {
      console.error('[KANDY] Save file dialog error:', err);
      return { success: false, error: err.message };
    }
  });

  // Native Open File Dialog (Restore JSON Backup)
  ipcMain.handle('dialog-open-file', async (_event, options = {}) => {
    try {
      const { title, filters } = options;
      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: title || 'اختيار ملف النسخة الاحتياطية',
        filters: filters || [{ name: 'ملفات JSON', extensions: ['json'] }],
        properties: ['openFile'],
      });

      if (canceled || !filePaths || filePaths.length === 0) return { success: false, canceled: true };

      const content = fs.readFileSync(filePaths[0], 'utf-8');
      return {
        success: true,
        filePath: filePaths[0],
        fileName: path.basename(filePaths[0]),
        content,
      };
    } catch (err) {
      console.error('[KANDY] Open file dialog error:', err);
      return { success: false, error: err.message };
    }
  });

  // System info
  ipcMain.handle('get-system-info', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
    };
  });

  // Universal Printing Handlers
  function registerPrintHandler(channel, defaults) {
    ipcMain.handle(channel, async (_event, options) => {
      try {
        const win = BrowserWindow.getFocusedWindow() || mainWindow;
        if (!win || win.isDestroyed()) {
          return { success: false, error: 'لا توجد نافذة نشطة' };
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
                console.error(`[KANDY] ${channel} error:`, failureReason);
              }
              resolve(
                success
                  ? { success: true }
                  : { success: false, error: failureReason || 'تم إلغاء الطباعة' }
              );
            }
          );
        });
      } catch (error) {
        console.error(`[KANDY] ${channel} exception:`, error);
        return { success: false, error: error.message };
      }
    });
  }

  registerPrintHandler('print-receipt', {});
  registerPrintHandler('print-report', {
    pageSize: 'A4',
    landscape: false
  });
}

function stopServerProcess() {
  if (serverProcess && serverProcess.exitCode === null) {
    try {
      console.log('[KANDY] Stopping backend server process...');
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        if (serverProcess && serverProcess.exitCode === null) {
          serverProcess.kill('SIGKILL');
        }
      }, 1500);
    } catch (e) {
      console.error('[KANDY] Error while stopping server process:', e);
    }
  }
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

    setupApplicationMenu();
    registerIpcHandlers();

    serverPort = await findAvailablePort(3000, 20);
    console.log('[KANDY] Selected server port:', serverPort);

    await startServer();
    await waitForServer();

    if (!isQuitting) createWindow();
  } catch (error) {
    console.error('[KANDY] Startup failed:', error);

    try {
      dialog.showErrorBox(
        'خطأ في تشغيل برنامج كاندي',
        `تعذر بدء تشغيل خادم النظام المحلي:\n${error.message || error}\n\nيرجى التأكد من عدم وجود نسخة أخرى تعمل وإعادة المحاولة.`
      );
    } catch {}

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
    stopServerProcess();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  process.on('SIGINT', () => {
    isQuitting = true;
    stopServerProcess();
    app.quit();
  });

  process.on('SIGTERM', () => {
    isQuitting = true;
    stopServerProcess();
    app.quit();
  });
}
