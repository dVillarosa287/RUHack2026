// Picking up and removing the creatures that visit a page (the owl, the frog, and any we add later). Every creature
// uses this, so they all behave the same: drag one to move it, click one with the shovel to send it away.

const DRAG_DISTANCE_PX = 4;

interface GrabOptions {
  /** True while the shovel is the tool in hand. */
  isDigging(): boolean;
  /** The shovel clicked the creature: it should go away. */
  onDig(): void;
  /** The creature is being carried; x and y are the mouse in window coordinates. */
  onDrag(x: number, y: number): void;
  /** It was let go here (window coordinates). While carried it ignores the mouse, so the page under it can be hit-tested. */
  onDrop(x: number, y: number): void;
}

/** Makes `el` (a creature) grabbable. Returns a function that stops it. */
export function grabCreature(el: HTMLElement, options: GrabOptions): () => void {
  const down = (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (options.isDigging()) return options.onDig();
    const start = { x: e.clientX, y: e.clientY };
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (!moved) {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < DRAG_DISTANCE_PX) return;
        moved = true;
        el.classList.add('fo-creature-dragging');
      }
      options.onDrag(ev.clientX, ev.clientY);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      if (!moved) return;
      options.onDrop(ev.clientX, ev.clientY);
      el.classList.remove('fo-creature-dragging');
    };
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
  };
  el.addEventListener('pointerdown', down);
  return () => el.removeEventListener('pointerdown', down);
}
