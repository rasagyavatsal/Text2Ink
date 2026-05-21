import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('RootEditorPageClient layout ownership', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../RootEditorPageClient.tsx'),
    'utf-8',
  );

  it('keeps the editor layout local to the editor route', () => {
    expect(source).not.toMatch(/WorkspaceShell/);
    expect(source).toMatch(/fixed inset-x-0 top-0 z-20/);
    expect(source).toMatch(/xl:left-panel/);
    expect(source).toMatch(/w-panel/);
  });
});
