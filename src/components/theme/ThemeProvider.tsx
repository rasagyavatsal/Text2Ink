'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import {
  getNextThemePreference,
  getThemePreferenceLabel,
  loadThemePreference,
  persistThemePreference,
  resolveThemePreference,
  sanitizeThemePreference,
  THEME_STORAGE_KEY,
  VALID_THEME_PREFERENCES,
  type ThemePreference,
} from '@/lib/themePreference';
import type { ChromeTheme } from '@/lib/designSystem';

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ChromeTheme;
  setPreference: (preference: ThemePreference) => void;
};

const NEXT_THEMES = VALID_THEME_PREFERENCES.filter((preference) => preference !== 'system');

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  resolvedTheme: 'light',
  setPreference: () => {},
});

function getSystemDark() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function getLocalStorage() {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function applyRootThemeMarkers(preference: ThemePreference, resolvedTheme: ChromeTheme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preference;
  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.style.colorScheme = resolvedTheme;
}

function ChromeThemeBridge({ children }: { children: React.ReactNode }) {
  const { resolvedTheme: nextResolvedTheme, setTheme, systemTheme, theme } = useNextTheme();
  const preference = sanitizeThemePreference(theme ?? loadThemePreference(getLocalStorage()));
  const systemDark = (nextResolvedTheme ?? systemTheme) === 'dark' || (!(nextResolvedTheme ?? systemTheme) && getSystemDark());
  const resolvedTheme = resolveThemePreference(preference, systemDark);

  useEffect(() => {
    applyRootThemeMarkers(preference, resolvedTheme);
  }, [preference, resolvedTheme]);

  const setPreference = useCallback(
    (nextPreference: ThemePreference) => {
      const sanitized = sanitizeThemePreference(nextPreference);
      persistThemePreference(getLocalStorage(), sanitized);
      setTheme(sanitized);
    },
    [setTheme],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
    }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={THEME_STORAGE_KEY}
      themes={NEXT_THEMES}
    >
      <ChromeThemeBridge>{children}</ChromeThemeBridge>
    </NextThemesProvider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeCycleButton({ className }: { className?: string }) {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const nextPreference = getNextThemePreference(preference);
  const label = getThemePreferenceLabel(preference);
  const nextLabel = getThemePreferenceLabel(nextPreference);
  const Icon = preference === 'system' ? Monitor : preference === 'light' ? Sun : Moon;

  return (
    <button
      type="button"
      aria-label={`Theme preference: ${label}. Current chrome: ${resolvedTheme}. Activate ${nextLabel}.`}
      title={`Theme preference: ${label} · Current chrome: ${resolvedTheme} · Next: ${nextLabel}`}
      className={cn('t2i-theme-cycle-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--t2i-focus-ring)]', className)}
      data-theme-preference={preference}
      onClick={() => setPreference(nextPreference)}
    >
      <Icon className="t2i-theme-cycle-button__icon h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export function ThemeModeSelect({ className }: { className?: string }) {
  return <ThemeCycleButton className={className} />;
}
