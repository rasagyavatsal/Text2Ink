import { describe, it, expect } from 'vitest';
import { 
  validateFontFile, 
  generateFontFamilyName, 
  processLineDetectionResult,
  readFilesAsDataURL
} from '../settingsHelpers';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '../types';

describe('settingsHelpers', () => {
  describe('validateFontFile', () => {
    it('validates .ttf files', () => {
      const file = new File([''], 'test.ttf');
      const result = validateFontFile(file);
      expect(result.format).toBe('truetype');
      expect(result.error).toBeNull();
    });

    it('validates .otf files', () => {
      const file = new File([''], 'test.otf');
      const result = validateFontFile(file);
      expect(result.format).toBe('opentype');
      expect(result.error).toBeNull();
    });

    it('rejects other files', () => {
      const file = new File([''], 'test.txt');
      const result = validateFontFile(file);
      expect(result.format).toBeNull();
      expect(result.error).toContain('Please upload a .ttf or .otf');
    });
  });

  describe('generateFontFamilyName', () => {
    it('generates a safe name', () => {
      const name = generateFontFamilyName('My Font.ttf');
      expect(name).toContain('Text2InkCustom-MyFont');
      expect(name).toMatch(/Text2InkCustom-MyFont-\d+/);
    });
  });

  describe('processLineDetectionResult', () => {
    it('clamps and rounds results', () => {
      const result = {
        lineOffset: 12.6,
        lineSpacing: 45.2,
        linePositions: [12.6, 57.8],
      };
      const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
      const processed = processLineDetectionResult(result, pageSettings, DEFAULT_SETTINGS);
      
      expect(processed.offset).toBe(13);
      expect(processed.spacing).toBe(45);
    });

    it('respects min/max bounds', () => {
      const result = {
        lineOffset: 100, // max is 50
        lineSpacing: 10,  // min is 20
        linePositions: [],
      };
      const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
      const processed = processLineDetectionResult(result, pageSettings, DEFAULT_SETTINGS);
      
      expect(processed.offset).toBe(50);
      expect(processed.spacing).toBe(20);
    });
  });

  describe('readFilesAsDataURL', () => {
    it('reads files correctly', async () => {
      const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
      const results = await readFilesAsDataURL([file]);
      expect(results).toHaveLength(1);
      expect(results[0]).toContain('data:text/plain;base64,');
    });
  });
});
