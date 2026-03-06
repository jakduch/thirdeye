import React from 'react';
import {
  Box, Typography, IconButton, Tooltip, Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import BugReportIcon from '@mui/icons-material/BugReport';
import NotificationsIcon from '@mui/icons-material/Notifications';
import type { GitHubNotification, UserItem, RateLimitInfo, SidebarTab } from '../../shared/types';

interface Props {
  notifications: GitHubNotification[];
  myPRs: UserItem[];
  myIssues: UserItem[];
  activeTab: SidebarTab;
  selectedRepo: string | null;
  onTabChange: (tab: SidebarTab) => void;
  onSelectRepo: (repo: string | null) => void;
  onRefresh: () => void;
  onMarkAllRead: () => void;
  onOpenSettings: () => void;
  rateLimits: RateLimitInfo[];
}

interface TabDef {
  key: SidebarTab;
  label: string;
  icon: React.ReactNode;
  count: number;
}

export default function Sidebar({
  notifications, myPRs, myIssues, activeTab, selectedRepo,
  onTabChange, onSelectRepo, onRefresh, onMarkAllRead, onOpenSettings, rateLimits,
}: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const borderColor = theme.palette.divider;
  const hoverBg = isDark ? 'rgba(177,186,196,0.12)' : 'rgba(208,215,222,0.32)';
  const activeBg = isDark ? 'rgba(177,186,196,0.2)' : 'rgba(208,215,222,0.48)';

  const items = activeTab === 'prs' ? myPRs : activeTab === 'issues' ? myIssues : [];
  const repoMap = new Map<string, { total: number; open: number }>();

  if (activeTab === 'notifications') {
    for (const n of notifications) {
      const key = n.repository.full_name;
      const entry = repoMap.get(key) || { total: 0, open: 0 };
      entry.total++;
      if (n.unread) entry.open++;
      repoMap.set(key, entry);
    }
  } else {
    for (const item of items) {
      const key = item.repository.full_name;
      const entry = repoMap.get(key) || { total: 0, open: 0 };
      entry.total++;
      if (item.state === 'open') entry.open++;
      repoMap.set(key, entry);
    }
  }

  const repos = Array.from(repoMap.entries()).sort((a, b) => b[1].open - a[1].open);
  const totalUnread = notifications.filter(n => n.unread).length;
  const openPRs = myPRs.filter(p => p.state === 'open').length;
  const openIssues = myIssues.filter(i => i.state === 'open').length;

  const tabs: TabDef[] = [
    { key: 'prs', label: 'Pull Requests', icon: <CallMergeIcon sx={{ fontSize: 16 }} />, count: openPRs },
    { key: 'issues', label: 'Issues', icon: <BugReportIcon sx={{ fontSize: 16 }} />, count: openIssues },
    { key: 'notifications', label: 'Notifications', icon: <NotificationsIcon sx={{ fontSize: 16 }} />, count: totalUnread },
  ];

  const CountBadge = ({ count, color }: { count: number; color: string }) => {
    if (count === 0) return null;
    return (
      <Box sx={{
        bgcolor: color,
        color: '#fff',
        fontSize: '11px',
        fontWeight: 600,
        lineHeight: 1,
        minWidth: 18,
        height: 18,
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 0.6,
      }}>
        {count > 99 ? '99+' : count}
      </Box>
    );
  };

  return (
    <Box sx={{
      width: 260,
      borderRight: `1px solid ${borderColor}`,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      bgcolor: isDark ? '#010409' : '#f6f8fa',
      userSelect: 'none',
    }}>
      {/* Header */}
      <Box sx={{
        px: 1.5, py: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        borderBottom: `1px solid ${borderColor}`,
      }}>
        <Box sx={{
          width: 24, height: 24, borderRadius: '6px',
          bgcolor: isDark ? '#58a6ff' : '#0969da',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          mr: 0.5,
        }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 12, lineHeight: 1 }}>R</Typography>
        </Box>
        <Typography sx={{
          fontWeight: 600, flexGrow: 1, fontSize: '14px',
          color: theme.palette.text.primary,
          letterSpacing: '-0.01em',
        }}>
          ThirdEye
        </Typography>
        <Tooltip title="Refresh now">
          <IconButton size="small" onClick={onRefresh} sx={{
            width: 28, height: 28,
            '&:hover': { bgcolor: hoverBg },
          }}>
            <RefreshIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Mark all read">
          <IconButton size="small" onClick={onMarkAllRead} sx={{
            width: 28, height: 28,
            '&:hover': { bgcolor: hoverBg },
          }}>
            <DoneAllIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Settings">
          <IconButton size="small" onClick={onOpenSettings} sx={{
            width: 28, height: 28,
            '&:hover': { bgcolor: hoverBg },
          }}>
            <SettingsIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Navigation tabs */}
      <Box sx={{ px: 1, pt: 1 }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          const badgeColor = tab.key === 'notifications'
            ? (isDark ? '#da3633' : '#cf222e')
            : (isDark ? '#1f6feb' : '#0969da');
          return (
            <Box
              key={tab.key}
              onClick={() => { onTabChange(tab.key); onSelectRepo(null); }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.8,
                borderRadius: '6px',
                cursor: 'pointer',
                mb: 0.3,
                bgcolor: isActive ? activeBg : 'transparent',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
                transition: 'background-color 0.1s',
                '&:hover': {
                  bgcolor: isActive ? activeBg : hoverBg,
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', opacity: isActive ? 1 : 0.7 }}>
                {tab.icon}
              </Box>
              <Typography sx={{
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                flexGrow: 1,
              }}>
                {tab.label}
              </Typography>
              <CountBadge count={tab.count} color={badgeColor} />
            </Box>
          );
        })}
      </Box>

      <Divider sx={{ my: 1, mx: 1.5 }} />

      {/* Repo filter */}
      <Box sx={{ px: 1.5, mb: 0.5 }}>
        <Typography sx={{ fontSize: '11px', fontWeight: 600, color: theme.palette.text.secondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Repositories
        </Typography>
      </Box>
      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 1 }}>
        <Box
          onClick={() => onSelectRepo(null)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            px: 1.5, py: 0.5, borderRadius: '6px', cursor: 'pointer', mb: 0.2,
            bgcolor: selectedRepo === null ? activeBg : 'transparent',
            '&:hover': { bgcolor: selectedRepo === null ? activeBg : hoverBg },
          }}
        >
          <Typography sx={{
            fontSize: '13px', flexGrow: 1,
            fontWeight: selectedRepo === null ? 600 : 400,
            color: theme.palette.text.primary,
          }}>
            All repositories
          </Typography>
          <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary }}>
            {activeTab === 'notifications' ? notifications.length : items.length}
          </Typography>
        </Box>
        {repos.map(([repoName, counts]) => {
          const isSelected = selectedRepo === repoName;
          const [org, name] = repoName.split('/');
          return (
            <Box
              key={repoName}
              onClick={() => onSelectRepo(repoName)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                px: 1.5, py: 0.5, borderRadius: '6px', cursor: 'pointer', mb: 0.2,
                bgcolor: isSelected ? activeBg : 'transparent',
                '&:hover': { bgcolor: isSelected ? activeBg : hoverBg },
              }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography noWrap sx={{
                  fontSize: '13px',
                  fontWeight: isSelected ? 600 : 400,
                  color: theme.palette.text.primary,
                }}>
                  {name}
                </Typography>
                <Typography noWrap sx={{ fontSize: '11px', color: theme.palette.text.secondary }}>
                  {org}
                </Typography>
              </Box>
              {counts.open > 0 && (
                <Typography sx={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: isDark ? '#58a6ff' : '#0969da',
                  bgcolor: isDark ? 'rgba(56,139,253,0.15)' : 'rgba(9,105,218,0.1)',
                  px: 0.8, py: 0.1, borderRadius: '10px', minWidth: 18, textAlign: 'center',
                }}>
                  {counts.open}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Rate limit footer — per-account breakdown */}
      {rateLimits.length > 0 && (
        <Box sx={{
          borderTop: `1px solid ${borderColor}`,
          px: 1.5, py: 0.8,
        }}>
          {rateLimits.map((r) => {
            const pct = r.limit > 0 ? (r.remaining / r.limit) * 100 : 0;
            const barColor = r.remaining < 100
              ? (isDark ? '#f85149' : '#cf222e')
              : r.remaining < 500
                ? (isDark ? '#d29922' : '#bf8700')
                : (isDark ? '#3fb950' : '#1a7f37');
            const resetDate = new Date(r.reset * 1000);
            const resetMin = Math.max(0, Math.round((resetDate.getTime() - Date.now()) / 60000));
            return (
              <Tooltip
                key={r.accountId}
                title={`${r.remaining}/${r.limit} — resets in ${resetMin}m`}
                placement="top"
              >
                <Box sx={{ mb: rateLimits.length > 1 ? 0.6 : 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.2 }}>
                    <Typography noWrap sx={{
                      fontSize: '10px', fontWeight: 500,
                      color: theme.palette.text.secondary,
                      maxWidth: 140,
                    }}>
                      {r.displayName || r.provider}
                    </Typography>
                    <Typography sx={{
                      fontSize: '10px',
                      color: theme.palette.text.secondary,
                      whiteSpace: 'nowrap',
                    }}>
                      {r.remaining}/{r.limit}
                    </Typography>
                  </Box>
                  <Box sx={{
                    width: '100%', height: 3, borderRadius: 2,
                    bgcolor: isDark ? '#21262d' : '#eaeef2',
                    overflow: 'hidden',
                  }}>
                    <Box sx={{
                      width: `${pct}%`, height: '100%', borderRadius: 2,
                      bgcolor: barColor,
                      transition: 'width 0.3s ease',
                    }} />
                  </Box>
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
