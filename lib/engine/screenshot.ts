// Screenshots: with a sprite picked and the toolbar's camera on, dragging a box saves a picture of that box as a
// `media` seed. The browser only lets the background worker take the
// picture (of the whole visible tab), so the page asks it to, then crops the picture to the box here.
import { browser } from 'wxt/browser';
import { saveScreenshot, saveSeed, type Seed, type SpriteType } from '@/lib/storage';
import { spriteColorKey } from '@/lib/theme';
import { buildMarkerAnchor } from './anchor';
import { pageUrl } from './pageUrl';
import { UI_HOST_TAG } from './textIndex';

/** A box in window (viewport) coordinates, in CSS pixels. */
export interface Area {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Boxes smaller than this (either side) are taken as a slip of the mouse. */
export const MIN_AREA_PX = 12;
/** Saved screenshots are at most this wide, as JPEG, to keep storage small (about 50 to 150 KB each). */
const MAX_WIDTH_PX = 1000;
const JPEG_QUALITY = 0.8;
/** The most text kept from inside the box. */
const MAX_TEXT = 2000;

/** The box between two points, cut to the visible window. */
export function areaBetween(a: { x: number; y: number }, b: { x: number; y: number }): Area {
  const clampX = (x: number) => Math.min(Math.max(x, 0), window.innerWidth);
  const clampY = (y: number) => Math.min(Math.max(y, 0), window.innerHeight);
  const left = clampX(Math.min(a.x, b.x));
  const top = clampY(Math.min(a.y, b.y));
  return { left, top, width: clampX(Math.max(a.x, b.x)) - left, height: clampY(Math.max(a.y, b.y)) - top };
}

export const isBigEnough = (area: Area) => area.width >= MIN_AREA_PX && area.height >= MIN_AREA_PX;

/** Our own UI's shadow root (open, made by WXT's createShadowRootUi). */
const uiRoot = (): ShadowRoot | null => document.querySelector(UI_HOST_TAG)?.shadowRoot ?? null;

let box: HTMLDivElement | null = null;

/**
 * Draws the dashed box while it is dragged, or removes it (null). It goes inside our Shadow DOM, so it is drawn
 * in the top layer with the rest of our UI and styled by toolbar.css (`.fo-area`).
 */
export function showAreaBox(area: Area | null): void {
  if (!area) {
    box?.remove();
    box = null;
    return;
  }
  const root = uiRoot();
  if (!root) return;
  if (!box || !box.isConnected) {
    box = document.createElement('div');
    box.className = 'fo-area';
    root.appendChild(box);
  }
  Object.assign(box.style, { left: `${area.left}px`, top: `${area.top}px`, width: `${area.width}px`, height: `${area.height}px` });
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

/** The page element at a spot, skipping our own UI (which sits above everything). */
export function pageElementAt(x: number, y: number): Element {
  return document.elementsFromPoint(x, y).find((el) => el.tagName !== UI_HOST_TAG.toUpperCase()) ?? document.body;
}

/**
 * Makes our UI see-through, or shows it again, so it is not in the picture. Opacity is set on the shadow root's
 * own children: the host itself cannot be hidden from outside, because WXT gives it `all: initial !important`.
 */
function hideUi(hidden: boolean): void {
  const root = uiRoot();
  if (!root) return;
  for (const el of root.children) {
    if (el instanceof HTMLElement && el.tagName !== 'STYLE') el.style.opacity = hidden ? '0' : '';
  }
}

/** Waits until the browser has drawn the page again, so the hidden UI is really gone from the screen. */
const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 30))));

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read the screenshot'));
    img.src = src;
  });
}

/**
 * A picture of the box, as a JPEG data URL. Our UI, the dashed box and the page's text selection are hidden first.
 * Throws if the browser refuses (some pages, such as the Chrome Web Store, cannot be captured).
 */
export async function captureArea(area: Area): Promise<string> {
  showAreaBox(null);
  window.getSelection()?.removeAllRanges();
  hideUi(true);
  let reply: { ok: boolean; value?: string; error?: string } | undefined;
  try {
    await nextPaint();
    reply = await browser.runtime.sendMessage({ type: 'forest:capture-tab' });
  } finally {
    hideUi(false);
  }
  if (!reply?.ok || !reply.value) throw new Error(reply?.error ?? 'Could not take the screenshot');
  const shot = await loadImage(reply.value);
  // The picture is in device pixels (page zoom and screen density); the box is in CSS pixels.
  const scale = shot.naturalWidth / window.innerWidth;
  const shrink = Math.min(1, MAX_WIDTH_PX / (area.width * scale));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(area.width * scale * shrink));
  canvas.height = Math.max(1, Math.round(area.height * scale * shrink));
  canvas.getContext('2d')?.drawImage(shot, area.left * scale, area.top * scale, area.width * scale, area.height * scale, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

/**
 * Takes the screenshot of the box and saves it as a `media` seed. Its sprite sits where the drag started (`start`,
 * window coordinates), attached (like any marker) to the page element under that spot. The picture is saved in its own record.
 */
export async function plantScreenshot({ forestId, spriteType, area, start, scale }: { forestId: string; spriteType: SpriteType; area: Area; start: { x: number; y: number }; scale?: number }): Promise<Seed> {
  const text = textInArea(area);
  const x = Math.min(Math.max(start.x, 0), window.innerWidth - 1);
  const y = Math.min(Math.max(start.y, 0), window.innerHeight - 1);
  const target = pageElementAt(x, y);
  const image = await captureArea(area);
  const seed = await saveSeed({
    forestId,
    kind: 'media',
    spriteType,
    color: spriteColorKey(spriteType),
    url: pageUrl(), // the PDF's address on our PDF page
    pageTitle: document.title,
    text: text || 'Screenshot',
    anchor: buildMarkerAnchor(x, y, target),
    scale,
  });
  await saveScreenshot(seed.id, image);
  return seed;
}
