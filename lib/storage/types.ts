// The data model from CLAUDE.md. Changing these shapes affects every role, so confirm with the team first.

// sprout and mushroom are placeholders for now; cat, grass, owl and rock were added 2026-10-11 (user's request), and
// house later that day. Each theme draws and colors them its own way (lib/theme).
export type SpriteType = 'sprout' | 'lilypad' | 'mushroom' | 'flower' | 'fruitsprout' | 'cat' | 'grass' | 'owl' | 'rock' | 'house';
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
  /** An art id from lib/theme (such as 'tree'). Older forests may have an emoji, which is shown as text. */
  icon: string;
  createdAt: number;
  /** Where the forest sits on the forests grid in the viewer. Not set until the user drags it. */
  x?: number;
  y?: number;
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
  /** Optional label shown for this seed in the forest graph. */
  displayText?: string;
  /** The user's own words about this seed, typed after planting it. Not for the lily pad or the apple (NO_NOTE_SPRITES). */
  note?: string;
  linkTarget: string | null;
  anchor: Anchor | null;
  nextReviewAt: number | null;
  createdAt: number;
  /** Where the seed's node sits in the forest's graph view. Not set until it has been placed or dragged. */
  graphX?: number;
  graphY?: number;
  /** How big its sprite is drawn on the page: 1 is normal, 0.5 to 2. Chosen with - and + before planting. Old seeds have none (normal). */
  scale?: number;
}

/** What a caller passes to saveSeed. The storage module fills in the rest. */
export type SeedInput = Pick<Seed, 'forestId' | 'kind' | 'spriteType' | 'color' | 'url' | 'pageTitle' | 'text'> &
  Partial<Pick<Seed, 'folderId' | 'growth' | 'linkTarget' | 'anchor' | 'nextReviewAt' | 'scale' | 'displayText'>>;

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
  /** The AI provider used to write this quiz. Missing on older quizzes, which were Gemini quizzes. */
  provider?: 'gemini' | 'cerebras';
  createdAt: number;
}

/**
 * Where the on-page toolbar is and whether it is open. This is interface state, not part of the shared
 * data model, so it has its own record. It is shared by every tab: open it in one, it opens in all.
 */
export interface ToolbarState {
  open: boolean;
  /** Distance in px from the top and right edges of the window. */
  top: number;
  right: number;
  /** Size of the toolbar, 1 is normal. The user resizes it by dragging its bottom-left corner. */
  scale: number;
}

export interface Settings {
  currentForestId: string | null;
  /** The three most recently used sprites, newest first. */
  recentSprites: SpriteType[];
  theme: string;
  geminiKey: string;
  cerebrasKey: string;
  autoConnections: boolean;
  /** Minutes after planting an apple (fruit sprout) before it grows into an apple tree and asks its question. */
  reviewMinutes: number;
}
