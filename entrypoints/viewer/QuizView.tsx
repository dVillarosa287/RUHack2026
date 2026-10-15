import { useEffect, useState } from 'react';
import { isCorrectAnswer, type AiProvider, type QuizMix } from '@/lib/ai';
import { getWords, spriteLabel, useThemeId, useWords } from '@/lib/theme';
import type { PadGroup, Question, Seed } from '@/lib/storage';
import { seedLabel } from './GraphNodes';
import { Pond } from './Pond';
import { Dropdown } from './Dropdown';
import { QuizGrid } from './QuizGrid';
import { forestHref, NEW_QUIZ, newQuizHref, playQuizHref, quizHref, settingsHref } from './route';
import { useQuiz, type QuizMaker } from './useQuiz';

const button = 'rounded-lg border border-edge px-3 py-1.5 text-sm hover:bg-primary-soft disabled:opacity-50';
const mainButton = 'rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-ink hover:bg-primary-strong disabled:opacity-50';

/**
 * The quizzes (quizzes) made from the forest's lily pads. Without `quizId` it is the grid of saved quizzes; with
 * NEW_QUIZ it is the "new quiz" setup; with a quiz's id it plays that quiz: the pads sit in a row and the frog hops to
 * the next one with each question. Making a quiz is a separate step the user starts, because the AI options send the
 * lily pads' text to the provider; a saved quiz is reused after that.
 */
export function QuizView({ forestId, color, quizId, group }: { forestId: string; color: string; quizId?: string; group?: string }) {
  const { data, quizzes, make, addNewPads, making, notice } = useQuiz(forestId, color);
  const themeId = useThemeId();
  const pad = spriteLabel('lilypad', themeId); // "Lily pad", or the theme's own name for it
  const words = getWords(themeId); // "forest" or "folder", by theme
  // "Make a new quiz with Gemini/Cerebras" under a quiz opens the new quiz page with that provider's setup already open.
  const [setupFor, setSetupFor] = useState<AiProvider | null>(null);
  useEffect(() => {
    if (quizId !== NEW_QUIZ) setSetupFor(null);
  }, [quizId]);

  if (!data) return <p>Loading…</p>;

  // Makes the quiz, then plays it straight away.
  const create = async (maker: QuizMaker, mix?: QuizMix, padIds?: string[]) => {
    const quiz = await make(maker, mix, padIds);
    if (quiz) window.location.hash = playQuizHref(forestId, color, quiz.id);
  };
  const playing = quizId && quizId !== NEW_QUIZ ? quizzes.find((f) => f.id === quizId) : undefined;
  const changes = playing ? data.changes[playing.id] : undefined;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{playing?.name ?? words.quizName(pad)}</h1>
        <div className="flex gap-2">
          {quizId && <a href={quizHref(forestId, color)} className={button}>Back to quizzes</a>}
          <a href={forestHref(forestId)} className={button}>Back to the {words.forest}</a>
        </div>
      </div>
      {notice && <p className="mb-4 rounded-lg border border-edge bg-surface p-3 text-sm">{notice}</p>}

      {data.pads.length === 0 ? (
        <p className="rounded-xl bg-surface p-6 text-ink-muted">There are no {pad.toLowerCase()}s in this {words.forest} yet.</p>
      ) : !quizId ? (
        <QuizGrid forestId={forestId} color={color} quizzes={quizzes} />
      ) : quizId === NEW_QUIZ ? (
        <MakeQuiz pads={data.pads} groups={data.groups} initialGroup={group} hasGeminiKey={data.hasGeminiKey} hasCerebrasKey={data.hasCerebrasKey} making={making} onMake={(maker, mix, padIds) => void create(maker, mix, padIds)} initialSetup={setupFor} />
      ) : playing ? (
        <>
        {changes && (changes.newPads.length > 0 || changes.removed > 0) && (
          <QuizChangesNotice newCount={changes.newPads.length} removed={changes.removed} making={making !== null} onUpdate={() => void addNewPads(playing)} />
        )}
        <PlayQuiz
          // A new key when questions are added, so the quiz starts again with them.
          key={`${playing.id}:${playing.questions.length}`}
          questions={playing.questions}
          pads={data.pads}
          color={color}
          provider={playing.provider}
          hasGeminiKey={data.hasGeminiKey}
          hasCerebrasKey={data.hasCerebrasKey}
          onRemake={(maker) => {
            if (maker === 'fill-blank') return void create(maker); // no setup without AI
            setSetupFor(maker);
            window.location.hash = newQuizHref(forestId, color);
          }}
        />
        </>
      ) : (
        <p className="rounded-xl bg-surface p-6 text-ink-muted">This quiz no longer exists.</p>
      )}
    </>
  );
}

