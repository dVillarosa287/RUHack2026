// The background service worker. It sleeps after about 30 seconds idle, so keep it stateless.
import { browser } from 'wxt/browser';
import type { AiReply, AiRequest } from '@/lib/ai';
import { quizQuestions, testGemini } from '@/lib/ai/gemini';
import { getScreenshot, getSettings, getToolbarState, updateToolbarState } from '@/lib/storage';

export default defineBackground(() => {
  // Clicking the extension's icon in Chrome's toolbar opens or closes the on-page toolbar.
  // The state is saved, so the toolbar then follows you into every tab and stays until you close it.
  browser.action.onClicked.addListener(async () => {
    const { open } = await getToolbarState();
    await updateToolbarState({ open: !open });
  });

  browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    const { type, forestId } = (message ?? {}) as { type?: string; forestId?: string };

    // Content scripts cannot open extension pages themselves, so they ask us to.
    if (type === 'forest:open-viewer') {
      const hash = forestId ? `#/forest/${forestId}` : '';
      void browser.tabs.create({ url: browser.runtime.getURL('/viewer.html' as never) + hash });
      return false;
    }

    // The lily pad's screenshot: only the background worker may take a picture of the tab. The page crops it.
    if (type === 'forest:capture-tab') {
      const windowId = (_sender as { tab?: { windowId?: number } }).tab?.windowId;
      browser.tabs
        .captureVisibleTab(windowId ?? browser.windows.WINDOW_ID_CURRENT, { format: 'png' })
        .then((value) => sendResponse({ ok: true, value }))
        .catch((error: unknown) => sendResponse({ ok: false, error: `Could not take the screenshot: ${error instanceof Error ? error.message : String(error)}` }));
      return true;
    }

    // Gemini is only called from here, and only when the user asked for it.
    if (type === 'forest:ai-test' || type === 'forest:ai-quiz') {
      void answerAi(message as AiRequest).then(sendResponse);
      return true; // keeps the channel open until sendResponse is called
    }
    return false;
  });
});

async function answerAi(request: AiRequest): Promise<AiReply<unknown>> {
  try {
    const { geminiKey } = await getSettings();
    if (request.type === 'forest:ai-test') {
      await testGemini(geminiKey);
      return { ok: true, value: true };
    }
    // The lily pads' screenshots are read here, so the viewer only has to send ids and text.
    const sources = await Promise.all(request.sources.map(async (s) => ({ ...s, image: await getScreenshot(s.id) })));
    return { ok: true, value: await quizQuestions(geminiKey, sources) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
