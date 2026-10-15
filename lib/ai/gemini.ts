// Calls to Google's Gemini API. Runs in the background worker only (CLAUDE.md: Gemini is called from there, only
// when the user asks, with one request per quiz and JSON output). The viewer asks for it with lib/ai/index.ts.
import type { Question, Seed, SpriteType } from '@/lib/storage';
import { shuffle } from './fillBlank';

/** The free-tier Flash model listed in Google AI Studio on the day (BACKLOG.md D5). Change it here when Google retires it. */
export const GEMINI_MODEL = 'gemini-3.8-flash';
export const CEREBRAS_MODEL = 'qwen-3.8-27b';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const CEREBRAS_ENDPOINT = 'https://api.cerebras.ai/v1/chat/completions';
const MAX_QUESTIONS = 10;
/** A custom quiz (with a `mix`) may ask for up to this many questions. */
const MAX_MIX_QUESTIONS = 20;
export type AiProvider = 'gemini' | 'cerebras';
const providerName = (provider: AiProvider) => provider === 'cerebras' ? 'Cerebras' : 'Gemini';

/**
 * What the viewer sends: just the saved text, so nothing else from storage leaves the browser. A lily pad taken with
 * the camera also sends its screenshot (a JPEG data URL), to Gemini only: Cerebras cannot read images.
 */
export type QuizSource = Pick<Seed, 'id' | 'text' | 'pageTitle'> & { image?: string };
export type SummarySource = Pick<Seed, 'text' | 'pageTitle' | 'note'>;
/** How many questions of each style a custom quiz asks for. Each matching question is one group of rows. */
export interface QuizMix {
  multipleChoice: number;
  typeIn: number;
  matching: number;
}
/** One piece of a request: text, or an image (Gemini only). */
type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

/** A failure the user can act on, with a message to show them. */
export class GeminiError extends Error {}
  
/** The shape Gemini must answer in. Gemini checks its own output against this, so the JSON always parses. */
const QUIZ_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          seedId: { type: 'STRING' },
          type: { type: 'STRING', enum: ['multiple-choice', 'type-in'] },
          prompt: { type: 'STRING' },
          choices: { type: 'ARRAY', items: { type: 'STRING' } },
          answer: { type: 'STRING' },
        },
        required: ['seedId', 'type', 'prompt', 'choices', 'answer'],
      },
    },
    // One row per note for the single matching question at the end of the quiz.
    matching: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { seedId: { type: 'STRING' }, left: { type: 'STRING' }, right: { type: 'STRING' } },
        required: ['seedId', 'left', 'right'],
      },
    },
  },
  required: ['questions'],
};
/** The same, for a custom quiz: `matching` is a list of groups, one per matching question. */
const MIX_QUIZ_SCHEMA = {
  ...QUIZ_SCHEMA,
  properties: {
    ...QUIZ_SCHEMA.properties,
    matching: { type: 'ARRAY', items: { type: 'OBJECT', properties: { rows: QUIZ_SCHEMA.properties.matching }, required: ['rows'] } },
  },
};
/** The blank in a type-in prompt, and the most rows a matching question has. */
const BLANK = '_____';
const MAX_MATCHING_ROWS = 6;

