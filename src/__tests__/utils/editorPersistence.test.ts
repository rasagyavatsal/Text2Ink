import { loadEditorStateV1, saveEditorStateV1 } from '@/lib/editorPersistence';

type Settings = { a: number };

type PageSettings = { p: string };

type TextField = { id: string };

describe('editorPersistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('roundtrips persisted editor state', () => {
    saveEditorStateV1<Settings, PageSettings, TextField>({
      text: 'hello',
      settings: { a: 1 },
      pageSettingsByPage: [{ p: 'x' }],
      textFields: [{ id: 'tf-1' }],
      ui: {
        activePanel: 'settings',
        sidebarOpen: true,
        previewScale: 1.25,
        currentPageIndex: 2,
      },
    });

    const loaded = loadEditorStateV1<Settings, PageSettings, TextField>();
    expect(loaded).not.toBeNull();
    expect(loaded?.version).toBe(1);
    expect(loaded?.text).toBe('hello');
    expect(loaded?.settings).toEqual({ a: 1 });
    expect(loaded?.pageSettingsByPage).toEqual([{ p: 'x' }]);
    expect(loaded?.textFields).toEqual([{ id: 'tf-1' }]);
    expect(loaded?.ui).toEqual({
      activePanel: 'settings',
      sidebarOpen: true,
      previewScale: 1.25,
      currentPageIndex: 2,
    });
  });

  it('returns null for invalid payloads', () => {
    window.localStorage.setItem(
      'text2ink.editor.state',
      JSON.stringify({ version: 999, text: 'x' })
    );

    const loaded = loadEditorStateV1<Settings, PageSettings, TextField>();
    expect(loaded).toBeNull();
  });
});
