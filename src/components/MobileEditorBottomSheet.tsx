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

interface MobileEditorBottomSheetProps {
  readonly anchor: MobileSheetAnchor;
  readonly metrics: MobileEditorSheetMetrics;
  readonly settingsPanel: React.ReactNode;
  readonly onAnchorChange: (anchor: MobileSheetAnchor) => void;
  readonly onHandlePress: () => void;
  readonly onHeightChange: (height: number) => void;
}

export default function MobileEditorBottomSheet({
  anchor,
  metrics,
  settingsPanel,
  onAnchorChange,
  onHandlePress,
  onHeightChange,
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
        </Sheet.Header>

        <Sheet.Content
          disableDrag
          className="min-h-0 bg-background"
          scrollClassName="mobile-editor-sheet__scroller"
        >
          <div className="min-h-full bg-background">
            <div className="min-h-0">
              {settingsPanel}
            </div>
          </div>
        </Sheet.Content>
      </Sheet.Container>
    </Sheet>
  );
}
