'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sheet, type SheetRef, useVirtualKeyboard } from 'react-modal-sheet';
import {
  classifyMobileSheetAnchor,
  createMobileSheetSnapPoints,
  getMobileSheetAnchorSnapIndex,
  getMobileSheetHandleLabel,
  MOBILE_SHEET_FOOTER_RESERVE,
  MobileEditorSheetMetrics,
  MobileSheetAnchor,
  resolveMobileSheetSnapHeight,
} from '@/lib/mobileEditorSheet';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';

interface MobileEditorBottomSheetProps {
  readonly anchor: MobileSheetAnchor;
  readonly metrics: MobileEditorSheetMetrics;
  readonly settingsPanel: React.ReactNode;
  readonly onAnchorChange: (anchor: MobileSheetAnchor) => void;
  readonly onHandlePress: () => void;
  readonly onHeightChange: (height: number) => void;
  readonly currentPageIndex: number;
  readonly totalPages: number;
  readonly isPaginationComplete: boolean;
  readonly pages: unknown[][];
  readonly previewScale: number;
  readonly onCurrentPageChange: (index: number) => void;
  readonly onPreviewScaleChange: (scale: number) => void;
}

interface PageZoomControlsProps {
  readonly currentPageIndex: number;
  readonly totalPages: number;
  readonly isPaginationComplete: boolean;
  readonly pages: unknown[][];
  readonly previewScale: number;
  readonly onCurrentPageChange: (index: number) => void;
  readonly onPreviewScaleChange: (scale: number) => void;
}

type ScheduledSnapAttempt =
  | { readonly type: 'frame'; readonly id: number }
  | { readonly type: 'timeout'; readonly id: ReturnType<typeof setTimeout> };

function scheduleSnapAttempt(callback: () => void): ScheduledSnapAttempt {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return { type: 'frame', id: window.requestAnimationFrame(callback) };
  }

  return { type: 'timeout', id: setTimeout(callback, 16) };
}

function cancelSnapAttempt(attempt: ScheduledSnapAttempt | null) {
  if (!attempt) return;

  if (
    attempt.type === 'frame' &&
    typeof window !== 'undefined' &&
    typeof window.cancelAnimationFrame === 'function'
  ) {
    window.cancelAnimationFrame(attempt.id);
    return;
  }

  if (attempt.type === 'timeout') {
    clearTimeout(attempt.id);
  }
}

