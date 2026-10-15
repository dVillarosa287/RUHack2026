import { useCallback, useEffect } from 'react';
import { browser } from 'wxt/browser';
import { deleteSeed, getSeed, getSettings, saveQuiz, saveSeed, type Seed, type SpriteType } from '@/lib/storage';
import { TEXT_ONLY_SPRITES, getWords, spriteColorKey, spriteLabel, useThemeId } from '@/lib/theme';
import { buildQuoteAnchor } from './anchor';
import { startDigging, startPlanting } from './capture';
import { highlightIdAtPoint } from './highlights';
import { pageUrl } from './pageUrl';
import { placeMarker } from './placeMarker';
import { appleFruitKey, recallQuestion } from './recall';
import { plantScreenshot } from './screenshot';
import type { Tool } from './types';

interface PlantingOptions {
  tool: Tool;
  spriteType: SpriteType;
  /** The forest new seeds go into. Nothing is saved until there is one. */
  forestId: string | null;
  /** The size new sprites are planted at (1 is normal), chosen with - and + before planting. */
  scale: number;
  /** The toolbar's camera is on: a drag takes a screenshot that is saved with the sprite (never for the apple). */
  camera: boolean;
  /** True for events that started inside our own toolbar, which the page tools must ignore. */
  isInsideUi(target: EventTarget | null): boolean;
  /** Called with a short message for the user, such as "Highlight saved". */
  say(message: string): void;
  onCreated(seed: Seed): void;
  onDeleted(seed: Seed): void;
}

/**
 * Turns mouse activity on the page into saved seeds: drag over text to highlight, click to place a marker,
 * and with the shovel, click to remove. The lily pad and the apple only go on text (they are quiz material), so
 * with them a click places nothing. With the camera on, dragging a box saves a screenshot of it with the sprite
 * (the lily pad too, for an AI quiz; never the apple). Planting an apple also starts its active recall timer. Returns `removeSeed` for the markers, which handle their own clicks.
 */
export function usePlanting({ tool, spriteType, forestId, scale, camera, isInsideUi, say, onCreated, onDeleted}: PlantingOptions): { removeSeed(seedId: string): Promise<void> } {
  const themeId = useThemeId();
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
        // An apple asks its question after the active recall time (Settings). The background worker sets an alarm,
        // because a timer in the page would be lost if the tab closed.
        const nextReviewAt = spriteType === 'fruitsprout' ? Date.now() + (await getSettings()).reviewMinutes * 60_000 : null;
        const seed = await saveSeed({ forestId, kind: 'highlight', spriteType, color: spriteColorKey(spriteType), url: pageUrl(), pageTitle: document.title, text, anchor, nextReviewAt, scale });
        if (nextReviewAt) {
          // Its question is made now, while the paragraph is on screen: that paragraph with the highlight blanked out.
          await saveQuiz({ forestId, color: appleFruitKey(seed.id), questions: [recallQuestion(range, text, seed.id)] });
          void browser.runtime.sendMessage({ type: 'forest:schedule-review', seedId: seed.id, when: nextReviewAt });
        }
        onCreated(seed);
        // "Apple planted: ..." in the nature themes, "Circle placed: ..." in Minimal.
        say(nextReviewAt ? getWords(themeId).quizLater(spriteLabel(spriteType, themeId)) : 'Highlight saved');
      },
      onPlace: async ({ clientX, clientY, target }) => {
        if (TEXT_ONLY_SPRITES.includes(spriteType)) return say(`${spriteLabel(spriteType, themeId)}s go on text: drag over a sentence`);
        const seed = await placeMarker({ forestId, spriteType, clientX, clientY, target, scale });
        onCreated(seed);
        say('Marker placed');
      },
      // With the camera on, a dragged box is a screenshot (lib/engine/screenshot.ts). The apple never takes one.
      camera: camera && spriteType !== 'fruitsprout',
      onArea: async (area, start) => {
        say('Taking a screenshot...');
        try {
          const seed = await plantScreenshot({ forestId, spriteType, area, start, scale });
          onCreated(seed);
          say('Screenshot saved');
        } catch (error) {
          say(error instanceof Error ? error.message : 'Could not take the screenshot');
        }
      },
    });
  }, [tool, spriteType, forestId, scale, camera, isInsideUi, onCreated, removeSeed, say, themeId]);

  return { removeSeed };
}
