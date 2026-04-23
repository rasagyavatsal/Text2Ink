'use client';

import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import HandwritingEditor from '@/components/HandwritingEditor';
import SettingsPanel from '@/components/SettingsPanel';
import ExportPanel from '@/components/ExportPanel';
import Version from '@/components/Version';
import {
  HandwritingSettings,
  DEFAULT_SETTINGS,
  PageSettings,
  defaultPageSettingsFromHandwritingSettings,
  LineData,
} from '@/lib/types';
import { loadEditorStateV1, saveEditorStateV1 } from '@/lib/editorPersistence';
import { applyPageSettingsToAll } from '@/lib/settingsHelpers';
import { Settings, Download, ChevronLeft, ChevronRight } from 'lucide-react';

const MemoSettingsPanel = React.memo(SettingsPanel);
const MemoExportPanel = React.memo(ExportPanel);

type EditorInitialState = {
  text: string;
  settings: HandwritingSettings;
  pageSettingsByPage: PageSettings[];
  activePanel: 'settings' | 'export';
  sidebarOpen: boolean;
  previewScale: number;
  currentPageIndex: number;
};

const DEFAULT_INITIAL_STATE: EditorInitialState = {
  text: '',
  settings: DEFAULT_SETTINGS,
  pageSettingsByPage: [defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS)],
  activePanel: 'settings',
  sidebarOpen: true,
  previewScale: 1,
  currentPageIndex: 0,
};

const getInitialEditorState = (): EditorInitialState => {
  const persisted = loadEditorStateV1<HandwritingSettings, PageSettings>();
  if (!persisted) return DEFAULT_INITIAL_STATE;

  return {
    text: persisted.text,
    settings: persisted.settings,
    pageSettingsByPage:
      persisted.pageSettingsByPage.length > 0
        ? persisted.pageSettingsByPage
        : [defaultPageSettingsFromHandwritingSettings(persisted.settings)],
    activePanel: persisted.ui.activePanel,
    sidebarOpen: persisted.ui.sidebarOpen,
    previewScale: persisted.ui.previewScale,
    currentPageIndex: persisted.ui.currentPageIndex,
  };
};

const subscribeClientReady = () => () => {};
const getClientReadySnapshot = () => true;
const getServerReadySnapshot = () => false;

type RootEditorShellProps = {
  initialState: EditorInitialState;
  persistState: boolean;
};

