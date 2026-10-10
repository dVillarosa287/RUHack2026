// Works out where a marker belongs in the window right now. It is asked every frame, so a marker
// follows its text through scrolling, resizing, and parts of the page that open, close or reflow.
import type { Anchor } from '@/lib/storage';
import { resolveQuote } from './anchor';
import { buildTextIndex } from './textIndex';

const FIRST_RETRY_MS = 500;
const MAX_RETRY_MS = 4000;

function firstRect(range: Range): DOMRect | null {
  for (const rect of range.getClientRects()) {
    if (rect.width > 0 || rect.height > 0) return rect;
  }
  return null;
}

/** Follows one marker. Create one per marker and call `position()` each frame. */
export class MarkerTracker {
  private range: Range | null = null;
  private element: Element | null = null;
  private nextSearchAt = 0;
  private retryMs = FIRST_RETRY_MS;

  constructor(private readonly anchor: Anchor) {}

  /** Window coordinates (like a mouse position), tried in order: the text, the element, the scroll position. */
  position(): { x: number; y: number } {
    const { quote, element, scrollPercent } = this.anchor;

    if (quote) {
      // A range follows its text on its own. It only needs finding again if the text was removed from the page.
      if ((!this.range || this.range.collapsed) && performance.now() >= this.nextSearchAt) {
        this.range = resolveQuote(buildTextIndex(), this.anchor);
        this.backOff(this.range !== null);
      }
      const rect = this.range && firstRect(this.range);
      // Left edge and middle of the line: the sprite is centered here, which is close to where the user clicked.
      if (rect) return { x: rect.left, y: rect.top + rect.height / 2 };
    }

    if (element) {
      if (!this.element?.isConnected) {
        try {
          this.element = document.querySelector(element.selector);
        } catch {
          this.element = null;
        }
      }
      const rect = this.element?.getBoundingClientRect();
      if (rect && (rect.width > 0 || rect.height > 0)) {
        return { x: rect.left + element.xRatio * rect.width, y: rect.top + element.yRatio * rect.height };
      }
    }

    return {
      x: document.documentElement.clientWidth / 2,
      y: scrollPercent * document.documentElement.scrollHeight - window.scrollY,
    };
  }

  private backOff(found: boolean) {
    this.retryMs = found ? FIRST_RETRY_MS : Math.min(MAX_RETRY_MS, this.retryMs * 2);
    this.nextSearchAt = performance.now() + this.retryMs;
  }
}
