import type { Seed } from '@/lib/storage';
import { getWords, spriteLabel, useThemeId } from '@/lib/theme';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';
import { quizHref } from './route';

/** The name the forest's lily pad quiz is saved under (Quiz.color). Every lily pad has the same color now. */
export const LILYPAD_QUIZ = 'lilypad';

/** All the lily pads in a forest form its quiz (a quiz), in planting order. */
export const quizPads = (seeds: Seed[]) => seeds.filter((s) => s.spriteType === 'lilypad');

/** The "Lily pad quiz" button, shown under the forest's header. */
export function QuizBar({ forestId, seeds }: { forestId: string; seeds: Seed[] }) {
  const count = quizPads(seeds).length;
  const themeId = useThemeId();
  const pad = spriteLabel('lilypad', themeId); // "Lily pad", or the theme's own name for it
  const words = getWords(themeId); // "Lily pad quiz", or just "Quiz" in Minimal

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border-2 border-edge bg-surface px-4 py-3">
      <span className="mr-1 text-sm font-semibold">Quizzes</span>
      {count === 0 ? (
        <span className="text-sm text-ink-muted">Highlight sentences with the {pad.toLowerCase()} on a page to make a quiz.</span>
      ) : (
        <a href={quizHref(forestId, LILYPAD_QUIZ)} title={`Quiz on your ${pad.toLowerCase()}s`} className="flex items-center gap-2 rounded-lg border border-edge px-3 py-1.5 text-sm hover:bg-primary-soft">
          <SpriteIcon type="lilypad" size={22} />
          {words.quizName(pad)} <span className="text-ink-muted">({count})</span>
        </a>
      )}
    </div>
  );
}
