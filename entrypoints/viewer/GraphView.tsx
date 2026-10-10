import { getForest, getSeedsForForest } from '@/lib/storage';
import { ForestHeader } from './ForestHeader';
import { forestHref } from './route';
import { useStored } from './useStored';

/**
 * The forest as a graph of sprite nodes. NOT BUILT YET (Stage 2). This is the page the "Graph view" button on the
 * forest page will open. The graph library (@xyflow/react) and d3-force are already installed. Nodes use
 * Seed.graphX and Seed.graphY, and spread out automatically once when a node has no saved position.
 */
export function GraphView({ forestId }: { forestId: string }) {
  const data = useStored(async () => ({ forest: await getForest(forestId), seeds: await getSeedsForForest(forestId) }), [forestId]);

  if (!data) return <p>Loading…</p>;
  if (!data.forest) return <p>This forest no longer exists.</p>;

  return (
    <>
      <ForestHeader forest={data.forest} summary={`${data.seeds.length} seeds`} actions={<a href={forestHref(forestId)} className="rounded-lg border border-edge px-3 py-1.5 text-sm hover:bg-primary-soft">List view</a>} />
      <p className="rounded-xl bg-surface p-6 text-center text-ink-muted">The graph view is not built yet.</p>
    </>
  );
}
