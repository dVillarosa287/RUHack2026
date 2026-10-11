import { useCallback } from 'react';
import type { Seed, SpriteType } from '@/lib/storage';
import { placeMarker } from './placeMarker';

interface DropOptions {
  /** A palette color id, for example 'green'. */
  colorId: string;
  /** The forest new seeds go into. Nothing is saved until there is one. */
  forestId: string | null;
  /** True for anything that belongs to our own UI (toolbar, markers), which is not the page. */
  isInsideUi(target: EventTarget | null): boolean;
  /** Called with a short message for the user, such as "Marker placed". */
  say(message: string): void;
  onCreated(seed: Seed): void;
}

/**
 * The toolbar calls the returned function when the user lets go of a sprite they dragged from it:
 * `dropSprite(type, clientX, clientY)`. It decides what to do. If the spot is on the page, a marker is saved
 * there. If it is on the toolbar or outside the window, nothing happens.
 */
export function useDropSprite({ colorId, forestId, isInsideUi, say, onCreated }: DropOptions): (type: SpriteType, clientX: number, clientY: number) => void {
  return useCallback(
    (type, clientX, clientY) => {
      const target = document.elementFromPoint(clientX, clientY);
      if (!target || isInsideUi(target) || !forestId) return;
      void placeMarker({ forestId, spriteType: type, colorId, clientX, clientY, target }).then((seed) => {
        onCreated(seed);
        say('Marker placed');
      });
    },
    [colorId, forestId, isInsideUi, onCreated, say],
  );
}
