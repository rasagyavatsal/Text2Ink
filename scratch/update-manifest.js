async function run() {
const fs = await import('node:fs');

const manifestPath = 'public/paper-presets/manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const newEntries = [];

for (const entry of manifest) {
  if (entry.style === 'lined') {
    // Generate wide-lined
    const wideLined = structuredClone(entry);
    wideLined.id = `wide-${entry.id}`;
    wideLined.style = 'wide-lined';
    wideLined.assetPath = `/paper-presets/${wideLined.id}.svg`;
    wideLined.alignment.lineSpacing = entry.alignment.lineSpacing * 1.5;
    newEntries.push(wideLined);

    // Generate narrow-lined
    const narrowLined = structuredClone(entry);
    narrowLined.id = `narrow-${entry.id}`;
    narrowLined.style = 'narrow-lined';
    narrowLined.assetPath = `/paper-presets/${narrowLined.id}.svg`;
    narrowLined.alignment.lineSpacing = entry.alignment.lineSpacing * 0.8;
    newEntries.push(narrowLined);
  } else if (entry.style === 'ruled') {
    // Generate wide-ruled
    const wideRuled = structuredClone(entry);
    wideRuled.id = `wide-${entry.id}`;
    wideRuled.style = 'wide-ruled';
    wideRuled.assetPath = `/paper-presets/${wideRuled.id}.svg`;
    wideRuled.alignment.lineSpacing = entry.alignment.lineSpacing * 1.5;
    newEntries.push(wideRuled);

    // Generate narrow-ruled
    const narrowRuled = structuredClone(entry);
    narrowRuled.id = `narrow-${entry.id}`;
    narrowRuled.style = 'narrow-ruled';
    narrowRuled.assetPath = `/paper-presets/${narrowRuled.id}.svg`;
    narrowRuled.alignment.lineSpacing = entry.alignment.lineSpacing * 0.8;
    newEntries.push(narrowRuled);
  }
}

manifest.push(...newEntries);

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Added 24 entries to manifest.json');
}
run();
