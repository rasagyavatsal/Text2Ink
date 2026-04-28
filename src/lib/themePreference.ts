import type { ChromeTheme } from '@/lib/designSystem';

export type ThemePreference = ChromeTheme | 'system';

type ThemeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const THEME_STORAGE_KEY = 'text2ink.themePreference.v1';

export const VALID_THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

export function sanitizeThemePreference(value: unknown): ThemePreference {
  return VALID_THEME_PREFERENCES.includes(value as ThemePreference)
    ? (value as ThemePreference)
    : 'system';
}

export function resolveThemePreference(preference: ThemePreference, systemDark: boolean): ChromeTheme {
  if (preference === 'system') {
    return systemDark ? 'dark' : 'light';
  }

  return preference;
}

export function getNextThemePreference(preference: unknown): ThemePreference {
  const current = sanitizeThemePreference(preference);
  if (current === 'system') return 'light';
  if (current === 'light') return 'dark';
  return 'system';
}

export function getThemePreferenceLabel(preference: ThemePreference) {
  if (preference === 'system') return 'System';
  if (preference === 'light') return 'Light';
  return 'Dark';
}

export function loadThemePreference(storage?: ThemeStorage | null): ThemePreference {
  if (!storage) return 'system';

  try {
    return sanitizeThemePreference(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

export function persistThemePreference(storage: ThemeStorage | null | undefined, preference: ThemePreference) {
  if (!storage) return;

  try {
    storage.setItem(THEME_STORAGE_KEY, sanitizeThemePreference(preference));
  } catch {
    // Local storage can be unavailable in private contexts. Theme changes should remain usable in-memory.
  }
}

export function clearThemePreference(storage: ThemeStorage | null | undefined) {
  if (!storage) return;

  try {
    storage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}
