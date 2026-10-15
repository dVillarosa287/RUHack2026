import { useState } from 'react';
import { aiQuizQuestions, fillBlankQuestions, type AiProvider, type QuizMix } from '@/lib/ai';
import { getQuizzes, getRoots, getSeedsForForest, getSettings, padGroups, saveQuiz, updateQuiz, type Quiz, type PadGroup, type Question, type Seed } from '@/lib/storage';
import { spriteLabel, useThemeId } from '@/lib/theme';
import { quizPads } from './QuizBar';
import { useStored } from './useStored';

const MAX_QUESTIONS = 10;
/** A custom quiz (with a mix) can use up to this many lily pads. */
const MAX_MIX_QUESTIONS = 20;

export type QuizMaker = AiProvider | 'fill-blank';

/** What changed in a saved quiz's lily pads since it was made. */
export interface QuizChanges {
  /** Lily pads planted after the quiz that belong in it and have no question yet. */
  newPads: Seed[];
  /** How many of its questions were about lily pads that have since been removed. */
  removed: number;
}

export interface QuizData {
  /** The forest's lily pads, in planting order. */
  pads: Seed[];
  /** Lily pads joined by roots (lib/storage/padGroups.ts). A quiz can be made from one group. */
  groups: PadGroup[];
  /** For each saved quiz's id: new lily pads to add and removed ones. */
  changes: Record<string, QuizChanges>;
  /**
   * Every saved quiz, oldest first, each with questions about pads that were removed since taken out (a quiz left with
   * none is left out). A quiz saved before names existed is named "Quiz <its position>".
   */
  quizzes: Quiz[];
  hasGeminiKey: boolean;
  hasCerebrasKey: boolean;
}

/**
 * Everything the quiz page needs: the lily pads, the saved quiz (a Quiz), and `make` to write a new one.
 * Gemini is only called from `make`, which runs when the user presses a button, never on its own.
 */
