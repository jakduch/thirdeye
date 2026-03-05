import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type {
  GitHubNotification, UserItem, RateLimitInfo, SidebarTab, Account,
} from '../../shared/types';
import { api } from '../api/ipc-client';

export interface AppState {
  notifications: GitHubNotification[];
  myPRs: UserItem[];
  myIssues: UserItem[];
  loading: boolean;
  error: string | null;
  selectedRepo: string | null;
  rateLimits: RateLimitInfo[];
  activeTab: SidebarTab;
  showClosed: boolean;
  locallyReadIds: string[];
  viewedItemKeys: string[];
  // Multi-account
  accounts: Account[];
  selectedAccountId: string | null; // null = show all
}

const initialState: AppState = {
  notifications: [],
  myPRs: [],
  myIssues: [],
  loading: false,
  error: null,
  selectedRepo: null,
  rateLimits: [],
  activeTab: 'prs',
  showClosed: true,
  locallyReadIds: [],
  viewedItemKeys: [],
  accounts: [],
  selectedAccountId: null,
};

export const fetchAll = createAsyncThunk('app/fetchAll', async () => {
  const [notifications, myPRs, myIssues, accounts] = await Promise.all([
    api.getNotifications(),
    api.getMyPRs(),
    api.getMyIssues(),
    api.getAccounts(),
  ]);
  return { notifications, myPRs, myIssues, accounts };
});

export const pollNow = createAsyncThunk('app/pollNow', async () => {
  await api.pollNow();
  const [notifications, myPRs, myIssues] = await Promise.all([
    api.getNotifications(),
    api.getMyPRs(),
    api.getMyIssues(),
  ]);
  return { notifications, myPRs, myIssues };
});

export const markRead = createAsyncThunk(
  'app/markRead',
  async ({ accountId, threadId }: { accountId: string; threadId: string }) => {
    try { await api.markRead(accountId, threadId); } catch { /* scope may be missing */ }
    return threadId;
  },
);

export const markAllRead = createAsyncThunk(
  'app/markAllRead',
  async (accountId?: string) => {
    try { await api.markAllRead(accountId); } catch { /* scope may be missing */ }
  },
);

export const fetchAccounts = createAsyncThunk('app/fetchAccounts', async () => {
  return api.getAccounts();
});

export const addAccount = createAsyncThunk(
  'app/addAccount',
  async (account: Account) => {
    return api.addAccount(account);
  },
);

export const removeAccount = createAsyncThunk(
  'app/removeAccount',
  async (accountId: string) => {
    return api.removeAccount(accountId);
  },
);

// Helper: apply locally-read state to notifications
function applyLocalReads(notifications: GitHubNotification[], locallyReadIds: string[]): GitHubNotification[] {
  if (locallyReadIds.length === 0) return notifications;
  const readSet = new Set(locallyReadIds);
  return notifications.map(n => readSet.has(n.id) ? { ...n, unread: false } : n);
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setNotifications(state, action: PayloadAction<GitHubNotification[]>) {
      state.notifications = applyLocalReads(action.payload, state.locallyReadIds);
    },
    setMyPRs(state, action: PayloadAction<UserItem[]>) {
      state.myPRs = action.payload;
    },
    setMyIssues(state, action: PayloadAction<UserItem[]>) {
      state.myIssues = action.payload;
    },
    setSelectedRepo(state, action: PayloadAction<string | null>) {
      state.selectedRepo = action.payload;
    },
    setRateLimits(state, action: PayloadAction<RateLimitInfo[]>) {
      state.rateLimits = action.payload;
    },
    setActiveTab(state, action: PayloadAction<SidebarTab>) {
      state.activeTab = action.payload;
    },
    markItemViewed(state, action: PayloadAction<string>) {
      if (!state.viewedItemKeys.includes(action.payload)) {
        state.viewedItemKeys.push(action.payload);
      }
    },
    setShowClosed(state, action: PayloadAction<boolean>) {
      state.showClosed = action.payload;
    },
    setSelectedAccountId(state, action: PayloadAction<string | null>) {
      state.selectedAccountId = action.payload;
    },
    setAccounts(state, action: PayloadAction<Account[]>) {
      state.accounts = action.payload;
    },
    // Legacy compatibility
    setRateLimit(state, action: PayloadAction<RateLimitInfo | RateLimitInfo[]>) {
      if (Array.isArray(action.payload)) {
        state.rateLimits = action.payload;
      } else {
        // Legacy single rate limit — wrap in array
        state.rateLimits = [action.payload];
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAll.pending, (state) => { state.loading = true; })
      .addCase(fetchAll.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = applyLocalReads(action.payload.notifications, state.locallyReadIds);
        state.myPRs = action.payload.myPRs;
        state.myIssues = action.payload.myIssues;
        state.accounts = action.payload.accounts;
        state.error = null;
      })
      .addCase(fetchAll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch';
      })
      .addCase(pollNow.fulfilled, (state, action) => {
        state.notifications = applyLocalReads(action.payload.notifications, state.locallyReadIds);
        state.myPRs = action.payload.myPRs;
        state.myIssues = action.payload.myIssues;
      })
      .addCase(markRead.fulfilled, (state, action) => {
        const threadId = action.payload;
        if (!state.locallyReadIds.includes(threadId)) {
          state.locallyReadIds.push(threadId);
        }
        const n = state.notifications.find(i => i.id === threadId);
        if (n) n.unread = false;
      })
      .addCase(markAllRead.fulfilled, (state) => {
        state.notifications.forEach(n => {
          n.unread = false;
          if (!state.locallyReadIds.includes(n.id)) {
            state.locallyReadIds.push(n.id);
          }
        });
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.accounts = action.payload;
      })
      .addCase(addAccount.fulfilled, (state, action) => {
        state.accounts = action.payload;
      })
      .addCase(removeAccount.fulfilled, (state, action) => {
        state.accounts = action.payload;
      });
  },
});

export const {
  setNotifications, setMyPRs, setMyIssues,
  setSelectedRepo, setRateLimit, setRateLimits, setActiveTab,
  markItemViewed, setShowClosed,
  setSelectedAccountId, setAccounts,
} = appSlice.actions;
export default appSlice.reducer;
