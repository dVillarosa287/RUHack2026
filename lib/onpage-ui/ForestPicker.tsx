import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Forest } from '@/lib/storage';
import { useWords } from '@/lib/theme';
import { ForestIcon } from '@/lib/theme/SpriteIcon';

interface ForestPickerProps {
  forests: Forest[];
  currentForestId: string | null;
  onSwitchForest(id: string): void;
  /** The last row, "+ Create new forest". The toolbar then asks for a name. */
  onCreateNew(): void;
}

/** How tall the open list can get, in px. Used to decide whether it opens downward or upward. */
const LIST_MAX_HEIGHT = 240;

/**
 * The forest drop-down at the top of the toolbar. It is our own list instead of a native <select>, because the
 * browser draws a <select>'s open list itself, in its own colors, which ignore the theme. Every color here comes
 * from the theme tokens in toolbar.css, so the list follows whichever theme is chosen.
 */
export function ForestPicker(props: ForestPickerProps) {
  const words = useWords();
  const [open, setOpen] = useState(false);
  // Opens upward when the toolbar sits too close to the bottom of the window for the list to fit below it.
  const [upward, setUpward] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const current = props.forests.find((f) => f.id === props.currentForestId);

  // Close when the user clicks anywhere outside the picker. composedPath() sees inside our Shadow DOM.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !e.composedPath().includes(rootRef.current)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open]);

  // When the list opens, put keyboard focus on the current forest, so arrow keys start from there.
  useEffect(() => {
    if (!open) return;
    const rows = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
    const selected = listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    (selected ?? rows?.[0])?.focus();
  }, [open]);

  const toggle = () => {
    if (!open) {
      const rect = buttonRef.current?.getBoundingClientRect();
      setUpward(!!rect && rect.bottom + LIST_MAX_HEIGHT > window.innerHeight && rect.top > LIST_MAX_HEIGHT);
    }
    setOpen(!open);
  };

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const pick = (id: string) => {
    close();
    if (id !== props.currentForestId) props.onSwitchForest(id);
  };

  /** Arrow keys move between rows, Home and End jump to the ends, Esc closes. Enter and Space click the row (normal buttons). */
  const onListKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
    const at = rows.indexOf(e.target as HTMLButtonElement);
    let next: number | null = null;
    if (e.key === 'ArrowDown') next = Math.min(rows.length - 1, at + 1);
    else if (e.key === 'ArrowUp') next = Math.max(0, at - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = rows.length - 1;
    else if (e.key === 'Escape' || e.key === 'Tab') close();
    else return;
    // preventDefault also tells the toolbar's own shortcuts (useKeybinds) to leave this key alone.
    e.preventDefault();
    if (next !== null) rows[next]?.focus();
  };

  return (
    <div ref={rootRef} className="fo-picker">
      <button
        ref={buttonRef}
        className="fo-picker-button"
        aria-label={`Current ${words.forest}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <ForestIcon icon={current?.icon ?? ''} size={22} />
        <span className="fo-picker-name">{current?.name ?? `Choose a ${words.forest}`}</span>
        <span className="fo-picker-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div ref={listRef} className={`fo-picker-list${upward ? ' fo-picker-up' : ''}`} role="listbox" aria-label={words.forests} onKeyDown={onListKey}>
          {props.forests.map((f) => (
            <button key={f.id} className="fo-picker-option" role="option" aria-selected={f.id === props.currentForestId} onClick={() => pick(f.id)}>
              <ForestIcon icon={f.icon} size={20} />
              <span className="fo-picker-name">{f.name}</span>
              {f.id === props.currentForestId && <span className="fo-picker-check" aria-hidden="true">✓</span>}
            </button>
          ))}
          <button
            className="fo-picker-option fo-picker-new"
            role="option"
            aria-selected={false}
            onClick={() => {
              setOpen(false);
              props.onCreateNew();
            }}
          >
            {`+ Create new ${words.forest}`}
          </button>
        </div>
      )}
    </div>
  );
}
