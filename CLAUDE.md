# Wildernotes

A Chrome extension (Manifest V3) for annotating web pages for later reference and studying, being prepared for release on the Chrome Web Store. It started as a HackRU 2026 project. The whole app is plant and forest themed (sprites, words and art); "forest" is still the in-app word for a collection of notes, but the product is called Wildernotes (`APP_NAME` in `lib/theme/index.ts`). Its colors are the palette in `docs/THEME.md`.

## What it does

- On any web page the user highlights text and plants themed sprites (sprout, lily pad, mushroom, flower, apple tree).
- Each annotation (a "seed") is saved to that page and reappears on the next visit.
- Seeds are collected into "forests" (projects). The forest viewer shows them as a list and as an Obsidian-style graph of sprite nodes that can be connected to each other and turned into quizzes for active recall.
- Two parts: (1) the on-page extension UI, (2) the forest viewer, a full-tab page inside the extension. There is no hosted web app, server, login or cloud database.

## Team and context

- Four people, each with their own branch and their own Claude session. There are no fixed roles: anyone takes any job. "Page engine", "On-page UI and art", "Viewer" and "Data, AI and integration" are areas of the product. They tag checklist items and say which folders a job touches. They are not people. Before you start a job, claim it by writing your name in the "Taken by" column of `docs/DIVIDING_WORK.md`, so two people do not do the same one.
- The hackathon is over. Wildernotes is now a real extension for real users: reliability, privacy and passing Chrome Web Store review matter more than new features. Older notes and docs that talk about "the demo" or hour ranges are history.
- David Villarosa publishes Wildernotes to the Chrome Web Store from his developer account. The code is "All rights reserved" (`LICENSE`): public so anyone can check it, but not open source. Never copy code or art from a project without a licence that allows it; credit ideas in `THIRD_PARTY_NOTICES.md`.
- Some of the team are new to coding. Keep code simple, keep files small, and say briefly why a choice was made.

## Other project files

