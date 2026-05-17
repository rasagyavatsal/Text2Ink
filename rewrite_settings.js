const fs = require('fs');

let content = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

const replacements = [
  [/text-\[\#E0A32A\]/g, 'text-brand-accent'],
  [/bg-\[\#E0A32A\]/g, 'bg-brand-accent'],
  [/border-\[\#E0A32A\]/g, 'border-brand-accent'],
  [/bg-\[\#E0A32A\]\/5/g, 'bg-brand-accent-soft'],
  [/bg-\[\#E0A32A\]\/10/g, 'bg-brand-accent/10'],
  [/bg-\[\#E0A32A\]\/20/g, 'bg-brand-accent/20'],
  [/shadow-\[\#E0A32A\]\/20/g, 'shadow-brand-accent/20'],
  [/hover:border-\[\#E0A32A\]/g, 'hover:border-brand-accent'],
  [/hover:text-\[\#E0A32A\]/g, 'hover:text-brand-accent'],
  [/hover:bg-\[\#c99225\]/g, 'hover:bg-brand-accent-hover'],
  [/bg-gray-100\/50/g, 'bg-muted/50'],
  [/bg-gray-100/g, 'bg-muted'],
  [/bg-gray-50/g, 'bg-muted/50'],
  [/text-gray-400/g, 'text-muted-foreground'],
  [/text-gray-500/g, 'text-muted-foreground'],
  [/text-gray-700/g, 'text-foreground'],
  [/text-gray-900/g, 'text-foreground'],
  [/border-gray-200/g, 'border-border'],
  [/border-gray-100/g, 'border-border'],
  [/hover:bg-gray-200/g, 'hover:bg-accent'],
  [/hover:border-gray-200/g, 'hover:border-border'],
  [/bg-white\/50/g, 'bg-background/50'],
  [/bg-white\/20/g, 'bg-background/20'],
  [/(?<!border-)bg-white/g, 'bg-background'], // avoid touching border-white for now
  [/text-white/g, 'text-primary-foreground'], // Wait, text-white usually goes to text-primary-foreground or text-brand-accent-foreground? For brand buttons it's text-brand-accent-foreground
  [/text-red-500/g, 'text-destructive'],
  [/bg-red-500/g, 'bg-destructive'],
  [/hover:bg-red-600/g, 'hover:bg-destructive/90'],
  [/border-red-100/g, 'border-destructive/20'],
  [/hover:bg-red-50/g, 'hover:bg-destructive/10'],
  [/hover:text-red-600/g, 'hover:text-destructive'],
];

replacements.forEach(([regex, replacement]) => {
  content = content.replace(regex, replacement);
});

// Fix some specific cases
content = content.replace(/border-white/g, 'border-background');
content = content.replace(/text-primary-foreground/g, 'text-brand-accent-foreground'); // Assuming white text was mostly on brand or red buttons

fs.writeFileSync('src/components/SettingsPanel.tsx', content, 'utf8');
console.log('Replacements done');
