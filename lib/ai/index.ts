// What the viewer and the page use for AI features. Gemini itself is only ever called from the background worker
// (entrypoints/background.ts), so these functions send it a message and wait for the answer.
import { browser } from 'wxt/browser';
import type { Question, Seed } from '@/lib/storage';
import type { QuizSource } from './gemini';

export { fillBlankQuestion, fillBlankQuestions, isCorrectAnswer } from './fillBlank';
export { GEMINI_MODEL } from './gemini';

/** The messages the background worker answers. */
export type AiRequest = { type: 'forest:ai-test' } | { type: 'forest:ai-quiz'; sources: QuizSource[] };
export type AiReply<T> = { ok: true; value: T } | { ok: false; error: string };

async function ask<T>(request: AiRequest): Promise<T> {
  const reply = (await browser.runtime.sendMessage(request)) as AiReply<T> | undefined;
  if (!reply) throw new Error('The extension did not answer. Reload the extension and try again.');
  if (!reply.ok) throw new Error(reply.error);
  return reply.value;
}

/** Checks the saved Gemini key and the model name with a tiny request. Throws with a readable message if it fails. */
export function testGeminiKey(): Promise<true> {
  return ask<true>({ type: 'forest:ai-test' });
}

/** Gemini's multiple-choice questions for these lily pads, in one request. Throws with a readable message if it fails. */
export function geminiQuizQuestions(seeds: Seed[]): Promise<Question[]> {
  return ask<Question[]>({ type: 'forest:ai-quiz', sources: seeds.map(({ id, text, pageTitle }) => ({ id, text, pageTitle })) });
}
