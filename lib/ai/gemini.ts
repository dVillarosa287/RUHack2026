// Calls to Google's Gemini API. Runs in the background worker only (CLAUDE.md: Gemini is called from there, only
// when the user asks, with one request per quiz and JSON output). The viewer asks for it with lib/ai/index.ts.
import type { Question, Seed } from '@/lib/storage';

/** The free-tier Flash model listed in Google AI Studio on the day (BACKLOG.md D5). Change it here when Google retires it. */
export const GEMINI_MODEL = 'gemini-3.8-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_QUESTIONS = 10;

/** What the viewer sends: just the saved text, so nothing else from storage leaves the browser. */
export type QuizSource = Pick<Seed, 'id' | 'text' | 'pageTitle'>;
/** The same, plus the lily pad's screenshot (a JPEG data URL), which the background worker adds. */
export type QuizNote = QuizSource & { image?: string | null };

/** One piece of a request: some text, or an image. */
type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

/** A data URL ("data:image/jpeg;base64,...") as the image part Gemini expects. */
function imagePart(dataUrl: string): Part | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  return match?.[1] && match[2] ? { inline_data: { mime_type: match[1], data: match[2] } } : null;
}

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
          prompt: { type: 'STRING' },
          choices: { type: 'ARRAY', items: { type: 'STRING' } },
          answer: { type: 'STRING' },
        },
        required: ['seedId', 'prompt', 'choices', 'answer'],
      },
    },
  },
  required: ['questions'],
};

async function generate(key: string, parts: Part[], schema?: object): Promise<string> {
  if (!key) throw new GeminiError('Add your Gemini API key on the Settings page first.');
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: schema ? { responseMimeType: 'application/json', responseSchema: schema } : {},
      }),
    });
  } catch {
    throw new GeminiError('Could not reach Gemini. Check your internet connection.');
  }
  const body = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  if (!response.ok) {
    if (response.status === 429) throw new GeminiError('Gemini says too many requests. Wait a minute and try again.');
    if (response.status === 400 || response.status === 403) throw new GeminiError(`Gemini did not accept the key or request: ${body.error?.message ?? response.status}`);
    if (response.status === 404) throw new GeminiError(`Gemini does not know the model "${GEMINI_MODEL}". Its name may have changed (lib/ai/gemini.ts).`);
    throw new GeminiError(`Gemini returned an error: ${body.error?.message ?? response.status}`);
  }
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text) throw new GeminiError('Gemini sent an empty answer. Try again.');
  return text;
}

/** A tiny request to check that the key and the model name work. Used by the "Test key" button in Settings. */
export async function testGemini(key: string): Promise<void> {
  await generate(key, [{ text: 'Reply with the single word: ok' }]);
}

/**
 * Multiple-choice questions for a quiz: one request for all of them. Each lily pad is a screenshot the user took,
 * sent as an image, with the page's text from inside it. Bad items from Gemini are dropped, not shown.
 */
export async function quizQuestions(key: string, notes: QuizNote[]): Promise<Question[]> {
  const usable = notes.filter((n) => n.image || n.text.trim().split(/\s+/).length >= 4).slice(0, MAX_QUESTIONS);
  if (usable.length === 0) throw new GeminiError('These lily pads have no screenshot or text to ask about.');

  const parts: Part[] = [
    {
      text: [
        'You write study questions for a student, for active recall.',
        'Below are notes the student saved from web pages. Each note is a screenshot of part of a page (a figure, a table,',
        'a formula or a passage), given with the text found inside it. Write exactly one multiple-choice question for each',
        "note, using that note's seedId. Base it on what the screenshot shows, using the text to help read it. Each question",
        'must be answerable from its note alone and test the key idea, not a trivial detail.',
        'Give exactly 4 short choices, one of them correct and three plausible but wrong. The answer must be copied exactly from the choices.',
        'Do not mention "the note", "the image" or "the screenshot" in the question.',
      ].join('\n'),
    },
  ];
  for (const note of usable) {
    parts.push({ text: `\nNote seedId=${note.id}, from the page "${note.pageTitle}". Text inside it: ${note.text.slice(0, 1500) || '(none)'}` });
    const image = note.image ? imagePart(note.image) : null;
    if (image) parts.push(image);
  }

  const raw = await generate(key, parts, QUIZ_SCHEMA);
  let parsed: { questions?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new GeminiError('Gemini sent questions that could not be read. Try again.');
  }

  const ids = new Set(usable.map((s) => s.id));
  const seen = new Set<string>();
  const questions: Question[] = [];
  for (const item of Array.isArray(parsed.questions) ? parsed.questions : []) {
    const q = item as Partial<Question>;
    const choices = Array.isArray(q.choices) ? [...new Set(q.choices.map((c) => String(c).trim()).filter(Boolean))] : [];
    const answer = String(q.answer ?? '').trim();
    const seedId = String(q.seedId ?? '');
    if (!ids.has(seedId) || seen.has(seedId) || !q.prompt || choices.length < 2 || !choices.includes(answer)) continue;
    seen.add(seedId);
    questions.push({ seedId, type: 'multiple-choice', prompt: String(q.prompt).trim(), choices, answer });
  }
  if (questions.length === 0) throw new GeminiError('Gemini did not send any usable questions. Try again.');
  // Keep the order of the lily pads, which is the order the frog hops in.
  return usable.map((s) => questions.find((q) => q.seedId === s.id)).filter((q): q is Question => q !== undefined);
}
