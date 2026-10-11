// The lily pad's screenshot: the user drags a box over the page, and that part of the screen is saved as an image.
// The browser only lets the background worker take the picture (of the whole visible tab), so the page asks it
// to, then crops the picture to the box here.
import { browser } from 'wxt/browser';
import { UI_HOST_TAG } from './textIndex';

export interface Area {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface AreaHandlers {
  isInsideUi(target: EventTarget | null): boolean;
  /** The box while it is being dragged, or null when there is none. For drawing it. */
  onDrag(area: Area | null): void;
  /** The finished box, in window coordinates. */
  onArea(area: Area): void;
}

/** Boxes smaller than this are taken as a slip of the mouse. */
const MIN_SIZE_PX = 12;
/** Saved screenshots are at most this wide, as JPEG, to keep storage small (about 50 to 150 KB each). */
const MAX_WIDTH_PX = 1000;
const JPEG_QUALITY = 0.8;
/** The most text kept from inside the box, for the no-AI quiz and as context for Gemini. */
const MAX_TEXT = 2000;

const areaBetween = (a: { x: number; y: number }, b: { x: number; y: number }): Area => ({
  left: Math.min(a.x, b.x),
  top: Math.min(a.y, b.y),
  width: Math.abs(a.x - b.x),
  height: Math.abs(a.y - b.y),
});

/** Starts listening for a box being dragged over the page. Returns a function that stops. */
export function startAreaSelect(handlers: AreaHandlers): () => void {
  let start: { x: number; y: number } | null = null;

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || handlers.isInsideUi(e.target)) return;
    e.preventDefault(); // no text selection while dragging the box
    e.stopPropagation();
    start = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e: PointerEvent) => {
    if (start) handlers.onDrag(areaBetween(start, { x: e.clientX, y: e.clientY }));
  };
  const onUp = (e: PointerEvent) => {
    if (!start) return;
    const area = areaBetween(start, { x: e.clientX, y: e.clientY });
    start = null;
    handlers.onDrag(null);
    if (area.width >= MIN_SIZE_PX && area.height >= MIN_SIZE_PX) handlers.onArea(area);
  };
  // Pressing the mouse on a page normally starts selecting text. Not while the tool is on.
  const onMouseDown = (e: MouseEvent) => {
    if (!handlers.isInsideUi(e.target)) e.preventDefault();
  };
  // Clicks belong to us while the tool is on: do not follow links.
  const onClick = (e: MouseEvent) => {
    if (handlers.isInsideUi(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  };
  const previousCursor = document.documentElement.style.cursor;
  document.documentElement.style.cursor = 'crosshair';

  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('pointermove', onMove, true);
  document.addEventListener('pointerup', onUp, true);
  document.addEventListener('click', onClick, true);
  return () => {
    document.documentElement.style.cursor = previousCursor;
    handlers.onDrag(null);
    document.removeEventListener('pointerdown', onDown, true);
    document.removeEventListener('mousedown', onMouseDown, true);
    document.removeEventListener('pointermove', onMove, true);
    document.removeEventListener('pointerup', onUp, true);
    document.removeEventListener('click', onClick, true);
  };
}

/** The page's own text inside the box (not our toolbar's), in reading order, shortened to MAX_TEXT. */
export function textInArea(area: Area): string {
  const right = area.left + area.width;
  const bottom = area.top + area.height;
  const parts: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest(`${UI_HOST_TAG}, script, style, noscript`) || !node.textContent?.trim() ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  const range = document.createRange();
  let length = 0;
  for (let node = walker.nextNode(); node && length < MAX_TEXT; node = walker.nextNode()) {
    // Text the page has hidden (closed menus and the like) still has a position, so it is checked first.
    if (!node.parentElement?.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    range.selectNodeContents(node);
    const inside = [...range.getClientRects()].some((r) => r.right > area.left && r.left < right && r.bottom > area.top && r.top < bottom);
    if (!inside) continue;
    const text = node.textContent?.replace(/\s+/g, ' ') ?? '';
    parts.push(text);
    length += text.length;
  }
  return parts.join('').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read the screenshot'));
    img.src = src;
  });
}

/**
 * A picture of the box, as a JPEG data URL. Hide our own toolbar and markers before calling this, or they would
 * be in the picture. Throws if the browser refuses (some pages, such as the Chrome Web Store, cannot be captured).
 */
export async function captureArea(area: Area): Promise<string> {
  const reply = (await browser.runtime.sendMessage({ type: 'forest:capture-tab' })) as { ok: boolean; value?: string; error?: string } | undefined;
  if (!reply?.ok || !reply.value) throw new Error(reply?.error ?? 'Could not take the screenshot');
  const shot = await loadImage(reply.value);
  // The picture is in device pixels; the box is in CSS pixels.
  const scale = shot.naturalWidth / window.innerWidth;
  const shrink = Math.min(1, MAX_WIDTH_PX / (area.width * scale));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(area.width * scale * shrink));
  canvas.height = Math.max(1, Math.round(area.height * scale * shrink));
  canvas.getContext('2d')?.drawImage(shot, area.left * scale, area.top * scale, area.width * scale, area.height * scale, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}
