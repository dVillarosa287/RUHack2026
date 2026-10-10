import { browser } from 'wxt/browser';
import { deleteSeed, getForest, getSeedsForForest, setPendingJump, updateSettings, type Seed } from '@/lib/storage';
import { SPRITES } from '@/lib/theme';
import { ShovelIcon } from '@/lib/theme/ShovelIcon';
import { ForestIcon, SpriteIcon } from '@/lib/theme/SpriteIcon';
import { useStored } from './useStored';

/**
 * Opens the seed's page in another window. That page scrolls to the seed once it has loaded.
 * Pages only show the current forest's seeds, so this makes the seed's forest the current one.
 */
async function openOnPage(seed: Seed) {
  await updateSettings({ currentForestId: seed.forestId });
  await setPendingJump(seed);
  await browser.windows.create({ url: seed.url });
}

async function remove(seed: Seed) {
  if (window.confirm('Remove this seed from the forest?')) await deleteSeed(seed.id);
}

function groupByPage(seeds: Seed[]): { url: string; title: string; seeds: Seed[] }[] {
  const groups = new Map<string, Seed[]>();
  for (const seed of seeds) groups.set(seed.url, [...(groups.get(seed.url) ?? []), seed]);
  return [...groups].map(([url, list]) => ({ url, title: list[0]?.pageTitle || url, seeds: list }));
}

export function ForestView({ forestId }: { forestId: string }) {
  const data = useStored(async () => ({ forest: await getForest(forestId), seeds: await getSeedsForForest(forestId) }), [forestId]);

  if (!data) return <p>Loading…</p>;
  if (!data.forest) return <p>This forest no longer exists.</p>;

  const pages = groupByPage(data.seeds);

  return (
    <>
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-semibold"><ForestIcon icon={data.forest.icon} size={40} />{data.forest.name}</h1>
      <p className="mb-6 text-sm text-ink-muted">{data.seeds.length} {data.seeds.length === 1 ? 'seed' : 'seeds'} on {pages.length} {pages.length === 1 ? 'page' : 'pages'}</p>

      {pages.length === 0 && <p className="rounded-xl bg-surface p-6 text-center text-ink-muted">Nothing planted here yet. Open any web page, click the Forest icon in Chrome's toolbar and pick a sprite.</p>}

      <div className="space-y-6">
        {pages.map((page) => (
          <section key={page.url} className="rounded-xl border-2 border-edge/30 bg-surface p-4">
            <h2 className="font-semibold">{page.title}</h2>
            <a href={page.url} target="_blank" rel="noreferrer" className="block truncate text-sm text-primary underline">{page.url}</a>
            <ul className="mt-3 space-y-2">
              {page.seeds.map((seed) => (
                <li key={seed.id} className="flex items-start gap-3 rounded-lg bg-surface-alt p-3">
                  <span className="mt-0.5 flex shrink-0 items-center justify-center" title={SPRITES[seed.spriteType].label}>
                    <SpriteIcon type={seed.spriteType} size={40} color={seed.color} grown={seed.growth === 'tree'} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-wide text-ink-muted">{seed.kind === 'highlight' ? 'Highlight' : 'Marker'} · {new Date(seed.createdAt).toLocaleString()}</p>
                    <p className="break-words">{seed.kind === 'highlight' ? `“${seed.text}”` : seed.text ? `Near: ${seed.text}` : 'Placed on the page'}</p>
                  </div>
                  <button className="shrink-0 rounded-lg border border-edge px-2 py-1 text-sm hover:bg-primary-soft" onClick={() => void openOnPage(seed)}>Open on page</button>
                  <button className="shrink-0 rounded-lg border border-edge p-1.5 hover:bg-danger-soft" title="Remove with the shovel" aria-label="Remove" onClick={() => void remove(seed)}>
                    <ShovelIcon size={20} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
