/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';


export function createMockCanvasContext(overrides?: Record<string, any>) {
  return {
    clearRect: vi.fn(),
    scale: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({
      width: 10,
      fontBoundingBoxAscent: 20,
      fontBoundingBoxDescent: 5,
      actualBoundingBoxAscent: 18,
      actualBoundingBoxDescent: 4,
    }),
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    ...overrides,
  } as any;
}

export function createMockCanvas(ctx?: any) {
  return {
    getContext: vi.fn().mockReturnValue(ctx || createMockCanvasContext()),
    width: 0,
    height: 0,
  } as any;
}

export function createMockImageClass(options?: {
  instances?: any[];
  triggerOnConstructor?: boolean;
}) {
  const instances = options?.instances;
  const triggerOnConstructor = options?.triggerOnConstructor ?? false;

  return class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    crossOrigin = '';
    #src = '';

    constructor() {
      if (instances) {
        instances.push(this);
      }
      if (triggerOnConstructor) {
        setTimeout(() => this.onload?.(), 0);
      }
    }

    set src(value: string) {
      this.#src = value;
      if (!triggerOnConstructor) {
        queueMicrotask(() => this.onload?.());
      }
    }

    get src() {
      return this.#src;
    }
  } as any;
}

export function stubDevicePixelRatio(value: number) {
  const original = globalThis.devicePixelRatio;
  Object.defineProperty(globalThis, 'devicePixelRatio', {
    configurable: true,
    value,
  });
  return () => {
    Object.defineProperty(globalThis, 'devicePixelRatio', {
      configurable: true,
      value: original,
    });
  };
}

export function extractFillTextChars(ctx: any) {
  const fillTextCalls = (ctx.fillText as any).mock.calls;
  return fillTextCalls.map((c: any[]) => c[0] as string);
}
