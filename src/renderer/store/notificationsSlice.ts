import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { GitHubNotification, UserItem, RateLimitInfo, SidebarTab } from '../../shared/types';
import { api } from '../api/ipc-client';

export interface AppState {
  notifications: GitHubNotification[];
  myPRs: UserItem[];
  myIssues: UserItem[];
  loading: boolean;
  error: string | null;
  selectedRepo: string | null;
  rateLimit: RateLimitInfo | null;
  activeTab: SidebarTab;
  showClosed: boolean;
  locallyReadIds: string[];
  viewedItemKeys: string[];
}

const initialState: AppState = {
  notifications: [],
  myPRs: [],
  myIssues: [],
  loading: false,
  error: null,
  selectedRepo: null,
  rateLimit: null,
  activeTab: 'prs',
  showClosed: true,
  locallyReadIds: [],
  viewedItemKeys: [],
};

export const fetchAll = createAsyncThunk('app/fetchAll', async () => {
  const [notifications, myPRs, myIssues] = await Promise.all([
    api.getNotifications(),
    api.getMyPRs(),
    api.getMyIssues(),
  ]);
  return { notifications, myPRs, myIssues };
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
  async (threadId: string) => {
    try { await api.markRead(threadId); } catch { /* notifications scope may be missing */ }
    return threadId;
  },
);

export const markAllRead = createAsyncThunk('app/markAllRead', async () => {
  try { await api.markAllRead(); } catch { /* notifications scope may be missing */ }
});

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
    setRateLimit(state, action: PayloadAction<RateLimitInfo>) {
      state.rateLimit = action.payload;
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAll.pending, (state) => { state.loading = true; })
      .addCase(fetchAll.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = applyLocalReads(action.payload.notifications, state.locallyReadIds);
        state.myPRs = action.payload.myPRs;
        state.myIssues = action.payload.myIssues;
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
        // Persist in local read set
        if (!state.locallyReadIds.includes(threadId)) {
          state.locallyReadIds.push(threadId);
        }
        // Immediately update UI
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
      });
  },
});

export const {
  setNotifications, setMyPRs, setMyIssues,
  setSelectedRepo, setRateLimit, setActiveTab,
  markItemViewed, setShowClosed,
} = appSlice.actions;
export default appSlice.reducer;
