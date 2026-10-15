import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { Tool } from '@/lib/engine';
import type { SpriteType } from '@/lib/storage';
import { hotbarKey } from './hotbar';

/** One thing the user did that Ctrl+Z can take back and Ctrl+Shift+Z can do again. */
export type UndoableAction = { undo(): Promise<void>; redo(): Promise<void> };

/**
 * Keyboard shortcuts, only while the toolbar is open:
 *   1-9 and 0   pick the hotbar sprite in that slot (the chosen loadout, see hotbar.ts)
 *   Ctrl/Cmd+Z  undo,  Ctrl/Cmd+Shift+Z  redo
 *   Esc         put the tool down
 *   -  and  +   make the sprite about to be planted smaller / larger (planted ones keep their size)
 * Nothing runs while the user is typing on the website (see isTypingInPage), so the site keeps all its keys.
 */
export function useKeybinds(props: {
  enabled: boolean; // the toolbar is open
  hotbar: SpriteType[]; // the sprites of the loadout in use, in key order
  tool: Tool;
  setSpriteType: (type: SpriteType) => void;
  setTool: (tool: Tool) => void;
  setPlantScale: Dispatch<SetStateAction<number>>; // the size of the next sprite to plant
  history: MutableRefObject<UndoableAction[]>; // things that can be undone
  undone: MutableRefObject<UndoableAction[]>; // things that can be redone
}) {
  // The listener is added once per open/close of the toolbar, so it reads the newest values through this ref.
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    if (!props.enabled) return; // toolbar closed: no listener at all, every key belongs to the site
    const onKey = (e: KeyboardEvent) => {
      if (isTypingInPage(e)) return;
      const { tool, hotbar, setSpriteType, setTool, setPlantScale, history, undone } = latest.current;

      // Undo and redo. Only take the key when there is really something to undo or redo; otherwise the site gets it.
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'z') {
        const source = e.shiftKey ? undone : history;
        const destination = e.shiftKey ? history : undone;
        const action = source.current.pop();
        if (!action) return;
        e.preventDefault();
        void (e.shiftKey ? action.redo() : action.undo()).then(() => destination.current.push(action));
        return;
      }

      // The other shortcuts are plain keys: a held Ctrl, Cmd or Alt means the site's (or the browser's) own shortcut.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Number keys pick a sprite. e.key is the typed character, so it also works on the numpad and on other keyboard layouts.
      if (/^[0-9]$/.test(e.key)) {
        const type = hotbar.find((_, index) => hotbarKey(index) === e.key);
        if (!type || e.repeat) return; // no sprite on that slot, or the key is just being held down
        e.preventDefault();
        setSpriteType(type);
        setTool('plant');
        return;
      }

      // Esc puts the tool down. With no tool in hand it is left alone, so the site can close its own dialogs with it.
      if (e.key === 'Escape') {
        if (tool === 'none') return;
        e.preventDefault();
        setTool('none');
        return;
      }

      // Marker size. '+' is Shift+'=' on most keyboards, so both '+' and '=' count (and '-' and '_'), plus the numpad keys.
      // - and + size the sprite on the mouse, the one about to be planted. With no sprite picked they belong to the site.
      if (tool !== 'plant') return;
      if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        setPlantScale((scale) => Math.max(0.5, Math.round((scale - 0.1) * 10) / 10));
      } else if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
        e.preventDefault();
        setPlantScale((scale) => Math.min(2, Math.round((scale + 0.1) * 10) / 10));
      }
    };
    // A normal bubble-phase listener on document (not capture): sites that handle a key themselves and stop it keep priority.
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [props.enabled]);
}

/** Input types where a key press does not type text, so a shortcut is fine while one has focus. */
const NON_TEXT_INPUTS = ['button', 'checkbox', 'radio', 'range', 'color', 'file', 'image', 'submit', 'reset'];

/** Roles that mean "the user types here", for custom editors that are not a real input. */
const TEXT_ROLES = ['textbox', 'combobox', 'searchbox'];

/** True if this element is somewhere the user types. */
function isTextTarget(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false; // could be the document or the window
  if (el instanceof HTMLInputElement) return !NON_TEXT_INPUTS.includes(el.type);
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLElement && el.isContentEditable) return true; // also true for children of an editable area
  const role = el.closest('[role]')?.getAttribute('role');
  return role !== null && role !== undefined && TEXT_ROLES.includes(role.toLowerCase());
}

/** The element that really has focus, looking inside open shadow roots (document.activeElement stops at the shadow host). */
function deepActiveElement(): Element | null {
  let el = document.activeElement;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  return el;
}

/**
 * True when the user is typing on the website, in which case no shortcut may run and every key must reach the site
 * untouched: a search box, a comment field, Google Docs, any rich text editor, an IME composition, and so on.
 * When unsure we say "typing", because a missed shortcut costs less than a hijacked key.
 */
function isTypingInPage(e: KeyboardEvent): boolean {
  // An IME (Japanese, Chinese...) is building a character, or something on the page already handled this key.
  if (e.isComposing || e.keyCode === 229 || e.defaultPrevented) return true;
  // The page is one big editor (document.designMode = 'on').
  if (document.designMode === 'on') return true;
  // Focus is in a frame or plugin. Editors such as Google Docs type into an iframe, and we cannot see inside it.
  const focused = document.activeElement;
  if (focused && ['IFRAME', 'FRAME', 'OBJECT', 'EMBED'].includes(focused.tagName)) return true;
  // The element the key was really aimed at (composedPath sees through shadow roots), and the one that really has focus.
  return isTextTarget(e.composedPath()[0] ?? null) || isTextTarget(deepActiveElement());
}
