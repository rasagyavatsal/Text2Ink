'use client';

import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import NextImage from 'next/image';
import Link from 'next/link';
import HandwritingEditor from '@/components/HandwritingEditor';
import SettingsPanel from '@/components/SettingsPanel';
import ExportModal from '@/components/ExportModal';
import Version from '@/components/Version';
import MobileEditorBottomSheet from '@/components/MobileEditorBottomSheet';
import ThemePicker from '@/components/ThemePicker';
import WorkspaceShell from '@/components/patterns/WorkspaceShell';
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
import { loadEditorStateV1, saveEditorStateV1 } from '@/lib/editorPersistence';
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
  const persisted = loadEditorStateV1<HandwritingSettings, PageSettings>();
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
  if (typeof window === 'undefined') return 0;

  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue('--safe-area-inset-bottom')
    .trim();
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readCssPixelToken(property: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;

  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(property)
    .trim();
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

  // Header height comes from design tokens to stay in sync with the CSS system.
  const headerHeight = isMobileEditorLayout
    ? readCssPixelToken('--metric-header-height-mobile', 60)
    : readCssPixelToken('--metric-header-height-desktop', 68);

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
  const [exportPageIndex, setExportPageIndex] = useState<number | null>(null);
  
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
  const mobilePreviewMaxScale = useMemo(
    () =>
      computeMobilePreviewScale({
        availableWidth: viewportSize.width,
        availableHeight: mobileStablePreviewAvailableHeight,
      }),
    [mobileStablePreviewAvailableHeight, viewportSize.width],
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

  const topControls = (
    <div
      className={`max-w-full mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center ${
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
      <div className="flex items-center gap-3 sm:gap-4">
        <ThemePicker />
        <Button variant="outline" onClick={() => setIsExportModalOpen(true)}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        <Button variant="ghost" asChild>
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
      <WorkspaceShell
        topControls={topControls}
        settings={<div className="flex-1 min-h-0">{desktopSettingsPanel}<div className="shrink-0 py-2 px-4 border-t border-border flex justify-center bg-muted/50"><Version /></div></div>}
        canvas={canvas}
        mobileControlsSheet={mobileControlsSheet}
        isMobileTopControlsVisible={!isMobileEditorLayout || mobileSheetAnchor === 'peek'}
      />
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
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
