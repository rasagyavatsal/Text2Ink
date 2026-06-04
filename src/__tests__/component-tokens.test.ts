import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

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

function readAppFile(relPath: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, `../app/${relPath}`),
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

describe('route and shared component token consumption', () => {
  describe('RootEditorPageClient.tsx', () => {
    const source = readAppFile('editor/RootEditorPageClient.tsx');

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

    it('uses token-based label text size instead of hardcoded text-[10px] or text-[9px]', () => {
      expect(source).not.toMatch(/text-\[10px\]/);
      expect(source).not.toMatch(/text-\[9px\]/);
      expect(source).toMatch(/text-label/);
    });

    it('uses text-destructive-foreground for destructive buttons instead of text-brand-accent-foreground', () => {
      expect(source).not.toMatch(/bg-destructive text-brand-accent-foreground/);
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

describe('global CSS tokens', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../app/globals.css'),
    'utf-8'
  );

  it('uses oklch for brand accent colors instead of hex', () => {
    expect(source).not.toMatch(/--brand-accent: #/);
    expect(source).not.toMatch(/--brand-accent-hover: #/);
    expect(source).not.toMatch(/--brand-accent-foreground: #/);
    expect(source).not.toMatch(/--brand-accent-soft: #/);
  });

  it('defines --color-success token', () => {
    expect(source).toMatch(/--color-success:/);
  });

  it('defines --destructive-foreground in :root light mode', () => {
    const rootBlockMatch = source.match(/:root\s*{([^}]*)}/);
    expect(rootBlockMatch).toBeTruthy();
    expect(rootBlockMatch![1]).toMatch(/--destructive-foreground:/);
  });

  it('uses var(--safe-area-inset-bottom) instead of env() in components layer', () => {
    const componentsLayerMatch = source.match(/@layer components\s*{([\s\S]*)}/);
    expect(componentsLayerMatch).toBeTruthy();
    expect(componentsLayerMatch![1]).not.toMatch(/env\(safe-area-inset-bottom/);
    expect(componentsLayerMatch![1]).toMatch(/var\(--safe-area-inset-bottom\)/);
  });

  it('defines icon sizes in :root and references them in @theme inline', () => {
    const rootBlockMatch = source.match(/:root\s*{([^}]*)}/);
    expect(rootBlockMatch).toBeTruthy();
    expect(rootBlockMatch![1]).toMatch(/--size-icon-xs:/);
    
    const themeInlineMatch = source.match(/@theme inline\s*{([^}]*)}/);
    expect(themeInlineMatch).toBeTruthy();
    expect(themeInlineMatch![1]).toMatch(/--size-icon-xs: var\(--size-icon-xs\)/);
  });
});