async function generate(provider: AiProvider, key: string, parts: Part[], schema?: object): Promise<string> {
  if (!key) throw new GeminiError(`Add your ${providerName(provider)} API key on the Settings page first.`);
  let response: Response;
  try {
    response = provider === 'cerebras'
      ? await fetch(CEREBRAS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: CEREBRAS_MODEL,
            messages: [
              ...(schema ? [{ role: 'system', content: `Return only valid JSON matching this schema: ${JSON.stringify(schema)}` }] : []),
              { role: 'user', content: parts.map((part) => ('text' in part ? part.text : '')).join('\n') },
            ],
            ...(schema ? { response_format: { type: 'json_object' } } : {}),
          }),
        })
      : await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: schema ? { responseMimeType: 'application/json', responseSchema: schema } : {},
          }),
        });
  } catch {
    throw new GeminiError(`Could not reach ${providerName(provider)}. Check your internet connection.`);
  }
  const body = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    choices?: { message?: { content?: string } }[];
  };
  if (!response.ok) {
    const name = providerName(provider);
    if (response.status === 429) throw new GeminiError(`${name} says too many requests. Wait a minute and try again.`);
    if (response.status === 400 || response.status === 403) throw new GeminiError(`${name} did not accept the key or request: ${body.error?.message ?? response.status}`);
    if (response.status === 404) throw new GeminiError(`${name} does not know the model "${provider === 'cerebras' ? CEREBRAS_MODEL : GEMINI_MODEL}".`);
    throw new GeminiError(`${name} returned an error: ${body.error?.message ?? response.status}`);
  }
  const text = provider === 'cerebras'
    ? body.choices?.[0]?.message?.content ?? ''
    : body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text) throw new GeminiError(`${providerName(provider)} sent an empty answer. Try again.`);
  return text;
}

/** Qwen may wrap JSON in reasoning text or a Markdown fence even when JSON mode is requested. */
function parseJsonResponse(raw: string, provider: AiProvider): unknown {
  const withoutThinking = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const fenced = withoutThinking.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced ?? withoutThinking;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  const json = start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;
  try {
    return JSON.parse(json);
  } catch {
    throw new GeminiError(`${providerName(provider)} sent questions that could not be read. Try again.`);
  }
}

/** A tiny request to check that the key and the model name work. Used by the "Test key" button in Settings. */
export async function testAi(provider: AiProvider, key: string): Promise<void> {
  await generate(provider, key, [{ text: 'Reply with the single word: ok' }]);
}

