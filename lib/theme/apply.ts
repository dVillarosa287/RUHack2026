// Puts the chosen theme's colors onto a page. Used by the on-page UI (inside its Shadow DOM) and the viewer.
import { getSettings, onDataChanged } from '@/lib/storage';
import { DEFAULT_THEME_ID, getTheme, themeToCss } from './themes';

const STYLE_ATTRIBUTE = 'data-forest-theme';

/** Writes the theme's palette and tokens as CSS custom properties, replacing any earlier theme. */
export function applyTheme(target: Document | ShadowRoot, themeId: string) {
  const selector = target instanceof ShadowRoot ? ':host' : ':root';
  const holder = target instanceof ShadowRoot ? (target.querySelector('head') ?? target) : document.head;
  let style = holder.querySelector<HTMLStyleElement>(`style[${STYLE_ATTRIBUTE}]`);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute(STYLE_ATTRIBUTE, '');
    holder.prepend(style);
  }
  style.textContent = themeToCss(getTheme(themeId), selector);
}

/** Applies the saved theme now, and again whenever the user picks a different one. Returns a function that stops. */
export function watchTheme(target: Document | ShadowRoot): () => void {
  let current = DEFAULT_THEME_ID;
  applyTheme(target, current); // right away, so the UI never shows without colors while settings load
  const run = async () => {
    const { theme } = await getSettings();
    if (theme === current) return;
    current = theme;
    applyTheme(target, theme);
  };
  void run();
  return onDataChanged(() => void run());
}
