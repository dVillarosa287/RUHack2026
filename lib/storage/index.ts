// The one storage module. Nothing else in the project calls chrome.storage directly.
//
// Every record lives under its own key ("seed:abc123", "forest:xyz", ...). Two tabs saving at the
// same moment therefore never overwrite each other. Everything is async because chrome.storage is.
import { browser } from 'wxt/browser';
import { DEFAULT_THEME_ID } from '@/lib/theme/themes';
import { cleanUrl } from './url';
import type { AdvancedSettings, Folder, Forest, Quiz, StashState, Root, Seed, SeedInput, Settings, ToolbarState } from './types';

export * from './types';
export { cleanUrl } from './url';
export { padGroups, type PadGroup } from './padGroups';

// Quizzes are saved under 'fruit:' (their old name), so quizzes saved before the rename still load.
const PREFIX = { forest: 'forest:', folder: 'folder:', seed: 'seed:', root: 'root:', quiz: 'fruit:', shot: 'shot:' } as const;
const SETTINGS_KEY = 'settings';
const PENDING_JUMP_KEY = 'pendingJump';
const TOOLBAR_KEY = 'toolbar';
const ADVANCED_KEY = 'advanced';
const STASHES_KEY = 'stashes';
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

// Reads only the records whose key starts with `prefix`. It lists the key names first (getKeys, Chrome 130+) and
// fetches just those, instead of copying the whole database (screenshots included) into every tab each time.
// That copy happened several times per page load in every open tab and pushed tabs past 100 MB with a big forest.
async function listRecords<T>(prefix: string): Promise<T[]> {
  const local = browser.storage.local;
  const all = typeof local.getKeys === 'function' ? await local.get((await local.getKeys()).filter((key) => key.startsWith(prefix))) : await local.get(null);
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
  const fallback: Forest = { id: DEFAULT_FOREST_ID, name: 'My Forest', icon: 'tree', createdAt: Date.now() };
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
 * Apples (quiz sprouts) whose time is up and whose question has not been answered yet, in every forest,
 * oldest first. An apple's `nextReviewAt` is cleared once its question is answered.
 */
export async function getDueReviews(now = Date.now()): Promise<Seed[]> {
  const seeds = await listRecords<Seed>(PREFIX.seed);
  return seeds.filter((s) => s.spriteType === 'fruitsprout' && s.nextReviewAt !== null && s.nextReviewAt <= now).sort((a, b) => (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0));
}

// ---------- quizzes (quizzes) ----------

/** A forest's quizzes, oldest first. */
export async function getQuizzes(forestId: string): Promise<Quiz[]> {
  const quizzes = await listRecords<Quiz>(PREFIX.quiz);
  return quizzes.filter((f) => f.forestId === forestId).sort(byCreatedAt);
}

/**
 * Saves a new quiz, keeping the older ones, and names it "Quiz N". N is one more than the highest "Quiz N" so far
 * (or than the number of quizzes, if larger), so a number never comes back after a rename. Counted per forest and
 * color, so each apple's one-question quiz does not push up the lily pad quiz numbers.
 */
export async function saveQuiz(input: Omit<Quiz, 'id' | 'createdAt' | 'name'>): Promise<Quiz> {
  const old = (await getQuizzes(input.forestId)).filter((f) => f.color === input.color);
  const highest = Math.max(old.length, ...old.map((f) => Number(/^Quiz (\d+)$/.exec(f.name ?? '')?.[1] ?? 0)));
  const quiz: Quiz = { ...input, name: `Quiz ${highest + 1}`, id: newId(), createdAt: Date.now() };
  await writeRecord(PREFIX.quiz + quiz.id, quiz);
  return quiz;
}

/** Changes a quiz's name or icon, or its questions (when new lily pads are added to it). */
export async function updateQuiz(id: string, patch: Partial<Pick<Quiz, 'name' | 'icon' | 'questions'>>): Promise<void> {
  const current = await readRecord<Quiz>(PREFIX.quiz + id);
  if (!current) return;
  await writeRecord(PREFIX.quiz + id, { ...current, ...patch });
}

/** Removes a quiz for good. */
export async function deleteQuiz(id: string): Promise<void> {
  await browser.storage.local.remove(PREFIX.quiz + id);
}

/** Gives a quiz a new name. An empty name is ignored. */
export async function renameQuiz(id: string, name: string): Promise<void> {
  if (name.trim()) await updateQuiz(id, { name: name.trim() });
}

// ---------- forest backup files ----------

/** What a forest backup file holds. `version` lets later versions of the app still read old files. */
export interface ForestBackup {
  app: 'wildernotes';
  version: 1;
  exportedAt: number;
  forest: Forest;
  folders: Folder[];
  seeds: Seed[];
  roots: Root[];
  quizzes: Quiz[];
  /** Screenshots of media seeds, by seed id (JPEG data URLs). */
  shots: Record<string, string>;
}

/** Everything in one forest, for a backup file. Never includes settings or API keys. */
export async function exportForest(id: string): Promise<ForestBackup> {
  const forest = await getForest(id);
  if (!forest) throw new Error(`Forest ${id} not found`);
  const seeds = await getSeedsForForest(id);
  const shots: Record<string, string> = {};
  for (const seed of seeds) {
    const shot = seed.kind === 'media' ? await getScreenshot(seed.id) : null;
    if (shot) shots[seed.id] = shot;
  }
  return { app: 'wildernotes', version: 1, exportedAt: Date.now(), forest, folders: await getFolders(id), seeds, roots: await getRoots(id), quizzes: await getQuizzes(id), shots };
}

const isList = (value: unknown): value is Record<string, unknown>[] => Array.isArray(value) && value.every((v) => v && typeof v === 'object');

/**
 * Adds a backup file's forest as a new forest. Every record gets a new id (so importing the same file twice makes two
 * copies, and nothing already saved is overwritten), and the links between them are rewired to the new ids.
 * Apples whose review time has passed are not asked again straight away. Throws an Error with a message for the user
 * if the file is not a Wildernotes forest.
 */
export async function importForest(data: unknown): Promise<Forest> {
  const file = data as Partial<ForestBackup> | null;
  if (!file || file.app !== 'wildernotes' || !file.forest || typeof file.forest.name !== 'string') throw new Error('This is not a Wildernotes forest file.');
  if (file.version !== 1) throw new Error('This forest file was made by a newer version of Wildernotes. Update the extension and try again.');
  if (![file.folders, file.seeds, file.roots, file.quizzes].every(isList)) throw new Error('This forest file is damaged.');
  const ids = new Map<string, string>(); // old id -> new id
  const fresh = (old: string) => ids.get(old) ?? (ids.set(old, newId()), ids.get(old)!);
  const forest: Forest = { ...file.forest, id: newId(), createdAt: Date.now(), x: undefined, y: undefined };
  const records: Record<string, unknown> = { [PREFIX.forest + forest.id]: forest };
  for (const f of file.folders!) records[PREFIX.folder + fresh(f.id)] = { ...f, id: fresh(f.id), forestId: forest.id };
  const now = Date.now();
  for (const s of file.seeds!) {
    const seed: Seed = { ...s, id: fresh(s.id), forestId: forest.id, folderId: s.folderId ? fresh(s.folderId) : null, nextReviewAt: s.nextReviewAt !== null && s.nextReviewAt < now ? null : s.nextReviewAt };
    records[PREFIX.seed + seed.id] = seed;
    const shot = file.shots?.[s.id];
    if (typeof shot === 'string' && shot.startsWith('data:image/')) records[PREFIX.shot + seed.id] = shot;
  }
  for (const r of file.roots!) {
    if (!ids.has(r.fromSeedId) || !ids.has(r.toSeedId)) continue; // a root to a seed that is not in the file
    const root: Root = { ...r, id: newId(), forestId: forest.id, fromSeedId: fresh(r.fromSeedId), toSeedId: fresh(r.toSeedId) };
    records[PREFIX.root + root.id] = root;
  }
  for (const f of file.quizzes!) {
    // An apple's own question is saved under "apple:<seed id>" (lib/engine/recall.ts), so that id is rewired too.
    const color = f.color.startsWith('apple:') ? `apple:${fresh(f.color.slice(6))}` : f.color;
    const quiz: Quiz = { ...f, id: newId(), forestId: forest.id, color, questions: f.questions.map((q) => ({ ...q, seedId: ids.get(q.seedId) ?? q.seedId })) };
    records[PREFIX.quiz + quiz.id] = quiz;
  }
  await browser.storage.local.set(records);
  return forest;
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

export const DEFAULT_ADVANCED: AdvancedSettings = { owlRate: 1, owlScale: 1, frogRate: 1, frogScale: 1, plantScale: 1, reviewRepeats: true, reviewSpacing: 1 };

/** The advanced settings (owl and frog, default sprite size). Missing values are the defaults. */
export async function getAdvancedSettings(): Promise<AdvancedSettings> {
  return { ...DEFAULT_ADVANCED, ...(await readRecord<Partial<AdvancedSettings>>(ADVANCED_KEY)) };
}

export async function updateAdvancedSettings(patch: Partial<AdvancedSettings>): Promise<AdvancedSettings> {
  const updated = { ...(await getAdvancedSettings()), ...patch };
  await writeRecord(ADVANCED_KEY, updated);
  return updated;
}

/** The user's own toolbar stashes, and which one is in use ('default' until they pick another). */
export async function getStashes(): Promise<StashState> {
  return { currentId: 'default', custom: [], ...(await readRecord<Partial<StashState>>(STASHES_KEY)) };
}

export async function updateStashes(patch: Partial<StashState>): Promise<StashState> {
  const updated = { ...(await getStashes()), ...patch };
  await writeRecord(STASHES_KEY, updated);
  return updated;
}

/** A new id for a stash. */
export const newStashId = newId;

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
