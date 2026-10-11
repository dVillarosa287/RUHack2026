// Which web page the on-page UI is annotating. Usually the page itself. On our own PDF page (entrypoints/pdf/,
// opened as pdf.html?file=<address>) it is the PDF's address instead, so seeds made there are saved under the PDF
// and show up in the viewer as that PDF, not as an extension page.
import { browser } from 'wxt/browser';

const PDF_PAGE_PATH = '/pdf.html';

/** Our PDF page showing the PDF at `fileUrl`. */
export function pdfPageUrl(fileUrl: string): string {
  return browser.runtime.getURL(PDF_PAGE_PATH as never) + '?file=' + encodeURIComponent(fileUrl);
}

/** The address seeds on this page are saved under. Use this instead of window.location.href. */
export function pageUrl(): string {
  const here = window.location.href;
  if (here.startsWith(browser.runtime.getURL(PDF_PAGE_PATH as never))) {
    return new URLSearchParams(window.location.search).get('file') ?? here;
  }
  return here;
}

/** True for addresses whose path ends in .pdf (the ? and # parts do not count). */
export function looksLikePdf(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith('.pdf');
  } catch {
    return false;
  }
}

/** Where to open a seed's page: PDFs through our PDF page (Chrome's own PDF viewer runs no extensions), the rest as is. */
export function openableUrl(url: string): string {
  return looksLikePdf(url) ? pdfPageUrl(url) : url;
}