/** Shown above a saved quiz when lily pads were planted or removed since it was made. */
function QuizChangesNotice({ newCount, removed, making, onUpdate }: { newCount: number; removed: number; making: boolean; onUpdate(): void }) {
  const pad = spriteLabel('lilypad', useThemeId()).toLowerCase();
  return (
    <section className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border-2 border-primary bg-surface p-4 text-sm">
      <p className="min-w-0 flex-1">
        {newCount > 0 && <>{newCount === 1 ? `A new ${pad} was` : `${newCount} new ${pad}s were`} added since this quiz was made. </>}
        {removed > 0 && <>{removed === 1 ? 'One question was' : `${removed} questions were`} taken out because {removed === 1 ? `its ${pad} was` : `their ${pad}s were`} removed.</>}
      </p>
      {newCount > 0 && (
        <button className={mainButton} disabled={making} onClick={onUpdate}>
          {making ? 'Adding…' : `Add questions for the new ${pad}s`}
        </button>
      )}
    </section>
  );
}

/** A short name for a lily pad group: its first pad, and how many pads it has. */
const groupName = (group: PadGroup, themeId: string) => `Group: ${seedLabel(group.pads[0]!, themeId)} (${group.pads.length})`;

/**
 * Which lily pads go into the quiz: "Select all", a group (lily pads joined by roots; pads in no group are not in this
 * list), or any pads ticked by hand.
 */
