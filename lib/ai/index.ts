// What the viewer and the page use for AI features. Gemini itself is only ever called from the background worker
// (entrypoints/background.ts), so these functions send it a message and wait for the answer.
import { browser } from 'wxt/browser';
import { addRoot, getScreenshot, saveSeed, type Question, type Seed, type SpriteType } from '@/lib/storage';
import { spriteColorKey } from '@/lib/theme';
import type { AiProvider, LinkIdea, LinkPage, LinkRoot, LinkSource, QuizMix, SummarySource, QuizSource } from './gemini';
import { cleanUrl } from '@/lib/storage/url';
import { normalizeText, quoteAnchor, readPage } from './readPage';

export { fillBlankQuestion, fillBlankQuestions, isCorrectAnswer } from './fillBlank';
export { CEREBRAS_MODEL, GEMINI_MODEL } from './gemini';
export type { AiProvider, QuizMix } from './gemini';

/** The messages the background worker answers. */
export type AiRequest =
  | { type: 'forest:ai-test'; provider: AiProvider }
  | { type: 'forest:ai-quiz'; provider: AiProvider; sources: QuizSource[]; mix?: QuizMix }
  | { type: 'forest:ai-summary'; provider: AiProvider; forestName: string; sources: SummarySource[] }
  | { type: 'forest:ai-link'; provider: AiProvider; page: LinkPage; sources: LinkSource[] };
export type AiReply<T> = { ok: true; value: T } | { ok: false; error: string };

async function ask<T>(request: AiRequest): Promise<T> {
  const reply = (await browser.runtime.sendMessage(request)) as AiReply<T> | undefined;
  if (!reply) throw new Error('The extension did not answer. Reload the extension and try again.');
  if (!reply.ok) throw new Error(reply.error);
  return reply.value;
}

/** Checks the saved Gemini key and the model name with a tiny request. Throws with a readable message if it fails. */
export function testAiKey(provider: AiProvider): Promise<true> {
  return ask<true>({ type: 'forest:ai-test', provider });
}

/**
 * Gemini's multiple-choice questions for these lily pads, in one request. A lily pad taken with the camera sends its
 * screenshot too, to Gemini only (Cerebras cannot read images). Throws with a readable message if it fails.
 */
export async function aiQuizQuestions(seeds: Seed[], provider: AiProvider, mix?: QuizMix): Promise<Question[]> {
  const sources = await Promise.all(
    seeds.map(async ({ id, text, pageTitle, kind }) => {
      const image = provider === 'gemini' && kind === 'media' ? await getScreenshot(id) : null;
      return { id, text, pageTitle, ...(image ? { image } : {}) };
    }),
  );
  return ask<Question[]>({ type: 'forest:ai-quiz', provider, mix, sources });
}

/** Gemini's study-guide summary for a forest. */
export function aiForestSummary(forestName: string, seeds: Seed[], provider: AiProvider): Promise<string> {
  return ask<string>({ type: 'forest:ai-summary', provider, forestName, sources: seeds.map(({ text, pageTitle, note }) => ({ text, pageTitle, note })) });
}

/** The sprite the key ideas from a link are planted as. Grass is an ordinary sprite that never grows. */
export const LINK_SPRITE: SpriteType = 'grass';

/**
 * "Grow from link": reads the page at `address`, asks the selected AI provider (one request) for its key ideas and how they connect to
 * the forest's `seeds`, then saves each idea as a seed from that page and each connection as a root (source 'ai').
 * Two or more seeds from one page also get a large tree in the graph. Throws with a readable message if anything fails.
 */
export async function growFromLink(forestId: string, address: string, seeds: Seed[], provider: AiProvider, onStep?: (step: string) => void): Promise<{ title: string; seeds: number; roots: number }> {
  onStep?.('Reading the page…');
  const page = await readPage(address);
  onStep?.(`Asking ${provider === 'cerebras' ? 'Cerebras' : 'Gemini'}…`);
  const sources = seeds.map(({ id, text, pageTitle, note }) => ({ id, text, pageTitle, note }));
  const { ideas, roots } = await ask<{ ideas: LinkIdea[]; roots: LinkRoot[] }>({ type: 'forest:ai-link', provider, page, sources });

  onStep?.('Planting…');
  // Running the same link twice must not plant the same sentence twice: compare with this page's seeds, normalized.
  const same = (text: string) => normalizeText(text).text.trim();
  const planted = new Set(seeds.filter((s) => cleanUrl(s.url) === page.url).map((s) => same(s.text)));
  const newIds = new Map<string, string>(); // "new-1" -> the saved seed's id
  for (const [i, idea] of ideas.entries()) {
    const anchor = quoteAnchor(page, idea.quote);
    const text = anchor?.quote?.exact ?? idea.quote; // the page's own words, when the quote was found
    if (planted.has(same(text))) continue;
    planted.add(same(text));
    const seed = await saveSeed({
      forestId,
      kind: 'highlight',
      spriteType: LINK_SPRITE,
      color: spriteColorKey(LINK_SPRITE),
      url: page.url,
      pageTitle: page.title,
      text,
      anchor,
      displayText: idea.label || undefined,
      note: idea.note || undefined,
    });
    newIds.set(`new-${i + 1}`, seed.id);
  }
  // A root to a dropped idea has nothing to join, so it is left out.
  const idOf = (end: string) => (end.startsWith('new-') ? newIds.get(end) : end);
  let grown = 0;
  for (const root of roots) {
    const fromSeedId = idOf(root.from);
    const toSeedId = idOf(root.to);
    if (!fromSeedId || !toSeedId) continue;
    await addRoot({ forestId, fromSeedId, toSeedId, source: 'ai', reason: root.reason });
    grown++;
  }
  return { title: page.title, seeds: newIds.size, roots: grown };
}
