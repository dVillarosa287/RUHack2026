// Draws highlights with the CSS Custom Highlight API, so no page text is wrapped in new elements.
import type { Seed } from '@/lib/storage';
import { COLORS, colorHex } from '@/lib/theme';
import { resolveQuote } from './anchor';
import { buildTextIndex } from './textIndex';

const FLASH_NAME = 'forest-flash';
/** After a jump the highlight stays lit for the hold time, then fades out over the fade time. */
const JUMP_HOLD_MS = 2500;
const JUMP_FADE_MS = 1500;
export const JUMP_HIGHLIGHT_MS = JUMP_HOLD_MS + JUMP_FADE_MS;
const FLASH_ALPHA = 0xcc;
const painted = new Map<string, Range>();
let stylesReady = false;
let flashRule: CSSStyleRule | null = null;
let flashFrame = 0;

const nameFor = (colorId: string) => `forest-${colorId}`;

/** Adds CSS to the page and returns its style sheet, so a rule can be changed later. */
function addStyles(css: string): CSSStyleSheet | null {
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    return sheet;
  } catch {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    return style.sheet;
  }
}

function ensureStyles() {
  if (stylesReady) return;
  addStyles(COLORS.map((c) => `::highlight(${nameFor(c.id)}) { background-color: ${c.hex}99; }`).join('\n'));
  // Its own sheet: the fade changes this one rule on every frame, because ::highlight cannot be animated by CSS.
  flashRule = (addStyles(`::highlight(${FLASH_NAME}) { background-color: ${flashColor(FLASH_ALPHA)}; }`)?.cssRules[0] as CSSStyleRule) ?? null;
  stylesReady = true;
}

/** The jump color (palette orange) at an alpha from 0 to 255. */
function flashColor(alpha: number): string {
  return `${colorHex('orange')}${Math.round(alpha).toString(16).padStart(2, '0')}`;
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

/** Lights a highlight up in orange so the eye finds it. It stays lit for a while, then fades back to normal. */
export function flashHighlight(seedId: string) {
  const range = painted.get(seedId);
  if (!range || !('highlights' in CSS)) return;
  ensureStyles();
  cancelAnimationFrame(flashFrame);
  flashRule?.style.setProperty('background-color', flashColor(FLASH_ALPHA));
  CSS.highlights.set(FLASH_NAME, new Highlight(range));
  const fadeStart = performance.now() + JUMP_HOLD_MS;
  const step = (now: number) => {
    const progress = (now - fadeStart) / JUMP_FADE_MS;
    if (progress >= 1) {
      CSS.highlights.delete(FLASH_NAME);
      return;
    }
    if (progress > 0) flashRule?.style.setProperty('background-color', flashColor(FLASH_ALPHA * (1 - progress)));
    flashFrame = requestAnimationFrame(step);
  };
  flashFrame = requestAnimationFrame(step);
}
