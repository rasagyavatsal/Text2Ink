import React from 'react';
import type { CSSProperties } from 'react';
import type { HandwritingSettings, PageSettings } from './types';
import { resolvePageLayout, type ResolvedPageLayout } from './pageLayout';
import { rasterizePaperBackground } from './paperBackgroundRasterizer';

/* eslint-disable @next/next/no-img-element */

export type PrintablePageMode = 'preview' | 'export';

type PrintablePageProps = {
  pageIndex: number;
  pageText: string;
  pageSettings: PageSettings;
  settings: HandwritingSettings;
  fontFamily: string;
  mode: PrintablePageMode;
};

export function printableResetStyle(): CSSProperties {
  return {
    all: 'initial',
    display: 'block',
    boxSizing: 'border-box',
    borderStyle: 'none',
    borderColor: 'transparent',
    outlineStyle: 'none',
    outlineColor: 'transparent',
    boxShadow: 'none',
    textDecorationColor: 'transparent',
  };
}

export function printablePageStyle(layout: ResolvedPageLayout, pageSettings: PageSettings): CSSProperties {
  const backgroundImage = layout.customBackgroundImage;

  return {
    ...printableResetStyle(),
    position: 'relative',
    width: `${layout.width}px`,
    height: `${layout.height}px`,
    overflow: 'hidden',
    backgroundColor: backgroundImage ? 'transparent' : (layout.paperTemplate?.tone ?? pageSettings.paperColor),
  };
}

export function printableBodyStyle(opts: {
  pageSettings: PageSettings;
  fontFamily: string;
  layout: ResolvedPageLayout;
  scale?: number;
}): CSSProperties {
  const { pageSettings, fontFamily, layout, scale = 1 } = opts;

  return {
    ...printableResetStyle(),
    position: 'absolute',
    left: `${layout.writingBox.x * scale}px`,
    top: `${layout.writingBox.y * scale}px`,
    width: `${layout.writingBox.width * scale}px`,
    height: `${layout.writingBox.height * scale}px`,
    fontFamily,
    fontSize: `${pageSettings.fontSize * scale}px`,
    lineHeight: `${layout.lineSpacing * scale}px`,
    color: pageSettings.inkColor,
    whiteSpace: 'break-spaces',
    overflowWrap: 'break-word',
    transform: pageSettings.lineTilt ? `rotate(${pageSettings.lineTilt}deg)` : undefined,
    transformOrigin: 'top left',
  };
}

function printableTextFieldStyle(field: NonNullable<PageSettings['textFields']>[number], fontFamily: string): CSSProperties {
  return {
    ...printableResetStyle(),
    position: 'absolute',
    left: `${field.x}px`,
    top: `${field.y}px`,
    width: `${field.width}px`,
    minHeight: `${field.height}px`,
    fontFamily,
    fontSize: `${field.fontSize}px`,
    lineHeight: '1.2',
    color: field.color,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
  };
}

function PrintableBackground({ layout }: { layout: ResolvedPageLayout }) {
  if (layout.customBackgroundImage) {
    return (
      <img
        data-printable-layer="background-image"
        data-export-layer="background-image"
        src={layout.customBackgroundImage}
        crossOrigin="anonymous"
        alt=""
        style={{
          ...printableResetStyle(),
          position: 'absolute',
          inset: 0,
          width: `${layout.width}px`,
          height: `${layout.height}px`,
          objectFit: 'fill',
        }}
      />
    );
  }

  const template = layout.paperTemplate;
  const rasterizedBackground = rasterizePaperBackground(layout);

  return (
    <div
      data-printable-layer="paper"
      data-export-layer="paper"
      style={{
        ...printableResetStyle(),
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    >
      {template && rasterizedBackground ? (
        <img
          data-printable-layer="background-image"
          data-export-layer="background-image"
          data-export-paper-raster={template.id}
          src={rasterizedBackground}
          alt=""
          style={{
            ...printableResetStyle(),
            position: 'absolute',
            inset: 0,
            width: `${layout.width}px`,
            height: `${layout.height}px`,
            objectFit: 'fill',
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </div>
  );
}

export function PrintableBodyText({
  pageText,
  pageSettings,
  fontFamily,
  layout,
  scale = 1,
}: {
  pageText: string;
  pageSettings: PageSettings;
  fontFamily: string;
  layout: ResolvedPageLayout;
  scale?: number;
}) {
  return (
    <div
      data-printable-layer="body"
      data-export-layer="body"
      style={printableBodyStyle({ pageSettings, fontFamily, layout, scale })}
    >
      {pageText}
    </div>
  );
}

export function PrintablePage({ pageIndex, pageText, pageSettings, settings, fontFamily, mode }: PrintablePageProps) {
  const layout = resolvePageLayout({ settings, pageSettings, pageIndex });

  return (
    <div
      data-printable-page={String(pageIndex)}
      data-export-page={mode === 'export' ? String(pageIndex) : undefined}
      data-printable-mode={mode}
      style={printablePageStyle(layout, pageSettings)}
    >
      <PrintableBackground layout={layout} />
      <PrintableBodyText
        pageText={pageText}
        pageSettings={pageSettings}
        fontFamily={fontFamily}
        layout={layout}
      />
      <div
        data-printable-layer="text-fields"
        data-export-layer="text-fields"
        style={{
          ...printableResetStyle(),
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      >
        {(pageSettings.textFields ?? []).map((field) => (
          <div key={field.id} style={printableTextFieldStyle(field, fontFamily)}>
            {field.text}
          </div>
        ))}
      </div>
    </div>
  );
}
