import { useEffect, useState } from 'react';
import { getLoadouts, newLoadoutId, updateLoadouts, type Loadout, type LoadoutState } from '@/lib/storage';
import { SPRITE_ORDER, spriteLabel, useThemeId } from '@/lib/theme';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';
import { DEFAULT_LOADOUT, LOADOUT_SIZE, allLoadouts, currentLoadout, hotbarKey } from '@/lib/onpage-ui/hotbar';
import { useStored } from './useStored';

const button = 'rounded-lg border border-edge px-3 py-1.5 text-sm hover:bg-primary-soft disabled:opacity-50';

/**
 * Toolbar loadouts: which sprites the on-page toolbar shows, in which order (the order sets the keys 1 to 9 and 0).
 * The default loadout is fixed; the user makes their own from it, and picks one here or on the toolbar.
 */
export function LoadoutEditor() {
  const state = useStored(getLoadouts, []);
  const themeId = useThemeId();
  const [editingId, setEditingId] = useState<string | null>(null);
  if (!state) return null;

  const save = (patch: Partial<LoadoutState>) => void updateLoadouts(patch);
  const replace = (loadout: Loadout) => save({ custom: state.custom.map((l) => (l.id === loadout.id ? loadout : l)) });
  const editing = state.custom.find((l) => l.id === editingId);

  const create = () => {
    const loadout: Loadout = { id: newLoadoutId(), name: `Loadout ${state.custom.length + 1}`, sprites: [...DEFAULT_LOADOUT.sprites] };
    save({ custom: [...state.custom, loadout], currentId: loadout.id });
    setEditingId(loadout.id);
  };
  const remove = (id: string) => {
    if (!window.confirm('Remove this loadout?')) return;
    save({ custom: state.custom.filter((l) => l.id !== id), currentId: state.currentId === id ? DEFAULT_LOADOUT.id : state.currentId });
    if (editingId === id) setEditingId(null);
  };

  return (
    <section className="space-y-4 rounded-xl border-2 border-edge bg-surface p-5">
      <h2 className="text-lg font-semibold">Toolbar loadouts</h2>
      <p className="text-sm text-ink-muted">
        A loadout is the set of sprites on the toolbar, in order: the first ten get the keys 1 to 9 and 0. Make your own for different kinds of notes, then switch between them here or on the toolbar.
      </p>
      <ul className="space-y-2">
        {allLoadouts(state).map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-alt p-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="loadout" className="accent-primary" checked={currentLoadout(state).id === l.id} onChange={() => save({ currentId: l.id })} />
              <span className="w-32 truncate text-sm font-semibold">{l.name}</span>
            </label>
            <span className="flex min-w-0 flex-1 flex-wrap gap-0.5">
              {l.sprites.map((type) => (
                <SpriteIcon key={type} type={type} size={20} />
              ))}
            </span>
            {l.id !== DEFAULT_LOADOUT.id && (
              <>
                <button className={button} onClick={() => setEditingId(editingId === l.id ? null : l.id)}>{editingId === l.id ? 'Done' : 'Edit'}</button>
                <button className={button} onClick={() => remove(l.id)}>Remove</button>
              </>
            )}
          </li>
        ))}
      </ul>
      <button className={button} onClick={create}>+ New loadout</button>

      {editing && (
        <div className="space-y-3 rounded-lg border border-edge p-3">
          <label className="flex items-center gap-3 text-sm">
            <span className="w-16">Name</span>
            <NameField name={editing.name} onSave={(name) => replace({ ...editing, name })} />
          </label>
          <p className="text-xs text-ink-muted">Click a sprite to add it or take it out. Arrows change its place. At most {LOADOUT_SIZE}.</p>
          <ol className="flex flex-wrap gap-2">
            {editing.sprites.map((type, i) => (
              <li key={type} className="flex items-center gap-1 rounded-lg border border-edge bg-surface-alt px-1 py-0.5 text-xs">
                <span className="text-ink-muted">{hotbarKey(i)}</span>
                <SpriteIcon type={type} size={22} />
                <button title="Move left" disabled={i === 0} className="px-1 disabled:opacity-30" onClick={() => replace({ ...editing, sprites: swap(editing.sprites, i, i - 1) })}>‹</button>
                <button title="Move right" disabled={i === editing.sprites.length - 1} className="px-1 disabled:opacity-30" onClick={() => replace({ ...editing, sprites: swap(editing.sprites, i, i + 1) })}>›</button>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-1">
            {SPRITE_ORDER.map((type) => {
              const inIt = editing.sprites.includes(type);
              const full = !inIt && editing.sprites.length >= LOADOUT_SIZE;
              return (
                <button
                  key={type}
                  type="button"
                  title={spriteLabel(type, themeId)}
                  aria-pressed={inIt}
                  disabled={full}
                  onClick={() => replace({ ...editing, sprites: inIt ? editing.sprites.filter((t) => t !== type) : [...editing.sprites, type] })}
                  className={`rounded-lg border-2 p-1 disabled:opacity-40 ${inIt ? 'border-primary bg-primary-soft' : 'border-transparent hover:bg-primary-soft'}`}
                >
                  <SpriteIcon type={type} size={28} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

/** The loadout's name, saved when the field loses focus (or on Enter), not on every key. */
function NameField({ name, onSave }: { name: string; onSave(name: string): void }) {
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  return (
    <input
      className="min-w-0 flex-1 rounded-lg border border-edge bg-surface-alt px-2 py-1"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const next = draft.trim() || name;
        setDraft(next);
        if (next !== name) onSave(next);
      }}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

/** A copy of `list` with the items at `a` and `b` swapped. */
function swap<T>(list: T[], a: number, b: number): T[] {
  const next = [...list];
  [next[a], next[b]] = [next[b]!, next[a]!];
  return next;
}
