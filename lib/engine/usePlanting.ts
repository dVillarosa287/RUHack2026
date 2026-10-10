import { useCallback, useEffect } from 'react';
import { deleteSeed, saveSeed, type SpriteType } from '@/lib/storage';
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
}

/**
 * Turns mouse activity on the page into saved seeds: drag over text to highlight, click to place a marker,
 * and with the shovel, click to remove. Returns `removeSeed` for the markers, which handle their own clicks.
 */
export function usePlanting({ tool, spriteType, colorId, forestId, isInsideUi, say }: PlantingOptions): { removeSeed(seedId: string): Promise<void> } {
  const removeSeed = useCallback(
    async (seedId: string) => {
      await deleteSeed(seedId);
      say('Removed');
    },
    [say],
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
        await saveSeed({ forestId, kind: 'highlight', spriteType, color: colorId, url: window.location.href, pageTitle: document.title, text, anchor });
        say('Highlight saved');
      },
      onPlace: async ({ clientX, clientY, target }) => {
        await placeMarker({ forestId, spriteType, colorId, clientX, clientY, target });
        say('Marker placed');
      },
    });
  }, [tool, spriteType, colorId, forestId, isInsideUi, removeSeed, say]);

  return { removeSeed };
}
