import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { NOTEBOOK_PAPER_PRESETS } from '../notebookPresetCatalog';

describe('notebookPresetCatalog', () => {
  it('covers lined and ruled assets for every supported page size and orientation', () => {
    expect(NOTEBOOK_PAPER_PRESETS).toHaveLength(12);

    const expectedVariants = new Set([
      'lined:letter:portrait',
      'lined:letter:landscape',
      'lined:a4:portrait',
      'lined:a4:landscape',
      'lined:a3:portrait',
      'lined:a3:landscape',
      'ruled:letter:portrait',
      'ruled:letter:landscape',
      'ruled:a4:portrait',
      'ruled:a4:landscape',
      'ruled:a3:portrait',
      'ruled:a3:landscape',
    ]);

    const actualVariants = new Set(
      NOTEBOOK_PAPER_PRESETS.map((preset) => `${preset.style}:${preset.format}:${preset.orientation}`),
    );

    expect(actualVariants).toEqual(expectedVariants);
  });

  it('ships lightweight svg assets with adjacent alignment metadata', () => {
    const publicRoot = path.join(process.cwd(), 'public');

    for (const preset of NOTEBOOK_PAPER_PRESETS) {
      const assetPath = path.join(publicRoot, preset.assetPath.replace(/^\//, ''));
      expect(existsSync(assetPath)).toBe(true);
      expect(statSync(assetPath).size).toBeLessThan(32_000);

      const svg = readFileSync(assetPath, 'utf8');
      expect(svg).toContain('<svg');
      expect(svg).not.toContain('<filter');

      expect(preset.alignment.writingMargins.top).toBeGreaterThan(0);
      expect(preset.alignment.writingMargins.right).toBeGreaterThan(0);
      expect(preset.alignment.writingMargins.bottom).toBeGreaterThan(0);
      expect(preset.alignment.writingMargins.left).toBeGreaterThan(0);
      expect(preset.alignment.firstBaselineOffset).toBeGreaterThan(0);
      expect(preset.alignment.lineSpacing).toBeGreaterThan(0);
      expect(preset.alignment.safeCrop.top).toBeGreaterThanOrEqual(0);
      expect(preset.alignment.safeCrop.right).toBeGreaterThanOrEqual(0);
      expect(preset.alignment.safeCrop.bottom).toBeGreaterThanOrEqual(0);
      expect(preset.alignment.safeCrop.left).toBeGreaterThanOrEqual(0);
      expect(preset.alignment.contentArea.width).toBeGreaterThan(0);
      expect(preset.alignment.contentArea.height).toBeGreaterThan(0);

      if (preset.style === 'ruled') {
        expect(preset.alignment.ruledMarginPosition).toBeGreaterThan(0);
        expect(svg).toContain('#e6a1a8');
      } else {
        expect(preset.alignment.ruledMarginPosition).toBeNull();
      }
    }
  });
});
