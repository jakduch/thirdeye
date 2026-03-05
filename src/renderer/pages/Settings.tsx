import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, Switch, FormControlLabel,
  Select, MenuItem, InputLabel, FormControl, Alert,
  IconButton, Tooltip, CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { api } from '../api/ipc-client';
import type { AppSettings } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/types';

interface Props {
  onBack: () => void;
  onLogout: () => void;
  onSettingsChange?: (settings: AppSettings) => void;
}

interface RepoInfo {
  full_name: string;
  description: string | null;
}

export default function Settings({ onBack, onLogout, onSettingsChange }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const borderColor = theme.palette.divider;
  const cardBg = isDark ? '#161b22' : '#ffffff';

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [knownRepos, setKnownRepos] = useState<string[]>([]);

  useEffect(() => {
    api.getSettings().then(setSettings);
    loadRepos();
  }, []);

  const loadRepos = async () => {
    setLoadingRepos(true);
    try {
      const [watchedRepos, myPRs, myIssues] = await Promise.all([
        api.getRepos().catch(() => [] as RepoInfo[]),
        api.getMyPRs().catch(() => []),
        api.getMyIssues().catch(() => []),
      ]);
      setRepos(watchedRepos);
      const repoSet = new Set<string>();
      watchedRepos.forEach(r => repoSet.add(r.full_name));
      myPRs.forEach(p => repoSet.add(p.repository.full_name));
      myIssues.forEach(i => repoSet.add(i.repository.full_name));
      setKnownRepos(Array.from(repoSet).sort());
    } catch (err) {
      console.error('Failed to load repos:', err);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleSave = async () => {
    const updated = await api.updateSettings(settings);
    setSettings(updated);
    onSettingsChange?.(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
    await api.deleteToken();
    onLogout();
  };

  const isWatched = (repo: string) => settings.watchedRepos.includes(repo);
  const isIgnored = (repo: string) => settings.ignoredRepos.includes(repo);

  const toggleWatch = (repo: string) => {
    setSettings(s => ({
      ...s,
      watchedRepos: isWatched(repo) ? s.watchedRepos.filter(r => r !== repo) : [...s.watchedRepos, repo],
      ignoredRepos: isWatched(repo) ? s.ignoredRepos : s.ignoredRepos.filter(r => r !== repo),
    }));
  };

  const toggleIgnore = (repo: string) => {
    setSettings(s => ({
      ...s,
      ignoredRepos: isIgnored(repo) ? s.ignoredRepos.filter(r => r !== repo) : [...s.ignoredRepos, repo],
      watchedRepos: isIgnored(repo) ? s.watchedRepos : s.watchedRepos.filter(r => r !== repo),
    }));
  };

  const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Box sx={{
      bgcolor: cardBg,
      border: `1px solid ${borderColor}`,
      borderRadius: '12px',
      mb: 2,
      overflow: 'hidden',
    }}>
      <Box sx={{
        px: 2.5, py: 1.5,
        borderBottom: `1px solid ${borderColor}`,
        bgcolor: isDark ? '#0d1117' : '#f6f8fa',
      }}>
        <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>{title}</Typography>
      </Box>
      <Box sx={{ p: 2.5 }}>{children}</Box>
    </Box>
  );

  return (
    <Box sx={{
      height: '100vh', overflow: 'auto',
      bgcolor: isDark ? '#0d1117' : '#f6f8fa',
    }}>
      <Box sx={{ maxWidth: 680, mx: 'auto', p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <IconButton
            size="small"
            onClick={onBack}
            sx={{
              border: `1px solid ${borderColor}`,
              borderRadius: '6px',
              width: 32, height: 32,
              '&:hover': { bgcolor: isDark ? '#21262d' : '#f3f4f6' },
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <Typography sx={{ fontWeight: 600, fontSize: '20px', letterSpacing: '-0.01em' }}>
            Settings
          </Typography>
        </Box>

        {/* Polling */}
        <SectionCard title="Polling">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              label="Interval (seconds)"
              type="number"
              value={settings.pollInterval}
              onChange={(e) => setSettings(s => ({ ...s, pollInterval: Math.max(10, parseInt(e.target.value) || 60) }))}
              inputProps={{ min: 10 }}
              size="small"
              sx={{
                width: 160,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '6px', fontSize: '13px',
                  bgcolor: isDark ? '#0d1117' : '#f6f8fa',
                },
                '& .MuiInputLabel-root': { fontSize: '13px' },
              }}
            />
            <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary }}>
              Minimum: 10 seconds. Lower values use more API quota.
            </Typography>
          </Box>
        </SectionCard>

        {/* Repositories */}
        <SectionCard title="Repositories">
          <Typography sx={{ fontSize: '13px', color: theme.palette.text.secondary, mb: 2, lineHeight: 1.5 }}>
            Star repos to watch only those. Eye-off to hide repos you don't care about.
          </Typography>

          {settings.watchedRepos.length > 0 && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: '6px', fontSize: '12px', py: 0.3 }}>
              <strong>Watch mode:</strong> Only {settings.watchedRepos.length} selected repo(s) shown. Remove all stars to see everything.
            </Alert>
          )}

          {loadingRepos ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={20} /></Box>
          ) : (
            <Box sx={{
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              maxHeight: 320, overflow: 'auto',
            }}>
              {knownRepos.map((repo, idx) => {
                const watched = isWatched(repo);
                const ignored = isIgnored(repo);
                const repoInfo = repos.find(r => r.full_name === repo);
                const hoverBg = isDark ? '#161b22' : '#f6f8fa';
                return (
                  <Box key={repo} sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    px: 2, py: 0.8,
                    borderBottom: idx < knownRepos.length - 1 ? `1px solid ${borderColor}` : 'none',
                    opacity: ignored ? 0.45 : 1,
                    '&:hover': { bgcolor: hoverBg },
                    transition: 'background-color 0.1s, opacity 0.15s',
                  }}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '13px', fontWeight: 500 }}>
                          {repo.split('/')[1]}
                        </Typography>
                        <Typography sx={{ fontSize: '11px', color: theme.palette.text.secondary }}>
                          {repo.split('/')[0]}
                        </Typography>
                        {watched && (
                          <Box sx={{
                            fontSize: '10px', fontWeight: 600,
                            color: isDark ? '#58a6ff' : '#0969da',
                            bgcolor: isDark ? 'rgba(56,139,253,0.15)' : 'rgba(9,105,218,0.1)',
                            px: 0.5, borderRadius: '4px', lineHeight: 1.5,
                          }}>watched</Box>
                        )}
                        {ignored && (
                          <Box sx={{
                            fontSize: '10px', fontWeight: 500,
                            color: theme.palette.text.secondary,
                            bgcolor: isDark ? '#21262d' : '#eaeef2',
                            px: 0.5, borderRadius: '4px', lineHeight: 1.5,
                          }}>ignored</Box>
                        )}
                      </Box>
                      {repoInfo?.description && (
                        <Typography noWrap sx={{ fontSize: '11px', color: theme.palette.text.secondary }}>
                          {repoInfo.description}
                        </Typography>
                      )}
                    </Box>
                    <Tooltip title={watched ? 'Stop watching' : 'Watch only this'}>
                      <IconButton size="small" onClick={() => toggleWatch(repo)} sx={{ width: 28, height: 28 }}>
                        {watched
                          ? <StarIcon sx={{ fontSize: 16, color: isDark ? '#e3b341' : '#bf8700' }} />
                          : <StarBorderIcon sx={{ fontSize: 16 }} />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={ignored ? 'Stop ignoring' : 'Ignore'}>
                      <IconButton size="small" onClick={() => toggleIgnore(repo)} sx={{ width: 28, height: 28 }}>
                        {ignored
                          ? <VisibilityOffIcon sx={{ fontSize: 16, color: isDark ? '#f85149' : '#cf222e' }} />
                          : <VisibilityIcon sx={{ fontSize: 16 }} />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                );
              })}
              {knownRepos.length === 0 && (
                <Box sx={{ px: 2, py: 2, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '13px', color: theme.palette.text.secondary }}>
                    No repos found yet. They'll appear after first poll.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </SectionCard>

        {/* Display */}
        <SectionCard title="Display">
          <FormControlLabel
            control={
              <Switch
                checked={settings.showClosed}
                onChange={(e) => setSettings(s => ({ ...s, showClosed: e.target.checked }))}
                size="small"
              />
            }
            label={<Typography sx={{ fontSize: '13px' }}>Show closed &amp; merged PRs/Issues</Typography>}
          />
          <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary, ml: 4.5, mt: 0.3 }}>
            When off, only open items are shown in the lists
          </Typography>
        </SectionCard>

        {/* Notifications */}
        <SectionCard title="Desktop Notifications">
          <FormControlLabel
            control={
              <Switch
                checked={settings.showNotifications}
                onChange={(e) => setSettings(s => ({ ...s, showNotifications: e.target.checked }))}
                size="small"
              />
            }
            label={<Typography sx={{ fontSize: '13px' }}>Show system notifications for new activity</Typography>}
          />
          <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary, ml: 4.5, mt: 0.3 }}>
            Includes CI check pass/fail, new comments, state changes on your PRs
          </Typography>
        </SectionCard>

        {/* Startup */}
        <SectionCard title="Startup">
          <FormControlLabel
            control={
              <Switch
                checked={settings.launchAtStartup}
                onChange={(e) => setSettings(s => ({ ...s, launchAtStartup: e.target.checked }))}
                size="small"
              />
            }
            label={<Typography sx={{ fontSize: '13px' }}>Launch ThirdEye at system startup</Typography>}
          />
          <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary, ml: 4.5, mt: 0.3 }}>
            App starts minimized to system tray
          </Typography>
        </SectionCard>

        {/* Theme */}
        <SectionCard title="Appearance">
          <FormControl size="small" sx={{ width: 180 }}>
            <InputLabel sx={{ fontSize: '13px' }}>Theme</InputLabel>
            <Select
              value={settings.theme}
              label="Theme"
              onChange={(e) => {
                const newSettings = { ...settings, theme: e.target.value as AppSettings['theme'] };
                setSettings(newSettings);
                api.updateSettings({ theme: newSettings.theme }).then(updated => {
                  onSettingsChange?.(updated);
                });
              }}
              sx={{
                borderRadius: '6px', fontSize: '13px',
                bgcolor: isDark ? '#0d1117' : '#f6f8fa',
              }}
            >
              <MenuItem value="system">System</MenuItem>
              <MenuItem value="light">Light</MenuItem>
              <MenuItem value="dark">Dark</MenuItem>
            </Select>
          </FormControl>
        </SectionCard>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1.5, mt: 1, mb: 4 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              bgcolor: isDark ? '#238636' : '#1a7f37',
              color: '#fff', fontSize: '13px', fontWeight: 600,
              borderRadius: '6px', textTransform: 'none', px: 2.5,
              '&:hover': { bgcolor: isDark ? '#2ea043' : '#15692e' },
            }}
          >
            {saved ? 'Saved!' : 'Save settings'}
          </Button>
          <Button
            variant="outlined"
            onClick={handleLogout}
            sx={{
              fontSize: '13px', fontWeight: 500,
              borderRadius: '6px', textTransform: 'none',
              color: isDark ? '#f85149' : '#cf222e',
              borderColor: isDark ? '#f8514966' : '#cf222e66',
              '&:hover': {
                bgcolor: isDark ? 'rgba(248,81,73,0.1)' : 'rgba(207,34,46,0.08)',
                borderColor: isDark ? '#f85149' : '#cf222e',
              },
            }}
          >
            Disconnect & logout
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
