import { ipcMain, shell, app } from 'electron';
import { IPC } from '../shared/ipc-channels';
import { ProviderRegistry } from './providers/ProviderRegistry';
import { AggregatePollingManager } from './polling/AggregatePollingManager';
import * as settings from './settings';
import * as updater from './updater';
import type { Account } from '../shared/provider-types';

export function registerIpcHandlers(
  registry: ProviderRegistry,
  polling: AggregatePollingManager,
): void {
  // ── Legacy Auth (kept for backward compat with old renderer) ──
  ipcMain.handle(IPC.HAS_TOKEN, async () => settings.hasToken());
  ipcMain.handle(IPC.GET_TOKEN, async () => settings.getToken());
  ipcMain.handle(IPC.SET_TOKEN, async (_e, token: string) => {
    // Legacy: create a GitHub account from the token
    const account: Account = {
      id: settings.generateId(),
      provider: 'github',
      displayName: 'GitHub',
      token,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    await settings.addAccount(account);
    polling.initializeAccounts(await settings.getAccounts());
    const s = await settings.getSettings();
    polling.start(s.pollInterval);
    return true;
  });
  ipcMain.handle(IPC.DELETE_TOKEN, async () => {
    await settings.deleteToken();
    polling.stop();
    return true;
  });

  // ── Account Management ──
  ipcMain.handle(IPC.GET_ACCOUNTS, async () => settings.getAccounts());

  ipcMain.handle(IPC.ADD_ACCOUNT, async (_e, account: Account) => {
    const accounts = await settings.addAccount(account);
    polling.initializeAccounts(accounts.filter(a => a.enabled));
    const s = await settings.getSettings();
    polling.stop();
    polling.start(s.pollInterval);
    return accounts;
  });

  ipcMain.handle(IPC.REMOVE_ACCOUNT, async (_e, accountId: string) => {
    const accounts = await settings.removeAccount(accountId);
    polling.initializeAccounts(accounts.filter(a => a.enabled));
    if (accounts.filter(a => a.enabled).length === 0) {
      polling.stop();
    }
    return accounts;
  });

  ipcMain.handle(IPC.UPDATE_ACCOUNT, async (_e, accountId: string, partial: Partial<Account>) => {
    const accounts = await settings.updateAccount(accountId, partial);
    polling.initializeAccounts(accounts.filter(a => a.enabled));
    return accounts;
  });

  // ── Notifications ──
  ipcMain.handle(IPC.GET_NOTIFICATIONS, () => polling.getNotifications());
  ipcMain.handle(IPC.MARK_READ, async (_e, accountId: string, threadId: string) => {
    const provider = registry.get(accountId);
    if (provider) await provider.markAsRead(threadId);
    return true;
  });
  ipcMain.handle(IPC.MARK_ALL_READ, async (_e, accountId?: string) => {
    if (accountId) {
      const provider = registry.get(accountId);
      if (provider) await provider.markAllAsRead();
    } else {
      // Mark all read across all providers
      for (const p of registry.all()) {
        try { await p.markAllAsRead(); } catch { /* ignore */ }
      }
    }
    return true;
  });

  // ── My PRs & Issues ──
  ipcMain.handle(IPC.GET_MY_PRS, () => polling.getMyPRs());
  ipcMain.handle(IPC.GET_MY_ISSUES, () => polling.getMyIssues());

  // ── Detail endpoints (account-aware) ──
  ipcMain.handle(IPC.GET_CHECK_RUNS, async (_e, accountId: string, owner: string, repo: string, ref: string) => {
    const provider = registry.get(accountId);
    if (!provider) throw new Error(`Unknown account: ${accountId}`);
    return provider.getCheckRuns(owner, repo, ref);
  });

  ipcMain.handle(IPC.GET_LINKED_ITEMS, async (_e, accountId: string, owner: string, repo: string, number: number) => {
    const provider = registry.get(accountId);
    if (!provider) throw new Error(`Unknown account: ${accountId}`);
    return provider.getLinkedItems(owner, repo, number);
  });

  ipcMain.handle(IPC.GET_ISSUE_DETAIL, async (_e, accountId: string, owner: string, repo: string, number: number) => {
    const provider = registry.get(accountId);
    if (!provider) throw new Error(`Unknown account: ${accountId}`);
    return provider.getIssueDetail(owner, repo, number);
  });

  ipcMain.handle(IPC.GET_PR_DETAIL, async (_e, accountId: string, owner: string, repo: string, number: number) => {
    const provider = registry.get(accountId);
    if (!provider) throw new Error(`Unknown account: ${accountId}`);
    return provider.getPRDetail(owner, repo, number);
  });

  ipcMain.handle(IPC.GET_COMMENTS, async (_e, accountId: string, owner: string, repo: string, number: number) => {
    const provider = registry.get(accountId);
    if (!provider) throw new Error(`Unknown account: ${accountId}`);
    return provider.getComments(owner, repo, number);
  });

  ipcMain.handle(IPC.POST_COMMENT, async (_e, accountId: string, owner: string, repo: string, number: number, body: string) => {
    const provider = registry.get(accountId);
    if (!provider) throw new Error(`Unknown account: ${accountId}`);
    return provider.postComment(owner, repo, number, body);
  });

  // ── Repos ──
  ipcMain.handle(IPC.GET_REPOS, async (_e, accountId?: string) => {
    if (accountId) {
      const provider = registry.get(accountId);
      if (!provider) return [];
      return provider.getWatchedRepos();
    }
    // Aggregate repos from all providers
    const results = await Promise.allSettled(registry.all().map(p => p.getWatchedRepos()));
    return results
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);
  });

  // ── Settings ──
  ipcMain.handle(IPC.GET_SETTINGS, async () => settings.getSettings());
  ipcMain.handle(IPC.UPDATE_SETTINGS, async (_e, partial: Record<string, unknown>) => {
    const updated = await settings.updateSettings(partial as any);

    if ('launchAtStartup' in partial) {
      app.setLoginItemSettings({
        openAtLogin: updated.launchAtStartup,
        openAsHidden: true,
        ...(process.platform === 'darwin' ? { path: app.getPath('exe') } : {}),
      });
    }

    polling.stop();
    polling.start(updated.pollInterval);
    return updated;
  });

  // ── Polling ──
  ipcMain.handle(IPC.POLL_NOW, async () => { await polling.poll(); return true; });

  // ── Updates ──
  ipcMain.handle(IPC.GET_APP_VERSION, () => app.getVersion());
  ipcMain.handle(IPC.CHECK_FOR_UPDATES, async () => { await updater.checkForUpdates(); return true; });
  ipcMain.handle(IPC.DOWNLOAD_UPDATE, async () => { await updater.downloadUpdate(); return true; });
  ipcMain.handle(IPC.QUIT_AND_INSTALL, () => { updater.quitAndInstall(); return true; });
  ipcMain.handle(IPC.GET_UPDATE_STATUS, () => updater.getUpdateStatus());

  // ── External links ──
  ipcMain.handle(IPC.OPEN_EXTERNAL, (_e, url: string) => { shell.openExternal(url); return true; });
}
