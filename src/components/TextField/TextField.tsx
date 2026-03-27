'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Move, X, Settings } from 'lucide-react';
import { TextField as TextFieldType, HandwritingSettings } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { calculateRandomStyle } from '@/lib/editorHelpers';

interface TextFieldProps {
  field: TextFieldType;
  onUpdate: (updates: Partial<TextFieldType>) => void;
  onDelete: () => void;
  scale: number;
  fontFamily: string;
  randomness: HandwritingSettings['randomness'];
}

export default function TextField({ field, onUpdate, onDelete, scale, fontFamily, randomness }: TextFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [resizeDir, setResizeDir] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, fieldX: 0, fieldY: 0, fieldW: 0, fieldH: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setResizeDir(null);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      fieldX: field.x,
      fieldY: field.y,
      fieldW: field.width,
      fieldH: field.height,
    };
  };

  const handleResizeStart = (e: React.MouseEvent, dir: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizeDir(dir);
    setIsDragging(false);
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
    if (!isDragging && !resizeDir) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStartRef.current.x) / scale;
      const dy = (e.clientY - dragStartRef.current.y) / scale;

      if (isDragging) {
        onUpdate({
          x: dragStartRef.current.fieldX + dx,
          y: dragStartRef.current.fieldY + dy,
        });
      } else if (resizeDir) {
        let { fieldX: x, fieldY: y, fieldW: w, fieldH: h } = dragStartRef.current;
        const minSize = 40;

        if (resizeDir.includes('e')) w = Math.max(minSize, w + dx);
        if (resizeDir.includes('s')) h = Math.max(minSize, h + dy);
        if (resizeDir.includes('w')) {
          const newW = Math.max(minSize, w - dx);
          x = x + (w - newW);
          w = newW;
        }
        if (resizeDir.includes('n')) {
          const newH = Math.max(minSize, h - dy);
          y = y + (h - newH);
          h = newH;
        }

        onUpdate({ x, y, width: w, height: h });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setResizeDir(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, resizeDir, onUpdate, scale]);

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
      <div className="absolute inset-0 pointer-events-none">
        {/* Corners */}
        <div className="absolute -top-1 -left-1 w-2 h-2 pointer-events-auto cursor-nwse-resize" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
        <div className="absolute -top-1 -right-1 w-2 h-2 pointer-events-auto cursor-nesw-resize" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
        <div className="absolute -bottom-1 -left-1 w-2 h-2 pointer-events-auto cursor-nesw-resize" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
        <div className="absolute -bottom-1 -right-1 w-2 h-2 pointer-events-auto cursor-nwse-resize" onMouseDown={(e) => handleResizeStart(e, 'se')} />
        
        {/* Sides */}
        <div className="absolute top-0 left-1 right-1 h-1 pointer-events-auto cursor-ns-resize" onMouseDown={(e) => handleResizeStart(e, 'n')} />
        <div className="absolute bottom-0 left-1 right-1 h-1 pointer-events-auto cursor-ns-resize" onMouseDown={(e) => handleResizeStart(e, 's')} />
        <div className="absolute left-0 top-1 bottom-1 w-1 pointer-events-auto cursor-ew-resize" onMouseDown={(e) => handleResizeStart(e, 'w')} />
        <div className="absolute right-0 top-1 bottom-1 w-1 pointer-events-auto cursor-ew-resize" onMouseDown={(e) => handleResizeStart(e, 'e')} />
      </div>

      {/* Top Left Icons */}
      <div className="absolute -top-3 -left-3 flex items-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <div 
          className="bg-white border shadow-sm rounded-full p-1 cursor-move hover:bg-gray-50 text-gray-500"
          onMouseDown={handleMouseDown}
        >
          <Move size={12} />
        </div>
      </div>

      {/* Top Right Icons - Consolidated Settings */}
      <div className="absolute -top-3 -right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Popover>
          <PopoverTrigger asChild>
            <button className="bg-white border shadow-sm rounded-full p-1 hover:bg-gray-50 text-gray-500">
              <Settings size={12} />
            </button>
          </PopoverTrigger>
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
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
           fontSize: field.fontSize * scale,
           color: isFocused ? field.color : 'transparent',
           caretColor: field.color,
           minHeight: 'inherit',
        }}
        placeholder={isFocused ? "Text..." : ""}
      />
    </div>
  );
}
