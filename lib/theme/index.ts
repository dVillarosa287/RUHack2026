// The theme entry point. Components never hard-code colors or sprite paths; they read them from here.
// Color codes themselves live in ./themes.ts only. See docs/THEME.md.
import { browser } from 'wxt/browser';
import type { SpriteType } from '@/lib/storage';
import { DEFAULT_THEME_ID, FOREST_THEME, MINIMAL_THEME, getTheme, type ThemeColor } from './themes';

/** The app's name in the nature themes. The viewer shows the theme's own name instead: useWords().appName (./words.ts). */
export const APP_NAME = 'Forest';

export { applyTheme, watchTheme } from './apply';
export { useThemeId, watchThemeId } from './themeId';
// The words the user reads per theme (forest or folder, seed or item, ...). See ./words.ts.
export { cap, countOf, getWords, useWords, type Words } from './words';
export { DEFAULT_THEME_ID, FOREST_THEME, JUNGLE_THEME, MINIMAL_THEME, THEMES, getTheme, themeToCss, type SpriteColors, type ThemeColor, type ThemeDefinition } from './themes';

/** The palette's eight colors. Seeds no longer pick one (each sprite has its own, see SPRITES); old seeds still have one. */
export const COLORS: ThemeColor[] = FOREST_THEME.palette;

/** The exact color code of a palette color in a theme, for places that need a real value (such as drawing highlights on the page). */
export function colorHex(id: string, themeId: string = DEFAULT_THEME_ID): string {
  const palette = getTheme(themeId).palette;
  return (palette.find((c) => c.id === id) ?? palette[0])?.hex ?? '';
}

/**
 * All the art. The build copies every PNG in images/ (except the extension icons) into the extension as
 * `sprites/<file>`, and every PNG in minimal-images/ as `sprites/minimal/<file>` (see wxt.config.ts). So adding art
 * is: put the file in one of those folders and name it in the lists below (minimal art with the `minimal/` prefix).
 */
const ART_FILES = new Set(__ART_FILES__);

/** Web address of an image, such as 'owl.png' or 'minimal/star.png', or null if there is no such file (the caller then shows a stand-in). */
export function artUrl(file: string): string | null {
  return ART_FILES.has(file) ? browser.runtime.getURL(`/sprites/${file}` as never) : null;
}

export interface ThemeSprite {
  label: string;
  /** Shown only if the image is missing. */
  emoji: string;
  /** File in images/. Most art is colored already. "uncolored-*" art (black outline, white fill) is tinted with the sprite's color. */
  image: string;
  /** What it looks like grown (growth `tree`). Only the sprout and the fruit sprout (apple) grow. */
  grownImage?: string;
  /** Shown under the toolbar button on hover, for sprites that do something special. */
  tip?: string;
}

// The art the Night Forest and Vibrant Jungle themes use. Colors are per theme, in themes.ts (`sprites`).
export const SPRITES: Record<SpriteType, ThemeSprite> = {
  // Placeholders until their purpose is decided. The grown sprout's tree is still the old white art, tinted.
  sprout: { label: 'Sprout', emoji: '🌱', image: 'sprout.png', grownImage: 'tree.png' },
  mushroom: { label: 'Mushroom', emoji: '🍄', image: 'mushroom.png' },
  house: { label: 'House', emoji: '🏠', image: 'house.png' },
  flower: { label: 'Flower', emoji: '🌼', image: 'flower.png' },
  cat: { label: 'Cat', emoji: '🐈', image: 'cat.png' },
  grass: { label: 'Grass', emoji: '🌿', image: 'grass.png' },
  owl: { label: 'Owl', emoji: '🦉', image: 'owl.png' },
  rock: { label: 'Rock', emoji: '🪨', image: 'rock.png' },
  lilypad: { label: 'Lily pad', emoji: '🪷', image: 'lilypad.png', tip: 'Quiz generation' },
  // The apple grows into an apple tree after the active recall time, then asks one question.
  fruitsprout: { label: 'Apple', emoji: '🍎', image: 'apple.png', grownImage: 'appletree.png', tip: 'Active Recall' },
};

/**
 * The Minimal theme draws every sprite as a plain shape instead (art in minimal-images/, colored already, so it
 * is drawn as it is). Labels follow the shape.
 */
const MINIMAL_ART: Record<SpriteType, { label: string; image: string; grownImage?: string }> = {
  sprout: { label: 'Star', image: 'minimal/star.png', grownImage: 'minimal/cloud.png' },
  mushroom: { label: 'Red note', image: 'minimal/postitred.png' },
  house: { label: 'Check', image: 'minimal/check.png' },
  flower: { label: 'Yellow note', image: 'minimal/postityellow.png' },
  cat: { label: 'Blue note', image: 'minimal/postitblue.png' },
  grass: { label: 'Exclamation', image: 'minimal/exclamation.png' },
  owl: { label: 'Diamond', image: 'minimal/diamond.png' },
  rock: { label: 'Hexagon', image: 'minimal/hexagon.png' },
  lilypad: { label: 'Triangle', image: 'minimal/triangle.png' },
  fruitsprout: { label: 'Circle', image: 'minimal/circle.png' },
};

/** The shovel (delete tool) art per theme. */
const SHOVEL_ART = { normal: 'shovel.png', minimal: 'minimal/symbolx.png' };

const isMinimal = (themeId: string) => themeId === MINIMAL_THEME.id;

/** Whether an art file is white and needs tinting: only "uncolored-*" art. All other art, the Minimal shapes included, is colored already. */
export const artNeedsTint = (file: string) => file.startsWith('uncolored-');