function PageZoomControls({
  currentPageIndex,
  totalPages,
  isPaginationComplete,
  pages,
  previewScale,
  onCurrentPageChange,
  onPreviewScaleChange,
}: PageZoomControlsProps) {
  return (
    <div className="flex w-full items-center justify-center gap-2 px-3">
      {/* Page Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={() => onCurrentPageChange(Math.max(0, currentPageIndex - 1))}
          disabled={currentPageIndex === 0}
          className="h-11 w-11 text-muted-foreground hover:text-brand-accent transition-all focus-visible:ring-offset-background"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="min-w-[70px] select-none text-center text-xs font-semibold text-foreground">
          Page {currentPageIndex + 1} of {totalPages}
        </span>
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={() =>
            onCurrentPageChange(
              isPaginationComplete
                ? Math.min(pages.length - 1, currentPageIndex + 1)
                : currentPageIndex + 1
            )
          }
          disabled={isPaginationComplete && currentPageIndex >= pages.length - 1}
          className="h-11 w-11 text-muted-foreground hover:text-brand-accent transition-all focus-visible:ring-offset-background"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-border mx-1" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={() => onPreviewScaleChange(Number((previewScale - 0.1).toFixed(2)))}
          className="h-11 w-11 text-muted-foreground hover:text-brand-accent transition-all focus-visible:ring-offset-background"
          aria-label="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </Button>
        <span className="min-w-[45px] select-none text-center text-xs font-semibold text-foreground">
          {Math.round(previewScale * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={() => onPreviewScaleChange(Number((previewScale + 0.1).toFixed(2)))}
          className="h-11 w-11 text-muted-foreground hover:text-brand-accent transition-all focus-visible:ring-offset-background"
          aria-label="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function MobileEditorBottomSheet({
  anchor,
  metrics,
  settingsPanel,
  onAnchorChange,
  onHandlePress,
  onHeightChange,
  currentPageIndex,
  totalPages,
  isPaginationComplete,
  pages,
  previewScale,
  onCurrentPageChange,
  onPreviewScaleChange,
}: MobileEditorBottomSheetProps) {
  const sheetRef = useRef<SheetRef | null>(null);
  const observedAnchorRef = useRef<MobileSheetAnchor | null>(null);
  const sheetReadyRef = useRef(false);
  const [isSheetReady, setIsSheetReady] = useState(false);
  const { keyboardHeight } = useVirtualKeyboard();

  const scrollStyle = useMemo(() => {
    return {
      paddingBottom: `${MOBILE_SHEET_FOOTER_RESERVE + (metrics.safeAreaBottom ?? 0) + keyboardHeight}px`,
    };
  }, [metrics.safeAreaBottom, keyboardHeight]);

  const snapPoints = useMemo(() => createMobileSheetSnapPoints(metrics), [metrics]);
  const hasValidSnapPoints =
    snapPoints.length > 0 &&
    metrics.minSheetHeight > 0 &&
    metrics.maxSheetHeight >= metrics.minSheetHeight;
  const peekSnapIndex = useMemo(
    () => getMobileSheetAnchorSnapIndex('peek', snapPoints, metrics),
    [metrics, snapPoints],
  );
  const anchorSnapIndex = useMemo(
    () => getMobileSheetAnchorSnapIndex(anchor, snapPoints, metrics),
    [anchor, metrics, snapPoints],
  );
  const sheetStyleVars = useMemo(
    () =>
      ({
        '--mobile-editor-sheet-max-height': `${metrics.maxSheetHeight}px`,
        '--mobile-editor-sheet-peek-height': `${metrics.minSheetHeight}px`,
      }) as React.CSSProperties,
    [metrics.maxSheetHeight, metrics.minSheetHeight],
  );

  const updateHeightFromSnapIndex = useCallback(
    (index: number) => {
      if (!hasValidSnapPoints) return;
      const snapPoint = snapPoints[index] ?? metrics.minSheetHeight;
      const height = resolveMobileSheetSnapHeight(snapPoint, metrics.maxSheetHeight);
      onHeightChange(height);
      const nextAnchor = classifyMobileSheetAnchor(height, metrics);
      observedAnchorRef.current = nextAnchor;
      onAnchorChange(nextAnchor);
    },
    [hasValidSnapPoints, metrics, onAnchorChange, onHeightChange, snapPoints],
  );

  useEffect(() => {
    if (!hasValidSnapPoints) {
      sheetReadyRef.current = false;
      return;
    }

    if (sheetReadyRef.current && observedAnchorRef.current === anchor) {
      observedAnchorRef.current = null;
      return;
    }
    observedAnchorRef.current = null;

    const index = anchorSnapIndex;
    const height = resolveMobileSheetSnapHeight(snapPoints[index] ?? metrics.minSheetHeight, metrics.maxSheetHeight);
    onHeightChange(height);
    const shouldSkipSnapTo = !sheetReadyRef.current && anchor === 'peek';

    let scheduledAttempt: ScheduledSnapAttempt | null = null;
    let attempts = 0;
    const snapWhenMeasured = () => {
      const sheet = sheetRef.current;
      const measuredHeight = sheet?.height ?? 0;

      if (measuredHeight <= 0 && attempts < 12) {
        attempts += 1;
        scheduledAttempt = scheduleSnapAttempt(snapWhenMeasured);
        return;
      }

      if (sheet && !shouldSkipSnapTo) {
        sheet.snapTo(index);
      }

      sheetReadyRef.current = true;
      setIsSheetReady(true);
    };

    scheduledAttempt = scheduleSnapAttempt(snapWhenMeasured);

    return () => cancelSnapAttempt(scheduledAttempt);
  }, [anchor, anchorSnapIndex, hasValidSnapPoints, metrics, onHeightChange, snapPoints]);

  const handleDrag = useCallback(() => {
    if (!isSheetReady) return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    const height = Math.round(sheet.height - sheet.y.get());
    onHeightChange(Math.min(metrics.maxSheetHeight, Math.max(metrics.minSheetHeight, height)));
  }, [isSheetReady, metrics.maxSheetHeight, metrics.minSheetHeight, onHeightChange]);

  const handleClose = useCallback(() => {
    if (!hasValidSnapPoints) return;
    const index = getMobileSheetAnchorSnapIndex('peek', snapPoints, metrics);
    sheetRef.current?.snapTo(index);
    onHeightChange(metrics.minSheetHeight);
    onAnchorChange('peek');
  }, [hasValidSnapPoints, metrics, onAnchorChange, onHeightChange, snapPoints]);

  const handleLabel = getMobileSheetHandleLabel(anchor);
  const canInteract = hasValidSnapPoints && isSheetReady;

  return (
    <>
      <Sheet
        ref={sheetRef}
        isOpen
        avoidKeyboard
        disableDismiss
        disableScrollLocking
        initialSnap={peekSnapIndex}
        snapPoints={snapPoints}
        className={`mobile-editor-sheet${canInteract ? '' : ' mobile-editor-sheet--preparing'}`}
        dragCloseThreshold={0}
        dragVelocityThreshold={850}
        onClose={handleClose}
        onDrag={handleDrag}
        onSnap={updateHeightFromSnapIndex}
      >
        <Sheet.Container
          className="mobile-editor-sheet__container border-t border-border bg-background shadow-2xl"
          style={sheetStyleVars}
        >
          <Sheet.Header className="mobile-editor-sheet__header bg-background">
            <button
              type="button"
              className="flex min-h-11 w-full touch-none items-center justify-center rounded-t-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={handleLabel}
              aria-expanded={anchor !== 'peek'}
              onClick={onHandlePress}
            >
              <span className="h-1.5 w-14 rounded-full bg-border" aria-hidden="true" />
            </button>
          </Sheet.Header>

          <Sheet.Content
            disableDrag
            className="mobile-editor-sheet__content min-h-0 bg-background"
            scrollClassName="mobile-editor-sheet__scroller"
            scrollStyle={scrollStyle}
          >
            <div className="min-h-full bg-background">
              <div className="min-h-0">
                {anchor !== 'peek' && settingsPanel}
              </div>
            </div>
          </Sheet.Content>
        </Sheet.Container>
      </Sheet>

      <div
        className={`mobile-editor-sheet__footer${canInteract ? '' : ' mobile-editor-sheet__footer--preparing'}`}
        style={{
          ...sheetStyleVars,
          bottom: `${keyboardHeight}px`,
        }}
      >
        <PageZoomControls
          currentPageIndex={currentPageIndex}
          totalPages={totalPages}
          isPaginationComplete={isPaginationComplete}
          pages={pages}
          previewScale={previewScale}
          onCurrentPageChange={onCurrentPageChange}
          onPreviewScaleChange={onPreviewScaleChange}
        />
      </div>
    </>
  );
}
