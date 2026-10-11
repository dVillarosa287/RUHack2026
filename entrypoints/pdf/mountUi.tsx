// Mounts the same on-page UI that web pages get (lib/onpage-ui/App.tsx), the way entrypoints/content/index.tsx
// does. WXT's createShadowRootUi only works in content scripts, so here we build the same Shadow DOM by hand:
// a <forest-ui> host, the toolbar CSS inside it, and key presses kept inside (WXT's `isolateEvents`).
import ReactDOM from 'react-dom/client';
import { splitShadowRootCss } from 'wxt/utils/split-shadow-root-css';
import { UI_HOST_TAG } from '@/lib/engine';
import { App } from '@/lib/onpage-ui/App';
import { keepOnTop } from '@/lib/onpage-ui/topLayer';
import { watchTheme } from '@/lib/theme';
import toolbarCss from '@/lib/onpage-ui/toolbar.css?inline';

export function mountOnPageUi() {
  const host = document.createElement(UI_HOST_TAG);
  const shadow = host.attachShadow({ mode: 'open' });

  // Same CSS as the content script gets: a reset, then toolbar.css. Font rules only work in the document itself.
  const { shadowCss, documentCss } = splitShadowRootCss(`:host{all:initial !important;}\n${toolbarCss.replaceAll(':root', ':host')}`);
  const style = document.createElement('style');
  style.textContent = shadowCss;
  shadow.append(style);
  if (documentCss) {
    const fonts = document.createElement('style');
    fonts.textContent = documentCss;
    document.head.append(fonts);
  }

  const container = document.createElement('div');
  shadow.append(container);
  // Typing in the toolbar (a forest name, a note) must not reach the page's key shortcuts.
  for (const type of ['keydown', 'keyup', 'keypress']) shadow.addEventListener(type, (e) => e.stopPropagation());

  document.documentElement.append(host);
  watchTheme(shadow);
  keepOnTop(host);
  ReactDOM.createRoot(container).render(<App shadowHost={host} />);
}
