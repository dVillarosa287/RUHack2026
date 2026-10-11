import { useState } from 'react';
import { aiQuizQuestions, fillBlankQuestions, type AiProvider } from '@/lib/ai';
import { getFruits, getSeedsForForest, getSettings, saveFruit, type Fruit, type Question, type Seed } from '@/lib/storage';
import { spriteLabel, useThemeId } from '@/lib/theme';
import { quizPads } from './QuizBar';
import { useStored } from './useStored';

const MAX_QUESTIONS = 10;

export type QuizMaker = AiProvider | 'fill-blank';

export interface QuizData {
  /** The forest's lily pads, in planting order. */
  pads: Seed[];
  /** The saved quiz, with questions about pads that were removed since taken out. Null if there is none yet. */
  fruit: Fruit | null;
  hasGeminiKey: boolean;
  hasCerebrasKey: boolean;
}

/**
 * Everything the quiz page needs: the lily pads, the saved quiz (a Fruit), and `make` to write a new one.
 * Gemini is only called from `make`, which runs when the user presses a button, never on its own.
 */
export function useQuiz(forestId: string, color: string) {
  const [reloadToken, setReloadToken] = useState(0);
  const data = useStored<QuizData>(async () => {
    const pads = quizPads(await getSeedsForForest(forestId));
    const ids = new Set(pads.map((p) => p.id));
    const saved = (await getFruits(forestId)).filter((f) => f.color === color).pop();
    const questions = saved?.questions.filter((q) => ids.has(q.seedId)) ?? [];
    const settings = await getSettings();
    return { pads, fruit: saved && questions.length ? { ...saved, questions } : null, hasGeminiKey: Boolean(settings.geminiKey), hasCerebrasKey: Boolean(settings.cerebrasKey) };
  }, [forestId, color, reloadToken]);

  const [making, setMaking] = useState<QuizMaker | null>(null);
  // Why Gemini could not be used, if it failed and the quiz was made without AI instead.
  const [notice, setNotice] = useState<string | null>(null);
  const pad = spriteLabel('lilypad', useThemeId()).toLowerCase(); // "lily pad", or the theme's own name for it

  async function make(maker: QuizMaker) {
    if (!data) return;
    // Read at click time so a lily pad planted after the page loaded is included in a remake.
    const pads = quizPads(await getSeedsForForest(forestId)).slice(0, MAX_QUESTIONS);
    setMaking(maker);
    setNotice(null);
    let questions: Question[] = [];
    let generatedBy: AiProvider | undefined;
    if (maker === 'gemini' || maker === 'cerebras') {
      try {
        questions = await aiQuizQuestions(pads, maker);
        generatedBy = maker;
      } catch (error) {
        console.error(`[${maker}] quiz generation failed`, error);
        setNotice(`${error instanceof Error ? error.message : String(error)} The quiz was made without AI instead.`);
      }
    }
    if (questions.length === 0) questions = fillBlankQuestions(pads);
    if (questions.length === 0) setNotice(`These ${pad}s have too little text to ask about. Highlight a full sentence with a ${pad}.`);
    else {
      await saveFruit({ forestId, color, questions, provider: generatedBy });
      setReloadToken((token) => token + 1);
    }
    setMaking(null);
  }

  return { data, make, making, notice };
}
