import { describe, expect, it } from 'vitest';
import {
  classifyMobileSheetAnchor,
  clampMobileSheetHeight,
  computeMobileEditorSheetMetrics,
  computeMobilePreviewScale,
  createMobileSheetSnapPoints,
  getMobileSheetAnchorSnapIndex,
  getMobileSheetHandleLabel,
  resolveMobileSheetSnapHeight,
} from '@/lib/mobileEditorSheet';

describe('mobile editor sheet metrics', () => {
  it('keeps expanded height below the protected phone preview strip', () => {
    const metrics = computeMobileEditorSheetMetrics({
      viewportHeight: 844,
      viewportWidth: 390,
      headerHeight: 72,
    });

    expect(metrics.minPreviewHeight).toBe(180);
    expect(metrics.maxSheetHeight).toBeLessThanOrEqual(844 - 72 - 180);
    expect(metrics.defaultSheetHeight).toBeGreaterThan(metrics.minSheetHeight);
    expect(metrics.defaultSheetHeight).toBeLessThanOrEqual(metrics.maxSheetHeight);
  });

  it('preserves a larger preview strip for tablet portrait widths', () => {
    const metrics = computeMobileEditorSheetMetrics({
      viewportHeight: 1024,
      viewportWidth: 768,
      headerHeight: 72,
    });

    expect(metrics.minPreviewHeight).toBe(280);
    expect(metrics.maxSheetHeight).toBe(1024 - 72 - 280);
  });

  it('never allows the sheet below the handle-only peek height', () => {
    const metrics = computeMobileEditorSheetMetrics({
      viewportHeight: 500,
      viewportWidth: 320,
      headerHeight: 80,
      safeAreaBottom: 8,
    });

    expect(metrics.minSheetHeight).toBe(48);
    expect(clampMobileSheetHeight(0, metrics)).toBe(48);
  });

  it('builds dense snap points while keeping the library-required closed and full anchors', () => {
    const metrics = computeMobileEditorSheetMetrics({
      viewportHeight: 844,
      viewportWidth: 390,
      headerHeight: 72,
    });

    const snapPoints = createMobileSheetSnapPoints(metrics, 48);
    const resolvedHeights = snapPoints.map((point) => resolveMobileSheetSnapHeight(point, metrics.maxSheetHeight));

    expect(snapPoints[0]).toBe(0);
    expect(snapPoints.at(-1)).toBe(1);
    expect(resolvedHeights).toEqual([...resolvedHeights].sort((a, b) => a - b));
    expect(resolvedHeights).toContain(metrics.minSheetHeight);
    expect(resolvedHeights.at(-1)).toBe(metrics.maxSheetHeight);
  });

  it('maps conceptual anchors to nearest snap points', () => {
    const metrics = computeMobileEditorSheetMetrics({
      viewportHeight: 844,
      viewportWidth: 390,
      headerHeight: 72,
    });
    const snapPoints = createMobileSheetSnapPoints(metrics, 48);

    const peekIndex = getMobileSheetAnchorSnapIndex('peek', snapPoints, metrics);
    const expandedIndex = getMobileSheetAnchorSnapIndex('expanded', snapPoints, metrics);

    expect(resolveMobileSheetSnapHeight(snapPoints[peekIndex], metrics.maxSheetHeight)).toBe(metrics.minSheetHeight);
    expect(resolveMobileSheetSnapHeight(snapPoints[expandedIndex], metrics.maxSheetHeight)).toBe(metrics.maxSheetHeight);
  });

  it('classifies handle labels from the current conceptual state', () => {
    const metrics = computeMobileEditorSheetMetrics({
      viewportHeight: 844,
      viewportWidth: 390,
      headerHeight: 72,
    });

    expect(classifyMobileSheetAnchor(metrics.minSheetHeight, metrics)).toBe('peek');
    expect(classifyMobileSheetAnchor(metrics.defaultSheetHeight, metrics)).toBe('default');
    expect(classifyMobileSheetAnchor(metrics.maxSheetHeight, metrics)).toBe('expanded');
    expect(getMobileSheetHandleLabel('peek')).toBe('Open editor controls');
    expect(getMobileSheetHandleLabel('default')).toBe('Expand editor controls');
    expect(getMobileSheetHandleLabel('expanded')).toBe('Collapse editor controls');
  });
});

describe('mobile preview scale', () => {
  it('allows the preview to scale below the desktop minimum to fit small phones', () => {
    const scale = computeMobilePreviewScale({
      availableWidth: 390,
      availableHeight: 360,
    });

    expect(scale).toBeGreaterThanOrEqual(0.2);
    expect(scale).toBeLessThan(0.5);
  });

  it('stays stable for sheet anchor changes when caller keeps available height stable', () => {
    const stableViewportHeight = 844 - 72;
    const scaleAtPeek = computeMobilePreviewScale({
      availableWidth: 390,
      availableHeight: stableViewportHeight,
    });
    const scaleAtDefault = computeMobilePreviewScale({
      availableWidth: 390,
      availableHeight: stableViewportHeight,
    });
    const scaleAtExpanded = computeMobilePreviewScale({
      availableWidth: 390,
      availableHeight: stableViewportHeight,
    });

    expect(scaleAtPeek).toBe(scaleAtDefault);
    expect(scaleAtDefault).toBe(scaleAtExpanded);
  });
});
