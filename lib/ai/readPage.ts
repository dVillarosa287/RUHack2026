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
 * The anchor for a quote Gemini copied from the page, so the seed is highlighted if the user opens the page later.
 * Null if the quote is not really in the text: the seed is then still saved, just not drawn on the page.
 */
export function quoteAnchor(page: ReadPage, quote: string): Anchor | null {
  const at = page.text.indexOf(quote);
  if (at === -1) return null;
  return {
    quote: {
      exact: quote,
      prefix: page.text.slice(Math.max(0, at - CONTEXT_CHARS), at),
      suffix: page.text.slice(at + quote.length, at + quote.length + CONTEXT_CHARS),
    },
    scrollPercent: at / page.text.length,
  };
}
