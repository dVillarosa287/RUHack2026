// The one storage module. Nothing else in the project calls chrome.storage directly.
//
// Every record lives under its own key ("seed:abc123", "forest:xyz", ...). Two tabs saving at the
// same moment therefore never overwrite each other. Everything is async because chrome.storage is.
import { browser } from 'wxt/browser';
import { DEFAULT_THEME_ID } from '@/lib/theme/themes';
import { cleanUrl } from './url';
import type { Folder, Forest, Fruit, Root, Seed, SeedInput, Settings, ToolbarState } from './types';

export * from './types';
export { cleanUrl } from './url';

const PREFIX = { forest: 'forest:', folder: 'folder:', seed: 'seed:', root: 'root:', fruit: 'fruit:', shot: 'shot:' } as const;
const SETTINGS_KEY = 'settings';
const PENDING_JUMP_KEY = 'pendingJump';
const TOOLBAR_KEY = 'toolbar';
const DEFAULT_FOREST_ID = 'forest-default';
const PENDING_JUMP_MAX_AGE_MS = 60_000;

const DEFAULT_SETTINGS: Settings = {
  currentForestId: null,
  recentSprites: [],
  theme: DEFAULT_THEME_ID, // Vibrant Jungle; the themes are in lib/theme/themes.ts
  geminiKey: '',
  cerebrasKey: '',
  autoConnections: true,
  reviewMinutes: 5,
};

// ---------- small helpers ----------

// crypto.randomUUID only exists on https pages, and the content script runs on http pages too.
function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function listRecords<T>(prefix: string): Promise<T[]> {
  const all = await browser.storage.local.get(null);
  return Object.entries(all)
    .filter(([key]) => key.startsWith(prefix))
    .map(([, value]) => value as T);
}

async function readRecord<T>(key: string): Promise<T | undefined> {
  const found = await browser.storage.local.get(key);
  return found[key] as T | undefined;
}

async function writeRecord(key: string, value: unknown): Promise<void> {
  await browser.storage.local.set({ [key]: value });
}

const byCreatedAt = (a: { createdAt: number }, b: { createdAt: number }) => a.createdAt - b.createdAt;

// ---------- forests ----------

/** Always returns at least one forest: a default one is created on first use. */
export async function getForests(): Promise<Forest[]> {
  const forests = await listRecords<Forest>(PREFIX.forest);
  if (forests.length > 0) return forests.sort(byCreatedAt);
  const fallback: Forest = { id: DEFAULT_FOREST_ID, name: 'My First Forest', icon: 'tree', createdAt: Date.now() };
  await writeRecord(PREFIX.forest + fallback.id, fallback);
  return [fallback];
}

export async function getForest(id: string): Promise<Forest | undefined> {
  return readRecord<Forest>(PREFIX.forest + id);
}

export async function createForest(input: { name: string; icon: string }): Promise<Forest> {
  const forest: Forest = { id: newId(), name: input.name, icon: input.icon, createdAt: Date.now() };
  await writeRecord(PREFIX.forest + forest.id, forest);
  return forest;
}

export async function updateForest(id: string, patch: Partial<Omit<Forest, 'id'>>): Promise<Forest> {
  const current = await getForest(id);
  if (!current) throw new Error(`Forest ${id} not found`);
  const updated = { ...current, ...patch };
  await writeRecord(PREFIX.forest + id, updated);
  return updated;
}

/** Also removes the forest's folders, seeds and roots. */
export async function deleteForest(id: string): Promise<void> {
  const all = await browser.storage.local.get(null);
  const keys = Object.entries(all)
    .filter(([key, value]) => key !== PREFIX.forest + id && key !== SETTINGS_KEY && (value as { forestId?: string })?.forestId === id)
    .map(([key]) => key);
  await browser.storage.local.remove([PREFIX.forest + id, ...keys]);
}

// ---------- folders ----------

export async function getFolders(forestId: string): Promise<Folder[]> {
  const folders = await listRecords<Folder>(PREFIX.folder);
  return folders.filter((f) => f.forestId === forestId);
}

export async function createFolder(input: { forestId: string; name: string }): Promise<Folder> {
  const folder: Folder = { id: newId(), forestId: input.forestId, name: input.name };
  await writeRecord(PREFIX.folder + folder.id, folder);
  return folder;
}

