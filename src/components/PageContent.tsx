'use client';

import React, { useMemo } from 'react';
import BodyTextEditor from './BodyTextEditor';
import TextField from './TextField/TextField';
import { rasterizePaperBackground } from '@/lib/paperBackgroundRasterizer';
import { resolvePageLayout } from '@/lib/pageLayout';
import { TEXT_FIELD_CONTENT_PADDING } from '@/lib/textFieldLayout';
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
  onPageTextChange?: (text: string) => void;
  onPageSettingsChange?: (pageSettings: PageSettings) => void;
  onPreviewEditingChange?: (isPreviewEditing: boolean) => void;
  onBodyPreviewEditingChange?: (isPreviewEditing: boolean) => void;
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
  showCommittedBody = !editable,
  onPageTextChange,
  onPageSettingsChange,
  onPreviewEditingChange,
  onBodyPreviewEditingChange,
  onBlockedEditAttempt,
}: PageContentProps) {
  const layout = resolvePageLayout({ settings, pageSettings, pageIndex });
  const backgroundImage = useMemo(
    () => layout.customBackgroundImage ?? rasterizePaperBackground(layout),
    [layout],
  );

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
            <div
              className={mode === 'preview' ? 'relative h-full w-full whitespace-pre-wrap break-words' : undefined}
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word',
                padding: `${TEXT_FIELD_CONTENT_PADDING * scale}px`,
                fontSize: field.fontSize * scale,
                lineHeight: 1.2,
              }}
            >
              {field.text || '\u00a0'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
