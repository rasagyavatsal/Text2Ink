'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MobileEditorBottomSheet from '@/components/MobileEditorBottomSheet';
import {
  clampPreviewScale,
  clampMobileSheetHeight,
  computeMobileEditorSheetMetrics,
  computeMobilePreviewScale,
  MOBILE_PREVIEW_MIN_SCALE,
  type MobileSheetAnchor,
} from '@/lib/mobileEditorSheet';
import { computeKeyboardObstructionHeight, resolveMobilePreviewScrollInset } from '@/lib/mobilePreviewScrollInset';
import type { EditorSidebarViewId } from '@/lib/editorShell';

const DEFAULT_VIEWPORT_METRICS = {
  layoutWidth: 390,
  layoutHeight: 844,
  visualWidth: 390,
  visualHeight: 844,
  visualOffsetTop: 0,
  safeAreaBottom: 0,
};

function readSafeAreaBottom() {
  if (typeof window === 'undefined') return 0;

  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue('--safe-area-inset-bottom')
    .trim();
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readViewportMetrics() {
  if (typeof window === 'undefined') return DEFAULT_VIEWPORT_METRICS;

  const visualViewport = window.visualViewport;
  return {
    layoutWidth: Math.round(window.innerWidth),
    layoutHeight: Math.round(window.innerHeight),
    visualWidth: Math.round(visualViewport?.width ?? window.innerWidth),
    visualHeight: Math.round(visualViewport?.height ?? window.innerHeight),
    visualOffsetTop: Math.round(visualViewport?.offsetTop ?? 0),
    safeAreaBottom: readSafeAreaBottom(),
  };
}

function useViewportMetrics() {
  const [viewportMetrics, setViewportMetrics] = useState(DEFAULT_VIEWPORT_METRICS);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setViewportMetrics(readViewportMetrics()));
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);

  return viewportMetrics;
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

export type MobilePreviewControlSheetPreviewProps = {
  previewScale: number;
  onPreviewEditingChange: (isPreviewEditing: boolean) => void;
};

export type MobilePreviewControlSheetSettingsProps = {
  previewScale: number;
  onPreviewScaleChange: (value: number) => void;
};

interface MobilePreviewControlSheetProps {
  activePanel: EditorSidebarViewId;
  exportPanel: React.ReactNode;
  headerHeight: number;
  pageHeight: number;
  pageWidth: number;
  rawPreviewScale: number;
  onActivePanelChange: (panel: EditorSidebarViewId) => void;
  onRawPreviewScaleChange: (value: number) => void;
  Preview: React.ComponentType<MobilePreviewControlSheetPreviewProps>;
  SettingsPanel: React.ComponentType<MobilePreviewControlSheetSettingsProps>;
}

