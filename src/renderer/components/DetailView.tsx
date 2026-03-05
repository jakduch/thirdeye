import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Avatar, Button, TextField,
  CircularProgress, IconButton, Tooltip, Link,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import GitHubMarkdown from './GitHubMarkdown';
import { api } from '../api/ipc-client';
import type { UserItem, IssueDetail, PRDetail, Comment, CheckSuiteSummary } from '../../shared/types';

interface Props {
  item: UserItem;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function StateBadge({ state, merged, draft, isDark }: { state: string; merged?: boolean; draft?: boolean; isDark: boolean }) {
  let bg: string, color: string, label: string;
  if (merged) {
    bg = isDark ? '#8957e5' : '#8250df';
    color = '#fff';
    label = 'Merged';
  } else if (draft) {
    bg = isDark ? '#6e7681' : '#6e7781';
    color = '#fff';
    label = 'Draft';
  } else if (state === 'open') {
    bg = isDark ? '#238636' : '#1a7f37';
    color = '#fff';
    label = 'Open';
  } else {
    bg = isDark ? '#da3633' : '#cf222e';
    color = '#fff';
    label = 'Closed';
  }

  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      bgcolor: bg, color, borderRadius: '2em',
      px: 1.2, py: 0.3, fontSize: '12px', fontWeight: 600,
      lineHeight: 1.2,
    }}>
      {/* Mini icon */}
      {merged ? (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218Z" /></svg>
      ) : state === 'open' ? (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" /></svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.689 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z" /><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z" /></svg>
      )}
      {label}
    </Box>
  );
}