/** Multiple-choice questions for a quiz: one request for all of them. Bad items from Gemini are dropped, not shown. */
export async function quizQuestions(key: string, sources: QuizSource[], provider: AiProvider = 'gemini', mix?: QuizMix): Promise<Question[]> {
  // A screenshot is enough on its own with Gemini; Cerebras cannot see it, so those lily pads are left out there.
  const hasImage = (s: QuizSource) => provider === 'gemini' && Boolean(s.image);
  const usable = sources.filter((s) => hasImage(s) || s.text.trim().split(/\s+/).length >= 4).slice(0, mix ? MAX_MIX_QUESTIONS : MAX_QUESTIONS);
  if (usable.length === 0) throw new GeminiError('There is too little saved text here to ask about.');

  const notes = usable.map((s) => ({ seedId: s.id, page: s.pageTitle, text: hasImage(s) ? `(A screenshot, sent as an image below. Text in it: ${s.text.slice(0, 500)})` : s.text.slice(0, 1500) }));
  // Each screenshot goes after the text, labelled with its seedId, as an inline JPEG.
  const images: Part[] = usable.filter(hasImage).flatMap((s) => [
    { text: `Screenshot for seedId ${s.id}:` },
    { inlineData: { mimeType: 'image/jpeg', data: s.image!.slice(s.image!.indexOf(',') + 1) } },
  ]);
  const parts: Part[] = [
    {
      text: [
        'You write study questions for a student, for active recall.',
        ...(mix ? [
          `Below are notes the student highlighted on web pages, as JSON. Write exactly ${mix.multipleChoice} "multiple-choice" and exactly ${mix.typeIn} "type-in" questions,`,
          'each with the seedId of the note it comes from. A note may be used for more than one question when there are more questions than notes, but every question must test a different idea.',
          'Each question must be answerable from its note alone and test a key idea, not a trivial detail.',
        ] : [
          'Below are notes the student highlighted on web pages, as JSON. Write exactly one question for each note,',
          "using that note's seedId. Each question must be answerable from its note alone and test the key idea, not a trivial detail.",
        ]),
        'Write every question, every type-in sentence and every matching row in your own words: rephrase the idea, and never copy a sentence from the note.',
        mix ? 'The two styles:' : 'Mix two styles, about half of each:',
        '- "multiple-choice": exactly 4 short choices, one correct and three plausible but wrong. The answer must be copied exactly from the choices.',
        `- "type-in": a new full sentence of at least 8 words, in your own words, that tests the key idea, with "${BLANK}" in place of a key term of 1 to 3 words. The answer is that term; choices is [].`,
        'Do not mention "the note" or "the text" in the question.',
        ...(images.length > 0 ? ['Some notes are screenshots, sent as images after this text, each labelled with its seedId. Ask about what the image shows (a diagram, chart, formula or picture), without saying "the image" or "the screenshot".'] : []),
        mix
          ? mix.matching > 0
            ? `Also give a "matching" array of exactly ${mix.matching} groups. Each group is { "rows": [...] } with 3 to 5 rows: seedId, "left" a short term or concept from that note (at most 6 words), "right" a short definition of it in your own words (at most 15 words), not a sentence copied from the note. Within a group every left and every right must be different; different groups should cover different ideas.`
            : 'Give an empty "matching" array.'
          : usable.length >= 3
          ? `Also give a "matching" array with one row per note (3 to ${MAX_MATCHING_ROWS} rows): seedId, "left" a short term or concept from that note (at most 6 words), "right" a short definition of it in your own words (at most 15 words), not a sentence copied from the note. Every left and every right must be different.`
          : 'Give an empty "matching" array.',
        'Return exactly one JSON object with a "questions" array and a "matching" array. Each question must contain exactly these fields: seedId, type, prompt, choices, answer.',
        '',
        JSON.stringify(notes),
      ].join('\n'),
    },
    ...images,
  ];

  const raw = await generate(provider, key, parts, mix ? MIX_QUIZ_SCHEMA : QUIZ_SCHEMA);
  const parsed = parseJsonResponse(raw, provider) as { questions?: unknown; matching?: unknown };

  const ids = new Map(usable.map((s) => [s.id, s.text])); // seed id -> its note, to spot copied questions
  // Without a mix there is one question per note; with one, a note can be asked about more than once, but not the same prompt.
  const seen = new Set<string>();
  const seenKey = (seedId: string, prompt: string) => (mix ? tidy(prompt) : seedId);
  const questions: Question[] = [];
  for (const item of Array.isArray(parsed.questions) ? parsed.questions : []) {
    const q = item as Partial<Question>;
    const seedId = String(q.seedId ?? '');
    const answerText = String(q.answer ?? '').trim();
    if (!ids.has(seedId) || !q.prompt || seen.has(seenKey(seedId, String(q.prompt)))) continue;
    if (q.type === 'type-in') {
      // Some models write the blank with more or fewer underscores; make it the one the quiz shows.
      const prompt = String(q.prompt).trim().replace(/_{3,}/g, BLANK);
      if (!prompt.includes(BLANK) || !answerText || answerText.split(/\s+/).length > 3 || answerText.length > 40) continue;
      // Not a bare blank, and not the note itself with one word taken out.
      if (wordsOf(prompt.replace(BLANK, ' ')).length < 5 || tidy(prompt.replace(BLANK, answerText)) === tidy(ids.get(seedId) ?? '')) continue;
      if (mix && questions.filter((x) => x.type === 'type-in').length >= mix.typeIn) continue; // more than asked for
      seen.add(seenKey(seedId, String(q.prompt)));
      questions.push({ seedId, type: 'type-in', prompt, choices: [], answer: answerText });
      continue;
    }
    const choices = Array.isArray(q.choices) ? [...new Set(q.choices.map((c) => String(c).trim()).filter(Boolean))] : [];
    const answer = choices.find((choice) => choice === answerText)
      ?? choices.find((choice) => choice.toLowerCase() === answerText.toLowerCase());
    if (choices.length < 2 || !answer) continue;
    if (mix && questions.filter((x) => x.type === 'multiple-choice').length >= mix.multipleChoice) continue; // more than asked for
    seen.add(seenKey(seedId, String(q.prompt)));
    questions.push({ seedId, type: 'multiple-choice', prompt: String(q.prompt).trim(), choices, answer });
  }
  if (mix) return mixedQuiz(questions, parsed.matching, usable, ids, mix, provider);
  if (questions.length === 0) throw new GeminiError(`${providerName(provider)} did not send any usable questions. Try again.`);
  // Keep the order of the lily pads, which is the order the frog hops in. The matching question goes last.
  const ordered = usable.map((s) => questions.find((q) => q.seedId === s.id)).filter((q): q is Question => q !== undefined);
  const matching = matchingQuestion(Array.isArray(parsed.matching) ? parsed.matching : [], ids);
  return matching ? [...ordered, matching] : ordered;
}

