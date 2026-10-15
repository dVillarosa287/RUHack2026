import { useState } from 'react';
import { renameFruit, updateFruit, type Fruit } from '@/lib/storage';
import { FOREST_ICONS, countOf } from '@/lib/theme';
import { ForestIcon } from '@/lib/theme/SpriteIcon';
import { newQuizHref, playQuizHref } from './route';

const button = 'rounded-lg border border-edge px-3 py-1.5 text-sm hover:bg-primary-soft disabled:opacity-50';
const mainButton = 'rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-ink hover:bg-primary-strong';
/** The same tile look as the forests grid (ForestGrid.tsx), without dragging. */
const tile = 'flex h-[150px] select-none flex-col items-center justify-center rounded-xl border-2 p-3 text-center shadow-sm shadow-drop';
const DEFAULT_ICON = FOREST_ICONS[0] ?? 'tree';

/**
 * The saved quizzes of one forest as tiles, newest first, after a "+ New quiz" tile. Click a tile to choose it: the
 * bar below changes its icon or name and plays it. Double-click a tile to play it straight away.
 */
export function QuizGrid({ forestId, color, fruits }: { forestId: string; color: string; fruits: Fruit[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null); // the name being typed, or null when not renaming
  const selected = fruits.find((f) => f.id === selectedId);
  const play = (fruit: Fruit) => (window.location.hash = playQuizHref(forestId, color, fruit.id));

  const save = async () => {
    if (selected && draft?.trim()) await renameFruit(selected.id, draft); // an empty name keeps the old one
    setDraft(null);
  };

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 rounded-xl border-2 border-edge bg-surface-alt p-4">
        <a href={newQuizHref(forestId, color)} className={`${tile} border-edge/40 bg-surface font-semibold hover:border-primary`}>
          + New quiz
        </a>
        {[...fruits].reverse().map((fruit) => (
          <div
            key={fruit.id}
            role="button"
            tabIndex={0}
            title="Double-click to play"
            onClick={() => {
              setSelectedId(fruit.id);
              setDraft(null);
            }}
            onDoubleClick={() => play(fruit)}
            onKeyDown={(e) => e.key === 'Enter' && play(fruit)}
            className={`${tile} cursor-pointer ${fruit.id === selectedId ? 'border-primary bg-primary-soft' : 'border-edge/40 bg-surface hover:border-primary'}`}
          >
            <ForestIcon icon={fruit.icon ?? DEFAULT_ICON} size={72} />
            <span className="mt-2 w-full truncate font-semibold">{fruit.name}</span>
            <span className="text-sm text-ink-muted">{countOf(fruit.questions.length, 'question', 'questions')}</span>
          </div>
        ))}
      </div>

      {selected ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border-2 border-edge bg-surface p-3">
          {draft === null ? (
            <>
              <span className="font-semibold">{selected.name}</span>
              <button className={button} onClick={() => setDraft(selected.name ?? '')}>Rename</button>
            </>
          ) : (
            <>
              <input
                autoFocus
                className="min-w-0 rounded-lg border border-edge bg-surface-alt px-2 py-1.5 text-sm"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void save();
                  if (e.key === 'Escape') setDraft(null);
                }}
              />
              <button className={button} onClick={() => void save()}>Save</button>
              <button className={button} onClick={() => setDraft(null)}>Cancel</button>
            </>
          )}
          <span className="text-sm text-ink-muted">Icon:</span>
          <div className="flex gap-1">
            {FOREST_ICONS.map((icon) => (
              <button
                key={icon}
                title={icon}
                aria-pressed={(selected.icon ?? DEFAULT_ICON) === icon}
                onClick={() => void updateFruit(selected.id, { icon })}
                className={`rounded-lg border-2 p-1 ${(selected.icon ?? DEFAULT_ICON) === icon ? 'border-primary bg-primary-soft' : 'border-transparent hover:bg-primary-soft'}`}
              >
                <ForestIcon icon={icon} size={32} />
              </button>
            ))}
          </div>
          <button className={`ml-auto ${mainButton}`} onClick={() => play(selected)}>Play</button>
        </div>
      ) : (
        fruits.length > 0 && <p className="mt-4 text-sm text-ink-muted">Click a quiz to choose its icon or rename it, double-click to play it.</p>
      )}
    </>
  );
}
