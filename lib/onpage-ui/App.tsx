import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { buildMarkerAnchor, nearbyText, useDropSprite, usePlanting, useSeedsOnPage, type Tool } from '@/lib/engine';
import { createForest, updateSeed, updateSettings, updateToolbarState, type SpriteType } from '@/lib/storage';
import { CursorSprite } from './CursorSprite';
import { DEFAULT_COLOR_ID, FOREST_ICONS, spriteImageUrl } from '@/lib/theme';
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
  const { toolbar, forests, currentForestId, recentSprites, seeds } = usePageData();
  const [tool, setTool] = useState<Tool>('none');
  const [spriteType, setSpriteType] = useState<SpriteType>('sprout');
  const [colorId, setColorId] = useState(DEFAULT_COLOR_ID);
  const [status, setStatus] = useState('');

  const say = useCallback((message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus((current) => (current === message ? '' : current)), 2500);
  }, []);

  const isInsideUi = useCallback((target: EventTarget | null) => target instanceof Node && shadowHost.contains(target), [shadowHost]);

  const { flashId, jumpToSeed } = useSeedsOnPage(seeds);
  const { removeSeed } = usePlanting({ tool, spriteType, colorId, forestId: currentForestId, isInsideUi, say });
  const dropSprite = useDropSprite({ colorId, forestId: currentForestId, isInsideUi, say });
  // The three sprites used last are kept in settings, newest first, and shown on the toolbar.
  const rememberSprite = (type: SpriteType) => void updateSettings({ recentSprites: [type, ...recentSprites.filter((t) => t !== type)].slice(0, 3) });
  const { dragging, startSpriteDrag } = useSpriteDrag({
    onDrop: (type, x, y) => {
      rememberSprite(type);
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
      if (e.key === 'Escape') setTool('none');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const openViewer = (forestId?: string) => void browser.runtime.sendMessage({ type: 'forest:open-viewer', forestId });

  return (
    <>
      <MarkerLayer
        seeds={seeds}
        digging={tool === 'dig'}
        flashId={flashId}
        onDig={(id) => void removeSeed(id)}
        onMove={(id, x, y, target) => void updateSeed(id, { anchor: buildMarkerAnchor(x, y, target), ...(seeds.find((s) => s.id === id)?.linkTarget ? {} : { text: nearbyText(target) }) })}
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
          recentSprites={recentSprites}
          status={status}
          onPickSprite={(type) => {
            // Clicking the active sprite again puts it down.
            if (tool === 'plant' && spriteType === type) return setTool('none');
            setSpriteType(type);
            setTool('plant');
            rememberSprite(type);
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
          onOpenAllForests={() => openViewer()}
        />
      )}
      {visible && <ScrollRail seeds={seeds} onJump={jumpToSeed} />}
    </>
  );
}
