import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Tool } from '@/lib/engine';
import type { Forest, Stash, SpriteType } from '@/lib/storage';
import { SPRITES, cap, getWords, spriteLabel, useThemeId } from '@/lib/theme';
import { CameraIcon } from '@/lib/theme/CameraIcon';
import { ShovelIcon } from '@/lib/theme/ShovelIcon';
import { ForestIcon, SpriteIcon } from '@/lib/theme/SpriteIcon';
import { ForestPicker } from './ForestPicker';
import { hotbarKey, hotbarOf, toolbarLayout } from './hotbar';
import { Picker } from './Picker';

interface ToolbarProps {
  forests: Forest[];
  currentForestId: string | null;
  tool: Tool;
  spriteType: SpriteType;
  status: string;
  /** Distance in px from the top and right edges of the window. */
  position: { top: number; right: number };
  /** Size of the toolbar, 1 is the default size. */
  scale: number;
  onMoved(position: { top: number; right: number }): void;
  onResized(scale: number): void;
  onClose(): void;
  onPickSprite(type: SpriteType): void;
  /** The user pressed a sprite button. If they then move the mouse, they are carrying the sprite onto the page. */
  onSpritePointerDown(type: SpriteType, e: ReactPointerEvent<HTMLElement>): void;
  onPickShovel(): void;
  onSwitchForest(id: string): void;
  onCreateForest(name: string): void;
  /** The tree button: open the current forest in the viewer. */
  onOpenCurrentForest(): void;
  /** The stashes to choose from (the default first) and the one in use, which sets the sprite buttons. */
  stashes: Stash[];
  stash: Stash;
  onSwitchStash(id: string): void;
  /** "+ Make your own stash": opens the stash editor in the viewer's Settings. */
  onEditStashes(): void;
  /** The camera is on: the chosen sprite takes a screenshot when the user drags a box. */
  camera: boolean;
  onToggleCamera(): void;
}

/** Pressing on these does not drag the toolbar. The forest list counts too, so its edges between rows do not start a drag. */
const INTERACTIVE = 'button, input, [role="listbox"]';
const MIN_SCALE = 0.7;
const MAX_SCALE = 1.8;
/** What a saved scale of 1 looks like. The toolbar's default size is a little smaller than the art's natural size. */
const DEFAULT_ZOOM = 0.85;

/** Keeps the toolbar fully inside the window, so it can never end up out of reach. */
function clampToWindow(position: { top: number; right: number }, el: HTMLElement | null) {
  const rect = el?.getBoundingClientRect();
  const width = rect?.width ?? 0;
  const height = rect?.height ?? 0;
  return {
    top: Math.min(Math.max(0, position.top), Math.max(0, window.innerHeight - height)),
    right: Math.min(Math.max(0, position.right), Math.max(0, window.innerWidth - width)),
  };
}

