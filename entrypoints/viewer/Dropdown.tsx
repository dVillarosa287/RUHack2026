import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange(value: string): void;
  /** Shown on the button when no option matches `value`. */
  placeholder?: string;
  disabled?: boolean;
  /** For screen readers, when there is no visible label next to it. */
  ariaLabel?: string;
  /** Extra classes for the outer box, for width (for example `w-full` or `flex-1 min-w-0`). */
  className?: string;
  /** `sm` for the small text-xs fields in the AI panels. */
  size?: 'sm' | 'md';
}

/** How tall the open list can get, in px. Used to decide whether it opens downward or upward. */
const LIST_MAX_HEIGHT = 240;

/**
 * The viewer's drop-down. Our own list instead of a native <select>, because the browser draws a <select>'s open
 * list itself, in its own colors, which ignore the theme. It looks and works like the toolbar's forest picker
 * (lib/onpage-ui/ForestPicker.tsx): arrow keys, Home, End, Esc, and a click outside closes it.
 */
export function Dropdown(props: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [upward, setUpward] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const current = props.options.find((o) => o.value === props.value);
  const small = props.size === 'sm';

  // Close when the user clicks anywhere outside, or when the field becomes disabled.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open]);
  useEffect(() => {
    if (props.disabled) setOpen(false);
  }, [props.disabled]);

  // When the list opens, focus the chosen option, so arrow keys start from there.
  useEffect(() => {
    if (!open) return;
    const selected = listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]:not(:disabled)');
    (selected ?? listRef.current?.querySelector<HTMLButtonElement>('[role="option"]:not(:disabled)'))?.focus();
  }, [open]);

  const toggle = () => {
    if (props.disabled) return;
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

  const pick = (value: string) => {
    close();
    if (value !== props.value) props.onChange(value);
  };

  const onListKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)') ?? []);
    const at = rows.indexOf(e.target as HTMLButtonElement);
    let next: number | null = null;
    if (e.key === 'ArrowDown') next = Math.min(rows.length - 1, at + 1);
    else if (e.key === 'ArrowUp') next = Math.max(0, at - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = rows.length - 1;
    else if (e.key === 'Escape' || e.key === 'Tab') close();
    else return;
    e.preventDefault();
    if (next !== null) rows[next]?.focus();
  };

  const text = small ? 'text-xs' : 'text-sm';
  return (
    <div ref={rootRef} className={`relative ${props.className ?? ''}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={props.disabled}
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
        className={`flex w-full items-center gap-2 rounded-lg border bg-surface-alt text-left text-ink ${text} ${small ? 'px-2 py-1.5' : 'px-3 py-2'} ${open ? 'border-primary' : 'border-edge'} ${props.disabled ? 'cursor-default opacity-60' : 'cursor-pointer hover:brightness-115'} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
      >
        <span className={`min-w-0 flex-1 truncate ${current ? '' : 'text-ink-muted'}`}>{current?.label ?? props.placeholder ?? ''}</span>
        <span aria-hidden="true" className={`flex-none text-xs text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={props.ariaLabel}
          onKeyDown={onListKey}
          className={`absolute left-0 z-30 flex min-w-full flex-col gap-0.5 overflow-y-auto rounded-xl border border-edge bg-surface-alt p-1 shadow-lg shadow-drop ${upward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}
          style={{ maxHeight: LIST_MAX_HEIGHT }}
        >
          {props.options.map((o) => {
            const selected = o.value === props.value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={o.disabled}
                onClick={() => pick(o.value)}
                className={`flex w-full flex-none items-center gap-2 whitespace-nowrap rounded-lg px-2 py-1.5 text-left text-ink ${text} ${selected ? 'bg-surface' : ''} ${o.disabled ? 'cursor-default opacity-50' : 'cursor-pointer hover:bg-primary-soft focus:bg-primary-soft'} focus:outline-none`}
              >
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {selected && <span aria-hidden="true" className="flex-none font-bold text-primary">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
