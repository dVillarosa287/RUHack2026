import { useState } from 'react';
import { fillBlankQuestions, geminiQuizQuestions } from '@/lib/ai';
import { getFruits, getSeedsForForest, getSettings, saveFruit, type Fruit, type Question, type Seed } from '@/lib/storage';
import { spriteLabel, useThemeId } from '@/lib/theme';
import { quizPads } from './QuizBar';
import { useStored } from './useStored';

const MAX_QUESTIONS = 10;

export type QuizMaker = 'gemini' | 'fill-blank';

export interface QuizData {
  /** The forest's lily pads, in planting order. */
  pads: Seed[];
  /** The saved quiz, with questions about pads that were removed since taken out. Null if there is none yet. */
  fruit: Fruit | null;
  hasKey: boolean;
}

/**
 * Everything the quiz page needs: the lily pads, the saved quiz (a Fruit), and `make` to write a new one.
 * Gemini is only called from `make`, which runs when the user presses a button, never on its own.
 */
export function useQuiz(forestId: string, color: string) {
  const data = useStored<QuizData>(async () => {
    const pads = quizPads(await getSeedsForForest(forestId));
    const ids = new Set(pads.map((p) => p.id));
    const saved = (await getFruits(forestId)).filter((f) => f.color === color).pop();
    const questions = saved?.questions.filter((q) => ids.has(q.seedId)) ?? [];
    return { pads, fruit: saved && questions.length ? { ...saved, questions } : null, hasKey: Boolean((await getSettings()).geminiKey) };
  }, [forestId, color]);

  const [making, setMaking] = useState<QuizMaker | null>(null);
  // Why Gemini could not be used, if it failed and the quiz was made without AI instead.
  const [notice, setNotice] = useState<string | null>(null);
  const pad = spriteLabel('lilypad', useThemeId()).toLowerCase(); // "lily pad", or the theme's own name for it

  async function make(maker: QuizMaker) {
    if (!data) return;
    const pads = data.pads.slice(0, MAX_QUESTIONS);
    setMaking(maker);
    setNotice(null);
    let questions: Question[] = [];
    if (maker === 'gemini') {
      try {
        questions = await geminiQuizQuestions(pads);
      } catch (error) {
        setNotice(`${error instanceof Error ? error.message : String(error)} The quiz was made without AI instead.`);
      }
    }
    if (questions.length === 0) questions = fillBlankQuestions(pads);
    if (questions.length === 0) setNotice(`These ${pad}s have too little text to ask about. Highlight a full sentence with a ${pad}.`);
    else await saveFruit({ forestId, color, questions }); // storage changes, so `data` reloads with the new fruit
    setMaking(null);
  }

  return { data, make, making, notice };
}
