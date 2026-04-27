'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Sheet, type SheetRef } from 'react-modal-sheet';
import { Download, Settings } from 'lucide-react';
import {
  classifyMobileSheetAnchor,
  createMobileSheetSnapPoints,
  getMobileSheetAnchorSnapIndex,
  getMobileSheetHandleLabel,
  MobileEditorSheetMetrics,
  MobileSheetAnchor,
  resolveMobileSheetSnapHeight,
} from '@/lib/mobileEditorSheet';
import Version from '@/components/Version';
import { getEditorSidebarViews } from '@/lib/editorShell';
import { SidebarTabStrip } from '@/components/patterns/EditorPatterns';

interface MobileEditorBottomSheetProps {
  activePanel: 'settings' | 'export';
  anchor: MobileSheetAnchor;
  exportPanel: React.ReactNode;
  metrics: MobileEditorSheetMetrics;
  settingsPanel: React.ReactNode;
  onActivePanelChange: (panel: 'settings' | 'export') => void;
  onAnchorChange: (anchor: MobileSheetAnchor) => void;
  onHandlePress: () => void;
  onHeightChange: (height: number) => void;
}

export default function MobileEditorBottomSheet({
  activePanel,
  anchor,
  exportPanel,
  metrics,
  settingsPanel,
  onActivePanelChange,
  onAnchorChange,
  onHandlePress,
  onHeightChange,
}: MobileEditorBottomSheetProps) {
  const sheetRef = useRef<SheetRef | null>(null);
  const observedAnchorRef = useRef<MobileSheetAnchor | null>(null);
  const snapPoints = useMemo(() => createMobileSheetSnapPoints(metrics), [metrics]);
  const initialSnap = useMemo(
    () => getMobileSheetAnchorSnapIndex('default', snapPoints, metrics),
    [metrics, snapPoints],
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

  useEffect(() => {
    const clampedHeight = Math.min(metrics.maxSheetHeight, Math.max(metrics.minSheetHeight, metrics.defaultSheetHeight));
    onHeightChange(clampedHeight);
  }, [metrics.defaultSheetHeight, metrics.maxSheetHeight, metrics.minSheetHeight, onHeightChange]);

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
  const sidebarViews = getEditorSidebarViews().map((view) => ({
    ...view,
    icon: view.id === 'settings' ? Settings : Download,
  }));

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
        className="mobile-editor-sheet__container border-t border-[var(--t2i-border-default)] bg-[var(--t2i-surface-panel)] shadow-2xl"
        style={
          {
            '--mobile-editor-sheet-max-height': `${metrics.maxSheetHeight}px`,
            '--mobile-editor-sheet-peek-height': `${metrics.minSheetHeight}px`,
          } as React.CSSProperties
        }
      >
        <Sheet.Header className="mobile-editor-sheet__header bg-[var(--t2i-surface-panel)]">
          <button
            type="button"
            className="flex min-h-10 w-full touch-none items-center justify-center rounded-t-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--t2i-focus-ring)] focus-visible:ring-offset-2"
            aria-label={handleLabel}
            aria-expanded={anchor !== 'peek'}
            onClick={onHandlePress}
          >
            <span className="h-1.5 w-14 rounded-full bg-[var(--t2i-border-strong)]" aria-hidden="true" />
          </button>
        </Sheet.Header>

        <Sheet.Content
          disableDrag
          className="min-h-0 bg-[var(--t2i-surface-panel)]"
          scrollClassName="mobile-editor-sheet__scroller"
        >
          <div className="min-h-full bg-[var(--t2i-surface-panel)]">
            <div className="sticky top-0 z-10">
              <SidebarTabStrip
                activeView={activePanel}
                onViewChange={onActivePanelChange}
                views={sidebarViews}
              />
            </div>

            <div role="tabpanel" className="min-h-0">
              {activePanel === 'settings' ? settingsPanel : exportPanel}
            </div>

            <div className="border-t border-[var(--t2i-border-subtle)] bg-[var(--t2i-surface-panel-muted)] px-4 py-3 text-center">
              <Version />
            </div>
          </div>
        </Sheet.Content>
      </Sheet.Container>
    </Sheet>
  );
}
