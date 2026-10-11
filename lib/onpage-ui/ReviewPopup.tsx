import { useEffect, useRef, useState } from 'react';
import { fillBlankQuestion, isCorrectAnswer } from '@/lib/ai';
import { appleFruitKey } from '@/lib/engine';
import { getDueReviews, getFruits, onDataChanged, updateSeed, type Question, type Seed } from '@/lib/storage';
import { spriteLabel, useThemeId } from '@/lib/theme';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';

/**
 * The apple's one question, saved when it was planted (the paragraph with the highlight blanked out, see
 * lib/engine/recall.ts). Apples planted before that existed get a fill-in-the-blank question from their own text.
 */
async function questionFor(seed: Seed): Promise<Question | null> {
  const saved = (await getFruits(seed.forestId)).find((f) => f.color === appleFruitKey(seed.id))?.questions[0];
  return saved ?? fillBlankQuestion(seed);
}

/**
 * Active recall: when an apple's time is up it has grown into an apple tree (the background worker's alarm does that),
 * and this pop-up in the top left of the page asks one question about the text it was planted on. It shows in the
 * tab the user is looking at, whatever page that is. Answering (or skipping) clears the apple's `nextReviewAt`.
 */
export function ReviewPopup() {
  const [seed, setSeed] = useState<Seed | null>(null);
  const [question, setQuestion] = useState<Question | null | 'loading'>('loading');
  const [given, setGiven] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const showing = useRef<string | null>(null);
  const apple = spriteLabel('fruitsprout', useThemeId()).toLowerCase(); // "apple", or the theme's own name for it

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

  const finish = async () => {
    await updateSeed(seed.id, { nextReviewAt: null, growth: 'tree' });
    showing.current = null;
    setSeed(null);
  };
  const right = question && question !== 'loading' && given !== null ? isCorrectAnswer(question, given) : null;

  return (
    <div className="fo-review" role="dialog" aria-label="Active recall">
      <div className="fo-review-head">
        <SpriteIcon type="fruitsprout" grown size={34} />
        <div>
          <div className="fo-review-title">Active Recall</div>
          <div className="fo-review-from">Your {apple} from {seed.pageTitle || 'a page'} has grown</div>
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
          <button className="fo-review-main" onClick={() => void finish()}>Done</button>
        ) : (
          <>
            {question && question !== 'loading' && <button className="fo-review-skip" onClick={() => setGiven('')}>Show answer</button>}
            <button className="fo-review-skip" onClick={() => void finish()}>Skip</button>
          </>
        )}
      </div>
    </div>
  );
}
