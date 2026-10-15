// Lily pad groups. A group is never saved: it is the lily pads joined to each other by roots (directly or through
// other lily pads), worked out each time it is needed. Joining a pad to a group is just adding a root to a pad in it.
import type { Root, Seed } from './types';

export interface PadGroup {
  /** The id of the group's oldest pad, so a group keeps its id while pads are added. */
  id: string;
  /** Oldest first. Always 2 or more: a pad on its own is not a group. */
  pads: Seed[];
}

/** The lily pad groups among `seeds`, oldest group first. Roots that touch anything but two lily pads are ignored. */
export function padGroups(seeds: Seed[], roots: Root[]): PadGroup[] {
  const pads = seeds.filter((s) => s.spriteType === 'lilypad').sort((a, b) => a.createdAt - b.createdAt);
  const ids = new Set(pads.map((p) => p.id));
  // Union-find: each pad points towards its group's first pad.
  const parent = new Map(pads.map((p) => [p.id, p.id]));
  const find = (id: string): string => {
    const up = parent.get(id)!;
    if (up === id) return id;
    const top = find(up);
    parent.set(id, top);
    return top;
  };
  for (const root of roots) {
    if (!ids.has(root.fromSeedId) || !ids.has(root.toSeedId)) continue;
    const a = find(root.fromSeedId);
    const b = find(root.toSeedId);
    if (a === b) continue;
    // The older pad stays on top, so the group id is its oldest pad.
    const older = pads.findIndex((p) => p.id === a) < pads.findIndex((p) => p.id === b);
    parent.set(older ? b : a, older ? a : b);
  }
  const groups = new Map<string, Seed[]>();
  for (const pad of pads) groups.set(find(pad.id), [...(groups.get(find(pad.id)) ?? []), pad]);
  return [...groups.entries()].filter(([, list]) => list.length >= 2).map(([id, list]) => ({ id, pads: list }));
}
