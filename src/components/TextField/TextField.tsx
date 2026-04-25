'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Move, Settings, X } from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { PAGE_HEIGHT, PAGE_WIDTH } from '@/lib/pageConstants';
import { createMeasure } from '@/lib/pagination';
import { TextField as TextFieldType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TextFieldProps {
  field: TextFieldType;
  onUpdate: (updates: Partial<TextFieldType>) => void;
  onDelete: () => void;
  scale: number;
  fontFamily: string;
  onTypingFocus?: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function wrapLineToWidth(line: string, maxContentWidth: number, measure: (text: string) => number) {
  if (line.length === 0) return [''];

  const wrapped: string[] = [];
  let current = '';

  for (const char of line) {
    const candidate = current + char;
    if (current && measure(candidate) > maxContentWidth) {
      wrapped.push(current);
      current = char;
    } else {
      current = candidate;
    }
  }

  wrapped.push(current);
  return wrapped;
}

function calculateAutoFitTextBoxSize(
  text: string,
  fontSize: number,
  fontFamily: string,
  scale: number,
  x: number,
  y: number
) {
  const measure = createMeasure(fontFamily, fontSize);
  const padding = 12 / scale;
  const availableWidth = Math.max(10, PAGE_WIDTH - x);
  const availableHeight = Math.max(10, PAGE_HEIGHT - y);
  const maxContentWidth = Math.max(1, availableWidth - padding);
  const wrappedLines = text
    .split('\n')
    .flatMap((line) => wrapLineToWidth(line, maxContentWidth, measure));
  const textWidth = Math.max(...wrappedLines.map((line) => measure(line)), 0);
  const textHeight = wrappedLines.length * fontSize * 1.2;
  const width = Math.min(availableWidth, Math.max(10, textWidth + padding));
  const height = Math.max(10, textHeight + padding);

  if (height > availableHeight) return null;

  return { width, height };
}

export default function TextField({ field, onUpdate, onDelete, scale, fontFamily, onTypingFocus }: TextFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsAnchorPoint, setSettingsAnchorPoint] = useState<{ left: number; top: number } | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, fieldX: 0, fieldY: 0, fieldW: 0, fieldH: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const previousAutoFitSizeRef = useRef<{ width: number; height: number } | null>(null);
  const showControls = isSelected || isFocused || isSettingsOpen || isDragging;

  const autoFitSize = useMemo(
    () => calculateAutoFitTextBoxSize(field.text, field.fontSize, fontFamily, scale, field.x, field.y),
    [field.fontSize, field.text, field.x, field.y, fontFamily, scale]
  );

  useLayoutEffect(() => {
    if (isDragging || field.text === '' || !autoFitSize) return;

    const previousAutoFitSize = previousAutoFitSizeRef.current;
    previousAutoFitSizeRef.current = autoFitSize;

    if (
      previousAutoFitSize &&
      previousAutoFitSize.width === autoFitSize.width &&
      previousAutoFitSize.height === autoFitSize.height
    ) {
      return;
    }

    if (field.width === autoFitSize.width && field.height === autoFitSize.height) return;

    onUpdate({
      width: autoFitSize.width,
      height: autoFitSize.height,
    });
  }, [autoFitSize, field.height, field.text, field.width, isDragging, onUpdate]);

  useLayoutEffect(() => {
    const nextX = clamp(field.x, 0, Math.max(0, PAGE_WIDTH - field.width));
    const nextY = clamp(field.y, 0, Math.max(0, PAGE_HEIGHT - field.height));
    if (nextX !== field.x || nextY !== field.y) {
      onUpdate({ x: nextX, y: nextY });
    }
  }, [field.height, field.width, field.x, field.y, onUpdate]);

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
      if (isFocused || isSettingsOpen || isDragging) return;
      setIsSelected(false);
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    return () => document.removeEventListener('pointerdown', handleDocumentPointerDown);
  }, [isDragging, isFocused, isSettingsOpen]);

  const handleDragPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSelected(true);
    setIsDragging(true);
    isDraggingRef.current = true;
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
      if (!isDraggingRef.current) return;
      if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;
      const dx = (e.clientX - dragStartRef.current.x) / scale;
      const dy = (e.clientY - dragStartRef.current.y) / scale;

      onUpdate({
        x: clamp(dragStartRef.current.fieldX + dx, 0, Math.max(0, PAGE_WIDTH - dragStartRef.current.fieldW)),
        y: clamp(dragStartRef.current.fieldY + dy, 0, Math.max(0, PAGE_HEIGHT - dragStartRef.current.fieldH)),
      });
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;
      activePointerIdRef.current = null;
      isDraggingRef.current = false;
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [onUpdate, scale]);

  return (
    <div
      ref={rootRef}
      className={cn(
        'absolute border border-dotted group',
        showControls ? 'border-[#E0A32A]' : 'border-gray-400'
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
      <div
        className={cn(
          'absolute -top-5 -left-5 flex items-center z-10 transition-opacity',
          showControls ? 'opacity-100' : 'opacity-0 xl:group-hover:opacity-100'
        )}
      >
        <button
          type="button"
          aria-label="Move text box"
          className="size-11 bg-white border shadow-sm rounded-full cursor-move hover:bg-gray-50 text-gray-500 touch-none flex items-center justify-center"
          onPointerDown={handleDragPointerDown}
        >
          <Move size={16} />
        </button>
      </div>

      <div
        className={cn(
          'absolute -top-5 -right-5 z-10 transition-opacity',
          showControls ? 'opacity-100' : 'opacity-0 xl:group-hover:opacity-100'
        )}
      >
        <Popover open={isSettingsOpen} onOpenChange={handleSettingsOpenChange}>
          <PopoverTrigger asChild>
            <button
              ref={settingsTriggerRef}
              type="button"
              aria-label="Text box settings"
              className="size-11 bg-white border shadow-sm rounded-full hover:bg-gray-50 text-gray-500 flex items-center justify-center"
            >
              <Settings size={16} />
            </button>
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
          <PopoverContent className="w-48 p-4 shadow-xl border-gray-100">
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Font Size</label>
                  <span className="text-[10px] font-mono font-bold text-gray-600">{field.fontSize}px</span>
                </div>
                <Slider
                  value={[field.fontSize]}
                  min={8}
                  max={72}
                  step={1}
                  onValueChange={([val]) => {
                    const nextSize = calculateAutoFitTextBoxSize(field.text, val, fontFamily, scale, field.x, field.y);
                    if (!nextSize) return;
                    onUpdate({ fontSize: val, width: nextSize.width, height: nextSize.height });
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Text Color</label>
                <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <input
                    type="color"
                    value={field.color}
                    onChange={(e) => onUpdate({ color: e.target.value })}
                    className="w-8 h-8 rounded-md cursor-pointer border-0 p-0 bg-transparent shadow-sm"
                  />
                  <span className="text-[10px] font-mono font-bold text-gray-600 uppercase">
                    {field.color}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <button
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[10px] font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors uppercase tracking-widest"
                  onClick={onDelete}
                >
                  <X size={12} />
                  Delete Box
                </button>
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
        <div className="whitespace-pre-wrap break-words" style={{ opacity: isFocused ? 0 : 1 }}>
          {field.text || '\u00a0'}
        </div>
      </div>

      <textarea
        className="absolute inset-0 w-full h-full bg-transparent border-none outline-none resize-none p-1 leading-tight overflow-hidden"
        value={field.text}
        onChange={(e) => {
          const nextText = e.target.value;
          const nextSize = calculateAutoFitTextBoxSize(nextText, field.fontSize, fontFamily, scale, field.x, field.y);
          if (!nextSize) return;
          onUpdate({ text: nextText, width: nextSize.width, height: nextSize.height });
        }}
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
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
        }}
        placeholder=""
      />
    </div>
  );
}
