import { useEffect, useRef, useState } from 'react';
import { addRoot, deleteRoot, getRoots, getSeedsForForest, onDataChanged, padGroups, type Root, type Seed } from '@/lib/storage';
import { spriteLabel, useThemeId } from '@/lib/theme';
import { useFollowMarker } from './SeedNote';

/** A short name for a lily pad: the start of its highlighted text. */
const padName = (pad: Seed) => (pad.text.length > 36 ? `${pad.text.slice(0, 34).trim()}…` : pad.text) || 'Untitled';

/**
 * Opens when a lily pad is clicked on the page, just under its highlighted text: which group the pad belongs to.
 * A group is the lily pads joined by roots (lib/storage/padGroups.ts), so joining one adds a root to a pad in it, and
 * "On its own" removes this pad's roots to other lily pads. Groups can then be quizzed on their own (viewer).
 */
export function PadGroupPicker({ seed, onClose }: { seed: Seed; onClose(): void }) {
  const card = useRef<HTMLDivElement>(null);
  const pad = spriteLabel('lilypad', useThemeId()).toLowerCase(); // "lily pad", or the theme's own name for it
  const [data, setData] = useState<{ seeds: Seed[]; roots: Root[] } | null>(null);
  useFollowMarker(card, seed.id, undefined, true);

  useEffect(() => {
    const load = async () => setData({ seeds: await getSeedsForForest(seed.forestId), roots: await getRoots(seed.forestId) });
    void load();
    return onDataChanged(() => void load());
  }, [seed.forestId]);

  // Esc or a click anywhere else closes it. composedPath() sees inside our Shadow DOM.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: PointerEvent) => card.current && !e.composedPath().includes(card.current) && onClose();
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [onClose]);

  const groups = data ? padGroups(data.seeds, data.roots) : [];
  const mine = groups.find((g) => g.pads.some((p) => p.id === seed.id));
  const grouped = new Set(groups.flatMap((g) => g.pads.map((p) => p.id)));
  const loners = (data?.seeds ?? []).filter((s) => s.spriteType === 'lilypad' && s.id !== seed.id && !grouped.has(s.id));

  /** Leaves its group (removes its roots to other lily pads), then joins the pad `toId`'s group, if given. */
  const join = async (toId: string | null) => {
    if (!data) return;
    const padIds = new Set(data.seeds.filter((s) => s.spriteType === 'lilypad').map((s) => s.id));
    const touching = data.roots.filter((r) => (r.fromSeedId === seed.id && padIds.has(r.toSeedId)) || (r.toSeedId === seed.id && padIds.has(r.fromSeedId)));
    await Promise.all(touching.map((r) => deleteRoot(r.id)));
    if (toId) await addRoot({ forestId: seed.forestId, fromSeedId: seed.id, toSeedId: toId, source: 'manual', reason: `Same ${pad} group` });
    onClose();
  };

  const option = (key: string, label: string, chosen: boolean, onPick: () => void) => (
    <button key={key} className="fo-group-option" aria-pressed={chosen} onClick={() => void onPick()}>
      <span className="fo-picker-name">{label}</span>
      {chosen && <span className="fo-picker-check" aria-hidden="true">✓</span>}
    </button>
  );

  return (
    <div ref={card} className="fo-note fo-note-edit" style={{ visibility: 'hidden' }}>
      <div className="fo-group-title">Which group is this {pad} in?</div>
      <div className="fo-group-list">
        {option('none', 'On its own', !mine, () => join(null))}
        {groups.map((g) => {
          const isMine = g === mine;
          const other = g.pads.find((p) => p.id !== seed.id)!;
          return option(g.id, `Group: ${padName(g.pads[0]!)} (${g.pads.length})`, isMine, () => (isMine ? onClose() : join(other.id)));
        })}
        {loners.map((p) => option(p.id, `New group with: ${padName(p)}`, false, () => join(p.id)))}
      </div>
      <div className="fo-note-hint">Grouped {pad}s can be quizzed together · Esc to close</div>
    </div>
  );
}
