import type { Seed } from '@/lib/storage';
import { COLORS } from '@/lib/theme';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';
import { quizHref } from './route';

/** The lily pads of one color in a forest form one quiz (a fruit). Pads without enough text cannot be asked about. */
export const quizPads = (seeds: Seed[], color: string) => seeds.filter((s) => s.spriteType === 'lilypad' && s.color === color);

/** One "Quiz" button for every color that has lily pads in this forest. Shown under the forest's header. */
export function QuizBar({ forestId, seeds }: { forestId: string; seeds: Seed[] }) {
  const colors = COLORS.map((c) => ({ ...c, count: quizPads(seeds, c.id).length })).filter((c) => c.count > 0);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border-2 border-edge bg-surface px-4 py-3">
      <span className="mr-1 text-sm font-semibold">Quizzes</span>
      {colors.length === 0 && <span className="text-sm text-ink-muted">Plant lily pads on a page to make a quiz. Lily pads of one color become one quiz.</span>}
      {colors.map((c) => (
        <a key={c.id} href={quizHref(forestId, c.id)} title={`Quiz on your ${c.name.toLowerCase()} lily pads`} className="flex items-center gap-2 rounded-lg border border-edge px-3 py-1.5 text-sm hover:bg-primary-soft">
          <SpriteIcon type="lilypad" size={22} color={c.id} />
          {c.name} <span className="text-ink-muted">({c.count})</span>
        </a>
      ))}
    </div>
  );
}
