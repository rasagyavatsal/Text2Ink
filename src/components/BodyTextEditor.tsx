'use client';

import React, { useEffect, useRef } from 'react';
import { HandwritingSettings, PageSettings } from '@/lib/types';
import { PAGE_WIDTH, PAGE_HEIGHT } from '@/lib/pageConstants';
import { extractPlainTextFromContentEditable, normalizePastedPlainText } from '@/lib/domText';

interface BodyTextEditorProps {
  pageText: string;
  pageSettings: PageSettings;
  settings: HandwritingSettings;
  scale: number;
  fontFamily: string;
  hasCustomBackground: boolean;
  onPageTextChange: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
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
  onPageTextChange,
  onFocus,
  onBlur,
}: BodyTextEditorProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isFocusedRef = useRef(false);
  const isComposingRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || isFocusedRef.current) return;
    if (el.textContent !== pageText) {
      el.textContent = pageText;
    }
  }, [pageText]);

  const lineHeightPx = hasCustomBackground && pageSettings.customLineSpacing
    ? pageSettings.customLineSpacing
    : pageSettings.fontSize * settings.lineHeight;
  const pageLineOffset = hasCustomBackground ? (pageSettings.customLineOffset ?? 0) : 0;
  const left = settings.paperStyle === 'ruled' && !hasCustomBackground
    ? pageSettings.marginLeft + settings.ruledMarginLineOffset + 10
    : pageSettings.marginLeft;

  return (
    <div
      ref={ref}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      aria-label="Handwriting body editor"
      spellCheck={false}
      className="absolute outline-none"
      style={{
        left: left * scale,
        top: (pageSettings.marginTop + pageLineOffset) * scale,
        width: (PAGE_WIDTH - left - pageSettings.marginRight) * scale,
        height: (PAGE_HEIGHT - pageSettings.marginTop - pageSettings.marginBottom) * scale,
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
        if (isComposingRef.current) return;
        onPageTextChange(extractPlainTextFromContentEditable(event.currentTarget));
      }}
      onPaste={(event) => {
        event.preventDefault();
        const pasted = normalizePastedPlainText(event.clipboardData.getData('text/plain'));
        if (!insertTextAtSelection(pasted)) return;
        onPageTextChange(extractPlainTextFromContentEditable(event.currentTarget));
      }}
      onFocus={() => {
        isFocusedRef.current = true;
        onFocus?.();
      }}
      onCompositionStart={() => {
        isComposingRef.current = true;
      }}
      onCompositionEnd={(event) => {
        isComposingRef.current = false;
        onPageTextChange(extractPlainTextFromContentEditable(event.currentTarget));
      }}
      onBlur={(event) => {
        isFocusedRef.current = false;
        onPageTextChange(extractPlainTextFromContentEditable(event.currentTarget));
        onBlur?.();
      }}
    >
      {pageText}
    </div>
  );
}
