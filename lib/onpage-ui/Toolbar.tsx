import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Forest, SpriteType } from '@/lib/storage';
import { COLORS, SPRITES, SPRITE_ORDER } from '@/lib/theme';
import { ShovelIcon } from '@/lib/theme/ShovelIcon';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';

export type Tool = 'none' | 'plant' | 'dig';

interface ToolbarProps {
  forests: Forest[];
  currentForestId: string | null;
  tool: Tool;
  spriteType: SpriteType;
  colorId: string;
  status: string;
  /** Distance in px from the top and right edges of the window. */
  position: { top: number; right: number };
  onMoved(position: { top: number; right: number }): void;
  onClose(): void;
  onPickSprite(type: SpriteType): void;
  onPickShovel(): void;
  onPickColor(id: string): void;
  onSwitchForest(id: string): void;
  onCreateForest(name: string): void;
  onOpenCurrentForest(): void;
  onOpenAllForests(): void;
}

const INTERACTIVE = 'button, select, input, option';

/** Keeps the toolbar fully inside the window, so it can never end up out of reach. */
function clampToWindow(position: { top: number; right: number }, el: HTMLElement | null) {
  const width = el?.offsetWidth ?? 0;
  const height = el?.offsetHeight ?? 0;
  return {
    top: Math.min(Math.max(0, position.top), Math.max(0, window.innerHeight - height)),
    right: Math.min(Math.max(0, position.right), Math.max(0, window.innerWidth - width)),
  };
}

export function Toolbar(props: ToolbarProps) {
  const [naming, setNaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  // While dragging, the toolbar follows the mouse here. The saved position is only written when you let go.
  const [dragPosition, setDragPosition] = useState<{ top: number; right: number } | null>(null);
  const [, setWindowSize] = useState(0);

  useEffect(() => {
    const onResize = () => setWindowSize((n) => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Re-measure after the first render so the clamp knows the toolbar's size.
  useLayoutEffect(() => setWindowSize((n) => n + 1), []);

  const shown = clampToWindow(dragPosition ?? props.position, rootRef.current);

  /** Dragging works from any part of the toolbar that is not a button or a field. */
  const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest(INTERACTIVE)) return;
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY, ...shown };
    let latest = shown;
    const move = (ev: PointerEvent) => {
      latest = clampToWindow({ top: start.top + (ev.clientY - start.y), right: start.right - (ev.clientX - start.x) }, rootRef.current);
      setDragPosition(latest);
    };
    const stop = () => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', stop, true);
      setDragPosition(null);
      props.onMoved(latest);
    };
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', stop, true);
  };

  const submitName = () => {
    const name = draftName.trim();
    if (name) props.onCreateForest(name);
    setDraftName('');
    setNaming(false);
  };

  return (
    <div ref={rootRef} className={`fo-toolbar${dragPosition ? ' fo-dragging' : ''}`} style={{ top: shown.top, right: shown.right }} onPointerDown={startDrag}>
      <div className="fo-forest-row">
        <span className="fo-grip" title="Drag to move the toolbar" aria-hidden="true">⠿</span>
        {naming ? (
          <>
            <input
              autoFocus
              value={draftName}
              placeholder="Name of the new forest"
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitName();
                if (e.key === 'Escape') setNaming(false);
              }}
            />
            <button className="fo-small-button" onClick={submitName}>Create</button>
          </>
        ) : (
          <>
            <select aria-label="Current forest" value={props.currentForestId ?? ''} onChange={(e) => props.onSwitchForest(e.target.value)}>
              {props.forests.map((f) => (
                <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
              ))}
            </select>
            <button className="fo-small-button" title="Create a new forest" onClick={() => setNaming(true)}>+ New</button>
          </>
        )}
        <button className="fo-close" title="Close the toolbar" aria-label="Close the toolbar" onClick={props.onClose}>✕</button>
      </div>

      <div className="fo-panel">
        <div className="fo-row">
          {SPRITE_ORDER.map((type) => (
            <button key={type} className="fo-tool" title={SPRITES[type].label} aria-pressed={props.tool === 'plant' && props.spriteType === type} onClick={() => props.onPickSprite(type)}>
              <SpriteIcon type={type} size={26} />
            </button>
          ))}
          <div className="fo-divider" />
          <button className="fo-tool" title="Shovel: click a highlight or marker to remove it" aria-pressed={props.tool === 'dig'} onClick={props.onPickShovel}>
            <ShovelIcon size={26} />
          </button>
        </div>

        <div className="fo-row">
          {COLORS.map((c) => (
            <button key={c.id} className="fo-swatch" title={c.name} aria-label={c.name} aria-pressed={props.colorId === c.id} style={{ background: `var(--c-${c.id})` }} onClick={() => props.onPickColor(c.id)} />
          ))}
        </div>

        <div className="fo-hint">
          {props.tool === 'plant' && 'Drag over text to highlight it, or click to place a marker. Esc to stop.'}
          {props.tool === 'dig' && 'Click a highlight or a marker to remove it. Esc to stop.'}
          {props.tool === 'none' && 'Pick a sprite, then drag over text or click the page. Drag markers to move them.'}
        </div>

        <div className="fo-row">
          <button className="fo-button" onClick={props.onOpenCurrentForest}>Current Forest</button>
          <button className="fo-button" onClick={props.onOpenAllForests}>View Forests</button>
        </div>

        <div className="fo-status" role="status">{props.status}</div>
      </div>
    </div>
  );
}
