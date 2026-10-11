// The words the user reads, per theme. The nature themes (Night Forest, Vibrant Jungle, Light Forest) talk about
// forests, seeds and roots. The Minimal theme is the plain, non-nature version of the app, so it uses everyday words.
// Only text on screen changes: code names, data fields and storage keys stay Forest, Seed, Root and so on.
// Sprite names ('Apple', 'Circle', ...) are not here: they come from spriteLabel() in ./index.ts.
import { useThemeId } from './themeId';
import { MINIMAL_THEME } from './themes';

export interface Words {
  /** The app's name in the viewer's header and browser tab. The extension's own name in Chrome stays "Forest". */
  appName: string;
  /** A project (Forest in the code). */
  forest: string;
  forests: string;
  /** A folder inside a forest. Minimal calls it a section, so it is not mixed up with the outer folder (the forest). */
  folder: string;
  folders: string;
  /** One saved annotation (Seed in the code). Minimal says "item": "note" already means a text note or the user's own note. */
  seed: string;
  seeds: string;
  /** The seed word with its article: "a seed", "an item". */
  aSeed: string;
  /** A connection the user draws in the graph (Root in the code). */
  root: string;
  roots: string;
  /** What dragging between two nodes does: "grow a root". */
  growRoot: string;
  /** The button that saves a text note in the graph. */
  plantNote: string;
  /** Status after planting the apple (`sprite` is its name in the theme). */
  quizLater(sprite: string): string;
  /** The active recall pop-up's subtitle (`sprite` is the apple's name in lower case). */
  recallReady(sprite: string, page: string): string;
  /** Settings: what the active recall time does. */
  recallHelp: string;
  /** The lily pad quiz's name on its button and page (`pad` is the lily pad's name in the theme). */
  quizName(pad: string): string;
  /** Said after a quiz with every answer right. */
  praise: string;
  /** The button that goes to the next quiz question. */
  nextQuestion: string;
  /** Alt text of the frog picture that marks the current quiz question. */
  frogAlt: string;
  /** Settings: what the Gemini key is used for. */
  aiUses: string;
  /** A forest with nothing in it, in the list view. */
  emptyList: string;
  /** A forest with nothing in it, in the graph view. */
  emptyGraph: string;
  /** Hover text of the remove button in the list view. */
  removeTitle: string;
  /** The button that reads a web page from its link and connects its key ideas to the rest (GrowFromLink). */
  fromLink: string;
}

/** The nature words. These are exactly the words the app used before themes had their own words. */
const NATURE_WORDS: Words = {
  appName: 'Forest',
  forest: 'forest',
  forests: 'forests',
  folder: 'folder',
  folders: 'folders',
  seed: 'seed',
  seeds: 'seeds',
  aSeed: 'a seed',
  root: 'root',
  roots: 'roots',
  growRoot: 'grow a root',
  plantNote: 'Plant note',
  quizLater: (sprite) => `${sprite} planted: it will quiz you later`,
  recallReady: (sprite, page) => `Your ${sprite} from ${page} has grown`,
  recallHelp:
    'How long after you plant an apple it grows into an apple tree and asks you one question. A new time is used for apples planted after you change it.',
  quizName: (pad) => `${pad} quiz`,
  praise: 'The frog is proud of you!',
  nextQuestion: 'Hop to the next pad',
  frogAlt: 'The frog',
  aiUses: "Quizzes, suggested roots and the frog's summaries use Google's Gemini.",
  emptyList: "Nothing planted here yet. Open any web page, click the Forest icon in Chrome's toolbar and pick a sprite.",
  emptyGraph: 'Nothing planted yet. Plant seeds on a web page, or add a text note.',
  removeTitle: 'Remove with the shovel',
  fromLink: 'Grow from link',
};

/** The Minimal theme's plain words: folders, items and links instead of forests, seeds and roots. */
const MINIMAL_WORDS: Words = {
  appName: 'Notes',
  forest: 'folder',
  forests: 'folders',
  folder: 'section',
  folders: 'sections',
  seed: 'item',
  seeds: 'items',
  aSeed: 'an item',
  root: 'link',
  roots: 'links',
  growRoot: 'draw a link',
  plantNote: 'Add note',
  quizLater: (sprite) => `${sprite} placed: it will quiz you later`,
  recallReady: (sprite, page) => `Your ${sprite} from ${page} is ready to review`,
  recallHelp:
    'How long after you place a circle it asks you one question about it. A new time is used for circles placed after you change it.',
  quizName: () => 'Quiz',
  praise: 'Well done!',
  nextQuestion: 'Next question',
  frogAlt: 'Your place in the quiz',
  aiUses: "Quizzes, suggested links and spoken summaries use Google's Gemini.",
  emptyList: "Nothing here yet. Open any web page, click this extension's icon in Chrome's toolbar and pick a sprite.",
  emptyGraph: 'Nothing here yet. Add items on a web page, or write a text note.',
  removeTitle: 'Remove',
  fromLink: 'Add from link',
};

/** The words for a theme. Every theme except Minimal uses the nature words. */
export function getWords(themeId: string): Words {
  return themeId === MINIMAL_THEME.id ? MINIMAL_WORDS : NATURE_WORDS;
}

/** React hook: the words for the chosen theme. The component draws again when the user picks another theme. */
export function useWords(): Words {
  return getWords(useThemeId());
}

/** The word with a capital first letter: cap('forest') is 'Forest'. */
export const cap = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** A number with the right word: countOf(1, 'seed', 'seeds') is '1 seed', countOf(3, ...) is '3 seeds'. */
export const countOf = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
