import { useState } from 'react';
import { isCorrectAnswer } from '@/lib/ai';
import { spriteLabel, useThemeId } from '@/lib/theme';
import type { Question, Seed } from '@/lib/storage';
import { Pond } from './Pond';
import { forestHref, settingsHref } from './route';
import { useQuiz, type QuizMaker } from './useQuiz';

const button = 'rounded-lg border border-edge px-3 py-1.5 text-sm hover:bg-primary-soft disabled:opacity-50';
const mainButton = 'rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-ink hover:bg-primary-strong disabled:opacity-50';

/**
 * A quiz (a fruit) made from the forest's lily pads. The pads sit in a row and the frog hops to the
 * next one with each question. Making the quiz is a separate step the user starts, because the Gemini option sends
 * the lily pads' text to Google; the saved quiz is reused after that.
 */
export function QuizView({ forestId, color }: { forestId: string; color: string }) {
  const { data, make, making, notice } = useQuiz(forestId, color);
  const pad = spriteLabel('lilypad', useThemeId()); // "Lily pad", or the theme's own name for it

  if (!data) return <p>Loading…</p>;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{pad} quiz</h1>
        <a href={forestHref(forestId)} className={button}>Back to the forest</a>
      </div>
      {notice && <p className="mb-4 rounded-lg border border-edge bg-surface p-3 text-sm">{notice}</p>}

      {data.pads.length === 0 ? (
        <p className="rounded-xl bg-surface p-6 text-ink-muted">There are no {pad.toLowerCase()}s in this forest yet.</p>
      ) : !data.fruit || making ? (
        <MakeQuiz count={data.pads.length} hasKey={data.hasKey} making={making} onMake={make} />
      ) : (
        <PlayQuiz key={data.fruit.id} questions={data.fruit.questions} pads={data.pads} color={color} onRemake={(maker) => void make(maker)} hasKey={data.hasKey} />
      )}
    </>
  );
}

/** The start screen: how to make the quiz, with the notice that the Gemini option sends text to Google. */
function MakeQuiz({ count, hasKey, making, onMake }: { count: number; hasKey: boolean; making: QuizMaker | null; onMake(m: QuizMaker): void }) {
  return (
    <section className="space-y-4 rounded-xl border-2 border-edge bg-surface p-5">
      <p>
        {count} lily {count === 1 ? 'pad' : 'pads'} in this forest. Each one becomes a question (up to 10).
      </p>
      <div className="flex flex-wrap gap-2">
        <button className={mainButton} disabled={!hasKey || making !== null} onClick={() => onMake('gemini')}>
          {making === 'gemini' ? 'Gemini is writing the questions…' : 'Make the quiz with Gemini'}
        </button>
        <button className={button} disabled={making !== null} onClick={() => onMake('fill-blank')}>
          {making === 'fill-blank' ? 'Making…' : 'Make it without AI (fill in the blank)'}
        </button>
      </div>
      <p className="text-xs text-ink-muted">
        {hasKey ? (
          <>The Gemini option sends the text of these lily pads to Google to write the questions. Nothing is sent until you press it.</>
        ) : (
          <>
            To use Gemini, add your API key on the <a className="text-primary underline" href={settingsHref}>Settings page</a>. Without it the quiz is fill in the blank, made in your browser.
          </>
        )}
      </p>
    </section>
  );
}

interface PlayProps {
  questions: Question[];
  pads: Seed[];
  color: string;
  hasKey: boolean;
  onRemake(maker: QuizMaker): void;
}