export function useQuiz(forestId: string, color: string) {
  const [reloadToken, setReloadToken] = useState(0);
  const data = useStored<QuizData>(async () => {
    const pads = quizPads(await getSeedsForForest(forestId));
    const groups = padGroups(pads, await getRoots(forestId));
    const ids = new Set(pads.map((p) => p.id));
    const saved = (await getQuizzes(forestId)).filter((f) => f.color === color);
    const changes: Record<string, QuizChanges> = {};
    for (const f of saved) changes[f.id] = quizChanges(f, pads, groups);
    const quizzes = saved
      .map((f, i) => ({ ...f, name: f.name ?? `Quiz ${i + 1}`, questions: f.questions.filter((q) => ids.has(q.seedId)) }))
      .filter((f) => f.questions.length > 0);
    const settings = await getSettings();
    return { pads, groups, changes, quizzes, hasGeminiKey: Boolean(settings.geminiKey), hasCerebrasKey: Boolean(settings.cerebrasKey) };
  }, [forestId, color, reloadToken]);

  const quizzes = data?.quizzes ?? [];

  const [making, setMaking] = useState<QuizMaker | null>(null);
  // Why Gemini could not be used, if it failed and the quiz was made without AI instead.
  const [notice, setNotice] = useState<string | null>(null);
  const pad = spriteLabel('lilypad', useThemeId()).toLowerCase(); // "lily pad", or the theme's own name for it

  /**
   * Makes and saves a new quiz, and returns it (null if none was made). `mix` is the custom setup, AI only. `padIds`
   * are the lily pads chosen for it (all of them if not given).
   */
  async function make(maker: QuizMaker, mix?: QuizMix, padIds?: string[]): Promise<Quiz | null> {
    if (!data) return null;
    // Read at click time so a lily pad planted after the page loaded is included in a remake.
    const chosen = padIds && new Set(padIds);
    const pads = quizPads(await getSeedsForForest(forestId))
      .filter((p) => !chosen || chosen.has(p.id))
      .slice(0, mix ? MAX_MIX_QUESTIONS : MAX_QUESTIONS);
    setMaking(maker);
    setNotice(null);
    let questions: Question[] = [];
    let generatedBy: AiProvider | undefined;
    if (maker === 'gemini' || maker === 'cerebras') {
      try {
        questions = await aiQuizQuestions(pads, maker, mix);
        generatedBy = maker;
        const asked = mix ? mix.multipleChoice + mix.typeIn + mix.matching : 0;
        if (questions.length < asked) setNotice(`Got ${questions.length} of ${asked} questions.`);
      } catch (error) {
        console.error(`[${maker}] quiz generation failed`, error);
        // Keep the saved quiz. The quiz without AI copies the highlighted sentences, so it is made only when asked for.
        setNotice(`${error instanceof Error ? error.message : String(error)} Try again, or choose Make a new quiz without AI.`);
        setMaking(null);
        return null;
      }
    }
    if (questions.length === 0) questions = fillBlankQuestions(pads);
    let quiz: Quiz | null = null;
    if (questions.length === 0) setNotice(`These ${pad}s have too little text to ask about. Highlight a full sentence with a ${pad}.`);
    else {
      quiz = await saveQuiz({ forestId, color, questions, provider: generatedBy });
      setReloadToken((token) => token + 1);
    }
    setMaking(null);
    return quiz;
  }

  /**
   * Brings a saved quiz up to date: drops questions about removed lily pads and adds questions for only the new ones,
   * written the same way as the quiz (by its AI provider if its key is still there, otherwise without AI).
   */
  async function addNewPads(quiz: Quiz): Promise<void> {
    if (!data) return;
    const { newPads } = data.changes[quiz.id] ?? { newPads: [] };
    const ids = new Set(data.pads.map((p) => p.id));
    const kept = quiz.questions.filter((q) => ids.has(q.seedId));
    const isAi = !quiz.questions.some((q) => q.type === 'fill-blank');
    const provider = quiz.provider ?? 'gemini';
    const maker: QuizMaker = isAi && (provider === 'cerebras' ? data.hasCerebrasKey : data.hasGeminiKey) ? provider : 'fill-blank';
    setMaking(maker);
    setNotice(null);
    let added: Question[] = [];
    if (newPads.length > 0) {
      try {
        added = maker === 'fill-blank' ? fillBlankQuestions(newPads) : await aiQuizQuestions(newPads, maker);
      } catch (error) {
        console.error(`[${maker}] adding questions failed`, error);
        setNotice(`${error instanceof Error ? error.message : String(error)} Try again.`);
      }
      if (added.length === 0) setNotice((n) => n ?? `The new ${pad}s have too little text to ask about.`);
    }
    await updateQuiz(quiz.id, { questions: [...kept, ...added] });
    setMaking(null);
    setReloadToken((token) => token + 1);
  }

  return { data, quizzes, make, addNewPads, making, notice };
}

/**
 * What changed for a saved quiz. New lily pads are ones planted after it with no question in it. If every pad the
 * quiz asks about is in one group, only new pads in that group count, since it was a quiz on that group.
 */
function quizChanges(quiz: Quiz, pads: Seed[], groups: PadGroup[]): QuizChanges {
  const asked = new Set(quiz.questions.map((q) => q.seedId));
  const ids = new Set(pads.map((p) => p.id));
  const removed = quiz.questions.filter((q) => !ids.has(q.seedId)).length;
  const live = [...asked].filter((id) => ids.has(id));
  const group = groups.find((g) => live.length > 0 && live.every((id) => g.pads.some((p) => p.id === id)));
  // It was a group quiz only if other lily pads, outside the group, already existed when it was made.
  const wasGroupQuiz = group && pads.some((p) => p.createdAt <= quiz.createdAt && !group.pads.includes(p));
  const pool = wasGroupQuiz ? group.pads : pads;
  const newPads = pool.filter((p) => p.createdAt > quiz.createdAt && !asked.has(p.id));
  return { newPads, removed };
}
