import { useState, type DragEvent } from 'react';
import { createFolder, deleteFolder, updateSeed, type Folder, type Seed } from '@/lib/storage';
import { cap, useWords } from '@/lib/theme';

/** Which seeds the list shows: every seed, the ones in no folder, or one folder's (its id). */
export type FolderChoice = 'all' | 'none' | string;

/** The data type used when a seed row is dragged onto a folder (see ForestList). */
export const SEED_DRAG_TYPE = 'application/x-forest-seed';

/** True if the seed is in no folder, or in a folder that has since been removed. */
export function isUnfiled(seed: Seed, folders: Folder[]): boolean {
  return !seed.folderId || !folders.some((f) => f.id === seed.folderId);
}

/** Seed rows can be dropped on a folder (or on "No folder") to move them there. */
function dropTarget(folderId: string | null, setOver: (id: string | null) => void) {
  const key = folderId ?? 'none';
  return {
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes(SEED_DRAG_TYPE)) return;
      e.preventDefault(); // tells the browser a drop is allowed here
      setOver(key);
    },
    onDragLeave: () => setOver(null),
    onDrop: (e: DragEvent) => {
      setOver(null);
      const seedId = e.dataTransfer.getData(SEED_DRAG_TYPE);
      if (seedId) void updateSeed(seedId, { folderId });
    },
  };
}

/** The folders inside a forest, on the left of the forest page. */
export function FolderSidebar({ forestId, folders, seeds, choice, onChoose }: { forestId: string; folders: Folder[]; seeds: Seed[]; choice: FolderChoice; onChoose: (c: FolderChoice) => void }) {
  const [newName, setNewName] = useState('');
  const [over, setOver] = useState<string | null>(null);
  const words = useWords(); // in the Minimal theme these folders are "sections" (the forest itself is the folder)

  async function addFolder() {
    const name = newName.trim();
    if (!name) return;
    const folder = await createFolder({ forestId, name });
    setNewName('');
    onChoose(folder.id);
  }

  // Removing a folder keeps its seeds: they move to "No folder".
  async function removeFolder(folder: Folder) {
    if (!window.confirm(`Remove the ${words.folder} "${folder.name}"? Its ${words.seeds} stay in the ${words.forest}.`)) return;
    await Promise.all(seeds.filter((s) => s.folderId === folder.id).map((s) => updateSeed(s.id, { folderId: null })));
    await deleteFolder(folder.id);
    if (choice === folder.id) onChoose('all');
  }

  const row = (key: string, active: boolean) =>
    `group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${active ? 'bg-primary-soft font-semibold' : 'hover:bg-primary-soft'} ${over === key ? 'ring-2 ring-accent' : ''}`;

  return (
    <nav className="w-52 shrink-0 space-y-1 self-start rounded-xl border-2 border-edge bg-surface p-3" aria-label={cap(words.folders)}>
      <p className="mb-1 px-2 text-xs uppercase tracking-wide text-ink-muted">{cap(words.folders)}</p>
      <button className={row('all', choice === 'all')} onClick={() => onChoose('all')}>
        <span className="flex-1">All {words.seeds}</span>
        <span className="text-ink-muted">{seeds.length}</span>
      </button>
      <button className={row('none', choice === 'none')} onClick={() => onChoose('none')} {...dropTarget(null, setOver)}>
        <span className="flex-1">No {words.folder}</span>
        <span className="text-ink-muted">{seeds.filter((s) => isUnfiled(s, folders)).length}</span>
      </button>
      {folders.map((folder) => (
        <div key={folder.id} className={row(folder.id, choice === folder.id)} {...dropTarget(folder.id, setOver)}>
          <button className="min-w-0 flex-1 truncate text-left" onClick={() => onChoose(folder.id)}>{folder.name}</button>
          <span className="text-ink-muted">{seeds.filter((s) => s.folderId === folder.id).length}</span>
          <button className="rounded px-1 text-ink-muted opacity-0 group-hover:opacity-100 hover:bg-danger-soft" title={`Remove ${words.folder}`} aria-label={`Remove ${words.folder} ${folder.name}`} onClick={() => void removeFolder(folder)}>×</button>
        </div>
      ))}
      <form
        className="mt-2 flex gap-1 border-t border-edge pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          void addFolder();
        }}
      >
        <input className="min-w-0 flex-1 rounded-lg border border-edge bg-surface-alt px-2 py-1 text-sm" placeholder={`New ${words.folder}`} value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button type="submit" className="rounded-lg border border-edge px-2 text-sm hover:bg-primary-soft" title={`Add ${words.folder}`} aria-label={`Add ${words.folder}`}>+</button>
      </form>
      {folders.length > 0 && <p className="px-2 pt-1 text-xs text-ink-muted">Drag {words.aSeed} onto a {words.folder} to move it.</p>}
    </nav>
  );
}
