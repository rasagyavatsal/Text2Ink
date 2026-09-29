import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('route font loading', () => {
  const rootLayoutSource = fs.readFileSync(
    path.resolve(__dirname, '../layout.tsx'),
    'utf-8',
  );

  it('keeps editor-only handwriting Google fonts out of the root layout', () => {
    expect(rootLayoutSource).toMatch(/Inter/);
    expect(rootLayoutSource).toMatch(/Dancing_Script/);
    expect(rootLayoutSource).not.toMatch(/Caveat/);
    expect(rootLayoutSource).not.toMatch(/Indie_Flower/);
    expect(rootLayoutSource).not.toMatch(/Shadows_Into_Light/);
    expect(rootLayoutSource).not.toMatch(/Patrick_Hand/);
    expect(rootLayoutSource).not.toMatch(/Architects_Daughter/);
    expect(rootLayoutSource).not.toMatch(/Homemade_Apple/);
  });

  it('loads handwriting Google font variables only in the editor route layout', () => {
    const editorLayoutSource = fs.readFileSync(
      path.resolve(__dirname, '../(editor)/layout.tsx'),
      'utf-8',
    );

    expect(editorLayoutSource).toMatch(/Caveat/);
    expect(editorLayoutSource).toMatch(/Indie_Flower/);
    expect(editorLayoutSource).toMatch(/--font-caveat/);
    expect(editorLayoutSource).toMatch(/--font-homemade-apple/);
  });
});
