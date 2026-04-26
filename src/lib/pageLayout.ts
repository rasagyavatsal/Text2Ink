import type {
  HandwritingSettings,
  PageFormatId,
  PageOrientation,
  PageSettings,
  PaperTemplateId,
} from './types';

export type PageFormat = {
  id: PageFormatId;
  name: string;
  width: number;
  height: number;
};

export type WritingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PaperTemplateKind = 'blank' | 'ruled' | 'graph' | 'dot-grid';

export type PaperTemplate = {
  id: PaperTemplateId;
  name: string;
  kind: PaperTemplateKind;
  tone: string;
  lineColor?: string;
  accentColor?: string;
  metrics: {
    writingBox: WritingBox;
    lineSpacing: number;
    baselineOffset: number;
  };
};

export type ResolvedPageLayout = {
  width: number;
  height: number;
  format: PageFormat;
  orientation: PageOrientation;
  writingBox: WritingBox;
  visualRuleBox: WritingBox;
  accentLine: {
    x: number;
    y1: number;
    y2: number;
  } | null;
  lineSpacing: number;
  baselineOffset: number;
  backgroundMode: 'template' | 'custom-image';
  customBackgroundImage: string | null;
  paperTemplate: PaperTemplate | null;
  controls: {
    showMarginControls: boolean;
    showLineHeightControl: boolean;
    showPaperColorControl: boolean;
    showLineColorControl: boolean;
    showInkColorControl: boolean;
    showLineDetectionControls: boolean;
    showCustomLineControls: boolean;
    showCustomBackgroundControls: boolean;
  };
};

const BASE_WIDTH = 612;
const BASE_HEIGHT = 792;

export const PAGE_FORMATS: PageFormat[] = [
  { id: 'a3', name: 'A3', width: 841.89, height: 1190.55 },
  { id: 'a4', name: 'A4', width: 595.28, height: 841.89 },
  { id: 'a5', name: 'A5', width: 419.53, height: 595.28 },
  { id: 'a6', name: 'A6', width: 297.64, height: 419.53 },
  { id: 'us-letter', name: 'US Letter', width: 612, height: 792 },
  { id: 'us-legal', name: 'US Legal', width: 612, height: 1008 },
  { id: 'tabloid', name: 'Tabloid', width: 792, height: 1224 },
  { id: 'executive', name: 'Executive', width: 522, height: 756 },
];

export const PAPER_TEMPLATES: PaperTemplate[] = [
  template('ruled', 'Ruled', 'ruled', '#fffefa', '#9ec7e9', undefined, 60, 60, 60, 60, 29.1, 0),
  template('narrow-ruled', 'Narrow Ruled', 'ruled', '#fffefa', '#a8d4f0', undefined, 54, 58, 58, 58, 25.5, 0),
  template('margin-ruled', 'Margin Ruled', 'ruled', '#fffefa', '#9ec7e9', '#ffb3b3', 60, 60, 60, 97, 29.1, 0),
  template('legal-pad', 'Legal Pad', 'ruled', '#fff7bf', '#c7d7ec', '#ee9a9a', 62, 56, 58, 97, 29.1, 0),
  template('graph', 'Graph', 'graph', '#fbfffb', '#b9d4e8', undefined, 48, 48, 48, 48, 24, 0),
  template('dot-grid', 'Dot Grid', 'dot-grid', '#fffefa', '#9aa7b0', undefined, 48, 48, 48, 48, 28, 0),
  template('blank', 'Blank', 'blank', '#fffefa', undefined, undefined, 60, 60, 60, 60, 43.2, 0),
  template('aged-blank', 'Aged Blank', 'blank', '#f4ead5', undefined, undefined, 62, 62, 62, 62, 43.2, 0),
  template('recycled', 'Recycled', 'blank', '#eef0df', undefined, undefined, 64, 64, 64, 64, 43.2, 0),
  template('blue-notebook', 'Blue Notebook', 'ruled', '#edf7ff', '#82b9dc', '#d8a0a0', 60, 58, 58, 97, 29.1, 0),
  template('torn-ruled', 'Torn Edge', 'ruled', '#fffdf4', '#a9cce8', undefined, 62, 64, 60, 72, 29.1, 0),
  template('soft-grid', 'Soft Grid', 'graph', '#fffefa', '#d2dfeb', undefined, 48, 48, 48, 48, 32, 0),
];

const PAGE_FORMAT_BY_ID = new Map(PAGE_FORMATS.map((format) => [format.id, format]));
const PAPER_TEMPLATE_BY_ID = new Map(PAPER_TEMPLATES.map((paper) => [paper.id, paper]));

function template(
  id: PaperTemplateId,
  name: string,
  kind: PaperTemplateKind,
  tone: string,
  lineColor: string | undefined,
  accentColor: string | undefined,
  marginTop: number,
  marginRight: number,
  marginBottom: number,
  marginLeft: number,
  lineSpacing: number,
  baselineOffset: number,
): PaperTemplate {
  return {
    id,
    name,
    kind,
    tone,
    lineColor,
    accentColor,
    metrics: {
      writingBox: {
        x: marginLeft,
        y: marginTop,
        width: BASE_WIDTH - marginLeft - marginRight,
        height: BASE_HEIGHT - marginTop - marginBottom,
      },
      lineSpacing,
      baselineOffset,
    },
  };
}

