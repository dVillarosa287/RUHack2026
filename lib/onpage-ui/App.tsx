import { useCallback, useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { buildMarkerAnchor, nearbyText, useDropSprite, usePlanting, useSeedsOnPage, type Tool } from '@/lib/engine';
import { createForest, deleteSeed, getSeed, restoreSeed, updateSeed, updateSettings, updateToolbarState, type Seed, type SpriteType } from '@/lib/storage';
import { CursorSprite } from './CursorSprite';
import { FOREST_ICONS, TEXT_ONLY_SPRITES, spriteLabel, spriteTakesNote, useThemeId } from '@/lib/theme';
import { ReviewPopup } from './ReviewPopup';
import { MarkerLayer } from './MarkerLayer';
import { ScrollRail } from './ScrollRail';
import { NoteEditor, NoteTooltip } from './SeedNote';
import { Toolbar } from './Toolbar';
import { useKeybinds } from './useKeybinds';
import { usePageData } from './usePageData';
import { useSpriteDrag } from './useSpriteDrag';

/**
 * Runs on every web page. It only puts the pieces together:
 *  - usePageData     reads everything from storage          (this folder)
 *  - useSeedsOnPage  draws saved highlights, jumps to seeds (lib/engine)
 *  - usePlanting     turns mouse activity into seeds        (lib/engine)
 *  - useDropSprite   saves a sprite dropped from the toolbar (lib/engine), useSpriteDrag carries it (this folder)
 *  - MarkerLayer, CursorSprite, Toolbar and ScrollRail draw the markers, the sprite on the mouse, the toolbar and the rail (this folder)
 *  - NoteEditor and NoteTooltip let the user write their own note on a seed and show it on hover (SeedNote.tsx)
 */
export function App({ shadowHost }: { shadowHost: HTMLElement }) {
  const { toolbar, forests, currentForestId, seeds } = usePageData();
  const [tool, setTool] = useState<Tool>('none');
  const [spriteType, setSpriteType] = useState<SpriteType>('sprout');
  const [status, setStatus] = useState('');
  const themeId = useThemeId(); // for the sprite names in messages (the Minimal theme calls them Star, Triangle, ...)
  // The size the next sprite is planted at (1 is normal). - and + change it; sprites already planted keep their own size.
  const [plantScale, setPlantScale] = useState(1);
  // The seed whose note box is open (right after planting it, or after clicking its sprite), and the one under the mouse.
  const [noteSeedId, setNoteSeedId] = useState<string | null>(null);
  const [hoverSeedId, setHoverSeedId] = useState<string | null>(null);
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
  const onCreated = useCallback(
    (seed: Seed) => {
      record({ undo: () => deleteSeed(seed.id), redo: () => restoreSeed(seed) });
      // Every new seed asks for the user's own note, except the lily pad and the apple (quiz material).
      if (spriteTakesNote(seed.spriteType)) setNoteSeedId(seed.id);
    },
    [record],
  );
  // Saves a note (an empty one removes it). Ctrl+Z puts the old one back.
  const saveNote = useCallback(
    async (seedId: string, typed: string) => {
      const previous = await getSeed(seedId);
      const note = typed.trim();
      if (!previous || note === (previous.note ?? '')) return;
      const next = await updateSeed(seedId, { note: note || undefined });
      record({ undo: () => restoreSeed(previous), redo: () => restoreSeed(next) });
    },
    [record],
  );
  const onDeleted = useCallback((seed: Seed) => record({ undo: () => restoreSeed(seed), redo: () => deleteSeed(seed.id) }), [record]);

  const { flashId, jumpToSeed } = useSeedsOnPage(seeds);
  const { removeSeed } = usePlanting({ tool, spriteType, forestId: currentForestId, scale: plantScale, isInsideUi, say, onCreated, onDeleted });
  const dropSprite = useDropSprite({ forestId: currentForestId, scale: plantScale, isInsideUi, say, onCreated });
  // The three sprites used last are kept in settings, newest first, and shown on the toolbar.
  const { dragging, startSpriteDrag } = useSpriteDrag({
    onDrop: (type, x, y) => {
      // The lily pad and the apple only go on text, so dropping one just picks it up as the tool.
      if (TEXT_ONLY_SPRITES.includes(type)) {
        setSpriteType(type);
        setTool('plant');
        return say(`${spriteLabel(type, themeId)}s go on text: drag over a sentence`);
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
  useKeybinds({ enabled: visible, tool, setSpriteType, setTool, setPlantScale, history, undone });
  // Tell the user the new size when - or + changes it (not on the first render).
  const firstScale = useRef(true);
  useEffect(() => {
    if (firstScale.current) {
      firstScale.current = false;
      return;
    }
    say(`Sprite size ${Math.round(plantScale * 100)}%`);
  }, [plantScale, say]);

  // The new seed reaches `seeds` from storage a moment after it is planted; until then its note box waits.
  const noteSeed = seeds.find((seed) => seed.id === noteSeedId) ?? null;
  const hoverSeed = seeds.find((seed) => seed.id === hoverSeedId) ?? null;

  const openViewer = (forestId?: string) => void browser.runtime.sendMessage({ type: 'forest:open-viewer', forestId });

  return (
    <>
      <MarkerLayer
        seeds={seeds}
        digging={tool === 'dig'}
        flashId={flashId}
        onDig={(id) => void removeSeed(id)}
        onHover={setHoverSeedId}
        onEditNote={setNoteSeedId}
        onMove={async (id, x, y, target) => {
          const previous = seeds.find((seed) => seed.id === id);
          if (!previous) return;
          const next = await updateSeed(id, { anchor: buildMarkerAnchor(x, y, target), ...(previous.linkTarget ? {} : { text: nearbyText(target) }) });
          record({ undo: () => restoreSeed(previous), redo: () => restoreSeed(next) });
        }}
      />
      {noteSeed && <NoteEditor key={noteSeed.id} seed={noteSeed} onSave={(note) => void saveNote(noteSeed.id, note)} onClose={() => setNoteSeedId((id) => (id === noteSeed.id ? null : id))} />}
      {hoverSeed?.note && hoverSeed.id !== noteSeed?.id && <NoteTooltip key={hoverSeed.id} seed={hoverSeed} />}
      <CursorSprite type={visible ? spriteOnMouse : null} showOverUi={dragging !== null} scale={plantScale} isInsideUi={isInsideUi} />
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
          status={status}
          onPickSprite={(type) => {
            // Clicking the active sprite again puts it down.
            if (tool === 'plant' && spriteType === type) return setTool('none');
            setSpriteType(type);
            setTool('plant');
            if (TEXT_ONLY_SPRITES.includes(type)) say(`${spriteLabel(type, themeId)}s go on text: drag over a sentence`);
          }}
          onSpritePointerDown={startSpriteDrag}
          onPickShovel={() => setTool(tool === 'dig' ? 'none' : 'dig')}
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
      {/* An apple's active recall question, when its time is up. Shown even while the toolbar is closed. */}
      <ReviewPopup />
    </>
  );
}
