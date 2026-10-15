// The app's font, Crafty Girls (Apache 2.0), ships inside the extension in public/fonts/. It is never downloaded
// from Google Fonts: on web pages that would tell Google every site the user visits (docs/PUBLISHING.md M1).
// A CSS @font-face cannot point at it from a web page (a "/fonts/..." address would mean the website's own
// server), so it is registered from script with the extension's own address. Reading the file into memory first
// means a site's Content Security Policy cannot block it. Text uses the fallback font until it is ready.
import { browser } from 'wxt/browser';

export const FONT_FAMILY = 'Crafty Girls';
const FONT_FILE = '/fonts/crafty-girls.woff2';

/** Call once per page (content script, PDF page, viewer). Safe to call again; failures only leave the fallback font. */
export async function loadAppFont(): Promise<void> {
  if ([...document.fonts].some((face) => face.family.replace(/"/g, '') === FONT_FAMILY)) return;
  try {
    const data = await (await fetch(browser.runtime.getURL(FONT_FILE as never))).arrayBuffer();
    const face = new FontFace(FONT_FAMILY, data, { style: 'normal', weight: '400', display: 'swap' });
    document.fonts.add(await face.load());
  } catch {
    // The toolbar still works in the fallback font (sans-serif).
  }
}
