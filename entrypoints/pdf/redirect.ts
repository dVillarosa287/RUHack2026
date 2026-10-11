// Runs in the background worker. Chrome's built-in PDF viewer runs no extensions (no content script, and its
// text is not in the page), so when a tab opens a PDF we send it to our own PDF page (pdf.html) instead.
import { browser } from 'wxt/browser';
import { looksLikePdf, pdfPageUrl } from '@/lib/engine/pageUrl';

/** PDFs the user asked to see in Chrome's own viewer once ("Open in Chrome's viewer"), so we let them through. */
const skipOnce = new Set<string>();

/**
 * PDFs Chrome loaded in the background before the user clicked anything ("prerendering": Google search, for example,
 * preloads its top results so they open instantly). We must not open those, but we remember them: if the user then
 * clicks one, Chrome shows the preloaded copy without loading it again, and tabs.onUpdated below catches that.
 */
const preloadedPdfs = new Set<string>();

const withoutHash = (url: string) => url.split('#')[0] ?? url;

function sendToPdfPage(tabId: number, url: string) {
  if (skipOnce.delete(withoutHash(url))) return;
  void browser.tabs.update(tabId, { url: pdfPageUrl(url) });
}

type Headers = { name: string; value?: string }[] | undefined;
const header = (headers: Headers, name: string) => headers?.find((h) => h.name.toLowerCase() === name)?.value?.toLowerCase() ?? '';

/**
 * Only send a tab to our PDF page when the user really is going to that PDF in that tab. A preloaded page lives in a
 * hidden tab Chrome does not list (tabs.get fails), or the visible tab is still on the search page; then the PDF is
 * only remembered (preloadedPdfs) and opened in our page once the user clicks through to it.
 */
async function openIfUserIsGoingThere(tabId: number, url: string, lifecycle: string | undefined) {
  const target = withoutHash(url);
  const tab = await browser.tabs.get(tabId).catch(() => null);
  const goingThere = lifecycle !== 'prerender' && !!tab && [tab.pendingUrl, tab.url].some((u) => !!u && withoutHash(u) === target);
  if (goingThere) sendToPdfPage(tabId, url);
  else preloadedPdfs.add(target);
}

/** Call once when the background worker starts (listeners must be added straight away to wake it up). */
export function watchForPdfs() {
  // Web PDFs: the server says the page is a PDF in its Content-Type header, whatever the address looks like.
  // Downloads ("attachment") are left alone.
  browser.webRequest.onHeadersReceived.addListener(
    (details) => {
      if (details.tabId < 0) return undefined;
      const type = header(details.responseHeaders, 'content-type');
      const isPdf = type.includes('application/pdf') || type.includes('application/x-pdf');
      if (!isPdf || header(details.responseHeaders, 'content-disposition').startsWith('attachment')) return undefined;
      void openIfUserIsGoingThere(details.tabId, details.url, (details as { documentLifecycle?: string }).documentLifecycle);
      return undefined;
    },
    { urls: ['http://*/*', 'https://*/*'], types: ['main_frame'] },
    ['responseHeaders'],
  );

  // PDFs on this computer (file://) have no headers, so the address decides. Needs "Allow access to file URLs".
  // Also: a preloaded PDF (see preloadedPdfs) that the user has now clicked, so the tab really shows it.
  browser.tabs.onUpdated.addListener((tabId, change) => {
    if (!change.url) return;
    if (change.url.startsWith('file:') && looksLikePdf(change.url)) sendToPdfPage(tabId, change.url);
    else if (preloadedPdfs.delete(withoutHash(change.url))) sendToPdfPage(tabId, change.url);
  });

  // The PDF page's "Open in Chrome's viewer" button: show this PDF in Chrome's viewer this one time.
  browser.runtime.onMessage.addListener((message: unknown, sender) => {
    const { type, url } = (message ?? {}) as { type?: string; url?: string };
    if (type !== 'forest:pdf-original' || !url || sender.tab?.id === undefined) return undefined;
    skipOnce.add(withoutHash(url));
    void browser.tabs.update(sender.tab.id, { url });
    return undefined;
  });
}
