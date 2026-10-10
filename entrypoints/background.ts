// The background service worker. It sleeps after about 30 seconds idle, so keep it stateless.
import { browser } from 'wxt/browser';
import { getToolbarState, updateToolbarState } from '@/lib/storage';

export default defineBackground(() => {
  // Clicking the extension's icon in Chrome's toolbar opens or closes the on-page toolbar.
  // The state is saved, so the toolbar then follows you into every tab and stays until you close it.
  browser.action.onClicked.addListener(async () => {
    const { open } = await getToolbarState();
    await updateToolbarState({ open: !open });
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
