import React, { createContext, useContext, useMemo } from 'react';
import { useStore } from '../store/useStore';

// ─── Theme Definitions ─────────────────────────────────────────────────────────
export const THEMES = {
  ocean: {
    id: 'ocean',
    name: 'Ocean Blue',
    emoji: '🌊',
    primary: '#262A56',
    primaryDark: '#1a1d3d',
    primaryLight: '#3d437a',
    accent: '#ec5b13',
    accentLight: '#f47c46',
    glow: 'rgba(38,42,86,0.3)',
    tabActive: '#262A56',
    headerGradientStart: '#262A56',
    headerGradientEnd: '#1a1d3d',
    swatch: ['#262A56', '#3d437a', '#ec5b13'],
  },
  forest: {
    id: 'forest',
    name: 'Forest Green',
    emoji: '🌲',
    primary: '#14532d',
    primaryDark: '#0d3d1f',
    primaryLight: '#1a6b39',
    accent: '#16a34a',
    accentLight: '#22c55e',
    glow: 'rgba(20,83,45,0.3)',
    tabActive: '#14532d',
    headerGradientStart: '#14532d',
    headerGradientEnd: '#0d3d1f',
    swatch: ['#14532d', '#1a6b39', '#16a34a'],
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Orange',
    emoji: '🌅',
    primary: '#7c2d12',
    primaryDark: '#5c1e09',
    primaryLight: '#9a3a18',
    accent: '#f97316',
    accentLight: '#fb923c',
    glow: 'rgba(124,45,18,0.3)',
    tabActive: '#7c2d12',
    headerGradientStart: '#7c2d12',
    headerGradientEnd: '#5c1e09',
    swatch: ['#7c2d12', '#9a3a18', '#f97316'],
  },
  royal: {
    id: 'royal',
    name: 'Royal Purple',
    emoji: '👑',
    primary: '#3b0764',
    primaryDark: '#270547',
    primaryLight: '#4c0a7c',
    accent: '#9333ea',
    accentLight: '#a855f7',
    glow: 'rgba(59,7,100,0.35)',
    tabActive: '#3b0764',
    headerGradientStart: '#3b0764',
    headerGradientEnd: '#270547',
    swatch: ['#3b0764', '#4c0a7c', '#9333ea'],
  },
  rose: {
    id: 'rose',
    name: 'Rose Pink',
    emoji: '🌸',
    primary: '#881337',
    primaryDark: '#620d28',
    primaryLight: '#a51844',
    accent: '#ec4899',
    accentLight: '#f472b6',
    glow: 'rgba(136,19,55,0.3)',
    tabActive: '#881337',
    headerGradientStart: '#881337',
    headerGradientEnd: '#620d28',
    swatch: ['#881337', '#a51844', '#ec4899'],
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    primary: '#0f172a',
    primaryDark: '#080e1c',
    primaryLight: '#1e293b',
    accent: '#38bdf8',
    accentLight: '#7dd3fc',
    glow: 'rgba(15,23,42,0.5)',
    tabActive: '#0f172a',
    headerGradientStart: '#0f172a',
    headerGradientEnd: '#080e1c',
    swatch: ['#0f172a', '#1e293b', '#38bdf8'],
  },
};

export const THEME_LIST = Object.values(THEMES);

// ─── Context ──────────────────────────────────────────────────────────────────
const ThemeContext = createContext(THEMES.ocean);

export function ThemeProvider({ children }) {
  const colorTheme = useStore((state) => state.profile?.colorTheme || 'ocean');

  const theme = useMemo(
    () => THEMES[colorTheme] || THEMES.ocean,
    [colorTheme]
  );

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the active color theme.
 * Usage:
 *   const theme = useTheme();
 *   <View style={{ backgroundColor: theme.primary }}>
 */
export function useTheme() {
  return useContext(ThemeContext);
}
