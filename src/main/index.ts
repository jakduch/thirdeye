import { app, BrowserWindow, Notification } from 'electron';
import * as path from 'path';
import { GitHubService } from './github/GitHubService';
import { PollingManager } from './github/PollingManager';
import { registerIpcHandlers } from './ipc-handlers';
import { createTray, updateUnreadCount, showNotification, destroyTray } from './tray';
import * as settings from './settings';
import type { GitHubNotification, ActivityEvent } from '../shared/types';

// Set app name so dev builds also show "ThirdEye" (not "Electron")
app.setName('ThirdEye');

let mainWindow: BrowserWindow | null = null;
const github = new GitHubService();
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

function onActivity(event: ActivityEvent): void {
  settings.getSettings().then(s => {
    if (!s.showNotifications) return;
    if (!Notification.isSupported()) return;
    new Notification({
      title: event.title,
      body: event.body,
    }).show();
  });
}

function onNotificationsUpdate(notifications: GitHubNotification[]): void {
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

const polling = new PollingManager(
  github,
  getMainWindow,
  onNotificationsUpdate,
  onActivity,
  () => settings.getSettings(),
);

app.on('before-quit', () => { isQuitting = true; });

app.whenReady().then(async () => {
  createWindow();
  createTray(getMainWindow, () => polling.poll());
  registerIpcHandlers(github, polling);

  const token = await settings.getToken();
  if (token) {
    github.setToken(token);
    const s = await settings.getSettings();
    // Autostart login-item
    if (s.launchAtStartup) {
      app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });
    }
    // Restore disk cache
    const cached = await settings.getCache();
    if (cached) {
      github.cache.restoreFromDisk(cached);
    }
    polling.start(s.pollInterval);
  }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (mainWindow === null) createWindow(); else mainWindow.show(); });

app.on('will-quit', async () => {
  destroyTray();
  polling.stop();
  // Persist cache to disk
  try {
    const snapshot = github.cache.snapshotForDisk();
    await settings.setCache(snapshot);
  } catch { /* ignore */ }
});
