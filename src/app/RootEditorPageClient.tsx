'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import HandwritingEditor from '@/components/HandwritingEditor';
import SettingsPanel from '@/components/SettingsPanel';
import ExportPanel from '@/components/ExportPanel';
import DesktopEditorChrome from '@/components/DesktopEditorChrome';
import MobilePreviewControlSheet from '@/components/MobilePreviewControlSheet';
import GlobalHeader from '@/components/patterns/GlobalHeader';
import {
  HandwritingSettings,
  DEFAULT_SETTINGS,
  PageSettings,
  defaultPageSettingsFromHandwritingSettings,
  LineData,
} from '@/lib/types';
import { loadEditorStateV1, saveEditorStateV1 } from '@/lib/editorPersistence';
import { applyPageSettingsToAll, normalizeHandwritingSettings } from '@/lib/settingsHelpers';
import { resolvePageLayout } from '@/lib/pageLayout';
import {
  clampPreviewScale as clampEditorPreviewScale,
  DESKTOP_PREVIEW_MIN_SCALE,
  MOBILE_EDITOR_MEDIA_QUERY,
  PREVIEW_MAX_SCALE,
} from '@/lib/mobileEditorSheet';
import { resolveEditorShellLayout, type EditorSidebarViewId } from '@/lib/editorShell';

const MemoSettingsPanel = React.memo(SettingsPanel);
const MemoExportPanel = React.memo(ExportPanel);

type EditorInitialState = {
  text: string;
  settings: HandwritingSettings;
  pageSettingsByPage: PageSettings[];
  activePanel: EditorSidebarViewId;
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
  const settings = normalizeHandwritingSettings(persisted.settings);

  return {
    text: persisted.text,
    settings,
    pageSettingsByPage:
      persisted.pageSettingsByPage.length > 0
        ? persisted.pageSettingsByPage
        : [defaultPageSettingsFromHandwritingSettings(settings)],
    activePanel: persisted.ui.activePanel,
    sidebarOpen: persisted.ui.sidebarOpen,
    previewScale: persisted.ui.previewScale,
    currentPageIndex: persisted.ui.currentPageIndex,
  };
};

const subscribeClientReady = () => () => {};
const getClientReadySnapshot = () => true;
const getServerReadySnapshot = () => false;

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia(query);
    const update = () => setMatches(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, [query]);

  return matches;
}

function useElementHeight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof window === 'undefined') return;

    const update = () => setHeight(Math.round(element.getBoundingClientRect().height));
    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, height] as const;
}

type RootEditorShellProps = {
  initialState: EditorInitialState;
  persistState: boolean;
};

