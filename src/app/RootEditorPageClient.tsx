'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import HandwritingEditor from '@/components/HandwritingEditor';
import SettingsPanel from '@/components/SettingsPanel';
import ExportPanel from '@/components/ExportPanel';
import Version from '@/components/Version';
import MobileEditorBottomSheet from '@/components/MobileEditorBottomSheet';
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
  clampMobileSheetHeight,
  clampPreviewScale as clampEditorPreviewScale,
  computeMobileEditorSheetMetrics,
  computeMobilePreviewScale,
  DESKTOP_PREVIEW_MIN_SCALE,
  MOBILE_EDITOR_MEDIA_QUERY,
  MOBILE_PREVIEW_MIN_SCALE,
  MobileSheetAnchor,
  PREVIEW_MAX_SCALE,
} from '@/lib/mobileEditorSheet';
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

const DEFAULT_VIEWPORT_SIZE = { width: 390, height: 844, safeAreaBottom: 0 };

function readSafeAreaBottom() {
  if (typeof window === 'undefined') return 0;

  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue('--safe-area-inset-bottom')
    .trim();
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readViewportSize() {
  if (typeof window === 'undefined') return DEFAULT_VIEWPORT_SIZE;
  const visualViewport = window.visualViewport;
  return {
    width: Math.round(visualViewport?.width ?? window.innerWidth),
    height: Math.round(visualViewport?.height ?? window.innerHeight),
    safeAreaBottom: readSafeAreaBottom(),
  };
}

function useViewportSize() {
  const [viewportSize, setViewportSize] = useState(DEFAULT_VIEWPORT_SIZE);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setViewportSize(readViewportSize()));
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);

  return viewportSize;
}

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

function blurActiveTextInput() {
  if (typeof document === 'undefined') return;

  const activeElement = document.activeElement;
  if (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement ||
    (activeElement instanceof HTMLElement && activeElement.isContentEditable)
  ) {
    activeElement.blur();
  }
}

type RootEditorShellProps = {
  initialState: EditorInitialState;
  persistState: boolean;
};

