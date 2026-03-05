// Type stub for electron-updater (installed at runtime via npm install)
declare module 'electron-updater' {
  interface UpdateInfo {
    version: string;
    releaseNotes?: string | { version: string; note: string }[];
    releaseDate?: string;
  }

  interface ProgressInfo {
    percent: number;
    bytesPerSecond: number;
    transferred: number;
    total: number;
  }

  interface AutoUpdater {
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;
    on(event: 'checking-for-update', listener: () => void): void;
    on(event: 'update-available', listener: (info: UpdateInfo) => void): void;
    on(event: 'update-not-available', listener: (info: UpdateInfo) => void): void;
    on(event: 'download-progress', listener: (progress: ProgressInfo) => void): void;
    on(event: 'update-downloaded', listener: (info: UpdateInfo) => void): void;
    on(event: 'error', listener: (err: Error) => void): void;
    checkForUpdates(): Promise<any>;
    downloadUpdate(): Promise<any>;
    quitAndInstall(): void;
  }

  export const autoUpdater: AutoUpdater;
}
