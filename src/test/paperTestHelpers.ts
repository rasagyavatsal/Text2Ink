import {
  DEFAULT_SETTINGS,
  type DocumentPaperSelection,
  type HandwritingSettings,
  type PaperFormat,
  type PaperOrientation,
  type PaperStyle,
} from '@/lib/types';
import {
  createDocumentPaperSelection,
  resolveDocumentPaperFormat,
  resolveDocumentPaperOrientation,
  resolveDocumentPaperStyle,
} from '@/lib/paper/paperSelection';

export type LegacyPaperTestOverrides = Partial<Omit<HandwritingSettings, 'paper'>> & {
  paper?: DocumentPaperSelection;
  paperPresetId?: string | null;
  paperStyle?: PaperStyle;
  paperFormat?: PaperFormat;
  paperOrientation?: PaperOrientation;
};

export function withTestPaperSelection(
  overrides: LegacyPaperTestOverrides = {},
): HandwritingSettings {
  const {
    paper,
    paperPresetId,
    paperStyle,
    paperFormat,
    paperOrientation,
    ...rest
  } = overrides;
  const style = paperStyle ?? resolveDocumentPaperStyle(DEFAULT_SETTINGS.paper);
  const format = paperFormat ?? resolveDocumentPaperFormat(DEFAULT_SETTINGS.paper);
  const orientation = paperOrientation ?? resolveDocumentPaperOrientation(DEFAULT_SETTINGS.paper);
  const hasLegacyPaperOverride =
    paperPresetId !== undefined
    || paperStyle !== undefined
    || paperFormat !== undefined
    || paperOrientation !== undefined;
  const getResolvedPaper = () => {
    if (!hasLegacyPaperOverride && paper) return paper;
    if (paperPresetId) {
      return {
        kind: 'preset' as const,
        presetId: paperPresetId,
      };
    }
    if (paperPresetId === null) {
      return {
        kind: 'generated' as const,
        style,
        format,
        orientation,
      };
    }
    return createDocumentPaperSelection({
      style,
      format,
      orientation,
    });
  };
  const resolvedPaper = getResolvedPaper();

  return {
    ...DEFAULT_SETTINGS,
    ...rest,
    paper: resolvedPaper,
  };
}
