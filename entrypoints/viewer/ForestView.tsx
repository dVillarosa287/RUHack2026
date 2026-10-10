import { getForest, getSeedsForForest } from '@/lib/storage';
import { ForestHeader } from './ForestHeader';
import { ForestList } from './ForestList';
import { useStored } from './useStored';

/**
 * A forest as a list of its annotations. This file is only the layout, so several people can work on the pieces
 * at once: the header (ForestHeader, with room for buttons on the right), a sidebar column on the left (not built
 * yet, the folder sidebar goes in the marked spot), and the list itself (ForestList).
 */
export function ForestView({ forestId }: { forestId: string }) {
  const data = useStored(async () => ({ forest: await getForest(forestId), seeds: await getSeedsForForest(forestId) }), [forestId]);

  if (!data) return <p>Loading…</p>;
  if (!data.forest) return <p>This forest no longer exists.</p>;

  const pageCount = new Set(data.seeds.map((s) => s.url)).size;
  const summary = `${data.seeds.length} ${data.seeds.length === 1 ? 'seed' : 'seeds'} on ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`;

  return (
    <>
      <ForestHeader forest={data.forest} summary={summary} />
      <div className="flex gap-6">
        {/* The folder sidebar goes here, as the first child of this row. */}
        <div className="min-w-0 flex-1">
          <ForestList seeds={data.seeds} />
        </div>
      </div>
    </>
  );
}
