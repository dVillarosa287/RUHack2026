import { useEffect, useRef, useState, type RefObject } from 'react';
import { getHighlightRange } from '@/lib/engine';
import type { Seed } from '@/lib/storage';

const GAP_PX = 6;
const EDGE_PX = 8;

/**
 * Keeps a card just under its seed's sprite. The card is never placed from a saved screen spot: on every frame it
 * finds the sprite MarkerLayer drew for the seed (which follows the seed's anchor) and sits next to it. `onShown` runs the first time the card becomes visible.
 * `underText` puts a highlight's card just under its highlighted text instead (the lily pad's group picker).
 */
export function useFollowMarker(card: RefObject<HTMLDivElement | null>, seedId: string, onShown?: () => void, underText = false) {
  const shownOnce = useRef(false);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const el = card.current;
      const root = el?.getRootNode();
      const marker = root instanceof ShadowRoot || root instanceof Document ? root.querySelector<HTMLElement>(`.fo-marker[data-seed-id="${CSS.escape(seedId)}"]`) : null;
      if (el && marker) {
        const spot = marker.getBoundingClientRect();
        const width = el.offsetWidth;
        const height = el.offsetHeight;
        const x = Math.min(Math.max(EDGE_PX, spot.left + spot.width / 2 - width / 2), window.innerWidth - width - EDGE_PX);
        // A highlight's sprite sits on top of its text, so its card goes above the sprite to keep that text readable.
        // Other cards go below. Either flips when it would leave the window.
        const above = spot.top - GAP_PX - height;
        const below = spot.bottom + GAP_PX;
        const onText = marker.classList.contains('fo-on-text');
        let y = onText ? above : below;
        const textBottom = underText && onText ? getHighlightRange(seedId)?.getBoundingClientRect().bottom : undefined;
        if (textBottom !== undefined) y = textBottom + GAP_PX + height > window.innerHeight - EDGE_PX ? above : textBottom + GAP_PX;
        else if (onText && y < EDGE_PX) y = below;
        else if (!onText && y + height > window.innerHeight - EDGE_PX) y = above;
        // x and y are window coordinates; the card is placed in page coordinates (like the markers, see .fo-note in
        // toolbar.css), so it scrolls with its sprite without waiting for the next frame. Only write what changed.
        const transform = `translate(${Math.round(x + window.scrollX)}px, ${Math.round(y + window.scrollY)}px)`;
        if (el.style.transform !== transform) el.style.transform = transform;
        // The sprite is hidden while its text is not on the page; the card hides with it.
        const visible = marker.style.visibility !== 'hidden';
        const visibility = visible ? 'visible' : 'hidden';
        if (el.style.visibility !== visibility) el.style.visibility = visibility;
        if (visible && !shownOnce.current) {
          shownOnce.current = true;
          onShown?.();
        }
      } else if (el) {
        el.style.visibility = 'hidden'; // the new seed has not reached the page yet
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [card, seedId, onShown, underText]);
}

/**
 * The box for typing your own note about a seed, opened right after planting it and when its sprite is clicked.
 * Enter saves (Shift+Enter is a new line), Escape closes without saving. Clicking away saves what was typed,
 * so nothing typed is lost. An empty box saves nothing (and clears a note that was there).
 */
export function NoteEditor({ seed, onSave, onClose }: { seed: Seed; onSave(note: string): void; onClose(): void }) {
  const card = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(seed.note ?? '');
  const latest = useRef(draft);
  latest.current = draft;
  const finished = useRef(false);

  const save = () => {
    if (finished.current) return;
    finished.current = true;
    onSave(latest.current);
    onClose();
  };
  const cancel = () => {
    finished.current = true;
    onClose();
  };

  // Focus once the card is on screen: a hidden box cannot take focus. preventScroll keeps the page still.
  const focus = useRef(() => box.current?.focus({ preventScroll: true })).current;
  useFollowMarker(card, seed.id, focus);

  // Switching to another seed's note (or the seed going away) closes this box without a blur, so save here too.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => () => saveRef.current(), []);

  return (
    <div ref={card} className="fo-note fo-note-edit" style={{ visibility: 'hidden' }}>
      <textarea
        ref={box}
        rows={2}
        placeholder="Add your own note…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          // Keys typed here belong to the box: never to the toolbar's shortcuts or the page.
          e.stopPropagation();
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            save();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        }}
      />
      <div className="fo-note-hint">Enter to save · Esc to skip</div>
    </div>
  );
}

/** The note shown under a sprite while the mouse is over it. It ignores the mouse, so it never gets in the way. */
export function NoteTooltip({ seed }: { seed: Seed }) {
  const card = useRef<HTMLDivElement>(null);
  useFollowMarker(card, seed.id);
  return (
    <div ref={card} className="fo-note fo-note-view" style={{ visibility: 'hidden' }}>
      <div className="fo-note-text">{seed.note}</div>
      <div className="fo-note-hint">Click the sprite to edit</div>
    </div>
  );
}