/** A custom quiz: the valid questions in lily pad order, then up to `mix.matching` matching questions, one per valid group. */
function mixedQuiz(questions: Question[], groups: unknown, usable: QuizSource[], ids: Map<string, string>, mix: QuizMix, provider: AiProvider): Question[] {
  const order = (q: Question) => usable.findIndex((s) => s.id === q.seedId);
  const matching = (Array.isArray(groups) ? groups : [])
    .map((group) => (group as { rows?: unknown }).rows)
    .map((rows) => matchingQuestion(Array.isArray(rows) ? rows : [], ids))
    .filter((q): q is Question => q !== null)
    .slice(0, mix.matching);
  const all = [...[...questions].sort((a, b) => order(a) - order(b)), ...matching];
  if (all.length === 0) throw new GeminiError(`${providerName(provider)} did not send any usable questions. Try again.`);
  return all;
}

/** Lower-case words, and text with only its letters and digits, for comparing a question with its note. */
const wordsOf = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
const tidy = (text: string) => wordsOf(text).join('');
/** More than this many words in a row taken from the note counts as copied. */
const MAX_COPIED_RUN = 8;

/** Whether `side` has a run of more than MAX_COPIED_RUN words copied from `note`. */
function copiesNote(side: string, note: string): boolean {
  const run = MAX_COPIED_RUN + 1;
  const sideWords = wordsOf(side);
  if (sideWords.length < run) return false;
  const noteText = ` ${wordsOf(note).join(' ')} `;
  for (let i = 0; i + run <= sideWords.length; i++) {
    if (noteText.includes(` ${sideWords.slice(i, i + run).join(' ')} `)) return true;
  }
  return false;
}

/** One matching question from the AI's rows, keeping only good rows with unique sides. Null if fewer than 3 are left. */
function matchingQuestion(items: unknown[], ids: Map<string, string>): Question | null {
  const pairs: { left: string; right: string }[] = [];
  let seedId = '';
  const lefts = new Set<string>();
  const rights = new Set<string>();
  for (const item of items) {
    const row = item as { seedId?: unknown; left?: unknown; right?: unknown };
    const left = String(row.left ?? '').trim().slice(0, 120);
    const right = String(row.right ?? '').trim().slice(0, 160);
    const note = ids.get(String(row.seedId ?? ''));
    if (note === undefined || !left || !right || copiesNote(left, note) || copiesNote(right, note)) continue;
    if (lefts.has(left.toLowerCase()) || rights.has(right.toLowerCase())) continue;
    lefts.add(left.toLowerCase());
    rights.add(right.toLowerCase());
    seedId ||= String(row.seedId);
    pairs.push({ left, right });
    if (pairs.length >= MAX_MATCHING_ROWS) break;
  }
  if (pairs.length < 3) return null;
  return { seedId, type: 'matching', prompt: 'Match each term to its meaning', choices: shuffle(pairs.map((p) => p.right)), answer: '', pairs };
}

