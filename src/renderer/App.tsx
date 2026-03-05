import React, { useEffect, useState, useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline, useMediaQuery } from '@mui/material';
import { api } from './api/ipc-client';
import type { AppSettings } from '../shared/types';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';

type View = 'loading' | 'setup' | 'dashboard' | 'settings';

// GitHub Primer design tokens
const ghLight = {
  fg: { default: '#1F2328', muted: '#656d76', subtle: '#6e7781' },
  canvas: { default: '#ffffff', subtle: '#f6f8fa', inset: '#f6f8fa' },
  border: { default: '#d0d7de', muted: '#d8dee4', subtle: 'rgba(27,31,36,0.15)' },
  accent: { fg: '#0969da', emphasis: '#0969da', muted: 'rgba(84,174,255,0.4)', subtle: '#ddf4ff' },
  success: { fg: '#1a7f37', emphasis: '#1f883d', muted: 'rgba(74,194,107,0.4)', subtle: '#dafbe1' },
  danger: { fg: '#d1242f', emphasis: '#cf222e', muted: 'rgba(255,129,130,0.4)', subtle: '#ffebe9' },
  done: { fg: '#8250df', emphasis: '#8250df', muted: 'rgba(194,151,255,0.4)', subtle: '#fbefff' },
  neutral: { emphasis: '#6e7781', muted: 'rgba(175,184,193,0.2)', subtle: '#eaeef2' },
};

const ghDark = {
  fg: { default: '#e6edf3', muted: '#8b949e', subtle: '#6e7681' },
  canvas: { default: '#0d1117', subtle: '#161b22', inset: '#010409' },
  border: { default: '#30363d', muted: '#21262d', subtle: 'rgba(240,246,252,0.1)' },
  accent: { fg: '#58a6ff', emphasis: '#1f6feb', muted: 'rgba(56,139,253,0.4)', subtle: 'rgba(56,139,253,0.15)' },
  success: { fg: '#3fb950', emphasis: '#238636', muted: 'rgba(46,160,67,0.4)', subtle: 'rgba(46,160,67,0.15)' },
  danger: { fg: '#f85149', emphasis: '#da3633', muted: 'rgba(248,81,73,0.4)', subtle: 'rgba(248,81,73,0.15)' },
  done: { fg: '#bc8cff', emphasis: '#8957e5', muted: 'rgba(163,113,247,0.4)', subtle: 'rgba(163,113,247,0.15)' },
  neutral: { emphasis: '#6e7681', muted: 'rgba(110,118,129,0.4)', subtle: '#1c2128' },
};

export default function App() {
  const [view, setView] = useState<View>('loading');
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const resolvedMode = themeMode === 'system' ? (prefersDark ? 'dark' : 'light') : themeMode;
  const gh = resolvedMode === 'dark' ? ghDark : ghLight;

  const theme = useMemo(() => createTheme({
    palette: {
      mode: resolvedMode,
      primary: { main: gh.accent.emphasis },
      success: { main: gh.success.emphasis },
      error: { main: gh.danger.emphasis },
      background: {
        default: gh.canvas.default,
        paper: gh.canvas.subtle,
      },
      text: {
        primary: gh.fg.default,
        secondary: gh.fg.muted,
      },
      divider: gh.border.default,
    },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
      fontSize: 14,
      h6: { fontSize: '16px', fontWeight: 600, lineHeight: 1.5 },
      body1: { fontSize: '14px', lineHeight: 1.5 },
      body2: { fontSize: '13px', lineHeight: 1.5 },
      caption: { fontSize: '12px', lineHeight: 1.5 },
    },
    shape: { borderRadius: 6 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*': { boxSizing: 'border-box' },
          body: {
            scrollbarWidth: 'thin',
            scrollbarColor: `${gh.neutral.emphasis} transparent`,
            '&::-webkit-scrollbar': { width: 6, height: 6 },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: gh.neutral.muted,
              borderRadius: 3,
              '&:hover': { backgroundColor: gh.neutral.emphasis },
            },
          },
          '*::-webkit-scrollbar': { width: 6, height: 6 },
          '*::-webkit-scrollbar-track': { background: 'transparent' },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: gh.neutral.muted,
            borderRadius: 3,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '13px',
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${gh.border.default}`,
          },
        },
        defaultProps: { elevation: 0 },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { fontSize: '12px' },
        },
      },
    },
  }), [resolvedMode, gh]);

  useEffect(() => {
    (async () => {
      const hasToken = await api.hasToken();
      if (hasToken) {
        const settings = await api.getSettings();
        setThemeMode(settings.theme);
      }
      setView(hasToken ? 'dashboard' : 'setup');
    })();
  }, []);

  const handleSettingsUpdate = (settings: AppSettings) => {
    setThemeMode(settings.theme);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {view === 'setup' && (
        <Setup onComplete={async () => {
          const settings = await api.getSettings();
          setThemeMode(settings.theme);
          setView('dashboard');
        }} />
      )}
      {view === 'dashboard' && (
        <Dashboard onOpenSettings={() => setView('settings')} />
      )}
      {view === 'settings' && (
        <Settings
          onBack={() => setView('dashboard')}
          onLogout={() => setView('setup')}
          onSettingsChange={handleSettingsUpdate}
        />
      )}
    </ThemeProvider>
  );
}
