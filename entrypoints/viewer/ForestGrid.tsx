import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { createForest, deleteForest, getForests, getSeedsForForest, updateForest, type Forest } from '@/lib/storage';
import { FOREST_ICONS, countOf, useWords } from '@/lib/theme';
import { ForestIcon } from '@/lib/theme/SpriteIcon';
import { LoadBackupButton } from './ForestBackup';
import { forestHref } from './route';
import { useStored } from './useStored';

const TILE_W = 150;
const TILE_H = 150;
const GAP = 16;

interface Point {
  x: number;
  y: number;
}

/** Spot number `i` in a tidy grid with `cols` columns. */
function gridSpot(i: number, cols: number): Point {
  return { x: (i % cols) * (TILE_W + GAP), y: Math.floor(i / cols) * (TILE_H + GAP) };
}

const overlaps = (a: Point, b: Point) => Math.abs(a.x - b.x) < TILE_W && Math.abs(a.y - b.y) < TILE_H;

/**
 * Where each forest's tile goes. A forest the user has dragged keeps its saved spot (Forest.x, Forest.y).
 * The others fill the first free spots of a tidy grid, skipping any spot a dragged forest is sitting on.
 */
function arrange(forests: Forest[], cols: number): Map<string, Point> {
  const spots = new Map<string, Point>();
  const dragged = forests.filter((f) => f.x != null && f.y != null).map((f) => ({ x: f.x!, y: f.y! }));
  let slot = 0;
  for (const forest of forests) {
    if (forest.x != null && forest.y != null) {
      spots.set(forest.id, { x: forest.x, y: forest.y });
      continue;
    }
    while (dragged.some((d) => overlaps(d, gridSpot(slot, cols)))) slot++;
    spots.set(forest.id, gridSpot(slot, cols));
    slot++;
  }
  return spots;
}

const open = (forest: Forest) => (window.location.hash = forestHref(forest.id));