/** Answering the questions one by one, then the results. */
function PlayQuiz({ questions, pads, color, hasKey, onRemake }: PlayProps) {
  const [at, setAt] = useState(0);
  const [answers, setAnswers] = useState<{ given: string; right: boolean }[]>([]);
  const [typed, setTyped] = useState('');
  const [showResults, setShowResults] = useState(false);
  const question = questions[at];
  const answered = answers[at];

  const answer = (given: string) => {
    if (answered || !question) return;
    setAnswers((a) => [...a, { given, right: isCorrectAnswer(question, given) }]);
  };
  const next = () => {
    setTyped('');
    if (at < questions.length - 1) setAt(at + 1);
    else setShowResults(true);
  };
  const restart = () => {
    setAt(0);
    setAnswers([]);
    setTyped('');
    setShowResults(false);
  };

  const results = questions.map((_, i) => answers[i]?.right);
  const pad = pads.find((p) => p.id === question?.seedId);
  const score = answers.filter((a) => a.right).length;
  // Gemini's questions are always 'multiple-choice' and the ones made in the browser are 'fill-blank', so the type tells which kind this quiz is.
  const isAi = questions.some((q) => q.type === 'multiple-choice');
  const madeBy = isAi ? 'Questions written by Gemini.' : 'Fill-in-the-blank questions, made without AI.';

  return (
    <>
      <Pond count={questions.length} color={color} at={at} results={results} />

      {showResults ? (
        <section className="space-y-4 rounded-xl border-2 border-edge bg-surface p-5">
          <h2 className="text-xl font-semibold">
            {score} of {questions.length} right{score === questions.length ? '. The frog is proud of you!' : '.'}
          </h2>
          {score < questions.length && (
            <div className="space-y-2">
              <p className="text-sm text-ink-muted">To look at again:</p>
              {questions.map((q, i) =>
                answers[i]?.right ? null : (
                  <div key={i} className="rounded-lg bg-surface-alt p-3 text-sm">
                    <p>{q.prompt}</p>
                    <p className="mt-1 text-ink-muted">
                      You said “{answers[i]?.given}”. The answer is <span className="font-semibold text-primary">{q.answer}</span>.
                    </p>
                  </div>
                ),
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button className={mainButton} onClick={restart}>Try again</button>
          </div>
        </section>
      ) : question ? (
        <section className="space-y-4 rounded-xl border-2 border-edge bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-ink-muted">
            Question {at + 1} of {questions.length}
            {pad?.pageTitle ? ` · from ${pad.pageTitle}` : ''}
          </p>
          <p className="text-lg">{question.prompt}</p>

          {question.choices.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {question.choices.map((choice) => {
                const isAnswer = isCorrectAnswer(question, choice);
                const picked = answered?.given === choice;
                const mark = answered && isAnswer ? 'border-primary border-2' : answered && picked ? 'border-danger-soft border-2' : 'border-edge';
                return (
                  <button key={choice} disabled={Boolean(answered)} className={`rounded-lg border bg-surface-alt px-3 py-2 text-left hover:bg-primary-soft ${mark}`} onClick={() => answer(choice)}>
                    {answered && isAnswer ? '✓ ' : answered && picked ? '✗ ' : ''}
                    {choice}
                  </button>
                );
              })}
            </div>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                answer(typed);
              }}
            >
              <input autoFocus disabled={Boolean(answered)} className="min-w-0 flex-1 rounded-lg border border-edge bg-surface-alt px-3 py-2" placeholder="Type the missing word" value={typed} onChange={(e) => setTyped(e.target.value)} />
              <button type="submit" className={mainButton} disabled={Boolean(answered) || !typed.trim()}>Check</button>
            </form>
          )}

          {answered && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={answered.right ? 'font-semibold text-primary' : ''}>
                {answered.right ? 'Right!' : (
                  <>
                    Not quite. The answer is <span className="font-semibold text-primary">{question.answer}</span>.
                  </>
                )}
              </p>
              <button autoFocus className={mainButton} onClick={next}>{at < questions.length - 1 ? 'Hop to the next pad' : 'See how you did'}</button>
            </div>
          )}
          <p className="text-xs text-ink-muted">{madeBy}</p>
        </section>
      ) : null}

      <Remake isAi={isAi} hasKey={hasKey} onRemake={onRemake} />
    </>
  );
}

/** Lets the user swap the quiz for a new one, made either way, so an AI quiz can become non-AI and the other way round. */
function Remake({ isAi, hasKey, onRemake }: { isAi: boolean; hasKey: boolean; onRemake(maker: QuizMaker): void }) {
  return (
    <section className="mt-4 space-y-2 rounded-xl border border-edge bg-surface p-4">
      <p className="text-sm">
        This quiz was {isAi ? 'written by Gemini' : 'made without AI (fill in the blank)'}. Make a new one:
      </p>
      <div className="flex flex-wrap gap-2">
        <button className={button} disabled={!hasKey} onClick={() => onRemake('gemini')}>Remake with Gemini</button>
        <button className={button} onClick={() => onRemake('fill-blank')}>Remake without AI</button>
      </div>
      <p className="text-xs text-ink-muted">
        {hasKey ? (
          'Gemini sends the text of these lily pads to Google. Nothing is sent until you press it.'
        ) : (
          <>
            To remake it with Gemini, add your API key on the <a className="text-primary underline" href={settingsHref}>Settings page</a>.
          </>
        )}
      </p>
    </section>
  );
}
