// Draws highlights with the CSS Custom Highlight API, so no page text is wrapped in new elements.
import type { Seed } from '@/lib/storage';
import { COLORS, colorHex } from '@/lib/theme';
import { resolveQuote } from './anchor';
import { buildTextIndex } from './textIndex';

const FLASH_NAME = 'forest-flash';
const painted = new Map<string, Range>();
let stylesReady = false;

const nameFor = (colorId: string) => `forest-${colorId}`;

function ensureStyles() {
  if (stylesReady) return;
  const rules = COLORS.map((c) => `::highlight(${nameFor(c.id)}) { background-color: ${c.hex}99; }`);
  rules.push(`::highlight(${FLASH_NAME}) { background-color: ${colorHex('orange')}cc; }`);
  const css = rules.join('\n');
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  } catch {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }
  stylesReady = true;
}

/** Paints every highlight seed it can find on the page. Returns the ids it found. */
export function paintHighlights(seeds: Seed[]): Set<string> {
  if (!('highlights' in CSS)) return new Set();
  ensureStyles();
  const index = buildTextIndex();
  const byColor = new Map<string, Range[]>();
  painted.clear();
  for (const seed of seeds) {
    if (seed.kind !== 'highlight' || !seed.anchor?.quote) continue;
    const range = resolveQuote(index, seed.anchor);
    if (!range) continue;
    painted.set(seed.id, range);
    byColor.set(seed.color, [...(byColor.get(seed.color) ?? []), range]);
  }
  for (const color of COLORS) {
    const ranges = byColor.get(color.id);
    if (ranges) CSS.highlights.set(nameFor(color.id), new Highlight(...ranges));
    else CSS.highlights.delete(nameFor(color.id));
  }
  return new Set(painted.keys());
}

export function getHighlightRange(seedId: string): Range | undefined {
  return painted.get(seedId);
}

/** The highlight under a screen position, if any. */
export function highlightIdAtPoint(clientX: number, clientY: number): string | null {
  for (const [id, range] of painted) {
    for (const r of range.getClientRects()) {
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return id;
    }
  }
  return null;
}

/** Briefly lights a highlight up in orange so the eye finds it. */
export function flashHighlight(seedId: string, ms = 1800) {
  const range = painted.get(seedId);
  if (!range || !('highlights' in CSS)) return;
  ensureStyles();
  CSS.highlights.set(FLASH_NAME, new Highlight(range));
  window.setTimeout(() => CSS.highlights.delete(FLASH_NAME), ms);
}

