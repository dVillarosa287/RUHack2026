# Forest annotation extension (working title "Forest")

HackRU project. A Chrome extension (Manifest V3) for annotating web pages for later reference and studying. The whole app is plant and forest themed, in greens and browns.

## What it does

- On any web page the user highlights text and plants themed sprites (sprout, lily pad, mushroom, flower, apple tree).
- Each annotation (a "seed") is saved to that page and reappears on the next visit.
- Seeds are collected into "forests" (projects). The forest viewer shows them as a list and as an Obsidian-style graph of sprite nodes that can be connected to each other and turned into quizzes for active recall.
- Two parts: (1) the on-page extension UI, (2) the forest viewer, a full-tab page inside the extension. There is no hosted web app, server, login or cloud database.

## Team and context

- Four people. Each has one role, one branch and their own Claude session. Roles: Page engine, On-page UI and art, Viewer, Data/AI/integration. Details in `docs/SPEC.md` section 10.
- Hackathon of about 24 hours. A working demo matters more than complete features.
- Some of the team are new to coding. Keep code simple, keep files small, and say briefly why a choice was made.

## Other project files

- `docs/SPEC.md`: the full spec. Read only the section for the feature you are about to build, before building it.
- `PROGRESS.md`: checklist of what is done, grouped by stage. The current stage is stated at the top.
- `BACKLOG.md`: bugs to fix, things to add, and open decisions.

## Vocabulary (use these exact names in code and UI)

- **Seed:** one saved annotation or node. Every annotation starts as a seed.
- **Sprite:** the icon a seed is shown as. Types: `sprout` (general note or key idea), `lilypad` ("quiz me on this"), `mushroom` (confusing, come back to it), `flower` (definition or key term), `fruitsprout` (timed review, see below).
- **Growth:** two stages, `sprout` then `tree`. A sprout becomes a tree when the user reloads the page. Correct quiz answers never change a seed.
- **Fruit sprout / fruit tree:** the fifth sprite. The user plants it over text. Five minutes later it grows into an apple tree and asks one question about that text, and the tree stays after the question. It is separate from the lily pad quiz. It is in the toolbar now as a placeholder, but the timer and the review are Stage 3 priority 3 only.
- **Color:** picked from the palette, separate from sprite type. Groups seeds by topic inside a forest.
- **Forest:** a collection of seeds for one project. A forest is a folder. Forests can contain folders.
- **Root:** a connection the user draws by hand between two nodes. **Path:** an automatic same-page or same-site connection, drawn dashed.
- **Fruit:** a quiz the forest produces from lily pads of one color. The apple tree's single-question review is a separate thing.
- **Frog:** the teacher. Hops between lily pads in a quiz and speaks AI summaries.
- **Animal:** the marker on the scroll rail for where you were before you jumped.

## Stack

- WXT (Manifest V3), TypeScript, React, Tailwind CSS.
- React Flow (`@xyflow/react`) for the graph view.
- `chrome.storage.local` for all data.
- Gemini API (current Flash model, free tier) for quizzes, suggested roots and summaries.
- `chrome.alarms` for timers.
- Browser `speechSynthesis` for the frog's voice, ElevenLabs as an optional upgrade.
- PNG or SVG sprites at 64 by 64, CSS animations.

Reasons for each choice: `docs/SPEC.md` section 2.

## Rules that must hold

- All reads and writes go through the one storage module. Nothing else calls `chrome.storage` directly.
- Never use IndexedDB or `localStorage` from the page script. There they belong to the website being viewed, so data would not be shared across sites.
- All on-page UI (toolbar, palette, scroll rail) is mounted inside a Shadow DOM with WXT's `createShadowRootUi`.
- Draw highlights with the CSS Custom Highlight API. Do not wrap page text in new elements.
- Never store raw pixel coordinates as the only location. Use the anchor shape in the data model.
- Clean URLs (strip tracking parameters and the `#` part) before using them as keys.
- Gemini is called only from the background service worker, only when the user asks, with one request per quiz and JSON output. The key comes from settings in local storage. Never commit a key.
- Use `chrome.alarms` for anything that waits longer than a few seconds. The background worker sleeps after about 30 seconds idle.
- Sprites and colors are loaded from one theme file. Do not hard-code sprite paths or colors in components.
- Use placeholder art (colored circles) when a sprite is not ready. Art never blocks code.

## Data model

