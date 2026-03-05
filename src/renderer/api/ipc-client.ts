const { ipcRenderer } = window.require('electron');
import { IPC } from '../../shared/ipc-channels';
import type {
  GitHubNotification, IssueDetail, PRDetail, Comment,
  AppSettings, RateLimitInfo, UserItem, CheckSuiteSummary,
  CheckStatusChange, Account, ProviderRepo, ProviderLinkedItems,
} from '../../shared/types';

export const api = {
  // ── Legacy Auth (backward compat) ──
  hasToken: (): Promise<boolean> => ipcRenderer.invoke(IPC.HAS_TOKEN),
  getToken: (): Promise<string | null> => ipcRenderer.invoke(IPC.GET_TOKEN),
  setToken: (token: string): Promise<boolean> => ipcRenderer.invoke(IPC.SET_TOKEN, token),
  deleteToken: (): Promise<boolean> => ipcRenderer.invoke(IPC.DELETE_TOKEN),

  // ── Account Management ──
  getAccounts: (): Promise<Account[]> => ipcRenderer.invoke(IPC.GET_ACCOUNTS),
  addAccount: (account: Account): Promise<Account[]> => ipcRenderer.invoke(IPC.ADD_ACCOUNT, account),
  removeAccount: (accountId: string): Promise<Account[]> => ipcRenderer.invoke(IPC.REMOVE_ACCOUNT, accountId),
  updateAccount: (accountId: string, partial: Partial<Account>): Promise<Account[]> =>
    ipcRenderer.invoke(IPC.UPDATE_ACCOUNT, accountId, partial),

  // ── Notifications ──
  getNotifications: (): Promise<GitHubNotification[]> => ipcRenderer.invoke(IPC.GET_NOTIFICATIONS),
  markRead: (accountId: string, threadId: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.MARK_READ, accountId, threadId),
  markAllRead: (accountId?: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.MARK_ALL_READ, accountId),

  // ── My PRs & Issues ──
  getMyPRs: (): Promise<UserItem[]> => ipcRenderer.invoke(IPC.GET_MY_PRS),
  getMyIssues: (): Promise<UserItem[]> => ipcRenderer.invoke(IPC.GET_MY_ISSUES),

  // ── Detail endpoints (account-aware) ──
  getCheckRuns: (accountId: string, owner: string, repo: string, ref: string): Promise<CheckSuiteSummary> =>
    ipcRenderer.invoke(IPC.GET_CHECK_RUNS, accountId, owner, repo, ref),

  getLinkedItems: (accountId: string, owner: string, repo: string, number: number): Promise<ProviderLinkedItems> =>
    ipcRenderer.invoke(IPC.GET_LINKED_ITEMS, accountId, owner, repo, number),

  getIssueDetail: (accountId: string, owner: string, repo: string, number: number): Promise<IssueDetail> =>
    ipcRenderer.invoke(IPC.GET_ISSUE_DETAIL, accountId, owner, repo, number),

  getPRDetail: (accountId: string, owner: string, repo: string, number: number): Promise<PRDetail> =>
    ipcRenderer.invoke(IPC.GET_PR_DETAIL, accountId, owner, repo, number),

  getComments: (accountId: string, owner: string, repo: string, number: number): Promise<Comment[]> =>
    ipcRenderer.invoke(IPC.GET_COMMENTS, accountId, owner, repo, number),

  postComment: (accountId: string, owner: string, repo: string, number: number, body: string): Promise<Comment> =>
    ipcRenderer.invoke(IPC.POST_COMMENT, accountId, owner, repo, number, body),

  // ── Repos ──
  getRepos: (accountId?: string): Promise<ProviderRepo[]> =>
    ipcRenderer.invoke(IPC.GET_REPOS, accountId),

  // ── Settings ──
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.GET_SETTINGS),
  updateSettings: (partial: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC.UPDATE_SETTINGS, partial),

  // ── Polling ──
  pollNow: (): Promise<boolean> => ipcRenderer.invoke(IPC.POLL_NOW),

  // ── Updates ──
  getAppVersion: (): Promise<string> => ipcRenderer.invoke(IPC.GET_APP_VERSION),
  checkForUpdates: (): Promise<boolean> => ipcRenderer.invoke(IPC.CHECK_FOR_UPDATES),
  downloadUpdate: (): Promise<boolean> => ipcRenderer.invoke(IPC.DOWNLOAD_UPDATE),
  quitAndInstall: (): Promise<boolean> => ipcRenderer.invoke(IPC.QUIT_AND_INSTALL),
  getUpdateStatus: (): Promise<any> => ipcRenderer.invoke(IPC.GET_UPDATE_STATUS),

  // ── External ──
  openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke(IPC.OPEN_EXTERNAL, url),

  // ── Events ──
  onNotificationsUpdated: (cb: (data: GitHubNotification[]) => void) => {
    const h = (_e: any, d: GitHubNotification[]) => cb(d);
    ipcRenderer.on(IPC.NOTIFICATIONS_UPDATED, h);
    return () => ipcRenderer.removeListener(IPC.NOTIFICATIONS_UPDATED, h);
  },
  onMyPRsUpdated: (cb: (data: UserItem[]) => void) => {
    const h = (_e: any, d: UserItem[]) => cb(d);
    ipcRenderer.on(IPC.MY_PRS_UPDATED, h);
    return () => ipcRenderer.removeListener(IPC.MY_PRS_UPDATED, h);
  },
  onMyIssuesUpdated: (cb: (data: UserItem[]) => void) => {
    const h = (_e: any, d: UserItem[]) => cb(d);
    ipcRenderer.on(IPC.MY_ISSUES_UPDATED, h);
    return () => ipcRenderer.removeListener(IPC.MY_ISSUES_UPDATED, h);
  },
  onCheckStatusChanged: (cb: (data: CheckStatusChange) => void) => {
    const h = (_e: any, d: CheckStatusChange) => cb(d);
    ipcRenderer.on(IPC.CHECK_STATUS_CHANGED, h);
    return () => ipcRenderer.removeListener(IPC.CHECK_STATUS_CHANGED, h);
  },
  onRateLimitInfo: (cb: (info: RateLimitInfo[]) => void) => {
    const h = (_e: any, d: RateLimitInfo[]) => cb(d);
    ipcRenderer.on(IPC.RATE_LIMIT_INFO, h);
    return () => ipcRenderer.removeListener(IPC.RATE_LIMIT_INFO, h);
  },
  onUpdateStatus: (cb: (status: any) => void) => {
    const h = (_e: any, d: any) => cb(d);
    ipcRenderer.on(IPC.UPDATE_STATUS_CHANGED, h);
    return () => ipcRenderer.removeListener(IPC.UPDATE_STATUS_CHANGED, h);
  },
};
