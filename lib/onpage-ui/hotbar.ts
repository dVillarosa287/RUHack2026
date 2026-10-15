// The toolbar's layout and its hotbar, shared by the toolbar (Toolbar.tsx) and the keyboard shortcuts (useKeybinds.ts),
// so the number keys always match what the user sees. The sprites come from the chosen loadout.
import type { Loadout, LoadoutState, SpriteType } from '@/lib/storage';

export type ToolbarSlot = SpriteType | 'shovel' | 'forest' | null;

/** The most sprites a loadout can hold: two rows of five, keys 1 to 9 and 0. */
export const LOADOUT_SIZE = 10;

/** The loadout everyone starts with. It cannot be changed or removed; the user's own loadouts are saved in storage. */
export const DEFAULT_LOADOUT: Loadout = {
  id: 'default',
  name: 'Default',
  sprites: ['sprout', 'mushroom', 'house', 'flower', 'lilypad', 'cat', 'grass', 'owl', 'rock', 'fruitsprout'],
};

/** Every loadout to choose from: the default first, then the user's own. */
export const allLoadouts = (state: LoadoutState | null): Loadout[] => [DEFAULT_LOADOUT, ...(state?.custom ?? [])];

/** The loadout in use. Falls back to the default if the chosen one was deleted. */
export function currentLoadout(state: LoadoutState | null): Loadout {
  return state?.custom.find((l) => l.id === state.currentId) ?? DEFAULT_LOADOUT;
}

/** The hotbar (sprites in key order) of a loadout. */
export const hotbarOf = (loadout: Loadout): SpriteType[] => loadout.sprites.slice(0, LOADOUT_SIZE);

/** The default hotbar, for help text that does not know the user's loadout. */
export const HOTBAR: SpriteType[] = hotbarOf(DEFAULT_LOADOUT);

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