function PadChooser({ pads, groups, chosen, onChange }: { pads: Seed[]; groups: PadGroup[]; chosen: Set<string>; onChange(next: Set<string>): void }) {
  const themeId = useThemeId();
  const pad = spriteLabel('lilypad', themeId).toLowerCase();
  const pickedGroup = groups.find((g) => g.pads.length === chosen.size && g.pads.every((p) => chosen.has(p.id)));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">
          {chosen.size} of {pads.length} {pad}s chosen
        </span>
        <button className={button} onClick={() => onChange(new Set(pads.map((p) => p.id)))}>Select all {pad}s</button>
        {groups.length > 0 && (
          <Dropdown
            ariaLabel={`${pad} groups`}
            className="w-64"
            placeholder="Choose a group…"
            value={pickedGroup?.id ?? ''}
            options={groups.map((g) => ({ value: g.id, label: groupName(g, themeId) }))}
            onChange={(id) => {
              const g = groups.find((x) => x.id === id);
              if (g) onChange(new Set(g.pads.map((p) => p.id)));
            }}
          />
        )}
      </div>
      <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-edge bg-surface-alt p-2">
        {pads.map((p) => (
          <li key={p.id}>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary"
                checked={chosen.has(p.id)}
                onChange={(e) => {
                  const next = new Set(chosen);
                  if (e.target.checked) next.add(p.id);
                  else next.delete(p.id);
                  onChange(next);
                }}
              />
              <span className="min-w-0 flex-1 truncate">{seedLabel(p, themeId)}</span>
              {p.pageTitle && <span className="max-w-[40%] truncate text-xs text-ink-muted">{p.pageTitle}</span>}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The start screen: which lily pads, how to make the quiz, with the notice that the Gemini option sends text to Google. */
function MakeQuiz({ pads, groups, initialGroup, hasGeminiKey, hasCerebrasKey, making, onMake, initialSetup }: { pads: Seed[]; groups: PadGroup[]; initialGroup?: string; hasGeminiKey: boolean; hasCerebrasKey: boolean; making: QuizMaker | null; onMake(m: QuizMaker, mix: QuizMix | undefined, padIds: string[]): void; initialSetup: AiProvider | null }) {
  const themeId = useThemeId();
  const pad = spriteLabel('lilypad', themeId).toLowerCase(); // "lily pad", or the theme's own name for it
  const words = getWords(themeId);
  // The AI options first ask how many questions of each style; this is the provider whose setup is open.
  const [setup, setSetup] = useState<AiProvider | null>(initialSetup);
  // Every lily pad to start with, or the group the address asks for ("Quiz this group" in the graph).
  const [chosen, setChosen] = useState<Set<string>>(() => new Set((groups.find((g) => g.id === initialGroup)?.pads ?? pads).map((p) => p.id)));
  const padIds = pads.filter((p) => chosen.has(p.id)).map((p) => p.id);
  const count = padIds.length;
  if (setup) return <QuizSetup provider={setup} padCount={count} making={making} onCreate={(mix) => onMake(setup, mix, padIds)} onBack={() => setSetup(null)} />;
  return (
    <section className="space-y-4 rounded-xl border-2 border-edge bg-surface p-5">
      <PadChooser pads={pads} groups={groups} chosen={chosen} onChange={setChosen} />
      <p>
        {count} {count === 1 ? pad : `${pad}s`} chosen in this {words.forest}. Without AI each one becomes a question (up to 10); with AI you choose how many questions and which styles.
      </p>
      <div className="flex flex-wrap gap-2">
        <button className={mainButton} disabled={!hasGeminiKey || making !== null || count === 0} onClick={() => setSetup('gemini')}>
          Make the quiz with Gemini
        </button>
        <button className={button} disabled={!hasCerebrasKey || making !== null || count === 0} onClick={() => setSetup('cerebras')}>
          Make the quiz with Cerebras
        </button>
        <button className={button} disabled={making !== null || count === 0} onClick={() => onMake('fill-blank', undefined, padIds)}>
          {making === 'fill-blank' ? 'Making…' : 'Make it without AI (fill in the blank)'}
        </button>
      </div>
      <p className="text-xs text-ink-muted">
        {hasGeminiKey || hasCerebrasKey ? (
          <>AI options send the text of these {pad}s to the selected provider to write the questions. Nothing is sent until you press one.</>
        ) : (
          <>
            To use AI, add a Gemini or Cerebras API key on the <a className="text-primary underline" href={settingsHref}>Settings page</a>. Without it the quiz is fill in the blank, made in your browser.
          </>
        )}
      </p>
    </section>
  );
}

/** Most questions a custom AI quiz can have. */
const MAX_MIX = 20;

/** The style counts lowered until they add up to at most `total`: Matching first, then Fill in the blank, then Multiple choice. */
function fit(counts: [number, number, number], total: number): [number, number, number] {
  const next: [number, number, number] = [...counts];
  let over = next[0] + next[1] + next[2] - total;
  for (const i of [2, 1, 0]) {
    const cut = Math.min(next[i] as number, Math.max(0, over));
    next[i] = (next[i] as number) - cut;
    over -= cut;
  }
  return next;
}

/** The custom setup for an AI quiz: how many questions, and how many of each style. The rest are random styles. */
function QuizSetup({ provider, padCount, making, onCreate, onBack }: { provider: AiProvider; padCount: number; making: QuizMaker | null; onCreate(mix: QuizMix): void; onBack(): void }) {
  const pad = spriteLabel('lilypad', useThemeId()).toLowerCase(); // "lily pad", or the theme's own name for it
  const canMatch = padCount >= 3; // a matching question needs at least 3 rows
  const [total, setTotal] = useState(() => Math.max(1, Math.min(10, padCount * 2)));
  const [counts, setCounts] = useState<[number, number, number]>([0, 0, 0]);
  const random = Math.max(0, total - counts[0] - counts[1] - counts[2]);
  const name = provider === 'cerebras' ? 'Cerebras' : 'Gemini';
  const toNumber = (value: string) => Math.min(MAX_MIX, Math.max(0, Math.floor(Number(value)) || 0));
  const field = 'w-20 rounded-lg border border-edge bg-surface-alt px-2 py-1 disabled:opacity-50';
  const styles: [string, number][] = [['Multiple choice', 0], ['Fill in the blank', 1], ['Matching', 2]];

  // The random questions are given a style here, so the AI request stays the same: it always gets exact counts.
  const create = () => {
    const mix: [number, number, number] = [...counts];
    const allowed = canMatch ? [0, 1, 2] : [0, 1];
    for (let n = 0; n < random; n++) {
      const i = allowed[Math.floor(Math.random() * allowed.length)] as number;
      mix[i] = (mix[i] as number) + 1;
    }
    onCreate({ multipleChoice: mix[0], typeIn: mix[1], matching: mix[2] });
  };

  return (
    <section className="space-y-4 rounded-xl border-2 border-edge bg-surface p-5">
      <p className="font-semibold">A new quiz with {name}</p>
      <label className="flex items-center gap-3">
        <span className="w-44">Number of questions</span>
        <input
          type="number"
          min={1}
          max={MAX_MIX}
          className={field}
          value={total}
          onChange={(e) => {
            const next = Math.max(1, toNumber(e.target.value));
            setTotal(next);
            setCounts((c) => fit(c, next));
          }}
        />
      </label>
      {styles.map(([label, i]) => (
        <label key={label} className="flex flex-wrap items-center gap-3">
          <span className="w-44">{label}</span>
          <input
            type="number"
            min={0}
            max={total - counts[0] - counts[1] - counts[2] + counts[i]!}
            className={field}
            disabled={i === 2 && !canMatch}
            value={counts[i]}
            onChange={(e) =>
              setCounts((c) => {
                const room = total - c[0] - c[1] - c[2] + c[i]!; // the total minus the other two styles
                return c.map((v, j) => (j === i ? Math.min(room, toNumber(e.target.value)) : v)) as [number, number, number];
              })
            }
          />
          {i === 2 && !canMatch && <span className="text-sm text-ink-muted">Needs at least 3 {pad}s.</span>}
        </label>
      ))}
      <p className="flex items-center gap-3">
        <span className="w-44">Random questions</span>
        <span className="font-semibold">{random}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <button className={mainButton} disabled={total < 1 || making !== null} onClick={create}>
          {making ? `${name} is writing the questions…` : 'Create quiz'}
        </button>
        <button className={button} disabled={making !== null} onClick={onBack}>Back</button>
      </div>
      <p className="text-xs text-ink-muted">This sends the text of these {pad}s to {name} to write the questions. Nothing is sent until you press Create quiz.</p>
    </section>
  );
}

interface PlayProps {
  questions: Question[];
  pads: Seed[];
  color: string;
  provider?: 'gemini' | 'cerebras';
  hasGeminiKey: boolean;
  hasCerebrasKey: boolean;
  onRemake(maker: QuizMaker): void;
}

/** Answering the questions one by one, then the results. */
function PlayQuiz({ questions: saved, pads, color, provider, hasGeminiKey, hasCerebrasKey, onRemake }: PlayProps) {
  // Last guard: a question with nothing but a blank (or nothing at all) cannot be answered, so it is not shown.
  const questions = saved.filter((q) => q.prompt.replace(/[_\s]/g, '') !== '');
  const words = useWords(); // the frog's praise and "Hop to the next pad", or plain words in Minimal
  const [at, setAt] = useState(0);
  const [answers, setAnswers] = useState<{ given: string; right: boolean }[]>([]);
  // The furthest pad the frog has been on. A pad before it is being looked at again: answered, with a "Next" button.
  const [reached, setReached] = useState(0);
  const [typed, setTyped] = useState('');
  const [showResults, setShowResults] = useState(false);
  const question = questions[at];
  const answered = answers[at];

  // A matching question decides `right` itself (every pair must be right); the others are checked here.
  const answer = (given: string, right = question ? isCorrectAnswer(question, given) : false) => {
    if (answered || !question) return;
    setAnswers((a) => {
      const copy = [...a];
      copy[at] = { given, right };
      return copy;
    });
  };
  const goTo = (i: number) => {
    setTyped('');
    setAt(i);
    setReached((r) => Math.max(r, i));
  };
  const next = () => {
    if (at < questions.length - 1) goTo(at + 1);
    else setShowResults(true);
  };
  const restart = () => {
    setAt(0);
    setReached(0);
    setAnswers([]);
    setTyped('');
    setShowResults(false);
  };

  const results = questions.map((_, i) => answers[i]?.right);
  const pad = pads.find((p) => p.id === question?.seedId);
  const score = answers.filter((a) => a?.right).length;
  const answeredCount = answers.filter(Boolean).length;
  const aiProvider = provider ?? 'gemini';
  // Only the quiz made without AI has fill-in-the-blank questions (AI quizzes have multiple-choice, type-in and matching).
  const isAi = !questions.some((q) => q.type === 'fill-blank');
  const madeBy = isAi ? `Questions written by ${aiProvider === 'cerebras' ? 'Cerebras' : 'Gemini'}.` : 'Fill-in-the-blank questions, made without AI.';

  return (
    <>
      <Pond count={questions.length} color={color} at={at} results={results} furthest={Math.min(questions.length - 1, answeredCount)} onPick={goTo} />

      {showResults ? (
        <section className="space-y-4 rounded-xl border-2 border-edge bg-surface p-5">
          <h2 className="text-xl font-semibold">
            {score} of {questions.length} right.{score === questions.length ? ` ${words.praise}` : ''}
          </h2>
          {score < questions.length && (
            <div className="space-y-2">
              <p className="text-sm text-ink-muted">To look at again:</p>
              {questions.map((q, i) =>
                answers[i]?.right ? null : (
                  <div key={i} className="rounded-lg bg-surface-alt p-3 text-sm">
                    <p>{q.prompt}</p>
                    {q.type === 'matching' ? (
                      <div className="mt-2"><PairList pairs={q.pairs ?? []} said={answers[i]?.given.split(' | ') ?? []} /></div>
                    ) : (
                      <p className="mt-1 text-ink-muted">
                        You said “{answers[i]?.given}”. The answer is <span className="font-semibold text-primary">{q.answer}</span>.
                      </p>
                    )}
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

          {question.type === 'matching' ? (
            <MatchingAnswer key={`${at}:${Boolean(answered)}`} question={question} given={answered?.given} onCheck={answer} />
          ) : question.choices.length > 0 ? (
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
              <input autoFocus disabled={Boolean(answered)} className="min-w-0 flex-1 rounded-lg border border-edge bg-surface-alt px-3 py-2" placeholder={question.type === 'type-in' ? 'Type the missing term' : 'Type the missing word'} value={typed} onChange={(e) => setTyped(e.target.value)} />
              <button type="submit" className={mainButton} disabled={Boolean(answered) || !typed.trim()}>Check</button>
            </form>
          )}

          {answered && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              {!answered.right && question.type === 'matching' ? (
                <div className="w-full space-y-2">
                  <p>Not quite. Correct matches:</p>
                  <PairList pairs={question.pairs ?? []} />
                </div>
              ) : (
                <p className={answered.right ? 'font-semibold text-primary' : ''}>
                  {answered.right ? 'Right!' : (
                    <>
                      Not quite. The answer is <span className="font-semibold text-primary">{question.answer}</span>.
                    </>
                  )}
                </p>
              )}
              <button autoFocus className={mainButton} onClick={next}>{at < reached ? 'Next' : at < questions.length - 1 ? words.nextQuestion : 'See how you did'}</button>
            </div>
          )}
          <p className="text-xs text-ink-muted">{madeBy}</p>
        </section>
      ) : null}

      <Remake isAi={isAi} hasGeminiKey={hasGeminiKey} hasCerebrasKey={hasCerebrasKey} onRemake={onRemake} />
    </>
  );
}

/** A matching question's pairs, one block each: the left item, then (if `said` is given) the user's pick, then the right item. */
function PairList({ pairs, said }: { pairs: { left: string; right: string }[]; said?: string[] }) {
  return (
    <div className="space-y-3">
      {pairs.map((pair, i) => (
        <div key={i}>
          <p>{pair.left}</p>
          {said && <p className="text-ink-muted">You said: {said[i] || '(nothing)'}</p>}
          <p className="font-semibold text-primary">{pair.right}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * A matching question: each left item with a drop-down of the shuffled right items, and one Check. It is right only if
 * every pair is right. `given` (the chosen rights joined with " | ") is set once checked, and then each row is marked.
 */
function MatchingAnswer({ question, given, onCheck }: { question: Question; given?: string; onCheck(given: string, right: boolean): void }) {
  const pairs = question.pairs ?? [];
  const [picks, setPicks] = useState<string[]>(() => (given ? given.split(' | ') : pairs.map(() => '')));
  const checked = given !== undefined;
  return (
    <div className="space-y-2">
      {pairs.map((pair, i) => {
        const right = picks[i] === pair.right;
        return (
          <div key={i} className={`flex flex-wrap items-center gap-2 rounded-lg border bg-surface-alt px-3 py-2 ${checked ? (right ? 'border-primary border-2' : 'border-danger-soft border-2') : 'border-edge'}`}>
            <span className="min-w-0 flex-1">{checked ? (right ? '✓ ' : '✗ ') : ''}{pair.left}</span>
            <Dropdown
              ariaLabel={pair.left}
              className="max-w-full"
              disabled={checked}
              placeholder="Choose…"
              value={picks[i] ?? ''}
              options={question.choices.map((choice) => ({ value: choice, label: choice }))}
              onChange={(value) => setPicks((p) => p.map((v, j) => (j === i ? value : v)))}
            />
            {checked && !right && <span className="w-full text-sm text-ink-muted">Correct: <span className="font-semibold text-primary">{pair.right}</span></span>}
          </div>
        );
      })}
      {!checked && (
        <button className={mainButton} disabled={picks.some((p) => !p)} onClick={() => onCheck(picks.join(' | '), pairs.every((p, i) => picks[i] === p.right))}>Check</button>
      )}
    </div>
  );
}

/** Lets the user swap the quiz for a new one, made either way, so an AI quiz can become non-AI and the other way round. */
function Remake({ isAi, hasGeminiKey, hasCerebrasKey, onRemake }: { isAi: boolean; hasGeminiKey: boolean; hasCerebrasKey: boolean; onRemake(maker: QuizMaker): void }) {
  const pad = spriteLabel('lilypad', useThemeId()).toLowerCase(); // "lily pad", or the theme's own name for it
  return (
    <section className="mt-4 space-y-2 rounded-xl border border-edge bg-surface p-4">
      <p className="text-sm">
        This quiz was {isAi ? 'written by AI' : 'made without AI (fill in the blank)'}. Make a new one:
      </p>
      <div className="flex flex-wrap gap-2">
        <button className={button} disabled={!hasGeminiKey} onClick={() => onRemake('gemini')}>Make a new quiz with Gemini</button>
        <button className={button} disabled={!hasCerebrasKey} onClick={() => onRemake('cerebras')}>Make a new quiz with Cerebras</button>
        <button className={button} onClick={() => onRemake('fill-blank')}>Make a new quiz without AI</button>
      </div>
      <p className="text-xs text-ink-muted">
        {hasGeminiKey || hasCerebrasKey ? (
          `The selected AI provider sends the text of these ${pad}s to write new questions. Nothing is sent until you press it.`
        ) : (
          <>
            To remake it with AI, add a key on the <a className="text-primary underline" href={settingsHref}>Settings page</a>.
          </>
        )}
      </p>
    </section>
  );
}
