import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import type { UserItem } from '../../shared/types';
import { PROVIDER_LABELS } from '../../shared/provider-types';

interface Props {
  items: UserItem[];
  onSelect: (item: UserItem) => void;
  selectedId: number | null;
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

// GitHub-style PR/Issue icon as SVG
function PrIcon({ state, merged }: { state: string; merged?: boolean }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  if (merged) {
    const color = isDark ? '#bc8cff' : '#8250df';
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill={color}>
        <path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8-8a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM4.25 4a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
      </svg>
    );
  }
  if (state === 'closed') {
    const color = isDark ? '#f85149' : '#cf222e';
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill={color}>
        <path d="M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.251 2.251 0 0 1 3.25 1Zm9.5 5.5a.75.75 0 0 1 .75.75v3.378a2.251 2.251 0 1 1-1.5 0V7.25a.75.75 0 0 1 .75-.75Zm-2.03-5.273a.75.75 0 0 1 1.06 0l2 2a.75.75 0 0 1-1.06 1.06L12 3.56v1.19a.75.75 0 0 1-1.5 0V3.56l-.72.727a.75.75 0 1 1-1.06-1.06l2-2Z" />
      </svg>
    );
  }
  // open
  const color = isDark ? '#3fb950' : '#1a7f37';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={color}>
      <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
    </svg>
  );
}

function IssueIcon({ state }: { state: string }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  if (state === 'closed') {
    const color = isDark ? '#bc8cff' : '#8250df';
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill={color}>
        <path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.689 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5ZM16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z" />
      </svg>
    );
  }
  const color = isDark ? '#3fb950' : '#1a7f37';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={color}>
      <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
    </svg>
  );
}

function ChecksIndicator({ item }: { item: UserItem }) {
  if (!item.checks || item.checks.total === 0) return null;
  const { passed, failed, pending, total } = item.checks;
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (failed > 0) {
    return (
      <Tooltip title={`${failed}/${total} checks failed`}>
        <CancelIcon sx={{ fontSize: 14, color: isDark ? '#f85149' : '#cf222e' }} />
      </Tooltip>
    );
  }
  if (pending > 0) {
    return (
      <Tooltip title={`${pending}/${total} checks pending`}>
        <HourglassTopIcon sx={{ fontSize: 14, color: isDark ? '#d29922' : '#bf8700' }} />
      </Tooltip>
    );
  }
  return (
    <Tooltip title={`All ${total} checks passed`}>
      <CheckCircleIcon sx={{ fontSize: 14, color: isDark ? '#3fb950' : '#1a7f37' }} />
    </Tooltip>
  );
}

export default function ItemList({ items, onSelect, selectedId }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const borderColor = theme.palette.divider;
  const hoverBg = isDark ? '#161b22' : '#f6f8fa';
  const selectedBg = isDark ? '#1c2128' : '#f0f3f6';

  if (items.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography sx={{ color: theme.palette.text.secondary, fontSize: '13px' }}>No items found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ overflow: 'auto', height: '100%' }}>
      {items.map((item) => {
        const isSelected = selectedId === item.id;
        return (
          <Box
            key={`${item.repository.full_name}#${item.number}`}
            onClick={() => onSelect(item)}
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
            {/* Icon */}
            <Box sx={{ pt: 0.3, flexShrink: 0, display: 'flex' }}>
              {item.type === 'pr'
                ? <PrIcon state={item.state} merged={item.merged} />
                : <IssueIcon state={item.state} />
              }
            </Box>

            {/* Content */}
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
                <Typography noWrap sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  flexGrow: 1,
                  lineHeight: 1.3,
                  '&:hover': { color: isDark ? '#58a6ff' : '#0969da' },
                }}>
                  {item.title}
                </Typography>
                <ChecksIndicator item={item} />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                {item.provider && item.provider !== 'github' && (
                  <Box sx={{
                    fontSize: '9px', fontWeight: 700,
                    color: '#fff',
                    bgcolor: PROVIDER_LABELS[item.provider]?.color || '#666',
                    px: 0.5, py: 0, borderRadius: '3px',
                    lineHeight: 1.5, textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}>
                    {PROVIDER_LABELS[item.provider]?.label.slice(0, 2) || item.provider.slice(0, 2)}
                  </Box>
                )}
                <Typography sx={{ fontSize: '11px', color: theme.palette.text.secondary }}>
                  {item.repository.name}#{item.number}
                </Typography>

                {item.draft && (
                  <Box sx={{
                    fontSize: '10px', fontWeight: 500,
                    color: isDark ? '#8b949e' : '#656d76',
                    bgcolor: isDark ? '#21262d' : '#eaeef2',
                    px: 0.6, py: 0.1, borderRadius: '4px',
                    lineHeight: 1.4,
                  }}>
                    Draft
                  </Box>
                )}

                {item.labels?.slice(0, 3).map(l => (
                  <Box key={l.name} sx={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: `#${l.color}`,
                    bgcolor: `#${l.color}18`,
                    border: `1px solid #${l.color}40`,
                    px: 0.5, py: 0, borderRadius: '10px',
                    lineHeight: 1.5,
                    whiteSpace: 'nowrap',
                  }}>
                    {l.name}
                  </Box>
                ))}

                <Typography sx={{ fontSize: '11px', color: theme.palette.text.secondary, ml: 'auto', whiteSpace: 'nowrap' }}>
                  {timeAgo(item.updated_at)}
                </Typography>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
