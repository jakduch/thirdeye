import { app, BrowserWindow, Notification, shell } from 'electron';
import * as path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { IPC } from '../shared/ipc-channels';

// ── Types ──

export interface UpdateInfo {
  version: string;
  releaseNotes: string;
  releaseDate: string;
  downloadUrl: string;        // link to release page
  installerUrl?: string;      // direct link to platform-specific installer
  installerFilename?: string; // e.g. "ThirdEye-2.2.0-win-setup.exe"
}

export interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export type UpdateStatusType =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'       // native updater: ready to quitAndInstall
  | 'downloaded-manual' // fallback: installer saved to Downloads
  | 'error';

export interface UpdateStatus {
  status: UpdateStatusType;
  info?: UpdateInfo;
  progress?: UpdateProgress;
  error?: string;
  /** true when electron-updater is available (fully automatic) */
  nativeUpdater: boolean;
  /** path to downloaded file (fallback mode) */
  downloadedPath?: string;
}

// ── State ──

let mainWindow: BrowserWindow | null = null;
let currentStatus: UpdateStatus = { status: 'idle', nativeUpdater: false };
let useNativeUpdater = false;
let nativeAutoUpdater: any = null;

const GITHUB_REPO = 'jakduch/thirdeye';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

// ── Helpers ──

function setStatus(partial: Omit<UpdateStatus, 'nativeUpdater'>): void {
  currentStatus = { ...partial, nativeUpdater: useNativeUpdater };
  mainWindow?.webContents?.send(IPC.UPDATE_STATUS_CHANGED, currentStatus);
}

function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function buildUpdateInfo(info: any): UpdateInfo {
  return {
    version: info.version || '',
    releaseNotes: typeof info.releaseNotes === 'string'
      ? info.releaseNotes
      : Array.isArray(info.releaseNotes)
        ? info.releaseNotes.map((n: any) => n.note || '').join('\n')
        : '',
    releaseDate: info.releaseDate || new Date().toISOString(),
    downloadUrl: `https://github.com/${GITHUB_REPO}/releases/tag/v${info.version}`,
  };
}

/**
 * Pick the right asset from the release for the current platform.
 * Returns { url, filename } or null if not found.
 */
function pickAssetForPlatform(assets: any[]): { url: string; filename: string } | null {
  const p = process.platform;
  const a = process.arch;

  const patterns: RegExp[] = [];
  if (p === 'darwin') {
    patterns.push(/\.dmg$/i);
  } else if (p === 'win32') {
    patterns.push(/win.*setup.*\.exe$/i, /\.exe$/i);
  } else if (p === 'linux') {
    if (a === 'arm64') {
      patterns.push(/linux.*arm64.*\.AppImage$/i, /linux.*arm64.*\.deb$/i);
    } else {
      patterns.push(/linux.*x64.*\.AppImage$/i, /linux.*amd64.*\.deb$/i, /linux.*x64.*\.deb$/i);
    }
  }

  for (const pat of patterns) {
    const match = assets.find((asset: any) => pat.test(asset.name));
    if (match) return { url: match.browser_download_url, filename: match.name };
  }
  return null;
}

// ── Native electron-updater ──

async function tryInitNativeUpdater(autoDownload: boolean): Promise<boolean> {
  try {
    const mod = await import('electron-updater');
    nativeAutoUpdater = mod.autoUpdater;
    nativeAutoUpdater.autoDownload = autoDownload;
    nativeAutoUpdater.autoInstallOnAppQuit = true;

    nativeAutoUpdater.on('checking-for-update', () => setStatus({ status: 'checking' }));

    nativeAutoUpdater.on('update-available', (info: any) => {
      const updateInfo = buildUpdateInfo(info);
      if (autoDownload) {
        setStatus({ status: 'downloading', info: updateInfo });
      } else {
        setStatus({ status: 'available', info: updateInfo });
        if (Notification.isSupported()) {
          new Notification({
            title: 'ThirdEye — Update available',
            body: `Version ${info.version} is available. Open Settings to download.`,
          }).show();
        }
      }
    });

    nativeAutoUpdater.on('update-not-available', () => setStatus({ status: 'not-available' }));

    nativeAutoUpdater.on('download-progress', (progress: any) => {
      setStatus({
        status: 'downloading',
        info: currentStatus.info,
        progress: {
          percent: progress.percent,
          bytesPerSecond: progress.bytesPerSecond,
          transferred: progress.transferred,
          total: progress.total,
        },
      });
    });

    nativeAutoUpdater.on('update-downloaded', (info: any) => {
      setStatus({ status: 'downloaded', info: currentStatus.info || buildUpdateInfo(info) });
      if (Notification.isSupported()) {
        const n = new Notification({
          title: 'ThirdEye — Ready to update',
          body: `Version ${info.version} downloaded. Restart to install.`,
        });
        n.on('click', () => nativeAutoUpdater.quitAndInstall());
        n.show();
      }
    });

    nativeAutoUpdater.on('error', async (err: Error) => {
      const msg = err.message || '';
      const isChecksumError = /sha512 checksum mismatch/i.test(msg)
        || /checksum/i.test(msg);

      if (isChecksumError) {
        console.warn('[updater] Native updater checksum error, falling back to GitHub API download:', msg);
        // Fall back to GitHub API path which doesn't rely on YML checksums
        try {
          await checkViaGitHubAPI();
          if (currentStatus.status === 'available') {
            await downloadToDownloads();
          }
        } catch (fallbackErr: any) {
          setStatus({ status: 'error', error: `Checksum error & fallback failed: ${fallbackErr.message}` });
        }
      } else {
        setStatus({ status: 'error', error: msg });
      }
    });

    useNativeUpdater = true;
    return true;
  } catch {
    return false;
  }
}

