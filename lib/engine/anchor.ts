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

/** For placed markers: the element that was clicked, the spot inside it, and the scroll position. */
export function buildPointAnchor(clientX: number, clientY: number, target: Element): Anchor {
  const rect = target.getBoundingClientRect();
  return {
    element: {
      selector: selectorFor(target),
      xRatio: (clientX - rect.left) / Math.max(1, rect.width),
      yRatio: (clientY - rect.top) / Math.max(1, rect.height),
    },
    scrollPercent: scrollPercentAt(clientY),
  };
}

/** Where a marker belongs, in page coordinates. Falls back to the scroll percentage if the element is gone. */
export function resolvePoint(anchor: Anchor): { x: number; y: number } | null {
  if (anchor.element) {
    try {
      const el = document.querySelector(anchor.element.selector);
      const rect = el?.getBoundingClientRect();
      if (rect && (rect.width > 0 || rect.height > 0)) {
        return {
          x: rect.left + window.scrollX + anchor.element.xRatio * rect.width,
          y: rect.top + window.scrollY + anchor.element.yRatio * rect.height,
        };
      }
    } catch {
      // A bad selector falls through to the scroll percentage.
    }
  }
  return {
    x: document.documentElement.clientWidth / 2,
    y: anchor.scrollPercent * document.documentElement.scrollHeight,
  };
}
