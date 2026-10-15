// The toolbar's layout and its hotbar, shared by the toolbar (Toolbar.tsx) and the keyboard shortcuts (useKeybinds.ts),
// so the number keys always match what the user sees. The sprites come from the chosen stash.
import type { Stash, StashState, SpriteType } from '@/lib/storage';

export type ToolbarSlot = SpriteType | 'shovel' | 'forest' | null;

/** The most sprites a stash can hold: two rows of five, keys 1 to 9 and 0. */
export const STASH_SIZE = 10;

/** The stash everyone starts with. It cannot be changed or removed; the user's own stashes are saved in storage. */
export const DEFAULT_STASH: Stash = {
  id: 'default',
  name: 'Default',
  sprites: ['sprout', 'mushroom', 'house', 'flower', 'lilypad', 'cat', 'grass', 'owl', 'rock', 'fruitsprout'],
};

/** Every stash to choose from: the default first, then the user's own. */
export const allStashes = (state: StashState | null): Stash[] => [DEFAULT_STASH, ...(state?.custom ?? [])];

/** The stash in use. Falls back to the default if the chosen one was deleted. */
export function currentStash(state: StashState | null): Stash {
  return state?.custom.find((l) => l.id === state.currentId) ?? DEFAULT_STASH;
}

/** The hotbar (sprites in key order) of a stash. */
export const hotbarOf = (stash: Stash): SpriteType[] => stash.sprites.slice(0, STASH_SIZE);

/** The default hotbar, for help text that does not know the user's stash. */
export const HOTBAR: SpriteType[] = hotbarOf(DEFAULT_STASH);

/** Two rows of buttons: five sprites each, then the shovel (top) and the forest button (bottom). `null` is an empty cell. */
export function toolbarLayout(hotbar: SpriteType[]): ToolbarSlot[][] {
  const cell = (i: number): ToolbarSlot => hotbar[i] ?? null;
  return [
    [cell(0), cell(1), cell(2), cell(3), cell(4), 'shovel'],
    [cell(5), cell(6), cell(7), cell(8), cell(9), 'forest'],
  ];
}

/** The key that picks hotbar slot `index` ('1' to '9', then '0'), or null past the tenth. */
export const hotbarKey = (index: number): string | null => (index < 0 ? null : index < 9 ? String(index + 1) : index === 9 ? '0' : null);
