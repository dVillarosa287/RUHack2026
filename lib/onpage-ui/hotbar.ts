// The toolbar's layout and its hotbar, shared by the toolbar (Toolbar.tsx) and the keyboard shortcuts (useKeybinds.ts),
// so the number keys always match what the user sees.
import type { SpriteType } from '@/lib/storage';

export type ToolbarSlot = SpriteType | 'shovel' | 'forest' | null;

/** Two rows of buttons. `null` is an empty cell. Column 5 starts the lily pad and apple column. */
export const TOOLBAR_LAYOUT: ToolbarSlot[][] = [
  ['sprout', 'mushroom', 'house', 'flower', 'lilypad', 'shovel'],
  ['cat', 'grass', 'owl', 'rock', 'fruitsprout', 'forest'],
];

/** The sprites on the toolbar in reading order (left to right, top row first). Keys 1 to 9 pick the first nine, 0 the tenth. */
export const HOTBAR: SpriteType[] = TOOLBAR_LAYOUT.flat().filter((slot): slot is SpriteType => slot !== null && slot !== 'shovel' && slot !== 'forest');

/** The key that picks hotbar slot `index` ('1' to '9', then '0'), or null past the tenth. */
export const hotbarKey = (index: number): string | null => (index < 9 ? String(index + 1) : index === 9 ? '0' : null);
