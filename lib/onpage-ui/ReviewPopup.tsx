import { useEffect, useRef, useState } from 'react';
import { fillBlankQuestion, isCorrectAnswer } from '@/lib/ai';
import { appleFruitKey } from '@/lib/engine';
import { getAdvancedSettings, getDueReviews, getQuizzes, onDataChanged, updateSeed, type Question, type Seed } from '@/lib/storage';
import { getWords, spriteLabel, useThemeId } from '@/lib/theme';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';

/**
 * The apple's one question, saved when it was planted (the paragraph with the highlight blanked out, see
 * lib/engine/recall.ts). Apples planted before that existed get a fill-in-the-blank question from their own text.
 */
async function questionFor(seed: Seed): Promise<Question | null> {
  const saved = (await getQuizzes(seed.forestId)).find((f) => f.color === appleFruitKey(seed.id))?.questions[0];
  return saved ?? fillBlankQuestion(seed);
}

/** Spaced repetition: after the first review, the question comes back after these many days, one after another. */
const REPEAT_DAYS = [1, 3, 7];
const FIRST_DAYS = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When the apple asks again, and its new step. Right moves on to the next gap (and stops after the last one), wrong
 * starts again from the first gap, and a skip keeps its place and asks again after the first gap. Advanced settings
 * can turn the repeats off, or make the gaps shorter or longer (`reviewSpacing`).
 */
async function nextReview(seed: Seed, outcome: 'right' | 'wrong' | 'skip'): Promise<Pick<Seed, 'nextReviewAt' | 'reviewStep'>> {
  const { reviewRepeats, reviewSpacing } = await getAdvancedSettings();
  const step = seed.reviewStep ?? 0;
  if (!reviewRepeats) return { nextReviewAt: null, reviewStep: step };
  const after = (days: number) => Date.now() + days * reviewSpacing * DAY_MS;
  if (outcome === 'skip') return { nextReviewAt: after(FIRST_DAYS), reviewStep: step };
  if (outcome === 'wrong') return { nextReviewAt: after(FIRST_DAYS), reviewStep: 1 };
  const days = REPEAT_DAYS[step];
  if (days === undefined) return { nextReviewAt: null, reviewStep: step }; // the last review: done for good
  return { nextReviewAt: after(days), reviewStep: step + 1 };
}

/**
 * Active recall: when an apple's time is up it has grown into an apple tree (the background worker's alarm does that),
 * and this pop-up in the top left of the page asks one question about the text it was planted on. It shows in the
 * tab the user is looking at, whatever page that is. Answering (or skipping) sets the apple's next review (nextReview),
 * or clears `nextReviewAt` when there are no more. Only the review time changes, never the apple's growth.
 */
export function ReviewPopup() {
  const [seed, setSeed] = useState<Seed | null>(null);
  const [question, setQuestion] = useState<Question | null | 'loading'>('loading');
  const [given, setGiven] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const showing = useRef<string | null>(null);
  const themeId = useThemeId();
  const apple = spriteLabel('fruitsprout', themeId).toLowerCase(); // "apple", or the theme's own name for it
  const words = getWords(themeId); // "has grown" in the nature themes, "is ready to review" in Minimal

  // Look for an apple whose time is up: now, when storage changes (the alarm grew one), when the tab comes back
  // into view, and at the moment the next apple is due (in case the alarm was lost, for example after a restart).
  useEffect(() => {
    let timer = 0;
    const check = async () => {
      window.clearTimeout(timer);
      const pending = await getDueReviews(Number.MAX_SAFE_INTEGER);
      const now = Date.now();
      const next = pending.find((s) => (s.nextReviewAt ?? 0) > now);
      if (next?.nextReviewAt) timer = window.setTimeout(check, Math.min(next.nextReviewAt - now + 500, 2 ** 31 - 1));
      if (showing.current || document.visibilityState !== 'visible') return;
      const due = pending.find((s) => (s.nextReviewAt ?? 0) <= now);
      if (!due) return;
      showing.current = due.id;
      setSeed(due);
      setQuestion('loading');
      setGiven(null);
      setTyped('');
      if (due.growth !== 'tree') void updateSeed(due.id, { growth: 'tree' });
      setQuestion(await questionFor(due));
    };
    void check();
    const stop = onDataChanged(() => void check());
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearTimeout(timer);
      stop();
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  if (!seed) return null;

  const right = question && question !== 'loading' && given !== null ? isCorrectAnswer(question, given) : null;
  // "Show answer" counts as wrong. With no question at all ("read this again") it counts as right.
  const finish = async (outcome: 'right' | 'wrong' | 'skip') => {
    await updateSeed(seed.id, { ...(await nextReview(seed, outcome)), growth: 'tree' });
    showing.current = null;
    setSeed(null);
  };

  return (
    <div className="fo-review" role="dialog" aria-label="Active recall">
      <div className="fo-review-head">
        <SpriteIcon type="fruitsprout" grown size={34} />
        <div>
          <div className="fo-review-title">Active Recall</div>
          <div className="fo-review-from">{words.recallReady(apple, seed.pageTitle || 'a page')}</div>
        </div>
      </div>

      {question === 'loading' && <p className="fo-review-text">Writing your question…</p>}

      {question === null && (
        <>
          <p className="fo-review-text">Read this again and try to recall it:</p>
          <p className="fo-review-quote">“{seed.text}”</p>
        </>
      )}

      {question && question !== 'loading' && (
        <>
          <p className="fo-review-text">{question.prompt}</p>
          {question.choices.length > 0 ? (
            <div className="fo-review-choices">
              {question.choices.map((choice) => {
                const state = given === null ? '' : isCorrectAnswer(question, choice) ? ' is-right' : given === choice ? ' is-wrong' : '';
                return (
                  <button key={choice} className={`fo-review-choice${state}`} disabled={given !== null} onClick={() => setGiven(choice)}>
                    {choice}
                  </button>
                );
              })}
            </div>
          ) : (
            <form
              className="fo-review-type"
              onSubmit={(e) => {
                e.preventDefault();
                if (typed.trim()) setGiven(typed);
              }}
            >
              <input autoFocus disabled={given !== null} placeholder="Type what you highlighted" value={typed} onChange={(e) => setTyped(e.target.value)} />
              <button type="submit" className="fo-review-main" disabled={given !== null || !typed.trim()}>Check</button>
            </form>
          )}
          {right !== null && <p className="fo-review-text">{right ? 'Right!' : <>The answer is <b>{question.answer}</b>.</>}</p>}
        </>
      )}

      <div className="fo-review-actions">
        {question !== 'loading' && (given !== null || question === null) ? (
          <button className="fo-review-main" onClick={() => void finish(right === false ? 'wrong' : 'right')}>Done</button>
        ) : (
          <>
            {question && question !== 'loading' && <button className="fo-review-skip" onClick={() => setGiven('')}>Show answer</button>}
            <button className="fo-review-skip" onClick={() => void finish('skip')}>Skip</button>
          </>
        )}
      </div>
    </div>
  );
}
