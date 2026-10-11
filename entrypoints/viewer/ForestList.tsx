import { browser } from "wxt/browser";
import {
  deleteSeed,
  setPendingJump,
  updateSettings,
  type Seed,
} from "@/lib/storage";
import { getWords, spriteLabel, useThemeId, type Words } from "@/lib/theme";
import { openableUrl } from "@/lib/engine/pageUrl";
import { ShovelIcon } from "@/lib/theme/ShovelIcon";
import { SpriteIcon } from "@/lib/theme/SpriteIcon";
import { SEED_DRAG_TYPE } from "./FolderSidebar";
import { Screenshot } from "./Screenshot";

/**
 * Opens the seed's page in another window. That page scrolls to the seed once it has loaded.
 * Pages only show the current forest's seeds, so this makes the seed's forest the current one.
 */
export async function openOnPage(seed: Seed) {
  await updateSettings({ currentForestId: seed.forestId });
  await setPendingJump(seed);
  await browser.windows.create({ url: openableUrl(seed.url) }); // PDFs open in our PDF page
}

/** Asks first, in the theme's words (`words`), then removes the seed. */
export async function removeSeed(seed: Seed, words: Words) {
  if (window.confirm(`Remove this ${words.seed} from the ${words.forest}?`))
    await deleteSeed(seed.id);
}

/** Groups seeds by web page. Text notes have no page (url ''), so they form one group of their own. */
export function groupByPage(
  seeds: Seed[],
): { url: string; title: string; seeds: Seed[] }[] {
  const groups = new Map<string, Seed[]>();
  for (const seed of seeds)
    groups.set(seed.url, [...(groups.get(seed.url) ?? []), seed]);
  return [...groups].map(([url, list]) => ({
    url,
    title: url ? list[0]?.pageTitle || url : "Your notes",
    seeds: list,
  }));
}

function describe(seed: Seed): { kind: string; text: string } {
  if (seed.kind === 'note') return { kind: 'Note', text: seed.text };
  if (seed.kind === 'highlight') return { kind: 'Highlight', text: `“${seed.text}”` };
  if (seed.kind === 'media') return { kind: 'Screenshot', text: '' };
  return { kind: 'Marker', text: seed.text ? `Near: ${seed.text}` : 'Placed on the page' };
}

/** Every annotation in a forest, grouped by web page. Rows can be dragged onto a folder in the sidebar. */
export function ForestList({
  seeds,
  emptyText,
}: {
  seeds: Seed[];
  emptyText?: string;
}) {
  const pages = groupByPage(seeds);
  const themeId = useThemeId(); // sprite names follow the theme
  const words = getWords(themeId); // and so do words like "seed" ("item" in Minimal)

  if (pages.length === 0) {
    return (
      <p className="rounded-xl bg-surface p-6 text-center text-ink-muted">
        {emptyText ??
          words.emptyList}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {pages.map((page) => (
        <section
          key={page.url}
          className="rounded-xl border-2 border-edge bg-surface p-4"
        >
          <h2 className="font-semibold">{page.title}</h2>
          {page.url && (
            <a
              href={page.url}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-sm text-primary underline"
            >
              {page.url}
            </a>
          )}
          <ul className="mt-3 space-y-2">
            {page.seeds.map((seed) => (
              <li
                key={seed.id}
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData(SEED_DRAG_TYPE, seed.id)
                }
                className="flex cursor-grab items-start gap-3 rounded-lg bg-surface-alt p-3"
              >
                <span
                  className="mt-0.5 flex shrink-0 items-center justify-center"
                  title={spriteLabel(seed.spriteType, themeId)}
                >
                  <SpriteIcon
                    type={seed.spriteType}
                    size={40}
                    grown={seed.growth === "tree"}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wide text-ink-muted">{describe(seed).kind} · {new Date(seed.createdAt).toLocaleString()}</p>
                  {describe(seed).text && <p className="break-words">{describe(seed).text}</p>}
                  {seed.kind === "media" && <Screenshot seedId={seed.id} className="mt-1 max-h-40 max-w-full" />}
                  {seed.note && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-muted">Note: {seed.note}</p>}
                </div>
                {seed.url && (
                  <button
                    className="shrink-0 rounded-lg border border-edge px-2 py-1 text-sm hover:bg-primary-soft"
                    onClick={() => void openOnPage(seed)}
                  >
                    Open on page
                  </button>
                )}
                <button
                  className="shrink-0 rounded-lg border border-edge p-1.5 hover:bg-danger-soft"
                  title={words.removeTitle}
                  aria-label="Remove"
                  onClick={() => void removeSeed(seed, words)}
                >
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
