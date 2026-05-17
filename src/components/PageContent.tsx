'use client';

import React, { useMemo } from 'react';
import BodyTextEditor from './BodyTextEditor';
import CommittedTextFieldContent from './TextField/CommittedTextFieldContent';
import TextField from './TextField/TextField';
import {
  resolveBodyCaretRect,
  resolveBodySelectionRects,
  type BodySelectionOffsets,
} from '@/lib/bodyEditingChrome';
import { createMeasure } from '@/lib/pagination';
import { rasterizePaperBackground } from '@/lib/paperBackgroundRasterizer';
import { resolvePageLayout } from '@/lib/pageLayout';
import type { HandwritingSettings, LineData, PageSettings } from '@/lib/types';

type PageContentMode = 'preview' | 'export';

export interface PageContentProps {
  mode?: PageContentMode;
  pageIndex: number;
  pageText: string;
  pageLines?: LineData[];
  pageSettings: PageSettings;
  settings: HandwritingSettings;
  fontFamily: string;
  scale: number;
  editable?: boolean;
  isLocked?: boolean;
  bodyEditorVisible?: boolean;
  showCommittedBody?: boolean;
  isBodyPreviewEditing?: boolean;
  bodySelection?: BodySelectionOffsets | null;
  onPageTextChange?: (text: string) => void;
  onPageSettingsChange?: (pageSettings: PageSettings) => void;
  onPreviewEditingChange?: (isPreviewEditing: boolean) => void;
  onBodyPreviewEditingChange?: (isPreviewEditing: boolean) => void;
  onBodySelectionChange?: (selection: BodySelectionOffsets | null) => void;
  onBlockedEditAttempt?: () => void;
}

function exportIsolationStyle(scaleWidth: number, scaleHeight: number, backgroundColor: string) {
  return {
    all: 'initial',
    position: 'relative',
    display: 'block',
    overflow: 'hidden',
    width: `${scaleWidth}px`,
    height: `${scaleHeight}px`,
    boxSizing: 'border-box',
    backgroundColor,
  } as const;
}

function staticBodyStyle(opts: {
  left: number;
  top: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  color: string;
  lineTilt: number;
}) {
  return {
    position: 'absolute',
    left: `${opts.left}px`,
    top: `${opts.top}px`,
    width: `${opts.width}px`,
    height: `${opts.height}px`,
    fontFamily: opts.fontFamily,
    fontSize: `${opts.fontSize}px`,
    lineHeight: `${opts.lineHeight}px`,
    color: opts.color,
    whiteSpace: 'break-spaces',
    overflowWrap: 'break-word',
    transform: opts.lineTilt ? `rotate(${opts.lineTilt}deg)` : undefined,
    transformOrigin: 'top left',
    pointerEvents: 'none',
  } as const;
}

function staticBodyLineStyle(opts: {
  top: number;
  height: number;
}) {
  return {
    position: 'absolute',
    left: '0',
    top: `${opts.top}px`,
    width: '100%',
    height: `${opts.height}px`,
    whiteSpace: 'pre',
  } as const;
}

function staticTextFieldRootStyle(opts: {
  left: number;
  top: number;
  width: number;
  height: number;
  fontFamily: string;
  color: string;
  pointerEvents?: 'auto' | 'none';
}) {
  return {
    position: 'absolute',
    left: `${opts.left}px`,
    top: `${opts.top}px`,
    width: `${opts.width}px`,
    height: `${opts.height}px`,
    fontFamily: opts.fontFamily,
    color: opts.color,
    pointerEvents: opts.pointerEvents ?? 'none',
  } as const;
}

