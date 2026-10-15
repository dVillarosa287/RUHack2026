// The apple's active recall question, made when it is planted: the paragraph around the highlight, with the
// highlighted part blanked out. The user later fills in what they highlighted. No AI is needed.
import type { Question } from '@/lib/storage';

const BLANK = '_____';
/** The nearest of these around the highlight is "the paragraph" the question is made from. */
const BLOCKS = 'p, li, dd, dt, td, th, blockquote, figcaption, h1, h2, h3, h4, h5, h6, pre, section, article, div';
/** At most this much text is kept on each side of the blank, so the question stays readable. */
const MAX_SIDE = 150;

const tidy = (text: string) => text.replace(/\s+/g, ' ');

/** An apple's question is saved as a Quiz with this "color" (one question, as decided in BACKLOG.md D1). */
export const appleFruitKey = (seedId: string) => `apple:${seedId}`;

/** The closest block element around the whole highlight. */
function blockAround(range: Range): Element {
  const node = range.commonAncestorContainer;
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest(BLOCKS) ?? document.body;
}

/** One fill-in-the-blank question for an apple: the highlighted text is the answer. */
export function recallQuestion(range: Range, highlighted: string, seedId: string): Question {
  const block = blockAround(range);
  const before = document.createRange();
  before.setStart(block, 0);
  before.setEnd(range.startContainer, range.startOffset);
  const after = document.createRange();
  after.setStart(range.endContainer, range.endOffset);
  after.setEnd(block, block.childNodes.length);

  let start = tidy(before.toString()).trimStart();
  let end = tidy(after.toString()).trimEnd();
  if (start.length > MAX_SIDE) start = `…${start.slice(-MAX_SIDE).replace(/^\S*\s/, '')}`;
  if (end.length > MAX_SIDE) end = `${end.slice(0, MAX_SIDE).replace(/\s\S*$/, '')}…`;

  return { seedId, type: 'fill-blank', prompt: `${start}${BLANK}${end}`, choices: [], answer: highlighted };
}
