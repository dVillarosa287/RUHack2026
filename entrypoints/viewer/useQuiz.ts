import { useState } from 'react';
import { aiQuizQuestions, fillBlankQuestions, type AiProvider, type QuizMix } from '@/lib/ai';
import { getFruits, getSeedsForForest, getSettings, saveFruit, type Fruit, type Question, type Seed } from '@/lib/storage';
import { spriteLabel, useThemeId } from '@/lib/theme';
import { quizPads } from './QuizBar';
import { useStored } from './useStored';

const MAX_QUESTIONS = 10;
/** A custom quiz (with a mix) can use up to this many lily pads. */
const MAX_MIX_QUESTIONS = 20;

export type QuizMaker = AiProvider | 'fill-blank';

export interface QuizData {
  /** The forest's lily pads, in planting order. */
  pads: Seed[];
  /**
   * Every saved quiz, oldest first, each with questions about pads that were removed since taken out (a quiz left with
   * none is left out). A quiz saved before names existed is named "Quiz <its position>".
   */
  fruits: Fruit[];
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
    const fruits = (await getFruits(forestId))
      .filter((f) => f.color === color)
      .map((f, i) => ({ ...f, name: f.name ?? `Quiz ${i + 1}`, questions: f.questions.filter((q) => ids.has(q.seedId)) }))
      .filter((f) => f.questions.length > 0);
    const settings = await getSettings();
    return { pads, fruits, hasGeminiKey: Boolean(settings.geminiKey), hasCerebrasKey: Boolean(settings.cerebrasKey) };
  }, [forestId, color, reloadToken]);

  const fruits = data?.fruits ?? [];

  const [making, setMaking] = useState<QuizMaker | null>(null);
  // Why Gemini could not be used, if it failed and the quiz was made without AI instead.
  const [notice, setNotice] = useState<string | null>(null);
  const pad = spriteLabel('lilypad', useThemeId()).toLowerCase(); // "lily pad", or the theme's own name for it

  /** Makes and saves a new quiz, and returns it (null if none was made). `mix` is the custom setup, AI only. */
  async function make(maker: QuizMaker, mix?: QuizMix): Promise<Fruit | null> {
    if (!data) return null;
    // Read at click time so a lily pad planted after the page loaded is included in a remake.
    const pads = quizPads(await getSeedsForForest(forestId)).slice(0, mix ? MAX_MIX_QUESTIONS : MAX_QUESTIONS);
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
    let fruit: Fruit | null = null;
    if (questions.length === 0) setNotice(`These ${pad}s have too little text to ask about. Highlight a full sentence with a ${pad}.`);
    else {
      fruit = await saveFruit({ forestId, color, questions, provider: generatedBy });
      setReloadToken((token) => token + 1);
    }
    setMaking(null);
    return fruit;
  }

  return { data, fruits, make, making, notice };
}
