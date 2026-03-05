export interface AppSettings {
  pollInterval: number; // seconds
  watchedRepos: string[]; // "owner/repo" — if non-empty, ONLY these repos are shown
  ignoredRepos: string[]; // "owner/repo" — these repos are always hidden
  showNotifications: boolean;
  launchAtStartup: boolean;
  showClosed: boolean; // show closed/merged PRs and Issues in lists
  theme: 'light' | 'dark' | 'system';
}

export const DEFAULT_SETTINGS: AppSettings = {
  pollInterval: 60,
  watchedRepos: [],
  ignoredRepos: [],
  showNotifications: true,
  launchAtStartup: false,
  showClosed: true,
  theme: 'system',
};

export interface GitHubNotification {
  id: string;
  repository: {
    full_name: string;
    owner: string;
    name: string;
  };
  subject: {
    title: string;
    url: string;
    type: 'Issue' | 'PullRequest' | 'Release' | 'Discussion' | 'CheckSuite' | 'Commit';
  };
  reason: string;
  unread: boolean;
  updated_at: string;
  url: string;
  number?: number;
  state?: string;
  labels?: Array<{ name: string; color: string }>;
  user?: { login: string; avatar_url: string };
  body?: string;
  html_url?: string;
}

export interface IssueDetail {
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  user: { login: string; avatar_url: string };
  labels: Array<{ name: string; color: string }>;
  assignees: Array<{ login: string; avatar_url: string }>;
  created_at: string;
  updated_at: string;
  comments: number;
  pull_request?: { html_url: string };
}

export interface PRDetail extends IssueDetail {
  merged: boolean;
  mergeable: boolean | null;
  draft: boolean;
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  additions: number;
  deletions: number;
  changed_files: number;
}

export interface Comment {
  id: number;
  body: string;
  user: { login: string; avatar_url: string };
  created_at: string;
  updated_at: string;
  html_url: string;
  author_association: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // unix timestamp
}

export interface CheckRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  html_url: string;
  started_at: string | null;
  completed_at: string | null;
  app: { name: string; slug: string } | null;
}

export interface CheckSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  runs: CheckRun[];
}

export interface UserItem {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
  repository: { full_name: string; owner: string; name: string };
  user: { login: string; avatar_url: string };
  labels: Array<{ name: string; color: string }>;
  created_at: string;
  updated_at: string;
  comments: number;
  type: 'issue' | 'pr';
  draft?: boolean;
  merged?: boolean;
  checks?: CheckSuiteSummary;
  linkedIssues?: Array<{ number: number; title: string; state: string; html_url: string; repository: string }>;
  linkedPRs?: Array<{ number: number; title: string; state: string; html_url: string; repository: string }>;
}

export type SidebarTab = 'prs' | 'issues' | 'notifications';

export interface CheckStatusChange {
  prNumber: number;
  prTitle: string;
  repo: string;
  checkName: string;
  conclusion: string;
  html_url: string;
}

/** Generic activity event pushed as OS notification */
export interface ActivityEvent {
  type: 'check_status' | 'new_comment' | 'state_change' | 'new_pr' | 'new_issue' | 'review_requested' | 'merged';
  title: string;
  body: string;
  url?: string;
  repo: string;
  number?: number;
}
