import html2canvas from 'html2canvas';
import type { LineData } from './editorHelpers';

export const DOM_EXPORT_SCALE = 4.1666666667;
const TRANSPARENT_COLOR = 'rgba(0, 0, 0, 0)';
const FALLBACK_TEXT_COLOR = '#000000';
const UNSUPPORTED_COLOR_FUNCTIONS = ['lab(', 'oklab(', 'oklch('] as const;
const TRANSPARENT_COLOR_PROPERTIES = [
  'background-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'caret-color',
] as const;
const TEXT_COLOR_PROPERTIES = [
  'color',
  'text-decoration-color',
  '-webkit-text-stroke-color',
  'fill',
  'stroke',
] as const;
const SHADOW_PROPERTIES = ['box-shadow', 'text-shadow'] as const;
const IMAGE_PROPERTIES = ['background-image', 'list-style-image'] as const;

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

function hasUnsupportedColorFunction(value: string) {
  const normalized = value.toLowerCase();
  return UNSUPPORTED_COLOR_FUNCTIONS.some((pattern) => normalized.includes(pattern));
}

function sanitizeCloneRoot(node: HTMLElement) {
  node.style.all = 'initial';
  node.style.display = 'block';
  node.style.position = 'static';
  node.style.margin = '0';
  node.style.padding = '0';
  node.style.border = '0';
  node.style.background = 'transparent';
  node.style.backgroundColor = 'transparent';
  node.style.backgroundImage = 'none';
  node.style.color = FALLBACK_TEXT_COLOR;
  node.style.borderColor = TRANSPARENT_COLOR;
  node.style.outlineColor = TRANSPARENT_COLOR;
  node.style.caretColor = TRANSPARENT_COLOR;
  node.style.boxSizing = 'border-box';
}

function sanitizeUnsupportedColorFunctions(node: HTMLElement) {
  const win = node.ownerDocument.defaultView;
  const computedStyle = win ? win.getComputedStyle(node) : null;

  for (const property of TRANSPARENT_COLOR_PROPERTIES) {
    const inlineValue = node.style.getPropertyValue(property);
    const computedValue = computedStyle ? computedStyle.getPropertyValue(property) : '';
    if (hasUnsupportedColorFunction(inlineValue) || hasUnsupportedColorFunction(computedValue)) {
      node.style.setProperty(property, TRANSPARENT_COLOR, 'important');
    }
  }

  for (const property of TEXT_COLOR_PROPERTIES) {
    const inlineValue = node.style.getPropertyValue(property);
    const computedValue = computedStyle ? computedStyle.getPropertyValue(property) : '';
    if (hasUnsupportedColorFunction(inlineValue) || hasUnsupportedColorFunction(computedValue)) {
      node.style.setProperty(property, FALLBACK_TEXT_COLOR, 'important');
    }
  }

  for (const property of SHADOW_PROPERTIES) {
    const inlineValue = node.style.getPropertyValue(property);
    const computedValue = computedStyle ? computedStyle.getPropertyValue(property) : '';
    if (hasUnsupportedColorFunction(inlineValue) || hasUnsupportedColorFunction(computedValue)) {
      node.style.setProperty(property, 'none', 'important');
    }
  }

  for (const property of IMAGE_PROPERTIES) {
    const inlineValue = node.style.getPropertyValue(property);
    const computedValue = computedStyle ? computedStyle.getPropertyValue(property) : '';
    if (hasUnsupportedColorFunction(inlineValue) || hasUnsupportedColorFunction(computedValue)) {
      node.style.setProperty(property, 'none', 'important');
    }
  }
}

function sanitizeCloneSubtree(root: HTMLElement) {
  sanitizeUnsupportedColorFunctions(root);
  for (const node of root.querySelectorAll<HTMLElement>('*')) {
    sanitizeUnsupportedColorFunctions(node);
  }
}

function isolateClonedPageForCapture(clonedDocument: Document, clonedPage?: HTMLElement) {
  sanitizeCloneRoot(clonedDocument.documentElement);
  sanitizeCloneRoot(clonedDocument.body);

  if (!clonedPage || clonedPage.ownerDocument !== clonedDocument) {
    return;
  }

  const container = clonedDocument.createElement('div');
  sanitizeCloneRoot(container);
  container.style.overflow = 'visible';

  clonedDocument.body.replaceChildren(container);
  container.appendChild(clonedPage);
  sanitizeCloneSubtree(container);
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
    onclone: (clonedDocument, clonedPage) => {
      isolateClonedPageForCapture(clonedDocument, clonedPage);
    },
  });
}
