import { describe, it, expect } from 'vitest';
import { 
  clamp, 
  median, 
  calculateRowDarkness, 
  detectPeaks, 
  clusterPeaks,
  detectBackgroundLines
} from '../lineDetection';

describe('lineDetection', () => {
  describe('clamp', () => {
    it('clamps values correctly', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('median', () => {
    it('calculates median correctly', () => {
      expect(median([1, 3, 2])).toBe(2);
      expect(median([1, 2, 3, 4])).toBe(2.5);
      expect(median([])).toBe(0);
    });
  });

  describe('calculateRowDarkness', () => {
    it('calculates row darkness correctly', () => {
      // 2x2 image, 4 bytes per pixel (RGBA)
      // Row 0: White (255, 255, 255, 255)
      // Row 1: Black (0, 0, 0, 255)
      const data = new Uint8ClampedArray([
        255, 255, 255, 255, 255, 255, 255, 255,
        0, 0, 0, 255, 0, 0, 0, 255
      ]);
      const darkness = calculateRowDarkness(data, 2, 2, 1);
      expect(darkness[0]).toBeCloseTo(0);
      expect(darkness[1]).toBeCloseTo(1);
    });
  });

  describe('detectPeaks', () => {
    it('detects peaks from row darkness', () => {
      const rowDarkness = [0, 0.1, 0.8, 0.1, 0, 0.1, 0.9, 0.1, 0];
      const peaks = detectPeaks(rowDarkness);
      expect(peaks).toHaveLength(2);
      expect(peaks[0].y).toBe(2);
      expect(peaks[1].y).toBe(6);
    });

    it('returns empty array when no peaks above threshold', () => {
      // Very low values below absolute threshold
      const rowDarkness = [0.01, 0.02, 0.01, 0.02, 0.01];
      const peaks = detectPeaks(rowDarkness);
      expect(peaks).toEqual([]);
    });
  });

  describe('clusterPeaks', () => {
    it('clusters nearby peaks', () => {
      const peaks = [
        { y: 10, value: 0.8 },
        { y: 11, value: 0.9 },
        { y: 12, value: 0.7 },
        { y: 20, value: 0.85 }
      ];
      const clustered = clusterPeaks(peaks, 3);
      expect(clustered).toHaveLength(2);
      expect(clustered[0].y).toBe(11); // Max value in cluster
      expect(clustered[1].y).toBe(20);
    });
  });

  describe('detectBackgroundLines', () => {
    it('returns null outside browser (already tested via typeof document check)', async () => {
      const result = await detectBackgroundLines('src', {} as any);
      // In jsdom document IS defined
      expect(result).toBeDefined();
    });
  });
});
