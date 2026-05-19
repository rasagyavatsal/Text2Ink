import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readComponent(name: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, `../components/ui/${name}`),
    'utf-8'
  );
}

function readComponentFile(relPath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, `../components/${relPath}`),
    'utf-8'
  );
}

describe('Component Library token consumption', () => {
  describe('button.tsx', () => {
    const source = readComponent('button.tsx');

    it('uses token-based control heights instead of hardcoded h-8/h-9/h-10', () => {
      expect(source).not.toMatch(/h-8\b/);
      expect(source).not.toMatch(/h-9\b/);
      expect(source).not.toMatch(/h-10\b/);
      expect(source).toMatch(/h-control-/);
    });
  });

  describe('select.tsx', () => {
    const source = readComponent('select.tsx');

    it('uses token-based input height instead of hardcoded h-9', () => {
      expect(source).not.toMatch(/\bh-9\b/);
      expect(source).toMatch(/h-input|h-control-/);
    });
  });

  describe('slider.tsx', () => {
    const source = readComponent('slider.tsx');

    it('uses token-based icon size for thumb', () => {
      expect(source).toMatch(/size-icon/);
    });
  });
});

describe('shared component token consumption', () => {
  describe('WorkspaceShell.tsx', () => {
    const source = readComponentFile('patterns/WorkspaceShell.tsx');

    it('uses token-based panel width instead of hardcoded w-96', () => {
      expect(source).not.toMatch(/w-96\b/);
      expect(source).toMatch(/w-panel/);
    });
  });

  describe('ThemePicker.tsx', () => {
    const source = readComponentFile('ThemePicker.tsx');

    it('uses token-based control height instead of hardcoded pixel values', () => {
      expect(source).not.toMatch(/h-\[34px\]/);
    });
  });

  describe('SettingsPanel.tsx', () => {
    const source = readComponentFile('SettingsPanel.tsx');

    it('uses token-based label text size instead of hardcoded text-[10px]', () => {
      expect(source).not.toMatch(/text-\[10px\]/);
      expect(source).toMatch(/text-label/);
    });
  });

  describe('ExportModal.tsx', () => {
    const source = readComponentFile('ExportModal.tsx');

    it('uses token-based label text size instead of hardcoded text-[10px]', () => {
      expect(source).not.toMatch(/text-\[10px\]/);
      expect(source).toMatch(/text-label/);
    });
  });
});
