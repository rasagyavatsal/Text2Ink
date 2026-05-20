'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { Move, X, Settings } from 'lucide-react';
import { TextField as TextFieldType, HandwritingSettings } from '@/lib/types';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { calculateRandomStyle } from '@/lib/editorHelpers';
import { createMeasure } from '@/lib/pagination';
import { cn } from '@/lib/utils';

interface TextFieldProps {
  field: TextFieldType;
  onUpdate: (updates: Partial<TextFieldType>) => void;
  onDelete: () => void;
  scale: number;
  fontFamily: string;
  randomness: HandwritingSettings['randomness'];
  onTypingFocus?: () => void;
}

function calculateMinimumTextBoxSize(text: string, fontSize: number, fontFamily: string, scale: number) {
  const lines = text.split('\n');
  const measure = createMeasure(fontFamily, fontSize);

  const textWidth = Math.max(...lines.map((line) => measure(line)), 0);
  const padding = 12 / scale;
  const textHeight = lines.length * fontSize * 1.2;

  return {
    minW: Math.max(10, textWidth + padding),
    minH: Math.max(10, textHeight + padding),
  };
}

export default function TextField({ field, onUpdate, onDelete, scale, fontFamily, randomness, onTypingFocus }: TextFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [resizeDir, setResizeDir] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsAnchorPoint, setSettingsAnchorPoint] = useState<{ left: number; top: number } | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, fieldX: 0, fieldY: 0, fieldW: 0, fieldH: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const interactionRef = useRef<{ mode: 'drag' | 'resize' | null; resizeDir: string | null }>({
    mode: null,
    resizeDir: null,
  });
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const previousMinimumSizeRef = useRef<{ minW: number; minH: number } | null>(null);
  const showControls = isSelected || isFocused || isSettingsOpen || isDragging || resizeDir !== null;

  // Calculate the minimum width and height based on the text content
  const { minW, minH } = useMemo(
    () => calculateMinimumTextBoxSize(field.text, field.fontSize, fontFamily, scale),
    [field.fontSize, field.text, fontFamily, scale]
  );

  useLayoutEffect(() => {
    if (isDragging || resizeDir || field.text === '') return;

    const previousMinimumSize = previousMinimumSizeRef.current;
    previousMinimumSizeRef.current = { minW, minH };

    if (previousMinimumSize && previousMinimumSize.minW === minW && previousMinimumSize.minH === minH) {
      return;
    }

    if (field.width === minW && field.height === minH) return;

    onUpdate({
      width: minW,
      height: minH,
    });
  }, [field.height, field.width, isDragging, minH, minW, onUpdate, resizeDir, field.text]);

  const handleSettingsOpenChange = (open: boolean) => {
    if (open && settingsTriggerRef.current) {
      const rect = settingsTriggerRef.current.getBoundingClientRect();
      setSettingsAnchorPoint({
        left: rect.left + rect.width / 2,
        top: rect.top + rect.height / 2,
      });
    }

    if (!open) {
      setSettingsAnchorPoint(null);
    }

    setIsSettingsOpen(open);
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;
      if (isFocused || isSettingsOpen || isDragging || resizeDir) return;
      setIsSelected(false);
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    return () => document.removeEventListener('pointerdown', handleDocumentPointerDown);
  }, [isDragging, isFocused, isSettingsOpen, resizeDir]);

  const handleDragPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSelected(true);
    setIsDragging(true);
    setResizeDir(null);
    interactionRef.current = { mode: 'drag', resizeDir: null };
    const pointerId = typeof e.pointerId === 'number' ? e.pointerId : null;
    activePointerIdRef.current = pointerId;
    if (pointerId !== null) {
      e.currentTarget.setPointerCapture?.(pointerId);
    }
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      fieldX: field.x,
      fieldY: field.y,
      fieldW: field.width,
      fieldH: field.height,
    };
  };

  const handleResizeStart = (e: React.PointerEvent, dir: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSelected(true);
    setResizeDir(dir);
    setIsDragging(false);
    interactionRef.current = { mode: 'resize', resizeDir: dir };
    const pointerId = typeof e.pointerId === 'number' ? e.pointerId : null;
    activePointerIdRef.current = pointerId;
    if (pointerId !== null) {
      e.currentTarget.setPointerCapture?.(pointerId);
    }
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      fieldX: field.x,
      fieldY: field.y,
      fieldW: field.width,
      fieldH: field.height,
    };
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const interaction = interactionRef.current;
      if (!interaction.mode) return;
      if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;
      const dx = (e.clientX - dragStartRef.current.x) / scale;
      const dy = (e.clientY - dragStartRef.current.y) / scale;

      if (interaction.mode === 'drag') {
        onUpdate({
          x: dragStartRef.current.fieldX + dx,
          y: dragStartRef.current.fieldY + dy,
        });
      } else if (interaction.resizeDir) {
        let { fieldX: x, fieldY: y, fieldW: w, fieldH: h } = dragStartRef.current;

        if (interaction.resizeDir.includes('e')) w = Math.max(minW, w + dx);
        if (interaction.resizeDir.includes('s')) h = Math.max(minH, h + dy);
        if (interaction.resizeDir.includes('w')) {
          const newW = Math.max(minW, w - dx);
          x = x + (w - newW);
          w = newW;
        }
        if (interaction.resizeDir.includes('n')) {
          const newH = Math.max(minH, h - dy);
          y = y + (h - newH);
          h = newH;
        }

        onUpdate({ x, y, width: w, height: h });
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;
      activePointerIdRef.current = null;
      interactionRef.current = { mode: null, resizeDir: null };
      setIsDragging(false);
      setResizeDir(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, resizeDir, onUpdate, scale, minW, minH]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "absolute border border-dashed group transition-colors",
        showControls ? "border-brand-accent/60" : "border-border/60 hover:border-brand-accent/30"
      )}
      onPointerDown={() => {
        setIsSelected(true);
      }}
      style={{
        left: field.x * scale,
        top: field.y * scale,
        width: field.width * scale,
        height: field.height * scale,
        fontFamily,
        color: field.color,
      }}
    >
      {/* Resize Handles */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity",
          showControls ? "opacity-100" : "opacity-0 xl:group-hover:opacity-100"
        )}
      >
        {/* Corners */}
        <div
          data-testid="handle-nw"
          className="absolute -top-5 -left-5 size-11 pointer-events-auto cursor-nwse-resize touch-none flex items-center justify-center"
          onPointerDown={(e) => handleResizeStart(e, 'nw')}
        >
          <span className="h-2 w-2 rounded-full border border-brand-accent bg-background shadow-sm transition-transform hover:scale-125" />
        </div>
        <div
          data-testid="handle-ne"
          className="absolute -top-5 -right-5 size-11 pointer-events-auto cursor-nesw-resize touch-none flex items-center justify-center"
          onPointerDown={(e) => handleResizeStart(e, 'ne')}
        >
          <span className="h-2 w-2 rounded-full border border-brand-accent bg-background shadow-sm transition-transform hover:scale-125" />
        </div>
        <div
          data-testid="handle-sw"
          className="absolute -bottom-5 -left-5 size-11 pointer-events-auto cursor-nesw-resize touch-none flex items-center justify-center"
          onPointerDown={(e) => handleResizeStart(e, 'sw')}
        >
          <span className="h-2 w-2 rounded-full border border-brand-accent bg-background shadow-sm transition-transform hover:scale-125" />
        </div>
        <div
          data-testid="handle-se"
          className="absolute -bottom-5 -right-5 size-11 pointer-events-auto cursor-nwse-resize touch-none flex items-center justify-center"
          onPointerDown={(e) => handleResizeStart(e, 'se')}
        >
          <span className="h-2 w-2 rounded-full border border-brand-accent bg-background shadow-sm transition-transform hover:scale-125" />
        </div>

        {/* Sides */}
        <div
          data-testid="handle-n"
          className="absolute -top-5 left-3 right-3 h-11 pointer-events-auto cursor-ns-resize touch-none"
          onPointerDown={(e) => handleResizeStart(e, 'n')}
        />
        <div
          data-testid="handle-s"
          className="absolute -bottom-5 left-3 right-3 h-11 pointer-events-auto cursor-ns-resize touch-none"
          onPointerDown={(e) => handleResizeStart(e, 's')}
        />
        <div
          data-testid="handle-w"
          className="absolute -left-5 top-3 bottom-3 w-11 pointer-events-auto cursor-ew-resize touch-none"
          onPointerDown={(e) => handleResizeStart(e, 'w')}
        />
        <div
          data-testid="handle-e"
          className="absolute -right-5 top-3 bottom-3 w-11 pointer-events-auto cursor-ew-resize touch-none"
          onPointerDown={(e) => handleResizeStart(e, 'e')}
        />
      </div>

      {/* Top Left Icons */}
      <div
        className={cn(
          "absolute -top-4 -left-4 flex items-center z-10 transition-opacity",
          showControls ? "opacity-100" : "opacity-0 xl:group-hover:opacity-100"
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Move text box"
          className="rounded-full cursor-move bg-background shadow-sm text-muted-foreground touch-none"
          onPointerDown={handleDragPointerDown}
        >
          <Move className="size-3.5" />
        </Button>
      </div>

      {/* Top Right Icons - Consolidated Settings */}
      <div
        className={cn(
          "absolute -top-4 -right-4 z-10 transition-opacity",
          showControls ? "opacity-100" : "opacity-0 xl:group-hover:opacity-100"
        )}
      >
        <Popover open={isSettingsOpen} onOpenChange={handleSettingsOpenChange}>
          <PopoverTrigger asChild>
            <Button
              ref={settingsTriggerRef}
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Text box settings"
              className="rounded-full bg-background shadow-sm text-muted-foreground"
            >
              <Settings className="size-3.5" />
            </Button>
          </PopoverTrigger>
          {settingsAnchorPoint && (
            <PopoverAnchor
              style={{
                position: 'fixed',
                left: settingsAnchorPoint.left,
                top: settingsAnchorPoint.top,
                width: 0,
                height: 0,
                pointerEvents: 'none',
              }}
            />
          )}
          <PopoverContent className="w-48 p-4 shadow-xl border-border">
            <div className="space-y-5">
              {/* Font Size Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="label-text">Font Size</label>
                  <span className="text-label font-mono font-bold text-foreground">{field.fontSize}px</span>
                </div>
                <Slider
                  value={[field.fontSize]}
                  min={8}
                  max={72}
                  step={1}
                  onValueChange={([val]) => onUpdate({ fontSize: val })}
                />
              </div>

              {/* Color Picker Section */}
              <div className="space-y-2">
                <label className="label-text">Text Color</label>
                <div className="flex items-center gap-3 p-2 bg-muted rounded-lg border border-border">
                  <input
                    type="color"
                    value={field.color}
                    onChange={(e) => onUpdate({ color: e.target.value })}
                    className="w-8 h-8 rounded-md cursor-pointer border-0 p-0 bg-transparent shadow-sm"
                  />
                  <span className="text-label font-mono font-bold text-foreground uppercase">
                    {field.color}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <Button
                  variant="ghost"
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-label font-bold text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors uppercase tracking-widest"
                  onClick={onDelete}
                >
                  <X className="size-3" />
                  Delete Box
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div
        className="relative w-full h-full p-1"
        style={{
          fontSize: field.fontSize * scale,
          lineHeight: 1.2,
          pointerEvents: 'none',
        }}
      >
        {field.text.split('\n').map((line, lineIdx) => (
          <div key={lineIdx} className="whitespace-pre">
            {line.split('').map((char, charIdx) => {
              const randomStyle = calculateRandomStyle(charIdx, lineIdx + 1000, randomness);
              return (
                <span
                  key={charIdx}
                  className="inline-block"
                  style={{
                    ...randomStyle.style,
                    opacity: isFocused ? 0 : 1,
                  }}
                >
                  {char}
                </span>
              );
            })}
            {line.length === 0 && <br />}
          </div>
        ))}
      </div>

      <textarea
        className="absolute inset-0 w-full h-full bg-transparent border-none outline-none resize-none p-1 leading-tight overflow-hidden"
        value={field.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
          }
        }}
        onFocus={() => {
          onTypingFocus?.();
          setIsFocused(true);
          setIsSelected(true);
        }}
        onBlur={() => setIsFocused(false)}
        spellCheck={false}
        style={{
           fontSize: field.fontSize * scale,
           color: isFocused ? field.color : 'transparent',
           caretColor: field.color,
           minHeight: 'inherit',
        }}
        /* Keep placeholder empty to only show a blinking caret when the user clicks/focuses an empty text box */
        placeholder=""
      />
    </div>
  );
}
