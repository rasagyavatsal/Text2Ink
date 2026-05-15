'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { HandwritingSettings, PageSettings } from '@/lib/types';
import { extractPlainTextFromContentEditable, normalizePastedPlainText } from '@/lib/domText';
import { resolvePageLayout } from '@/lib/pageLayout';

interface BodyTextEditorProps {
  pageText: string;
  pageSettings: PageSettings;
  settings: HandwritingSettings;
  scale: number;
  fontFamily: string;
  hasCustomBackground: boolean;
  pageIndex?: number;
  onPageTextChange: (text: string) => void;
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

export default function BodyTextEditor({
  pageText,
  pageSettings,
  settings,
  scale,
  fontFamily,
  hasCustomBackground,
  pageIndex = 0,
  onPageTextChange,
  onFocus,
  onBlur,
  isLocked = false,
  onBlockedEditAttempt,
}: BodyTextEditorProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isFocusedRef = useRef(false);
  const isComposingRef = useRef(false);

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
        color: pageSettings.inkColor,
        whiteSpace: 'break-spaces',
        overflowWrap: 'break-word',
        transform: pageSettings.lineTilt ? `rotate(${pageSettings.lineTilt}deg)` : undefined,
        transformOrigin: 'top left',
        caretColor: pageSettings.inkColor,
      }}
      onInput={(event) => {
        if (isLocked) {
          onBlockedEditAttempt?.();
          return;
        }
        if (isComposingRef.current) return;
        onPageTextChange(extractPlainTextFromContentEditable(event.currentTarget));
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
      }}
      onMouseDown={() => {
        if (isLocked) {
          onBlockedEditAttempt?.();
        }
      }}
      onFocus={() => {
        isFocusedRef.current = true;
        onFocus?.();
      }}
      onCompositionStart={() => {
        if (isLocked) {
          onBlockedEditAttempt?.();
          return;
        }
        isComposingRef.current = true;
      }}
      onCompositionEnd={(event) => {
        if (isLocked) {
          onBlockedEditAttempt?.();
          return;
        }
        isComposingRef.current = false;
        onPageTextChange(extractPlainTextFromContentEditable(event.currentTarget));
      }}
      onBlur={(event) => {
        isFocusedRef.current = false;
        if (!isLocked) {
          onPageTextChange(extractPlainTextFromContentEditable(event.currentTarget));
        }
        onBlur?.();
      }}
    />
  );
}
