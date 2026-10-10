// The data model from CLAUDE.md. Changing these shapes affects every role, so confirm with the team first.

export type SpriteType = 'sprout' | 'lilypad' | 'mushroom' | 'flower' | 'fruitsprout';
export type Growth = 'sprout' | 'tree';
export type SeedKind = 'highlight' | 'sprite' | 'link' | 'note' | 'media';

/** Where a seed sits on its page. Never rely on pixel coordinates alone. */
export interface Anchor {
  /** Highlights: the exact text plus a few characters before and after it. */
  quote?: { exact: string; prefix: string; suffix: string };
  /** Placed markers: the nearest element and where inside it (0 to 1 of its width and height). */
  element?: { selector: string; xRatio: number; yRatio: number };
  /** Last resort: scroll position as a fraction (0 to 1) of the page height. */
  scrollPercent: number;
}

export interface Forest {
  id: string;
  name: string;
  /** An emoji for now. Real forest icons arrive in Stage 2. */
  icon: string;
  createdAt: number;
}

export interface Folder {
  id: string;
  forestId: string;
  name: string;
}

export interface Seed {
  id: string;
  forestId: string;
  folderId: string | null;
  kind: SeedKind;
  spriteType: SpriteType;
  /** A color id from lib/theme, for example 'green'. Not a hex code. */
  color: string;
  growth: Growth;
  /** Cleaned page address (see cleanUrl). */
  url: string;
  pageTitle: string;
  text: string;
  linkTarget: string | null;
  anchor: Anchor | null;
  nextReviewAt: number | null;
  createdAt: number;
}

/** What a caller passes to saveSeed. The storage module fills in the rest. */
export type SeedInput = Pick<Seed, 'forestId' | 'kind' | 'spriteType' | 'color' | 'url' | 'pageTitle' | 'text'> &
  Partial<Pick<Seed, 'folderId' | 'growth' | 'linkTarget' | 'anchor' | 'nextReviewAt'>>;

export interface Root {
  id: string;
  forestId: string;
  fromSeedId: string;
  toSeedId: string;
  source: 'manual' | 'ai';
  reason: string;
}

export interface Question {
  seedId: string;
  type: 'multiple-choice' | 'fill-blank';
  prompt: string;
  choices: string[];
  answer: string;
}

export interface Fruit {
  id: string;
  forestId: string;
  color: string;
  questions: Question[];
  createdAt: number;
}

export interface Settings {
  currentForestId: string | null;
  /** The three most recently used sprites, newest first. */
  recentSprites: SpriteType[];
  theme: string;
  geminiKey: string;
  autoConnections: boolean;
}