// ── GitHub API check + manual download fallback ──

async function checkViaGitHubAPI(): Promise<void> {
  setStatus({ status: 'checking' });

  try {
    const resp = await fetch(GITHUB_API_URL, {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'ThirdEye-Updater' },
    });

    if (!resp.ok) {
      if (resp.status === 404) { setStatus({ status: 'not-available' }); return; }
      throw new Error(`GitHub API returned ${resp.status}`);
    }

    const release = await resp.json();
    const latestVersion = (release.tag_name || '').replace(/^v/, '');
    const currentVersion = app.getVersion();

    if (compareSemver(latestVersion, currentVersion) > 0) {
      const asset = pickAssetForPlatform(release.assets || []);
      setStatus({
        status: 'available',
        info: {
          version: latestVersion,
          releaseNotes: release.body || '',
          releaseDate: release.published_at || new Date().toISOString(),
          downloadUrl: release.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
          installerUrl: asset?.url,
          installerFilename: asset?.filename,
        },
      });
    } else {
      setStatus({ status: 'not-available' });
    }
  } catch (err: any) {
    setStatus({ status: 'error', error: err.message || 'Failed to check for updates' });
  }
}

/**
 * Download the installer file to the user's Downloads folder.
 * Emits progress updates via IPC.
 */
async function downloadToDownloads(): Promise<void> {
  const info = currentStatus.info;
  if (!info?.installerUrl) {
    // No direct asset found — open release page in browser
    shell.openExternal(info?.downloadUrl || `https://github.com/${GITHUB_REPO}/releases/latest`);
    return;
  }

  setStatus({ status: 'downloading', info });

  try {
    const resp = await fetch(info.installerUrl, {
      headers: { 'User-Agent': 'ThirdEye-Updater' },
      redirect: 'follow',
    });

    if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
    if (!resp.body) throw new Error('No response body');

    const total = parseInt(resp.headers.get('content-length') || '0', 10);
    const downloadsDir = app.getPath('downloads');
    const filename = info.installerFilename || `ThirdEye-${info.version}-update`;
    const filePath = path.join(downloadsDir, filename);

    const fileStream = createWriteStream(filePath);
    let transferred = 0;
    const startTime = Date.now();

    // Convert web ReadableStream to Node Readable and track progress
    const reader = resp.body.getReader();
    const nodeStream = new Readable({
      async read() {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
          return;
        }
        transferred += value.byteLength;
        const elapsed = (Date.now() - startTime) / 1000;
        const bytesPerSecond = elapsed > 0 ? transferred / elapsed : 0;
        const percent = total > 0 ? (transferred / total) * 100 : 0;
        setStatus({
          status: 'downloading',
          info,
          progress: { percent, bytesPerSecond, transferred, total },
        });
        this.push(value);
      },
    });

    await pipeline(nodeStream, fileStream);

    setStatus({ status: 'downloaded-manual', info, downloadedPath: filePath });

    if (Notification.isSupported()) {
      const n = new Notification({
        title: 'ThirdEye — Update downloaded',
        body: `${filename} saved to Downloads. Click to open.`,
      });
      n.on('click', () => shell.showItemInFolder(filePath));
      n.show();
    }
  } catch (err: any) {
    setStatus({ status: 'error', error: err.message || 'Download failed' });
  }
}

// ── Public API ──

export async function initUpdater(win: BrowserWindow, autoDownload = true): Promise<void> {
  mainWindow = win;
  await tryInitNativeUpdater(autoDownload);
}

export async function checkForUpdates(): Promise<void> {
  if (useNativeUpdater && nativeAutoUpdater) {
    try {
      await nativeAutoUpdater.checkForUpdates();
    } catch {
      await checkViaGitHubAPI();
    }
  } else {
    await checkViaGitHubAPI();
  }
}

export async function downloadUpdate(): Promise<void> {
  if (useNativeUpdater && nativeAutoUpdater) {
    try {
      // electron-updater requires checkForUpdates() before downloadUpdate()
      if (currentStatus.status !== 'available' && currentStatus.status !== 'downloading') {
        await nativeAutoUpdater.checkForUpdates();
      }
      await nativeAutoUpdater.downloadUpdate();
    } catch (err: any) {
      // If native download fails (e.g. checksum mismatch), fall back to GitHub API
      console.warn('[updater] Native download failed, falling back to GitHub API:', err.message);
      await checkViaGitHubAPI();
      if (currentStatus.status === 'available') {
        await downloadToDownloads();
      }
    }
  } else {
    await downloadToDownloads();
  }
}

export function quitAndInstall(): void {
  if (useNativeUpdater && nativeAutoUpdater) {
    nativeAutoUpdater.quitAndInstall();
  } else if (currentStatus.downloadedPath) {
    shell.openPath(currentStatus.downloadedPath);
  } else {
    shell.openExternal(currentStatus.info?.downloadUrl || `https://github.com/${GITHUB_REPO}/releases/latest`);
  }
}

export function setAutoDownload(enabled: boolean): void {
  if (nativeAutoUpdater) nativeAutoUpdater.autoDownload = enabled;
}

export function getUpdateStatus(): UpdateStatus {
  return currentStatus;
}

export function isNativeUpdaterAvailable(): boolean {
  return useNativeUpdater;
}