- `docs/SPEC.md`: the full spec. Read only the section for the feature you are about to build, before building it.
- `PROGRESS.md`: checklist of what is done, grouped by stage. The current stage is stated at the top.
- `BACKLOG.md`: bugs to fix, things to add, and open decisions.
- `docs/DIVIDING_WORK.md`: jobs that can be handed to different people or helper agents at the same time, with their folders, dependencies and suggested models.
- `docs/TWO_SESSIONS.md`: how two people with their own Claude sessions split Stage 2 into a page lane and a viewer lane, the model and effort to use, and the prompt to paste.
- `docs/THEME.md`: the palette and the rules for every color and style. Read it before you write any CSS, Tailwind classes or inline styles.
- `docs/PUBLISHING.md`: the Chrome Web Store checklist (privacy, permissions, the user's API key, licences) and what must be fixed before submitting.
- `docs/PRIVACY_POLICY.md`: the user-facing privacy policy. It must always describe what the code really does.

## Vocabulary (use these exact names in code and UI)

- **Seed:** one saved annotation or node. Every annotation starts as a seed.
- **Sprite:** the icon a seed is shown as. Types: `flower`, `cat`, `grass`, `owl`, `rock`, `house`, `lilypad` ("quiz me on this", "Quiz generation": only goes on text, by dragging over it) and `fruitsprout` (the apple, "Active Recall": only goes on text, see below). `sprout` and `mushroom` are plain note sprites, like `cat` and `grass`. The art in `images/` is colored already; every tree is `tree.png` (the apple tree is `appletree.png`). Every highlight shows its sprite centered above it. Sprite art, names and highlight colors depend on the theme (the Minimal theme uses shapes from `minimal-images/`), see `docs/THEME.md`.
- **Growth:** two stages, `sprout` then `tree`. A sprout becomes a tree when the user reloads the page. Only the sprout and the fruit sprout grow; the lily pad, mushroom and flower never change. Correct quiz answers never change a seed; the one exception is an apple's spaced repetition, where the answer sets only its next review time (`nextReviewAt`, `reviewStep`), never its growth.
- **Fruit sprout / apple / apple tree:** `fruitsprout`, shown as the apple. The user plants it over text. After the active recall time (Settings, 5 minutes by default) a `chrome.alarms` alarm grows it into an apple tree and a pop-up in the top left of the page asks one fill-in-the-blank question: the paragraph it was planted in with the highlight blanked out, made and saved when it is planted (`lib/engine/recall.ts`), no Gemini. The tree stays after the question. It is separate from the lily pad quiz.
- **Color:** each sprite has its own fixed color (`SPRITES[type].color` in `lib/theme/index.ts`), used for its text highlight. Sprites on the page do not glow (only the scroll rail's sprites have a faint white glow). There is no color picker. `Seed.color` is still saved (the sprite's color key) but nothing reads it.
- **Forest:** a collection of seeds for one project. A forest is a folder. Forests can contain folders.
- **Root:** a connection the user draws by hand between two nodes. **Path:** an automatic same-page or same-site connection, drawn dashed.
- **Quiz:** a set of questions made from lily pads (type `Quiz`, `getQuizzes`, `saveQuiz`). It used to be called a "fruit"; it is still saved under `fruit:` keys so old quizzes load. The apple tree's single-question review is a separate thing.
- **Apple:** the sprite whose stored id is `fruitsprout` (kept for saved data). Call it the apple in code comments and UI.
- **Frog:** the teacher. Hops between lily pads in a quiz (AI summaries spoken by the frog are Future). On web pages a frog now and then jumps onto a lily pad and sits there (`lib/onpage-ui/PondFrog.tsx`).
- **Owl (on the page):** while the toolbar is open, an owl now and then flies down from above and sits on a button or the top of a block of text (`lib/onpage-ui/PageOwl.tsx`). Its art comes from `owlArt(themeId)`; it is not the `owl` sprite.
- **Animal:** the marker on the scroll rail for where you were before you jumped.
- **Lily pad group:** lily pads joined to each other by roots (directly or through other lily pads). Never saved: worked out by `padGroups` (`lib/storage/padGroups.ts`). Joining a group adds a root; a pad on its own is not a group. A quiz can be made from one group.
- **Camera:** the toolbar button under the tree. With a sprite picked (never the apple), it makes a drag take a screenshot saved with that sprite as a `media` seed (`lib/engine/screenshot.ts`), which shows a tiny camera badge and its picture on hover. A lily pad's screenshot is read by Gemini for its quiz; quizzes without AI skip it. Art: `images/camera.png` (`CameraIcon`).
- **Stash:** the set of sprites the toolbar shows, in order (keys 1 to 9 and 0). `DEFAULT_STASH` is fixed (`lib/onpage-ui/hotbar.ts`); the user's own are saved with `getStashes`/`updateStashes` and edited on the Settings page.
- **Large tree:** in the graph view, a bigger tree node for each web page that has 2 or more seeds in the forest. It sits near those seeds and is joined to them by very subtle lines. It is worked out from the seeds, never saved, and is not a seed.

## Stack

- WXT (Manifest V3), TypeScript, React, Tailwind CSS.
- React Flow (`@xyflow/react`) for the graph view.
- `chrome.storage.local` for all data.
- Gemini API (current Flash model, free tier) or Cerebras for quizzes, suggested roots and summaries, with the user's own API key (`lib/ai/gemini.ts`).
- `chrome.alarms` for timers.
- Browser `speechSynthesis` for the frog's voice, ElevenLabs as an optional upgrade.
- PNG or SVG sprites at 64 by 64, CSS animations.

Reasons for each choice: `docs/SPEC.md` section 2.

## Rules that must hold

- All reads and writes go through the one storage module. Nothing else calls `chrome.storage` directly.
- Never use IndexedDB or `localStorage` from the page script. There they belong to the website being viewed, so data would not be shared across sites.
- All on-page UI (toolbar, palette, scroll rail) is mounted inside a Shadow DOM with WXT's `createShadowRootUi`, and is put in the browser's top layer with `keepOnTop` (`lib/onpage-ui/topLayer.ts`) so it draws above everything on the page, whatever z-index the site uses. Do not fix stacking problems with a bigger z-index.
- On a page, show only the current forest's seeds. Seeds from other forests on the same page stay hidden until that forest is chosen.
- Draw highlights with the CSS Custom Highlight API. Do not wrap page text in new elements.
- Never store raw pixel coordinates as the only location. Use the anchor shape in the data model. A marker is attached to the text under it (with the element and scroll position as fallbacks) and is drawn from that anchor on every frame by `MarkerTracker`, so it follows the page when it scrolls, resizes or reflows. Never position a marker from a saved screen or page coordinate.
- Clean URLs (strip tracking parameters and the `#` part) before using them as keys.
- Gemini (or Cerebras) is called only from the background service worker, only when the user asks, with one request per quiz and JSON output. The key comes from settings in local storage. Never commit a key.
- Privacy (Chrome Web Store rules, `docs/PUBLISHING.md`): the user's API key is sent only to that provider's own address, never anywhere else, never logged, and there is never a default key of ours in the code. No analytics, trackers, or requests to our own or any other server. No code or files loaded from the internet (fonts, scripts, images all ship inside the extension). Nothing leaves the browser unless the user pressed a button that clearly says so. Any change that adds a permission, a network request, or a new kind of data leaving the browser must update `docs/PRIVACY_POLICY.md` and `docs/PUBLISHING.md` in the same change, and needs the team's OK.
- Use `chrome.alarms` for anything that waits longer than a few seconds. The background worker sleeps after about 30 seconds idle.
- Sprites and colors are loaded from the theme (`lib/theme/`). Do not hard-code sprite paths or colors in components.
- Every color and style follows `docs/THEME.md`: only the palette's exact colors (each has a normal, lighter and darker tone), always through theme tokens (`var(--fo-...)`). No gradients. Backgrounds use only the Background colors and text only the Foreground colors, never mixed with other colors. A color outside the palette may only be made with a CSS filter. No hex codes, `rgb()` or stock Tailwind color classes outside `lib/theme/themes.ts`. Run `npm run check:theme` before you finish; it must pass.
- Use placeholder art (colored circles) when a sprite is not ready. Art never blocks code.
- No native `<select>`: the browser draws its open list in its own colors. Use `entrypoints/viewer/Dropdown.tsx` in the viewer and `lib/onpage-ui/Picker.tsx` on pages.
- Never put `will-change` on an element that has the line boil filter (`lib/engine/lineBoil.ts`): together they cost about 65 MB of GPU memory per open tab.
- Advanced settings: whenever you add something a user might reasonably want to tune or turn off (how often something appears, a size, a timing), put it in `AdvancedSettings` (`lib/storage/types.ts`, read with `getAdvancedSettings`), add a row to `entrypoints/viewer/AdvancedSettings.tsx`, and list it below. Keep it reasonable: no setting for every constant. Now in Advanced settings: owl visits and size, frog visits and size, default sprite size, apple repeat reviews (on/off, spacing).
- Every creature that visits a page (owl, frog, and any added later) can be dragged somewhere else and removed with the shovel: use `grabCreature` (`lib/onpage-ui/creatureGrab.ts`).

## Data model

- **Forest:** id, name, icon, createdAt, and optional x and y (its spot on the forests grid in the viewer).
- **Folder:** id, forestId, name.
- **Seed:** id, forestId, folderId, kind (`highlight`, `sprite`, `link`, `note`, `media`), spriteType, color, growth, url, pageTitle, text, linkTarget, anchor, nextReviewAt, createdAt. Allowed values: spriteType is `sprout`, `lilypad`, `mushroom`, `flower`, `fruitsprout`, `cat`, `grass`, `owl`, `rock` or `house`; growth is `sprout` or `tree`. Seeds also have optional graphX and graphY (the node's spot in the graph view) an optional note (the user's own words, not for the lily pad or the apple) an optional scale (the size its sprite was planted at; - and + choose it before planting) and, for apples, an optional reviewStep (how many spaced repetition reviews in a row were right). The source of truth is `lib/storage/types.ts`.
- **Anchor:** the exact quoted text plus a few words before and after it; a selector for the nearest page element with an x and y offset inside it; scroll position as a percentage of page height.
- **Root:** id, forestId, fromSeedId, toSeedId, source (`manual` or `ai`), reason.
- **Quiz** (saved as `fruit:<id>`): id, forestId, color, questions (seedId, type (`multiple-choice`, `fill-blank`, `type-in` or `matching`), prompt, choices, answer, and for matching only `pairs` of { left, right }), optional name ("Quiz 1"; missing on quizzes saved before names existed), optional icon (an art id like Forest.icon; missing means `FOREST_ICONS[0]`), createdAt.
- **Settings:** currentForestId, the three most recent sprites, theme, Gemini API key, auto-connections on or off, reviewMinutes (the active recall time).

Whether the on-page toolbar is open and where it sits is interface state, not part of this model. It has its own record in the storage module (`getToolbarState`, `updateToolbarState`) and is shared by every tab. Advanced settings (`getAdvancedSettings`) and toolbar stashes (`getStashes`) have their own records the same way.

Changing these shapes affects everyone. Do not change them without the user confirming with the team; add a note to `BACKLOG.md` instead.

## Folders by area

These are not owned by particular people. They show which folders a job touches, so two jobs at the same time stay out of each other's way.

- Page engine: `lib/engine/`, including its hooks `useSeedsOnPage` (draws highlights, jumps to a seed) and `usePlanting` (turns mouse activity into seeds)
- On-page UI and art: `lib/onpage-ui/` (`App.tsx` only puts the pieces together; `usePageData`, `Toolbar`, `ForestPicker` (the toolbar's themed forest drop-down) and `MarkerLayer` are separate files), `images/` (all sprite and frog art), `minimal-images/` (the Minimal theme's shapes), `forest-images/` and `jungle-images/` (each theme's own copy of the art; so far only the page owl uses them). The toolbar layout, hotbar and default stash are in `hotbar.ts`, the keyboard shortcuts in `useKeybinds.ts`, the toolbar's drop-downs in `Picker.tsx`, a lily pad's group picker in `PadGroupPicker.tsx`, dragging and digging up creatures in `creatureGrab.ts`
- Viewer: `entrypoints/viewer/` (`route.ts` lists the pages; `ForestView`, `ForestHeader`, `ForestList`, `GraphView`, `SettingsPage` (with `AdvancedSettings` and `StashEditor`), `ForestGrid`, `GrowFromLink` (reads a pasted link with Gemini, `lib/ai/readPage.ts`) and the quiz (`QuizBar`, `QuizView`, `QuizGrid` (the saved quizzes as tiles), `Pond`) are separate files)
- Data, AI and integration: `lib/storage/`, `lib/ai/`, `lib/theme/`, `entrypoints/background.ts`, project config (`wxt.config.ts`, `package.json`, `tsconfig.json`, `.gitignore`), `scripts/`, `docs/THEME.md`
- Shared glue, keep it tiny: `entrypoints/content/`
- PDF page: `entrypoints/pdf/` (renders a PDF with a text layer and mounts the same on-page UI). Code that needs the page's address uses `pageUrl()` (`lib/engine/pageUrl.ts`), never `window.location.href`, so PDF seeds are saved under the PDF's own address.

`lib/theme/` is used by everyone: it holds the colors, the sprite art lookup and the shared `SpriteIcon`, `ForestIcon` and `ShovelIcon` components. To add art: put the PNG in `images/` (colored art as `<name>.png`; white placeholder art as `uncolored-<name>.png`, which gets tinted), then name it in `lib/theme/index.ts`. The build crops the empty margin and copies it into the extension (`wxt.config.ts`, `scripts/trim-art.ts`); the originals in `images/` are never changed. Sprites are drawn through `SpriteIcon`, which tints only the `uncolored-*` placeholders, in the sprite's own color. Art for the Minimal theme goes in `minimal-images/` (colored, published as `sprites/minimal/`) and is named in `MINIMAL_ART`. `forest-images/` and `jungle-images/` are published as `sprites/forest/` and `sprites/jungle/` (`artUrl('jungle/<file>')`). Anything that shows a sprite's name uses `spriteLabel(type, useThemeId())`. Any text the user sees that names a forest, folder, seed, root or other nature word comes from `useWords()` (`lib/theme/words.ts`), because the Minimal theme uses plain words (folders, sections, items, links).

Stay inside the folders of the job you claimed. If your job needs a change in a folder that another job is working in, or in the data model, stop and tell the user.

## Stages

- **Stage 1:** annotation, saving and a separate viewer, with plain visuals.
- **Stage 2:** sprites. The toolbar, scroll rail, forest grid and graph view make it look and feel like a forest.
- **Stage 3:** quizzes, animation and quality of life, built in the priority order in `PROGRESS.md`.

- **Release (now):** get Wildernotes onto the Chrome Web Store. The "Must fix before submitting" list in `docs/PUBLISHING.md` comes first, then bugs in `BACKLOG.md`, then unfinished Stage 2 and 3 items.

Stages 1 to 3 were the hackathon plan. Do not start anything listed as Future without the user asking.

## How to work in this repo

- Start of every session: read `PROGRESS.md`, including "Notes for other agents" from every area. Then pick an unchecked item in the current stage that nobody has claimed (see `docs/DIVIDING_WORK.md`), claim it, and read the matching section of `docs/SPEC.md`.
- Check `BACKLOG.md` under "Open decisions" first. If your task touches one, ask the user instead of guessing.
- Found a bug or an idea outside the current task: add it to `BACKLOG.md` and keep going.
- Whenever the user answers an open decision, changes a plan, or asks for a new behavior, design, document or idea (for now or for later), record it in the same session so future agents can see it: `docs/SPEC.md` (what the product does), `PROGRESS.md` (checklist items, plus your note), `BACKLOG.md` (later ideas and decisions; move settled ones to Closed), `docs/DIVIDING_WORK.md` (if it is a job that could be handed out), and this file (rules, commands, folders, links to new docs). Search them for the old wording so nothing contradicts the new answer.

### Before you finish, every session (required)

Update `PROGRESS.md` before your final message, every time you work, even if the task is unfinished or nothing changed in the code. Everyone else and their agents only know what you did from this file.

1. Tick each item you finished, but only after it has been tested in Chrome on a real page. Tick only the items you did.
2. If you started an item and did not finish it, leave the box unticked and add `(in progress: what is left)` at the end of its line.
3. Add one entry at the top of the section for the area you worked in, under "Notes for other agents", using the format given there. Write what someone else would need to know: functions or files they can now use, anything that is still fake or placeholder, how to test what you built, and anything you need from them.
4. If every box in the current stage is ticked, tell the user so they can run the "Done when" check. Do not change "Current stage" yourself.
5. In your final message, tell the user which boxes you ticked and what note you added.

### Testing and commands
- Test on stable article pages such as Wikipedia or OpenStax. Extensions do not run on Chrome's own pages or the Chrome Web Store. PDFs are sent to the extension's own PDF page (`entrypoints/pdf/`, PDF.js), so they can be annotated; Chrome's built-in PDF viewer itself still can't be.
- Commands (from `package.json`): `npm install` once, `npm run dev` opens Chrome with the extension loaded and reloads on every save, `npm run build` writes the extension to `.output/chrome-mv3/` (load that folder from `chrome://extensions` with Developer mode on and "Load unpacked"), `npm run compile` type-checks, `npm run check:theme` fails if any color breaks the theme rules.
- After loading or reloading the extension, reload any web page you want to test on. Pages opened earlier have no content script, and clicking the icon on them shows a "!" badge.
- The on-page UI is plain CSS in `lib/onpage-ui/toolbar.css`, in px, on purpose: it must look the same on every site. Tailwind is used in the viewer only, with the theme's colors.

## Models and agents

- You choose the model with `/model`. Claude cannot switch its own model during a session. It can start helper agents on a model it picks, but only if you ask for that.
- Sonnet 5.5 is the default for most work: toolbar, viewer, storage, docs.
- Use a larger model (Opus 5.5 or Fable 5.1) for the hard parts: the page engine's anchoring and restoring, bugs that took more than one try, and any decision that changes the data model for everyone.
- Use Haiku 4.5 for small mechanical jobs: renaming, reformatting, copying text between docs.
- Ask for several agents at once only when the work splits into pieces in different folders that do not depend on each other. Each helper starts without your context and costs more, so one connected task is faster and cheaper in a single session.
