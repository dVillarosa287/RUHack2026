// The theme entry point. Components never hard-code colors or sprite paths; they read them from here.
// Color codes themselves live in ./themes.ts only. See docs/THEME.md.
import { browser } from 'wxt/browser';
import type { SpriteType } from '@/lib/storage';
import { FOREST_THEME, type ThemeColor } from './themes';

export const APP_NAME = 'Forest';

export { applyTheme, watchTheme } from './apply';
export { DEFAULT_THEME_ID, FOREST_THEME, THEMES, getTheme, themeToCss, type ThemeColor, type ThemeDefinition } from './themes';

/** The palette seeds are colored from. Today there is one theme, so this is its palette. */
export const COLORS: ThemeColor[] = FOREST_THEME.palette;

export const DEFAULT_COLOR_ID = 'green';

/** The exact color code of a palette color, for places that need a real value (such as drawing highlights on the page). */
export function colorHex(id: string): string {
  return (COLORS.find((c) => c.id === id) ?? COLORS[0])?.hex ?? '';
}

/**
 * All the art. The build copies every "uncolored-*.png" and "frog*.png" from images/ into the extension (see
 * wxt.config.ts), so adding art is: put the file in images/ and name it in the lists below.
 */
const ART_FILES = new Set(__ART_FILES__);

/** Web address of an image from images/, or null if there is no such file (the caller then shows a stand-in). */
export function artUrl(file: string): string | null {
  return ART_FILES.has(file) ? browser.runtime.getURL(`/sprites/${file}` as never) : null;
}

export interface ThemeSprite {
  label: string;
  /** Shown only if the image is missing. */
  emoji: string;
  /** File in images/. Black outline with a white fill: the fill is tinted with the seed's palette color. */
  image: string;
  /** What it looks like grown (growth `tree`). Only the sprout and the fruit sprout grow. */
  grownImage?: string;
}

export const SPRITES: Record<SpriteType, ThemeSprite> = {
  sprout: { label: 'Sprout', emoji: '🌱', image: 'uncolored-sprout.png', grownImage: 'uncolored-tree.png' },
  lilypad: { label: 'Lily pad', emoji: '🪷', image: 'uncolored-lilypad.png' },
  mushroom: { label: 'Mushroom', emoji: '🍄', image: 'uncolored-mushroom.png' },
  flower: { label: 'Flower', emoji: '🌸', image: 'uncolored-flower.png' },
  // The apple tree art has not been drawn yet. Until then the apple stands in for both stages.
  fruitsprout: { label: 'Fruit sprout', emoji: '🍎', image: 'uncolored-apple.png' },
};

/** The order sprites appear in the toolbar. */
export const SPRITE_ORDER: SpriteType[] = ['sprout', 'fruitsprout', 'mushroom', 'flower', 'lilypad'];

/** Web address of a sprite's art, or null if the file is missing. */
export function spriteImageUrl(type: SpriteType, grown = false): string | null {
  const sprite = SPRITES[type];
  return artUrl((grown && sprite.grownImage) || sprite.image);
}

/** Forest icons are art ids, handed out to new forests in turn. The user will choose their own in Stage 2. */
export const FOREST_ICON_ART: Record<string, string> = {
  tree: 'uncolored-tree.png',
  sprout: 'uncolored-sprout.png',
  mushroom: 'uncolored-mushroom.png',
  flower: 'uncolored-flower.png',
  lilypad: 'uncolored-lilypad.png',
  apple: 'uncolored-apple.png',
};

export const FOREST_ICONS = Object.keys(FOREST_ICON_ART);

/** Forests saved before the art arrived have an emoji as their icon. These show as the matching art. */
const LEGACY_FOREST_ICONS: Record<string, string> = { '🌲': 'tree', '🌳': 'tree', '🌴': 'tree', '🌿': 'sprout', '🍃': 'sprout', '🌾': 'sprout' };

/** Web address of a forest's icon art, or null if the icon is something else (then it is shown as text). */
export function forestIconUrl(icon: string): string | null {
  const file = FOREST_ICON_ART[LEGACY_FOREST_ICONS[icon] ?? icon];
  return file ? artUrl(file) : null;
}
