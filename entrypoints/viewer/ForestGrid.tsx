import { getForests, getSeedsForForest } from '@/lib/storage';
import { ForestIcon } from '@/lib/theme/SpriteIcon';
import { useStored } from './useStored';

export function ForestGrid() {
  const forests = useStored(async () => {
    const all = await getForests();
    return Promise.all(all.map(async (forest) => ({ forest, seedCount: (await getSeedsForForest(forest.id)).length })));
  }, []);

  if (!forests) return <p>Loading…</p>;

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Your forests</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {forests.map(({ forest, seedCount }) => (
          <a key={forest.id} href={`#/forest/${forest.id}`} className="flex flex-col items-center rounded-xl border-2 border-edge/40 bg-surface p-4 text-center shadow-sm shadow-drop hover:border-primary hover:bg-primary-soft">
            <ForestIcon icon={forest.icon} size={72} />
            <span className="mt-2 font-semibold">{forest.name}</span>
            <span className="text-sm text-ink-muted">{seedCount} {seedCount === 1 ? 'seed' : 'seeds'}</span>
          </a>
        ))}
      </div>
      <p className="mt-6 text-sm text-ink-muted">Create a new forest from the toolbar on any web page.</p>
    </>
  );
}
