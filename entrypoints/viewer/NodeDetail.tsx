import { useEffect, useState } from "react";
import {
  deleteRoot,
  deleteSeed,
  updateSeed,
  type Folder,
  type Root,
  type Seed,
} from "@/lib/storage";
import { SPRITES } from "@/lib/theme";
import { ShovelIcon } from "@/lib/theme/ShovelIcon";
import { SpriteIcon } from "@/lib/theme/SpriteIcon";
import { openOnPage } from "./ForestList";
import { seedLabel } from "./GraphNodes";
import { ColorPicker } from "./Pickers";

const KIND_LABEL: Record<Seed["kind"], string> = {
  highlight: "Highlight",
  sprite: "Marker",
  link: "Link",
  note: "Your note",
  media: "Media",
};

/** Removes a seed and the roots that touch it, so no root is left pointing at nothing. */
async function removeSeedAndRoots(seed: Seed, roots: Root[]): Promise<boolean> {
  if (!window.confirm("Remove this seed from the forest?")) return false;
  await Promise.all(
    roots
      .filter((r) => r.fromSeedId === seed.id || r.toSeedId === seed.id)
      .map((r) => deleteRoot(r.id)),
  );
  await deleteSeed(seed.id);
  return true;
}

/** The panel beside the graph that shows the selected node: what it is, where it came from, and its roots. */
export function NodeDetail({
  seed,
  roots,
  seedsById,
  folders,
  onClose,
}: {
  seed: Seed;
  roots: Root[];
  seedsById: Map<string, Seed>;
  folders: Folder[];
  onClose: () => void;
}) {
  // A note's text is edited here and saved when the box loses focus, not on every key press.
  const [draft, setDraft] = useState(seed.text);
  const [displayDraft, setDisplayDraft] = useState(seed.displayText ?? "");
  useEffect(() => setDraft(seed.text), [seed.id, seed.text]);
  useEffect(
    () => setDisplayDraft(seed.displayText ?? ""),
    [seed.id, seed.displayText],
  );

  const myRoots = roots.filter(
    (r) => r.fromSeedId === seed.id || r.toSeedId === seed.id,
  );

  return (
    <aside className="w-72 shrink-0 space-y-4 overflow-y-auto rounded-xl border-2 border-edge bg-surface p-4">
      <div className="flex items-start gap-3">
        <SpriteIcon
          type={seed.spriteType}
          size={56}
          color={seed.color}
          grown={seed.growth === "tree"}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{SPRITES[seed.spriteType].label}</p>
          <p className="text-xs uppercase tracking-wide text-ink-muted">
            {KIND_LABEL[seed.kind]} ·{" "}
            {new Date(seed.createdAt).toLocaleDateString()}
          </p>
        </div>
        <button
          className="rounded-lg px-2 text-ink-muted hover:bg-primary-soft"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wide text-ink-muted">
          Display text
        </span>
        <input
          className="w-full rounded-lg border border-edge bg-surface-alt p-2 text-sm"
          value={displayDraft}
          placeholder={seedLabel({ ...seed, displayText: undefined })}
          onChange={(e) => setDisplayDraft(e.target.value)}
          onBlur={() => {
            const next = displayDraft.trim();
            if (next !== (seed.displayText ?? ""))
              void updateSeed(seed.id, { displayText: next });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      </label>

      {seed.kind === "note" ? (
        <textarea
          className="h-28 w-full rounded-lg border border-edge bg-surface-alt p-2 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() =>
            draft !== seed.text && void updateSeed(seed.id, { text: draft })
          }
        />
      ) : (
        <p className="break-words rounded-lg bg-surface-alt p-3 text-sm">
          {seed.kind === "highlight"
            ? `“${seed.text}”`
            : seed.text
              ? "Placed on the page" /*`Near: ${seed.text}`*/
              : "Placed on the page"}
        </p>
      )}

      {seed.url && (
        <div className="space-y-2">
          <p className="truncate text-sm font-semibold" title={seed.pageTitle}>
            {seed.pageTitle || seed.url}
          </p>
          <button
            className="w-full rounded-lg border border-edge px-2 py-1 text-sm hover:bg-primary-soft"
            onClick={() => void openOnPage(seed)}
          >
            Open on page
          </button>
        </div>
      )}
      {seed.linkTarget && (
        <a
          href={seed.linkTarget}
          target="_blank"
          rel="noreferrer"
          className="block truncate rounded-lg border border-edge px-2 py-1 text-center text-sm text-primary hover:bg-primary-soft"
        >
          Open link: {seed.linkTarget}
        </a>
      )}

      <div>
        <p className="mb-1 text-xs uppercase tracking-wide text-ink-muted">
          Color
        </p>
        <ColorPicker
          value={seed.color}
          onChange={(color) => void updateSeed(seed.id, { color })}
        />
      </div>

      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wide text-ink-muted">
          Folder
        </span>
        <select
          className="w-full rounded-lg border border-edge bg-surface-alt p-1.5 text-sm"
          value={seed.folderId ?? ""}
          onChange={(e) =>
            void updateSeed(seed.id, { folderId: e.target.value || null })
          }
        >
          <option value="">No folder</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>

      <div>
        <p className="mb-1 text-xs uppercase tracking-wide text-ink-muted">
          Roots
        </p>
        {myRoots.length === 0 && (
          <p className="text-sm text-ink-muted">
            None yet. Drag from the dot on this sprite to another node.
          </p>
        )}
        <ul className="space-y-1">
          {myRoots.map((root) => {
            const other = seedsById.get(
              root.fromSeedId === seed.id ? root.toSeedId : root.fromSeedId,
            );
            if (!other) return null;
            return (
              <li key={root.id} className="flex items-center gap-2 text-sm">
                <SpriteIcon
                  type={other.spriteType}
                  size={20}
                  color={other.color}
                />
                <span className="min-w-0 flex-1 truncate">
                  {seedLabel(other)}
                </span>
                <button
                  className="rounded px-1.5 text-ink-muted hover:bg-danger-soft"
                  title="Remove this root"
                  onClick={() => void deleteRoot(root.id)}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <button
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-edge px-2 py-1 text-sm hover:bg-danger-soft"
        onClick={() =>
          void removeSeedAndRoots(seed, roots).then(
            (removed) => removed && onClose(),
          )
        }
      >
        <ShovelIcon size={18} /> Remove seed
      </button>
    </aside>
  );
}
