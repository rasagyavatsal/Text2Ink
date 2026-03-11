import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadEditorStateV1, saveEditorStateV1, clearEditorState } from '../editorPersistence';

const mockState = {
  text: 'hello',
  settings: { fontFamily: 'caveat' },
  pageSettingsByPage: [],
  textFields: [],
  ui: {
    activePanel: 'settings' as const,
    sidebarOpen: true,
    previewScale: 1,
    currentPageIndex: 0,
  }
};

describe('editorPersistence', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('loads null when window is unavailable (server-side)', () => {
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;
    
    expect(loadEditorStateV1()).toBeNull();
    
    global.window = originalWindow;
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
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(payload));
    
    const loaded = loadEditorStateV1();
    expect(loaded).toMatchObject(mockState);
    expect(loaded?.version).toBe(1);
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
