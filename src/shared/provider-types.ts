// ── Provider Abstraction Types ──
// Shared across main and renderer processes.

export type ProviderType = 'github' | 'gitlab' | 'bitbucket';

/** Persisted account record — stored in electron-store */
export interface Account {
  id: string; // uuid
  provider: ProviderType;
  displayName: string;
  token: string;
  /** GitLab/Bitbucket username (required for Bitbucket basic auth) */
  username?: string;
  /** Self-hosted instance URL (GitLab/Bitbucket Server) */
  instanceUrl?: string;
  enabled: boolean;
  createdAt: string; // ISO
}

// ── Provider-agnostic Data Types ──
// Every data object carries provider + accountId so the renderer can route
// detail requests back to the correct provider.

export interface ProviderNotification {
  id: string;
  provider: ProviderType;
  accountId: string;
  repository: { full_name: string; owner: string; name: string };
  subject: {
    title: string;
    url: string;
    type: 'Issue' | 'PullRequest' | 'MergeRequest' | 'Release' | 'Discussion' | 'CheckSuite' | 'Commit' | 'Pipeline' | 'Todo' | 'Other';
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

export interface ProviderUserItem {
  id: number;
  provider: ProviderType;
  accountId: string;
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
  /** 'mr' for GitLab merge requests */
  type: 'issue' | 'pr' | 'mr';
  draft?: boolean;
  merged?: boolean;
  checks?: ProviderCheckSuiteSummary;
  linkedIssues?: Array<{ number: number; title: string; state: string; html_url: string; repository: string }>;
  linkedPRs?: Array<{ number: number; title: string; state: string; html_url: string; repository: string }>;
}

export interface ProviderIssueDetail {
  provider: ProviderType;
  accountId: string;
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

export interface ProviderPRDetail extends ProviderIssueDetail {
  merged: boolean;
  mergeable: boolean | null;
  draft: boolean;
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  additions: number;
  deletions: number;
  changed_files: number;
}

export interface ProviderComment {
  id: number;
  provider: ProviderType;
  accountId: string;
  body: string;
  user: { login: string; avatar_url: string };
  created_at: string;
  updated_at: string;
  html_url: string;
  author_association: string;
}

export interface ProviderCheckRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  html_url: string;
  started_at: string | null;
  completed_at: string | null;
  app: { name: string; slug: string } | null;
}

export interface ProviderCheckSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  runs: ProviderCheckRun[];
}

export interface ProviderRateLimitInfo {
  accountId: string;
  provider: ProviderType;
  displayName: string;
  limit: number;
  remaining: number;
  reset: number; // unix timestamp
}

export interface ProviderRepo {
  full_name: string;
  description: string | null;
  provider: ProviderType;
  accountId: string;
}

export interface ProviderLinkedItems {
  linkedIssues: Array<{ number: number; title: string; state: string; html_url: string; repository: string }>;
  linkedPRs: Array<{ number: number; title: string; state: string; html_url: string; repository: string }>;
}

/** Activity event for OS notifications */
export interface ProviderActivityEvent {
  provider: ProviderType;
  accountId: string;
  type: 'check_status' | 'new_comment' | 'state_change' | 'new_pr' | 'new_issue' | 'new_mr' | 'review_requested' | 'merged';
  title: string;
  body: string;
  url?: string;
  repo: string;
  number?: number;
}

/** Provider label metadata for UI display */
export const PROVIDER_LABELS: Record<ProviderType, { label: string; color: string; icon: string }> = {
  github: { label: 'GitHub', color: '#24292f', icon: '???' },
  gitlab: { label: 'GitLab', color: '#FC6D26', icon: '???' },
  bitbucket: { label: 'Bitbucket', color: '#0052CC', icon: '???' },
};
