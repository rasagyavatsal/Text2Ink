'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { Move, X, Settings } from 'lucide-react';
import { TextField as TextFieldType, HandwritingSettings } from '@/lib/types';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { calculateRandomStyle } from '@/lib/editorHelpers';
import { createMeasure } from '@/lib/pagination';

interface TextFieldProps {
  field: TextFieldType;
  onUpdate: (updates: Partial<TextFieldType>) => void;
  onDelete: () => void;
  scale: number;
  fontFamily: string;
  randomness: HandwritingSettings['randomness'];
}

function calculateMinimumTextBoxSize(field: TextFieldType, fontFamily: string, scale: number) {
  const lines = field.text.split('\n');
  const measure = createMeasure(fontFamily, field.fontSize);

  const textWidth = Math.max(...lines.map((line) => measure(line)), 0);
  const padding = 12 / scale;
  const textHeight = lines.length * field.fontSize * 1.2;

  return {
    minW: Math.max(10, textWidth + padding),
    minH: Math.max(10, textHeight + padding),
  };
}

export default function TextField({ field, onUpdate, onDelete, scale, fontFamily, randomness }: TextFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [resizeDir, setResizeDir] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsAnchorPoint, setSettingsAnchorPoint] = useState<{ left: number; top: number } | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, fieldX: 0, fieldY: 0, fieldW: 0, fieldH: 0 });
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const previousMinimumSizeRef = useRef<{ minW: number; minH: number } | null>(null);

  // Calculate the minimum width and height based on the text content
  const { minW, minH } = useMemo(
    () => calculateMinimumTextBoxSize(field, fontFamily, scale),
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

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ('button' in e && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setResizeDir(null);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = {
      x: clientX,
      y: clientY,
      fieldX: field.x,
      fieldY: field.y,
      fieldW: field.width,
      fieldH: field.height,
    };
  };

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, dir: string) => {
    if ('button' in e && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setResizeDir(dir);
    setIsDragging(false);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = {
      x: clientX,
      y: clientY,
      fieldX: field.x,
      fieldY: field.y,
      fieldW: field.width,
      fieldH: field.height,
    };
  };

  useEffect(() => {
    if (!isDragging && !resizeDir) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const dx = (clientX - dragStartRef.current.x) / scale;
      const dy = (clientY - dragStartRef.current.y) / scale;

      if (isDragging) {
        onUpdate({
          x: dragStartRef.current.fieldX + dx,
          y: dragStartRef.current.fieldY + dy,
        });
      } else if (resizeDir) {
        let { fieldX: x, fieldY: y, fieldW: w, fieldH: h } = dragStartRef.current;

        if (resizeDir.includes('e')) w = Math.max(minW, w + dx);
        if (resizeDir.includes('s')) h = Math.max(minH, h + dy);
        if (resizeDir.includes('w')) {
          const newW = Math.max(minW, w - dx);
          x = x + (w - newW);
          w = newW;
        }
        if (resizeDir.includes('n')) {
          const newH = Math.max(minH, h - dy);
          y = y + (h - newH);
          h = newH;
        }

        onUpdate({ x, y, width: w, height: h });
      }
    };

    const handleUp = () => {
      setIsDragging(false);
      setResizeDir(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    window.addEventListener('touchcancel', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('touchcancel', handleUp);
    };
  }, [isDragging, resizeDir, onUpdate, scale, minW, minH]);

  return (
    <div
      className="absolute border border-dotted border-gray-400 group"
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
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Corners */}
        <div 
          data-testid="handle-nw"
          className="absolute -top-1.5 -left-1.5 w-3 h-3 pointer-events-auto cursor-nwse-resize bg-white border border-gray-400 rounded-sm shadow-sm hover:scale-110 transition-transform" 
          onMouseDown={(e) => handleResizeStart(e, 'nw')} 
          onTouchStart={(e) => handleResizeStart(e, 'nw')}
        />
        <div 
          data-testid="handle-ne"
          className="absolute -top-1.5 -right-1.5 w-3 h-3 pointer-events-auto cursor-nesw-resize bg-white border border-gray-400 rounded-sm shadow-sm hover:scale-110 transition-transform" 
          onMouseDown={(e) => handleResizeStart(e, 'ne')} 
          onTouchStart={(e) => handleResizeStart(e, 'ne')}
        />
        <div 
          data-testid="handle-sw"
          className="absolute -bottom-1.5 -left-1.5 w-3 h-3 pointer-events-auto cursor-nesw-resize bg-white border border-gray-400 rounded-sm shadow-sm hover:scale-110 transition-transform" 
          onMouseDown={(e) => handleResizeStart(e, 'sw')} 
          onTouchStart={(e) => handleResizeStart(e, 'sw')}
        />
        <div 
          data-testid="handle-se"
          className="absolute -bottom-1.5 -right-1.5 w-3 h-3 pointer-events-auto cursor-nwse-resize bg-white border border-gray-400 rounded-sm shadow-sm hover:scale-110 transition-transform" 
          onMouseDown={(e) => handleResizeStart(e, 'se')} 
          onTouchStart={(e) => handleResizeStart(e, 'se')}
        />
        
        {/* Sides */}
        <div 
          data-testid="handle-n"
          className="absolute -top-1 left-2 right-2 h-2 pointer-events-auto cursor-ns-resize hover:bg-blue-400/20 transition-colors" 
          onMouseDown={(e) => handleResizeStart(e, 'n')} 
          onTouchStart={(e) => handleResizeStart(e, 'n')}
        />
        <div 
          data-testid="handle-s"
          className="absolute -bottom-1 left-2 right-2 h-2 pointer-events-auto cursor-ns-resize hover:bg-blue-400/20 transition-colors" 
          onMouseDown={(e) => handleResizeStart(e, 's')} 
          onTouchStart={(e) => handleResizeStart(e, 's')}
        />
        <div 
          data-testid="handle-w"
          className="absolute -left-1 top-2 bottom-2 w-2 pointer-events-auto cursor-ew-resize hover:bg-blue-400/20 transition-colors" 
          onMouseDown={(e) => handleResizeStart(e, 'w')} 
          onTouchStart={(e) => handleResizeStart(e, 'w')}
        />
        <div 
          data-testid="handle-e"
          className="absolute -right-1 top-2 bottom-2 w-2 pointer-events-auto cursor-ew-resize hover:bg-blue-400/20 transition-colors" 
          onMouseDown={(e) => handleResizeStart(e, 'e')} 
          onTouchStart={(e) => handleResizeStart(e, 'e')}
        />
      </div>

      {/* Top Left Icons */}
      <div className="absolute -top-3 -left-3 flex items-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <div 
          className="bg-white border shadow-sm rounded-full p-1 cursor-move hover:bg-gray-50 text-gray-500"
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          <Move size={12} />
        </div>
      </div>

      {/* Top Right Icons - Consolidated Settings */}
      <div className="absolute -top-3 -right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Popover open={isSettingsOpen} onOpenChange={handleSettingsOpenChange}>
          <PopoverTrigger asChild>
            <button
              ref={settingsTriggerRef}
              type="button"
              aria-label="Text box settings"
              className="bg-white border shadow-sm rounded-full p-1 hover:bg-gray-50 text-gray-500"
            >
              <Settings size={12} />
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
              {/* Font Size Section */}
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
                  onValueChange={([val]) => onUpdate({ fontSize: val })}
                />
              </div>

              {/* Color Picker Section */}
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
        onFocus={() => setIsFocused(true)}
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
