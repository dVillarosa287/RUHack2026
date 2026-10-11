// Fill-in-the-blank questions, made from the saved text alone. No AI and no network, so it always works:
// it is the fallback when there is no Gemini key, when Gemini fails, or when the user is offline.
import type { Question, Seed } from '@/lib/storage';

const BLANK = '_____';
/** Words this short, or in this list, are never blanked: they are too easy to guess or say nothing. */
const MIN_WORD_LENGTH = 4;
const COMMON_WORDS = new Set(
  'about above after again against also although among another because been before being below between both cannot could does doing down during each either else enough even every from further have having here however into itself just least less many more most much must never only other over same should since some such than that their them then there these they this those though through under until upon very were what when where whether which while whom whose will with within without would your'.split(' '),
);
/** A prompt is cut to the sentence around the blank, at most this many characters, so it fits on a lily pad. */
const MAX_PROMPT_LENGTH = 220;
const CHOICES = 4;
/** At least one word is enough to make a typed-answer question; every pad should remain represented. */
const MIN_WORDS = 1;

/** Words as they are written, with their position in the text. Only letters, digits, hyphens and apostrophes. */
function wordsIn(text: string): { word: string; index: number }[] {
  return [...text.matchAll(/[\p{L}\p{N}][\p{L}\p{N}'’-]*[\p{L}\p{N}]/gu)].map((m) => ({ word: m[0], index: m.index ?? 0 }));
}

const plain = (word: string) => word.toLowerCase().replace(/[’']/g, "'");

function isCandidate(word: string): boolean {
  return word.length >= MIN_WORD_LENGTH && !COMMON_WORDS.has(plain(word)) && !/^\d+$/.test(word);
}

/**
 * How good a word is to blank out. A key term is usually long, or a name, or a number with letters (CO2).
 * The first word of the text is not favored for its capital letter, since every sentence starts with one.
 */
function score(word: string, index: number): number {
  let points = Math.min(word.length, 12);
  if (index > 0 && /^\p{Lu}/u.test(word)) points += 4;
  if (/\d/.test(word)) points += 3;
  if (word.includes('-')) points += 2;
  return points;
}

/** The sentence around position `at`, shortened to MAX_PROMPT_LENGTH with "…" where it was cut. */
function sentenceAround(text: string, at: number, length: number): { text: string; offset: number } {
  const before = text.slice(0, at);
  const after = text.slice(at + length);
  let start = Math.max(before.lastIndexOf('. '), before.lastIndexOf('? '), before.lastIndexOf('! '));
  start = start === -1 ? 0 : start + 2;
  const endMatch = after.search(/[.?!](\s|$)/);
  const end = endMatch === -1 ? text.length : at + length + endMatch + 1;
  let sentence = text.slice(start, end).trim();
  let offset = at - start - (text.slice(start, end).length - text.slice(start, end).trimStart().length);
  if (sentence.length > MAX_PROMPT_LENGTH) {
    // Keep the blank in view: take a window around it.
    const from = Math.max(0, Math.min(offset - Math.floor(MAX_PROMPT_LENGTH / 2), sentence.length - MAX_PROMPT_LENGTH));
    const cut = sentence.slice(from, from + MAX_PROMPT_LENGTH);
    sentence = `${from > 0 ? '…' : ''}${cut}${from + MAX_PROMPT_LENGTH < sentence.length ? '…' : ''}`;
    offset = offset - from + (from > 0 ? 1 : 0);
  }
  return { text: sentence, offset };
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

/** One question for one seed, or null if its text has no word worth blanking. `others` supplies wrong choices. */
export function fillBlankQuestion(seed: Seed, others: Seed[] = []): Question | null {
  const text = seed.text.replace(/\s+/g, ' ').trim();
  if (wordsIn(text).length < MIN_WORDS) return null;
  const allWords = wordsIn(text);
  const best = allWords
    .filter(({ word }) => isCandidate(word))
    .sort((a, b) => score(b.word, b.index) - score(a.word, a.index))[0]
    ?? allWords
      .filter(({ word }) => word.length > 1)
      .sort((a, b) => b.word.length - a.word.length)[0]
    ?? allWords[0];
  if (!best) return null;

  const { text: sentence, offset } = sentenceAround(text, best.index, best.word.length);
  const prompt = sentence.slice(0, offset) + BLANK + sentence.slice(offset + best.word.length);

  // Wrong choices: other good words, from the other seeds first (they are about the same topic), then this one.
  const taken = new Set([plain(best.word)]);
  const pool: string[] = [];
  for (const source of [...others.filter((s) => s.id !== seed.id).map((s) => s.text), text]) {
    for (const { word } of wordsIn(source)) {
      if (isCandidate(word) && !taken.has(plain(word))) {
        taken.add(plain(word));
        pool.push(word);
      }
    }
  }
  // Prefer wrong choices that look like the answer: about the same length, and capitalized the same way.
  const looksAlike = (w: string) => Math.abs(w.length - best.word.length) + (/^\p{Lu}/u.test(w) === /^\p{Lu}/u.test(best.word) ? 0 : 4);
  const wrong = shuffle(pool).sort((a, b) => looksAlike(a) - looksAlike(b)).slice(0, CHOICES - 1);

  return {
    seedId: seed.id,
    type: 'fill-blank',
    prompt,
    // With too few other words to choose from, the user types the answer instead (no choices).
    choices: wrong.length >= 2 ? shuffle([best.word, ...wrong]) : [],
    answer: best.word,
  };
}

/** One fill-in-the-blank question per seed that has usable text, in the order given. */
export function fillBlankQuestions(seeds: Seed[]): Question[] {
  return seeds.map((seed) => fillBlankQuestion(seed, seeds)).filter((q): q is Question => q !== null);
}

/**
 * Whether a typed or picked answer is right. Case, punctuation and spacing do not matter anywhere, because an answer
 * can be a whole highlighted phrase ("light-dependent reactions" and "Light dependent reactions" are both right).
 */
export function isCorrectAnswer(question: Question, given: string): boolean {
  const tidy = (s: string) => plain(s).replace(/[^\p{L}\p{N}]+/gu, '');
  return tidy(given) !== '' && tidy(given) === tidy(question.answer);
}
