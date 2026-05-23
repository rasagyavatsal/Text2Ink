import { HandwritingSettings, PageSettings } from './types';

export interface UploadCalibrationState {
  isApplicable: boolean;
  currentBackground: string | null;
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export function getUploadCalibrationState(input: {
  pageIndex: number;
  settings: Partial<Pick<HandwritingSettings, 'customBackgroundImage' | 'customBackgroundImages'>>;
  pageSettings: Partial<Pick<PageSettings, 'customBackgroundImage'>>;
}): UploadCalibrationState {
  const pageSpecificBackground = Array.isArray(input.settings.customBackgroundImages)
    ? normalizeString(input.settings.customBackgroundImages[input.pageIndex])
    : null;

  const currentBackground =
    pageSpecificBackground ??
    normalizeString(input.pageSettings.customBackgroundImage) ??
    normalizeString(input.settings.customBackgroundImage) ??
    null;

  return {
    isApplicable: currentBackground !== null,
    currentBackground,
  };
}

export function normalizeUploadCalibrationResult(result: { lineOffset: number; lineSpacing: number }): { offset: number; spacing: number } {
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const detectedOffset = Math.round(result.lineOffset);
  const detectedSpacing = Math.round(result.lineSpacing);
  const clampedOffset = clamp(detectedOffset, -50, 50);
  const clampedSpacing = clamp(detectedSpacing, 20, 120);

  return { offset: clampedOffset, spacing: clampedSpacing };
}

export function applyUploadCalibration(pageSettings: PageSettings, patch: { offset: number; spacing: number }): PageSettings {
  return {
    ...pageSettings,
    customLineOffset: patch.offset,
    customLineSpacing: patch.spacing,
  };
}
