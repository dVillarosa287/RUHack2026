import { browser } from 'wxt/browser';
import { deleteSeed, getForest, getSeedsForForest, setPendingJump, type Seed } from '@/lib/storage';
import { SPRITES, colorHex } from '@/lib/theme';
import { ShovelIcon } from '@/lib/theme/ShovelIcon';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';
import { useStored } from './useStored';

/** Opens the seed's page in another window. That page scrolls to the seed once it has loaded. */
async function openOnPage(seed: Seed) {
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
      <h1 className="mb-1 text-2xl font-semibold">{data.forest.icon} {data.forest.name}</h1>
      <p className="mb-6 text-sm text-bark-light">{data.seeds.length} {data.seeds.length === 1 ? 'seed' : 'seeds'} on {pages.length} {pages.length === 1 ? 'page' : 'pages'}</p>

      {pages.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-bark-light">Nothing planted here yet. Open any web page, click the Forest icon in Chrome's toolbar and pick a sprite.</p>}

      <div className="space-y-6">
        {pages.map((page) => (
          <section key={page.url} className="rounded-xl border-2 border-bark-light/30 bg-white p-4">
            <h2 className="font-semibold">{page.title}</h2>
            <a href={page.url} target="_blank" rel="noreferrer" className="block truncate text-sm text-moss underline">{page.url}</a>
            <ul className="mt-3 space-y-2">
              {page.seeds.map((seed) => (
                <li key={seed.id} className="flex items-start gap-3 rounded-lg bg-parchment p-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white shadow" style={{ background: colorHex(seed.color) }} title={SPRITES[seed.spriteType].label}>
                    <SpriteIcon type={seed.spriteType} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-wide text-bark-light">{seed.kind === 'highlight' ? 'Highlight' : 'Marker'} · {new Date(seed.createdAt).toLocaleString()}</p>
                    <p className="break-words">{seed.kind === 'highlight' ? `“${seed.text}”` : seed.text ? `Near: ${seed.text}` : 'Placed on the page'}</p>
                  </div>
                  <button className="shrink-0 rounded-lg border border-bark-light px-2 py-1 text-sm hover:bg-moss-light" onClick={() => void openOnPage(seed)}>Open on page</button>
                  <button className="shrink-0 rounded-lg border border-bark-light p-1.5 hover:bg-red-100" title="Remove with the shovel" aria-label="Remove" onClick={() => void remove(seed)}>
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