export function pageFormatById(formatId: PageFormatId | undefined): PageFormat {
  return PAGE_FORMAT_BY_ID.get(formatId ?? 'us-letter') ?? PAGE_FORMAT_BY_ID.get('us-letter')!;
}

export function paperTemplateById(templateId: PaperTemplateId | undefined): PaperTemplate {
  return PAPER_TEMPLATE_BY_ID.get(templateId ?? 'ruled') ?? PAPER_TEMPLATE_BY_ID.get('ruled')!;
}

export function paperTemplateIdForLegacyStyle(style: HandwritingSettings['paperStyle']): PaperTemplateId {
  if (style === 'blank') return 'blank';
  if (style === 'grid') return 'graph';
  if (style === 'ruled') return 'margin-ruled';
  return 'ruled';
}

function orientFormat(format: PageFormat, orientation: PageOrientation) {
  if (orientation === 'landscape') {
    return { width: format.height, height: format.width };
  }
  return { width: format.width, height: format.height };
}

function scaleTemplateBox(box: WritingBox, width: number, height: number): WritingBox {
  const xScale = width / BASE_WIDTH;
  const yScale = height / BASE_HEIGHT;
  return {
    x: Math.round(box.x * xScale * 100) / 100,
    y: Math.round(box.y * yScale * 100) / 100,
    width: Math.round(box.width * xScale * 100) / 100,
    height: Math.round(box.height * yScale * 100) / 100,
  };
}

function scalePoint(value: number, scale: number): number {
  return Math.round(value * scale * 100) / 100;
}

function visualRuleBoxForTemplate(template: PaperTemplate, width: number, height: number): WritingBox {
  const writingBox = scaleTemplateBox(template.metrics.writingBox, width, height);
  if (template.kind === 'ruled') {
    return {
      x: 0,
      y: writingBox.y,
      width,
      height: writingBox.height,
    };
  }
  return writingBox;
}

function accentLineForTemplate(template: PaperTemplate, width: number, height: number) {
  if (!template.accentColor || template.kind !== 'ruled') return null;
  return {
    x: scalePoint(79, width / BASE_WIDTH),
    y1: 0,
    y2: height,
  };
}

function customBackgroundForPage(settings: HandwritingSettings, pageIndex: number) {
  return settings.customBackgroundImages?.[pageIndex] ?? settings.customBackgroundImage ?? null;
}

export function resolvePageLayout(opts: {
  settings: HandwritingSettings;
  pageSettings: PageSettings;
  pageIndex: number;
}): ResolvedPageLayout {
  const { settings, pageSettings, pageIndex } = opts;
  const format = pageFormatById(settings.pageFormatId);
  const orientation = settings.pageOrientation ?? 'portrait';
  const { width, height } = orientFormat(format, orientation);
  const customBackgroundImage = customBackgroundForPage(settings, pageIndex);
  const hasCustomBackground = !!customBackgroundImage;
  const selectedTemplateId =
    settings.paperTemplateId && !(settings.paperTemplateId === 'ruled' && settings.paperStyle !== 'lined')
      ? settings.paperTemplateId
      : paperTemplateIdForLegacyStyle(settings.paperStyle);
  const paperTemplate = paperTemplateById(selectedTemplateId);

  if (hasCustomBackground) {
    return {
      width,
      height,
      format,
      orientation,
      writingBox: {
        x: pageSettings.marginLeft,
        y: pageSettings.marginTop + (pageSettings.customLineOffset ?? 0),
        width: Math.max(1, width - pageSettings.marginLeft - pageSettings.marginRight),
        height: Math.max(1, height - pageSettings.marginTop - pageSettings.marginBottom),
      },
      visualRuleBox: {
        x: pageSettings.marginLeft,
        y: pageSettings.marginTop + (pageSettings.customLineOffset ?? 0),
        width: Math.max(1, width - pageSettings.marginLeft - pageSettings.marginRight),
        height: Math.max(1, height - pageSettings.marginTop - pageSettings.marginBottom),
      },
      accentLine: null,
      lineSpacing: pageSettings.customLineSpacing ?? pageSettings.fontSize * settings.lineHeight,
      baselineOffset: pageSettings.customLineOffset ?? 0,
      backgroundMode: 'custom-image',
      customBackgroundImage,
      paperTemplate,
      controls: {
        showMarginControls: true,
        showLineHeightControl: false,
        showPaperColorControl: true,
        showLineColorControl: true,
        showInkColorControl: true,
        showLineDetectionControls: true,
        showCustomLineControls: true,
        showCustomBackgroundControls: true,
      },
    };
  }

  const scaleY = height / BASE_HEIGHT;
  const writingBox = scaleTemplateBox(paperTemplate.metrics.writingBox, width, height);
  return {
    width,
    height,
    format,
    orientation,
    writingBox,
    visualRuleBox: visualRuleBoxForTemplate(paperTemplate, width, height),
    accentLine: accentLineForTemplate(paperTemplate, width, height),
    lineSpacing: scalePoint(paperTemplate.metrics.lineSpacing, scaleY),
    baselineOffset: scalePoint(paperTemplate.metrics.baselineOffset, scaleY),
    backgroundMode: 'template',
    customBackgroundImage: null,
    paperTemplate,
    controls: {
      showMarginControls: false,
      showLineHeightControl: false,
      showPaperColorControl: false,
      showLineColorControl: false,
      showInkColorControl: true,
      showLineDetectionControls: false,
      showCustomLineControls: false,
      showCustomBackgroundControls: true,
    },
  };
}
