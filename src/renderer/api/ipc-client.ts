const { ipcRenderer } = window.require('electron');
import { IPC } from '../../shared/ipc-channels';
import type {
  GitHubNotification, IssueDetail, PRDetail, Comment,
  AppSettings, RateLimitInfo, UserItem, CheckSuiteSummary,
  CheckStatusChange,
} from '../../shared/types';

export const api = {
  // Auth
  hasToken: (): Promise<boolean> => ipcRenderer.invoke(IPC.HAS_TOKEN),
  getToken: (): Promise<string | null> => ipcRenderer.invoke(IPC.GET_TOKEN),
  setToken: (token: string): Promise<boolean> => ipcRenderer.invoke(IPC.SET_TOKEN, token),
  deleteToken: (): Promise<boolean> => ipcRenderer.invoke(IPC.DELETE_TOKEN),

  // Notifications
  getNotifications: (): Promise<GitHubNotification[]> => ipcRenderer.invoke(IPC.GET_NOTIFICATIONS),
  markRead: (threadId: string): Promise<boolean> => ipcRenderer.invoke(IPC.MARK_READ, threadId),
  markAllRead: (): Promise<boolean> => ipcRenderer.invoke(IPC.MARK_ALL_READ),

  // My PRs & Issues
  getMyPRs: (): Promise<UserItem[]> => ipcRenderer.invoke(IPC.GET_MY_PRS),
  getMyIssues: (): Promise<UserItem[]> => ipcRenderer.invoke(IPC.GET_MY_ISSUES),

  // Check runs
  getCheckRuns: (owner: string, repo: string, ref: string): Promise<CheckSuiteSummary> =>
    ipcRenderer.invoke(IPC.GET_CHECK_RUNS, owner, repo, ref),

  // Linked items
  getLinkedItems: (owner: string, repo: string, number: number) =>
    ipcRenderer.invoke(IPC.GET_LINKED_ITEMS, owner, repo, number) as Promise<{
      linkedIssues: Array<{ number: number; title: string; state: string; html_url: string; repository: string }>;
      linkedPRs: Array<{ number: number; title: string; state: string; html_url: string; repository: string }>;
    }>,

  // Details
  getIssueDetail: (owner: string, repo: string, number: number): Promise<IssueDetail> =>
    ipcRenderer.invoke(IPC.GET_ISSUE_DETAIL, owner, repo, number),
  getPRDetail: (owner: string, repo: string, number: number): Promise<PRDetail> =>
    ipcRenderer.invoke(IPC.GET_PR_DETAIL, owner, repo, number),
  getComments: (owner: string, repo: string, number: number): Promise<Comment[]> =>
    ipcRenderer.invoke(IPC.GET_COMMENTS, owner, repo, number),
  postComment: (owner: string, repo: string, number: number, body: string): Promise<Comment> =>
    ipcRenderer.invoke(IPC.POST_COMMENT, owner, repo, number, body),

  // Repos
  getRepos: (): Promise<Array<{ full_name: string; description: string | null }>> =>
    ipcRenderer.invoke(IPC.GET_REPOS),

  // Settings
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.GET_SETTINGS),
  updateSettings: (partial: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC.UPDATE_SETTINGS, partial),

  // Polling
  pollNow: (): Promise<boolean> => ipcRenderer.invoke(IPC.POLL_NOW),

  // External
  openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke(IPC.OPEN_EXTERNAL, url),

  // Events
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
  onRateLimitInfo: (cb: (info: RateLimitInfo) => void) => {
    const h = (_e: any, d: RateLimitInfo) => cb(d);
    ipcRenderer.on(IPC.RATE_LIMIT_INFO, h);
    return () => ipcRenderer.removeListener(IPC.RATE_LIMIT_INFO, h);
  },
};
