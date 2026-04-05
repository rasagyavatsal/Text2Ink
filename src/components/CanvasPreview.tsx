'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { HandwritingSettings, PageSettings } from '@/lib/types';
import { LineData } from '@/lib/editorHelpers';
import { PAGE_WIDTH, PAGE_HEIGHT } from '@/lib/pageConstants';
import { UnifiedPagePainter, CharacterPosition } from '@/lib/renderer/UnifiedPagePainter';

export interface CanvasPreviewProps {
  lines: LineData[];
  pageSettings: PageSettings;
  settings: HandwritingSettings;
  pageIndex: number;
  previewScale: number;
  fontFamily: string;
  /** Cursor position (global char index) - null if no cursor should be shown */
  cursorPosition?: number | null;
  /** Selection range */
  selectionStart?: number;
  selectionEnd?: number;
  /** Page start offset for mapping global char index to local */
  pageStartOffset?: number;
  /** Whether the editor is focused */
  isFocused?: boolean;
  /** Called when canvas is clicked with (pageX, pageY) in page coordinates */
  onCanvasClick?: (pageX: number, pageY: number) => void;
  /** Called when a character is clicked with the global char index */
  onCharClick?: (globalCharIndex: number, isLeftHalf: boolean) => void;
  /** Called when shift-click extends a selection */
  onCharShiftClick?: (globalCharIndex: number, isLeftHalf: boolean) => void;
  /** Called on double click for word selection */
  onCharDoubleClick?: (globalCharIndex: number, isLeftHalf: boolean) => void;
  /** Called on triple click for line selection */
  onCharTripleClick?: (globalCharIndex: number, isLeftHalf: boolean) => void;
  /** Called when mouse is pressed on a character */
  onCharMouseDown?: (globalCharIndex: number, isLeftHalf: boolean) => void;
  /** Called when mouse moves over a character during selection */
  onCharMouseMove?: (globalCharIndex: number, isLeftHalf: boolean) => void;
  /** Called when mouse is released */
  onMouseUp?: () => void;
  /** Expose the canvas element ref */
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
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
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalRef ?? internalRef;
  const charPositionsRef = useRef<CharacterPosition[]>([]);
  const [cursorVisible, setCursorVisible] = useState(true);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const bgImageSrcRef = useRef<string | null>(null);
  const isMouseDownRef = useRef(false);
  const didDragRef = useRef(false);

  // Cursor blink
  useEffect(() => {
    const hasMainCursor = cursorPosition !== null;
    if (!isFocused || !hasMainCursor) return;
    
    // Use requestAnimationFrame to avoid synchronous setState in effect
    requestAnimationFrame(() => setCursorVisible(true));
    
    const interval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 530);
    return () => clearInterval(interval);
  }, [isFocused, cursorPosition]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set physical canvas size
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = PAGE_WIDTH * previewScale * dpr;
    canvas.height = PAGE_HEIGHT * previewScale * dpr;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply scale: previewScale * devicePixelRatio
    ctx.save();
    ctx.scale(previewScale * dpr, previewScale * dpr);

