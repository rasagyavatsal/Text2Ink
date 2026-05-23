import { HandwritingSettings, PageSettings } from '@/lib/types';
import { ResolvedPageLayout } from '@/lib/layout/LayoutEngine';

export interface PaperControlsModel {
  paperMode: 'preset' | 'upload' | 'generated';
  showManualAlignmentControls: boolean;
  showLineHeightControl: boolean;
  showSpacingControls: boolean;
  isSpacingEditable: boolean;
  effectiveSpacingValue: number | null;
  currentBackgroundImage: string | null;
}

export function resolvePaperControlsModel(input: {
  settings: HandwritingSettings;
  pageSettings: PageSettings;
  resolvedPaper: ResolvedPageLayout['paper'];
}): PaperControlsModel {
  const { settings, pageSettings, resolvedPaper } = input;
  const hasUploadBackedPaper = resolvedPaper.sourceKind === 'upload-backed';
  
  let paperMode: PaperControlsModel['paperMode'] = 'preset';
  if (hasUploadBackedPaper) {
    paperMode = 'upload';
  } else if (resolvedPaper.sourceKind === 'generated-fallback') {
    paperMode = 'generated';
  }

  const currentBackgroundImage = 
    hasUploadBackedPaper && resolvedPaper.background.kind === 'image'
      ? resolvedPaper.background.imageSrc
      : null;

  return {
    paperMode,
    showManualAlignmentControls: resolvedPaper.capabilities.supportsManualAlignment,
    showLineHeightControl: resolvedPaper.capabilities.supportsLineHeightControl,
    showSpacingControls: hasUploadBackedPaper,
    isSpacingEditable: hasUploadBackedPaper,
    effectiveSpacingValue: hasUploadBackedPaper ? (pageSettings.customLineSpacing ?? Math.round(pageSettings.fontSize * settings.lineHeight)) : null,
    currentBackgroundImage,
  };
}