/** Every sprite, in the order lists in the viewer show them. The toolbar has its own layout (Toolbar.tsx). */
export const SPRITE_ORDER: SpriteType[] = ['sprout', 'mushroom', 'house', 'flower', 'cat', 'grass', 'owl', 'rock', 'lilypad', 'fruitsprout'];

/** Sprites that only go on text (dragged over a sentence); a click with them places nothing. */
export const TEXT_ONLY_SPRITES: SpriteType[] = ['lilypad', 'fruitsprout'];

/** Sprites that never get the user's own note: the lily pad and the apple are quiz material, their text is the point. */
export const NO_NOTE_SPRITES: SpriteType[] = ['lilypad', 'fruitsprout'];

/** Whether a seed of this sprite can carry the user's own note. */
export const spriteTakesNote = (type: SpriteType) => !NO_NOTE_SPRITES.includes(type);

/** The art file a sprite uses in a theme (grown or not). */
function spriteArtFile(type: SpriteType, grown: boolean, themeId: string): string {
  const art = isMinimal(themeId) ? MINIMAL_ART[type] : SPRITES[type];
  return (grown && art.grownImage) || art.image;
}

/** The sprite's name in a theme: the Minimal theme names the shape ('Star'), the others the plant or animal. */
export function spriteLabel(type: SpriteType, themeId: string = DEFAULT_THEME_ID): string {
  return isMinimal(themeId) ? MINIMAL_ART[type].label : SPRITES[type].label;
}

/** Web address of a sprite's art in a theme, or null if the file is missing. */
export function spriteImageUrl(type: SpriteType, grown = false, themeId: string = DEFAULT_THEME_ID): string | null {
  return artUrl(spriteArtFile(type, grown, themeId));
}

/** Whether the art is white and needs tinting with the sprite's color. */
export function spriteNeedsTint(type: SpriteType, grown = false, themeId: string = DEFAULT_THEME_ID): boolean {
  return artNeedsTint(spriteArtFile(type, grown, themeId));
}

/**
 * A name for the sprite's color, such as 'owl' or 'fruitsprout-grown'. It is saved into Seed.color, but nothing
 * reads it any more: the color always comes from the sprite and the current theme.
 */
export function spriteColorKey(type: SpriteType, grown = false): string {
  return grown ? `${type}-grown` : type;
}

/** The sprite's color as a CSS value, var(--sprite-<type>), so it follows the chosen theme by itself. */
export const spriteColorVar = (type: SpriteType, grown = false) => `var(--sprite-${type}${grown ? '-grown' : ''})`;

/** The sprite's color in a theme as an exact code, for page highlights (which cannot use CSS variables). */
export function spriteColorHex(type: SpriteType, grown = false, themeId: string = DEFAULT_THEME_ID): string {
  const c = getTheme(themeId).sprites[type];
  return (grown && c.grownColor) || c.color;
}

/** The shovel's art in a theme, and whether it needs tinting. */
export function shovelArt(themeId: string = DEFAULT_THEME_ID): { url: string | null; tint: boolean } {
  const file = isMinimal(themeId) ? SHOVEL_ART.minimal : SHOVEL_ART.normal;
  return { url: artUrl(file), tint: artNeedsTint(file) };
}

/** Forest icons are art ids, handed out to new forests in turn. The user will choose their own in Stage 2. */
export const FOREST_ICON_ART: Record<string, string> = {
  tree: 'tree.png',
  appletree: 'appletree.png',
  house: 'house.png',
  flower: 'flower.png',
  lilypad: 'lilypad.png',
  apple: 'apple.png',
  cat: 'cat.png',
  owl: 'owl.png',
  rock: 'rock.png',
  grass: 'grass.png',
  sprout: 'sprout.png',
  mushroom: 'mushroom.png',
};

export const FOREST_ICONS = Object.keys(FOREST_ICON_ART);

/** Forests saved before the art arrived have an emoji as their icon. These show as the matching art. */
const LEGACY_FOREST_ICONS: Record<string, string> = { '🌲': 'tree', '🌳': 'tree', '🌴': 'tree', '🌿': 'sprout', '🍃': 'sprout', '🌾': 'sprout' };

/** The sprite each forest icon matches. The Minimal theme draws a forest icon as that sprite's shape. */
const FOREST_ICON_SPRITE: Record<string, { type: SpriteType; grown: boolean }> = {
  tree: { type: 'sprout', grown: true },
  appletree: { type: 'fruitsprout', grown: true },
  apple: { type: 'fruitsprout', grown: false },
  ...Object.fromEntries(SPRITE_ORDER.map((type) => [type, { type, grown: false }])),
};

/** In the Minimal theme: the sprite (shape) to draw for a forest icon, or null to draw the icon's own art or text. */
export function forestIconSprite(icon: string, themeId: string = DEFAULT_THEME_ID): { type: SpriteType; grown: boolean } | null {
  return isMinimal(themeId) ? (FOREST_ICON_SPRITE[LEGACY_FOREST_ICONS[icon] ?? icon] ?? null) : null;
}

/** Web address of a forest's icon art in a theme, or null if the icon is something else (then it is shown as text). */
export function forestIconUrl(icon: string, themeId: string = DEFAULT_THEME_ID): string | null {
  const sprite = forestIconSprite(icon, themeId);
  if (sprite) return spriteImageUrl(sprite.type, sprite.grown, themeId);
  const file = FOREST_ICON_ART[LEGACY_FOREST_ICONS[icon] ?? icon];
  return file ? artUrl(file) : null;
}
