import { useEffect, useMemo, useState } from 'react';
import { pageUrl } from '@/lib/engine/pageUrl';
import { getAdvancedSettings, getForests, getStashes, getSeedsForUrl, getSettings, getToolbarState, onDataChanged, type AdvancedSettings, type Forest, type StashState, type Seed, type SpriteType, type ToolbarState } from '@/lib/storage';

/**
 * Everything the on-page UI reads from storage, kept up to date when storage changes in any tab.
 * `recentSprites` is the three sprites used last, newest first. `seeds` holds only the current forest's seeds on this page: seeds from other forests stay hidden
 * until that forest is chosen. `advanced` is the Advanced settings (owl, frog, default sprite size) and `stashes` the
 * user's toolbar stashes; both are null until read.
 */
export function usePageData(): { toolbar: ToolbarState | null; forests: Forest[]; currentForestId: string | null; recentSprites: SpriteType[]; seeds: Seed[]; advanced: AdvancedSettings | null; stashes: StashState | null } {
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null);
  const [forests, setForests] = useState<Forest[]>([]);
  const [currentForestId, setCurrentForestId] = useState<string | null>(null);
  const [recentSprites, setRecentSprites] = useState<SpriteType[]>([]);
  const [allPageSeeds, setAllPageSeeds] = useState<Seed[]>([]);
  const [advanced, setAdvanced] = useState<AdvancedSettings | null>(null);
  const [stashes, setStashes] = useState<StashState | null>(null);

  useEffect(() => {
    const refresh = async () => {
      const [allForests, settings, pageSeeds, toolbarState, advancedSettings, stashState] = await Promise.all([getForests(), getSettings(), getSeedsForUrl(pageUrl()), getToolbarState(), getAdvancedSettings(), getStashes()]);
      setAdvanced(advancedSettings);
      setStashes(stashState);
      setToolbar(toolbarState);
      setForests(allForests);
      setCurrentForestId(settings.currentForestId);
      setRecentSprites(settings.recentSprites);
      setAllPageSeeds(pageSeeds);
    };
    void refresh();
    return onDataChanged(() => void refresh());
  }, []);

  const seeds = useMemo(() => allPageSeeds.filter((s) => s.forestId === currentForestId), [allPageSeeds, currentForestId]);

  return { toolbar, forests, currentForestId, recentSprites, seeds, advanced, stashes };
}
