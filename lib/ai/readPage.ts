// Reads a web page from its address, for "Grow from link". Runs in the viewer, not the background worker, because
// only a page has DOMParser to turn HTML into text. The extension's host permission lets it fetch any site.
import type { Anchor } from '@/lib/storage';
import { cleanUrl } from '@/lib/storage/url';

/** About 10,000 words: plenty for Gemini to find the key ideas, small enough for the free tier. */
const MAX_CHARS = 40_000;
/** The same amount of context either side of a quote as a highlight planted by hand (lib/engine/anchor.ts). */
const CONTEXT_CHARS = 32;

export interface ReadPage {
  url: string;
  title: string;
  text: string;
}

/** Fetches the page and returns its title and readable text. Throws with a message the user can act on. */
export async function readPage(address: string): Promise<ReadPage> {
  let url: URL;
  try {
    url = new URL(address.trim());
  } catch {
    throw new Error('That does not look like a web address. Paste the whole link, starting with https://');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only http and https links can be read.');

  let response: Response;
  try {
    response = await fetch(url, { credentials: 'omit' });
  } catch {
    throw new Error('Could not open that page. Check the link and your internet connection.');
  }
  if (!response.ok) throw new Error(`The page answered with error ${response.status}.`);
  const type = response.headers.get('content-type') ?? '';
  if (type.includes('pdf')) throw new Error('PDF links cannot be read yet. Open the PDF in Chrome and highlight it instead.');
  if (!type.includes('html')) throw new Error('That link is not a web page.');

  const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
  // Leave out what is not the page's own writing: code, menus, headers and footers.
  doc.querySelectorAll('script, style, noscript, template, svg, iframe, form, nav, footer, aside').forEach((el) => el.remove());
  // Block elements touch each other in textContent ("end.Start"), so give each one a space after it.
  doc.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, td, th, br, section, article, blockquote, dd, dt').forEach((el) => el.append(' '));
  const main = doc.querySelector('main, article, [role="main"]') ?? doc.body;
  const text = (main?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
  if (text.length < 200) throw new Error('Could not find much text on that page. It may need JavaScript or a login to show it.');

  const finalUrl = cleanUrl(response.url || url.toString());
  const title = doc.querySelector('title')?.textContent?.replace(/\s+/g, ' ').trim() || new URL(finalUrl).hostname;
  return { url: finalUrl, title, text };
}

/**
 * A copy of `text` with curly quotes made straight, every dash made "-", runs of whitespace made one space, and
 * lower case, plus where each of its characters came from in `text`. The AI often "fixes" quotes and dashes when it
 * copies a sentence, so an exact search misses; searching both copies normalized finds it, and `from` maps the
 * match back to the page's own characters.
 */
export function normalizeText(text: string): { text: string; from: number[] } {
  let out = '';
  const from: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let ch = text[i] as string;
    if (/\s/.test(ch)) {
      if (out.endsWith(' ')) continue;
      ch = ' ';
    } else if (/[‘’‚‛′]/.test(ch)) ch = "'";
    else if (/[“”„‟″]/.test(ch)) ch = '"';
    else if (/[‐‑‒–—―−]/.test(ch)) ch = '-';
    for (const lower of ch.toLowerCase()) {
      out += lower;
      from.push(i);
    }
  }
  return { text: out, from };
}

/**
 * The anchor for a quote Gemini copied from the page, so the seed is highlighted if the user opens the page later.
 * `exact` is always the page's own text, so use it as the seed's text. Null if the quote is not in the text even
 * after normalizing: the seed is then still saved, just not drawn on the page.
 */
export function quoteAnchor(page: ReadPage, quote: string): Anchor | null {
  let at = page.text.indexOf(quote);
  let end = at + quote.length;
  if (at === -1) {
    const haystack = normalizeText(page.text);
    const needle = normalizeText(quote).text.trim();
    const found = needle ? haystack.text.indexOf(needle) : -1;
    if (found === -1) return null;
    at = haystack.from[found] as number;
    end = (haystack.from[found + needle.length - 1] as number) + 1;
  }
  return {
    quote: {
      exact: page.text.slice(at, end),
      prefix: page.text.slice(Math.max(0, at - CONTEXT_CHARS), at),
      suffix: page.text.slice(end, end + CONTEXT_CHARS),
    },
    scrollPercent: at / page.text.length,
  };
}
