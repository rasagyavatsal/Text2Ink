import { describe, it, expect } from 'vitest';
import { 
  validateFontFile, 
  generateFontFamilyName, 
  processLineDetectionResult,
  readFilesAsDataURL,
  applyPageSettingsToAll,
  normalizeHandwritingSettings
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

  describe('applyPageSettingsToAll', () => {
    const defaultPage = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
    const mockTextField = {
      id: 'tf-1',
      text: 'source text',
      x: 0, y: 0, width: 100, height: 50,
      color: 'black', fontSize: 16
    };

    it('copies other settings but NOT text fields', () => {
      const sourcePage = { ...defaultPage, fontSize: 24, textFields: [mockTextField] };
      const targetPage = { ...defaultPage, fontSize: 12, textFields: [] };
      const prev = [sourcePage, targetPage];
      
      const result = applyPageSettingsToAll(prev, 0, 2, defaultPage);
      
      expect(result[0].fontSize).toBe(24);
      expect(result[0].textFields).toHaveLength(1);
      
      expect(result[1].fontSize).toBe(24); // copied
      expect(result[1].textFields).toHaveLength(0); // preserved original (empty)
    });

    it('preserves existing text fields on target pages', () => {
      const targetTextField = { ...mockTextField, id: 'tf-target', text: 'target text' };
      const sourcePage = { ...defaultPage, paperColor: '#ffffff', textFields: [mockTextField] };
      const targetPage = { ...defaultPage, paperColor: '#000000', textFields: [targetTextField] };
      const prev = [sourcePage, targetPage];
      
      const result = applyPageSettingsToAll(prev, 0, 2, defaultPage);
      
      expect(result[1].paperColor).toBe('#ffffff'); // copied
      expect(result[1].textFields).toHaveLength(1);
      expect(result[1].textFields![0].id).toBe('tf-target'); // preserved
    });
  });

  describe('normalizeHandwritingSettings', () => {
    it('drops legacy randomness and fills missing supported settings from defaults', () => {
      const normalized = normalizeHandwritingSettings({
        fontFamily: 'kalam',
        fontSize: 31,
        randomness: { enabled: true, spacing: 5, baseline: 3, rotation: 2 },
        unknownLegacyField: 'remove me',
      });

      expect(normalized).toMatchObject({
        ...DEFAULT_SETTINGS,
        fontFamily: 'kalam',
        fontSize: 31,
      });
      expect(normalized).not.toHaveProperty('randomness');
      expect(normalized).not.toHaveProperty('unknownLegacyField');
    });
  });
});