export function Toolbar(props: ToolbarProps) {
  // The sprites' names follow the theme (the Minimal theme calls the flower a star, and so on).
  const themeId = useThemeId();
  const words = getWords(themeId); // "forest" or "folder", by theme
  const [naming, setNaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  // While dragging, the toolbar follows the mouse here. The saved position is only written when you let go.
  const [dragPosition, setDragPosition] = useState<{ top: number; right: number } | null>(null);
  // The same for resizing.
  const [dragScale, setDragScale] = useState<number | null>(null);
  const scale = dragScale ?? props.scale;
  const hotbar = hotbarOf(props.stash);
  const [, setWindowSize] = useState(0);

  useEffect(() => {
    const onResize = () => setWindowSize((n) => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Re-measure after the first render and whenever the scale changes, so the clamp knows the toolbar's size.
  useLayoutEffect(() => setWindowSize((n) => n + 1), [scale]);

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

  /** The corner handle scales the whole toolbar. Dragging left or down makes it bigger, since it is pinned to the right. */
  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startWidth = Math.max(1, rootRef.current?.getBoundingClientRect().width ?? 1);
    const startX = e.clientX;
    const startScale = scale;
    const room = window.innerWidth - shown.right; // the most width the toolbar can take without leaving the window
    let latest = startScale;
    const move = (ev: PointerEvent) => {
      const wanted = startScale * ((startWidth + (startX - ev.clientX)) / startWidth);
      const fits = startScale * (room / startWidth);
      latest = Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(wanted, fits))) * 100) / 100;
      setDragScale(latest);
    };
    const stop = () => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', stop, true);
      setDragScale(null);
      props.onResized(latest);
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
      <div className="fo-scale" style={{ zoom: scale * DEFAULT_ZOOM }}>
        <div className="fo-forest-row">
          <span className="fo-grip" title="Drag to move the toolbar" aria-hidden="true">⠿</span>
          {naming ? (
            <>
              <input
                autoFocus
                value={draftName}
                placeholder={`${cap(words.forest)} name`}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitName();
                  if (e.key === 'Escape') setNaming(false);
                }}
              />
              <button className="fo-small-button" onClick={submitName}>Create</button>
            </>
          ) : (
            <ForestPicker forests={props.forests} currentForestId={props.currentForestId} onSwitchForest={props.onSwitchForest} onCreateNew={() => setNaming(true)} />
          )}
          <button className="fo-close" title="Close the toolbar" aria-label="Close the toolbar" onClick={props.onClose}>✕</button>
        </div>

        <div className="fo-panel">
          <div className="fo-tools">
            {toolbarLayout(hotbar).flatMap((row, r) =>
              row.map((slot, c) => {
                // Where each button sits is in hotbar.ts. Grid column 5 is the slight gap before the lily pad and apple column.
                const place = { gridRow: r + 1, gridColumn: c < 4 ? c + 1 : c + 2 };
                if (slot === null) return null;
                if (slot === 'shovel') {
                  return (
                    <button key={slot} style={place} className="fo-tool fo-tip-end" aria-label="Shovel" data-tip="Remove a sprite" aria-pressed={props.tool === 'dig'} onClick={props.onPickShovel}>
                      <ShovelIcon size={28} />
                    </button>
                  );
                }
                if (slot === 'forest') {
                  return (
                    <button key={slot} style={place} className="fo-tool fo-tip-end" aria-label="Open this forest" data-tip={cap(words.forest)} onClick={props.onOpenCurrentForest}>
                      <ForestIcon icon="tree" size={28} />
                    </button>
                  );
                }
                const tip = SPRITES[slot].tip;
                const name = spriteLabel(slot, themeId);
                const key = hotbarKey(hotbar.indexOf(slot));
                // aria-label stays the plain English sprite name whatever the theme; the themed name is the hover text.
                return (
                  <button key={slot} style={place} className="fo-tool" title={tip ? undefined : key ? `${name} (${key})` : name} aria-label={SPRITES[slot].label} data-tip={tip ? `${name}: ${tip}` : undefined} aria-pressed={props.tool === 'plant' && props.spriteType === slot} onClick={() => props.onPickSprite(slot)} onPointerDown={(e) => props.onSpritePointerDown(slot, e)}>
                    <SpriteIcon type={slot} size={28} />
                    {key && <span className="fo-key" aria-hidden="true">{key}</span>}
                  </button>
                );
              }),
            )}
          </div>

          {/* Same columns as the sprite tiles: the stash drop-down, then the camera under the tree button. */}
          <div className="fo-stash-row">
            <div className="fo-stash-pick">
              <span className="fo-stash-label">Stash</span>
              <Picker
                small
                ariaLabel="Stash"
                placeholder="Default"
                currentId={props.stash.id}
                onPick={props.onSwitchStash}
                items={props.stashes.map((l) => ({ id: l.id, label: l.name }))}
                extra={{ label: '+ Make or edit stashes', onClick: props.onEditStashes }}
              />
            </div>
            <button className="fo-tool fo-camera fo-tip-end" aria-label="Camera" data-tip="Screenshot: pick a sprite, then drag a box" aria-pressed={props.camera} onClick={props.onToggleCamera}>
              <CameraIcon size={20} />
            </button>
          </div>

          <div className="fo-status" role="status">{props.status}</div>
        </div>
      </div>
      <div className="fo-resize" title="Drag to resize the toolbar" onPointerDown={startResize} />
    </div>
  );
}