function RootEditorShell({ initialState, persistState }: RootEditorShellProps) {
  const exportLockMessage = 'Export in progress. Editing is temporarily disabled until capture finishes.';
  const [resolvedInitialState] = useState<EditorInitialState>(initialState);
  const [headerRef, headerHeight] = useElementHeight<HTMLElement>();
  const isMobileEditorLayout = useMediaQuery(MOBILE_EDITOR_MEDIA_QUERY);

  const [text, setText] = useState(resolvedInitialState.text);
  const [settings, setSettings] = useState<HandwritingSettings>(resolvedInitialState.settings);
  const [pageSettingsByPage, setPageSettingsByPage] = useState<PageSettings[]>(resolvedInitialState.pageSettingsByPage);
  const [activePanel, setActivePanel] = useState<EditorSidebarViewId>(resolvedInitialState.activePanel);
  const [previewScale, setPreviewScale] = useState(resolvedInitialState.previewScale);
  const [currentPageIndex, setCurrentPageIndex] = useState(resolvedInitialState.currentPageIndex);
  const [totalPages, setTotalPages] = useState(1);
  const [pages, setPages] = useState<LineData[][]>([]);
  const [isPaginationComplete, setIsPaginationComplete] = useState(true);
  const [exportPageIndex, setExportPageIndex] = useState<number | null>(null);
  const [isExportLocked, setIsExportLocked] = useState(false);

  const currentPageSettings = useMemo(
    () => pageSettingsByPage[currentPageIndex] ?? defaultPageSettingsFromHandwritingSettings(settings),
    [currentPageIndex, pageSettingsByPage, settings],
  );
  const currentPageLayout = useMemo(
    () => resolvePageLayout({ settings, pageSettings: currentPageSettings, pageIndex: currentPageIndex }),
    [currentPageIndex, currentPageSettings, settings],
  );
  const desktopPreviewScale = useMemo(
    () => clampEditorPreviewScale(previewScale, PREVIEW_MAX_SCALE, DESKTOP_PREVIEW_MIN_SCALE),
    [previewScale],
  );
  const shellLayout = useMemo(
    () => resolveEditorShellLayout({ isMobile: isMobileEditorLayout }),
    [isMobileEditorLayout],
  );

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
          sidebarOpen: true,
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
          sidebarOpen: true,
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
    text,
  ]);

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

  const handleRawPreviewScaleChange = useCallback((value: number) => {
    setPreviewScale(value);
  }, []);

  const handleDesktopPreviewScaleChange = useCallback((value: number) => {
    setPreviewScale(clampEditorPreviewScale(value, PREVIEW_MAX_SCALE, DESKTOP_PREVIEW_MIN_SCALE));
  }, []);

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

  const renderPreview = useCallback(
    ({
      previewScale,
      isMobileLayout,
      onPreviewEditingChange,
    }: {
      previewScale: number;
      isMobileLayout: boolean;
      onPreviewEditingChange?: (isPreviewEditing: boolean) => void;
    }) => (
      <HandwritingEditor
        text={text}
        onTextChange={setText}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        pageSettingsByPage={pageSettingsByPage}
        onPageSettingsChange={handlePageSettingsChange}
        exportingPageIndex={exportPageIndex}
        previewScale={previewScale}
        onPreviewScaleChange={isMobileLayout ? handleRawPreviewScaleChange : handleDesktopPreviewScaleChange}
        currentPageIndex={currentPageIndex}
        onCurrentPageChange={handleCurrentPageChange}
        onTotalPagesChange={handleTotalPagesChange}
        onPagesChange={setPages}
        onPaginationCompleteChange={setIsPaginationComplete}
        onApplyToAllPages={applyCurrentPageSettingsToAll}
        isMobileLayout={isMobileLayout}
        onPreviewEditingChange={onPreviewEditingChange}
        isExportLocked={isExportLocked}
      />
    ),
    [
      applyCurrentPageSettingsToAll,
      currentPageIndex,
      exportPageIndex,
      handleCurrentPageChange,
      handleDesktopPreviewScaleChange,
      handlePageSettingsChange,
      handleRawPreviewScaleChange,
      handleSettingsChange,
      handleTotalPagesChange,
      isExportLocked,
      pageSettingsByPage,
      settings,
      text,
    ],
  );

  const renderSettingsPanel = useCallback(
    ({
      previewScale,
      onPreviewScaleChange,
    }: {
      previewScale: number;
      onPreviewScaleChange: (value: number) => void;
    }) => (
      <MemoSettingsPanel
        settings={settings}
        onSettingsChange={handleSettingsChange}
        pageSettings={currentPageSettings}
        onPageSettingsChange={handlePageSettingsChange}
        currentPageIndex={currentPageIndex}
        onApplyToAllPages={applyCurrentPageSettingsToAll}
        previewScale={previewScale}
        onPreviewScaleChange={onPreviewScaleChange}
        onCurrentPageChange={handleCurrentPageChange}
        totalPages={totalPages}
        isPaginationComplete={isPaginationComplete}
        pages={pages}
        onClearAll={handleClearAll}
        isExportLocked={isExportLocked}
        exportLockMessage={exportLockMessage}
      />
    ),
    [
      applyCurrentPageSettingsToAll,
      currentPageIndex,
      currentPageSettings,
      exportLockMessage,
      handleClearAll,
      handleCurrentPageChange,
      handlePageSettingsChange,
      handleSettingsChange,
      isExportLocked,
      isPaginationComplete,
      pages,
      settings,
      totalPages,
    ],
  );

  const exportPanel = (
    <MemoExportPanel
      hasContent={text.trim().length > 0}
      settings={settings}
      pages={pages}
      isPaginationComplete={isPaginationComplete}
      pageSettingsByPage={pageSettingsByPage}
      totalPages={totalPages}
      onExportingChange={(isExporting) => {
        setIsExportLocked(isExporting);
        if (!isExporting) setExportPageIndex(null);
      }}
      onExportPageIndexChange={setExportPageIndex}
    />
  );

  const MobilePreview = useCallback(
    ({ previewScale, onPreviewEditingChange }: { previewScale: number; onPreviewEditingChange: (isPreviewEditing: boolean) => void }) =>
      renderPreview({
        previewScale,
        isMobileLayout: true,
        onPreviewEditingChange,
      }),
    [renderPreview],
  );

  const MobileSettingsPanel = useCallback(
    ({ previewScale, onPreviewScaleChange }: { previewScale: number; onPreviewScaleChange: (value: number) => void }) =>
      renderSettingsPanel({ previewScale, onPreviewScaleChange }),
    [renderSettingsPanel],
  );

  const desktopPreview = (
    <div
      data-testid="preview-scroll-container"
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--t2i-surface-app)]"
    >
      <div className="flex min-h-full justify-center px-6 py-12">
        {renderPreview({ previewScale: desktopPreviewScale, isMobileLayout: false })}
      </div>
    </div>
  );

  const desktopSettingsPanel = renderSettingsPanel({
    previewScale: desktopPreviewScale,
    onPreviewScaleChange: handleDesktopPreviewScaleChange,
  });

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--t2i-surface-app)] text-[var(--t2i-content-normal)]">
      <GlobalHeader ref={headerRef} action={{ href: '/contact', label: 'Contact', tone: 'ghost' }} />

      <div className="flex min-h-0 flex-1 overflow-hidden bg-[var(--t2i-surface-app)]">
        {shellLayout.controlSurface === 'fixed-sidebar' ? (
          <DesktopEditorChrome
            activePanel={activePanel}
            exportPanel={exportPanel}
            preview={desktopPreview}
            settingsPanel={desktopSettingsPanel}
            onActivePanelChange={setActivePanel}
          />
        ) : (
          <MobilePreviewControlSheet
            activePanel={activePanel}
            exportPanel={exportPanel}
            headerHeight={headerHeight}
            pageHeight={currentPageLayout.height}
            pageWidth={currentPageLayout.width}
            rawPreviewScale={previewScale}
            onActivePanelChange={setActivePanel}
            onRawPreviewScaleChange={handleRawPreviewScaleChange}
            Preview={MobilePreview}
            SettingsPanel={MobileSettingsPanel}
          />
        )}
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
