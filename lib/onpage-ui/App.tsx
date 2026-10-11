import { useCallback, useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { buildMarkerAnchor, nearbyText, useDropSprite, usePlanting, useSeedsOnPage, type Tool } from '@/lib/engine';
import { createForest, deleteSeed, restoreSeed, updateSeed, updateSettings, updateToolbarState, type Seed, type SpriteType } from '@/lib/storage';
import { CursorSprite } from './CursorSprite';
import { DEFAULT_COLOR_ID, FOREST_ICONS, SPRITE_ORDER } from '@/lib/theme';
import { MarkerLayer } from './MarkerLayer';
import { ScrollRail } from './ScrollRail';
import { Toolbar } from './Toolbar';
import { usePageData } from './usePageData';
import { useSpriteDrag } from './useSpriteDrag';

/**
 * Runs on every web page. It only puts the pieces together:
 *  - usePageData     reads everything from storage          (this folder)
 *  - useSeedsOnPage  draws saved highlights, jumps to seeds (lib/engine)
 *  - usePlanting     turns mouse activity into seeds        (lib/engine)
 *  - useDropSprite   saves a sprite dropped from the toolbar (lib/engine), useSpriteDrag carries it (this folder)
 *  - MarkerLayer, CursorSprite, Toolbar and ScrollRail draw the markers, the sprite on the mouse, the toolbar and the rail (this folder)
 */
export function App({ shadowHost }: { shadowHost: HTMLElement }) {
  const { toolbar, forests, currentForestId, seeds } = usePageData();
  const [tool, setTool] = useState<Tool>('none');
  const [spriteType, setSpriteType] = useState<SpriteType>('sprout');
  const [colorId, setColorId] = useState(DEFAULT_COLOR_ID);
  const [status, setStatus] = useState('');
  const [markerScale, setMarkerScale] = useState(1);
  const history = useRef<Array<{ undo(): Promise<void>; redo(): Promise<void> }>>([]);
  const undone = useRef<Array<{ undo(): Promise<void>; redo(): Promise<void> }>>([]);

  const say = useCallback((message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus((current) => (current === message ? '' : current)), 2500);
  }, []);

  const isInsideUi = useCallback((target: EventTarget | null) => target instanceof Node && shadowHost.contains(target), [shadowHost]);

  const record = useCallback((action: { undo(): Promise<void>; redo(): Promise<void> }) => {
    history.current.push(action);
    undone.current = [];
  }, []);
  const onCreated = useCallback((seed: Seed) => record({ undo: () => deleteSeed(seed.id), redo: () => restoreSeed(seed) }), [record]);
  const onDeleted = useCallback((seed: Seed) => record({ undo: () => restoreSeed(seed), redo: () => deleteSeed(seed.id) }), [record]);

  const { flashId, jumpToSeed } = useSeedsOnPage(seeds);
  const { removeSeed } = usePlanting({ tool, spriteType, colorId, forestId: currentForestId, isInsideUi, say, onCreated, onDeleted });
  const dropSprite = useDropSprite({ colorId, forestId: currentForestId, isInsideUi, say, onCreated });
  // The three sprites used last are kept in settings, newest first, and shown on the toolbar.
  const { dragging, startSpriteDrag } = useSpriteDrag({
    onDrop: (type, x, y) => {
      // A lily pad only goes on text, so dropping it just picks it up as the tool.
      if (type === 'lilypad') {
        setSpriteType('lilypad');
        setTool('plant');
        return say('Lily pads go on text: drag over a sentence');
      }
      dropSprite(type, x, y);
    },
  });
  // The sprite on the mouse: the one being carried, or else the one chosen for planting.
  const spriteOnMouse = dragging ?? (tool === 'plant' ? spriteType : null);

  // The tool is put down when the toolbar closes, and with the Esc key.
  const visible = toolbar?.open ?? false;
  useEffect(() => {
    if (!visible) setTool('none');
  }, [visible]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      const editing = target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, [contenteditable="true"]'));
      if (editing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        const source = e.shiftKey ? undone : history;
        const destination = e.shiftKey ? history : undone;
        const action = source.current.pop();
        if (!action) return;
        void (e.shiftKey ? action.redo() : action.undo()).then(() => destination.current.push(action));
        return;
      }
      const slot = Number(e.key) - 1;
      if (!e.ctrlKey && !e.metaKey && !e.altKey && Number.isInteger(slot) && SPRITE_ORDER[slot]) {
        e.preventDefault();
        setSpriteType(SPRITE_ORDER[slot]);
        setTool('plant');
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setTool('none');
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setMarkerScale((scale) => Math.max(0.5, Math.round((scale - 0.1) * 10) / 10));
        return;
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setMarkerScale((scale) => Math.min(2, Math.round((scale + 0.1) * 10) / 10));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const openViewer = (forestId?: string) => void browser.runtime.sendMessage({ type: 'forest:open-viewer', forestId });

  return (
    <>
      <MarkerLayer
        seeds={seeds}
        markerScale={markerScale}
        digging={tool === 'dig'}
        flashId={flashId}
        onDig={(id) => void removeSeed(id)}
        onMove={async (id, x, y, target) => {
          const previous = seeds.find((seed) => seed.id === id);
          if (!previous) return;
          const next = await updateSeed(id, { anchor: buildMarkerAnchor(x, y, target), ...(previous.linkTarget ? {} : { text: nearbyText(target) }) });
          record({ undo: () => restoreSeed(previous), redo: () => restoreSeed(next) });
        }}
      />
      <CursorSprite type={visible ? spriteOnMouse : null} color={colorId} showOverUi={dragging !== null} isInsideUi={isInsideUi} />
      {toolbar && visible && (
        <Toolbar
          position={{ top: toolbar.top, right: toolbar.right }}
          scale={toolbar.scale}
          onMoved={(position) => void updateToolbarState(position)}
          onResized={(scale) => void updateToolbarState({ scale })}
          onClose={() => void updateToolbarState({ open: false })}
          forests={forests}
          currentForestId={currentForestId}
          tool={tool}
          spriteType={spriteType}
          colorId={colorId}
          status={status}
          onPickSprite={(type) => {
            // Clicking the active sprite again puts it down.
            if (tool === 'plant' && spriteType === type) return setTool('none');
            setSpriteType(type);
            setTool('plant');
            if (type === 'lilypad') say('Lily pads go on text: drag over a sentence');
          }}
          onSpritePointerDown={startSpriteDrag}
          onPickShovel={() => setTool(tool === 'dig' ? 'none' : 'dig')}
          onPickColor={setColorId}
          onSwitchForest={(id) => void updateSettings({ currentForestId: id })}
          onCreateForest={async (name) => {
            const forest = await createForest({ name, icon: FOREST_ICONS[forests.length % FOREST_ICONS.length] ?? 'tree' });
            await updateSettings({ currentForestId: forest.id });
            say(`Created ${name}`);
          }}
          onOpenCurrentForest={() => openViewer(currentForestId ?? undefined)}
        />
      )}
      {visible && <ScrollRail seeds={seeds} onJump={jumpToSeed} />}
    </>
  );
}
