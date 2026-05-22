import type { PaperFormat, PaperOrientation } from '@/lib/types';
import notebookPresetManifest from '../../../public/paper-presets/manifest.json';

export interface NotebookPaperBox {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface NotebookPaperContentArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface NotebookPaperAlignmentMetadata {
  writingMargins: NotebookPaperBox;
  firstBaselineOffset: number;
  lineSpacing: number;
  gridSpacing: number | null;
  ruledMarginPosition: number | null;
  safeCrop: NotebookPaperBox;
  contentArea: NotebookPaperContentArea;
}

export interface NotebookPaperPreset {
  id: string;
  style: 'lined' | 'ruled' | 'grid';
  format: PaperFormat;
  orientation: PaperOrientation;
  pageSize: {
    width: number;
    height: number;
  };
  assetPath: string;
  alignment: NotebookPaperAlignmentMetadata;
}

export const NOTEBOOK_PAPER_PRESETS = notebookPresetManifest as NotebookPaperPreset[];