function RootEditorShell({ initialState, persistState }: RootEditorShellProps) {
  const [resolvedInitialState] = useState<EditorInitialState>(initialState);
  const [headerRef, headerHeight] = useElementHeight<HTMLElement>();
  const viewportSize = useViewportSize();
  const isMobileEditorLayout = useMediaQuery(MOBILE_EDITOR_MEDIA_QUERY);

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
  const [mobileSheetAnchor, setMobileSheetAnchor] = useState<MobileSheetAnchor>('default');
  const [mobileSheetHeight, setMobileSheetHeight] = useState<number | null>(null);

  const mobileSheetMetrics = useMemo(
    () =>
      computeMobileEditorSheetMetrics({
        viewportHeight: viewportSize.height,
        viewportWidth: viewportSize.width,
        headerHeight,
        safeAreaBottom: viewportSize.safeAreaBottom,
      }),
    [headerHeight, viewportSize.height, viewportSize.safeAreaBottom, viewportSize.width],
  );

  const effectiveMobileSheetHeight = isMobileEditorLayout
    ? clampMobileSheetHeight(mobileSheetHeight ?? mobileSheetMetrics.defaultSheetHeight, mobileSheetMetrics)
    : 0;
  const mobileStablePreviewAvailableHeight = Math.max(0, viewportSize.height - headerHeight);
  const currentPageSettings = useMemo(
    () => pageSettingsByPage[currentPageIndex] ?? defaultPageSettingsFromHandwritingSettings(settings),
    [currentPageIndex, pageSettingsByPage, settings],
  );
  const currentPageLayout = useMemo(
    () => resolvePageLayout({ settings, pageSettings: currentPageSettings, pageIndex: currentPageIndex }),
    [currentPageIndex, currentPageSettings, settings],
  );
  const mobilePreviewMaxScale = useMemo(
    () =>
      computeMobilePreviewScale({
        availableWidth: viewportSize.width,
        availableHeight: mobileStablePreviewAvailableHeight,
        pageWidth: currentPageLayout.width,
        pageHeight: currentPageLayout.height,
      }),
    [currentPageLayout.height, currentPageLayout.width, mobileStablePreviewAvailableHeight, viewportSize.width],
  );
  const effectivePreviewScale = isMobileEditorLayout
    ? clampEditorPreviewScale(previewScale, mobilePreviewMaxScale, MOBILE_PREVIEW_MIN_SCALE)
    : clampEditorPreviewScale(previewScale, PREVIEW_MAX_SCALE, DESKTOP_PREVIEW_MIN_SCALE);

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

  const handlePreviewScaleChange = useCallback(
    (value: number) => {
      const maxScale = isMobileEditorLayout ? mobilePreviewMaxScale : PREVIEW_MAX_SCALE;
      const minScale = isMobileEditorLayout ? MOBILE_PREVIEW_MIN_SCALE : DESKTOP_PREVIEW_MIN_SCALE;
      setPreviewScale(clampEditorPreviewScale(value, maxScale, minScale));
    },
    [isMobileEditorLayout, mobilePreviewMaxScale],
  );

  const handleMobileSheetHeightChange = useCallback((height: number) => {
    setMobileSheetHeight((prev) => (prev === height ? prev : height));
  }, []);

  const handleEditorTypingFocus = useCallback(() => {
    if (!isMobileEditorLayout) return;
    setMobileSheetAnchor('peek');
    setMobileSheetHeight(mobileSheetMetrics.minSheetHeight);
  }, [isMobileEditorLayout, mobileSheetMetrics.minSheetHeight]);

  const handleMobileSheetHandlePress = useCallback(() => {
    blurActiveTextInput();
    setMobileSheetAnchor((prev) => {
      if (prev === 'peek') return 'default';
      if (prev === 'default') return 'expanded';
      return 'default';
    });
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

  const settingsPanel = (
    <MemoSettingsPanel
      settings={settings}
      onSettingsChange={handleSettingsChange}
      pageSettings={currentPageSettings}
      onPageSettingsChange={handlePageSettingsChange}
      currentPageIndex={currentPageIndex}
      onApplyToAllPages={applyCurrentPageSettingsToAll}
      previewScale={effectivePreviewScale}
      onPreviewScaleChange={handlePreviewScaleChange}
      onCurrentPageChange={handleCurrentPageChange}
      totalPages={totalPages}
      isPaginationComplete={isPaginationComplete}
      pages={pages}
      onClearAll={handleClearAll}
    />
  );

  const exportPanel = (
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
  );

  return (
    <div className="h-[100dvh] bg-white flex flex-col overflow-hidden">
      <header ref={headerRef} className="border-b border-gray-200 shrink-0 bg-white" role="banner">
        <div className="max-w-full mx-auto px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-bold text-2xl sm:text-3xl font-dancing-script hover:opacity-80 transition-opacity">
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
        {!isMobileEditorLayout && (
          <>
            <div
              className={`hidden xl:flex bg-white border-r border-gray-200 flex-col min-h-0 transition-all duration-300 ${sidebarOpen ? 'w-96' : 'w-0'} overflow-hidden`}
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
                {activePanel === 'settings' ? settingsPanel : exportPanel}
              </div>
              <div className="shrink-0 py-2 px-4 border-t border-gray-100 flex justify-center bg-gray-50/50">
                <Version />
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`hidden xl:block fixed top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-r-xl p-3 shadow-xl hover:shadow-2xl transition-all duration-300 group ${sidebarOpen ? 'left-[384px]' : 'left-0'}`}
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {sidebarOpen ? (
                <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-[#E0A32A] transition-colors" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#E0A32A] transition-colors" />
              )}
            </button>
          </>
        )}

        <div
          data-testid="preview-scroll-container"
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-gray-100"
          style={isMobileEditorLayout ? { paddingBottom: effectiveMobileSheetHeight } : undefined}
        >
          <div className={`min-h-full flex justify-center ${isMobileEditorLayout ? 'px-4 py-3' : 'py-12 px-6'}`}>
            <HandwritingEditor
              text={text}
              onTextChange={setText}
              settings={settings}
              onSettingsChange={handleSettingsChange}
              pageSettingsByPage={pageSettingsByPage}
              onPageSettingsChange={handlePageSettingsChange}
              exportingPageIndex={exportPageIndex}
              previewScale={effectivePreviewScale}
              onPreviewScaleChange={handlePreviewScaleChange}
              currentPageIndex={currentPageIndex}
              onCurrentPageChange={handleCurrentPageChange}
              onTotalPagesChange={handleTotalPagesChange}
              onPagesChange={setPages}
              onPaginationCompleteChange={setIsPaginationComplete}
              onApplyToAllPages={applyCurrentPageSettingsToAll}
              isMobileLayout={isMobileEditorLayout}
              onTypingFocus={handleEditorTypingFocus}
            />
          </div>
        </div>
      </div>

      {isMobileEditorLayout && (
        <MobileEditorBottomSheet
          activePanel={activePanel}
          anchor={mobileSheetAnchor}
          metrics={mobileSheetMetrics}
          settingsPanel={settingsPanel}
          exportPanel={exportPanel}
          onActivePanelChange={setActivePanel}
          onAnchorChange={setMobileSheetAnchor}
          onHandlePress={handleMobileSheetHandlePress}
          onHeightChange={handleMobileSheetHeightChange}
        />
      )}
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
