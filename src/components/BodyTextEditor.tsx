'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { HandwritingSettings, PageSettings } from '@/lib/types';
import { extractPlainTextFromContentEditable, normalizePastedPlainText } from '@/lib/domText';
import { resolvePageLayout } from '@/lib/pageLayout';
import { printableBodyStyle } from '@/lib/printablePage';

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

  return (
    <div
      ref={ref}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      aria-label="Handwriting body editor"
      spellCheck={false}
      data-printable-layer="body"
      className="absolute outline-none"
      style={{
        ...printableBodyStyle({ pageSettings, fontFamily, layout, scale }),
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
    />
  );
}
