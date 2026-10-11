import { useCallback } from 'react';
import type { Seed, SpriteType } from '@/lib/storage';
import { placeMarker } from './placeMarker';

interface DropOptions {
  /** The forest new seeds go into. Nothing is saved until there is one. */
  forestId: string | null;
  /** The size new sprites are planted at (1 is normal). */
  scale: number;
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
export function useDropSprite({ forestId, scale, isInsideUi, say, onCreated }: DropOptions): (type: SpriteType, clientX: number, clientY: number) => void {
  return useCallback(
    (type, clientX, clientY) => {
      const target = document.elementFromPoint(clientX, clientY);
      if (!target || isInsideUi(target) || !forestId) return;
      void placeMarker({ forestId, spriteType: type, clientX, clientY, target, scale }).then((seed) => {
        onCreated(seed);
        say('Marker placed');
      });
    },
    [forestId, scale, isInsideUi, onCreated, say],
  );
}