export async function deleteFolder(id: string): Promise<void> {
  await browser.storage.local.remove(PREFIX.folder + id);
}

// ---------- seeds ----------

/** Makes the id and createdAt, cleans the url, and returns the saved seed. */
export async function saveSeed(input: SeedInput): Promise<Seed> {
  const seed: Seed = {
    folderId: null,
    growth: 'sprout',
    linkTarget: null,
    anchor: null,
    nextReviewAt: null,
    ...input,
    url: cleanUrl(input.url),
    id: newId(),
    createdAt: Date.now(),
  };
  await writeRecord(PREFIX.seed + seed.id, seed);
  return seed;
}

/** Restores an existing seed exactly, for local undo and redo history. */
export async function restoreSeed(seed: Seed): Promise<void> {
  await writeRecord(PREFIX.seed + seed.id, seed);
}

export async function getSeed(id: string): Promise<Seed | undefined> {
  return readRecord<Seed>(PREFIX.seed + id);
}

export async function updateSeed(id: string, patch: Partial<Omit<Seed, 'id'>>): Promise<Seed> {
  const current = await getSeed(id);
  if (!current) throw new Error(`Seed ${id} not found`);
  const updated = { ...current, ...patch, url: patch.url ? cleanUrl(patch.url) : current.url };
  await writeRecord(PREFIX.seed + id, updated);
  return updated;
}

export async function deleteSeed(id: string): Promise<void> {
  await browser.storage.local.remove(PREFIX.seed + id);
}

/** Seeds on one page, across all forests. Pass any form of the address: it is cleaned first. */
export async function getSeedsForUrl(url: string): Promise<Seed[]> {
  const clean = cleanUrl(url);
  const seeds = await listRecords<Seed>(PREFIX.seed);
  return seeds.filter((s) => s.url === clean).sort(byCreatedAt);
}

export async function getSeedsForForest(forestId: string): Promise<Seed[]> {
  const seeds = await listRecords<Seed>(PREFIX.seed);
  return seeds.filter((s) => s.forestId === forestId).sort(byCreatedAt);
}

// ---------- screenshots (media seeds) ----------
// A media seed's picture is kept in its own record, "shot:<seed id>", and not inside the seed, so lists of seeds
// stay small. It is not removed with the seed, so undo can bring the seed back with its picture; pictures whose
// seed is gone are cleared out the next time a screenshot is saved.

/** Saves the screenshot (a JPEG data URL) of a media seed. */
export async function saveScreenshot(seedId: string, dataUrl: string): Promise<void> {
  const all = await browser.storage.local.get(null);
  const orphans = Object.keys(all).filter((key) => key.startsWith(PREFIX.shot) && !(PREFIX.seed + key.slice(PREFIX.shot.length) in all));
  if (orphans.length) await browser.storage.local.remove(orphans);
  await writeRecord(PREFIX.shot + seedId, dataUrl);
}

/** The screenshot of a media seed, as a data URL, or null if it has none. */
export async function getScreenshot(seedId: string): Promise<string | null> {
  return (await readRecord<string>(PREFIX.shot + seedId)) ?? null;
}

// ---------- roots ----------

export async function getRoots(forestId: string): Promise<Root[]> {
  const roots = await listRecords<Root>(PREFIX.root);
  return roots.filter((r) => r.forestId === forestId);
}

export async function addRoot(input: Omit<Root, 'id'>): Promise<Root> {
  const root: Root = { ...input, id: newId() };
  await writeRecord(PREFIX.root + root.id, root);
  return root;
}

export async function deleteRoot(id: string): Promise<void> {
  await browser.storage.local.remove(PREFIX.root + id);
}

/**
 * Apples (fruit sprouts) whose time is up and whose question has not been answered yet, in every forest,
 * oldest first. An apple's `nextReviewAt` is cleared once its question is answered.
 */
export async function getDueReviews(now = Date.now()): Promise<Seed[]> {
  const seeds = await listRecords<Seed>(PREFIX.seed);
  return seeds.filter((s) => s.spriteType === 'fruitsprout' && s.nextReviewAt !== null && s.nextReviewAt <= now).sort((a, b) => (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0));
}

