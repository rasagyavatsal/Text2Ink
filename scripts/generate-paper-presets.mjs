import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PAPER_COLOR = '#ffffff';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const presetManifestPath = path.join(repoRoot, 'public', 'paper-presets', 'manifest.json');

const manifest = JSON.parse(await readFile(presetManifestPath, 'utf8'));
const { buildBuiltinNotebookPaperSvg } = await import(
  pathToFileURL(path.join(repoRoot, 'src', 'lib', 'paper', 'builtinNotebookSvg.ts')).href
);

for (const preset of manifest) {
  const svg = buildBuiltinNotebookPaperSvg(
    {
      style: preset.style,
      pageWidth: preset.pageSize.width,
      pageHeight: preset.pageSize.height,
      paperColor: PAPER_COLOR,
      margins: preset.alignment.writingMargins,
      textTop: preset.alignment.firstBaselineOffset,
      lineHeightPx: preset.alignment.lineSpacing,
      marginLineX: preset.alignment.ruledMarginPosition ?? undefined,
    },
    {
      rootWidth: formatDimension(preset.pageSize.width),
      rootHeight: formatDimension(preset.pageSize.height),
    },
  );

  const assetPath = path.join(repoRoot, 'public', preset.assetPath.replace(/^\/+/, ''));
  await writeFile(assetPath, svg);
}

function formatDimension(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, '');
}
