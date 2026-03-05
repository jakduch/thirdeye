import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, Switch, FormControlLabel,
  Select, MenuItem, InputLabel, FormControl, Alert,
  IconButton, Tooltip, CircularProgress, LinearProgress, Collapse,
  Link,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { api } from '../api/ipc-client';
import type { AppSettings } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/types';
import type { Account, ProviderType } from '../../shared/provider-types';
import { PROVIDER_LABELS } from '../../shared/provider-types';

const LIBRARIES = [
  { name: 'Electron', license: 'MIT', authors: 'OpenJS Foundation', url: 'https://www.electronjs.org/' },
  { name: 'React', license: 'MIT', authors: 'Meta Platforms, Inc.', url: 'https://react.dev/' },
  { name: 'TypeScript', license: 'Apache-2.0', authors: 'Microsoft Corporation', url: 'https://www.typescriptlang.org/' },
  { name: '@octokit/rest', license: 'MIT', authors: 'Octokit contributors', url: 'https://github.com/octokit/rest.js' },
  { name: 'electron-updater', license: 'MIT', authors: 'electron-userland', url: 'https://www.electron.build/auto-update' },
  { name: 'Redux Toolkit', license: 'MIT', authors: 'Mark Erikson & Redux team', url: 'https://redux-toolkit.js.org/' },
  { name: 'Material UI', license: 'MIT', authors: 'MUI contributors', url: 'https://mui.com/' },
  { name: 'electron-store', license: 'MIT', authors: 'Sindre Sorhus', url: 'https://github.com/sindresorhus/electron-store' },
  { name: 'electron-builder', license: 'MIT', authors: 'electron-userland', url: 'https://www.electron.build/' },
  { name: 'react-markdown', license: 'MIT', authors: 'Titus Wormer & unified', url: 'https://github.com/remarkjs/react-markdown' },
  { name: 'remark-gfm', license: 'MIT', authors: 'Titus Wormer & unified', url: 'https://github.com/remarkjs/remark-gfm' },
  { name: 'React Router', license: 'MIT', authors: 'Remix Software, Inc.', url: 'https://reactrouter.com/' },
  { name: 'React Redux', license: 'MIT', authors: 'Dan Abramov & Redux team', url: 'https://react-redux.js.org/' },
  { name: 'Emotion', license: 'MIT', authors: 'Emotion team', url: 'https://emotion.sh/' },
  { name: 'webpack', license: 'MIT', authors: 'JS Foundation & webpack', url: 'https://webpack.js.org/' },
];

// SVG icons for provider selector
function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
function GitLabIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 380 380" fill="currentColor">
      <path d="M282.83 170.73l-.27-.69-26.14-68.22a6.81 6.81 0 00-2.69-3.24 7 7 0 00-8 .43 7 7 0 00-2.32 3.52l-17.65 54h-71.47l-17.65-54a6.86 6.86 0 00-2.32-3.53 7 7 0 00-8-.43 6.87 6.87 0 00-2.69 3.24L97.44 170l-.26.69a48.54 48.54 0 0016.1 56.07l.09.07.24.17 39.82 29.82 19.7 14.91 12 9.06a8.07 8.07 0 009.76 0l12-9.06 19.7-14.91 40.06-30 .1-.08a48.56 48.56 0 0016.08-56.04z" />
    </svg>
  );
}
function BitbucketIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor">
      <path d="M22.2 32A16 16 0 006.2 52.5l62.1 372.5c2 13.5 13.5 23.5 27.2 23.5h323c10.1 0 18.7-7.2 20.4-17l62.1-379A16 16 0 00485 32H22.2zm238.8 316h-82.7l-22.2-116.5h131.4L261 348z" />
    </svg>
  );
}

