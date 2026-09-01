import { CapacitorElectronConfig, getCapacitorElectronConfig, setupElectronDeepLinking } from '@capacitor-community/electron';
import { MenuItemConstructorOptions, app, ipcMain, MenuItem, BrowserWindow, screen, globalShortcut } from 'electron';
import electronIsDev from 'electron-is-dev';
import unhandled from 'electron-unhandled';
import { autoUpdater } from 'electron-updater';
import { ElectronCapacitorApp, setupContentSecurityPolicy, setupReloadWatcher } from './setup';

unhandled();

const trayMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [new MenuItem({ label: 'Quit App', role: 'quit' })];
const appMenuBarMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [
  { role: process.platform === 'darwin' ? 'appMenu' : 'fileMenu' },
  { role: 'viewMenu' },
];

const capacitorFileConfig: CapacitorElectronConfig = getCapacitorElectronConfig();
const myCapacitorApp = new ElectronCapacitorApp(capacitorFileConfig, trayMenuTemplate, appMenuBarMenuTemplate);

if (capacitorFileConfig.electron?.deepLinkingEnabled) {
  setupElectronDeepLinking(myCapacitorApp, {
    customProtocol: capacitorFileConfig.electron.deepLinkingCustomProtocol ?? 'mycapacitorapp',
  });
}

if (electronIsDev) {
  setupReloadWatcher(myCapacitorApp);
}

let mainWindow = null;
let isExamMode = false;
let resizeTimeout = null;

// ========== BLOCK KEYBOARD SHORTCUTS ==========
function blockSystemGestures() {
  if (!isExamMode) return;

  const shortcutsToBlock = [
    'CmdOrCtrl+Tab', 'CmdOrCtrl+Shift+Tab', 'Alt+Tab', 'Cmd+`',
    'CmdOrCtrl+W', 'CmdOrCtrl+Q', 'CmdOrCtrl+M', 'CmdOrCtrl+H', 'Alt+F4', 'Cmd+Option+Esc',
    'PrintScreen', 'CmdOrCtrl+Shift+3', 'CmdOrCtrl+Shift+4', 'CmdOrCtrl+Shift+5',
    'F3', 'F4', 'F12', 'CmdOrCtrl+Shift+I', 'CmdOrCtrl+Shift+J', 'CmdOrCtrl+Shift+C',
    'Cmd+Space', 'Cmd+Option+Space',
  ];

  shortcutsToBlock.forEach(shortcut => {
    try {
      globalShortcut.register(shortcut, () => {
        console.log(`Blocked: ${shortcut}`);
        return false;
      });
    } catch (err) { }
  });

  globalShortcut.register('Escape', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('escape-pressed');
    }
    return false;
  });
}

// ========== LOCK WINDOW - NO RESIZE, NO MOVE ==========
function lockWindowCompletely() {
  if (!mainWindow || !isExamMode) return;

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // Set to full screen size
  mainWindow.setBounds({ x: 0, y: 0, width, height });
  mainWindow.setFullScreen(true);
  mainWindow.setSimpleFullScreen(true);
  mainWindow.setResizable(false);
  mainWindow.setMovable(false);
  mainWindow.setMaximizable(false);
  mainWindow.setMinimizable(false);

  // Remove window controls (minimize, maximize, close)
  mainWindow.setMenuBarVisibility(false);

  // Prevent any future resizing/moving
  mainWindow.on('will-resize', (event) => {
    if (isExamMode) {
      event.preventDefault();
      return false;
    }
  });

  mainWindow.on('resize', (event) => {
    if (isExamMode) {
      event.preventDefault();
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed() && isExamMode) {
          const { width, height } = screen.getPrimaryDisplay().workAreaSize;
          mainWindow.setBounds({ x: 0, y: 0, width, height });
        }
      }, 10);
    }
  });

  mainWindow.on('move', (event) => {
    if (isExamMode) {
      event.preventDefault();
      const { width, height } = screen.getPrimaryDisplay().workAreaSize;
      mainWindow.setBounds({ x: 0, y: 0, width, height });
    }
  });
}

// ========== FOCUS MONITORING ==========
let focusCheckInterval = null;

function startFocusMonitoring() {
  if (focusCheckInterval) clearInterval(focusCheckInterval);

  focusCheckInterval = setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed() && isExamMode) {
      if (!mainWindow.isFocused()) {
        console.log('Focus lost - forcing back');
        mainWindow.show();
        mainWindow.focus();
        mainWindow.center();
        mainWindow.flashFrame(true);
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.flashFrame(false);
          }
        }, 500);
        mainWindow.webContents.send('focus-lost-warning');
      }
    }
  }, 100);
}

function stopFocusMonitoring() {
  if (focusCheckInterval) {
    clearInterval(focusCheckInterval);
    focusCheckInterval = null;
  }
}

// ========== MAIN LOGIC ==========
(async () => {
  await app.whenReady();

  setupContentSecurityPolicy(myCapacitorApp.getCustomURLScheme());
  await myCapacitorApp.init();

  mainWindow = myCapacitorApp.getMainWindow();

  if (mainWindow) {
    // Allow scrolling by setting proper webPreferences
    mainWindow.webContents.setZoomFactor(1);

    // Ensure scrolling works
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.executeJavaScript(`
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
      `).catch(err => console.log('Scroll setup error:', err));
    });

    // Exam mode handlers
    ipcMain.on('exam-started', () => {
      console.log('🔒 EXAM MODE ACTIVATED');
      isExamMode = true;

      blockSystemGestures();
      lockWindowCompletely();
      startFocusMonitoring();

      console.log(' Window locked - no resize, no move, scrolling works');
    });

    ipcMain.on('exam-ended', () => {
      console.log('🔓 EXAM MODE ENDED');
      isExamMode = false;

      globalShortcut.unregisterAll();
      stopFocusMonitoring();

      mainWindow.setFullScreen(false);
      mainWindow.setSimpleFullScreen(false);
      mainWindow.setResizable(true);
      mainWindow.setMovable(true);
      mainWindow.setMaximizable(true);
      mainWindow.setMinimizable(true);
      mainWindow.setMenuBarVisibility(true);

      mainWindow.removeAllListeners('will-resize');
      mainWindow.removeAllListeners('resize');
      mainWindow.removeAllListeners('move');
    });

    // Prevent closing
    mainWindow.on('close', (event) => {
      if (isExamMode) {
        event.preventDefault();
        mainWindow.webContents.send('blocked-close');
      }
    });
  }

  if (!electronIsDev) {
    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      console.error("Update check failed:", error);
    });
  }
})();

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopFocusMonitoring();
  if (resizeTimeout) clearTimeout(resizeTimeout);
});

ipcMain.on('quit-app', () => {
  app.quit();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async function () {
  if (myCapacitorApp.getMainWindow().isDestroyed()) {
    await myCapacitorApp.init();
  }
});