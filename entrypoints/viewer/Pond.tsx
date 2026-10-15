import { useEffect, useRef, useState } from 'react';
import { artUrl, useWords } from '@/lib/theme';
import './quiz.css';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';

const FROG_SITTING = artUrl('frogsit.png');
const FROG_JUMPING = artUrl('frogjump.png');
/** The narrowest a pad's space gets, in px: past that, many questions scroll instead of squashing. */
const MIN_PAD_W = 72;
/** The widest a pad's space gets, so a short quiz is spread out but its pads still look like one row. */
const MAX_PAD_W = 200;
/** How much of the pond's width a short quiz's row may use, so its pads never sit at the very edges. */
const ROW_SHARE = 0.7;

interface PondProps {
  /** How many lily pads (one per question). */
  count: number;
  color: string;
  /** The pad the frog is on. */
  at: number;
  /** For each answered question, whether it was right. */
  results: (boolean | undefined)[];
  /** The furthest question reached (the number answered, at most count - 1). Earlier pads can be picked. */
  furthest?: number;
  /** Called with a pad's index when the user picks an earlier pad. */
  onPick?(i: number): void;
}

const smooth = (): ScrollBehavior => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

/**
 * The lily pads in a row, and the frog on the current one. When `at` changes the frog slides to that pad, and
 * the `key` on it restarts the hop animation (quiz.css), so it jumps up and lands while it slides. With many pads the
 * row scrolls inside the box (‹ › buttons, or the mouse), and it follows the frog.
 */
export function Pond({ count, color, at, results, furthest = 0, onPick }: PondProps) {
  const { frogAlt } = useWords(); // "The frog", or a plain description in Minimal
  const scroller = useRef<HTMLDivElement>(null);
  const pads = useRef<(HTMLElement | null)[]>([]);
  // Only the very first pad on the first load has no hop; going back to it later hops like any other move.
  const firstLoad = useRef(true);
  const [overflowing, setOverflowing] = useState(false);
  const [pondWidth, setPondWidth] = useState(0);
  // Few questions: the pads spread out over most of the pond. Many: each gets MIN_PAD_W and the row scrolls.
  const PAD_W = Math.round(Math.min(MAX_PAD_W, Math.max(MIN_PAD_W, (pondWidth * ROW_SHARE) / Math.max(1, count))));

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setPondWidth(el.clientWidth);
      setOverflowing(el.scrollWidth > el.clientWidth + 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [count, PAD_W]);

  useEffect(() => {
    if (at !== 0) firstLoad.current = false;
    if (overflowing) pads.current[at]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: smooth() });
  }, [at, overflowing]);

  const scrollBy = (direction: number) => scroller.current?.scrollBy({ left: direction * (scroller.current.clientWidth - PAD_W), behavior: smooth() });
  const arrow = 'absolute top-1/2 z-10 -translate-y-1/2 rounded-full border border-edge bg-surface px-2 text-lg leading-6 hover:bg-primary-soft';

  return (
    <div className="fo-pond relative mb-6 h-44 rounded-xl border-2 border-edge bg-surface-alt">
      <div ref={scroller} className="fo-pond-scroll absolute inset-0">
        <div className="relative mx-auto h-full" style={{ width: count * PAD_W }}>
          <div className="absolute inset-x-0 bottom-4 flex">
            {Array.from({ length: count }, (_, i) => {
              const canPick = onPick && i < furthest && i !== at;
              const inside = (
                <>
                  <SpriteIcon type="lilypad" size={i === at ? 60 : 48} />
                  <span className="h-4 text-xs font-bold">{results[i] === true ? '✓' : results[i] === false ? '✗' : ''}</span>
                </>
              );
              return canPick ? (
                <button
                  key={i}
                  ref={(el) => void (pads.current[i] = el)}
                  aria-label={`Go back to question ${i + 1}`}
                  onClick={() => onPick(i)}
                  className="flex shrink-0 cursor-pointer flex-col items-center gap-1 rounded-lg hover:ring-2 hover:ring-primary"
                  style={{ width: PAD_W }}
                >
                  {inside}
                </button>
              ) : (
                <div key={i} ref={(el) => void (pads.current[i] = el)} className="flex shrink-0 flex-col items-center gap-1" style={{ width: PAD_W }}>
                  {inside}
                </div>
              );
            })}
          </div>
          <div className="fo-frog-slot" style={{ left: at * PAD_W + PAD_W / 2 }}>
            <div key={at} className={`fo-frog${at === 0 && firstLoad.current ? ' fo-still' : ''}`}>
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
      </div>
      {overflowing && (
        <>
          <button className={`${arrow} left-1`} aria-label="Scroll the pads left" onClick={() => scrollBy(-1)}>‹</button>
          <button className={`${arrow} right-1`} aria-label="Scroll the pads right" onClick={() => scrollBy(1)}>›</button>
        </>
      )}
    </div>
  );
}
