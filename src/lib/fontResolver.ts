import { HANDWRITING_FONTS, type HandwritingSettings } from './types';

export function resolveHandwritingFontFamily(settings: HandwritingSettings) {
  if (settings.fontFamily === 'custom' && settings.customFont) {
    return `"${settings.customFont.family}", cursive`;
  }

  const font = HANDWRITING_FONTS.find((candidate) => candidate.value === settings.fontFamily);
  return font?.cssFontFamily || 'cursive';
}

export async function ensureHandwritingFontsReady(
  settings: Pick<HandwritingSettings, 'fontSize'>,
  fontFamily: string,
  fontSizes: readonly number[] = [settings.fontSize],
) {
  if (typeof document === 'undefined' || !document.fonts) {
    return;
  }

  try {
    await document.fonts.ready;
    const uniqueFontSizes = Array.from(new Set(fontSizes.length > 0 ? fontSizes : [settings.fontSize]));
    await Promise.all(
      uniqueFontSizes.map((fontSize) => document.fonts.load(`${fontSize}px ${fontFamily}`)),
    );
  } catch {
    // Rendering can continue with browser fallback fonts when readiness probing fails.
  }
}