    // Handle custom background image
    const customBg = settings.customBackgroundImages?.[pageIndex] ?? settings.customBackgroundImage;
    if (customBg && bgImageRef.current && bgImageSrcRef.current === customBg) {
      ctx.drawImage(bgImageRef.current, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    }

    // Paint the page content
    UnifiedPagePainter.paintPage({
      ctx,
      pageIndex,
      lines,
      pageSettings,
      settings,
      scaleFactor: previewScale,
      fontFamily,
      renderTextFields: false,
    });

    // Compute character positions for interaction
    const { mainPositions } = UnifiedPagePainter.computeCharacterPositions({
      ctx,
      lines,
      pageSettings,
      settings,
      pageIndex,
      fontFamily,
    });
    charPositionsRef.current = mainPositions;

    // Draw selection overlay
    if (selectionStart !== selectionEnd) {
      const localSelStart = selectionStart - pageStartOffset;
      const localSelEnd = selectionEnd - pageStartOffset;
      UnifiedPagePainter.paintSelectionOverlay(
        ctx,
        mainPositions,
        Math.max(0, localSelStart),
        Math.min(mainPositions.length, localSelEnd),
        pageSettings.inkColor,
        pageSettings.lineTilt,
      );
    }

    // Draw cursor overlay
    if (isFocused && cursorPosition !== null && cursorVisible) {
      const localCursor = cursorPosition - pageStartOffset;
      if (localCursor >= 0 && localCursor <= mainPositions.length) {
        UnifiedPagePainter.paintCursorOverlay(
          ctx, 
          mainPositions, 
          localCursor, 
          pageSettings.inkColor,
          pageSettings.lineTilt,
        );
      }
    }

    ctx.restore();
  }, [
    lines, pageSettings, settings, pageIndex, previewScale,
    fontFamily, cursorPosition, selectionStart, selectionEnd,
    pageStartOffset, isFocused, cursorVisible, canvasRef,
  ]);

  // Load background image when it changes
  useEffect(() => {
    const customBg = settings.customBackgroundImages?.[pageIndex] ?? settings.customBackgroundImage;
    if (!customBg) {
      bgImageRef.current = null;
      bgImageSrcRef.current = null;
      return;
    }
    if (bgImageSrcRef.current === customBg) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      bgImageRef.current = img;
      bgImageSrcRef.current = customBg;
      paint();
    };
    img.src = customBg;
  }, [settings.customBackgroundImages, settings.customBackgroundImage, pageIndex, paint]);

  useEffect(() => {
    paint();
  }, [paint]);

  useEffect(() => {
    const handleWindowMouseUp = (e: MouseEvent) => {
      if (canvasRef.current && e.target !== canvasRef.current) {
        didDragRef.current = false;
      }
      isMouseDownRef.current = false;
    };
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, []);

  /** Find which character was clicked based on page coordinates */
  const findCharAtPoint = useCallback((pageX: number, pageY: number): { index: number; isLeftHalf: boolean } | null => {
    const positions = charPositionsRef.current;
    if (positions.length === 0) return null;

    const tilt = pageSettings.lineTilt || 0;
    let targetX = pageX;
    let targetY = pageY;

    if (tilt !== 0) {
      const rad = (-tilt * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      targetX = pageX * cos - pageY * sin;
      targetY = pageX * sin + pageY * cos;
    }

    // Find the closest character
    let bestIdx = -1;
    let bestDist = Infinity;

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      // Check if point is roughly within the line's vertical range
      if (targetY >= pos.y && targetY <= pos.y + pos.height) {
        // Check horizontal distance
        const charCenterX = pos.x + pos.width / 2;
        const dist = Math.abs(targetX - charCenterX);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
    }

    if (bestIdx === -1) {
      // Fallback: click below all text → position at end
      return { index: positions.length, isLeftHalf: true };
    }

    const pos = positions[bestIdx];
    const isLeftHalf = targetX < pos.x + pos.width / 2;
    return { index: bestIdx, isLeftHalf };
  }, [pageSettings.lineTilt]);

  const getPageCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / previewScale;
    const y = (e.clientY - rect.top) / previewScale;
    return { x, y };
  }, [canvasRef, previewScale]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    const coords = getPageCoords(e);
    if (!coords) return;

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
    getPageCoords,
    onCanvasClick,
    onCharClick,
    onCharShiftClick,
    onCharTripleClick,
    findCharAtPoint,
    pageStartOffset,
  ]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (didDragRef.current) return;
    const coords = getPageCoords(e);
    if (!coords) return;
    const hit = findCharAtPoint(coords.x, coords.y);
    if (!hit) return;
    onCharDoubleClick?.(pageStartOffset + hit.index, hit.isLeftHalf);
  }, [getPageCoords, onCharDoubleClick, findCharAtPoint, pageStartOffset]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    isMouseDownRef.current = true;
    didDragRef.current = false;
    if (!onCharMouseDown) return;
    const coords = getPageCoords(e);
    if (!coords) return;
    const hit = findCharAtPoint(coords.x, coords.y);
    if (hit) {
      onCharMouseDown(pageStartOffset + hit.index, hit.isLeftHalf);
    }
  }, [getPageCoords, onCharMouseDown, findCharAtPoint, pageStartOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onCharMouseMove) return;
    if (!isMouseDownRef.current) return;
    const coords = getPageCoords(e);
    if (!coords) return;
    const hit = findCharAtPoint(coords.x, coords.y);
    if (hit) {
      didDragRef.current = true;
      onCharMouseMove(pageStartOffset + hit.index, hit.isLeftHalf);
    }
  }, [getPageCoords, onCharMouseMove, findCharAtPoint, pageStartOffset]);

  const handleMouseUp = useCallback(() => {
    isMouseDownRef.current = false;
    onMouseUp?.();
  }, [onMouseUp]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`Page ${pageIndex + 1} preview`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        width: PAGE_WIDTH * previewScale,
        height: PAGE_HEIGHT * previewScale,
        cursor: 'text',
      }}
    />
  );
}
