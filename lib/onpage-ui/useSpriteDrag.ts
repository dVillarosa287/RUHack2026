import { useCallback, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { SpriteType } from '@/lib/storage';

interface SpriteDragOptions {
  /** The user let go of the sprite at this spot in the window. */
  onDrop(type: SpriteType, clientX: number, clientY: number): void;
}

const DRAG_DISTANCE_PX = 4;
const SWALLOW_CLICK_MS = 100;

/**
 * Lets the user pick a sprite up from the toolbar and carry it onto the page. A press that never moves
 * is an ordinary click and is left to the button. Esc cancels. Returns the sprite being carried (null when
 * none) and `startSpriteDrag`, to call from the sprite button's onPointerDown.
 */
export function useSpriteDrag({ onDrop }: SpriteDragOptions) {
  const [dragging, setDragging] = useState<SpriteType | null>(null);

  const startSpriteDrag = useCallback(
    (type: SpriteType, e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      e.preventDefault(); // no text selection or browser drag while carrying
      const start = { x: e.clientX, y: e.clientY };
      let moved = false;

      const move = (ev: PointerEvent) => {
        if (moved || Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < DRAG_DISTANCE_PX) return;
        moved = true;
        setDragging(type);
      };

      const finish = (drop: { x: number; y: number } | null) => {
        window.removeEventListener('pointermove', move, true);
        window.removeEventListener('pointerup', up, true);
        window.removeEventListener('keydown', key, true);
        setDragging(null);
        if (!moved) return;
        // Letting go would also count as a click on whatever is underneath, which the page must not see.
        const swallow = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        window.addEventListener('click', swallow, true);
        window.setTimeout(() => window.removeEventListener('click', swallow, true), SWALLOW_CLICK_MS);
        if (drop) onDrop(type, drop.x, drop.y);
      };

      const up = (ev: PointerEvent) => finish({ x: ev.clientX, y: ev.clientY });
      const key = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') finish(null);
      };

      window.addEventListener('pointermove', move, true);
      window.addEventListener('pointerup', up, true);
      window.addEventListener('keydown', key, true);
    },
    [onDrop],
  );

  return { dragging, startSpriteDrag };
}
