import { useCallback, useEffect } from 'react';
import { deleteSeed, getSeed, saveScreenshot, saveSeed, type Seed, type SpriteType } from '@/lib/storage';
import { buildMarkerAnchor, buildQuoteAnchor } from './anchor';
import { startDigging, startPlanting } from './capture';
import { highlightIdAtPoint } from './highlights';
import { placeMarker } from './placeMarker';
import { captureArea, startAreaSelect, textInArea, type Area } from './screenshot';
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
  /** The lily pad's box while it is being dragged (null when none), so the UI can draw it. */
  onAreaDrag(area: Area | null): void;
  /** Hides or shows our own toolbar and markers, so they are not in a screenshot. */
  hideUi(hidden: boolean): void;
}

/** Waits for the browser to draw the page again, so hidden UI is really gone from the screen. */
const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

/**
 * Turns mouse activity on the page into saved seeds: drag over text to highlight, click to place a marker,
 * and with the shovel, click to remove. The lily pad is special: it takes a screenshot of a box the user drags,
 * for the quiz. Returns `removeSeed` for the markers, which handle their own clicks.
 */
export function usePlanting({ tool, spriteType, colorId, forestId, isInsideUi, say, onCreated, onDeleted, onAreaDrag, hideUi }: PlantingOptions): { removeSeed(seedId: string): Promise<void> } {
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
    if (spriteType === 'lilypad') {
      return startAreaSelect({
        isInsideUi,
        onDrag: onAreaDrag,
        onArea: async (area) => {
          const text = textInArea(area);
          // The lily pad marker sits at the top-left corner of the box, attached to what is under it there. That is
          // looked up while our UI is hidden, so it finds the page and not our toolbar.
          const x = area.left + 12;
          const y = area.top + 12;
          hideUi(true);
          await nextPaint();
          const target = document.elementFromPoint(x, y) ?? document.body;
          let image: string;
          try {
            image = await captureArea(area);
          } catch (error) {
            return say(error instanceof Error ? error.message : 'Could not take the screenshot');
          } finally {
            hideUi(false);
          }
          const seed = await saveSeed({ forestId, kind: 'media', spriteType, color: colorId, url: window.location.href, pageTitle: document.title, text, anchor: buildMarkerAnchor(x, y, target) });
          await saveScreenshot(seed.id, image);
          onCreated(seed);
          say('Screenshot saved for the quiz');
        },
      });
    }
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
  }, [tool, spriteType, colorId, forestId, isInsideUi, onCreated, removeSeed, say, onAreaDrag, hideUi]);

  return { removeSeed };
}
