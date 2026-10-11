import { browser } from 'wxt/browser';
import { deleteSeed, setPendingJump, updateSettings, type Seed } from '@/lib/storage';
import { SPRITES } from '@/lib/theme';
import { ShovelIcon } from '@/lib/theme/ShovelIcon';
import { SpriteIcon } from '@/lib/theme/SpriteIcon';
import { SEED_DRAG_TYPE } from './FolderSidebar';

/**
 * Opens the seed's page in another window. That page scrolls to the seed once it has loaded.
 * Pages only show the current forest's seeds, so this makes the seed's forest the current one.
 */
export async function openOnPage(seed: Seed) {
  await updateSettings({ currentForestId: seed.forestId });
  await setPendingJump(seed);
  await browser.windows.create({ url: seed.url });
}

export async function removeSeed(seed: Seed) {
  if (window.confirm('Remove this seed from the forest?')) await deleteSeed(seed.id);
}

/** Groups seeds by web page. Text notes have no page (url ''), so they form one group of their own. */
export function groupByPage(seeds: Seed[]): { url: string; title: string; seeds: Seed[] }[] {
  const groups = new Map<string, Seed[]>();
  for (const seed of seeds) groups.set(seed.url, [...(groups.get(seed.url) ?? []), seed]);
  return [...groups].map(([url, list]) => ({ url, title: url ? list[0]?.pageTitle || url : 'Your notes', seeds: list }));
}

function describe(seed: Seed): { kind: string; text: string } {
  if (seed.kind === 'note') return { kind: 'Note', text: seed.text };
  if (seed.kind === 'highlight') return { kind: 'Highlight', text: `“${seed.text}”` };
  return { kind: 'Marker', text: seed.text ? `Near: ${seed.text}` : 'Placed on the page' };
}

/** Every annotation in a forest, grouped by web page. Rows can be dragged onto a folder in the sidebar. */
export function ForestList({ seeds, emptyText }: { seeds: Seed[]; emptyText?: string }) {
  const pages = groupByPage(seeds);

  if (pages.length === 0) {
    return <p className="rounded-xl bg-surface p-6 text-center text-ink-muted">{emptyText ?? "Nothing planted here yet. Open any web page, click the Forest icon in Chrome's toolbar and pick a sprite."}</p>;
  }

  return (
    <div className="space-y-6">
      {pages.map((page) => (
        <section key={page.url} className="rounded-xl border-2 border-edge bg-surface p-4">
          <h2 className="font-semibold">{page.title}</h2>
          {page.url && <a href={page.url} target="_blank" rel="noreferrer" className="block truncate text-sm text-primary underline">{page.url}</a>}
          <ul className="mt-3 space-y-2">
            {page.seeds.map((seed) => (
              <li key={seed.id} draggable onDragStart={(e) => e.dataTransfer.setData(SEED_DRAG_TYPE, seed.id)} className="flex cursor-grab items-start gap-3 rounded-lg bg-surface-alt p-3">
                <span className="mt-0.5 flex shrink-0 items-center justify-center" title={SPRITES[seed.spriteType].label}>
                  <SpriteIcon type={seed.spriteType} size={40} color={seed.color} grown={seed.growth === 'tree'} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wide text-ink-muted">{describe(seed).kind} · {new Date(seed.createdAt).toLocaleString()}</p>
                  <p className="break-words">{describe(seed).text}</p>
                </div>
                {seed.url && <button className="shrink-0 rounded-lg border border-edge px-2 py-1 text-sm hover:bg-primary-soft" onClick={() => void openOnPage(seed)}>Open on page</button>}
                <button className="shrink-0 rounded-lg border border-edge p-1.5 hover:bg-danger-soft" title="Remove with the shovel" aria-label="Remove" onClick={() => void removeSeed(seed)}>
                  <ShovelIcon size={20} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
