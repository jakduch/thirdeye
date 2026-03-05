import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { GitHubNotification } from '../../shared/types';

interface Props {
  notifications: GitHubNotification[];
  onSelect: (notification: GitHubNotification) => void;
  selectedId: string | null;
}

function TypeIcon({ type, isDark }: { type: string; isDark: boolean }) {
  if (type === 'PullRequest') {
    const color = isDark ? '#3fb950' : '#1a7f37';
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill={color}>
        <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
      </svg>
    );
  }
  if (type === 'Issue') {
    const color = isDark ? '#3fb950' : '#1a7f37';
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill={color}>
        <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
      </svg>
    );
  }
  // Generic notification
  const color = isDark ? '#8b949e' : '#656d76';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={color}>
      <path d="M8 16a2 2 0 0 0 1.985-1.75c.017-.137-.097-.25-.235-.25h-3.5c-.138 0-.252.113-.235.25A2 2 0 0 0 8 16ZM3 5a5 5 0 0 1 10 0v2.947c0 .05.015.098.042.139l1.703 2.555A1.519 1.519 0 0 1 13.482 13H2.518a1.516 1.516 0 0 1-1.263-2.36l1.703-2.554A.255.255 0 0 0 3 7.947Zm5-3.5A3.5 3.5 0 0 0 4.5 5v2.947c0 .346-.102.683-.294.97l-1.703 2.556a.017.017 0 0 0-.003.01l.001.006c0 .002.002.004.004.006l.006.004.007.001h10.964l.007-.001.006-.004.004-.006.001-.007a.017.017 0 0 0-.003-.01l-1.703-2.554a1.745 1.745 0 0 1-.294-.97V5A3.5 3.5 0 0 0 8 1.5Z" />
    </svg>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

function reasonLabel(reason: string): string {
  const map: Record<string, string> = {
    assign: 'Assigned',
    author: 'Author',
    comment: 'Comment',
    ci_activity: 'CI',
    invitation: 'Invited',
    manual: 'Subscribed',
    mention: 'Mentioned',
    review_requested: 'Review requested',
    state_change: 'State changed',
    subscribed: 'Subscribed',
    team_mention: 'Team mentioned',
  };
  return map[reason] || reason;
}

export default function NotificationList({ notifications, onSelect, selectedId }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const borderColor = theme.palette.divider;
  const hoverBg = isDark ? '#161b22' : '#f6f8fa';
  const selectedBg = isDark ? '#1c2128' : '#f0f3f6';

  if (notifications.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 1 }}>
        <svg width="24" height="24" viewBox="0 0 16 16" fill={isDark ? '#30363d' : '#d0d7de'}>
          <path d="M8 16a2 2 0 0 0 1.985-1.75c.017-.137-.097-.25-.235-.25h-3.5c-.138 0-.252.113-.235.25A2 2 0 0 0 8 16ZM3 5a5 5 0 0 1 10 0v2.947c0 .05.015.098.042.139l1.703 2.555A1.519 1.519 0 0 1 13.482 13H2.518a1.516 1.516 0 0 1-1.263-2.36l1.703-2.554A.255.255 0 0 0 3 7.947Zm5-3.5A3.5 3.5 0 0 0 4.5 5v2.947c0 .346-.102.683-.294.97l-1.703 2.556a.017.017 0 0 0-.003.01l.001.006c0 .002.002.004.004.006l.006.004.007.001h10.964l.007-.001.006-.004.004-.006.001-.007a.017.017 0 0 0-.003-.01l-1.703-2.554a1.745 1.745 0 0 1-.294-.97V5A3.5 3.5 0 0 0 8 1.5Z" />
        </svg>
        <Typography sx={{ color: theme.palette.text.secondary, fontSize: '13px' }}>
          All caught up!
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ overflow: 'auto', height: '100%' }}>
      {notifications.map((n) => {
        const isSelected = selectedId === n.id;
        return (
          <Box
            key={n.id}
            onClick={() => onSelect(n)}
            sx={{
              display: 'flex',
              gap: 1,
              px: 2,
              py: 1.2,
              borderBottom: `1px solid ${borderColor}`,
              cursor: 'pointer',
              bgcolor: isSelected ? selectedBg : 'transparent',
              '&:hover': { bgcolor: isSelected ? selectedBg : hoverBg },
              transition: 'background-color 0.1s',
            }}
          >
            {/* Unread indicator dot */}
            <Box sx={{ pt: 0.6, width: 10, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
              {n.unread && (
                <Box sx={{
                  width: 8, height: 8, borderRadius: '50%',
                  bgcolor: isDark ? '#58a6ff' : '#0969da',
                }} />
              )}
            </Box>

            {/* Icon */}
            <Box sx={{ pt: 0.2, flexShrink: 0 }}>
              <TypeIcon type={n.subject.type} isDark={isDark} />
            </Box>

            {/* Content */}
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography noWrap sx={{
                fontSize: '13px',
                fontWeight: n.unread ? 600 : 400,
                color: theme.palette.text.primary,
                lineHeight: 1.3,
                mb: 0.3,
              }}>
                {n.subject.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ fontSize: '11px', color: theme.palette.text.secondary }}>
                  {n.repository.name}
                  {n.number ? ` #${n.number}` : ''}
                </Typography>
                <Box sx={{
                  fontSize: '10px',
                  color: isDark ? '#8b949e' : '#656d76',
                  bgcolor: isDark ? '#21262d' : '#eaeef2',
                  px: 0.5, py: 0.1, borderRadius: '4px',
                  lineHeight: 1.4,
                }}>
                  {reasonLabel(n.reason)}
                </Box>
                <Typography sx={{ fontSize: '11px', color: theme.palette.text.secondary, ml: 'auto', whiteSpace: 'nowrap' }}>
                  {timeAgo(n.updated_at)}
                </Typography>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
