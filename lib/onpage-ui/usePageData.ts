import { useEffect, useMemo, useState } from 'react';
import { getForests, getSeedsForUrl, getSettings, getToolbarState, onDataChanged, type Forest, type Seed, type ToolbarState } from '@/lib/storage';

/**
 * Everything the on-page UI reads from storage, kept up to date when storage changes in any tab.
 * `seeds` holds only the current forest's seeds on this page: seeds from other forests stay hidden
 * until that forest is chosen.
 */
export function usePageData(): { toolbar: ToolbarState | null; forests: Forest[]; currentForestId: string | null; seeds: Seed[] } {
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null);
  const [forests, setForests] = useState<Forest[]>([]);
  const [currentForestId, setCurrentForestId] = useState<string | null>(null);
  const [allPageSeeds, setAllPageSeeds] = useState<Seed[]>([]);

  useEffect(() => {
    const refresh = async () => {
      const [allForests, settings, pageSeeds, toolbarState] = await Promise.all([getForests(), getSettings(), getSeedsForUrl(window.location.href), getToolbarState()]);
      setToolbar(toolbarState);
      setForests(allForests);
      setCurrentForestId(settings.currentForestId);
      setAllPageSeeds(pageSeeds);
    };
    void refresh();
    return onDataChanged(() => void refresh());
  }, []);

  const seeds = useMemo(() => allPageSeeds.filter((s) => s.forestId === currentForestId), [allPageSeeds, currentForestId]);

  return { toolbar, forests, currentForestId, seeds };
}
