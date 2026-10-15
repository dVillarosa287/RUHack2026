import { useState } from 'react';
import { deleteQuiz, renameQuiz, updateQuiz, type Quiz } from '@/lib/storage';
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
export function QuizGrid({ forestId, color, quizzes }: { forestId: string; color: string; quizzes: Quiz[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null); // the name being typed, or null when not renaming
  const selected = quizzes.find((f) => f.id === selectedId);
  const play = (quiz: Quiz) => (window.location.hash = playQuizHref(forestId, color, quiz.id));

  const save = async () => {
    if (selected && draft?.trim()) await renameQuiz(selected.id, draft); // an empty name keeps the old one
    setDraft(null);
  };

  // Removes the quiz for good after asking. The grid reloads by itself (the parent reads the quizzes with useStored).
  const remove = async (quiz: Quiz) => {
    if (!window.confirm(`Delete "${quiz.name ?? 'this quiz'}"? This cannot be undone.`)) return;
    await deleteQuiz(quiz.id);
    setSelectedId(null);
  };

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 rounded-xl border-2 border-edge bg-surface-alt p-4">
        <a href={newQuizHref(forestId, color)} className={`${tile} border-edge/40 bg-surface font-semibold hover:border-primary`}>
          + New quiz
        </a>
        {[...quizzes].reverse().map((quiz) => (
          <div
            key={quiz.id}
            role="button"
            tabIndex={0}
            title="Double-click to play"
            onClick={() => {
              setSelectedId(quiz.id);
              setDraft(null);
            }}
            onDoubleClick={() => play(quiz)}
            onKeyDown={(e) => e.key === 'Enter' && play(quiz)}
            className={`${tile} cursor-pointer ${quiz.id === selectedId ? 'border-primary bg-primary-soft' : 'border-edge/40 bg-surface hover:border-primary'}`}
          >
            <ForestIcon icon={quiz.icon ?? DEFAULT_ICON} size={72} />
            <span className="mt-2 w-full truncate font-semibold">{quiz.name}</span>
            <span className="text-sm text-ink-muted">{countOf(quiz.questions.length, 'question', 'questions')}</span>
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
                onClick={() => void updateQuiz(selected.id, { icon })}
                className={`rounded-lg border-2 p-1 ${(selected.icon ?? DEFAULT_ICON) === icon ? 'border-primary bg-primary-soft' : 'border-transparent hover:bg-primary-soft'}`}
              >
                <ForestIcon icon={icon} size={32} />
              </button>
            ))}
          </div>
          <button className={`ml-auto ${button} hover:bg-danger-soft`} onClick={() => void remove(selected)}>Delete</button>
          <button className={mainButton} onClick={() => play(selected)}>Play</button>
        </div>
      ) : (
        quizzes.length > 0 && <p className="mt-4 text-sm text-ink-muted">Click a quiz to choose its icon, rename it or delete it, double-click to play it.</p>
      )}
    </>
  );
}
