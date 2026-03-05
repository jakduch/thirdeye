import { ipcMain, shell, app } from 'electron';
import { IPC } from '../shared/ipc-channels';
import { GitHubService } from './github/GitHubService';
import { PollingManager } from './github/PollingManager';
import * as settings from './settings';

export function registerIpcHandlers(
  github: GitHubService,
  polling: PollingManager,
): void {
  // Auth
  ipcMain.handle(IPC.HAS_TOKEN, async () => settings.hasToken());
  ipcMain.handle(IPC.GET_TOKEN, async () => settings.getToken());
  ipcMain.handle(IPC.SET_TOKEN, async (_e, token: string) => {
    await settings.setToken(token);
    github.setToken(token);
    const s = await settings.getSettings();
    polling.start(s.pollInterval);
    return true;
  });
  ipcMain.handle(IPC.DELETE_TOKEN, async () => {
    await settings.deleteToken();
    polling.stop();
    return true;
  });

  // Notifications
  ipcMain.handle(IPC.GET_NOTIFICATIONS, () => polling.getNotifications());
  ipcMain.handle(IPC.MARK_READ, async (_e, threadId: string) => {
    await github.markAsRead(threadId);
    return true;
  });
  ipcMain.handle(IPC.MARK_ALL_READ, async () => {
    await github.markAllAsRead();
    return true;
  });

  // My PRs & Issues
  ipcMain.handle(IPC.GET_MY_PRS, () => polling.getMyPRs());
  ipcMain.handle(IPC.GET_MY_ISSUES, () => polling.getMyIssues());

  // Check runs
  ipcMain.handle(IPC.GET_CHECK_RUNS, async (_e, owner: string, repo: string, ref: string) => {
    return github.getCheckRuns(owner, repo, ref);
  });

  // Linked items
  ipcMain.handle(IPC.GET_LINKED_ITEMS, async (_e, owner: string, repo: string, number: number) => {
    return github.getLinkedItems(owner, repo, number);
  });

  // Issue / PR detail
  ipcMain.handle(IPC.GET_ISSUE_DETAIL, async (_e, owner: string, repo: string, number: number) => {
    return github.getIssueDetail(owner, repo, number);
  });
  ipcMain.handle(IPC.GET_PR_DETAIL, async (_e, owner: string, repo: string, number: number) => {
    return github.getPRDetail(owner, repo, number);
  });
  ipcMain.handle(IPC.GET_COMMENTS, async (_e, owner: string, repo: string, number: number) => {
    return github.getComments(owner, repo, number);
  });
  ipcMain.handle(IPC.POST_COMMENT, async (_e, owner: string, repo: string, number: number, body: string) => {
    return github.postComment(owner, repo, number, body);
  });

  // Repos
  ipcMain.handle(IPC.GET_REPOS, async () => github.getWatchedRepos());

  // Settings
  ipcMain.handle(IPC.GET_SETTINGS, async () => settings.getSettings());
  ipcMain.handle(IPC.UPDATE_SETTINGS, async (_e, partial: Record<string, unknown>) => {
    const updated = await settings.updateSettings(partial as any);

    // Handle autostart setting
    if ('launchAtStartup' in partial) {
      app.setLoginItemSettings({
        openAtLogin: updated.launchAtStartup,
        openAsHidden: true,
        // On macOS, also set the path for non-App-Store builds
        ...(process.platform === 'darwin' ? { path: app.getPath('exe') } : {}),
      });
    }

    polling.stop();
    polling.start(updated.pollInterval);
    return updated;
  });

  // Polling
  ipcMain.handle(IPC.POLL_NOW, async () => { await polling.poll(); return true; });

  // External links
  ipcMain.handle(IPC.OPEN_EXTERNAL, (_e, url: string) => { shell.openExternal(url); return true; });
}
