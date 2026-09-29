import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeStyle = 'onyx' | 'midnight' | 'sunset' | 'forest' | 'ocean' | 'mono';

export interface ThemeConfig {
  id: ThemeStyle;
  name: string;
  primaryColor: string;
  /** Darker shade used for hover states on solid accent surfaces. */
  hoverColor: string;
  secondaryColor: string;
  /** Soft tinted background used behind the app in light mode. */
  backgroundLight: string;
  /** Deep, theme-tinted (not pure black) background used in dark mode. */
  backgroundDark: string;
  previewLeft: string;
  previewRight: string;
}

export const DEFAULT_ACCENT = '#d97706';

export const THEME_PRESETS: ThemeConfig[] = [
  {
    id: 'onyx',
    name: 'Onyx',
    primaryColor: '#d97706',
    hoverColor: '#b45309',
    secondaryColor: '#f59e0b',
    backgroundLight: '#fdfaf4',
    backgroundDark: '#181512',
    previewLeft: '#faf6ee',
    previewRight: '#d97706',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    primaryColor: '#4f6df5',
    hoverColor: '#3b55d9',
    secondaryColor: '#818cf8',
    backgroundLight: '#f6f7fe',
    backgroundDark: '#12142b',
    previewLeft: '#4f6df5',
    previewRight: '#c7ccff',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    primaryColor: '#e85d3d',
    hoverColor: '#c9482a',
    secondaryColor: '#fb923c',
    backgroundLight: '#fdf6f2',
    backgroundDark: '#211310',
    previewLeft: '#fff1e6',
    previewRight: '#e85d3d',
  },
  {
    id: 'forest',
    name: 'Forest',
    primaryColor: '#15a06c',
    hoverColor: '#0d8357',
    secondaryColor: '#34d399',
    backgroundLight: '#f2faf6',
    backgroundDark: '#0d1f17',
    previewLeft: '#e6f7ef',
    previewRight: '#15a06c',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    primaryColor: '#0891b2',
    hoverColor: '#0e7490',
    secondaryColor: '#22d3ee',
    backgroundLight: '#f1fafd',
    backgroundDark: '#0b1d26',
    previewLeft: '#e0f5fc',
    previewRight: '#0891b2',
  },
  {
    id: 'mono',
    name: 'Mono',
    primaryColor: '#334155',
    hoverColor: '#1e293b',
    secondaryColor: '#64748b',
    backgroundLight: '#f7f8fa',
    backgroundDark: '#15181d',
    previewLeft: '#f1f5f9',
    previewRight: '#334155',
  },
];

export const ACCENT_SWATCHES = [
  '#d97706', // Onyx Amber
  '#4f6df5', // Indigo
  '#e85d3d', // Coral
  '#15a06c', // Emerald
  '#0891b2', // Cyan
  '#8b5cf6', // Violet
  '#e11d48', // Rose
  '#64748b', // Slate
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
  accentColor: DEFAULT_ACCENT,
  setMode: () => {},
  setThemeStyle: () => {},
  setAccentColor: () => {},
  isDark: false,
});

/** Convert "#rrggbb" to "r g b" (space separated, used by the design tokens). */
function hexToRgbTriplet(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Mix a hex colour with white/black to derive tints & shades. */
function mixHex(hex: string, target: number, amount: number): string {
  const triplet = hexToRgbTriplet(hex);
  if (!triplet) return hex;
  const [r, g, b] = triplet.split(' ').map(Number);
  const mix = (c: number) => Math.round(c + (target - c) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Pick black or white foreground depending on accent luminance. */
function readableForeground(hex: string): string {
  const triplet = hexToRgbTriplet(hex);
  if (!triplet) return '255 255 255';
  const [r, g, b] = triplet.split(' ').map(Number);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 150 ? '15 23 42' : '255 255 255';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('onyx_theme_mode') as ThemeMode) || 'light';
  });

  const [themeStyle, setThemeStyleState] = useState<ThemeStyle>(() => {
    return (localStorage.getItem('onyx_theme_style') as ThemeStyle) || 'onyx';
  });

  const [accentColor, setAccentColorState] = useState<string>(() => {
    return localStorage.getItem('onyx_accent_color') || DEFAULT_ACCENT;
  });

  const [isDark, setIsDark] = useState<boolean>(false);

  // Apply mode (also re-evaluated live when following the system preference)
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
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
    };

    apply();
    localStorage.setItem('onyx_theme_mode', mode);

    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);

  // Apply theme style + accent colour as live CSS variables so every UI
  // surface (backgrounds, buttons, links, focus rings) actually recolours.
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    body.setAttribute('data-theme', themeStyle);
    localStorage.setItem('onyx_theme_style', themeStyle);

    const preset = THEME_PRESETS.find((p) => p.id === themeStyle);
    const accent = /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : preset?.primaryColor || DEFAULT_ACCENT;

    const rgb = hexToRgbTriplet(accent);
    if (rgb) {
      const hoverRgb = hexToRgbTriplet(mixHex(accent, 0, 0.16));
      const tintRgb = hexToRgbTriplet(mixHex(accent, 255, 0.92));
      const fgRgb = readableForeground(accent);

      root.style.setProperty('--onyx-accent', accent);
      // Keep the legacy --primary-color token (referenced by body[data-theme]
      // CSS rules) in sync with the live accent selection.
      root.style.setProperty('--primary-color', accent);
      root.style.setProperty('--primary-hover', mixHex(accent, 0, 0.16));
      root.style.setProperty('--brand-rgb', rgb);
      root.style.setProperty('--brand-hover-rgb', hoverRgb || rgb);
      root.style.setProperty('--brand-tint-rgb', tintRgb || '255 255 255');
      root.style.setProperty('--primary', rgb);
      root.style.setProperty('--accent', rgb);
      root.style.setProperty('--ring', rgb);
      root.style.setProperty('--primary-foreground', fgRgb);
      root.style.setProperty('--accent-foreground', fgRgb);
    }

    // Theme backgrounds — light mode gets a soft warm/cool tint instead of
    // stark grey, dark mode gets a deep theme-tinted navy/charcoal rather
    // than pure gloomy black.
    if (preset) {
      const bgLight = hexToRgbTriplet(preset.backgroundLight);
      const bgDark = hexToRgbTriplet(preset.backgroundDark);
      if (bgLight) root.style.setProperty('--app-bg-light', bgLight);
      if (bgDark) root.style.setProperty('--app-bg-dark', bgDark);
      // Plain colour forms for legacy body[data-theme] rules / inline styles
      root.style.setProperty('--app-bg-light-color', preset.backgroundLight);
      root.style.setProperty('--app-bg-dark-color', preset.backgroundDark);
    }

    localStorage.setItem('onyx_accent_color', accent);
  }, [themeStyle, accentColor]);

  // Smoothly cross-fade colours when the theme or mode changes.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    const t = window.setTimeout(() => root.classList.remove('theme-transitioning'), 320);
    return () => window.clearTimeout(t);
  }, [themeStyle, accentColor, isDark]);

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
