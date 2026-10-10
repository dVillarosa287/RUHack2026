import { useCallback, useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  MarkerTracker,
  buildMarkerAnchor,
  buildQuoteAnchor,
  flashHighlight,
  getHighlightRange,
  highlightIdAtPoint,
  nearbyText,
  paintHighlights,
  scrollToHighlight,
  scrollToPageY,
  startDigging,
  startPlanting,
} from '@/lib/engine';
import {
  createForest,
  deleteSeed,
  getForests,
  getSeedsForUrl,
  getSettings,
  getToolbarState,
  onDataChanged,
  saveSeed,
  takePendingJump,
  updateSeed,
  updateSettings,
  updateToolbarState,
  type Forest,
  type Seed,
  type SpriteType,
  type ToolbarState,
} from '@/lib/storage';
import { DEFAULT_COLOR_ID, FOREST_ICONS } from '@/lib/theme';
import { MarkerLayer } from './MarkerLayer';
import { Toolbar, type Tool } from './Toolbar';

const RETRY_DELAYS_MS = [500, 1000, 2000, 4000, 8000];

/** Runs on every web page. Draws the saved annotations, and the toolbar when the user opens it. */
export function App({ shadowHost }: { shadowHost: HTMLElement }) {
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null);
  const [tool, setTool] = useState<Tool>('none');
  const [spriteType, setSpriteType] = useState<SpriteType>('sprout');
  const [colorId, setColorId] = useState(DEFAULT_COLOR_ID);
  const [forests, setForests] = useState<Forest[]>([]);
  const [currentForestId, setCurrentForestId] = useState<string | null>(null);
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [status, setStatus] = useState('');
  const [flashId, setFlashId] = useState<string | null>(null);

  const seedsRef = useRef<Seed[]>([]);
  const jumpRef = useRef<string | null>(null);
  seedsRef.current = seeds;

  const say = useCallback((message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus((current) => (current === message ? '' : current)), 2500);
  }, []);

  // ----- load data, and reload whenever storage changes anywhere -----
  useEffect(() => {
    const refresh = async () => {
      const [allForests, settings, pageSeeds, toolbarState] = await Promise.all([getForests(), getSettings(), getSeedsForUrl(window.location.href), getToolbarState()]);
      setToolbar(toolbarState);
      setForests(allForests);
      setCurrentForestId(settings.currentForestId);
      setSeeds(pageSeeds);
    };
    void refresh();
    return onDataChanged(() => void refresh());
  }, []);

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

  // ----- scroll to a seed that the viewer asked us to show -----
  const attemptJump = useCallback(() => {
    const id = jumpRef.current;
    const seed = id ? seedsRef.current.find((s) => s.id === id) : undefined;
    if (!id || !seed) return;
    if (seed.kind === 'highlight') {
      if (!getHighlightRange(id)) return;
      scrollToHighlight(id);
      flashHighlight(id);
    } else {
      if (!seed.anchor) return;
      scrollToPageY(new MarkerTracker(seed.anchor).position().y + window.scrollY);
      setFlashId(id);
      window.setTimeout(() => setFlashId(null), 2000);
    }
    jumpRef.current = null;
  }, []);

  useEffect(() => {
    void takePendingJump(window.location.href).then((id) => {
      jumpRef.current = id;
      attemptJump();
    });
  }, [attemptJump]);

  // ----- paint highlights; pages that load text late get a few more tries -----
  useEffect(() => {
    let attempt = 0;
    let timer: number | undefined;
    const run = () => {
      const found = paintHighlights(seeds);
      attemptJump();
      const missing = seeds.some((s) => s.kind === 'highlight' && s.anchor?.quote && !found.has(s.id));
      if (missing && attempt < RETRY_DELAYS_MS.length) timer = window.setTimeout(run, RETRY_DELAYS_MS[attempt++]);
    };
    run();
    return () => window.clearTimeout(timer);
  }, [seeds, attemptJump]);

  // ----- the active tool -----
  const isInsideUi = useCallback((target: EventTarget | null) => target instanceof Node && shadowHost.contains(target), [shadowHost]);

  const removeSeed = useCallback(
    async (seedId: string) => {
      await deleteSeed(seedId);
      say('Removed');
    },
    [say],
  );

  useEffect(() => {
    if (tool === 'dig') {
      return startDigging({ isInsideUi, findSeedAt: highlightIdAtPoint, onDig: (id) => void removeSeed(id) });
    }
    if (tool !== 'plant' || !currentForestId) return;
    return startPlanting({
      isInsideUi,
      onHighlight: async (range, text) => {
        const anchor = buildQuoteAnchor(range);
        if (!anchor) return say('Could not save that selection');
        await saveSeed({ forestId: currentForestId, kind: 'highlight', spriteType, color: colorId, url: window.location.href, pageTitle: document.title, text, anchor });
        say('Highlight saved');
      },
      onPlace: async ({ clientX, clientY, target }) => {
        await saveSeed({
          forestId: currentForestId,
          kind: 'sprite',
          spriteType,
          color: colorId,
          url: window.location.href,
          pageTitle: document.title,
          text: nearbyText(target),
          anchor: buildMarkerAnchor(clientX, clientY, target),
        });
        say('Marker placed');
      },
    });
  }, [tool, spriteType, colorId, currentForestId, isInsideUi, removeSeed, say]);

  // ----- toolbar actions -----
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
          onMoved={(position) => void updateToolbarState(position)}
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
            const forest = await createForest({ name, icon: FOREST_ICONS[forests.length % FOREST_ICONS.length] ?? '🌲' });
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