/** A concise study guide for the saved notes in one forest. */
export async function forestSummary(key: string, forestName: string, sources: SummarySource[], provider: AiProvider = 'gemini'): Promise<string> {
  const usable = sources.filter((s) => s.text.trim().length > 0).slice(0, 100);
  if (usable.length === 0) throw new GeminiError('There is no saved text here to summarize.');

  const notes = usable.map((s) => ({ page: s.pageTitle || 'Untitled page', text: s.text.slice(0, 2000), note: s.note?.slice(0, 500) }));
  const raw = await generate(provider, key, [{
    text: [
      `Create a useful study guide for the forest named "${forestName}".`,
      'Summarize the saved highlights into a short title, an overview paragraph, and concise bullet points grouped by page.',
      'Use only the supplied material. Do not invent facts, citations, or sections for pages with no useful text.',
      'Return plain Markdown only. Do not wrap the answer in a code fence.',
      '',
      JSON.stringify(notes),
    ].join('\n'),
  }]);
  return raw.trim();
}

// ---------- grow from link ----------

/** At most this many new seeds from one page, and this many roots, so one link never floods the graph. */
const MAX_IDEAS = 20;
const MAX_LINK_ROOTS = 20;
/**
 * The sprites a key idea may be planted as. Similar ideas share one (a theme); lilypad is for quiz facts, so the
 * forest's quiz can use them. Never fruitsprout: no apples from a link. index.ts replaces anything else with LINK_SPRITE.
 */
export const LINK_IDEA_SPRITES: SpriteType[] = ['sprout', 'mushroom', 'house', 'flower', 'cat', 'grass', 'owl', 'rock', 'lilypad'];

/** What "Grow from link" sends: the page that was read, and the forest's seeds to connect it to. */
export interface LinkPage {
  url: string;
  title: string;
  text: string;
}
export type LinkSource = Pick<Seed, 'id' | 'text' | 'pageTitle' | 'note'>;
/** A key idea from the page: a sentence copied from it, a few words to show on its node, a short explanation, and its sprite (unchecked here). */
export interface LinkIdea {
  quote: string;
  label: string;
  note: string;
  sprite: string;
}
/** A root to grow. `from` and `to` are a seed id, or "new-1", "new-2"... for the ideas, counted from 1. */
export interface LinkRoot {
  from: string;
  to: string;
  reason: string;
}

const LINK_SCHEMA = {
  type: 'OBJECT',
  properties: {
    ideas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { quote: { type: 'STRING' }, label: { type: 'STRING' }, note: { type: 'STRING' }, sprite: { type: 'STRING', enum: LINK_IDEA_SPRITES } },
        required: ['quote', 'label', 'note', 'sprite'],
      },
    },
    connections: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { from: { type: 'STRING' }, to: { type: 'STRING' }, reason: { type: 'STRING' } },
        required: ['from', 'to', 'reason'],
      },
    },
  },
  required: ['ideas', 'connections'],
};

/**
 * Reads one web page and picks its key ideas, then says which of the forest's seeds each idea connects to (and which
 * ideas connect to each other), with a short reason. One request. Bad items from Gemini are dropped, not shown.
 */
