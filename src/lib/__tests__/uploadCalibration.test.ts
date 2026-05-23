import { describe, it, expect } from 'vitest';
import { getUploadCalibrationState, normalizeUploadCalibrationResult, applyUploadCalibration } from '../uploadCalibration';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '../types';

describe('uploadCalibration', () => {
  describe('getUploadCalibrationState', () => {
    it('returns isApplicable false when no background is set', () => {
      const settings = { ...DEFAULT_SETTINGS };
      const pageSettings = defaultPageSettingsFromHandwritingSettings(settings);

      const state = getUploadCalibrationState({
        pageIndex: 0,
        settings,
        pageSettings,
      });

      expect(state.isApplicable).toBe(false);
      expect(state.currentBackground).toBeNull();
    });

    it('returns true and resolves page-specific customBackgroundImages array over others', () => {
      const settings = { ...DEFAULT_SETTINGS, customBackgroundImages: ['bg1', 'bg2'], customBackgroundImage: 'docBg' };
      const pageSettings = { ...defaultPageSettingsFromHandwritingSettings(settings), customBackgroundImage: 'pageBg' };

      const state = getUploadCalibrationState({
        pageIndex: 1,
        settings,
        pageSettings,
      });

      expect(state.isApplicable).toBe(true);
      expect(state.currentBackground).toBe('bg2');
    });

    it('falls back to pageSettings.customBackgroundImage if array is missing or empty', () => {
      const settings = { ...DEFAULT_SETTINGS, customBackgroundImages: ['bg1', ''], customBackgroundImage: 'docBg' };
      const pageSettings = { ...defaultPageSettingsFromHandwritingSettings(settings), customBackgroundImage: 'pageBg' };

      const state = getUploadCalibrationState({
        pageIndex: 1,
        settings,
        pageSettings,
      });

      expect(state.isApplicable).toBe(true);
      expect(state.currentBackground).toBe('pageBg');
    });

    it('falls back to settings.customBackgroundImage as last resort', () => {
      const settings = { ...DEFAULT_SETTINGS, customBackgroundImage: 'docBg' };
      const pageSettings = { ...defaultPageSettingsFromHandwritingSettings(settings), customBackgroundImage: '' };

      const state = getUploadCalibrationState({
        pageIndex: 0,
        settings,
        pageSettings,
      });

      expect(state.isApplicable).toBe(true);
      expect(state.currentBackground).toBe('docBg');
    });
  });

  describe('normalizeUploadCalibrationResult', () => {
    it('rounds and clamps detection results', () => {
      // should clamp spacing to 20-120 and offset to -50-50
      const result = { lineOffset: 12.6, lineSpacing: 45.2, linePositions: [] };
      const normalized = normalizeUploadCalibrationResult(result);
      
      expect(normalized.offset).toBe(13);
      expect(normalized.spacing).toBe(45);
    });

    it('respects min and max limits', () => {
      const result = { lineOffset: -60, lineSpacing: 10, linePositions: [] };
      const normalized = normalizeUploadCalibrationResult(result);
      
      expect(normalized.offset).toBe(-50);
      expect(normalized.spacing).toBe(20);
    });
  });

  describe('applyUploadCalibration', () => {
    it('applies normalized offset and spacing as a patch to page settings', () => {
      const pageSettings = defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS);
      const patch = { offset: 10, spacing: 40 };
      
      const updated = applyUploadCalibration(pageSettings, patch);
      expect(updated.customLineOffset).toBe(10);
      expect(updated.customLineSpacing).toBe(40);
      expect(updated).not.toBe(pageSettings); // should be a new object
    });
  });
});
