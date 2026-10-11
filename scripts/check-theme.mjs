// Fails if any style uses a color that does not come from the theme. Run with: npm run check:theme
// Rules are in docs/THEME.md. Only lib/theme/themes.ts may contain color codes.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOTS = ['entrypoints', 'lib'];
const ALLOWED_FILES = new Set(['lib/theme/themes.ts']);
const EXTENSIONS = ['.css', '.ts', '.tsx', '.html'];
const TAILWIND_COLOR_NAMES = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black';
const UTILITIES = 'bg|text|border|ring|fill|stroke|from|to|via|shadow|outline|divide|decoration|accent|caret|placeholder';

const checks = [
  { name: 'hex color code', regex: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b(?![\w-])/g },
  { name: 'rgb/hsl/hwb color function', regex: /\b(?:rgba?|hsla?|hwb)\(/g },
  { name: 'Tailwind color class', regex: new RegExp(`\\b(?:${UTILITIES})-(?:${TAILWIND_COLOR_NAMES})(?:-\\d{2,3})?\\b`, 'g') },
  { name: 'gradient (not allowed)', regex: /\b(?:repeating-)?(?:linear|radial|conic)-gradient\(/g },
  { name: 'color keyword', regex: /(?:color|background(?:-color)?|border(?:-color)?|fill|stroke)\s*:\s*(?:white|black|red|green|blue|yellow|orange|purple|gray|grey)\b/g },
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (EXTENSIONS.some((ext) => path.endsWith(ext))) yield path;
  }
}

let problems = 0;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const rel = relative('.', file);
    if (ALLOWED_FILES.has(rel)) continue;
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      for (const { name, regex } of checks) {
        regex.lastIndex = 0;
        const hit = regex.exec(line);
        if (hit) {
          problems++;
          console.log(`${rel}:${i + 1}  ${name}: ${hit[0]}`);
        }
      }
    });
  }
}

if (problems) {
  console.log(`\n${problems} problem(s). Use the theme tokens (var(--fo-...)) instead. See docs/THEME.md.`);
  process.exit(1);
}
console.log('Theme check passed: no colors outside lib/theme/themes.ts.');