/** All forests, like icons in a Finder window: drag them around, click to choose, double-click to open. */
export function ForestGrid() {
  const words = useWords(); // "forests" or "folders", by theme
  const forests = useStored(async () => {
    const all = await getForests();
    return Promise.all(all.map(async (forest) => ({ forest, seedCount: (await getSeedsForForest(forest.id)).length })));
  }, []);

  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The tile being dragged: where it started, where the pointer started, and where it is now.
  const [drag, setDrag] = useState<{ id: string; from: Point; pointer: Point; now: Point } | null>(null);
  const [dropped, setDropped] = useState<Record<string, Point>>({});
  const [newName, setNewName] = useState<string | null>(null); // the "+ New forest" form: null while it is shut

  // Follow the box's width, so tiles stay inside it. The box only exists once the forests have loaded.
  const loaded = forests !== undefined;
  useEffect(() => {
    if (!box.current) return;
    const observer = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width));
    observer.observe(box.current);
    return () => observer.disconnect();
  }, [loaded]);

  if (!forests) return <p>Loading…</p>;

  const cols = Math.max(1, Math.floor((width + GAP) / (TILE_W + GAP)));
  const spots = arrange(forests.map((f) => f.forest), cols);
  const clampX = (x: number) => Math.min(Math.max(0, x), Math.max(0, width - TILE_W));
  const spotOf = (id: string): Point => {
    if (drag?.id === id) return drag.now;
    const spot = dropped[id] ?? spots.get(id) ?? { x: 0, y: 0 };
    return { x: clampX(spot.x), y: spot.y };
  };
  const height = Math.max(TILE_H, ...forests.map(({ forest }) => spotOf(forest.id).y + TILE_H));
  const selectedEntry = forests.find((f) => f.forest.id === selectedId);
  const selected = selectedEntry?.forest;

  // Deletes the forest and everything in it (deleteForest). The grid reloads by itself through useStored.
  async function remove(forest: Forest, seedCount: number) {
    if (!window.confirm(`Delete the ${words.forest} "${forest.name}" and its ${countOf(seedCount, words.seed, words.seeds)}? This cannot be undone.`)) return;
    await deleteForest(forest.id);
    setSelectedId(null);
  }

  // Same icon choice as the toolbar's new forest (lib/onpage-ui/App.tsx). The current forest is left as it is.
  async function create() {
    const name = newName?.trim();
    if (!name || !forests) return;
    const forest = await createForest({ name, icon: FOREST_ICONS[forests.length % FOREST_ICONS.length] ?? 'tree' });
    setNewName(null);
    setSelectedId(forest.id);
  }

  function onPointerDown(e: PointerEvent, forest: Forest) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId); // keep getting moves even if the pointer leaves the tile
    const from = spotOf(forest.id);
    setDrag({ id: forest.id, from, pointer: { x: e.clientX, y: e.clientY }, now: from });
    setSelectedId(forest.id);
  }

  function onPointerMove(e: PointerEvent) {
    if (!drag) return;
    const now = { x: clampX(drag.from.x + e.clientX - drag.pointer.x), y: Math.max(0, drag.from.y + e.clientY - drag.pointer.y) };
    setDrag({ ...drag, now });
  }

  // Save the spot only if the tile really moved; a plain click just selects it.
  function onPointerUp() {
    if (!drag) return;
    const moved = Math.abs(drag.now.x - drag.from.x) + Math.abs(drag.now.y - drag.from.y) > 4;
    if (moved) {
      const spot = { x: Math.round(drag.now.x), y: Math.round(drag.now.y) };
      setDropped({ ...dropped, [drag.id]: spot }); // shown at once, before storage has reloaded
      void updateForest(drag.id, spot);
    }
    setDrag(null);
  }

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Your {words.forests}</h1>
      <div className="rounded-xl border-2 border-edge bg-surface-alt p-4" onClick={(e) => e.target === e.currentTarget && setSelectedId(null)}>
        <div ref={box} className="relative" style={{ height }} onClick={(e) => e.target === e.currentTarget && setSelectedId(null)}>
          {forests.map(({ forest, seedCount }) => {
            const spot = spotOf(forest.id);
            const isSelected = forest.id === selectedId;
            return (
              <div
                key={forest.id}
                role="button"
                tabIndex={0}
                title="Double-click to open"
                onPointerDown={(e) => onPointerDown(e, forest)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onDoubleClick={() => open(forest)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') open(forest);
                  if (e.key === 'Delete' || e.key === 'Backspace') void remove(forest, seedCount);
                }}
                className={`absolute flex touch-none select-none flex-col items-center rounded-xl border-2 p-3 text-center ${isSelected ? 'border-primary bg-primary-soft' : 'border-edge/40 bg-surface hover:border-primary'} ${drag?.id === forest.id ? 'z-10 cursor-grabbing shadow-lg shadow-drop' : 'cursor-grab shadow-sm shadow-drop'}`}
                style={{ left: spot.x, top: spot.y, width: TILE_W, height: TILE_H }}
              >
                <ForestIcon icon={forest.icon} size={72} />
                <span className="mt-2 w-full truncate font-semibold">{forest.name}</span>
                <span className="text-sm text-ink-muted">{countOf(seedCount, words.seed, words.seeds)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {newName === null ? (
          <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-ink hover:bg-primary-strong" onClick={() => setNewName('')}>
            + New {words.forest}
          </button>
        ) : (
          <>
            <input
              autoFocus
              className="rounded-lg border border-edge bg-surface-alt px-2 py-1.5 text-sm"
              placeholder={`Name your ${words.forest}`}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void create();
                if (e.key === 'Escape') setNewName(null);
              }}
            />
            <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-ink hover:bg-primary-strong" onClick={() => void create()}>Create</button>
            <button className="rounded-lg border border-edge px-3 py-1.5 text-sm hover:bg-primary-soft" onClick={() => setNewName(null)}>Cancel</button>
          </>
        )}
        <LoadBackupButton />
      </div>

      {selected && selectedEntry ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border-2 border-edge bg-surface p-3">
          <span className="font-semibold">{selected.name}</span>
          <span className="text-sm text-ink-muted">Icon:</span>
          <div className="flex gap-1">
            {FOREST_ICONS.map((icon) => (
              <button
                key={icon}
                title={icon}
                aria-pressed={selected.icon === icon}
                onClick={() => void updateForest(selected.id, { icon })}
                className={`rounded-lg border-2 p-1 ${selected.icon === icon ? 'border-primary bg-primary-soft' : 'border-transparent hover:bg-primary-soft'}`}
              >
                <ForestIcon icon={icon} size={32} />
              </button>
            ))}
          </div>
          <button className="ml-auto rounded-lg border border-edge px-3 py-1.5 text-sm hover:bg-danger-soft" onClick={() => void remove(selected, selectedEntry.seedCount)}>Delete</button>
          <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-ink hover:bg-primary-strong" onClick={() => open(selected)}>Open</button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-muted">
          Drag {words.forests} to arrange them. Click one to choose its icon or delete it, double-click to open it. Make a new {words.forest} with the button above, or from the toolbar on any web page.
        </p>
      )}
    </>
  );
}