export default function PageContent({
  mode = 'preview',
  pageIndex,
  pageText,
  pageLines,
  pageSettings,
  settings,
  fontFamily,
  scale,
  editable = false,
  isLocked = false,
  bodyEditorVisible = editable,
  showCommittedBody = true,
  isBodyPreviewEditing = false,
  bodySelection = null,
  onPageTextChange,
  onPageSettingsChange,
  onPreviewEditingChange,
  onBodyPreviewEditingChange,
  onBodySelectionChange,
  onBlockedEditAttempt,
}: PageContentProps) {
  const layout = resolvePageLayout({ settings, pageSettings, pageIndex });
  const backgroundImage = useMemo(
    () => layout.customBackgroundImage ?? rasterizePaperBackground(layout),
    [layout],
  );
  const bodyMeasure = useMemo(
    () => createMeasure(fontFamily, pageSettings.fontSize * scale),
    [fontFamily, pageSettings.fontSize, scale],
  );
  const bodySelectionRects = useMemo(() => {
    if (mode !== 'preview' || !editable || !isBodyPreviewEditing) return [];
    return resolveBodySelectionRects({
      lines: pageLines ?? [],
      selection: bodySelection,
      lineHeight: layout.lineSpacing * scale,
      measure: bodyMeasure,
    });
  }, [bodyMeasure, bodySelection, editable, isBodyPreviewEditing, layout.lineSpacing, mode, pageLines, scale]);
  const bodyCaretRect = useMemo(() => {
    if (mode !== 'preview' || !editable || !isBodyPreviewEditing) return null;
    return resolveBodyCaretRect({
      lines: pageLines ?? [],
      selection: bodySelection,
      lineHeight: layout.lineSpacing * scale,
      measure: bodyMeasure,
    });
  }, [bodyMeasure, bodySelection, editable, isBodyPreviewEditing, layout.lineSpacing, mode, pageLines, scale]);

  return (
    <div
      data-page-content-mode={mode}
      data-page-surface={pageIndex}
      className={mode === 'preview' ? 'relative overflow-hidden' : undefined}
      style={
        mode === 'export'
          ? exportIsolationStyle(
              layout.width * scale,
              layout.height * scale,
              backgroundImage ? 'transparent' : (layout.paperTemplate?.tone ?? pageSettings.paperColor),
            )
          : {
              width: layout.width * scale,
              height: layout.height * scale,
              backgroundColor: backgroundImage ? 'transparent' : (layout.paperTemplate?.tone ?? pageSettings.paperColor),
              boxSizing: 'border-box',
            }
      }
    >
      {backgroundImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          aria-hidden="true"
          data-page-layer="background-image"
          src={backgroundImage}
          className={mode === 'preview' ? 'absolute inset-0' : undefined}
          style={{
            position: 'absolute',
            inset: '0',
            width: layout.width * scale,
            height: layout.height * scale,
            objectFit: 'fill',
            pointerEvents: 'none',
          }}
        />
      )}

      {editable && (
        <BodyTextEditor
          pageText={pageText}
          pageSettings={pageSettings}
          settings={settings}
          scale={scale}
          fontFamily={fontFamily}
          hasCustomBackground={!!layout.customBackgroundImage}
          pageIndex={pageIndex}
          isVisible={bodyEditorVisible}
          onPageTextChange={onPageTextChange ?? (() => {})}
          onSelectionChange={onBodySelectionChange}
          onFocus={() => {
            onBodyPreviewEditingChange?.(true);
            onPreviewEditingChange?.(true);
          }}
          onBlur={() => {
            onBodyPreviewEditingChange?.(false);
            onPreviewEditingChange?.(false);
          }}
          isLocked={isLocked}
          onBlockedEditAttempt={onBlockedEditAttempt}
        />
      )}

      {(showCommittedBody || !editable) && (
        <div
          data-page-layer="body"
          style={staticBodyStyle({
            left: layout.writingBox.x * scale,
            top: layout.writingBox.y * scale,
            width: layout.writingBox.width * scale,
            height: layout.writingBox.height * scale,
            fontFamily,
            fontSize: pageSettings.fontSize * scale,
            lineHeight: layout.lineSpacing * scale,
            color: pageSettings.inkColor,
            lineTilt: pageSettings.lineTilt,
          })}
        >
          {pageLines?.length
            ? pageLines.map((line, lineIndex) => (
                <div
                  key={`${line.lineIndex}-${lineIndex}`}
                  data-page-layer="body-line"
                  style={staticBodyLineStyle({
                    top: lineIndex * layout.lineSpacing * scale,
                    height: layout.lineSpacing * scale,
                  })}
                >
                  {line.text || '\u00a0'}
                </div>
              ))
            : (pageText || '\u00a0')}
        </div>
      )}

      {mode === 'preview' && editable && isBodyPreviewEditing && (
        <div
          aria-hidden="true"
          data-page-layer="body-editing-chrome"
          style={{
            position: 'absolute',
            left: layout.writingBox.x * scale,
            top: layout.writingBox.y * scale,
            width: layout.writingBox.width * scale,
            height: layout.writingBox.height * scale,
            pointerEvents: 'none',
          }}
        >
          {bodySelectionRects.map((rect, index) => (
            <div
              key={`${rect.top}-${rect.left}-${index}`}
              data-page-layer="body-selection-highlight"
              style={{
                position: 'absolute',
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                backgroundColor: 'rgba(59, 130, 246, 0.22)',
                borderRadius: 2,
              }}
            />
          ))}

          {bodyCaretRect && bodySelection && bodySelection.anchor === bodySelection.focus && (
            <div
              data-page-layer="body-caret"
              style={{
                position: 'absolute',
                left: bodyCaretRect.left,
                top: bodyCaretRect.top,
                width: 2,
                height: bodyCaretRect.height,
                backgroundColor: pageSettings.inkColor,
                borderRadius: 999,
              }}
            />
          )}
        </div>
      )}

      {(pageSettings.textFields ?? []).map((field) => {
        if (editable && !isLocked && onPageSettingsChange) {
          return (
            <div
              key={field.id}
              onMouseDown={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <TextField
                field={field}
                scale={scale}
                fontFamily={fontFamily}
                pageWidth={layout.width}
                pageHeight={layout.height}
                onPreviewEditingChange={onPreviewEditingChange}
                onUpdate={(updates) => {
                  const nextFields = (pageSettings.textFields ?? []).map((candidate) =>
                    candidate.id === field.id ? { ...candidate, ...updates } : candidate,
                  );
                  onPageSettingsChange({ ...pageSettings, textFields: nextFields });
                }}
                onDelete={() => {
                  const nextFields = (pageSettings.textFields ?? []).filter((candidate) => candidate.id !== field.id);
                  onPageSettingsChange({ ...pageSettings, textFields: nextFields });
                }}
              />
            </div>
          );
        }

        return (
          <div
            key={field.id}
            data-page-layer="text-field"
            onMouseDown={(event) => {
              if (isLocked) {
                event.preventDefault();
                event.stopPropagation();
                onBlockedEditAttempt?.();
              }
            }}
            onPointerDown={(event) => {
              if (isLocked) {
                event.preventDefault();
                event.stopPropagation();
                onBlockedEditAttempt?.();
              }
            }}
            style={staticTextFieldRootStyle({
              left: field.x * scale,
              top: field.y * scale,
              width: field.width * scale,
              height: field.height * scale,
              fontFamily,
              color: field.color,
              pointerEvents: isLocked ? 'auto' : 'none',
            })}
          >
            <CommittedTextFieldContent
              field={field}
              fontFamily={fontFamily}
              scale={scale}
              lineDataPageLayer="text-field-line"
            />
          </div>
        );
      })}
    </div>
  );
}
