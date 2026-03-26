export type EditorUiState = {
  activePanel: 'settings' | 'export';
  sidebarOpen: boolean;
  previewScale: number;
  currentPageIndex: number;
  editorMode: 'write';
};

export type PersistedEditorStateV1<TSettings, TPageSettings> = {
  version: 1;
  updatedAt: number;
  text: string;
  settings: TSettings;
  pageSettingsByPage: TPageSettings[];
  ui: EditorUiState;
};

const STORAGE_KEY = 'text2ink.editor.state';

const safeJsonParse = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const loadEditorStateV1 = <TSettings, TPageSettings>():
  | PersistedEditorStateV1<TSettings, TPageSettings>
  | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  const parsed = safeJsonParse(raw);
  if (!parsed || typeof parsed !== 'object') return null;

  const anyParsed = parsed as Record<string, unknown>;
  if (anyParsed.version !== 1) return null;
  if (typeof anyParsed.updatedAt !== 'number') return null;
  if (typeof anyParsed.text !== 'string') return null;
  if (!('settings' in anyParsed)) return null;
  if (!Array.isArray(anyParsed.pageSettingsByPage)) return null;

  const ui = anyParsed.ui as Record<string, unknown> | undefined;
  if (!ui || typeof ui !== 'object') return null;
  const activePanel = ui.activePanel;
  const sidebarOpen = ui.sidebarOpen;
  const previewScale = ui.previewScale;
  const currentPageIndex = ui.currentPageIndex;

  if (activePanel !== 'settings' && activePanel !== 'export') return null;
  if (typeof sidebarOpen !== 'boolean') return null;
  if (typeof previewScale !== 'number') return null;
  if (typeof currentPageIndex !== 'number') return null;

  return {
    version: 1,
    updatedAt: anyParsed.updatedAt,
    text: anyParsed.text,
    settings: anyParsed.settings as TSettings,
    pageSettingsByPage: anyParsed.pageSettingsByPage as TPageSettings[],
    ui: {
      activePanel,
      sidebarOpen,
      previewScale,
      currentPageIndex,
      editorMode: 'write',
    },
  } as PersistedEditorStateV1<TSettings, TPageSettings>;
};

export const saveEditorStateV1 = <TSettings, TPageSettings>(
  next: Omit<PersistedEditorStateV1<TSettings, TPageSettings>, 'version' | 'updatedAt'>
): void => {
  if (typeof window === 'undefined') return;
  const payload: PersistedEditorStateV1<TSettings, TPageSettings> = {
    version: 1,
    updatedAt: Date.now(),
    ...next,
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
};

export const clearEditorState = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
};
