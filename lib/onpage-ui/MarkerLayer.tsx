import { useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { Anchor, Seed } from '@/lib/storage';
import { createLineBoil, getHighlightRange, MarkerTracker, UI_HOST_TAG } from '@/lib/engine';
import { spriteTakesNote } from '@/lib/theme';
import { CameraIcon } from '@/lib/theme/CameraIcon';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';

interface MarkerLayerProps {
  seeds: Seed[];
  digging: boolean;
  flashId: string | null;
  onDig(seedId: string): void;
  /** The user dropped a marker somewhere new. `target` is the page element under it. */
  onMove(seedId: string, clientX: number, clientY: number, target: Element): void;
  /** The mouse went onto a sprite (its id) or off it (null). Used to show the seed's note. */
  onHover(seedId: string | null): void;
  /** The user clicked a sprite that can carry a note (not the lily pad or the apple), to write or edit it. */
  onEditNote(seedId: string): void;
  /** The user clicked a lily pad, to choose its group. */
  onPickPadGroup(seedId: string): void;
}

const DRAG_DISTANCE_PX = 4;
const MARKER_SIZE = 38;
const HOLD_AFTER_DROP_MS = 1500;

/**
 * Where a highlight's sprite goes: the middle of the highlighted text, its base resting a little into the top of
 * the highlight (the marker's CSS puts the sprite above the spot), so it does not cover the line above. A highlight on one line uses that line; one over several lines uses their box.
 */
function aboveHighlight(seedId: string): { x: number; y: number } | null {
  const range = getHighlightRange(seedId);
  if (!range) return null;
  const lines = range.getClientRects();
  const box = lines.length === 1 ? lines[0] : range.getBoundingClientRect();
  if (!box || (box.width === 0 && box.height === 0)) return null;
  return { x: box.left + box.width / 2, y: box.top + Math.min(10, box.height / 2) };
}

/** The browser's plain tip for a sprite without a note: what it is attached to, and how to add a note. */
function titleFor(seed: Seed, digging: boolean): string {
  const base = seed.linkTarget ? `${seed.text} → ${seed.linkTarget}` : seed.text;
  if (!digging && seed.spriteType === 'lilypad') return `${base}\n(Click to choose its group)`.trim();
  return !digging && spriteTakesNote(seed.spriteType) ? `${base}\n(Click to add a note)`.trim() : base;
}

/**
 * Draws the markers. Each one is attached to text or an element on the page, never to a fixed screen spot:
 * on every frame it asks where that text or element is now and moves there. That keeps markers in the
 * right place when the page resizes, reflows, or a section opens or closes. Scrolling the page needs no work at all:
 * markers sit in page coordinates, so the browser scrolls them with the text.
 */
export function MarkerLayer({ seeds, digging, flashId, onDig, onMove, onHover, onEditNote, onPickPadGroup }: MarkerLayerProps) {
  // Highlights get their sprite too, centered above the highlighted text.
  const markers = useMemo(() => seeds.filter((s) => (s.kind === 'sprite' || s.kind === 'link' || s.kind === 'highlight' || s.kind === 'media') && s.anchor), [seeds]);
  const elements = useRef(new Map<string, HTMLDivElement>());
  const trackers = useRef(new Map<string, { anchor: Anchor; tracker: MarkerTracker }>());
  // A marker being dragged, or just dropped and waiting for its new anchor to arrive from storage.
  const held = useRef<{ id: string; anchor: Anchor | null; until: number } | null>(null);
  // Set when a drag ends, so the click that follows it does not also open the note box.
  const justDragged = useRef(false);

  useEffect(() => {
    if (markers.length === 0) return;
    let frame = 0;
    const tick = () => {
      // Markers are placed in page coordinates (see .fo-marker in toolbar.css): the window position plus how far the
      // page is scrolled. The browser then scrolls them together with the text by itself, in the same frame. Placing
      // them in window coordinates made them trail behind: the browser scrolls the page at once, but a script can only
      // move a marker afterwards. So while the page just scrolls, these numbers stay the same and nothing is written;
      // they change only when the page's layout does (resize, reflow, a section opening) or text inside a scrolling box moves.
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      // First read every position, then write them all. Reading after a write makes the browser redo the page's
      // layout each time, which on a long page is slow.
      const moves: Array<{ el: HTMLDivElement; spot: { x: number; y: number } | null }> = [];
      for (const seed of markers) {
        const el = elements.current.get(seed.id);
        if (!el || !seed.anchor) continue;
        if (seed.kind === 'highlight') {
          moves.push({ el, spot: aboveHighlight(seed.id) }); // null: its text is not on the page (yet)
          continue;
        }
        if (held.current?.id === seed.id) {
          const dropped = held.current.anchor !== null;
          if (!dropped || (seed.anchor === held.current.anchor && performance.now() < held.current.until)) continue;
          held.current = null;
        }
        let entry = trackers.current.get(seed.id);
        if (!entry || entry.anchor !== seed.anchor) {
          entry = { anchor: seed.anchor, tracker: new MarkerTracker(seed.anchor) };
          trackers.current.set(seed.id, entry);
        }
        moves.push({ el, spot: entry.tracker.position() });
      }
      for (const { el, spot } of moves) {
        const visibility = spot ? 'visible' : 'hidden';
        // Only write what changed: an unchanged style costs nothing, so a page that is only scrolling stays cheap.
        if (el.style.visibility !== visibility) el.style.visibility = visibility;
        if (!spot) continue;
        const transform = `translate(${Math.round(spot.x + scrollX)}px, ${Math.round(spot.y + scrollY)}px)`;
        if (el.style.transform !== transform) el.style.transform = transform;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [markers]);

  useEffect(() => {
    const firstMarker = elements.current.values().next().value;
    if (!firstMarker) return;
    const root = firstMarker.getRootNode();
    if (!(root instanceof Document || root instanceof ShadowRoot)) return;
    return createLineBoil(elements.current.values(), root);
  }, [markers]);

  const startDrag = (seed: Seed, e: ReactPointerEvent<HTMLDivElement>) => {
    // A highlight's sprite belongs to its text, so it cannot be dragged away (the shovel still removes it).
    if (digging || e.button !== 0 || seed.kind === 'highlight') return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = { x: e.clientX, y: e.clientY };
    let moved = false;

    const move = (ev: PointerEvent) => {
      if (!moved) {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < DRAG_DISTANCE_PX) return;
        moved = true;
        justDragged.current = true;
        held.current = { id: seed.id, anchor: null, until: Infinity };
        el.classList.add('fo-marker-dragging');
      }
      // Under the mouse, in page coordinates like every marker.
      el.style.transform = `translate(${ev.clientX + window.scrollX}px, ${ev.clientY + window.scrollY}px)`;
    };

    const stop = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', stop, true);
      if (!moved) return;
      window.setTimeout(() => (justDragged.current = false), 0);
      // While dragged the marker ignores the mouse, so the page under it can be hit-tested. The class is only
      // removed after onMove has built the new anchor from that hit test, or the marker would find itself.
      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      if (!target || target.tagName === UI_HOST_TAG.toUpperCase()) {
        held.current = null; // dropped on the toolbar or nothing: snap back
      } else {
        held.current = { id: seed.id, anchor: seed.anchor, until: performance.now() + HOLD_AFTER_DROP_MS };
        onMove(seed.id, ev.clientX, ev.clientY, target);
      }
      el.classList.remove('fo-marker-dragging');
    };

    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', stop, true);
  };

  return (
    <>
      {markers.map((seed) => (
        <div
          key={seed.id}
          ref={(el) => {
            if (el) elements.current.set(seed.id, el);
            else elements.current.delete(seed.id);
          }}
          data-seed-id={seed.id}
          className={`fo-marker${digging ? ' fo-dig' : ''}${seed.kind === 'highlight' ? ' fo-on-text' : ''}${flashId === seed.id ? ' fo-flash' : ''}${!digging && (spriteTakesNote(seed.spriteType) || seed.spriteType === 'lilypad') ? ' fo-has-note-box' : ''}`}
          style={{ visibility: 'hidden' }}
          // A seed with a note shows it in a card on hover (App.tsx) instead of this plain browser tip.
          title={seed.note || seed.kind === 'media' ? undefined : titleFor(seed, digging)}
          onPointerDown={(e) => startDrag(seed, e)}
          onPointerEnter={() => onHover(seed.id)}
          onPointerLeave={() => onHover(null)}
          onClick={() => {
            if (digging) return onDig(seed.id);
            if (justDragged.current) return;
            if (seed.spriteType === 'lilypad') onPickPadGroup(seed.id);
            else if (spriteTakesNote(seed.spriteType)) onEditNote(seed.id);
          }}
        >
          <SpriteIcon
            type={seed.spriteType}
            size={MARKER_SIZE * (seed.scale ?? 1)} // each sprite keeps the size it was planted at
            grown={seed.growth === 'tree'}
          />
          {/* Taken with the camera: hovering shows the screenshot (SeedNote.tsx). */}
          {seed.kind === 'media' && (
            <span className="fo-marker-camera" aria-hidden="true">
              <CameraIcon size={14} />
            </span>
          )}
        </div>
      ))}
    </>
  );
}
