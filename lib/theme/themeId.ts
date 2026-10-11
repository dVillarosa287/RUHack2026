// Which theme is chosen right now, for code that draws sprites (their art and colors depend on the theme).
// One shared listener for the whole page, so a page with hundreds of sprites still reads settings only once per change.
import { useSyncExternalStore } from 'react';
import { getSettings, onDataChanged } from '@/lib/storage';
import { DEFAULT_THEME_ID, getTheme } from './themes';

let current = DEFAULT_THEME_ID;
const listeners = new Set<(themeId: string) => void>();
let stopStorage: (() => void) | null = null;

/** Reads the saved theme and tells every listener if it changed. Unknown ids become the default theme. */
async function refresh() {
  const { theme } = await getSettings();
  const next = getTheme(theme).id;
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener(next);
}

/** Calls `callback` with the theme id right away and again whenever the user picks another theme. Returns stop. */
export function watchThemeId(callback: (themeId: string) => void): () => void {
  listeners.add(callback);
  if (!stopStorage) {
    // The first listener starts watching storage; later ones reuse it.
    stopStorage = onDataChanged(() => void refresh());
    void refresh();
  }
  callback(current);
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && stopStorage) {
      stopStorage();
      stopStorage = null;
    }
  };
}

/** React hook: the current theme id. The component draws again when the user picks another theme. */
export function useThemeId(): string {
  return useSyncExternalStore(subscribe, () => current);
}

const subscribe = (onChange: () => void) => watchThemeId(() => onChange());
