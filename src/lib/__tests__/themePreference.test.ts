import { describe, expect, it } from 'vitest';
import {
  getNextThemePreference,
  loadThemePreference,
  persistThemePreference,
  resolveThemePreference,
  sanitizeThemePreference,
  THEME_STORAGE_KEY,
} from '@/lib/themePreference';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe('theme preference behavior', () => {
  it('resolves system, light, and dark preferences against the current system theme', () => {
    expect(resolveThemePreference('system', true)).toBe('dark');
    expect(resolveThemePreference('system', false)).toBe('light');
    expect(resolveThemePreference('light', true)).toBe('light');
    expect(resolveThemePreference('dark', false)).toBe('dark');
  });

  it('persists explicit preferences while treating invalid stored values as system default', () => {
    const storage = new MemoryStorage();

    expect(loadThemePreference(storage)).toBe('system');

    persistThemePreference(storage, 'dark');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(loadThemePreference(storage)).toBe('dark');

    storage.setItem(THEME_STORAGE_KEY, 'neon');
    expect(loadThemePreference(storage)).toBe('system');
    expect(sanitizeThemePreference('light')).toBe('light');
    expect(sanitizeThemePreference('unexpected')).toBe('system');
  });

  it('cycles only through system, light, and dark in the header order', () => {
    expect(getNextThemePreference('system')).toBe('light');
    expect(getNextThemePreference('light')).toBe('dark');
    expect(getNextThemePreference('dark')).toBe('system');
    expect(getNextThemePreference('unexpected')).toBe('light');
  });
});
