import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import {
  fetchAll, pollNow, markAllRead, markRead,
  setSelectedRepo, setNotifications, setMyPRs, setMyIssues,
  setRateLimits, setActiveTab, markItemViewed, setShowClosed,
} from '../store/notificationsSlice';
import { api } from '../api/ipc-client';
import Sidebar from '../components/Sidebar';
import ItemList from '../components/ItemList';
import NotificationList from '../components/NotificationList';
import DetailView from '../components/DetailView';
import type { UserItem, GitHubNotification } from '../../shared/types';

interface Props {
  onOpenSettings: () => void;
}

export default function Dashboard({ onOpenSettings }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dispatch = useDispatch<AppDispatch>();
  const { notifications, myPRs, myIssues, selectedRepo, rateLimits, activeTab, showClosed } = useSelector((s: RootState) => s.app);
  const [selectedItem, setSelectedItem] = useState<UserItem | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<GitHubNotification | null>(null);

  useEffect(() => {
    dispatch(fetchAll());
    // Load showClosed from settings
    api.getSettings().then(s => dispatch(setShowClosed(s.showClosed)));
    const unsub1 = api.onNotificationsUpdated((d) => dispatch(setNotifications(d)));
    const unsub2 = api.onMyPRsUpdated((d) => dispatch(setMyPRs(d)));
    const unsub3 = api.onMyIssuesUpdated((d) => dispatch(setMyIssues(d)));
    const unsub4 = api.onRateLimitInfo((d) => dispatch(setRateLimits(d)));
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [dispatch]);

  const closedFilter = (item: UserItem) => showClosed || item.state === 'open';
  const filteredPRs = (selectedRepo ? myPRs.filter(p => p.repository.full_name === selectedRepo) : myPRs).filter(closedFilter);
  const filteredIssues = (selectedRepo ? myIssues.filter(i => i.repository.full_name === selectedRepo) : myIssues).filter(closedFilter);
  const filteredNotifications = selectedRepo ? notifications.filter(n => n.repository.full_name === selectedRepo) : notifications;

  const handleSelectNotification = (n: GitHubNotification) => {
    setSelectedNotification(n);
    if (n.unread) dispatch(markRead({ accountId: n.accountId, threadId: n.id }));
    if (n.number) {
      const [owner, name] = n.repository.full_name.split('/');
      setSelectedItem({
        id: parseInt(n.id, 10),
        provider: n.provider,
        accountId: n.accountId,
        number: n.number,
        title: n.subject.title,
        state: 'open',
        html_url: '',
        repository: { full_name: n.repository.full_name, owner, name },
        user: { login: '', avatar_url: '' },
        labels: [],
        created_at: n.updated_at,
        updated_at: n.updated_at,
        comments: 0,
        type: n.subject.type === 'PullRequest' ? 'pr' : (n.subject.type === 'MergeRequest' ? 'mr' : 'issue'),
      });
    }
  };

  const handleSelectItem = (item: UserItem) => {
    setSelectedItem(item);
    dispatch(markItemViewed(`${item.repository.full_name}#${item.number}`));
  };

  const borderColor = theme.palette.divider;

  // Empty state for detail pane
  const EmptyDetail = () => (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', flexDirection: 'column', gap: 1.5,
    }}>
      <svg width="40" height="40" viewBox="0 0 16 16" fill={isDark ? '#21262d' : '#d0d7de'}>
        <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
      </svg>
      <Typography sx={{ fontSize: '14px', color: theme.palette.text.secondary, fontWeight: 500 }}>
        Select an item to view details
      </Typography>
      <Typography sx={{ fontSize: '12px', color: isDark ? '#484f58' : '#8c959f' }}>
        Choose a PR, issue, or notification from the list
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: isDark ? '#0d1117' : '#ffffff' }}>
      <Sidebar
        notifications={notifications}
        myPRs={myPRs}
        myIssues={myIssues}
        activeTab={activeTab}
        selectedRepo={selectedRepo}
        onTabChange={(t) => { dispatch(setActiveTab(t)); setSelectedItem(null); }}
        onSelectRepo={(r) => dispatch(setSelectedRepo(r))}
        onRefresh={() => dispatch(pollNow())}
        onMarkAllRead={() => dispatch(markAllRead())}
        onOpenSettings={onOpenSettings}
        rateLimits={rateLimits}
      />

      {/* Item list pane */}
      <Box sx={{
        width: 380,
        borderRight: `1px solid ${borderColor}`,
        overflow: 'hidden',
        bgcolor: isDark ? '#0d1117' : '#ffffff',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* List header */}
        <Box sx={{
          px: 2, py: 1.2,
          borderBottom: `1px solid ${borderColor}`,
          bgcolor: isDark ? '#010409' : '#f6f8fa',
        }}>
          <Typography sx={{
            fontSize: '13px', fontWeight: 600,
            color: theme.palette.text.primary,
          }}>
            {activeTab === 'prs' ? `${filteredPRs.length} Pull Requests`
              : activeTab === 'issues' ? `${filteredIssues.length} Issues`
              : `${filteredNotifications.length} Notifications`}
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          {activeTab === 'prs' && (
            <ItemList items={filteredPRs} onSelect={handleSelectItem} selectedId={selectedItem?.id || null} />
          )}
          {activeTab === 'issues' && (
            <ItemList items={filteredIssues} onSelect={handleSelectItem} selectedId={selectedItem?.id || null} />
          )}
          {activeTab === 'notifications' && (
            <NotificationList
              notifications={filteredNotifications}
              onSelect={handleSelectNotification}
              selectedId={selectedNotification?.id || null}
            />
          )}
        </Box>
      </Box>

      {/* Detail pane */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', bgcolor: isDark ? '#0d1117' : '#ffffff' }}>
        {selectedItem ? (
          <DetailView item={selectedItem} />
        ) : (
          <EmptyDetail />
        )}
      </Box>
    </Box>
  );
}
