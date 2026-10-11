import { artUrl, useWords } from '@/lib/theme';
import './quiz.css';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';

const FROG_SITTING = artUrl('frogsit.png');
const FROG_JUMPING = artUrl('frogjump.png');

interface PondProps {
  /** How many lily pads (one per question). */
  count: number;
  color: string;
  /** The pad the frog is on. */
  at: number;
  /** For each answered question, whether it was right. */
  results: (boolean | undefined)[];
}

/**
 * The lily pads in a row, and the frog on the current one. When `at` changes the frog slides to the next pad, and
 * the `key` on it restarts the hop animation (quiz.css), so it jumps up and lands while it slides.
 */
export function Pond({ count, color, at, results }: PondProps) {
  const spot = (i: number) => `${((i + 0.5) / count) * 100}%`;
  const { frogAlt } = useWords(); // "The frog", or a plain description in Minimal
  return (
    <div className="fo-pond relative mb-6 h-36 rounded-xl border-2 border-edge bg-surface-alt">
      <div className="absolute inset-x-0 bottom-4 flex">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <SpriteIcon type="lilypad" size={i === at ? 60 : 48} />
            <span className="h-4 text-xs font-bold">{results[i] === true ? '✓' : results[i] === false ? '✗' : ''}</span>
          </div>
        ))}
      </div>
      <div className="fo-frog-slot" style={{ left: spot(at) }}>
        <div key={at} className={`fo-frog${at === 0 ? ' fo-still' : ''}`}>
          {FROG_SITTING ? (
            <>
              <img className="fo-frog-sit" src={FROG_SITTING} alt={frogAlt} width={64} height={64} />
              {FROG_JUMPING && <img className="fo-frog-jump" src={FROG_JUMPING} alt="" width={64} height={64} />}
            </>
          ) : (
            <span className="block h-12 w-12 rounded-full bg-primary" aria-label={frogAlt} />
          )}
        </div>
      </div>
    </div>
  );
}
