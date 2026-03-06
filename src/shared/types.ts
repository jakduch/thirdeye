// Re-export all provider types so the renderer can import from one place
export type {
  ProviderType, Account,
  ProviderNotification, ProviderUserItem,
  ProviderIssueDetail, ProviderPRDetail,
  ProviderComment, ProviderCheckRun, ProviderCheckSuiteSummary,
  ProviderRateLimitInfo, ProviderRepo, ProviderLinkedItems,
  ProviderActivityEvent,
} from './provider-types';
export { PROVIDER_LABELS } from './provider-types';

// ── App-level types (not provider-specific) ──

export interface AppSettings {
  pollInterval: number; // seconds
  watchedRepos: string[]; // "owner/repo" — if non-empty, ONLY these repos are shown
  ignoredRepos: string[]; // "owner/repo" — these repos are always hidden
  showNotifications: boolean;
  launchAtStartup: boolean;
  showClosed: boolean; // show closed/merged PRs and Issues in lists
  commentSortOrder: 'asc' | 'desc'; // ascending = oldest first, descending = newest first
  theme: 'light' | 'dark' | 'system';
  autoUpdate: boolean; // check for updates on startup
}

export const DEFAULT_SETTINGS: AppSettings = {
  pollInterval: 60,
  watchedRepos: [],
  ignoredRepos: [],
  showNotifications: true,
  launchAtStartup: false,
  showClosed: true,
  commentSortOrder: 'asc',
  theme: 'system',
  autoUpdate: true,
};

export type SidebarTab = 'prs' | 'issues' | 'notifications';

export interface CheckStatusChange {
  prNumber: number;
  prTitle: string;
  repo: string;
  checkName: string;
  conclusion: string;
  html_url: string;
}

// ── Type aliases for backward compatibility ──
// Old code that imports GitHubNotification, UserItem, etc. will still work
// but these are now the provider-agnostic versions with provider/accountId fields.

import type {
  ProviderNotification, ProviderUserItem,
  ProviderIssueDetail, ProviderPRDetail,
  ProviderComment as _ProviderComment,
  ProviderCheckRun as _ProviderCheckRun,
  ProviderCheckSuiteSummary,
  ProviderRateLimitInfo as _ProviderRateLimitInfo,
  ProviderActivityEvent,
} from './provider-types';

export type GitHubNotification = ProviderNotification;
export type UserItem = ProviderUserItem;
export type IssueDetail = ProviderIssueDetail;
export type PRDetail = ProviderPRDetail;
export type Comment = _ProviderComment;
export type CheckRun = _ProviderCheckRun;
export type CheckSuiteSummary = ProviderCheckSuiteSummary;
export type RateLimitInfo = _ProviderRateLimitInfo;
export type ActivityEvent = ProviderActivityEvent;
