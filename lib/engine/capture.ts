// Watches the mouse while a tool is active. Dragging over text highlights it; a plain click places a marker.

export interface PlantHandlers {
  isInsideUi(target: EventTarget | null): boolean;
  onHighlight(range: Range, text: string): void;
  onPlace(spot: { clientX: number; clientY: number; target: Element }): void;
}

const DRAG_DISTANCE_PX = 4;
// A double-click selects a word. Wait a moment so its first click does not also drop a marker.
const DOUBLE_CLICK_WAIT_MS = 250;

/** Starts listening. Returns a function that stops. */
export function startPlanting(handlers: PlantHandlers): () => void {
  let down: { x: number; y: number } | null = null;
  let pendingMarker: number | undefined;
  // Counts mouse presses. A marker is only placed if no other press came after its click.
  let presses = 0;

  const onMouseDown = (e: MouseEvent) => {
    presses++;
    down = e.button === 0 && !handlers.isInsideUi(e.target) ? { x: e.clientX, y: e.clientY } : null;
  };

  const onMouseUp = (e: MouseEvent) => {
    if (!down || e.button !== 0) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > DRAG_DISTANCE_PX;
    down = null;
    const { clientX, clientY } = e;
    const pressesAtClick = presses;
    const clicks = e.detail;
    // The browser finishes updating the selection just after mouseup.
    window.setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().replace(/\s+/g, ' ').trim();
      if (selection && text && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0).cloneRange();
        selection.removeAllRanges();
        window.clearTimeout(pendingMarker);
        handlers.onHighlight(range, text);
        return;
      }
      // Only a single click places a marker. A double or triple click is for selecting words.
      if (moved || clicks > 1) return;
      window.clearTimeout(pendingMarker);
      pendingMarker = window.setTimeout(() => {
        if (presses !== pressesAtClick) return;
        const target = document.elementFromPoint(clientX, clientY);
        if (target) handlers.onPlace({ clientX, clientY, target });
      }, DOUBLE_CLICK_WAIT_MS);
    }, 0);
  };

  // While planting, clicks belong to us: do not follow links or trigger the page's own click handlers.
  const onClick = (e: MouseEvent) => {
    if (handlers.isInsideUi(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  };

  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('mouseup', onMouseUp, true);
  document.addEventListener('click', onClick, true);
  return () => {
    window.clearTimeout(pendingMarker);
    document.removeEventListener('mousedown', onMouseDown, true);
    document.removeEventListener('mouseup', onMouseUp, true);
    document.removeEventListener('click', onClick, true);
  };
}

export interface DigHandlers {
  isInsideUi(target: EventTarget | null): boolean;
  /** Return the seed id under the click, or null if there is none. */
  findSeedAt(clientX: number, clientY: number): string | null;
  onDig(seedId: string): void;
}

/** The shovel: clicking a highlight removes it. Other clicks work as normal. */
export function startDigging(handlers: DigHandlers): () => void {
  const onClick = (e: MouseEvent) => {
    if (handlers.isInsideUi(e.target)) return;
    const id = handlers.findSeedAt(e.clientX, e.clientY);
    if (!id) return;
    e.preventDefault();
    e.stopPropagation();
    handlers.onDig(id);
  };
  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}
