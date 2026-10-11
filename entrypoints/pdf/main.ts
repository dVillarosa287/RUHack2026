// Our own PDF page, opened as pdf.html?file=<address of the PDF>. Chrome's built-in PDF viewer runs no
// extensions, so background.ts sends PDFs here (entrypoints/pdf/redirect.ts). PDF.js draws each page on a canvas
// and puts the page's text above it as invisible, selectable spans (the "text layer"). That text is real page
// text, so the normal on-page UI can highlight it and plant sprites on it like on any web page.
import { getDocument, GlobalWorkerOptions, TextLayer, type PDFDocumentProxy, type PDFPageProxy, type PageViewport, type RenderTask } from 'pdfjs-dist';
// PDF.js does its heavy work in a Web Worker. `?url` makes the build copy the worker file into the extension.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { browser } from 'wxt/browser';
import { mountOnPageUi } from './mountUi';
import './pdf.css';
import { watchTheme } from '@/lib/theme';

GlobalWorkerOptions.workerSrc = workerUrl;
watchTheme(document);

/** Pages are drawn as wide as the window allows, up to this many CSS pixels. */
const MAX_PAGE_WIDTH = 1000;

const file = new URLSearchParams(window.location.search).get('file');
const statusEl = document.getElementById('pdf-status')!;
const pagesEl = document.getElementById('pdf-pages')!;
const setStatus = (text: string) => void (statusEl.textContent = text);

// Back to Chrome's own viewer (for a PDF we cannot open, or forms). The background lets it through once.
document.getElementById('pdf-original')!.addEventListener('click', () => {
  if (file) void browser.runtime.sendMessage({ type: 'forest:pdf-original', url: file });
});

/** The PDF's own title, or else its file name. */
async function titleOf(pdf: PDFDocumentProxy, url: string): Promise<string> {
  const { info } = await pdf.getMetadata().catch(() => ({ info: {} as Record<string, unknown> }));
  const title = (info as { Title?: unknown }).Title;
  if (typeof title === 'string' && title.trim()) return title.trim();
  return decodeURIComponent(new URL(url).pathname.split('/').pop() || url);
}

/** A page canvas is never bigger than this many pixels (a scanned page at full screen sharpness can be 20 MB). */
const MAX_CANVAS_PIXELS = 4_000_000;

/**
 * Each page's picture. Only pages near the screen have one: a page drawn when it comes near and cleared again when it
 * is far away, so a 600-page scanned book uses about as much memory as a few pages. Drawing every page and keeping it
 * ran Chrome out of canvas memory, and later pages came out white. Pages are drawn one at a time, nearest first.
 */
interface PageSlot { page: PDFPageProxy; canvas: HTMLCanvasElement; viewport: PageViewport; box: HTMLElement; near: boolean; drawn: boolean; task?: RenderTask }
const slots = new Map<Element, PageSlot>();
let drawing = false;

/** Draws the next page that is near the screen and not drawn yet. */
async function drawNext() {
  if (drawing) return;
  const slot = [...slots.values()].find((s) => s.near && !s.drawn);
  if (!slot) return;
  drawing = true;
  const { page, canvas, viewport, box } = slot;
  // Sharp on high-resolution screens, but never more than MAX_CANVAS_PIXELS.
  const ratio = Math.min(window.devicePixelRatio || 1, Math.sqrt(MAX_CANVAS_PIXELS / (viewport.width * viewport.height)));
  canvas.width = Math.floor(viewport.width * ratio);
  canvas.height = Math.floor(viewport.height * ratio);
  slot.drawn = true;
  slot.task = page.render({ canvas, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
  try {
    await slot.task.promise;
    box.classList.remove('pdf-page-failed');
  } catch (error) {
    if ((error as { name?: string })?.name !== 'RenderingCancelledException') {
      console.warn(`Forest: could not draw PDF page ${page.pageNumber}`, error);
      box.classList.add('pdf-page-failed'); // pdf.css shows "This page could not be drawn"
    }
  } finally {
    slot.task = undefined;
    drawing = false;
    void drawNext();
  }
}

/** Clears a far-away page's picture so its memory is given back. It is drawn again when it comes near. */
function clearPage(slot: PageSlot) {
  slot.task?.cancel();
  slot.drawn = false;
  slot.canvas.width = 0;
  slot.canvas.height = 0;
}

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const slot = slots.get(entry.target);
      if (!slot) continue;
      slot.near = entry.isIntersecting;
      if (!slot.near && slot.drawn) clearPage(slot);
    }
    void drawNext();
  },
  { rootMargin: '1500px 0px' },
);

/** Adds one page: its box, its (lazy) canvas and its text layer. Resolves when the text is in place. */
async function addPage(page: PDFPageProxy, scale: number) {
  const viewport = page.getViewport({ scale });
  const box = document.createElement('div');
  box.className = 'pdf-page';
  box.dataset.pageNumber = String(page.pageNumber);
  box.style.width = `${viewport.width}px`;
  box.style.height = `${viewport.height}px`;
  box.style.setProperty('--total-scale-factor', String(viewport.scale));
  const canvas = document.createElement('canvas');
  const textLayer = document.createElement('div');
  textLayer.className = 'textLayer';
  box.append(canvas, textLayer);
  pagesEl.append(box);

  slots.set(box, { page, canvas, viewport, box, near: false, drawn: false });
  observer.observe(box);
  await new TextLayer({ textContentSource: page.streamTextContent(), container: textLayer, viewport }).render();
}

async function main() {
  if (!file) return setStatus('No PDF was given.');
  document.getElementById('pdf-name')!.textContent = file;

  let pdf: PDFDocumentProxy;
  try {
    // withCredentials sends the site's cookies, so PDFs behind a sign-in have a chance to load.
    pdf = await getDocument({
      url: file,
      withCredentials: true,
      // Helper files copied into the extension by wxt.config.ts. Scanned books often store pages as JBIG2 or
      // JPEG 2000 pictures, which need the wasm decoders; without them those pages stay white.
      wasmUrl: browser.runtime.getURL('/pdfjs/wasm/' as never),
      cMapUrl: browser.runtime.getURL('/pdfjs/cmaps/' as never),
      cMapPacked: true,
      standardFontDataUrl: browser.runtime.getURL('/pdfjs/standard_fonts/' as never),
      iccUrl: browser.runtime.getURL('/pdfjs/iccs/' as never),
    }).promise;
  } catch (error) {
    console.warn('Forest: could not open the PDF', error);
    const local = file.startsWith('file:') ? ' For PDFs on this computer, turn on "Allow access to file URLs" for Forest in chrome://extensions.' : '';
    return setStatus(`Could not open this PDF here.${local} Use "Open in Chrome's viewer" above to read it there.`);
  }

  const title = await titleOf(pdf, file);
  document.title = title;
  document.getElementById('pdf-name')!.textContent = title;

  const first = await pdf.getPage(1);
  const room = Math.min(document.documentElement.clientWidth - 160, MAX_PAGE_WIDTH);
  const scale = Math.max(0.5, room / first.getViewport({ scale: 1 }).width);

  // Every page's text must be on the page before the on-page UI starts, because it finds saved highlights
  // by searching the page's text. The canvases are drawn later, as you scroll.
  for (let n = 1; n <= pdf.numPages; n++) {
    setStatus(`Loading page ${n} of ${pdf.numPages}…`);
    await addPage(n === 1 ? first : await pdf.getPage(n), scale);
  }
  setStatus('');
  mountOnPageUi();
}

void main();
