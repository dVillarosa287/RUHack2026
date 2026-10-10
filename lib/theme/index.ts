// The one theme file. Components never hard-code colors or sprite paths; they read them from here.
import { browser } from 'wxt/browser';
import type { SpriteType } from '@/lib/storage';

export const APP_NAME = 'Forest';

export interface ThemeColor {
  id: string;
  name: string;
  hex: string;
}

/** The palette. Seeds store the `id`, so the hex codes can change without touching saved data. */
export const COLORS: ThemeColor[] = [
  { id: 'red', name: 'Red', hex: '#FF5555' },
  { id: 'orange', name: 'Orange', hex: '#FFAA00' },
  { id: 'yellow', name: 'Yellow', hex: '#FFEE88' },
  { id: 'green', name: 'Green', hex: '#00CC99' },
  { id: 'blue', name: 'Blue', hex: '#0099FF' },
  { id: 'cyan', name: 'Cyan', hex: '#00FFEE' },
  { id: 'purple', name: 'Purple', hex: '#AA00FF' },
  { id: 'magenta', name: 'Magenta', hex: '#FF00CC' },
];

export const DEFAULT_COLOR_ID = 'green';

export function colorHex(id: string): string {
  return COLORS.find((c) => c.id === id)?.hex ?? '#00CC99';
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
