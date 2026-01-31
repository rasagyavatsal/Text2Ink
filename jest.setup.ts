import '@testing-library/jest-dom';

import React from 'react';
import { TextDecoder, TextEncoder } from 'util';

jest.mock('next/image', () => {
  return function MockedNextImage(props: any) {
    const {
      priority,
      unoptimized,
      fill,
      loader,
      quality,
      placeholder,
      blurDataURL,
      fetchPriority,
      ...rest
    } = props;

    return React.createElement('img', rest);
  };
});

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
  }) as any;
}

if (!(globalThis as any).TextEncoder) {
  (globalThis as any).TextEncoder = TextEncoder;
}

if (!(globalThis as any).TextDecoder) {
  (globalThis as any).TextDecoder = TextDecoder;
}

if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: function getContext() {
    return {
      font: '',
      fillStyle: '',
      measureText: (text: string) => ({ width: text.length * 10 }),
    };
  },
});
