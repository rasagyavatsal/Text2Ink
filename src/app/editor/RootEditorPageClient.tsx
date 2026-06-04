'use client';

import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import NextImage from 'next/image';
import Link from 'next/link';
import HandwritingEditor from '@/components/HandwritingEditor';
import SettingsPanel from '@/components/SettingsPanel';
import ExportModal from '@/components/ExportModal';
import MobileEditorBottomSheet from '@/components/MobileEditorBottomSheet';
import ThemePicker from '@/components/ThemePicker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  HandwritingSettings,
  DEFAULT_SETTINGS,
  PageSettings,
  defaultPageSettingsFromHandwritingSettings,
  LineData,
} from '@/lib/types';
import { loadNormalizedEditorStateV1, saveEditorStateV1 } from '@/lib/editorPersistence';
import { resolvePageLayout } from '@/lib/layout/LayoutEngine';
import { applyPageSettingsToAll } from '@/lib/settingsHelpers';
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
import { cn } from '@/lib/utils';
import { Download } from 'lucide-react';

const MemoSettingsPanel = React.memo(SettingsPanel);

type EditorInitialState = {
  text: string;
  settings: HandwritingSettings;
  pageSettingsByPage: PageSettings[];
  previewScale: number;
  currentPageIndex: number;
};

const DEFAULT_INITIAL_STATE: EditorInitialState = {
  text: '',
  settings: DEFAULT_SETTINGS,
  pageSettingsByPage: [defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS)],
  previewScale: 1,
  currentPageIndex: 0,
};

const getInitialEditorState = (): EditorInitialState => {
  const persisted = loadNormalizedEditorStateV1();
  if (!persisted) return DEFAULT_INITIAL_STATE;

  return {
    text: persisted.text,
    settings: persisted.settings,
    pageSettingsByPage:
      persisted.pageSettingsByPage.length > 0
        ? persisted.pageSettingsByPage
        : [defaultPageSettingsFromHandwritingSettings(persisted.settings)],
    previewScale: persisted.ui.previewScale,
    currentPageIndex: persisted.ui.currentPageIndex,
  };
};

const subscribeClientReady = () => () => {};
const getClientReadySnapshot = () => true;
const getServerReadySnapshot = () => false;

const DEFAULT_VIEWPORT_SIZE = { width: 390, height: 844, safeAreaBottom: 0 };

