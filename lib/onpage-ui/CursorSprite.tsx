import { useEffect, useRef } from 'react';
import type { SpriteType } from '@/lib/storage';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';

interface CursorSpriteProps {
  /** The sprite to show on the mouse, or null for none. */
  type: SpriteType | null;
  /** True while a sprite is being dragged off the toolbar: it then shows over the toolbar too. */
  showOverUi: boolean;
  /** The size the sprite will be planted at (1 is normal), so - and + show here before planting. */
  scale: number;
  isInsideUi(target: EventTarget | null): boolean;
}

const SIZE = 38;

/**
 * A copy of the chosen sprite that follows the mouse, a little to its top right and see-through (see
 * `.fo-cursor-sprite` in toolbar.css), so it looks like the user is carrying it onto the page without hiding the spot. It ignores the mouse, so clicks go straight through to the page. It follows with a direct style change
 * instead of React state, so it does not redraw on every mouse move.
 */
export function CursorSprite({ type, showOverUi, scale, isInsideUi }: CursorSpriteProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const move = (e: PointerEvent) => {
      // Over the toolbar or a marker the real cursor is enough: a sprite on top of a button would be in the way.
      el.style.visibility = !showOverUi && isInsideUi(e.target) ? 'hidden' : 'visible';
      el.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    };
    const hide = () => {
      el.style.visibility = 'hidden';
    };
    window.addEventListener('pointermove', move, true);
    document.documentElement.addEventListener('mouseleave', hide);
    return () => {
      window.removeEventListener('pointermove', move, true);
      document.documentElement.removeEventListener('mouseleave', hide);
    };
  }, [type, showOverUi, isInsideUi]);

  if (!type) return null;
  return (
    <div ref={ref} className="fo-cursor-sprite" aria-hidden="true">
      <SpriteIcon type={type} size={SIZE * scale} />
    </div>
  );
}