export default function DetailView({ item }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const borderColor = theme.palette.divider;
  const headerBg = isDark ? '#161b22' : '#f6f8fa';
  const bodyBg = isDark ? '#0d1117' : '#ffffff';
  const canvasBg = isDark ? '#010409' : '#f6f8fa';

  const [detail, setDetail] = useState<IssueDetail | PRDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [checks, setChecks] = useState<CheckSuiteSummary | null>(null);
  const [linked, setLinked] = useState<{
    linkedIssues: Array<{ number: number; title: string; state: string; html_url: string; repository: string }>;
    linkedPRs: Array<{ number: number; title: string; state: string; html_url: string; repository: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const { owner, name } = item.repository;

  useEffect(() => {
    setLoading(true);
    setDetail(null);
    setChecks(null);
    setLinked(null);
    setComments([]);
    const fetchData = async () => {
      try {
        const d = item.type === 'pr'
          ? await api.getPRDetail(owner, name, item.number)
          : await api.getIssueDetail(owner, name, item.number);
        setDetail(d);
        const [c, li] = await Promise.all([
          api.getComments(owner, name, item.number),
          api.getLinkedItems(owner, name, item.number),
        ]);
        setComments(c);
        setLinked(li);
        if (item.type === 'pr' && 'head' in d) {
          const ch = await api.getCheckRuns(owner, name, (d as PRDetail).head.sha);
          setChecks(ch);
        }
      } catch (err) {
        console.error('Failed to load detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [item.id, item.number]);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const nc = await api.postComment(owner, name, item.number, replyText.trim());
      setComments(prev => [...prev, nc]);
      setReplyText('');
    } catch (err) { console.error('Failed to post comment:', err); }
    finally { setSending(false); }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 1 }}>
        <CircularProgress size={24} sx={{ color: isDark ? '#58a6ff' : '#0969da' }} />
        <Typography sx={{ fontSize: '13px', color: theme.palette.text.secondary }}>Loading...</Typography>
      </Box>
    );
  }
  if (!detail) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography sx={{ color: theme.palette.text.secondary }}>Could not load details</Typography>
      </Box>
    );
  }

  const prDetail = item.type === 'pr' ? detail as PRDetail : null;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: bodyBg }}>
      {/* ── Title header ── */}
      <Box sx={{
        px: 3, pt: 2.5, pb: 2,
        borderBottom: `1px solid ${borderColor}`,
        bgcolor: bodyBg,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{
              fontWeight: 600, fontSize: '20px', lineHeight: 1.3,
              color: theme.palette.text.primary,
            }}>
              {detail.title}
              <Typography component="span" sx={{
                ml: 1, color: theme.palette.text.secondary,
                fontWeight: 300, fontSize: '20px',
              }}>
                #{detail.number}
              </Typography>
            </Typography>
          </Box>
          <Tooltip title="Open on GitHub">
            <IconButton
              size="small"
              onClick={() => api.openExternal(detail.html_url)}
              sx={{
                border: `1px solid ${borderColor}`,
                borderRadius: '6px',
                width: 32, height: 32,
                '&:hover': { bgcolor: isDark ? '#21262d' : '#f3f4f6' },
              }}
            >
              <OpenInNewIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <StateBadge state={detail.state} merged={item.merged} draft={prDetail?.draft} isDark={isDark} />

          <Typography sx={{ fontSize: '13px', color: theme.palette.text.secondary }}>
            <Typography component="span" sx={{ fontWeight: 600, color: theme.palette.text.primary, fontSize: '13px' }}>
              {detail.user.login}
            </Typography>
            {' '}opened {timeAgo(detail.created_at)}
          </Typography>

          {detail.labels.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.4, ml: 0.5, flexWrap: 'wrap' }}>
              {detail.labels.map(l => (
                <Box key={l.name} sx={{
                  fontSize: '11px', fontWeight: 600,
                  color: `#${l.color}`,
                  bgcolor: `#${l.color}18`,
                  border: `1px solid #${l.color}40`,
                  px: 0.7, py: 0.1, borderRadius: '2em',
                  lineHeight: 1.5,
                }}>
                  {l.name}
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {prDetail && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
              bgcolor: isDark ? '#1c2128' : '#eff2f5',
              border: `1px solid ${borderColor}`,
              borderRadius: '6px', px: 1, py: 0.3,
            }}>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '12px', color: isDark ? '#58a6ff' : '#0969da' }}>
                {prDetail.base.ref}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary, mx: 0.3 }}>
                ←
              </Typography>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '12px', color: isDark ? '#58a6ff' : '#0969da' }}>
                {prDetail.head.ref}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center' }}>
              <Typography sx={{ fontSize: '12px', color: isDark ? '#3fb950' : '#1a7f37', fontWeight: 600 }}>
                +{prDetail.additions}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: isDark ? '#f85149' : '#cf222e', fontWeight: 600 }}>
                −{prDetail.deletions}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary }}>
                {prDetail.changed_files} file{prDetail.changed_files !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* ── Scrollable content ── */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', bgcolor: canvasBg }}>
        <Box sx={{ maxWidth: 920, mx: 'auto', p: 2.5 }}>

          {/* ── Check Runs ── */}
          {checks && checks.total > 0 && (
            <Box sx={{
              border: `1px solid ${borderColor}`,
              borderRadius: '6px', mb: 2, overflow: 'hidden',
              bgcolor: bodyBg,
            }}>
              <Box sx={{
                bgcolor: headerBg, px: 2, py: 1,
                borderBottom: `1px solid ${borderColor}`,
                display: 'flex', alignItems: 'center', gap: 1,
              }}>
                {checks.failed > 0
                  ? <CancelIcon sx={{ fontSize: 16, color: isDark ? '#f85149' : '#cf222e' }} />
                  : checks.pending > 0
                    ? <HourglassTopIcon sx={{ fontSize: 16, color: isDark ? '#d29922' : '#bf8700' }} />
                    : <CheckCircleIcon sx={{ fontSize: 16, color: isDark ? '#3fb950' : '#1a7f37' }} />}
                <Typography sx={{ fontWeight: 600, fontSize: '13px' }}>
                  {checks.failed > 0
                    ? `${checks.failed} failing`
                    : checks.pending > 0
                      ? `${checks.pending} pending`
                      : 'All checks passed'}
                </Typography>
                <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary }}>
                  ({checks.passed} / {checks.total})
                </Typography>
              </Box>
              {checks.runs.map((run, idx) => (
                <Box key={run.id} sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  px: 2, py: 0.8,
                  borderBottom: idx < checks.runs.length - 1 ? `1px solid ${borderColor}` : 'none',
                  '&:hover': { bgcolor: isDark ? '#161b22' : '#f6f8fa' },
                }}>
                  {run.conclusion === 'success'
                    ? <CheckCircleIcon sx={{ fontSize: 14, color: isDark ? '#3fb950' : '#1a7f37' }} />
                    : run.conclusion === 'failure'
                      ? <CancelIcon sx={{ fontSize: 14, color: isDark ? '#f85149' : '#cf222e' }} />
                      : <HourglassTopIcon sx={{ fontSize: 14, color: isDark ? '#d29922' : '#bf8700' }} />}
                  <Link
                    component="button" variant="body2"
                    onClick={() => api.openExternal(run.html_url)}
                    sx={{
                      textAlign: 'left', fontSize: '13px',
                      color: isDark ? '#58a6ff' : '#0969da',
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {run.name}
                  </Link>
                  {run.app && (
                    <Typography sx={{ fontSize: '11px', color: theme.palette.text.secondary }}>
                      {run.app.name}
                    </Typography>
                  )}
                  <Box sx={{ flexGrow: 1 }} />
                  <Typography sx={{
                    fontSize: '12px', fontWeight: 500,
                    color: run.conclusion === 'failure'
                      ? (isDark ? '#f85149' : '#cf222e')
                      : run.conclusion === 'success'
                        ? (isDark ? '#3fb950' : '#1a7f37')
                        : (isDark ? '#d29922' : '#bf8700'),
                  }}>
                    {run.conclusion || run.status}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* ── Linked Items ── */}
          {linked && (linked.linkedIssues.length > 0 || linked.linkedPRs.length > 0) && (
            <Box sx={{
              border: `1px solid ${borderColor}`,
              borderRadius: '6px', mb: 2, overflow: 'hidden',
              bgcolor: bodyBg,
            }}>
              <Box sx={{
                bgcolor: headerBg, px: 2, py: 1,
                borderBottom: `1px solid ${borderColor}`,
                display: 'flex', alignItems: 'center', gap: 0.5,
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill={isDark ? '#8b949e' : '#656d76'}>
                  <path d="m7.775 3.275 1.25-1.25a3.5 3.5 0 1 1 4.95 4.95l-2.5 2.5a3.5 3.5 0 0 1-4.95 0 .751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018 1.998 1.998 0 0 0 2.83 0l2.5-2.5a2.002 2.002 0 0 0-2.83-2.83l-1.25 1.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042Zm-4.69 9.64a1.998 1.998 0 0 0 2.83 0l1.25-1.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042l-1.25 1.25a3.5 3.5 0 1 1-4.95-4.95l2.5-2.5a3.5 3.5 0 0 1 4.95 0 .751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018 1.998 1.998 0 0 0-2.83 0l-2.5 2.5a1.998 1.998 0 0 0 0 2.83Z" />
                </svg>
                <Typography sx={{ fontWeight: 600, fontSize: '13px' }}>Linked</Typography>
              </Box>
              {[
                ...linked.linkedIssues.map(i => ({ ...i, kind: 'Issue' as const })),
                ...linked.linkedPRs.map(p => ({ ...p, kind: 'PR' as const })),
              ].map((li, idx, arr) => (
                <Box key={`${li.kind}-${li.number}`} sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  px: 2, py: 0.8,
                  borderBottom: idx < arr.length - 1 ? `1px solid ${borderColor}` : 'none',
                  '&:hover': { bgcolor: isDark ? '#161b22' : '#f6f8fa' },
                }}>
                  {li.kind === 'PR' ? (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill={li.state === 'open' ? (isDark ? '#3fb950' : '#1a7f37') : (isDark ? '#bc8cff' : '#8250df')}>
                      <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill={li.state === 'open' ? (isDark ? '#3fb950' : '#1a7f37') : (isDark ? '#bc8cff' : '#8250df')}>
                      <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
                    </svg>
                  )}
                  <Link
                    component="button" variant="body2"
                    onClick={() => api.openExternal(li.html_url)}
                    sx={{
                      textAlign: 'left', fontSize: '13px',
                      color: isDark ? '#58a6ff' : '#0969da',
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {li.repository}#{li.number} {li.title}
                  </Link>
                </Box>
              ))}
            </Box>
          )}

          {/* ── Body (opening comment) ── */}
          {detail.body && (
            <CommentBox
              avatarUrl={detail.user.avatar_url}
              login={detail.user.login}
              date={detail.created_at}
              body={detail.body}
              isDark={isDark}
              borderColor={borderColor}
              headerBg={headerBg}
              bodyBg={bodyBg}
              theme={theme}
            />
          )}

          {/* ── Comments ── */}
          {comments.map(c => (
            <CommentBox
              key={c.id}
              avatarUrl={c.user.avatar_url}
              login={c.user.login}
              date={c.created_at}
              body={c.body}
              association={c.author_association}
              isDark={isDark}
              borderColor={borderColor}
              headerBg={headerBg}
              bodyBg={bodyBg}
              theme={theme}
            />
          ))}

          {/* ── Reply composer ── */}
          <Box sx={{
            border: `1px solid ${borderColor}`,
            borderRadius: '6px', overflow: 'hidden',
            bgcolor: bodyBg, mt: 0.5,
          }}>
            <Box sx={{
              bgcolor: headerBg, px: 2, py: 0.8,
              borderBottom: `1px solid ${borderColor}`,
            }}>
              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: theme.palette.text.secondary }}>
                Write a reply
              </Typography>
            </Box>
            <Box sx={{ p: 1.5 }}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                maxRows={10}
                size="small"
                placeholder="Leave a comment…"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReply(); }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    bgcolor: isDark ? '#0d1117' : '#ffffff',
                    '& fieldset': { borderColor },
                    '&:hover fieldset': { borderColor: isDark ? '#58a6ff' : '#0969da' },
                    '&.Mui-focused fieldset': { borderColor: isDark ? '#58a6ff' : '#0969da', borderWidth: 1 },
                  },
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, gap: 1, alignItems: 'center' }}>
                <Typography sx={{ fontSize: '11px', color: theme.palette.text.secondary }}>
                  Ctrl+Enter to send
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleReply}
                  disabled={sending || !replyText.trim()}
                  startIcon={sending ? <CircularProgress size={14} color="inherit" /> : <SendIcon sx={{ fontSize: '14px !important' }} />}
                  sx={{
                    bgcolor: isDark ? '#238636' : '#1a7f37',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                    px: 2,
                    borderRadius: '6px',
                    textTransform: 'none',
                    '&:hover': { bgcolor: isDark ? '#2ea043' : '#15692e' },
                    '&.Mui-disabled': { bgcolor: isDark ? '#21262d' : '#eaeef2', color: isDark ? '#484f58' : '#8c959f' },
                  }}
                >
                  Comment
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ── Comment box sub-component ──

