// Draws highlights with the CSS Custom Highlight API, so no page text is wrapped in new elements.
import type { Seed, SpriteType } from '@/lib/storage';
import { SPRITE_ORDER, colorHex, spriteColorHex, watchThemeId } from '@/lib/theme';
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
/** Replaces the CSS of the sheet that holds the highlight colors (set once the sheet exists). */
let setColorCss: ((css: string) => void) | null = null;
let themeId: string | undefined;

/**
 * One highlight name per sprite and growth stage, such as `forest-owl` or `forest-fruitsprout-tree`. The names
 * never change with the theme, so a theme change only rewrites the colors in the style sheet, not the highlights.
 */
const nameFor = (type: SpriteType, grown: boolean) => `forest-${type}${grown ? '-tree' : ''}`;

/** Every sprite (taken from the theme, so new sprites such as the house are included), sprout and grown. */
function allKinds(): { type: SpriteType; grown: boolean }[] {
  return SPRITE_ORDER.flatMap((type) => [false, true].map((grown) => ({ type, grown })));
}

/**
 * The CSS for every highlight color in the current theme. The highlights live in the web page's own document, not
 * in our Shadow DOM, so our CSS variables do not reach them: the exact codes are written in instead.
 */
function colorCss(): string {
  return allKinds()
    .map(({ type, grown }) => `::highlight(${nameFor(type, grown)}) { background-color: ${spriteColorHex(type, grown, themeId)}99; }`)
    .join('\n');
}

/** Adds CSS to the page. Returns its style sheet (so a rule can be changed later) and a way to replace all of it. */
function addStyles(css: string): { sheet: CSSStyleSheet | null; replace(css: string): void } {
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    return { sheet, replace: (next) => sheet.replaceSync(next) };
  } catch {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    return { sheet: style.sheet, replace: (next) => void (style.textContent = next) };
  }
}

function ensureStyles() {
  if (stylesReady) return;
  setColorCss = addStyles(colorCss()).replace;
  // Its own sheet: the fade changes this one rule on every frame, because ::highlight cannot be animated by CSS.
  flashRule = (addStyles(`::highlight(${FLASH_NAME}) { background-color: ${flashColor(FLASH_ALPHA)}; }`).sheet?.cssRules[0] as CSSStyleRule) ?? null;
  stylesReady = true;
  // Recolor every highlight when the user picks another theme (in any tab). Only the colors change.
  watchThemeId((id) => {
    if (id === themeId) return;
    themeId = id;
    setColorCss?.(colorCss());
  });
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
  const byName = new Map<string, Range[]>();
  painted.clear();
  for (const seed of seeds) {
    if (seed.kind !== 'highlight' || !seed.anchor?.quote) continue;
    const range = resolveQuote(index, seed.anchor);
    if (!range) continue;
    painted.set(seed.id, range);
    // The color comes from the sprite (and whether it has grown) in the current theme, not from the seed's old picked color.
    const name = nameFor(seed.spriteType, seed.growth === 'tree');
    byName.set(name, [...(byName.get(name) ?? []), range]);
  }
  for (const { type, grown } of allKinds()) {
    const name = nameFor(type, grown);
    const ranges = byName.get(name);
    if (ranges) CSS.highlights.set(name, new Highlight(...ranges));
    else CSS.highlights.delete(name);
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
