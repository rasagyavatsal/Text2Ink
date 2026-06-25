'use client';

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { HandwritingSettings, PageSettings } from '@/lib/types';
import { LineData } from '@/lib/editorHelpers';
import { resolvePageLayout } from '@/lib/layout/LayoutEngine';
import { pageRenderEngine } from '@/lib/renderer/PageRenderEngine';
import {
  UnifiedPagePainter,
  resolveEffectiveLineTilt,
  type CharacterPosition,
} from '@/lib/renderer/UnifiedPagePainter';

const CANVAS_SELECTION_DRAG_THRESHOLD_PX = 6;

export interface CanvasPreviewProps {
  readonly lines: LineData[];
  readonly pageSettings: PageSettings;
  readonly settings: HandwritingSettings;
  readonly pageIndex: number;
  readonly previewScale: number;
  readonly fontFamily: string;
  /** Cursor position (global char index) - null if no cursor should be shown */
  readonly cursorPosition?: number | null;
  /** Selection range */
  readonly selectionStart?: number;
  readonly selectionEnd?: number;
  /** Page start offset for mapping global char index to local */
  readonly pageStartOffset?: number;
  /** Whether the editor is focused */
  readonly isFocused?: boolean;
  /** Called when canvas is clicked with (pageX, pageY) in page coordinates */
  readonly onCanvasClick?: (pageX: number, pageY: number) => void;
  /** Called when a character is clicked with the global char index */
  readonly onCharClick?: (globalCharIndex: number, isLeftHalf: boolean) => void;
  /** Called when shift-click extends a selection */
  readonly onCharShiftClick?: (globalCharIndex: number, isLeftHalf: boolean) => void;
  /** Called on double click for word selection */
  readonly onCharDoubleClick?: (globalCharIndex: number, isLeftHalf: boolean) => void;
  /** Called on triple click for line selection */
  readonly onCharTripleClick?: (globalCharIndex: number, isLeftHalf: boolean) => void;
  /** Called when mouse is pressed on a character */
  readonly onCharMouseDown?: (globalCharIndex: number, isLeftHalf: boolean) => void;
  /** Called when mouse moves over a character during selection */
  readonly onCharMouseMove?: (globalCharIndex: number, isLeftHalf: boolean) => void;
  /** Called when mouse is released */
  readonly onMouseUp?: () => void;
  /** Expose the canvas element ref */
  readonly canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

function getPageCoordsFromCanvas(
  canvas: HTMLCanvasElement,
  e: { clientX: number; clientY: number },
  previewScale: number,
) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / previewScale;
  const y = (e.clientY - rect.top) / previewScale;
  return { x, y };
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

export interface CanvasInsertionPoint {
  readonly index: number;
  readonly isLeftHalf: boolean;
}

interface IndexedCharacterPosition {
  readonly index: number;
  readonly position: CharacterPosition;
}

interface CharacterLineGroup {
  readonly positions: IndexedCharacterPosition[];
  readonly top: number;
  readonly bottom: number;
  readonly centerY: number;
}

function groupCharacterPositionsByLine(positions: CharacterPosition[]): CharacterLineGroup[] {
  const lineMap = new Map<number, IndexedCharacterPosition[]>();

  positions.forEach((position, index) => {
    const linePositions = lineMap.get(position.lineIndex) ?? [];
    linePositions.push({ index, position });
    lineMap.set(position.lineIndex, linePositions);
  });

  return Array.from(lineMap.values())
    .map((linePositions) => {
      const sortedPositions = [...linePositions].sort((a, b) => {
        if (a.position.x !== b.position.x) return a.position.x - b.position.x;
        return a.index - b.index;
      });
      const top = Math.min(...sortedPositions.map(({ position }) => position.y));
      const bottom = Math.max(...sortedPositions.map(({ position }) => position.y + position.height));

      return {
        positions: sortedPositions,
        top,
        bottom,
        centerY: top + (bottom - top) / 2,
      };
    })
    .sort((a, b) => {
      if (a.top !== b.top) return a.top - b.top;
      return a.positions[0].index - b.positions[0].index;
    });
}

function getNearestLineGroup(lineGroups: CharacterLineGroup[], pageY: number) {
  let nearestGroup = lineGroups[0];
  let nearestDistance = Math.abs(pageY - nearestGroup.centerY);

  for (const group of lineGroups.slice(1)) {
    const distance = Math.abs(pageY - group.centerY);
    if (distance < nearestDistance) {
      nearestGroup = group;
      nearestDistance = distance;
    }
  }

  return nearestGroup;
}

function getNearestInsertionPointOnLine(lineGroup: CharacterLineGroup, pageX: number): CanvasInsertionPoint {
  for (const { index, position } of lineGroup.positions) {
    if (position.width <= 0) continue;

    const left = position.x;
    const right = position.x + position.width;
    if (pageX >= left && pageX <= right) {
      return {
        index,
        isLeftHalf: pageX < left + position.width / 2,
      };
    }
  }

  let nearestPoint: CanvasInsertionPoint = {
    index: lineGroup.positions[0].index,
    isLeftHalf: true,
  };
  let nearestDistance = Infinity;

  for (const { index, position } of lineGroup.positions) {
    const insertionStops = [
      { x: position.x, point: { index, isLeftHalf: true } },
      { x: position.x + position.width, point: { index, isLeftHalf: false } },
    ];

    for (const stop of insertionStops) {
      const distance = Math.abs(pageX - stop.x);
      if (distance < nearestDistance) {
        nearestPoint = stop.point;
        nearestDistance = distance;
      }
    }
  }

  return nearestPoint;
}

export function resolveCanvasInsertionPoint(
  positions: CharacterPosition[],
  pageX: number,
  pageY: number,
): CanvasInsertionPoint | null {
  if (positions.length === 0) return null;

  const lineGroups = groupCharacterPositionsByLine(positions);
  if (lineGroups.length === 0) return null;

  const firstLine = lineGroups[0];
  const lastLine = lineGroups.at(-1)!;

  if (pageY < firstLine.top) {
    return { index: 0, isLeftHalf: true };
  }

  if (pageY > lastLine.bottom) {
    return { index: positions.length, isLeftHalf: true };
  }

  const containingLine = lineGroups.find((group) => pageY >= group.top && pageY <= group.bottom);
  const targetLine = containingLine ?? getNearestLineGroup(lineGroups, pageY);
  return getNearestInsertionPointOnLine(targetLine, pageX);
}

/**
 * CanvasPreview renders a single page using the UnifiedPagePainter onto a Canvas element.
 * This replaces the DOM-based preview (thousands of span elements) with a single canvas,
 * dramatically reducing DOM node count and improving performance.
 *
 * It also draws cursor and selection overlays, and provides coordinate-to-character
 * mapping for mouse interaction.
 */
export default function CanvasPreview({
  lines,
  pageSettings,
  settings,
  pageIndex,
  previewScale,
  fontFamily,
  cursorPosition = null,
  selectionStart = 0,
  selectionEnd = 0,
  pageStartOffset = 0,
  isFocused = false,
  onCanvasClick,
  onCharClick,
  onCharShiftClick,
  onCharDoubleClick,
  onCharTripleClick,
  onCharMouseDown,
  onCharMouseMove,
  onMouseUp,
  canvasRef: externalRef,
}: CanvasPreviewProps) {
  const internalRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = externalRef ?? internalRef;
  const charPositionsRef = useRef<CharacterPosition[]>([]);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [backgroundRevision, setBackgroundRevision] = useState(0);
  const isPointerDownRef = useRef(false);
  const didDragRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const resolvedLayout = useMemo(
    () =>
      resolvePageLayout({
        pageIndex,
        settings,
        pageSettings,
      }),
    [pageIndex, pageSettings, settings],
  );
  const { width: pageWidth, height: pageHeight } = resolvedLayout.page;
  const effectiveLineTilt = resolveEffectiveLineTilt(resolvedLayout, pageSettings);

  // Cursor blink
  useEffect(() => {
    const hasMainCursor = cursorPosition !== null;
    if (!isFocused || !hasMainCursor) return;
    const interval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 530);
    return () => clearInterval(interval);
  }, [isFocused, cursorPosition]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const abortController = new AbortController();

    const renderPreviewPage = async () => {
      try {
        const result = await pageRenderEngine.renderPage({
          canvas,
          mode: 'preview',
          pageIndex,
          lines,
          pageSettings,
          settings,
          scale: previewScale,
          fontFamily,
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const mainPositions = result.characterPositions;
        charPositionsRef.current = mainPositions;

        if (result.pendingBackground) {
          const incrementRevision = (revision: number) => revision + 1;
          const handleBackgroundLoad = () => {
            if (!abortController.signal.aborted) {
              setBackgroundRevision(incrementRevision);
            }
          };

          const handleBackgroundError = (error: unknown) => {
            if (!abortController.signal.aborted) {
              console.error('Failed to load preview page background', error);
            }
          };

          void result.pendingBackground
            .then(handleBackgroundLoad)
            .catch(handleBackgroundError);
        }

        if (selectionStart !== selectionEnd) {
          const localSelStart = selectionStart - pageStartOffset;
          const localSelEnd = selectionEnd - pageStartOffset;
          UnifiedPagePainter.paintSelectionOverlay(
            ctx,
            mainPositions,
            Math.max(0, localSelStart),
            Math.min(mainPositions.length, localSelEnd),
            pageSettings.inkColor,
            effectiveLineTilt,
          );
        }

        if (isFocused && cursorPosition !== null && cursorVisible) {
          const localCursor = cursorPosition - pageStartOffset;
          if (localCursor >= 0 && localCursor <= mainPositions.length) {
            UnifiedPagePainter.paintCursorOverlay(
              ctx,
              mainPositions,
              localCursor,
              pageSettings.inkColor,
              effectiveLineTilt,
            );
          }
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        console.error('Failed to render preview page', error);
      }
    };

    void renderPreviewPage();

    return () => {
      abortController.abort();
    };
  }, [
    lines, pageSettings, settings, pageIndex, previewScale,
    fontFamily, cursorPosition, selectionStart, selectionEnd,
    pageStartOffset, isFocused, cursorVisible, canvasRef, backgroundRevision,
    effectiveLineTilt,
  ]);

  useEffect(() => {
    const handleWindowPointerUp = (e: PointerEvent) => {
      if (canvasRef.current && e.target !== canvasRef.current) {
        didDragRef.current = false;
      }
      isPointerDownRef.current = false;
      activePointerIdRef.current = null;
      pointerStartRef.current = null;
    };
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [canvasRef]);

  /** Find which character was clicked based on page coordinates */
  const findCharAtPoint = useCallback((pageX: number, pageY: number): { index: number; isLeftHalf: boolean } | null => {
    const positions = charPositionsRef.current;
    if (positions.length === 0) return null;

    const tilt = effectiveLineTilt;
    let targetX = pageX;
    let targetY = pageY;

    if (tilt !== 0) {
      const rad = (-tilt * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      targetX = pageX * cos - pageY * sin;
      targetY = pageX * sin + pageY * cos;
    }

    return resolveCanvasInsertionPoint(positions, targetX, targetY);
  }, [effectiveLineTilt]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    const coords = getPageCoordsFromCanvas(e.currentTarget, e, previewScale);

    const hit = findCharAtPoint(coords.x, coords.y);
    if (!hit) {
      onCanvasClick?.(coords.x, coords.y);
      return;
    }

    const globalCharIndex = pageStartOffset + hit.index;
    if (e.shiftKey) {
      onCharShiftClick?.(globalCharIndex, hit.isLeftHalf);
      return;
    }

    if (e.detail === 3) {
      onCharTripleClick?.(globalCharIndex, hit.isLeftHalf);
      return;
    }

    onCharClick?.(globalCharIndex, hit.isLeftHalf);
  }, [
    onCanvasClick,
    onCharClick,
    onCharShiftClick,
    onCharTripleClick,
    findCharAtPoint,
    pageStartOffset,
    previewScale,
  ]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (didDragRef.current) return;
    const coords = getPageCoordsFromCanvas(e.currentTarget, e, previewScale);
    const hit = findCharAtPoint(coords.x, coords.y);
    if (!hit) return;
    onCharDoubleClick?.(pageStartOffset + hit.index, hit.isLeftHalf);
  }, [onCharDoubleClick, findCharAtPoint, pageStartOffset, previewScale]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    isPointerDownRef.current = true;
    const isTouchPointer = e.pointerType === 'touch';
    const pointerId = typeof e.pointerId === 'number' ? e.pointerId : null;
    activePointerIdRef.current = pointerId;
    didDragRef.current = false;
    pointerStartRef.current = { clientX: e.clientX, clientY: e.clientY };
    if (!isTouchPointer && pointerId !== null) {
      e.currentTarget.setPointerCapture?.(pointerId);
    }
    if (isTouchPointer) return;
    if (!onCharMouseDown) return;
    const coords = getPageCoordsFromCanvas(e.currentTarget, e, previewScale);
    const hit = findCharAtPoint(coords.x, coords.y);
    if (hit) {
      onCharMouseDown(pageStartOffset + hit.index, hit.isLeftHalf);
    }
  }, [onCharMouseDown, findCharAtPoint, pageStartOffset, previewScale]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    if (!isPointerDownRef.current) return;
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;
    const pointerStart = pointerStartRef.current;
    if (pointerStart) {
      const distance = Math.hypot(e.clientX - pointerStart.clientX, e.clientY - pointerStart.clientY);
      if (distance < CANVAS_SELECTION_DRAG_THRESHOLD_PX) return;
    }

    if (e.pointerType === 'touch') {
      didDragRef.current = true;
      return;
    }

    if (!onCharMouseMove) return;
    didDragRef.current = true;
    const coords = getPageCoordsFromCanvas(e.currentTarget, e, previewScale);
    const hit = findCharAtPoint(coords.x, coords.y);
    if (hit) {
      onCharMouseMove(pageStartOffset + hit.index, hit.isLeftHalf);
    }
  }, [onCharMouseMove, findCharAtPoint, pageStartOffset, previewScale]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;
    isPointerDownRef.current = false;
    activePointerIdRef.current = null;
    pointerStartRef.current = null;
    onMouseUp?.();
  }, [onMouseUp]);

  return (
    <canvas
      ref={canvasRef}
      aria-label={`Page ${pageIndex + 1} preview`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onTouchCancel={(e) => e.stopPropagation()}
      style={{
        width: pageWidth * previewScale,
        height: pageHeight * previewScale,
        cursor: 'text',
        touchAction: 'pan-y',
      }}
    >
      <span role="img" aria-label={`Page ${pageIndex + 1} preview`} />
    </canvas>
  );
}
