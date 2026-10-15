// The background service worker. It sleeps after about 30 seconds idle, so keep it stateless.
import { browser } from 'wxt/browser';
import type { AiReply, AiRequest } from '@/lib/ai';
import { forestSummary, linkConnections, quizQuestions, testAi } from '@/lib/ai/gemini';
import { getSeed, getSettings, getToolbarState, updateSeed, updateToolbarState } from '@/lib/storage';
import { watchForPdfs } from './pdf/redirect';

/** Alarms named "review:<seed id>" are an apple's active recall timer. */
const REVIEW_ALARM = 'review:';

export default defineBackground(() => {
  // PDFs open in our own PDF page (entrypoints/pdf/), because Chrome's PDF viewer runs no extensions.
  watchForPdfs();

  // The apple's time is up: it grows into an apple tree. Open pages see the change and show its question
  // (lib/onpage-ui/ReviewPopup.tsx).
  browser.alarms.onAlarm.addListener((alarm) => {
    if (!alarm.name.startsWith(REVIEW_ALARM)) return;
    void (async () => {
      const seed = await getSeed(alarm.name.slice(REVIEW_ALARM.length));
      if (seed && seed.nextReviewAt !== null && seed.growth !== 'tree') await updateSeed(seed.id, { growth: 'tree' });
    })();
  });

  // The first install (not an update or a Chrome update) opens the welcome page once.
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') void browser.tabs.create({ url: browser.runtime.getURL('/viewer.html' as never) + '#/welcome' });
  });

  // Clicking the extension's icon in Chrome's toolbar opens or closes the on-page toolbar.
  // The state is saved, so the toolbar then follows you into every tab and stays until you close it.
  browser.action.onClicked.addListener(async () => {
    const { open } = await getToolbarState();
    await updateToolbarState({ open: !open });
  });

  browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    const { type, forestId, page } = (message ?? {}) as { type?: string; forestId?: string; page?: 'settings' };

    // Content scripts cannot open extension pages themselves, so they ask us to.
    if (type === 'forest:open-viewer') {
      // `page: 'settings'` opens the Settings page (the toolbar's "+ Make or edit stashes").
      const hash = page === 'settings' ? '#/settings' : forestId ? `#/forest/${forestId}` : '';
      void browser.tabs.create({ url: browser.runtime.getURL('/viewer.html' as never) + hash });
      return false;
    }

    // An apple was planted: wake up when its active recall time is up. chrome.alarms survives this worker sleeping.
    if (type === 'forest:schedule-review') {
      const { seedId, when } = message as { seedId: string; when: number };
      void browser.alarms.create(`${REVIEW_ALARM}${seedId}`, { when });
      return false;
    }

    // A screenshot drag: only the background worker may take a picture of the tab. The page crops it.
    if (type === 'forest:capture-tab') {
      void captureTab((_sender as { tab?: { windowId?: number } }).tab?.windowId).then(sendResponse);
      return true;
    }

    // Gemini is only called from here, and only when the user asked for it.
    if (type === 'forest:ai-test' || type === 'forest:ai-quiz' || type === 'forest:ai-summary' || type === 'forest:ai-link') {
      void answerAi(message as AiRequest).then(sendResponse);
      return true; // keeps the channel open until sendResponse is called
    }
    return false;
  });
});

/**
 * A picture of the visible part of the tab, as a PNG data URL. Chrome allows only about two a second, so a
 * refused one is tried once more a moment later.
 */
async function captureTab(windowId: number | undefined): Promise<{ ok: boolean; value?: string; error?: string }> {
  const take = () => browser.tabs.captureVisibleTab(windowId ?? browser.windows.WINDOW_ID_CURRENT, { format: 'png' });
  try {
    return { ok: true, value: await take() };
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 700));
    try {
      return { ok: true, value: await take() };
    } catch (error) {
      return { ok: false, error: `Could not take the screenshot: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
}

async function answerAi(request: AiRequest): Promise<AiReply<unknown>> {
  try {
    const settings = await getSettings();
    const key = request.provider === 'cerebras' ? settings.cerebrasKey : settings.geminiKey;
    if (request.type === 'forest:ai-test') {
      await testAi(request.provider, key);
      return { ok: true, value: true };
    }
    if (request.type === 'forest:ai-link') {
      return { ok: true, value: await linkConnections(key, request.page, request.sources, request.provider) };
    }
    if (request.type === 'forest:ai-summary') {
      return { ok: true, value: await forestSummary(key, request.forestName, request.sources, request.provider) };
    }
    return { ok: true, value: await quizQuestions(key, request.sources, request.provider, request.mix) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
