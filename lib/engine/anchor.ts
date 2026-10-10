// Anchors say where a seed sits on its page without relying on pixel coordinates alone.
import type { Anchor } from '@/lib/storage';
import { buildTextIndex, offsetsToRange, rangeToOffsets, type TextIndex } from './textIndex';

const CONTEXT_CHARS = 32;

function scrollPercentAt(clientY: number): number {
  const height = Math.max(1, document.documentElement.scrollHeight);
  return Math.min(1, Math.max(0, (window.scrollY + clientY) / height));
}

/** For highlights: the exact quote plus a few characters either side. Returns null for blank selections. */
export function buildQuoteAnchor(range: Range): Anchor | null {
  const index = buildTextIndex();
  const offsets = rangeToOffsets(index, range);
  if (!offsets) return null;
  let { start, end } = offsets;
  while (start < end && /\s/.test(index.text.charAt(start))) start++;
  while (end > start && /\s/.test(index.text.charAt(end - 1))) end--;
  if (end <= start) return null;
  return {
    quote: {
      exact: index.text.slice(start, end),
      prefix: index.text.slice(Math.max(0, start - CONTEXT_CHARS), start),
      suffix: index.text.slice(end, end + CONTEXT_CHARS),
    },
    scrollPercent: scrollPercentAt(range.getBoundingClientRect().top),
  };
}

function commonSuffixLength(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}

function commonPrefixLength(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

/** Finds a saved quote on the page again. If it appears several times, the surrounding words decide which. */
export function resolveQuote(index: TextIndex, anchor: Anchor): Range | null {
  const quote = anchor.quote;
  if (!quote) return null;
  let best = -1;
  let bestScore = -1;
  let bestDistance = Infinity;
  for (let at = index.text.indexOf(quote.exact); at !== -1; at = index.text.indexOf(quote.exact, at + 1)) {
    const before = index.text.slice(Math.max(0, at - CONTEXT_CHARS), at);
    const after = index.text.slice(at + quote.exact.length, at + quote.exact.length + CONTEXT_CHARS);
    const score = commonSuffixLength(before, quote.prefix) + commonPrefixLength(after, quote.suffix);
    // If the surrounding words cannot tell two matches apart, take the one nearest where it was saved.
    const distance = Math.abs(at / Math.max(1, index.text.length) - anchor.scrollPercent);
    if (score > bestScore || (score === bestScore && distance < bestDistance)) {
      best = at;
      bestScore = score;
      bestDistance = distance;
    }
  }
  return best === -1 ? null : offsetsToRange(index, best, best + quote.exact.length);
}

// ---------- placed markers ----------

/** How many characters, starting at the click, a marker's text anchor remembers. */
const MARKER_QUOTE_CHARS = 8;
/** A click counts as "on the text" if it lands this close to the nearest character. */
const NEAR_TEXT_PX = 24;

function selectorFor(el: Element): string {
  const parts: string[] = [];
  for (let node: Element | null = el; node && node !== document.documentElement; node = node.parentElement) {
    if (node.id && document.querySelectorAll(`#${CSS.escape(node.id)}`).length === 1) {
      parts.unshift(`#${CSS.escape(node.id)}`);
      break;
    }
    let part = node.tagName.toLowerCase();
    const siblings = node.parentElement ? [...node.parentElement.children].filter((c) => c.tagName === node.tagName) : [];
    if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
    parts.unshift(part);
  }
  return parts.join(' > ');
}

/** The character under (or right next to) a screen position, if there is text there. */
function textPositionAt(clientX: number, clientY: number): { node: Text; offset: number } | null {
  const caret = document.caretPositionFromPoint?.(clientX, clientY);
  let node: Node | null | undefined = caret?.offsetNode;
  let offset = caret?.offset ?? 0;
  if (!node) {
    const range = document.caretRangeFromPoint?.(clientX, clientY);
    node = range?.startContainer;
    offset = range?.startOffset ?? 0;
  }
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const text = node as Text;
  if (text.length === 0) return null;
  offset = Math.min(offset, text.length - 1);

  const range = document.createRange();
  range.setStart(text, offset);
  range.setEnd(text, offset + 1);
  const rect = range.getClientRects()[0];
  if (!rect) return null;
  const dx = Math.max(rect.left - clientX, 0, clientX - rect.right);
  const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
  return Math.hypot(dx, dy) <= NEAR_TEXT_PX ? { node: text, offset } : null;
}

/**
 * For markers. The main anchor is the text under the click, because text moves with the layout. If the
 * click was not on text, the nearest element and the spot inside it are used instead. The scroll position is
 * the last resort. All three are saved, so a marker survives a page change that breaks one of them.
 */
export function buildMarkerAnchor(clientX: number, clientY: number, target: Element): Anchor {
  const rect = target.getBoundingClientRect();
  const anchor: Anchor = {
    element: {
      selector: selectorFor(target),
      xRatio: (clientX - rect.left) / Math.max(1, rect.width),
      yRatio: (clientY - rect.top) / Math.max(1, rect.height),
    },
    scrollPercent: scrollPercentAt(clientY),
  };
  const spot = textPositionAt(clientX, clientY);
  if (!spot) return anchor;
  const index = buildTextIndex();
  const entry = index.nodes.find((n) => n.node === spot.node);
  if (!entry) return anchor;
  const start = entry.start + spot.offset;
  const end = Math.min(index.text.length, start + MARKER_QUOTE_CHARS);
  anchor.quote = {
    exact: index.text.slice(start, end),
    prefix: index.text.slice(Math.max(0, start - CONTEXT_CHARS), start),
    suffix: index.text.slice(end, end + CONTEXT_CHARS),
  };
  return anchor;
}

/** A short piece of the text around a click, to show in the viewer. */
export function nearbyText(target: Element): string {
  return (target.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
}
