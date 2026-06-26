import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock URL.createObjectURL
if (typeof globalThis.window !== 'undefined') {
  globalThis.URL.createObjectURL = vi.fn();
  globalThis.URL.revokeObjectURL = vi.fn();
}

// Mock matchMedia
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
globalThis.ResizeObserver = ResizeObserver;
globalThis.HTMLElement.prototype.scrollIntoView = vi.fn();

function createCanvas2DContextMock(options?: { isOffscreen?: boolean }) {
  const isOffscreen = options?.isOffscreen ?? false;
  return {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: isOffscreen
      ? vi.fn(() => ({ data: new Uint8ClampedArray() }))
      : vi.fn((x: number, y: number, w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4),
          width: w,
          height: h,
        })),
    putImageData: vi.fn(),
    createImageData: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  };
}

// Mock HTMLCanvasElement getContext
if (typeof globalThis.window !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => createCanvas2DContextMock()) as any;
}

// Mock OffscreenCanvas if not available
if (typeof globalThis.window !== 'undefined' && !globalThis.OffscreenCanvas) {
  // @ts-ignore
  globalThis.OffscreenCanvas = class OffscreenCanvas {
    constructor(width: number, height: number) {
      // @ts-ignore
      this.width = width;
      // @ts-ignore
      this.height = height;
    }
    getContext() {
      return createCanvas2DContextMock({ isOffscreen: true });
    }
    convertToBlob() {
      return Promise.resolve(new Blob());
    }
    transferToImageBitmap() {
      return {};
    }
  };
}

// Mock requestAnimationFrame
globalThis.requestAnimationFrame = vi.fn(callback => { setTimeout(callback, 0); return 0; });
globalThis.cancelAnimationFrame = vi.fn(id => clearTimeout(id as unknown as NodeJS.Timeout));

// Mock Image
// @ts-ignore
globalThis.Image = class {
  onload: () => void = () => {};
  onerror: () => void = () => {};
  src: string = '';
  width: number = 100;
  height: number = 100;
  constructor() {
    setTimeout(() => this.onload(), 0);
  }
};

// Mock next/image
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ priority, unoptimized, ...props }: any) => {
    return <img {...props} alt={props.alt || ''} data-priority={priority ? 'true' : undefined} />;
  },
}));

// Mock next/link
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    return <a {...props}>{children}</a>;
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