// ---------- fruits (quizzes) ----------

/** A forest's quizzes, oldest first. */
export async function getFruits(forestId: string): Promise<Fruit[]> {
  const fruits = await listRecords<Fruit>(PREFIX.fruit);
  return fruits.filter((f) => f.forestId === forestId).sort(byCreatedAt);
}

/**
 * Saves a new quiz, keeping the older ones, and names it "Quiz N". N is one more than the highest "Quiz N" so far
 * (or than the number of quizzes, if larger), so a number never comes back after a rename. Counted per forest and
 * color, so each apple's one-question fruit does not push up the lily pad quiz numbers.
 */
export async function saveFruit(input: Omit<Fruit, 'id' | 'createdAt' | 'name'>): Promise<Fruit> {
  const old = (await getFruits(input.forestId)).filter((f) => f.color === input.color);
  const highest = Math.max(old.length, ...old.map((f) => Number(/^Quiz (\d+)$/.exec(f.name ?? '')?.[1] ?? 0)));
  const fruit: Fruit = { ...input, name: `Quiz ${highest + 1}`, id: newId(), createdAt: Date.now() };
  await writeRecord(PREFIX.fruit + fruit.id, fruit);
  return fruit;
}

/** Changes a quiz's name or icon. */
export async function updateFruit(id: string, patch: Partial<Pick<Fruit, 'name' | 'icon'>>): Promise<void> {
  const current = await readRecord<Fruit>(PREFIX.fruit + id);
  if (!current) return;
  await writeRecord(PREFIX.fruit + id, { ...current, ...patch });
}

/** Gives a quiz a new name. An empty name is ignored. */
export async function renameFruit(id: string, name: string): Promise<void> {
  if (name.trim()) await updateFruit(id, { name: name.trim() });
}

// ---------- settings ----------

/** If the saved current forest is missing, falls back to the first forest. */
export async function getSettings(): Promise<Settings> {
  const saved = (await readRecord<Partial<Settings>>(SETTINGS_KEY)) ?? {};
  const settings: Settings = { ...DEFAULT_SETTINGS, ...saved };
  const forests = await getForests();
  if (!forests.some((f) => f.id === settings.currentForestId)) {
    settings.currentForestId = forests[0]?.id ?? null;
    await writeRecord(SETTINGS_KEY, settings);
  }
  return settings;
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const updated = { ...(await getSettings()), ...patch };
  await writeRecord(SETTINGS_KEY, updated);
  return updated;
}

// ---------- extras beyond the agreed list ----------

const DEFAULT_TOOLBAR: ToolbarState = { open: false, top: 16, right: 16, scale: 1 };

/** Whether the toolbar is open and where it sits. The same in every tab. */
export async function getToolbarState(): Promise<ToolbarState> {
  return { ...DEFAULT_TOOLBAR, ...(await readRecord<Partial<ToolbarState>>(TOOLBAR_KEY)) };
}

export async function updateToolbarState(patch: Partial<ToolbarState>): Promise<ToolbarState> {
  const updated = { ...(await getToolbarState()), ...patch };
  await writeRecord(TOOLBAR_KEY, updated);
  return updated;
}

/** Calls `callback` whenever anything in storage changes, in any tab or page. Returns a function that stops listening. */
export function onDataChanged(callback: () => void): () => void {
  const listener = (_changes: unknown, area: string) => {
    if (area === 'local') callback();
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

/** The viewer calls this before opening a seed's page, so that page can scroll to the seed. */
export async function setPendingJump(seed: Seed): Promise<void> {
  await writeRecord(PENDING_JUMP_KEY, { seedId: seed.id, url: seed.url, at: Date.now() });
}

/** Returns the seed id to scroll to if one is waiting for this page, and clears it. */
export async function takePendingJump(url: string): Promise<string | null> {
  const jump = await readRecord<{ seedId: string; url: string; at: number }>(PENDING_JUMP_KEY);
  if (!jump || jump.url !== cleanUrl(url)) return null;
  await browser.storage.local.remove(PENDING_JUMP_KEY);
  return Date.now() - jump.at < PENDING_JUMP_MAX_AGE_MS ? jump.seedId : null;
}
