import { app, BrowserWindow, Notification } from 'electron';
import * as path from 'path';
import { ProviderRegistry } from './providers/ProviderRegistry';
import { AggregatePollingManager } from './polling/AggregatePollingManager';
import { registerIpcHandlers } from './ipc-handlers';
import { createTray, updateUnreadCount, showNotification, destroyTray } from './tray';
import * as settings from './settings';
import { initUpdater, checkForUpdates, downloadUpdate, isNativeUpdaterAvailable, getUpdateStatus } from './updater';
import type { ProviderNotification, ProviderActivityEvent } from '../shared/provider-types';

// Set app name so dev builds also show "ThirdEye" (not "Electron")
app.setName('ThirdEye');

let mainWindow: BrowserWindow | null = null;
const registry = new ProviderRegistry();
let isQuitting = false;

function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 500,
    title: 'ThirdEye',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.on('close', (e) => {
    if (!isQuitting) { e.preventDefault(); mainWindow?.hide(); }
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

let previousUnreadIds = new Set<string>();

function onActivity(event: ProviderActivityEvent): void {
  settings.getSettings().then(s => {
    if (!s.showNotifications) return;
    if (!Notification.isSupported()) return;
    new Notification({
      title: event.title,
      body: event.body,
    }).show();
  });
}

function onNotificationsUpdate(notifications: ProviderNotification[]): void {
  const unread = notifications.filter(n => n.unread);
  updateUnreadCount(unread.length, getMainWindow, () => polling.poll());
  settings.getSettings().then(s => {
    if (s.showNotifications) {
      const currentUnreadIds = new Set(unread.map(n => n.id));
      for (const n of unread) {
        if (!previousUnreadIds.has(n.id)) showNotification(n);
      }
      previousUnreadIds = currentUnreadIds;
    }
  });
}

const polling = new AggregatePollingManager(
  registry,
  getMainWindow,
  onNotificationsUpdate,
  onActivity,
  () => settings.getSettings(),
);

app.on('before-quit', () => { isQuitting = true; });

app.whenReady().then(async () => {
  createWindow();
  createTray(getMainWindow, () => polling.poll());
  registerIpcHandlers(registry, polling);

  // Run migration from old single-token to multi-account
  await settings.migrateIfNeeded();

  const accounts = await settings.getAccounts();
  const enabled = accounts.filter(a => a.enabled);

  if (enabled.length > 0) {
    // Initialize providers for all enabled accounts
    polling.initializeAccounts(enabled);

    // Restore per-account caches
    const caches = await settings.getAllProviderCaches();
    for (const provider of registry.all()) {
      const cached = caches[provider.accountId];
      if (cached) provider.restoreCache(cached);
    }

    const s = await settings.getSettings();

    if (s.launchAtStartup) {
      app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });
    }

    polling.start(s.pollInterval);
  }

  // Initialize updater (sets up event listeners, autoDownload based on settings)
  const appSettings = await settings.getSettings();
  if (mainWindow) await initUpdater(mainWindow, appSettings.autoUpdate);

  // Auto-update check (delayed 5s to not block startup)
  // Native updater: checks + downloads automatically via electron-updater events
  // Fallback: checks GitHub API, then downloads installer to Downloads folder
  if (appSettings.autoUpdate) {
    setTimeout(async () => {
      try {
        await checkForUpdates();
        // In fallback mode, auto-download to Downloads if update available
        if (!isNativeUpdaterAvailable() && getUpdateStatus().status === 'available') {
          await downloadUpdate();
        }
      } catch { /* ignore */ }
    }, 5000);
  }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (mainWindow === null) createWindow(); else mainWindow.show(); });

app.on('will-quit', async () => {
  destroyTray();
  polling.stop();
  // Persist per-account caches to disk
  try {
    const caches: Record<string, any> = {};
    for (const provider of registry.all()) {
      const snapshot = provider.snapshotCache();
      if (snapshot) caches[provider.accountId] = snapshot;
    }
    await settings.setAllProviderCaches(caches);
  } catch { /* ignore */ }
});
