export const IPC = {
  // Auth (legacy single-account — kept for backward compat)
  GET_TOKEN: 'get-token',
  SET_TOKEN: 'set-token',
  HAS_TOKEN: 'has-token',
  DELETE_TOKEN: 'delete-token',

  // Account management
  GET_ACCOUNTS: 'get-accounts',
  ADD_ACCOUNT: 'add-account',
  REMOVE_ACCOUNT: 'remove-account',
  UPDATE_ACCOUNT: 'update-account',

  // Data (account-aware — detail endpoints accept accountId as first param)
  GET_NOTIFICATIONS: 'get-notifications',
  GET_ISSUE_DETAIL: 'get-issue-detail',
  GET_PR_DETAIL: 'get-pr-detail',
  GET_COMMENTS: 'get-comments',
  POST_COMMENT: 'post-comment',
  MARK_READ: 'mark-read',
  MARK_ALL_READ: 'mark-all-read',
  GET_REPOS: 'get-repos',

  // User items (PRs & Issues)
  GET_MY_PRS: 'get-my-prs',
  GET_MY_ISSUES: 'get-my-issues',
  GET_CHECK_RUNS: 'get-check-runs',
  GET_LINKED_ITEMS: 'get-linked-items',

  // Settings
  GET_SETTINGS: 'get-settings',
  UPDATE_SETTINGS: 'update-settings',

  // Polling
  POLL_NOW: 'poll-now',
  NOTIFICATIONS_UPDATED: 'notifications-updated',
  MY_PRS_UPDATED: 'my-prs-updated',
  MY_ISSUES_UPDATED: 'my-issues-updated',
  CHECK_STATUS_CHANGED: 'check-status-changed',
  RATE_LIMIT_INFO: 'rate-limit-info',

  // Updates
  CHECK_FOR_UPDATES: 'check-for-updates',
  DOWNLOAD_UPDATE: 'download-update',
  QUIT_AND_INSTALL: 'quit-and-install',
  GET_UPDATE_STATUS: 'get-update-status',
  UPDATE_STATUS_CHANGED: 'update-status-changed',
  GET_APP_VERSION: 'get-app-version',

  // App
  OPEN_EXTERNAL: 'open-external',
} as const;

export type IPCChannel = (typeof IPC)[keyof typeof IPC];
