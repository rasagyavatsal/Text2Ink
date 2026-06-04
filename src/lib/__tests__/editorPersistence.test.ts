import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  clearEditorState,
  loadEditorStateV1,
  loadNormalizedEditorStateV1,
  saveEditorStateV1,
} from '../editorPersistence';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '../types';

const mockState = {
  text: 'hello',
  settings: { fontFamily: 'caveat' },
  pageSettingsByPage: [],
  ui: {
    activePanel: 'settings' as const,
    sidebarOpen: true,
    previewScale: 1,
    currentPageIndex: 0,
    editorMode: 'write' as const,
  }
};

describe('editorPersistence', () => {
  const legacyKey = ['text', 'Fields'].join('');

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('loads null when window is unavailable (server-side)', () => {
    const originalWindow = globalThis.window;
    // @ts-ignore
    delete globalThis.window;
    
    expect(loadEditorStateV1()).toBeNull();
    
    globalThis.window = originalWindow;
  });

  it('loads null when localStorage is empty', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    expect(loadEditorStateV1()).toBeNull();
  });

  it('loads valid state from localStorage', () => {
    const payload = {
      version: 1,
      updatedAt: Date.now(),
      ...mockState,
    };
    (payload as Record<string, unknown>)[legacyKey] = [
      { id: 'legacy', x: 1, y: 2, text: 'ignored', pageIndex: 0 },
    ];
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(payload));
    
    const loaded = loadEditorStateV1();
    expect(loaded).toMatchObject(mockState);
    expect(loaded?.version).toBe(1);
    expect(loaded).not.toHaveProperty(legacyKey);
  });

  it('normalizes legacy paper fields into a canonical paper selection when hydrating editor state', () => {
    const payload = {
      version: 1,
      updatedAt: Date.now(),
      text: 'hello',
      settings: {
        ...DEFAULT_SETTINGS,
        paper: undefined,
        paperPresetId: 'grid-a4-landscape',
        paperStyle: 'blank',
        paperFormat: 'letter',
        paperOrientation: 'portrait',
      },
      pageSettingsByPage: [
        {
          ...defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
          paper: undefined,
          paperStyle: 'ruled',
        },
      ],
      ui: mockState.ui,
    };
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(payload));

    const loaded = loadNormalizedEditorStateV1();

    expect(loaded?.settings.paper).toEqual({
      kind: 'preset',
      presetId: 'grid-a4-landscape',
    });
    expect(loaded?.pageSettingsByPage[0]?.paper).toEqual({ kind: 'inherit' });
  });

  it('rejects malformed or version mismatch payloads', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ version: 2 }));
    expect(loadEditorStateV1()).toBeNull();
    
    vi.mocked(localStorage.getItem).mockReturnValue('invalid json');
    expect(loadEditorStateV1()).toBeNull();
  });

  it('saves state to localStorage', () => {
    saveEditorStateV1(mockState);
    
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'text2ink.editor.state',
      expect.stringContaining('"text":"hello"')
    );
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'text2ink.editor.state',
      expect.stringContaining('"version":1')
    );
  });

  it('clears state from localStorage', () => {
    clearEditorState();
    expect(localStorage.removeItem).toHaveBeenCalledWith('text2ink.editor.state');
  });

  it('handles localStorage errors gracefully', () => {
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    
    // Should not throw
    expect(() => saveEditorStateV1(mockState)).not.toThrow();
  });
});