const PROVIDER_CONFIG: Record<ProviderType, {
  icon: React.ReactNode;
  tokenLabel: string;
  tokenPlaceholder: string;
  tokenHelpText: React.ReactNode;
  tokenHelpUrl: string;
  needsUsername?: boolean;
  needsInstanceUrl?: boolean;
}> = {
  github: {
    icon: <GitHubIcon />,
    tokenLabel: 'Personal Access Token',
    tokenPlaceholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
    tokenHelpUrl: 'https://github.com/settings/tokens/new?scopes=notifications,repo',
    tokenHelpText: <>Create a token with <strong>notifications</strong> and <strong>repo</strong> scopes.</>,
  },
  gitlab: {
    icon: <GitLabIcon />,
    tokenLabel: 'Personal Access Token',
    tokenPlaceholder: 'glpat-xxxxxxxxxxxxxxxxxxxx',
    tokenHelpUrl: 'https://gitlab.com/-/user_settings/personal_access_tokens',
    tokenHelpText: <>Create a token with <strong>api</strong> and <strong>read_user</strong> scopes.</>,
    needsInstanceUrl: true,
  },
  bitbucket: {
    icon: <BitbucketIcon />,
    tokenLabel: 'App Password',
    tokenPlaceholder: 'xxxxxxxxxxxxxxxxxxxx',
    tokenHelpUrl: 'https://bitbucket.org/account/settings/app-passwords/',
    tokenHelpText: <>Create an App Password with <strong>Repositories: Read</strong> and <strong>Pull requests: Read/Write</strong> permissions.</>,
    needsUsername: true,
  },
};

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [appVersion, setAppVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState<any>({ status: 'idle' });
  const [libsExpanded, setLibsExpanded] = useState(false);

  // Add account form state
  const [addingAccount, setAddingAccount] = useState(false);
  const [newProvider, setNewProvider] = useState<ProviderType | null>(null);
  const [newToken, setNewToken] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newInstanceUrl, setNewInstanceUrl] = useState('');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings);
    api.getAccounts().then(setAccounts);
    api.getAppVersion().then(setAppVersion);
    api.getUpdateStatus().then(setUpdateStatus);
    loadRepos();

    const unsub = api.onUpdateStatus((status: any) => setUpdateStatus(status));
    return () => { unsub(); };
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

  const resetAddForm = () => {
    setAddingAccount(false);
    setNewProvider(null);
    setNewToken('');
    setNewDisplayName('');
    setNewUsername('');
    setNewInstanceUrl('');
    setAddError('');
    setAddLoading(false);
  };

  const handleAddAccount = async () => {
    if (!newProvider || !newToken.trim()) {
      setAddError('Please fill in all required fields');
      return;
    }
    if (newProvider === 'bitbucket' && !newUsername.trim()) {
      setAddError('Username is required for Bitbucket');
      return;
    }
    setAddLoading(true);
    setAddError('');
    try {
      const account: Account = {
        id: generateId(),
        provider: newProvider,
        displayName: newDisplayName.trim() || PROVIDER_LABELS[newProvider].label,
        token: newToken.trim(),
        username: newUsername.trim() || undefined,
        instanceUrl: newInstanceUrl.trim() || undefined,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      await api.addAccount(account);
      const updated = await api.getAccounts();
      setAccounts(updated);
      resetAddForm();
    } catch (err: any) {
      setAddError(err.message || 'Failed to add account');
    } finally {
      setAddLoading(false);
    }
  };

  const addFormInputSx = {
    mb: 1.5,
    '& .MuiOutlinedInput-root': {
      borderRadius: '6px', fontSize: '13px',
      bgcolor: isDark ? '#0d1117' : '#f6f8fa',
      '& fieldset': { borderColor },
      '&:hover fieldset': { borderColor: isDark ? '#58a6ff' : '#0969da' },
      '&.Mui-focused fieldset': { borderColor: isDark ? '#58a6ff' : '#0969da', borderWidth: 1 },
    },
    '& .MuiInputLabel-root': { fontSize: '13px' },
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

        {/* Accounts */}
        <SectionCard title="Connected Accounts">
          {accounts.length === 0 && !addingAccount ? (
            <Typography sx={{ fontSize: '13px', color: theme.palette.text.secondary, mb: 1.5 }}>
              No accounts connected yet.
            </Typography>
          ) : accounts.length > 0 && (
            <Box sx={{
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              overflow: 'hidden',
              mb: addingAccount ? 2 : 0,
            }}>
              {accounts.map((acct, idx) => {
                const providerInfo = PROVIDER_LABELS[acct.provider] || { label: acct.provider, color: '#666' };
                const hoverBg = isDark ? '#161b22' : '#f6f8fa';
                return (
                  <Box key={acct.id} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    px: 2, py: 1,
                    borderBottom: idx < accounts.length - 1 ? `1px solid ${borderColor}` : 'none',
                    '&:hover': { bgcolor: hoverBg },
                    transition: 'background-color 0.1s',
                    opacity: acct.enabled ? 1 : 0.5,
                  }}>
                    {/* Provider badge */}
                    <Box sx={{
                      fontSize: '10px', fontWeight: 700,
                      color: '#fff',
                      bgcolor: providerInfo.color,
                      px: 0.8, py: 0.2, borderRadius: '4px',
                      lineHeight: 1.4, textTransform: 'uppercase',
                      minWidth: 28, textAlign: 'center',
                    }}>
                      {providerInfo.label.slice(0, 2)}
                    </Box>
                    {/* Account info */}
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '13px', fontWeight: 500 }}>{acct.displayName}</Typography>
                      {acct.username && (
                        <Typography sx={{ fontSize: '11px', color: theme.palette.text.secondary }}>@{acct.username}</Typography>
                      )}
                      {acct.instanceUrl && (
                        <Typography noWrap sx={{ fontSize: '10px', color: theme.palette.text.secondary }}>{acct.instanceUrl}</Typography>
                      )}
                    </Box>
                    {/* Enable toggle */}
                    <Tooltip title={acct.enabled ? 'Disable' : 'Enable'}>
                      <Switch
                        size="small"
                        checked={acct.enabled}
                        onChange={async () => {
                          const updated = await api.updateAccount(acct.id, { enabled: !acct.enabled });
                          setAccounts(updated);
                        }}
                      />
                    </Tooltip>
                    {/* Delete */}
                    <Tooltip title="Remove account">
                      <IconButton
                        size="small"
                        onClick={async () => {
                          const updated = await api.removeAccount(acct.id);
                          setAccounts(updated);
                          if (updated.length === 0) onLogout();
                        }}
                        sx={{ width: 28, height: 28 }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 16, color: isDark ? '#f85149' : '#cf222e' }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                );
              })}
            </Box>
          )}

          {/* Add Account inline form */}
          <Collapse in={addingAccount}>
            <Box sx={{
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              p: 2,
              bgcolor: isDark ? '#0d1117' : '#f6f8fa',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
                  {newProvider ? `Connect ${PROVIDER_LABELS[newProvider].label}` : 'Choose a provider'}
                </Typography>
                <IconButton size="small" onClick={resetAddForm} sx={{ width: 24, height: 24 }}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>

              {/* Provider selector */}
              {!newProvider && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {(['github', 'gitlab', 'bitbucket'] as ProviderType[]).map(p => (
                    <Box
                      key={p}
                      onClick={() => setNewProvider(p)}
                      sx={{
                        flex: 1,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 0.5,
                        py: 1.5, px: 1,
                        border: `1px solid ${borderColor}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        bgcolor: cardBg,
                        color: isDark ? '#c9d1d9' : '#24292f',
                        transition: 'all 0.15s',
                        '&:hover': {
                          borderColor: PROVIDER_LABELS[p].color,
                          bgcolor: isDark ? '#21262d' : '#f6f8fa',
                        },
                      }}
                    >
                      <Box sx={{ color: PROVIDER_LABELS[p].color, display: 'flex' }}>
                        {PROVIDER_CONFIG[p].icon}
                      </Box>
                      <Typography sx={{ fontSize: '12px', fontWeight: 600 }}>
                        {PROVIDER_LABELS[p].label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Provider-specific form */}
              {newProvider && (() => {
                const config = PROVIDER_CONFIG[newProvider];
                return (
                  <Box>
                    {addError && <Alert severity="error" sx={{ mb: 1.5, fontSize: '12px', borderRadius: '6px', py: 0.2 }}>{addError}</Alert>}

                    <TextField
                      fullWidth label="Display Name" size="small"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      placeholder={`e.g. Work ${PROVIDER_LABELS[newProvider].label}`}
                      sx={addFormInputSx}
                    />

                    {config.needsInstanceUrl && (
                      <TextField
                        fullWidth label="Instance URL (optional)" size="small"
                        value={newInstanceUrl}
                        onChange={(e) => setNewInstanceUrl(e.target.value)}
                        placeholder="https://gitlab.example.com"
                        sx={addFormInputSx}
                      />
                    )}

                    {config.needsUsername && (
                      <TextField
                        fullWidth label="Username" size="small"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="your-username"
                        sx={addFormInputSx}
                      />
                    )}

                    <TextField
                      fullWidth
                      label={config.tokenLabel}
                      type="password"
                      value={newToken}
                      onChange={(e) => setNewToken(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                      placeholder={config.tokenPlaceholder}
                      size="small"
                      sx={addFormInputSx}
                    />

                    <Typography sx={{ fontSize: '11px', color: theme.palette.text.secondary, mb: 1.5, lineHeight: 1.5 }}>
                      {config.tokenHelpText}{' '}
                      <Link
                        href="#"
                        onClick={(e: React.MouseEvent) => {
                          e.preventDefault();
                          api.openExternal(config.tokenHelpUrl);
                        }}
                        sx={{
                          color: isDark ? '#58a6ff' : '#0969da',
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        Create token
                      </Link>
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleAddAccount}
                        disabled={addLoading || !newToken.trim()}
                        sx={{
                          bgcolor: isDark ? '#238636' : '#1a7f37',
                          color: '#fff', fontSize: '12px', fontWeight: 600,
                          borderRadius: '6px', textTransform: 'none', px: 2,
                          '&:hover': { bgcolor: isDark ? '#2ea043' : '#15692e' },
                        }}
                      >
                        {addLoading ? 'Connecting…' : 'Connect'}
                      </Button>
                      <Button
                        size="small"
                        onClick={() => { setNewProvider(null); setAddError(''); }}
                        sx={{
                          fontSize: '12px', textTransform: 'none',
                          color: theme.palette.text.secondary,
                        }}
                      >
                        Change provider
                      </Button>
                    </Box>
                  </Box>
                );
              })()}
            </Box>
          </Collapse>

          {/* Add Account button */}
          {!addingAccount && (
            <Button
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={() => setAddingAccount(true)}
              sx={{
                mt: accounts.length > 0 ? 1.5 : 0,
                fontSize: '12px', fontWeight: 500,
                borderRadius: '6px', textTransform: 'none',
                color: isDark ? '#58a6ff' : '#0969da',
                '&:hover': { bgcolor: isDark ? 'rgba(56,139,253,0.1)' : 'rgba(9,105,218,0.08)' },
              }}
            >
              Add account
            </Button>
          )}
        </SectionCard>

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

        {/* About */}
        <SectionCard title="About">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: '10px',
              bgcolor: isDark ? '#238636' : '#1a7f37',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', fontWeight: 700, color: '#fff',
              fontFamily: '"SF Mono", SFMono-Regular, Consolas, monospace',
            }}>T</Box>
            <Box>
              <Typography sx={{ fontSize: '16px', fontWeight: 600 }}>ThirdEye</Typography>
              <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary }}>
                Version {appVersion || '…'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Link
              component="button"
              onClick={() => api.openExternal('https://github.com/jakduch/thirdeye')}
              sx={{
                fontSize: '12px', display: 'flex', alignItems: 'center', gap: 0.3,
                color: isDark ? '#58a6ff' : '#0969da',
                textDecorationColor: 'transparent',
                '&:hover': { textDecorationColor: 'currentColor' },
              }}
            >
              GitHub <OpenInNewIcon sx={{ fontSize: 11 }} />
            </Link>
            <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary }}>
              License: BSD-3-Clause
            </Typography>
          </Box>
        </SectionCard>

        {/* Updates */}
        <SectionCard title="Updates">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
            <Button
              variant="outlined"
              size="small"
              disabled={updateStatus.status === 'checking' || updateStatus.status === 'downloading'}
              onClick={() => api.checkForUpdates()}
              sx={{
                fontSize: '12px', fontWeight: 500,
                borderRadius: '6px', textTransform: 'none',
                borderColor: borderColor,
                '&:hover': { bgcolor: isDark ? '#21262d' : '#f3f4f6' },
              }}
            >
              {updateStatus.status === 'checking' ? 'Checking…' : 'Check for updates'}
            </Button>
            <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary }}>
              {updateStatus.status === 'idle' && 'Click to check for a newer version.'}
              {updateStatus.status === 'checking' && ''}
              {updateStatus.status === 'not-available' && 'You are running the latest version.'}
              {updateStatus.status === 'error' && `Error: ${updateStatus.error || 'Unknown'}`}
            </Typography>
          </Box>

          {/* Update available */}
          {updateStatus.status === 'available' && updateStatus.info && (
            <Alert
              severity="info"
              sx={{ mb: 1.5, borderRadius: '6px', fontSize: '12px', py: 0.3 }}
              action={
                <Button
                  size="small"
                  onClick={() => api.downloadUpdate()}
                  sx={{ fontSize: '12px', fontWeight: 600, textTransform: 'none' }}
                >
                  Download
                </Button>
              }
            >
              <strong>v{updateStatus.info.version}</strong> is available!
            </Alert>
          )}

          {/* Downloading */}
          {updateStatus.status === 'downloading' && (
            <Box sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary }}>
                  Downloading v{updateStatus.info?.version || ''}…
                </Typography>
                {updateStatus.progress && (
                  <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary }}>
                    {Math.round(updateStatus.progress.percent)}%
                  </Typography>
                )}
              </Box>
              <LinearProgress
                variant={updateStatus.progress ? 'determinate' : 'indeterminate'}
                value={updateStatus.progress?.percent || 0}
                sx={{ borderRadius: '4px', height: 4 }}
              />
            </Box>
          )}

          {/* Downloaded — native updater: restart to install */}
          {updateStatus.status === 'downloaded' && (
            <Alert
              severity="success"
              sx={{ mb: 1.5, borderRadius: '6px', fontSize: '12px', py: 0.3 }}
              action={
                <Button
                  size="small"
                  onClick={() => api.quitAndInstall()}
                  sx={{ fontSize: '12px', fontWeight: 600, textTransform: 'none' }}
                >
                  Restart &amp; install
                </Button>
              }
            >
              Update downloaded. Restart to install.
            </Alert>
          )}

          {/* Downloaded — fallback: installer saved to Downloads */}
          {updateStatus.status === 'downloaded-manual' && (
            <Alert
              severity="success"
              sx={{ mb: 1.5, borderRadius: '6px', fontSize: '12px', py: 0.3 }}
              action={
                <Button
                  size="small"
                  onClick={() => api.quitAndInstall()}
                  sx={{ fontSize: '12px', fontWeight: 600, textTransform: 'none' }}
                >
                  Open installer
                </Button>
              }
            >
              <strong>v{updateStatus.info?.version}</strong> saved to Downloads.
              {' '}Run the installer to update.
            </Alert>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={settings.autoUpdate}
                onChange={(e) => setSettings(s => ({ ...s, autoUpdate: e.target.checked }))}
                size="small"
              />
            }
            label={<Typography sx={{ fontSize: '13px' }}>Automatically check and download updates</Typography>}
          />
          <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary, ml: 4.5, mt: 0.3 }}>
            {updateStatus.nativeUpdater
              ? 'Updates install automatically when you restart the app.'
              : 'New versions will be downloaded to your Downloads folder.'}
          </Typography>
        </SectionCard>

        {/* Acknowledgements */}
        <SectionCard title="Acknowledgements">
          <Box
            onClick={() => setLibsExpanded(!libsExpanded)}
            sx={{
              display: 'flex', alignItems: 'center', cursor: 'pointer',
              gap: 0.5, userSelect: 'none', mb: libsExpanded ? 1.5 : 0,
            }}
          >
            {libsExpanded ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
            <Typography sx={{ fontSize: '13px', color: theme.palette.text.secondary }}>
              {libsExpanded ? 'Hide' : 'Show'} open-source libraries ({LIBRARIES.length})
            </Typography>
          </Box>
          <Collapse in={libsExpanded}>
            <Box sx={{
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              overflow: 'hidden',
              fontSize: '12px',
            }}>
              {/* Header */}
              <Box sx={{
                display: 'grid', gridTemplateColumns: '1fr 90px 1fr',
                px: 1.5, py: 0.8,
                bgcolor: isDark ? '#0d1117' : '#f6f8fa',
                borderBottom: `1px solid ${borderColor}`,
                fontWeight: 600, fontSize: '11px',
                color: theme.palette.text.secondary,
              }}>
                <span>Library</span>
                <span>License</span>
                <span>Author(s)</span>
              </Box>
              {LIBRARIES.map((lib, idx) => (
                <Box
                  key={lib.name}
                  sx={{
                    display: 'grid', gridTemplateColumns: '1fr 90px 1fr',
                    px: 1.5, py: 0.6,
                    borderBottom: idx < LIBRARIES.length - 1 ? `1px solid ${borderColor}` : 'none',
                    '&:hover': { bgcolor: isDark ? '#161b22' : '#f6f8fa' },
                    transition: 'background-color 0.1s',
                  }}
                >
                  <Link
                    component="button"
                    onClick={() => api.openExternal(lib.url)}
                    sx={{
                      fontSize: '12px', textAlign: 'left',
                      color: isDark ? '#58a6ff' : '#0969da',
                      textDecorationColor: 'transparent',
                      '&:hover': { textDecorationColor: 'currentColor' },
                    }}
                  >{lib.name}</Link>
                  <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary }}>{lib.license}</Typography>
                  <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary }} noWrap>{lib.authors}</Typography>
                </Box>
              ))}
            </Box>
          </Collapse>
        </SectionCard>

        {/* License */}
        <SectionCard title="License">
          <Typography sx={{ fontSize: '13px', lineHeight: 1.6, mb: 1 }}>
            ThirdEye is free and open-source software, licensed under the <strong>BSD-3-Clause</strong> license.
          </Typography>
          <Link
            component="button"
            onClick={() => api.openExternal('https://github.com/jakduch/thirdeye/blob/main/LICENSE')}
            sx={{
              fontSize: '12px', display: 'flex', alignItems: 'center', gap: 0.3,
              color: isDark ? '#58a6ff' : '#0969da',
              textDecorationColor: 'transparent',
              '&:hover': { textDecorationColor: 'currentColor' },
            }}
          >
            View full license <OpenInNewIcon sx={{ fontSize: 11 }} />
          </Link>
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
