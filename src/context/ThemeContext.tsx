import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeStyle = 'onyx' | 'midnight' | 'sunset' | 'forest' | 'ocean' | 'mono';

export interface ThemeConfig {
  id: ThemeStyle;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  previewLeft: string;
  previewRight: string;
}

export const THEME_PRESETS: ThemeConfig[] = [
  {
    id: 'onyx',
    name: 'Onyx',
    primaryColor: '#2f5fe0',
    secondaryColor: '#81a1ff',
    previewLeft: '#0f172a',
    previewRight: '#2f5fe0',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    primaryColor: '#0284c7',
    secondaryColor: '#38bdf8',
    previewLeft: '#0f172a',
    previewRight: '#38bdf8',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    primaryColor: '#ea580c',
    secondaryColor: '#fb923c',
    previewLeft: '#27191c',
    previewRight: '#f97316',
  },
  {
    id: 'forest',
    name: 'Forest',
    primaryColor: '#059669',
    secondaryColor: '#34d399',
    previewLeft: '#062817',
    previewRight: '#34d399',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    primaryColor: '#0d9488',
    secondaryColor: '#2dd4bf',
    previewLeft: '#08232c',
    previewRight: '#2dd4bf',
  },
  {
    id: 'mono',
    name: 'Mono',
    primaryColor: '#18181b',
    secondaryColor: '#71717a',
    previewLeft: '#09090b',
    previewRight: '#71717a',
  },
];

/* ---------- tiny color utils for live accent theming ---------- */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** percent < 0 darkens, > 0 lightens toward white */
function shade(hex: string, percent: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) =>
    Math.round(percent < 0 ? c * (1 + percent / 100) : c + (255 - c) * (percent / 100));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}
function tint(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

export const ACCENT_SWATCHES = [
  '#2f5fe0', // Onyx Blue
  '#0284c7', // Sky Blue
  '#10b981', // Emerald
  '#ef4444', // Rose Red
  '#8b5cf6', // Purple
  '#0d9488', // Teal
  '#be123c', // Crimson
  '#475569', // Slate
];

interface ThemeContextType {
  mode: ThemeMode;
  themeStyle: ThemeStyle;
  accentColor: string;
  setMode: (mode: ThemeMode) => void;
  setThemeStyle: (style: ThemeStyle) => void;
  setAccentColor: (color: string) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  themeStyle: 'onyx',
  accentColor: '#2f5fe0',
  setMode: () => {},
  setThemeStyle: () => {},
  setAccentColor: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('onyx_theme_mode') as ThemeMode) || 'light';
  });

  const [themeStyle, setThemeStyleState] = useState<ThemeStyle>(() => {
    return (localStorage.getItem('onyx_theme_style') as ThemeStyle) || 'onyx';
  });

  const [accentColor, setAccentColorState] = useState<string>(() => {
    return localStorage.getItem('onyx_accent_color') || '#2f5fe0';
  });

  const [isDark, setIsDark] = useState<boolean>(false);

  // Apply mode
  useEffect(() => {
    const root = document.documentElement;
    let dark = false;

    if (mode === 'system') {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      dark = mode === 'dark';
    }

    setIsDark(dark);
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('onyx_theme_mode', mode);
  }, [mode]);

  // Apply theme style and accent color
  useEffect(() => {
    document.body.setAttribute('data-theme', themeStyle);
    localStorage.setItem('onyx_theme_style', themeStyle);

    // Apply the chosen accent live so every bg-primary/text-primary surface updates
    const root = document.documentElement;
    root.style.setProperty('--onyx-accent', accentColor);
    root.style.setProperty('--color-primary', accentColor);
    root.style.setProperty('--color-ring', accentColor);
    root.style.setProperty('--color-primary-strong', shade(accentColor, -18));
    root.style.setProperty('--color-primary-soft', tint(accentColor, 0.92));
    localStorage.setItem('onyx_accent_color', accentColor);
  }, [themeStyle, accentColor]);

  const setMode = (newMode: ThemeMode) => setModeState(newMode);
  const setThemeStyle = (style: ThemeStyle) => {
    setThemeStyleState(style);
    const preset = THEME_PRESETS.find(p => p.id === style);
    if (preset) {
      setAccentColorState(preset.primaryColor);
    }
  };
  const setAccentColor = (color: string) => setAccentColorState(color);

  return (
    <ThemeContext.Provider value={{
      mode,
      themeStyle,
      accentColor,
      setMode,
      setThemeStyle,
      setAccentColor,
      isDark,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