function readSafeAreaBottom() {
  if (typeof globalThis.window === 'undefined') return 0;

  const value = globalThis
    .getComputedStyle(document.documentElement)
    .getPropertyValue('--safe-area-inset-bottom')
    .trim();
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readViewportSize() {
  if (typeof globalThis.window === 'undefined') return DEFAULT_VIEWPORT_SIZE;
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
    if (typeof globalThis.window === 'undefined') return;

    let frame = 0;
    const update = () => {
      globalThis.cancelAnimationFrame(frame);
      frame = globalThis.requestAnimationFrame(() => setViewportSize(readViewportSize()));
    };

    update();
    window.addEventListener('resize', update);
    globalThis.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      globalThis.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      globalThis.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);

  return viewportSize;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return;
    const mediaQuery = globalThis.matchMedia(query);
    const update = () => setMatches(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, [query]);

  return matches;
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
  const viewportSize = useViewportSize();
  const isMobileEditorLayout = useMediaQuery(MOBILE_EDITOR_MEDIA_QUERY);

  // The invisible header has been removed so the canvas spans to the top.
  const headerHeight = 0;

  const [text, setText] = useState(resolvedInitialState.text);
  const [settings, setSettings] = useState<HandwritingSettings>(resolvedInitialState.settings);
  const [pageSettingsByPage, setPageSettingsByPage] = useState<PageSettings[]>(resolvedInitialState.pageSettingsByPage);
  const [previewScale, setPreviewScale] = useState(resolvedInitialState.previewScale);
  const [currentPageIndex, setCurrentPageIndex] = useState(resolvedInitialState.currentPageIndex);
  const [totalPages, setTotalPages] = useState(1);
  const [pages, setPages] = useState<LineData[][]>([]);
  const [isPaginationComplete, setIsPaginationComplete] = useState(true);
  
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  
  const [mobileSheetAnchor, setMobileSheetAnchor] = useState<MobileSheetAnchor>('peek');
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
  const currentPreviewLayout = useMemo(
    () =>
      resolvePageLayout({
        pageIndex: currentPageIndex,
        settings,
        pageSettings:
          pageSettingsByPage[currentPageIndex] ?? defaultPageSettingsFromHandwritingSettings(settings),
      }),
    [currentPageIndex, pageSettingsByPage, settings],
  );
  const mobilePreviewMaxScale = useMemo(
    () =>
      computeMobilePreviewScale({
        availableWidth: viewportSize.width,
        availableHeight: mobileStablePreviewAvailableHeight,
        pageWidth: currentPreviewLayout.page.width,
        pageHeight: currentPreviewLayout.page.height,
      }),
    [
      currentPreviewLayout.page.height,
      currentPreviewLayout.page.width,
      mobileStablePreviewAvailableHeight,
      viewportSize.width,
    ],
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

      const applySettingsToPage = (pageSettings: PageSettings) => ({
        ...pageSettings,
        inkColor: resolvedSettings.inkColor,
        paperColor: resolvedSettings.paperColor,
        lineColor: resolvedSettings.lineColor,
      });

      const applyToAllPages = (prevPageSettings: PageSettings[]) =>
        prevPageSettings.map(applySettingsToPage);

      setPageSettingsByPage(applyToAllPages);

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
          activePanel: 'settings', // Legacy support
          sidebarOpen: true, // Legacy support
          previewScale,
          currentPageIndex,
          editorMode: 'write',
        },
      });
    };

    const timeout = window.setTimeout(save, 400);
    return () => window.clearTimeout(timeout);
  }, [
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
          activePanel: 'settings',
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
    setIsClearConfirmOpen(true);
  }, []);

  const confirmClearAll = useCallback(() => {
    setText('');
    setCurrentPageIndex(0);
    handleSettingsChange((prev) => ({ ...prev, textFields: [] }));
    setPageSettingsByPage((prev) => prev.map((ps) => ({ ...ps, textFields: [] })));
    setIsClearConfirmOpen(false);
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

  const desktopSettingsPanel = (
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
      showHomeLink
    />
  );

  const mobileSettingsPanel = (
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
      showHomeLink={false}
    />
  );

  const desktopSettingsRail = (
    <div className="flex flex-1 min-h-0 flex-col">
      {desktopSettingsPanel}
    </div>
  );

  const topControls = (
    <div
      className={`w-full px-page-x py-chrome-y flex items-center ${
        isMobileEditorLayout ? 'justify-between' : 'justify-end'
      }`}
    >
      {isMobileEditorLayout ? (
        <Link
          href="/"
          aria-label="Text2Ink home"
          className="flex h-11 w-11 items-center justify-center transition-transform hover:scale-[1.03]"
        >
          <NextImage
            src="/logo-without-background.png"
            alt="Text2Ink logo"
            width={40}
            height={40}
            className="h-9 w-9 object-contain"
          />
        </Link>
      ) : null}
      <div className="flex items-center gap-chrome bg-background/80 backdrop-blur-md p-1.5 rounded-xl border border-border/50 shadow-sm">
        <ThemePicker variant="ghost" />
        <Button
          variant="brand"
          size="chrome"
          className="min-w-[7.5rem] px-4 has-[>svg]:px-4 shadow-sm"
          onClick={() => setIsExportModalOpen(true)}
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        <Button variant="ghost" size="chrome" asChild className="hidden sm:inline-flex">
          <Link href="/contact">
            Contact
          </Link>
        </Button>
      </div>
    </div>
  );

  const canvas = (
    <div
      data-testid="preview-scroll-container"
      className="absolute inset-x-0 bottom-0 overflow-y-auto overscroll-contain bg-muted"
      style={
        isMobileEditorLayout
          ? { top: headerHeight, paddingBottom: effectiveMobileSheetHeight }
          : { top: headerHeight }
      }
    >
      <div className={`min-h-full flex justify-center ${isMobileEditorLayout ? 'px-page-x pt-[80px] pb-chrome-y' : 'px-page-x py-section'}`}>
        <HandwritingEditor
          text={text}
          onTextChange={setText}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          pageSettingsByPage={pageSettingsByPage}
          onPageSettingsChange={handlePageSettingsChange}
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
  );

  const mobileControlsSheet = isMobileEditorLayout ? (
    <MobileEditorBottomSheet
      anchor={mobileSheetAnchor}
      metrics={mobileSheetMetrics}
      settingsPanel={mobileSettingsPanel}
      onAnchorChange={setMobileSheetAnchor}
      onHandlePress={handleMobileSheetHandlePress}
      onHeightChange={handleMobileSheetHeightChange}
    />
  ) : null;

  return (
    <>
      <div className="relative h-[100dvh] overflow-hidden bg-background">
        <div
          className={cn(
            'fixed inset-x-0 top-0 z-20 transition-transform xl:left-panel',
            isMobileEditorLayout && mobileSheetAnchor !== 'peek' && 'hidden xl:block',
          )}
        >
          {topControls}
        </div>

        <div className="flex h-full min-h-0 box-border overflow-hidden bg-muted">
          <aside className="hidden xl:flex flex-col w-panel shrink-0 bg-background border-r border-border overflow-y-auto overscroll-contain">
            {desktopSettingsRail}
          </aside>

          <main className="flex-1 min-h-0 relative">
            {canvas}
          </main>
        </div>

        {mobileControlsSheet ? (
          <div className="xl:hidden">
            {mobileControlsSheet}
          </div>
        ) : null}
      </div>
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        text={text}
        settings={settings}
        pageSettingsByPage={pageSettingsByPage}
      />
      <Dialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Everything</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove all text and text fields from all pages? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setIsClearConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmClearAll}
            >
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
