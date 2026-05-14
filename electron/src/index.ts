import { CapacitorElectronConfig, getCapacitorElectronConfig, setupElectronDeepLinking } from '@capacitor-community/electron';
import { MenuItemConstructorOptions, app, ipcMain, MenuItem } from 'electron';
import electronIsDev from 'electron-is-dev';
import unhandled from 'electron-unhandled';
import { autoUpdater } from 'electron-updater';
import { ElectronCapacitorApp, setupContentSecurityPolicy, setupReloadWatcher } from './setup';

// 1. Graceful handling of unhandled errors.
unhandled();

// 2. Define our menu templates (tray and menu bar)
const trayMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [new MenuItem({ label: 'Quit App', role: 'quit' })];
const appMenuBarMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [
  { role: process.platform === 'darwin' ? 'appMenu' : 'fileMenu' },
  { role: 'viewMenu' },
];

// 3. Get Config options from capacitor.config
const capacitorFileConfig: CapacitorElectronConfig = getCapacitorElectronConfig();

// 4. Initialize our app
const myCapacitorApp = new ElectronCapacitorApp(capacitorFileConfig, trayMenuTemplate, appMenuBarMenuTemplate);

// 5. Deep linking setup
if (capacitorFileConfig.electron?.deepLinkingEnabled) {
  setupElectronDeepLinking(myCapacitorApp, {
    customProtocol: capacitorFileConfig.electron.deepLinkingCustomProtocol ?? 'mycapacitorapp',
  });
}

// 6. Dev mode reload watcher
if (electronIsDev) {
  setupReloadWatcher(myCapacitorApp);
}

// --- MAIN APPLICATION LOGIC ---
(async () => {
  // Wait for electron app to be ready
  await app.whenReady();

  // Security - Set Content-Security-Policy
  setupContentSecurityPolicy(myCapacitorApp.getCustomURLScheme());

  // Initialize the app window and load content
  await myCapacitorApp.init();

  // 7. DIGIPROCTOR MODE: Get the window and lock it down
  const mainWindow = myCapacitorApp.getMainWindow();

  if (mainWindow) {
    mainWindow.setKiosk(true);            // Full screen lockdown
    mainWindow.setFullScreen(true);       // Ensure it fills the screen
    mainWindow.setMenuBarVisibility(false); // Hide "File/Edit" menus
  }

  // 8. AUTO-UPDATER: Check for updates if not in development mode
  // 8. AUTO-UPDATER: Check for updates if not in development mode
  if (!electronIsDev) {
    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      // This "catch" stops the red error box from appearing!
      console.error("Update check failed, but opening app anyway:", error);
    });
  }
})();

// --- HANDLERS ---

// Exit the app when the website sends the 'quit-app' signal
ipcMain.on('quit-app', () => {
  app.quit();
});

// Handle window closing logic
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle dock icon clicks (macOS)
app.on('activate', async function () {
  if (myCapacitorApp.getMainWindow().isDestroyed()) {
    await myCapacitorApp.init();
  }
});