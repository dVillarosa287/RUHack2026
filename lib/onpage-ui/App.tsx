import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { buildMarkerAnchor, nearbyText, usePlanting, useSeedsOnPage, type Tool } from '@/lib/engine';
import { createForest, updateSeed, updateSettings, updateToolbarState, type SpriteType } from '@/lib/storage';
import { DEFAULT_COLOR_ID, FOREST_ICONS } from '@/lib/theme';
import { MarkerLayer } from './MarkerLayer';
import { Toolbar } from './Toolbar';
import { usePageData } from './usePageData';

/**
 * Runs on every web page. It only puts the pieces together:
 *  - usePageData     reads everything from storage          (this folder)
 *  - useSeedsOnPage  draws saved highlights, jumps to seeds (lib/engine)
 *  - usePlanting     turns mouse activity into seeds        (lib/engine)
 *  - MarkerLayer and Toolbar draw the markers and the toolbar (this folder)
 */
export function App({ shadowHost }: { shadowHost: HTMLElement }) {
  const { toolbar, forests, currentForestId, seeds } = usePageData();
  const [tool, setTool] = useState<Tool>('none');
  const [spriteType, setSpriteType] = useState<SpriteType>('sprout');
  const [colorId, setColorId] = useState(DEFAULT_COLOR_ID);
  const [status, setStatus] = useState('');

  const say = useCallback((message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus((current) => (current === message ? '' : current)), 2500);
  }, []);

  const isInsideUi = useCallback((target: EventTarget | null) => target instanceof Node && shadowHost.contains(target), [shadowHost]);

  const { flashId } = useSeedsOnPage(seeds);
  const { removeSeed } = usePlanting({ tool, spriteType, colorId, forestId: currentForestId, isInsideUi, say });

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
        onMove={(id, x, y, target) => void updateSeed(id, { anchor: buildMarkerAnchor(x, y, target), text: nearbyText(target) })}
      />
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
          }}
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
    </>
  );
}