- **Forest:** id, name, icon, createdAt.
- **Folder:** id, forestId, name.
- **Seed:** id, forestId, folderId, kind (`highlight`, `sprite`, `link`, `note`, `media`), spriteType, color, growth, url, pageTitle, text, linkTarget, anchor, nextReviewAt, createdAt. Allowed values: spriteType is `sprout`, `lilypad`, `mushroom`, `flower` or `fruitsprout`; growth is `sprout` or `tree`. The source of truth is `lib/storage/types.ts`.
- **Anchor:** the exact quoted text plus a few words before and after it; a selector for the nearest page element with an x and y offset inside it; scroll position as a percentage of page height.
- **Root:** id, forestId, fromSeedId, toSeedId, source (`manual` or `ai`), reason.
- **Fruit:** id, forestId, color, questions (seedId, type, prompt, choices, answer), createdAt.
- **Settings:** currentForestId, the three most recent sprites, theme, Gemini API key, auto-connections on or off.

Changing these shapes affects all four roles. Do not change them without the user confirming with the team; add a note to `BACKLOG.md` instead.

## Folder ownership

- Page engine: `lib/engine/`
- On-page UI and art: `lib/onpage-ui/`, `public/sprites/` (real sprite art goes here)
- Viewer: `entrypoints/viewer/`
- Data, AI and integration: `lib/storage/`, `lib/ai/`, `lib/theme/`, `entrypoints/background.ts`, project config (`wxt.config.ts`, `package.json`, `tsconfig.json`, `.gitignore`)
- Shared glue, keep it tiny: `entrypoints/content/`

`lib/theme/` is used by everyone: it holds the colors, the sprite stand-ins and the shared `SpriteIcon` and `ShovelIcon` components. To use real art, put the file in `public/sprites/` and write its file name in the `image` field of that sprite in `lib/theme/index.ts`.

Stay inside your role's folders. If a task needs a change in another role's folder, stop and tell the user.

## Stages

- **Stage 1:** annotation, saving and a separate viewer, with plain visuals.
- **Stage 2:** sprites. The toolbar, scroll rail, forest grid and graph view make it look and feel like a forest.
- **Stage 3:** quizzes, animation and quality of life, built in the priority order in `PROGRESS.md`.

Build only items from the current stage. Do not start Stage 3 or anything listed as Future early.

## How to work in this repo

- Start of every session: read `PROGRESS.md`, including "Notes for other agents" from all four roles. Then pick an unchecked item for your role in the current stage and read the matching section of `docs/SPEC.md`.
- Check `BACKLOG.md` under "Open decisions" first. If your task touches one, ask the user instead of guessing.
- Found a bug or an idea outside the current task: add it to `BACKLOG.md` and keep going.
- Whenever the user answers an open decision or changes a plan, update every file that mentions it in the same session: `docs/SPEC.md`, `PROGRESS.md`, `BACKLOG.md` (move settled decisions to Closed) and this file. Search all four for the old wording so nothing contradicts the new answer.

### Before you finish, every session (required)

Update `PROGRESS.md` before your final message, every time you work, even if the task is unfinished or nothing changed in the code. The other three roles and their agents only know what you did from this file.

1. Tick each item you finished, but only after it has been tested in Chrome on a real page. Tick only your own role's items.
2. If you started an item and did not finish it, leave the box unticked and add `(in progress: what is left)` at the end of its line.
3. Add one entry at the top of your role's section under "Notes for other agents", using the format given there. Write what another role would need to know: functions or files they can now use, anything that is still fake or placeholder, how to test what you built, and anything you need from them.
4. If every box in the current stage is ticked, tell the user so they can run the "Done when" check. Do not change "Current stage" yourself.
5. In your final message, tell the user which boxes you ticked and what note you added.

### Testing and commands
- Test on stable article pages such as Wikipedia or OpenStax. Extensions do not run on Chrome's own pages, the Chrome Web Store or the built-in PDF viewer.
- Commands (from `package.json`): `npm install` once, `npm run dev` opens Chrome with the extension loaded and reloads on every save, `npm run build` writes the extension to `.output/chrome-mv3/` (load that folder from `chrome://extensions` with Developer mode on and "Load unpacked"), `npm run compile` type-checks.
- After loading or reloading the extension, reload any web page you want to test on. Pages opened earlier have no content script, and clicking the icon on them shows a "!" badge.
- The on-page UI is plain CSS in `lib/onpage-ui/toolbar.css`, in px, on purpose: it must look the same on every site. Tailwind is used in the viewer only.
