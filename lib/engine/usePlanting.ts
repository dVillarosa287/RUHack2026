import { useCallback, useEffect } from 'react';
import { deleteSeed, getSeed, saveSeed, type Seed, type SpriteType } from '@/lib/storage';
import { buildQuoteAnchor } from './anchor';
import { startDigging, startPlanting } from './capture';
import { highlightIdAtPoint } from './highlights';
import { placeMarker } from './placeMarker';
import type { Tool } from './types';

interface PlantingOptions {
  tool: Tool;
  spriteType: SpriteType;
  /** A palette color id, for example 'green'. */
  colorId: string;
  /** The forest new seeds go into. Nothing is saved until there is one. */
  forestId: string | null;
  /** True for events that started inside our own toolbar, which the page tools must ignore. */
  isInsideUi(target: EventTarget | null): boolean;
  /** Called with a short message for the user, such as "Highlight saved". */
  say(message: string): void;
  onCreated(seed: Seed): void;
  onDeleted(seed: Seed): void;
}

/**
 * Turns mouse activity on the page into saved seeds: drag over text to highlight, click to place a marker,
 * and with the shovel, click to remove. Returns `removeSeed` for the markers, which handle their own clicks.
 */
export function usePlanting({ tool, spriteType, colorId, forestId, isInsideUi, say, onCreated, onDeleted }: PlantingOptions): { removeSeed(seedId: string): Promise<void> } {
  const removeSeed = useCallback(
    async (seedId: string) => {
      const seed = await getSeed(seedId);
      await deleteSeed(seedId);
      if (seed) onDeleted(seed);
      say('Removed');
    },
    [onDeleted, say],
  );

  useEffect(() => {
    if (tool === 'dig') {
      return startDigging({ isInsideUi, findSeedAt: highlightIdAtPoint, onDig: (id) => void removeSeed(id) });
    }
    if (tool !== 'plant' || !forestId) return;
    return startPlanting({
      isInsideUi,
      onHighlight: async (range, text) => {
        const anchor = buildQuoteAnchor(range);
        if (!anchor) return say('Could not save that selection');
        const seed = await saveSeed({ forestId, kind: 'highlight', spriteType, color: colorId, url: window.location.href, pageTitle: document.title, text, anchor });
        onCreated(seed);
        say('Highlight saved');
      },
      onPlace: async ({ clientX, clientY, target }) => {
        const seed = await placeMarker({ forestId, spriteType, colorId, clientX, clientY, target });
        onCreated(seed);
        say('Marker placed');
      },
    });
  }, [tool, spriteType, colorId, forestId, isInsideUi, onCreated, removeSeed, say]);

  return { removeSeed };
}
