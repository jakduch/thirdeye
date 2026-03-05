import { app, Tray, Menu, nativeImage, BrowserWindow, Notification } from 'electron';
import * as path from 'path';
import type { GitHubNotification } from '../shared/types';

let tray: Tray | null = null;
let unreadCount = 0;

export function createTray(
  getMainWindow: () => BrowserWindow | null,
  onPollNow: () => void,
): Tray {
  // Create a simple 16x16 icon (will be replaced with proper icon)
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('ThirdEye');

  updateTrayMenu(getMainWindow, onPollNow);

  tray.on('click', () => {
    const win = getMainWindow();
    if (win) {
      if (win.isVisible()) {
        win.focus();
      } else {
        win.show();
      }
    }
  });

  return tray;
}

export function updateTrayMenu(
  getMainWindow: () => BrowserWindow | null,
  onPollNow: () => void,
): void {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `ThirdEye${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => {
        const win = getMainWindow();
        if (win) { win.show(); win.focus(); }
      },
    },
    {
      label: 'Check Now',
      click: onPollNow,
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(`ThirdEye${unreadCount > 0 ? ` — ${unreadCount} unread` : ''}`);
}

export function updateUnreadCount(
  count: number,
  getMainWindow: () => BrowserWindow | null,
  onPollNow: () => void,
): void {
  unreadCount = count;
  if (tray) {
    updateTrayMenu(getMainWindow, onPollNow);
  }
  // Update dock badge on macOS
  if (process.platform === 'darwin') {
    app.dock?.setBadge(count > 0 ? String(count) : '');
  }
}

export function showNotification(notification: GitHubNotification): void {
  if (Notification.isSupported()) {
    const n = new Notification({
      title: `${notification.subject.type}: ${notification.repository.full_name}`,
      body: notification.subject.title,
    });
    n.show();
  }
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