export async function linkConnections(key: string, page: LinkPage, sources: LinkSource[], provider: AiProvider = 'gemini'): Promise<{ ideas: LinkIdea[]; roots: LinkRoot[] }> {
  const notes = sources
    .filter((s) => s.text.trim() || s.note?.trim())
    .slice(0, 150)
    .map((s) => ({ seedId: s.id, page: s.pageTitle, text: s.text.slice(0, 300), note: s.note?.slice(0, 200) }));
  const raw = await generate(provider, key, [{
    text: [
      'A student is collecting notes on a topic. They gave you a new web page to add to their notes.',
      `1. Cover all the important information on the page, in up to ${MAX_IDEAS} ideas: every idea a student would review`,
      '   for a test (definitions, key claims, causes and effects, important numbers, names or dates), from every section',
      '   of the page, not only the opening. Fewer ideas are fine for a short page.',
      '   Skip menus, image captions, references, citations and "see also" lists. Skip any idea that repeats one of the',
      '   existing notes below. For each idea, copy ONE sentence from the page text exactly, character for character',
      '   (do not fix, shorten or join sentences), as "quote", and write a label of at most 6 words.',
      '   Also write a "note": 1 to 2 plain sentences (at most 200 characters) explaining the idea in a student\'s own words.',
      '   Give each idea a "sprite". First sort the page\'s ideas into a few themes (2 to 5) and give each theme its own',
      '   sprite, so every idea in one theme uses the same sprite. For example, a page on World War 2 could put the Allied',
      '   Powers on "sprout" and the Axis Powers on "cat". Theme sprites: sprout, mushroom, house, flower, cat, grass, owl, rock.',
      '   "lilypad" is not a theme: use it for a single fact that makes a good quiz question (a definition, date, name or number).',
      '2. Connect the ideas to the student\'s existing notes (listed below as JSON) where they are truly related: same concept,',
      '   cause and effect, an example of, a contrast with. Also connect ideas to each other where it helps.',
      '   Refer to an idea as "new-1", "new-2"... in the order you listed them, and to a note by its seedId.',
      '   Every connection must include at least one idea. Give each a reason of at most 12 words. Do not invent weak links;',
      '   it is fine to connect an idea to nothing.',
      '',
      `Page title: ${page.title}`,
      `Page text: ${page.text}`,
      '',
      `Existing notes: ${JSON.stringify(notes)}`,
    ].join('\n'),
  }], LINK_SCHEMA);

  const parsed = parseJsonResponse(raw, provider) as { ideas?: unknown; connections?: unknown };

  // Keep the good ideas, and remember what each of Gemini's numbers is now, as some may have been dropped.
  const ideas: LinkIdea[] = [];
  const renumber = new Map<string, string>();
  (Array.isArray(parsed.ideas) ? parsed.ideas : []).forEach((item, i) => {
    const idea = item as Partial<LinkIdea>;
    const quote = String(idea.quote ?? '').trim();
    if (!quote || ideas.length >= MAX_IDEAS || ideas.some((kept) => kept.quote === quote)) return;
    ideas.push({ quote: quote.slice(0, 500), label: String(idea.label ?? '').trim().slice(0, 60), note: String(idea.note ?? '').trim().slice(0, 300), sprite: String(idea.sprite ?? '').trim() });
    renumber.set(`new-${i + 1}`, `new-${ideas.length}`);
  });
  if (ideas.length === 0) throw new GeminiError(`${providerName(provider)} did not find any key ideas on that page. Try another link.`);

  const ids = new Set(notes.map((n) => n.seedId));
  // An idea's new number, or a seed id that was sent. Anything else (a dropped idea, a made-up id) is undefined.
  const resolve = (end: unknown) => (String(end).startsWith('new-') ? renumber.get(String(end)) : ids.has(String(end)) ? String(end) : undefined);
  const pairs = new Set<string>();
  const roots: LinkRoot[] = [];
  for (const item of Array.isArray(parsed.connections) ? parsed.connections : []) {
    const c = item as Partial<LinkRoot>;
    const from = resolve(c.from);
    const to = resolve(c.to);
    if (!from || !to || from === to || !(from.startsWith('new-') || to.startsWith('new-'))) continue;
    const pair = [from, to].sort().join(' ');
    if (pairs.has(pair)) continue;
    pairs.add(pair);
    roots.push({ from, to, reason: String(c.reason ?? '').trim().slice(0, 200) });
    if (roots.length >= MAX_LINK_ROOTS) break;
  }
  return { ideas, roots };
}
