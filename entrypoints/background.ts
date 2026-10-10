// The background service worker. It sleeps after about 30 seconds idle, so keep it stateless.
import { browser } from 'wxt/browser';

export default defineBackground(() => {
  // Clicking the extension's icon in Chrome's toolbar shows or hides the on-page toolbar.
  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id === undefined) return;
    try {
      await browser.tabs.sendMessage(tab.id, { type: 'forest:toggle-toolbar' });
    } catch {
      // No content script there: a Chrome page, or a tab opened before the extension was loaded (reload it).
      void browser.action.setBadgeText({ tabId: tab.id, text: '!' });
      setTimeout(() => void browser.action.setBadgeText({ tabId: tab.id!, text: '' }), 3000);
    }
  });

  // Content scripts cannot open extension pages themselves, so they ask us to.
  browser.runtime.onMessage.addListener((message: unknown) => {
    const { type, forestId } = (message ?? {}) as { type?: string; forestId?: string };
    if (type === 'forest:open-viewer') {
      const hash = forestId ? `#/forest/${forestId}` : '';
      void browser.tabs.create({ url: browser.runtime.getURL('/viewer.html' as never) + hash });
    }
  });
});
