import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';

export interface PickerItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface PickerProps {
  items: PickerItem[];
  currentId: string | null;
  onPick(id: string): void;
  /** For screen readers: what is being chosen. */
  ariaLabel: string;
  /** Shown on the button when nothing is chosen. */
  placeholder: string;
  /** An extra last row, such as "+ Create new forest". */
  extra?: { label: string; onClick(): void };
  /** A smaller button, for the stash row. */
  small?: boolean;
}

/** How tall the open list can get, in px. Used to decide whether it opens downward or upward. */
const LIST_MAX_HEIGHT = 240;

/**
 * The toolbar's drop-down (the forest and the stash). It is our own list instead of a native <select>, because the
 * browser draws a <select>'s open list itself, in its own colors, which ignore the theme. Every color here comes
 * from the theme tokens in toolbar.css, so the list follows whichever theme is chosen.
 */
export function Picker(props: PickerProps) {
  const [open, setOpen] = useState(false);
  // Opens upward when the toolbar sits too close to the bottom of the window for the list to fit below it.
  const [upward, setUpward] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const current = props.items.find((item) => item.id === props.currentId);

  // Close when the user clicks anywhere outside the picker. composedPath() sees inside our Shadow DOM.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !e.composedPath().includes(rootRef.current)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open]);

  // When the list opens, put keyboard focus on the current row, so arrow keys start from there.
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
    if (id !== props.currentId) props.onPick(id);
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
    <div ref={rootRef} className={`fo-picker${props.small ? ' fo-picker-small' : ''}`}>
      <button
        ref={buttonRef}
        className="fo-picker-button"
        aria-label={props.ariaLabel}
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
        {current?.icon}
        <span className="fo-picker-name">{current?.label ?? props.placeholder}</span>
        <span className="fo-picker-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div ref={listRef} className={`fo-picker-list${upward ? ' fo-picker-up' : ''}`} role="listbox" aria-label={props.ariaLabel} onKeyDown={onListKey}>
          {props.items.map((item) => (
            <button key={item.id} className="fo-picker-option" role="option" aria-selected={item.id === props.currentId} onClick={() => pick(item.id)}>
              {item.icon}
              <span className="fo-picker-name">{item.label}</span>
              {item.id === props.currentId && <span className="fo-picker-check" aria-hidden="true">✓</span>}
            </button>
          ))}
          {props.extra && (
            <button
              className="fo-picker-option fo-picker-new"
              role="option"
              aria-selected={false}
              onClick={() => {
                setOpen(false);
                props.extra!.onClick();
              }}
            >
              {props.extra.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
