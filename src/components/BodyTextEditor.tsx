'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { HandwritingSettings, PageSettings } from '@/lib/types';
import { extractPlainTextFromContentEditable, normalizePastedPlainText } from '@/lib/domText';
import type { PlainTextSelectionOffsets } from '@/lib/domSelection';
import { getSelectionOffsets } from '@/lib/domSelection';
import { resolvePageLayout } from '@/lib/pageLayout';

interface BodyTextEditorProps {
  pageText: string;
  pageSettings: PageSettings;
  settings: HandwritingSettings;
  scale: number;
  fontFamily: string;
  hasCustomBackground: boolean;
  pageIndex?: number;
  isVisible?: boolean;
  onPageTextChange: (text: string) => void;
  onSelectionChange?: (selection: PlainTextSelectionOffsets | null) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isLocked?: boolean;
  onBlockedEditAttempt?: () => void;
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

export default function BodyTextEditor({
  pageText,
  pageSettings,
  settings,
  scale,
  fontFamily,
  hasCustomBackground,
  pageIndex = 0,
  isVisible = true,
  onPageTextChange,
  onSelectionChange,
  onFocus,
  onBlur,
  isLocked = false,
  onBlockedEditAttempt,
}: BodyTextEditorProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isFocusedRef = useRef(false);

  const emitSelectionChange = () => {
    const el = ref.current;
    if (!el) return;
    onSelectionChange?.(getSelectionOffsets(el));
  };

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || isFocusedRef.current) return;
    if (el.textContent !== pageText) {
      el.textContent = pageText;
    }
  }, [pageText]);

  void hasCustomBackground;
  const layout = resolvePageLayout({ settings, pageSettings, pageIndex });
  const lineHeightPx = layout.lineSpacing;
  const left = layout.writingBox.x;

  return (
    <div
      ref={ref}
      data-body-input-bridge="true"
      contentEditable={isLocked ? false : 'plaintext-only'}
      suppressContentEditableWarning
      role="textbox"
      aria-label="Handwriting body editor"
      spellCheck={false}
      className="absolute outline-none"
      style={{
        left: left * scale,
        top: layout.writingBox.y * scale,
        width: layout.writingBox.width * scale,
        height: layout.writingBox.height * scale,
        fontFamily,
        fontSize: pageSettings.fontSize * scale,
        lineHeight: `${lineHeightPx * scale}px`,
        color: 'transparent',
        whiteSpace: 'break-spaces',
        overflowWrap: 'break-word',
        transform: pageSettings.lineTilt ? `rotate(${pageSettings.lineTilt}deg)` : undefined,
        transformOrigin: 'top left',
        caretColor: 'transparent',
        WebkitTextFillColor: 'transparent',
        backgroundColor: 'transparent',
        opacity: isVisible ? 1 : 0,
      }}
      onInput={(event) => {
        if (isLocked) {
          onBlockedEditAttempt?.();
          return;
        }
        onPageTextChange(extractPlainTextFromContentEditable(event.currentTarget));
        emitSelectionChange();
      }}
      onPaste={(event) => {
        if (isLocked) {
          event.preventDefault();
          onBlockedEditAttempt?.();
          return;
        }
        event.preventDefault();
        const pasted = normalizePastedPlainText(event.clipboardData.getData('text/plain'));
        if (!insertTextAtSelection(pasted)) return;
        onPageTextChange(extractPlainTextFromContentEditable(event.currentTarget));
        emitSelectionChange();
      }}
      onCopy={(event) => {
        const selection = getSelectionOffsets(event.currentTarget);
        const selectedText = selectedTextFromOffsets(
          extractPlainTextFromContentEditable(event.currentTarget),
          selection,
        );
        if (!selectedText) return;

        event.preventDefault();
        event.clipboardData.setData('text/plain', selectedText);
      }}
      onCut={(event) => {
        if (isLocked) {
          event.preventDefault();
          onBlockedEditAttempt?.();
          return;
        }

        const selection = getSelectionOffsets(event.currentTarget);
        const selectedText = selectedTextFromOffsets(
          extractPlainTextFromContentEditable(event.currentTarget),
          selection,
        );
        if (!selectedText) return;

        event.preventDefault();
        event.clipboardData.setData('text/plain', selectedText);
        if (!deleteSelectedRange()) return;
        onPageTextChange(extractPlainTextFromContentEditable(event.currentTarget));
        emitSelectionChange();
      }}
      onMouseDown={() => {
        if (isLocked) {
          onBlockedEditAttempt?.();
        }
      }}
      onFocus={() => {
        isFocusedRef.current = true;
        onFocus?.();
        emitSelectionChange();
      }}
      onCompositionStart={() => {
        if (isLocked) {
          onBlockedEditAttempt?.();
          return;
        }
        emitSelectionChange();
      }}
      onCompositionEnd={(event) => {
        if (isLocked) {
          onBlockedEditAttempt?.();
          return;
        }
        onPageTextChange(extractPlainTextFromContentEditable(event.currentTarget));
        emitSelectionChange();
      }}
      onKeyUp={emitSelectionChange}
      onMouseUp={emitSelectionChange}
      onBlur={(event) => {
        isFocusedRef.current = false;
        if (!isLocked) {
          onPageTextChange(extractPlainTextFromContentEditable(event.currentTarget));
        }
        onSelectionChange?.(null);
        onBlur?.();
      }}
    />
  );
}
