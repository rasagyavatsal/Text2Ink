import html2canvas from 'html2canvas';
import type { LineData } from './editorHelpers';

export const DOM_EXPORT_SCALE = 4.1666666667;

export function pageTextFromLines(lines: LineData[]): string {
  return lines.map((line) => line.text + (line.hasNewline ? '\n' : '')).join('');
}

function imageLoadError(img: HTMLImageElement) {
  const imageType = img.dataset.exportLayer === 'background-image' ? 'background image' : 'image';
  return new Error(`The export ${imageType} could not be loaded.`);
}

async function waitForImage(img: HTMLImageElement) {
  if (img.complete) {
    if (img.naturalWidth === 0) {
      throw imageLoadError(img);
    }
    return;
  }

  if (typeof img.decode === 'function') {
    try {
      await img.decode();
    } catch {
      throw imageLoadError(img);
    }

    if (img.naturalWidth === 0) {
      throw imageLoadError(img);
    }
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const handleLoad = () => {
      cleanup();
      if (img.naturalWidth === 0) {
        reject(imageLoadError(img));
        return;
      }
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(imageLoadError(img));
    };
    const cleanup = () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };

    img.addEventListener('load', handleLoad, { once: true });
    img.addEventListener('error', handleError, { once: true });
  });
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(images.map((img) => waitForImage(img)));
}

export async function settlePageElementForCapture(
  page: HTMLElement,
  opts: {
    fontFamily?: string;
    fontSize?: number;
  } = {},
) {
  const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
  if (fonts) {
    await fonts.ready;
    if (opts.fontFamily && opts.fontSize) {
      const loadedFonts = await fonts.load(`${opts.fontSize}px ${opts.fontFamily}`);
      if (loadedFonts.length === 0) {
        throw new Error(`The export font "${opts.fontFamily}" could not be loaded.`);
      }
    }
  }

  await waitForImages(page);
}

export async function capturePageElementToCanvas(opts: {
  page: HTMLElement;
  width: number;
  height: number;
  scale?: number;
}): Promise<HTMLCanvasElement> {
  const { page, width, height } = opts;
  return await html2canvas(page, {
    scale: opts.scale ?? DOM_EXPORT_SCALE,
    backgroundColor: null,
    useCORS: true,
    logging: false,
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    onclone: (clonedDocument) => {
      for (const node of [clonedDocument.documentElement, clonedDocument.body]) {
        node.style.backgroundColor = 'transparent';
        node.style.backgroundImage = 'none';
      }
    },
  });
}
