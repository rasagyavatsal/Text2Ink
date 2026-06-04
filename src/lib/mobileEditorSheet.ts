import { PAGE_HEIGHT, PAGE_WIDTH } from '@/lib/pageConstants';

export type MobileSheetAnchor = 'peek' | 'default' | 'expanded';

const DEFAULT_DESKTOP_BREAKPOINT_PX = 1280;

function readCssPixelToken(property: string, fallback: number): number {
  if (typeof globalThis.window === 'undefined') return fallback;
  const value = globalThis
    .getComputedStyle(document.documentElement)
    .getPropertyValue(property)
    .trim();
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getDesktopBreakpointPx(): number {
  return readCssPixelToken('--metric-desktop-breakpoint', DEFAULT_DESKTOP_BREAKPOINT_PX);
}

export function getMobileEditorMediaQuery(): string {
  return `(max-width: ${getDesktopBreakpointPx() - 1}px)`;
}

/** @deprecated Use getDesktopBreakpointPx() for token-based values */
export const MOBILE_EDITOR_MEDIA_QUERY = '(max-width: 1279px)';

export const MOBILE_SHEET_HANDLE_HEIGHT = 40;
export const MOBILE_PREVIEW_HORIZONTAL_PADDING = 32;
export const MOBILE_PREVIEW_VERTICAL_PADDING = 24;
export const MOBILE_PREVIEW_MIN_SCALE = 0.2;
export const DESKTOP_PREVIEW_MIN_SCALE = 0.5;
export const PREVIEW_MAX_SCALE = 2;

export interface MobileEditorSheetMetricsInput {
  viewportHeight: number;
  viewportWidth: number;
  headerHeight: number;
  safeAreaBottom?: number;
}

export interface MobileEditorSheetMetrics {
  viewportHeight: number;
  viewportWidth: number;
  headerHeight: number;
  minPreviewHeight: number;
  minSheetHeight: number;
  defaultSheetHeight: number;
  maxSheetHeight: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeFinite = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);

export function getMinimumMobilePreviewHeight(viewportWidth: number) {
  return viewportWidth >= 700 ? 280 : 180;
}

export function computeMobileEditorSheetMetrics({
  viewportHeight,
  viewportWidth,
  headerHeight,
  safeAreaBottom = 0,
}: MobileEditorSheetMetricsInput): MobileEditorSheetMetrics {
  const normalizedViewportHeight = Math.max(0, normalizeFinite(viewportHeight, 0));
  const normalizedViewportWidth = Math.max(0, normalizeFinite(viewportWidth, 0));
  const normalizedHeaderHeight = clamp(
    Math.max(0, normalizeFinite(headerHeight, 0)),
    0,
    normalizedViewportHeight,
  );
  const normalizedSafeAreaBottom = Math.max(0, normalizeFinite(safeAreaBottom, 0));
  const minSheetHeight = Math.round(MOBILE_SHEET_HANDLE_HEIGHT + normalizedSafeAreaBottom);
  const minPreviewHeight = getMinimumMobilePreviewHeight(normalizedViewportWidth);
  const availableBelowHeader = Math.max(0, normalizedViewportHeight - normalizedHeaderHeight);
  const previewProtectedMax = availableBelowHeader - minPreviewHeight;
  const maxSheetHeight = Math.max(minSheetHeight, Math.min(availableBelowHeader, previewProtectedMax));
  const defaultSheetHeight = clamp(Math.round(normalizedViewportHeight * 0.5), minSheetHeight, maxSheetHeight);

  return {
    viewportHeight: normalizedViewportHeight,
    viewportWidth: normalizedViewportWidth,
    headerHeight: normalizedHeaderHeight,
    minPreviewHeight,
    minSheetHeight,
    defaultSheetHeight,
    maxSheetHeight,
  };
}

export function clampMobileSheetHeight(height: number, metrics: MobileEditorSheetMetrics) {
  return clamp(Math.round(normalizeFinite(height, metrics.defaultSheetHeight)), metrics.minSheetHeight, metrics.maxSheetHeight);
}

export function resolveMobileSheetSnapHeight(snapPoint: number, maxSheetHeight: number) {
  if (snapPoint > 0 && snapPoint <= 1) {
    return Math.round(snapPoint * maxSheetHeight);
  }

  if (snapPoint < 0) {
    return Math.round(maxSheetHeight + snapPoint);
  }

  return Math.round(snapPoint);
}

export function createMobileSheetSnapPoints(metrics: MobileEditorSheetMetrics, interval = 24) {
  const usableInterval = Math.max(12, Math.round(interval));
  const snapHeights = new Set<number>([0, metrics.minSheetHeight, metrics.defaultSheetHeight]);

  for (
    let height = metrics.minSheetHeight + usableInterval;
    height < metrics.maxSheetHeight - usableInterval;
    height += usableInterval
  ) {
    snapHeights.add(height);
  }

  const orderedHeights = Array.from(snapHeights)
    .filter((height) => height >= 0 && height < metrics.maxSheetHeight)
    .sort((a, b) => a - b);

  return [...orderedHeights, 1];
}

export function findNearestMobileSheetSnapIndex(
  snapPoints: number[],
  maxSheetHeight: number,
  targetHeight: number,
) {
  const normalizedTarget = Math.max(0, normalizeFinite(targetHeight, 0));
  let nearestIndex = 0;
  let nearestDistance = Infinity;

  snapPoints.forEach((snapPoint, index) => {
    const height = resolveMobileSheetSnapHeight(snapPoint, maxSheetHeight);
    const distance = Math.abs(height - normalizedTarget);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

export function getMobileSheetAnchorSnapIndex(
  anchor: MobileSheetAnchor,
  snapPoints: number[],
  metrics: MobileEditorSheetMetrics,
) {
  const targetHeight =
    anchor === 'peek'
      ? metrics.minSheetHeight
      : anchor === 'expanded'
        ? metrics.maxSheetHeight
        : metrics.defaultSheetHeight;

  return findNearestMobileSheetSnapIndex(snapPoints, metrics.maxSheetHeight, targetHeight);
}

export function classifyMobileSheetAnchor(height: number, metrics: MobileEditorSheetMetrics): MobileSheetAnchor {
  const normalizedHeight = clampMobileSheetHeight(height, metrics);
  const peekThreshold = metrics.minSheetHeight + 8;
  const expandedThreshold =
    metrics.defaultSheetHeight + Math.max(24, (metrics.maxSheetHeight - metrics.defaultSheetHeight) * 0.5);

  if (normalizedHeight <= peekThreshold) return 'peek';
  if (normalizedHeight >= expandedThreshold) return 'expanded';
  return 'default';
}

export function getMobileSheetHandleLabel(anchor: MobileSheetAnchor) {
  if (anchor === 'peek') return 'Open editor controls';
  if (anchor === 'expanded') return 'Collapse editor controls';
  return 'Expand editor controls';
}

export interface MobilePreviewScaleInput {
  availableWidth: number;
  availableHeight: number;
  pageWidth?: number;
  pageHeight?: number;
}

export function computeMobilePreviewScale({
  availableWidth,
  availableHeight,
  pageWidth = PAGE_WIDTH,
  pageHeight = PAGE_HEIGHT,
}: MobilePreviewScaleInput) {
  const previewWidth = Math.max(0, normalizeFinite(availableWidth, 0) - MOBILE_PREVIEW_HORIZONTAL_PADDING);
  const previewHeight = Math.max(0, normalizeFinite(availableHeight, 0) - MOBILE_PREVIEW_VERTICAL_PADDING);
  const fitWidthScale = previewWidth / pageWidth;
  const fitHeightScale = previewHeight / pageHeight;
  const fitScale = Math.min(fitWidthScale, fitHeightScale);

  return clamp(fitScale, MOBILE_PREVIEW_MIN_SCALE, PREVIEW_MAX_SCALE);
}

export function clampPreviewScale(value: number, maxScale: number, minScale = DESKTOP_PREVIEW_MIN_SCALE) {
  return clamp(normalizeFinite(value, 1), minScale, Math.max(minScale, maxScale));
}
