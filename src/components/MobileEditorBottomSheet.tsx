'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Sheet, type SheetRef } from 'react-modal-sheet';
import {
  classifyMobileSheetAnchor,
  createMobileSheetSnapPoints,
  getMobileSheetAnchorSnapIndex,
  getMobileSheetHandleLabel,
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
  const snapPoints = useMemo(() => createMobileSheetSnapPoints(metrics), [metrics]);
  const initialSnap = useMemo(
    () => getMobileSheetAnchorSnapIndex(anchor, snapPoints, metrics),
    [anchor, metrics, snapPoints],
  );

  const updateHeightFromSnapIndex = useCallback(
    (index: number) => {
      const snapPoint = snapPoints[index] ?? metrics.minSheetHeight;
      const height = resolveMobileSheetSnapHeight(snapPoint, metrics.maxSheetHeight);
      onHeightChange(height);
      const nextAnchor = classifyMobileSheetAnchor(height, metrics);
      observedAnchorRef.current = nextAnchor;
      onAnchorChange(nextAnchor);
    },
    [metrics, onAnchorChange, onHeightChange, snapPoints],
  );

  useEffect(() => {
    if (observedAnchorRef.current === anchor) {
      observedAnchorRef.current = null;
      return;
    }

    const index = getMobileSheetAnchorSnapIndex(anchor, snapPoints, metrics);
    const height = resolveMobileSheetSnapHeight(snapPoints[index] ?? metrics.minSheetHeight, metrics.maxSheetHeight);
    sheetRef.current?.snapTo(index);
    onHeightChange(height);
  }, [anchor, metrics, onHeightChange, snapPoints]);

  const handleDrag = useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const height = Math.round(sheet.height - sheet.y.get());
    onHeightChange(Math.min(metrics.maxSheetHeight, Math.max(metrics.minSheetHeight, height)));
  }, [metrics.maxSheetHeight, metrics.minSheetHeight, onHeightChange]);

  const handleClose = useCallback(() => {
    const index = getMobileSheetAnchorSnapIndex('peek', snapPoints, metrics);
    sheetRef.current?.snapTo(index);
    onHeightChange(metrics.minSheetHeight);
    onAnchorChange('peek');
  }, [metrics, onAnchorChange, onHeightChange, snapPoints]);

  const handleLabel = getMobileSheetHandleLabel(anchor);

  return (
    <Sheet
      ref={sheetRef}
      isOpen
      avoidKeyboard
      disableDismiss
      disableScrollLocking
      initialSnap={initialSnap}
      snapPoints={snapPoints}
      className="mobile-editor-sheet"
      dragCloseThreshold={0}
      dragVelocityThreshold={850}
      onClose={handleClose}
      onDrag={handleDrag}
      onSnap={updateHeightFromSnapIndex}
    >
      <Sheet.Container
        className="mobile-editor-sheet__container border-t border-border bg-background shadow-2xl"
        style={
          {
            '--mobile-editor-sheet-max-height': `${metrics.maxSheetHeight}px`,
            '--mobile-editor-sheet-peek-height': `${metrics.minSheetHeight}px`,
          } as React.CSSProperties
        }
      >
        <Sheet.Header className="mobile-editor-sheet__header bg-background">
          <button
            type="button"
            className="flex min-h-10 w-full touch-none items-center justify-center rounded-t-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={handleLabel}
            aria-expanded={anchor !== 'peek'}
            onClick={onHandlePress}
          >
            <span className="h-1.5 w-14 rounded-full bg-border" aria-hidden="true" />
          </button>
          {anchor === 'peek' && (
            <div className="flex items-center justify-center gap-2 pb-3 pt-1 border-b border-border/50">
              {/* Page Controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onCurrentPageChange(Math.max(0, currentPageIndex - 1))}
                  disabled={currentPageIndex === 0}
                  className="h-8 w-8 text-muted-foreground hover:text-brand-accent transition-all focus-visible:ring-offset-background"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-semibold text-foreground min-w-[70px] text-center select-none">
                  Page {currentPageIndex + 1} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    onCurrentPageChange(
                      isPaginationComplete
                        ? Math.min(pages.length - 1, currentPageIndex + 1)
                        : currentPageIndex + 1
                    )
                  }
                  disabled={isPaginationComplete && currentPageIndex >= pages.length - 1}
                  className="h-8 w-8 text-muted-foreground hover:text-brand-accent transition-all focus-visible:ring-offset-background"
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
                  size="icon"
                  onClick={() => onPreviewScaleChange(Number((previewScale - 0.1).toFixed(2)))}
                  className="h-8 w-8 text-muted-foreground hover:text-brand-accent transition-all focus-visible:ring-offset-background"
                  aria-label="Zoom out"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-xs font-semibold text-foreground min-w-[45px] text-center select-none">
                  {Math.round(previewScale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onPreviewScaleChange(Number((previewScale + 0.1).toFixed(2)))}
                  className="h-8 w-8 text-muted-foreground hover:text-brand-accent transition-all focus-visible:ring-offset-background"
                  aria-label="Zoom in"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Sheet.Header>

        <Sheet.Content
          disableDrag
          className="min-h-0 bg-background"
          scrollClassName="mobile-editor-sheet__scroller"
        >
          <div className="min-h-full bg-background">
            <div className="min-h-0">
              {anchor !== 'peek' && settingsPanel}
            </div>
          </div>
        </Sheet.Content>
      </Sheet.Container>
    </Sheet>
  );
}
