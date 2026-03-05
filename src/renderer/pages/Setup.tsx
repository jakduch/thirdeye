import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Link, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { api } from '../api/ipc-client';
import type { ProviderType, Account } from '../../shared/provider-types';
import { PROVIDER_LABELS } from '../../shared/provider-types';

interface Props {
  onComplete: () => void;
}

// SVG icons for each provider
function GitHubIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
function GitLabIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 380 380" fill="currentColor">
      <path d="M282.83 170.73l-.27-.69-26.14-68.22a6.81 6.81 0 00-2.69-3.24 7 7 0 00-8 .43 7 7 0 00-2.32 3.52l-17.65 54h-71.47l-17.65-54a6.86 6.86 0 00-2.32-3.53 7 7 0 00-8-.43 6.87 6.87 0 00-2.69 3.24L97.44 170l-.26.69a48.54 48.54 0 0016.1 56.07l.09.07.24.17 39.82 29.82 19.7 14.91 12 9.06a8.07 8.07 0 009.76 0l12-9.06 19.7-14.91 40.06-30 .1-.08a48.56 48.56 0 0016.08-56.04z" />
    </svg>
  );
}
function BitbucketIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 512 512" fill="currentColor">
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

export default function Setup({ onComplete }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const borderColor = theme.palette.divider;

  const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(null);
  const [token, setToken] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [instanceUrl, setInstanceUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const config = selectedProvider ? PROVIDER_CONFIG[selectedProvider] : null;

  const inputSx = {
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

  const handleSubmit = async () => {
    if (!selectedProvider || !token.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    if (selectedProvider === 'bitbucket' && !username.trim()) {
      setError('Username is required for Bitbucket');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const account: Account = {
        id: generateId(),
        provider: selectedProvider,
        displayName: displayName.trim() || PROVIDER_LABELS[selectedProvider].label,
        token: token.trim(),
        username: username.trim() || undefined,
        instanceUrl: instanceUrl.trim() || undefined,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      await api.addAccount(account);
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to add account');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedProvider(null);
    setToken('');
    setDisplayName('');
    setUsername('');
    setInstanceUrl('');
    setError('');
  };

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh',
      bgcolor: isDark ? '#0d1117' : '#f6f8fa',
    }}>
      <Box sx={{ maxWidth: 440, width: '100%', mx: 3 }}>
        {/* Logo area */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: '12px',
            bgcolor: isDark ? '#58a6ff' : '#0969da',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            mb: 2,
          }}>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '22px', lineHeight: 1 }}>T</Typography>
          </Box>
          <Typography sx={{
            fontWeight: 600, fontSize: '24px',
            color: theme.palette.text.primary,
            letterSpacing: '-0.02em',
          }}>
            Welcome to ThirdEye
          </Typography>
          <Typography sx={{
            fontSize: '14px',
            color: theme.palette.text.secondary,
            mt: 0.5,
          }}>
            Monitor PRs, Issues, and CI checks across GitHub, GitLab &amp; Bitbucket
          </Typography>
        </Box>

        {/* Provider selector */}
        {!selectedProvider && (
          <Box sx={{
            bgcolor: isDark ? '#161b22' : '#ffffff',
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            p: 3,
          }}>
            <Typography sx={{
              fontSize: '14px', fontWeight: 600,
              color: theme.palette.text.primary,
              mb: 2,
            }}>
              Choose a provider
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              {(['github', 'gitlab', 'bitbucket'] as ProviderType[]).map(p => (
                <Box
                  key={p}
                  onClick={() => setSelectedProvider(p)}
                  sx={{
                    flex: 1,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 1,
                    py: 2, px: 1,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: isDark ? '#c9d1d9' : '#24292f',
                    transition: 'all 0.15s',
                    '&:hover': {
                      borderColor: PROVIDER_LABELS[p].color,
                      bgcolor: isDark ? '#21262d' : '#f6f8fa',
                    },
                  }}
                >
                  {PROVIDER_CONFIG[p].icon}
                  <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
                    {PROVIDER_LABELS[p].label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Provider form */}
        {selectedProvider && config && (
          <Box sx={{
            bgcolor: isDark ? '#161b22' : '#ffffff',
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            p: 3,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box sx={{ color: PROVIDER_LABELS[selectedProvider].color, display: 'flex' }}>
                {config.icon}
              </Box>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, color: theme.palette.text.primary }}>
                Connect {PROVIDER_LABELS[selectedProvider].label}
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Link
                component="button"
                variant="body2"
                onClick={resetForm}
                sx={{
                  fontSize: '12px',
                  color: theme.palette.text.secondary,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Change provider
              </Link>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2, fontSize: '13px', borderRadius: '6px' }}>{error}</Alert>}

            <TextField
              fullWidth label="Display Name" size="small"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={`e.g. Work ${PROVIDER_LABELS[selectedProvider].label}`}
              sx={inputSx}
            />

            {config.needsInstanceUrl && (
              <TextField
                fullWidth label="Instance URL (optional)" size="small"
                value={instanceUrl}
                onChange={(e) => setInstanceUrl(e.target.value)}
                placeholder="https://gitlab.example.com"
                sx={inputSx}
              />
            )}

            {config.needsUsername && (
              <TextField
                fullWidth label="Username" size="small"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your-username"
                sx={inputSx}
              />
            )}

            <TextField
              fullWidth
              label={config.tokenLabel}
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={config.tokenPlaceholder}
              size="small"
              sx={inputSx}
            />

            <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary, mb: 2.5, lineHeight: 1.5 }}>
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

            <Button
              fullWidth variant="contained"
              onClick={handleSubmit}
              disabled={loading || !token.trim()}
              sx={{
                bgcolor: isDark ? '#238636' : '#1a7f37',
                color: '#fff', fontSize: '14px', fontWeight: 600,
                py: 1, borderRadius: '6px', textTransform: 'none',
                '&:hover': { bgcolor: isDark ? '#2ea043' : '#15692e' },
                '&.Mui-disabled': {
                  bgcolor: isDark ? '#21262d' : '#eaeef2',
                  color: isDark ? '#484f58' : '#8c959f',
                },
              }}
            >
              {loading ? 'Connecting…' : `Connect ${PROVIDER_LABELS[selectedProvider].label}`}
            </Button>
          </Box>
        )}

        <Typography sx={{
          textAlign: 'center', mt: 2,
          fontSize: '12px', color: theme.palette.text.secondary,
        }}>
          Your credentials are stored locally and never leave your machine
        </Typography>
      </Box>
    </Box>
  );
}
