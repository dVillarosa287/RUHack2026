import { getHighlightRange } from './highlights';

/** Scrolls so the given page height sits about a third of the way down the window. */
export function scrollToPageY(pageY: number) {
  window.scrollTo({ top: Math.max(0, pageY - window.innerHeight / 3), behavior: 'smooth' });
}

/** Scrolls to a painted highlight. Returns false if it is not on the page (yet). */
export function scrollToHighlight(seedId: string): boolean {
  const range = getHighlightRange(seedId);
  if (!range) return false;
  scrollToPageY(range.getBoundingClientRect().top + window.scrollY);
  return true;
}
