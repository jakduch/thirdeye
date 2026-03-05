import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Link, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { api } from '../api/ipc-client';

interface Props {
  onComplete: () => void;
}

export default function Setup({ onComplete }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const borderColor = theme.palette.divider;

  const handleSubmit = async () => {
    if (!token.trim()) {
      setError('Please enter your GitHub Personal Access Token');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.setToken(token.trim());
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to set token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh',
      bgcolor: isDark ? '#0d1117' : '#f6f8fa',
    }}>
      <Box sx={{
        maxWidth: 440, width: '100%', mx: 3,
      }}>
        {/* Logo area */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: '12px',
            bgcolor: isDark ? '#58a6ff' : '#0969da',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            mb: 2,
          }}>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '22px', lineHeight: 1 }}>R</Typography>
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
            Monitor your GitHub PRs, Issues, and CI checks
          </Typography>
        </Box>

        {/* Card */}
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
            Connect your GitHub account
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2, fontSize: '13px', borderRadius: '6px' }}>{error}</Alert>}

          <TextField
            fullWidth
            label="Personal Access Token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            size="small"
            sx={{
              mb: 1.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: '6px',
                fontSize: '13px',
                bgcolor: isDark ? '#0d1117' : '#f6f8fa',
                '& fieldset': { borderColor },
                '&:hover fieldset': { borderColor: isDark ? '#58a6ff' : '#0969da' },
                '&.Mui-focused fieldset': { borderColor: isDark ? '#58a6ff' : '#0969da', borderWidth: 1 },
              },
              '& .MuiInputLabel-root': { fontSize: '13px' },
            }}
          />

          <Typography sx={{ fontSize: '12px', color: theme.palette.text.secondary, mb: 2.5, lineHeight: 1.5 }}>
            Create a token at{' '}
            <Link
              href="#"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                api.openExternal('https://github.com/settings/tokens/new?scopes=notifications,repo');
              }}
              sx={{
                color: isDark ? '#58a6ff' : '#0969da',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              github.com/settings/tokens
            </Link>
            {' '}with <strong>notifications</strong> and <strong>repo</strong> scopes.
          </Typography>

          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !token.trim()}
            sx={{
              bgcolor: isDark ? '#238636' : '#1a7f37',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              py: 1,
              borderRadius: '6px',
              textTransform: 'none',
              '&:hover': { bgcolor: isDark ? '#2ea043' : '#15692e' },
              '&.Mui-disabled': {
                bgcolor: isDark ? '#21262d' : '#eaeef2',
                color: isDark ? '#484f58' : '#8c959f',
              },
            }}
          >
            {loading ? 'Connecting…' : 'Connect to GitHub'}
          </Button>
        </Box>

        <Typography sx={{
          textAlign: 'center', mt: 2,
          fontSize: '12px', color: theme.palette.text.secondary,
        }}>
          Your token is stored securely in your system keychain
        </Typography>
      </Box>
    </Box>
  );
}
