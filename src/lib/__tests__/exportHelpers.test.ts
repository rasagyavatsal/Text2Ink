import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  shouldNormalizeColor, 
  normalizeCanvasColor, 
  waitForPages,
  waitForPageRef,
  waitForPageIndex
} from '../exportHelpers';

describe('exportHelpers', () => {
  describe('shouldNormalizeColor', () => {
    it('identifies colors that need normalization', () => {
      expect(shouldNormalizeColor('oklch(0.5 0.1 150)')).toBe(true);
      expect(shouldNormalizeColor('color-mix(in srgb, red, blue)')).toBe(true);
      expect(shouldNormalizeColor('rgb(255, 0, 0)')).toBe(false);
      expect(shouldNormalizeColor('#ff0000')).toBe(false);
    });
  });

  describe('normalizeCanvasColor', () => {
    it('normalizes colors using canvas', () => {
      const mockDoc = {
        createElement: vi.fn(() => ({
          getContext: vi.fn(() => ({
            fillStyle: '',
          })),
        })),
      } as unknown as Document;

      // This is hard to test fully without a real canvas, 
      // but we can check it calls the right things.
      const result = normalizeCanvasColor(mockDoc, 'red');
      expect(mockDoc.createElement).toHaveBeenCalledWith('canvas');
    });
  });

  describe('waitFor helpers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Mock requestAnimationFrame
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(cb, 16));
    });

    it('waitForPages resolves when enough pages are present and stable', async () => {
      const pageRefs = { current: [null, null] } as any;
      
      const promise = waitForPages(pageRefs, 1, 1000);
      
      // Add a page
      pageRefs.current[0] = {} as any;
      
      // Ticks
      await vi.advanceTimersByTimeAsync(16);
      await vi.advanceTimersByTimeAsync(16);
      await vi.advanceTimersByTimeAsync(16);
      
      await expect(promise).resolves.toBeUndefined();
    });

    it('waitForPageRef resolves when page element is present', async () => {
      const pageRefs = { current: [null] } as any;
      const el = {} as any;
      
      const promise = waitForPageRef(pageRefs, 0, 1000);
      
      pageRefs.current[0] = el;
      await vi.advanceTimersByTimeAsync(16);
      
      await expect(promise).resolves.toBe(el);
    });

    it('waitForPageIndex resolves when index matches', async () => {
      const indexRef = { current: 0 };
      const promise = waitForPageIndex(indexRef, 1, 1000);
      
      indexRef.current = 1;
      await vi.advanceTimersByTimeAsync(16);
      
      await expect(promise).resolves.toBeUndefined();
    });
  });
});
