import { useCallback, useEffect, useRef, useState } from 'react';
import { takePendingJump, type Seed } from '@/lib/storage';
import { MarkerTracker } from './markers';
import { flashHighlight, getHighlightRange, paintHighlights } from './highlights';
import { scrollToHighlight, scrollToPageY } from './scroll';

const RETRY_DELAYS_MS = [500, 1000, 2000, 4000, 8000];
const FLASH_MS = 2000;

/**
 * Draws the page's saved highlights, and scrolls to a seed if the viewer asked us to show one ("Open on page").
 * Pages that load their text late get a few more tries. Returns the id of a marker that should flash.
 */
export function useSeedsOnPage(seeds: Seed[]): { flashId: string | null } {
  const [flashId, setFlashId] = useState<string | null>(null);
  const seedsRef = useRef<Seed[]>([]);
  const jumpRef = useRef<string | null>(null);
  seedsRef.current = seeds;

  const attemptJump = useCallback(() => {
    const id = jumpRef.current;
    const seed = id ? seedsRef.current.find((s) => s.id === id) : undefined;
    if (!id || !seed) return;
    if (seed.kind === 'highlight') {
      if (!getHighlightRange(id)) return;
      scrollToHighlight(id);
      flashHighlight(id);
    } else {
      if (!seed.anchor) return;
      scrollToPageY(new MarkerTracker(seed.anchor).position().y + window.scrollY);
      setFlashId(id);
      window.setTimeout(() => setFlashId(null), FLASH_MS);
    }
    jumpRef.current = null;
  }, []);

  useEffect(() => {
    void takePendingJump(window.location.href).then((id) => {
      jumpRef.current = id;
      attemptJump();
    });
  }, [attemptJump]);

  useEffect(() => {
    let attempt = 0;
    let timer: number | undefined;
    const run = () => {
      const found = paintHighlights(seeds);
      attemptJump();
      const missing = seeds.some((s) => s.kind === 'highlight' && s.anchor?.quote && !found.has(s.id));
      if (missing && attempt < RETRY_DELAYS_MS.length) timer = window.setTimeout(run, RETRY_DELAYS_MS[attempt++]);
    };
    run();
    return () => window.clearTimeout(timer);
  }, [seeds, attemptJump]);

  return { flashId };
}