export default function MobilePreviewControlSheet({
  activePanel,
  exportPanel,
  headerHeight,
  pageHeight,
  pageWidth,
  rawPreviewScale,
  onActivePanelChange,
  onRawPreviewScaleChange,
  Preview,
  SettingsPanel,
}: MobilePreviewControlSheetProps) {
  const viewportMetrics = useViewportMetrics();
  const [mobileSheetAnchor, setMobileSheetAnchor] = useState<MobileSheetAnchor>('default');
  const [mobileSheetHeight, setMobileSheetHeight] = useState<number | null>(null);
  const [isPreviewEditing, setIsPreviewEditing] = useState(false);
  const previewEditingBlurTimeoutRef = useRef<number | null>(null);

  const mobileSheetMetrics = useMemo(
    () =>
      computeMobileEditorSheetMetrics({
        viewportHeight: viewportMetrics.layoutHeight,
        viewportWidth: viewportMetrics.layoutWidth,
        headerHeight,
        safeAreaBottom: viewportMetrics.safeAreaBottom,
      }),
    [headerHeight, viewportMetrics.layoutHeight, viewportMetrics.layoutWidth, viewportMetrics.safeAreaBottom],
  );

  const effectiveMobileSheetHeight = clampMobileSheetHeight(
    mobileSheetHeight ?? mobileSheetMetrics.defaultSheetHeight,
    mobileSheetMetrics,
  );
  const keyboardObstructionHeight = computeKeyboardObstructionHeight({
    layoutViewportHeight: viewportMetrics.layoutHeight,
    visualViewportHeight: viewportMetrics.visualHeight,
    visualViewportOffsetTop: viewportMetrics.visualOffsetTop,
  });
  const previewScrollInset = useMemo(
    () =>
      resolveMobilePreviewScrollInset({
        controlSheetInset: effectiveMobileSheetHeight,
        isPreviewEditing,
        keyboardObstructionHeight,
      }),
    [effectiveMobileSheetHeight, isPreviewEditing, keyboardObstructionHeight],
  );
  const mobileStablePreviewAvailableHeight = Math.max(0, viewportMetrics.layoutHeight - headerHeight);
  const mobilePreviewMaxScale = useMemo(
    () =>
      computeMobilePreviewScale({
        availableWidth: viewportMetrics.layoutWidth,
        availableHeight: mobileStablePreviewAvailableHeight,
        pageWidth,
        pageHeight,
      }),
    [mobileStablePreviewAvailableHeight, pageHeight, pageWidth, viewportMetrics.layoutWidth],
  );
  const effectivePreviewScale = clampPreviewScale(rawPreviewScale, mobilePreviewMaxScale, MOBILE_PREVIEW_MIN_SCALE);

  useEffect(() => {
    return () => {
      if (previewEditingBlurTimeoutRef.current !== null) {
        window.clearTimeout(previewEditingBlurTimeoutRef.current);
      }
    };
  }, []);

  const handlePreviewScaleChange = useCallback(
    (value: number) => {
      onRawPreviewScaleChange(clampPreviewScale(value, mobilePreviewMaxScale, MOBILE_PREVIEW_MIN_SCALE));
    },
    [mobilePreviewMaxScale, onRawPreviewScaleChange],
  );

  const handleMobileSheetHeightChange = useCallback((height: number) => {
    setMobileSheetHeight((prev) => (prev === height ? prev : height));
  }, []);

  const handlePreviewEditingChange = useCallback(
    (nextIsPreviewEditing: boolean) => {
      if (previewEditingBlurTimeoutRef.current !== null) {
        window.clearTimeout(previewEditingBlurTimeoutRef.current);
        previewEditingBlurTimeoutRef.current = null;
      }

      if (nextIsPreviewEditing) {
        setIsPreviewEditing(true);
        setMobileSheetAnchor('peek');
        setMobileSheetHeight(mobileSheetMetrics.minSheetHeight);
        return;
      }

      previewEditingBlurTimeoutRef.current = window.setTimeout(() => {
        setIsPreviewEditing(false);
        previewEditingBlurTimeoutRef.current = null;
      }, 0);
    },
    [mobileSheetMetrics.minSheetHeight],
  );

  const handleMobileSheetHandlePress = useCallback(() => {
    blurActiveTextInput();
    if (previewScrollInset.source === 'keyboard') return;

    setMobileSheetAnchor((prev) => {
      if (prev === 'peek') return 'default';
      if (prev === 'default') return 'expanded';
      return 'default';
    });
  }, [previewScrollInset.source]);

  return (
    <>
      <div
        data-testid="preview-scroll-container"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--t2i-surface-app)]"
        style={{ paddingBottom: previewScrollInset.inset }}
      >
        <div className="flex min-h-full justify-center px-4 py-3">
          <Preview
            previewScale={effectivePreviewScale}
            onPreviewEditingChange={handlePreviewEditingChange}
          />
        </div>
      </div>

      <MobileEditorBottomSheet
        activePanel={activePanel}
        anchor={mobileSheetAnchor}
        metrics={mobileSheetMetrics}
        settingsPanel={
          <SettingsPanel
            previewScale={effectivePreviewScale}
            onPreviewScaleChange={handlePreviewScaleChange}
          />
        }
        exportPanel={exportPanel}
        onActivePanelChange={onActivePanelChange}
        onAnchorChange={setMobileSheetAnchor}
        onHandlePress={handleMobileSheetHandlePress}
        onHeightChange={handleMobileSheetHeightChange}
      />
    </>
  );
}
