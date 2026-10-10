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

export interface ThemeSprite {
  label: string;
  /** Stand-in shown until real art exists. */
  emoji: string;
  /**
   * File name of the real art inside public/sprites/, for example 'sprout.png'.
   * Drop the file in that folder, write its name here, and every place that shows
   * the sprite (toolbar, page markers, viewer) switches to it. Leave undefined to keep the emoji.
   */
  image?: string;
}

export const SPRITES: Record<SpriteType, ThemeSprite> = {
  sprout: { label: 'Sprout', emoji: '🌱' },
  lilypad: { label: 'Lily pad', emoji: '🪷' },
  mushroom: { label: 'Mushroom', emoji: '🍄' },
  flower: { label: 'Flower', emoji: '🌸' },
  fruitsprout: { label: 'Fruit sprout', emoji: '🍎' },
};

/** The order sprites appear in the toolbar. */
export const SPRITE_ORDER: SpriteType[] = ['sprout', 'lilypad', 'mushroom', 'flower', 'fruitsprout'];

/** Icons for new forests, handed out in turn. Real forest icons arrive in Stage 2. */
export const FOREST_ICONS = ['🌲', '🌳', '🌴', '🌿', '🍃', '🌾'];

/** Web address of a sprite's real art, or null while it is still the emoji stand-in. */
export function spriteImageUrl(type: SpriteType): string | null {
  const file = SPRITES[type].image;
  return file ? browser.runtime.getURL(`/sprites/${file}` as never) : null;
}
