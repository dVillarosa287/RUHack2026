// Watches the mouse while a tool is active. Dragging over text highlights it; a plain click places a marker.
// With the camera on (the toolbar's camera button), every drag is a box instead: a screenshot of that box.
import { areaBetween, isBigEnough, showAreaBox, type Area } from './screenshot';

export interface PlantHandlers {
  isInsideUi(target: EventTarget | null): boolean;
  onHighlight(range: Range, text: string): void;
  onPlace(spot: { clientX: number; clientY: number; target: Element }): void;
  /** Camera only: a box was dragged, in window coordinates at the moment the mouse was let go. `start` is where it began. */
  onArea(area: Area, start: { x: number; y: number }): void;
  /** The camera is on: drags draw a box (no text gets selected) and a plain click does nothing. */
  camera: boolean;
}

const DRAG_DISTANCE_PX = 4;
// A double-click selects a word. Wait a moment so its first click does not also drop a marker.
const DOUBLE_CLICK_WAIT_MS = 250;

/** Starts listening. Returns a function that stops. */
export function startPlanting(handlers: PlantHandlers): () => void {
  // Where the mouse was pressed, in page coordinates (window + scroll), so a scroll during the drag is allowed for.
  let down: { x: number; y: number } | null = null;
  let frame = 0;
  /** The box from the press to (x, y), both in window coordinates now. */
  const boxTo = (from: { x: number; y: number }, x: number, y: number) => areaBetween({ x: from.x - window.scrollX, y: from.y - window.scrollY }, { x, y });
  let pendingMarker: number | undefined;
  // Counts mouse presses. A marker is only placed if no other press came after its click.
  let presses = 0;

  const onMouseDown = (e: MouseEvent) => {
    presses++;
    down = e.button === 0 && !handlers.isInsideUi(e.target) ? { x: e.clientX + window.scrollX, y: e.clientY + window.scrollY } : null;
    // With the camera on, a drag is always a box: stop the browser from selecting text under it.
    if (down && handlers.camera) e.preventDefault();
  };

  // With the camera on, the dashed box shows while dragging.
  const onMouseMove = (e: MouseEvent) => {
    if (!down || !handlers.camera || !(e.buttons & 1)) return;
    const from = down;
    const { clientX, clientY } = e;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const area = boxTo(from, clientX, clientY);
      showAreaBox(isBigEnough(area) ? area : null);
    });
  };

  // Pictures and links can be dragged out of the page. While planting, a drag is ours.
  const onDragStart = (e: DragEvent) => {
    if (!handlers.isInsideUi(e.target)) e.preventDefault();
  };

  const onMouseUp = (e: MouseEvent) => {
    if (!down || e.button !== 0) return;
    const from = down;
    down = null;
    cancelAnimationFrame(frame);
    showAreaBox(null);
    const { clientX, clientY } = e;
    const area = boxTo(from, clientX, clientY);
    const moved = Math.hypot(clientX + window.scrollX - from.x, clientY + window.scrollY - from.y) > DRAG_DISTANCE_PX;
    if (handlers.camera) {
      // Only a drag takes a screenshot; the sprite goes where the drag started (in window coordinates now).
      if (moved && isBigEnough(area)) handlers.onArea(area, { x: from.x - window.scrollX, y: from.y - window.scrollY });
      return;
    }
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
      // A drag that selected no text does nothing (screenshots need the camera).
      if (moved) return;
      // Only a single click places a marker. A double or triple click is for selecting words.
      if (clicks > 1) return;
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
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('dragstart', onDragStart, true);
  document.addEventListener('click', onClick, true);
  return () => {
    window.clearTimeout(pendingMarker);
    cancelAnimationFrame(frame);
    showAreaBox(null);
    document.removeEventListener('mousedown', onMouseDown, true);
    document.removeEventListener('mouseup', onMouseUp, true);
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('dragstart', onDragStart, true);
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