interface CommentBoxProps {
  avatarUrl: string;
  login: string;
  date: string;
  body: string;
  association?: string;
  isDark: boolean;
  borderColor: string;
  headerBg: string;
  bodyBg: string;
  theme: any;
}

function CommentBox({ avatarUrl, login, date, body, association, isDark, borderColor, headerBg, bodyBg, theme }: CommentBoxProps) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
      {/* Avatar */}
      <Avatar
        src={avatarUrl}
        sx={{
          width: 32, height: 32, flexShrink: 0, mt: 0.2,
          border: `2px solid ${borderColor}`,
        }}
      />

      {/* Comment card */}
      <Box sx={{
        flexGrow: 1, minWidth: 0,
        border: `1px solid ${borderColor}`,
        borderRadius: '6px',
        overflow: 'hidden',
        position: 'relative',
        // Speech bubble arrow
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 11,
          left: -8,
          width: 0, height: 0,
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderRight: `8px solid ${borderColor}`,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 12,
          left: -6,
          width: 0, height: 0,
          borderTop: '7px solid transparent',
          borderBottom: '7px solid transparent',
          borderRight: `7px solid ${headerBg}`,
        },
      }}>
        <Box sx={{
          bgcolor: headerBg,
          px: 2, py: 0.8,
          borderBottom: `1px solid ${borderColor}`,
          display: 'flex', alignItems: 'center', gap: 0.5,
        }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: theme.palette.text.primary }}>
            {login}
          </Typography>
          {association && association !== 'NONE' && (
            <Box sx={{
              fontSize: '10px', fontWeight: 500,
              color: isDark ? '#8b949e' : '#656d76',
              border: `1px solid ${borderColor}`,
              borderRadius: '2em',
              px: 0.7, py: 0.1,
              textTransform: 'capitalize',
              lineHeight: 1.4,
            }}>
              {association.toLowerCase().replace('_', ' ')}
            </Box>
          )}
          <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary }}>
            commented {timeAgo(date)}
          </Typography>
        </Box>
        <Box sx={{ px: 2, py: 1.5, bgcolor: bodyBg }}>
          <GitHubMarkdown>{body}</GitHubMarkdown>
        </Box>
      </Box>
    </Box>
  );
}
