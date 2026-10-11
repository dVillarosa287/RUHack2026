import { useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { Anchor, Seed } from '@/lib/storage';
import { createLineBoil, MarkerTracker, UI_HOST_TAG } from '@/lib/engine';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';

interface MarkerLayerProps {
  seeds: Seed[];
  markerScale: number;
  digging: boolean;
  flashId: string | null;
  onDig(seedId: string): void;
  /** The user dropped a marker somewhere new. `target` is the page element under it. */
  onMove(seedId: string, clientX: number, clientY: number, target: Element): void;
}

const DRAG_DISTANCE_PX = 4;
const MARKER_SIZE = 38;
const HOLD_AFTER_DROP_MS = 1500;

/**
 * Draws the markers. Each one is attached to text or an element on the page, never to a fixed screen spot:
 * on every frame it asks where that text or element is now and moves there. That keeps markers in the
 * right place when the page scrolls, resizes, reflows, or a section opens or closes.
 */
export function MarkerLayer({ seeds, markerScale, digging, flashId, onDig, onMove }: MarkerLayerProps) {
  // Lily pad screenshots (`media`) are drawn as markers too, at the corner of the box they were taken of.
  const markers = useMemo(() => seeds.filter((s) => (s.kind === 'sprite' || s.kind === 'link' || s.kind === 'media') && s.anchor), [seeds]);
  const elements = useRef(new Map<string, HTMLDivElement>());
  const trackers = useRef(new Map<string, { anchor: Anchor; tracker: MarkerTracker }>());
  // A marker being dragged, or just dropped and waiting for its new anchor to arrive from storage.
  const held = useRef<{ id: string; anchor: Anchor | null; until: number } | null>(null);

  useEffect(() => {
    if (markers.length === 0) return;
    let frame = 0;
    const tick = () => {
      for (const seed of markers) {
        const el = elements.current.get(seed.id);
        if (!el || !seed.anchor) continue;
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
        const { x, y } = entry.tracker.position();
        el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        el.style.visibility = 'visible';
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
    // Lily pads stay where their screenshot was taken: they can only be removed with the shovel.
    if (digging || e.button !== 0 || seed.spriteType === 'lilypad') return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = { x: e.clientX, y: e.clientY };
    let moved = false;

    const move = (ev: PointerEvent) => {
      if (!moved) {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < DRAG_DISTANCE_PX) return;
        moved = true;
        held.current = { id: seed.id, anchor: null, until: Infinity };
        el.classList.add('fo-marker-dragging');
      }
      el.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px)`;
    };

    const stop = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', stop, true);
      if (!moved) return;
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
          className={`fo-marker${digging ? ' fo-dig' : ''}${seed.spriteType === 'lilypad' ? ' fo-fixed' : ''}${flashId === seed.id ? ' fo-flash' : ''}`}
          style={{ visibility: 'hidden' }}
          title={seed.linkTarget ? `${seed.text} → ${seed.linkTarget}` : seed.text}
          onPointerDown={(e) => startDrag(seed, e)}
          onClick={digging ? () => onDig(seed.id) : undefined}
        >
          <SpriteIcon
            type={seed.spriteType}
            size={MARKER_SIZE * markerScale}
            color={seed.color}
            grown={seed.growth === 'tree'}
          />
        </div>
      ))}
    </>
  );
}
