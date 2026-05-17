'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Move, Settings, X } from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { extractPlainTextFromContentEditable, normalizePastedPlainText } from '@/lib/domText';
import { getSelectionOffsets, type PlainTextSelectionOffsets } from '@/lib/domSelection';
import { PAGE_HEIGHT, PAGE_WIDTH } from '@/lib/pageConstants';
import { resolveTextFieldCaretRect, resolveTextFieldSelectionRects } from '@/lib/textFieldEditingChrome';
import { calculateAutoFitTextFieldSize, TEXT_FIELD_CONTENT_PADDING, TEXT_FIELD_LINE_HEIGHT } from '@/lib/textFieldLayout';
import { TextField as TextFieldType } from '@/lib/types';
import { cn } from '@/lib/utils';
import CommittedTextFieldContent from './CommittedTextFieldContent';

interface TextFieldProps {
  field: TextFieldType;
  onUpdate: (updates: Partial<TextFieldType>) => void;
  onDelete: () => void;
  scale: number;
  fontFamily: string;
  onPreviewEditingChange?: (isPreviewEditing: boolean) => void;
  pageWidth?: number;
  pageHeight?: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function insertTextAtSelection(text: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.setEndAfter(node);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function selectedTextFromOffsets(text: string, selection: PlainTextSelectionOffsets | null) {
  if (!selection) return '';
  const start = Math.min(selection.anchor, selection.focus);
  const end = Math.max(selection.anchor, selection.focus);
  return text.slice(start, end);
}

function deleteSelectedRange() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  if (range.collapsed) return false;

  range.deleteContents();
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

export default function TextField({
  field,
  onUpdate,
  onDelete,
  scale,
  fontFamily,
  onPreviewEditingChange,
  pageWidth = PAGE_WIDTH,
  pageHeight = PAGE_HEIGHT,
}: TextFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsAnchorPoint, setSettingsAnchorPoint] = useState<{ left: number; top: number } | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, fieldX: 0, fieldY: 0, fieldW: 0, fieldH: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const isFocusedRef = useRef(false);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const previousAutoFitSizeRef = useRef<{ width: number; height: number } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<PlainTextSelectionOffsets | null>(null);
  const showControls = isSelected || isFocused || isSettingsOpen || isDragging;

  const autoFitSize = useMemo(
    () => calculateAutoFitTextFieldSize({
      text: field.text,
      fontSize: field.fontSize,
      fontFamily,
      x: field.x,
      y: field.y,
      pageWidth,
      pageHeight,
    }),
    [field.fontSize, field.text, field.x, field.y, fontFamily, pageHeight, pageWidth]
  );
  const selectionRects = useMemo(() => {
    if (!isFocused) return [];
    return resolveTextFieldSelectionRects({
      text: field.text,
      fontSize: field.fontSize,
      fontFamily,
      width: field.width,
      selection,
    });
  }, [field.fontSize, field.text, field.width, fontFamily, isFocused, selection]);
  const caretRect = useMemo(() => {
    if (!isFocused) return null;
    return resolveTextFieldCaretRect({
      text: field.text,
      fontSize: field.fontSize,
      fontFamily,
      width: field.width,
      selection,
    });
  }, [field.fontSize, field.text, field.width, fontFamily, isFocused, selection]);

  const emitSelectionChange = useCallback((editor: HTMLElement | null) => {
    if (!editor) return;
    setSelection(getSelectionOffsets(editor));
  }, []);

  const syncBridgeValue = useCallback((editor: HTMLDivElement) => {
    emitSelectionChange(editor);
    const nextText = extractPlainTextFromContentEditable(editor);
    const nextSize = calculateAutoFitTextFieldSize({
      text: nextText,
      fontSize: field.fontSize,
      fontFamily,
      x: field.x,
      y: field.y,
      pageWidth,
      pageHeight,
    });
    if (!nextSize) return;

    const updates: Partial<TextFieldType> = {};
    if (nextText !== field.text) {
      updates.text = nextText;
    }
    if (field.width !== nextSize.width) {
      updates.width = nextSize.width;
    }
    if (field.height !== nextSize.height) {
      updates.height = nextSize.height;
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
    }
  }, [emitSelectionChange, field.fontSize, field.height, field.text, field.width, field.x, field.y, fontFamily, onUpdate, pageHeight, pageWidth]);

  const scheduleBridgeSync = useCallback((editor: HTMLDivElement) => {
    queueMicrotask(() => {
      if (editorRef.current !== editor) return;
      syncBridgeValue(editor);
    });
  }, [syncBridgeValue]);

  const syncSelectionOnNextFrame = useCallback(() => {
    queueMicrotask(() => {
      emitSelectionChange(editorRef.current);
    });
  }, [emitSelectionChange]);

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
    const nextX = clamp(field.x, 0, Math.max(0, pageWidth - field.width));
    const nextY = clamp(field.y, 0, Math.max(0, pageHeight - field.height));
    if (nextX !== field.x || nextY !== field.y) {
      onUpdate({ x: nextX, y: nextY });
    }
  }, [field.height, field.width, field.x, field.y, onUpdate, pageHeight, pageWidth]);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor || isFocusedRef.current) return;
    if (editor.textContent !== field.text) {
      editor.textContent = field.text;
    }
  }, [field.text]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleSelectionChange = () => {
      const editor = editorRef.current;
      if (!editor || !isFocusedRef.current) return;
      emitSelectionChange(editor);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [emitSelectionChange]);

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
        x: clamp(dragStartRef.current.fieldX + dx, 0, Math.max(0, pageWidth - dragStartRef.current.fieldW)),
        y: clamp(dragStartRef.current.fieldY + dy, 0, Math.max(0, pageHeight - dragStartRef.current.fieldH)),
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
  }, [onUpdate, pageHeight, pageWidth, scale]);

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
          'absolute -top-3.5 -left-3.5 flex items-center z-10 transition-opacity',
          showControls ? 'opacity-100' : 'opacity-0 xl:group-hover:opacity-100'
        )}
      >
        <button
          type="button"
          aria-label="Move text box"
          className="size-7 bg-white border shadow-sm rounded-full cursor-move hover:bg-gray-50 text-gray-500 touch-none flex items-center justify-center"
          onPointerDown={handleDragPointerDown}
        >
          <Move size={10} />
        </button>
      </div>

      <div
        className={cn(
          'absolute -top-3.5 -right-3.5 z-10 transition-opacity',
          showControls ? 'opacity-100' : 'opacity-0 xl:group-hover:opacity-100'
        )}
      >
        <Popover open={isSettingsOpen} onOpenChange={handleSettingsOpenChange}>
          <PopoverTrigger asChild>
            <button
              ref={settingsTriggerRef}
              type="button"
              aria-label="Text box settings"
              className="size-7 bg-white border shadow-sm rounded-full hover:bg-gray-50 text-gray-500 flex items-center justify-center"
            >
              <Settings size={10} />
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
                    const nextSize = calculateAutoFitTextFieldSize({
                      text: field.text,
                      fontSize: val,
                      fontFamily,
                      x: field.x,
                      y: field.y,
                      pageWidth,
                      pageHeight,
                    });
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
        ref={editorRef}
        data-text-box-input-bridge="true"
        contentEditable="plaintext-only"
        suppressContentEditableWarning
        role="textbox"
        aria-label="Text Box editor"
        spellCheck={false}
        className="absolute inset-0 w-full h-full bg-transparent border-none outline-none overflow-hidden"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
          }
        }}
        onInput={(e) => syncBridgeValue(e.currentTarget)}
        onPaste={(e) => {
          e.preventDefault();
          const pasted = normalizePastedPlainText(e.clipboardData.getData('text/plain'));
          if (!insertTextAtSelection(pasted)) return;
          syncBridgeValue(e.currentTarget);
        }}
        onCopy={(e) => {
          const currentText = extractPlainTextFromContentEditable(e.currentTarget);
          const selectedText = selectedTextFromOffsets(currentText, getSelectionOffsets(e.currentTarget));
          if (!selectedText) return;

          e.preventDefault();
          e.clipboardData.setData('text/plain', selectedText);
        }}
        onCut={(e) => {
          const currentText = extractPlainTextFromContentEditable(e.currentTarget);
          const selectedText = selectedTextFromOffsets(currentText, getSelectionOffsets(e.currentTarget));
          if (!selectedText) return;

          e.preventDefault();
          e.clipboardData.setData('text/plain', selectedText);
          if (!deleteSelectedRange()) return;
          syncBridgeValue(e.currentTarget);
        }}
        onFocus={(e) => {
          isFocusedRef.current = true;
          onPreviewEditingChange?.(true);
          setIsFocused(true);
          setIsSelected(true);
          emitSelectionChange(e.currentTarget);
        }}
        onBlur={() => {
          isFocusedRef.current = false;
          onPreviewEditingChange?.(false);
          setIsFocused(false);
          setSelection(null);
        }}
        onKeyUp={syncSelectionOnNextFrame}
        onMouseUp={syncSelectionOnNextFrame}
        onCompositionStart={(e) => scheduleBridgeSync(e.currentTarget)}
        onCompositionUpdate={(e) => scheduleBridgeSync(e.currentTarget)}
        onCompositionEnd={(e) => syncBridgeValue(e.currentTarget)}
        style={{
          fontSize: field.fontSize * scale,
          lineHeight: `${field.fontSize * TEXT_FIELD_LINE_HEIGHT * scale}px`,
          color: 'transparent',
          whiteSpace: 'break-spaces',
          overflowWrap: 'break-word',
          caretColor: 'transparent',
          WebkitTextFillColor: 'transparent',
          backgroundColor: 'transparent',
          minHeight: 'inherit',
          padding: `${TEXT_FIELD_CONTENT_PADDING * scale}px`,
        }}
      />

      <CommittedTextFieldContent
        field={field}
        fontFamily={fontFamily}
        scale={scale}
      />

      {isFocused && (
        <div
          aria-hidden="true"
          data-text-field-layer="editing-chrome"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
          }}
        >
          {selectionRects.map((rect, index) => (
            <div
              key={`${rect.top}-${rect.left}-${index}`}
              data-text-field-layer="selection-highlight"
              style={{
                position: 'absolute',
                left: TEXT_FIELD_CONTENT_PADDING * scale + rect.left * scale,
                top: TEXT_FIELD_CONTENT_PADDING * scale + rect.top * scale,
                width: rect.width * scale,
                height: rect.height * scale,
                backgroundColor: 'rgba(59, 130, 246, 0.22)',
                borderRadius: 2,
              }}
            />
          ))}

          {caretRect && selection && selection.anchor === selection.focus && (
            <div
              data-text-field-layer="caret"
              style={{
                position: 'absolute',
                left: TEXT_FIELD_CONTENT_PADDING * scale + caretRect.left * scale,
                top: TEXT_FIELD_CONTENT_PADDING * scale + caretRect.top * scale,
                width: 2,
                height: caretRect.height * scale,
                backgroundColor: field.color,
                borderRadius: 999,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
