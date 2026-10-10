// Runs on every web page. Kept tiny: it only mounts the on-page UI inside a Shadow DOM.
import ReactDOM from 'react-dom/client';
import { UI_HOST_TAG } from '@/lib/engine';
import { App } from '@/lib/onpage-ui/App';
import { keepOnTop } from '@/lib/onpage-ui/topLayer';
import { watchTheme } from '@/lib/theme';
import '@/lib/onpage-ui/toolbar.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: UI_HOST_TAG,
      position: 'inline',
      anchor: 'html',
      append: 'last',
      isolateEvents: true,
      onMount(container, shadow, shadowHost) {
        const stopTheme = watchTheme(shadow);
        const stopOnTop = keepOnTop(shadowHost);
        const root = ReactDOM.createRoot(container);
        root.render(<App shadowHost={shadowHost} />);
        return { root, stopTheme, stopOnTop };
      },
      onRemove(mounted) {
        mounted?.root.unmount();
        mounted?.stopTheme();
        mounted?.stopOnTop();
      },
    });
    ui.mount();
  },
});