function RootEditorShell({ initialState, persistState }: RootEditorShellProps) {
  const [resolvedInitialState] = useState<EditorInitialState>(initialState);

  const [text, setText] = useState(resolvedInitialState.text);
  const [settings, setSettings] = useState<HandwritingSettings>(resolvedInitialState.settings);
  const [pageSettingsByPage, setPageSettingsByPage] = useState<PageSettings[]>(resolvedInitialState.pageSettingsByPage);
  const [activePanel, setActivePanel] = useState<'settings' | 'export'>(resolvedInitialState.activePanel);
  const [sidebarOpen, setSidebarOpen] = useState(resolvedInitialState.sidebarOpen);
  const [previewScale, setPreviewScale] = useState(resolvedInitialState.previewScale);
  const [currentPageIndex, setCurrentPageIndex] = useState(resolvedInitialState.currentPageIndex);
  const [totalPages, setTotalPages] = useState(1);
  const [pages, setPages] = useState<LineData[][]>([]);
  const [isPaginationComplete, setIsPaginationComplete] = useState(true);
  const [exportPageIndex, setExportPageIndex] = useState<number | null>(null);

  const handleSettingsChange = useCallback((next: React.SetStateAction<HandwritingSettings>) => {
    setSettings((prevSettings) => {
      const resolvedSettings =
        typeof next === 'function'
          ? (next as (prevState: HandwritingSettings) => HandwritingSettings)(prevSettings)
          : next;

      setPageSettingsByPage((prevPageSettings) =>
        prevPageSettings.map((pageSettings) => ({
          ...pageSettings,
          inkColor: resolvedSettings.inkColor,
          paperColor: resolvedSettings.paperColor,
          lineColor: resolvedSettings.lineColor,
        })),
      );

      return resolvedSettings;
    });
  }, []);

  useEffect(() => {
    if (!persistState) return;
    if (typeof window === 'undefined') return;

    const save = () => {
      saveEditorStateV1<HandwritingSettings, PageSettings>({
        text,
        settings,
        pageSettingsByPage,
        ui: {
          activePanel,
          sidebarOpen,
          previewScale,
          currentPageIndex,
          editorMode: 'write',
        },
      });
    };

    const timeout = window.setTimeout(save, 400);
    return () => window.clearTimeout(timeout);
  }, [
    activePanel,
    currentPageIndex,
    pageSettingsByPage,
    persistState,
    previewScale,
    settings,
    sidebarOpen,
    text,
  ]);

  useEffect(() => {
    if (!persistState) return;
    if (typeof window === 'undefined') return;

    const handleUnload = () => {
      saveEditorStateV1<HandwritingSettings, PageSettings>({
        text,
        settings,
        pageSettingsByPage,
        ui: {
          activePanel,
          sidebarOpen,
          previewScale,
          currentPageIndex,
          editorMode: 'write',
        },
      });
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [
    activePanel,
    currentPageIndex,
    pageSettingsByPage,
    persistState,
    previewScale,
    settings,
    sidebarOpen,
    text,
  ]);

  const clampPreviewScale = useCallback((value: number) => Math.min(2, Math.max(0.5, value)), []);

  const ensurePageSettingsLength = useCallback(
    (desiredLength: number) => {
      setPageSettingsByPage((prev) => {
        if (prev.length >= desiredLength) return prev;
        const next = [...prev];
        const fallback = next[next.length - 1] ?? defaultPageSettingsFromHandwritingSettings(settings);
        while (next.length < desiredLength) {
          next.push({ ...fallback });
        }
        return next;
      });
    },
    [settings],
  );

  const currentPageSettings = useMemo(
    () => pageSettingsByPage[currentPageIndex] ?? defaultPageSettingsFromHandwritingSettings(settings),
    [currentPageIndex, pageSettingsByPage, settings],
  );

  const applyCurrentPageSettingsToAll = useCallback(() => {
    setPageSettingsByPage((prev) => {
      const defaultSettings = defaultPageSettingsFromHandwritingSettings(settings);
      return applyPageSettingsToAll(prev, currentPageIndex, totalPages, defaultSettings);
    });
  }, [currentPageIndex, settings, totalPages]);

  const handlePageSettingsChange = useCallback(
    (nextPageSettings: PageSettings) => {
      ensurePageSettingsLength(currentPageIndex + 1);
      setPageSettingsByPage((prev) => {
        const next = [...prev];
        while (next.length <= currentPageIndex) {
          next.push(defaultPageSettingsFromHandwritingSettings(settings));
        }
        next[currentPageIndex] = nextPageSettings;
        return next;
      });
    },
    [currentPageIndex, ensurePageSettingsLength, settings],
  );

  const handleClearAll = useCallback(() => {
    if (window.confirm('Are you sure you want to remove all text and text fields from all pages? This action cannot be undone.')) {
      setText('');
      setCurrentPageIndex(0);
      handleSettingsChange((prev) => ({ ...prev, textFields: [] }));
      setPageSettingsByPage((prev) => prev.map((ps) => ({ ...ps, textFields: [] })));
    }
  }, [handleSettingsChange]);

  const handlePreviewScaleChange = useCallback(
    (value: number) => setPreviewScale(clampPreviewScale(value)),
    [clampPreviewScale],
  );

  const handleCurrentPageChange = useCallback(
    (nextIndex: number) => {
      ensurePageSettingsLength(nextIndex + 1);
      setCurrentPageIndex(nextIndex);
    },
    [ensurePageSettingsLength],
  );

  const handleTotalPagesChange = useCallback(
    (nextTotalPages: number) => {
      setTotalPages(nextTotalPages);
      ensurePageSettingsLength(nextTotalPages);
    },
    [ensurePageSettingsLength],
  );

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <header className="border-b border-gray-200 shrink-0 bg-white" role="banner">
        <div className="max-w-full mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-bold text-3xl font-dancing-script hover:opacity-80 transition-opacity">
              <span className="text-[#E0A32A]">Text</span>
              <span className="text-black">2</span>
              <span className="text-[#E0A32A]">Ink</span>
            </Link>
          </div>
          <Link
            href="/contact"
            className="text-gray-700 hover:text-[#E0A32A] font-medium transition-colors"
          >
            Contact
          </Link>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 bg-gray-100 overflow-hidden">
        <div
          className={`bg-white border-r border-gray-200 flex flex-col min-h-0 transition-all duration-300 ${sidebarOpen ? 'w-96' : 'w-0'} overflow-hidden`}
        >
          <div className="flex border-b border-gray-200 shrink-0">
            <button
              onClick={() => setActivePanel('settings')}
              className={`flex-1 py-4 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${activePanel === 'settings'
                ? 'text-[#E0A32A] border-b-2 border-[#E0A32A] bg-[#E0A32A]/5'
                : 'text-gray-500 hover:text-[#E0A32A] hover:bg-[#E0A32A]/5'
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={() => setActivePanel('export')}
              className={`flex-1 py-4 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${activePanel === 'export'
                ? 'text-[#E0A32A] border-b-2 border-[#E0A32A] bg-[#E0A32A]/5'
                : 'text-gray-500 hover:text-[#E0A32A] hover:bg-[#E0A32A]/5'
              }`}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white">
            {activePanel === 'settings' ? (
              <MemoSettingsPanel
                settings={settings}
                onSettingsChange={handleSettingsChange}
                pageSettings={currentPageSettings}
                onPageSettingsChange={handlePageSettingsChange}
                currentPageIndex={currentPageIndex}
                onApplyToAllPages={applyCurrentPageSettingsToAll}
                previewScale={previewScale}
                onPreviewScaleChange={handlePreviewScaleChange}
                onCurrentPageChange={handleCurrentPageChange}
                totalPages={totalPages}
                isPaginationComplete={isPaginationComplete}
                pages={pages}
                onClearAll={handleClearAll}
              />
            ) : (
              <MemoExportPanel
                hasContent={text.trim().length > 0}
                settings={settings}
                pages={pages}
                isPaginationComplete={isPaginationComplete}
                pageSettingsByPage={pageSettingsByPage}
                totalPages={totalPages}
                currentPageIndex={currentPageIndex}
                onCurrentPageChange={handleCurrentPageChange}
                onExportingChange={(isExporting) => {
                  if (!isExporting) setExportPageIndex(null);
                }}
                onExportPageIndexChange={setExportPageIndex}
              />
            )}
          </div>
          <div className="shrink-0 py-2 px-4 border-t border-gray-100 flex justify-center bg-gray-50/50">
            <Version />
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`fixed top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-r-xl p-3 shadow-xl hover:shadow-2xl transition-all duration-300 group ${sidebarOpen ? 'left-[384px]' : 'left-0'}`}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-[#E0A32A] transition-colors" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#E0A32A] transition-colors" />
          )}
        </button>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-gray-100">
          <div className="min-h-full flex justify-center py-12 px-6">
            <HandwritingEditor
              text={text}
              onTextChange={setText}
              settings={settings}
              onSettingsChange={handleSettingsChange}
              pageSettingsByPage={pageSettingsByPage}
              onPageSettingsChange={handlePageSettingsChange}
              exportingPageIndex={exportPageIndex}
              previewScale={previewScale}
              onPreviewScaleChange={handlePreviewScaleChange}
              currentPageIndex={currentPageIndex}
              onCurrentPageChange={handleCurrentPageChange}
              onTotalPagesChange={handleTotalPagesChange}
              onPagesChange={setPages}
              onPaginationCompleteChange={setIsPaginationComplete}
              onApplyToAllPages={applyCurrentPageSettingsToAll}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RootEditorPageClient() {
  const isClientReady = useSyncExternalStore(
    subscribeClientReady,
    getClientReadySnapshot,
    getServerReadySnapshot,
  );

  const initialState = isClientReady ? getInitialEditorState() : DEFAULT_INITIAL_STATE;

  return (
    <RootEditorShell
      key={isClientReady ? 'hydrated' : 'ssr'}
      initialState={initialState}
      persistState={isClientReady}
    />
  );
}
