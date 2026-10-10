# Work that can be divided

A list of jobs that can be handed to different people, or different helper agents, at the same time without getting in each other's way. `CLAUDE.md` links here. Keep it up to date as jobs are claimed, finished or added.

There are no fixed roles. Anyone takes any job.

## How to take a job

1. Pick a job from a table below that nobody has taken. Check "Needs first": if it names something that is not done, do that first.
2. **Claim it** by writing your name in the "Taken by" column, and push that change to `main` right away so the others see it.
3. Stay inside the folders in the "Folder" column. Two jobs at the same time then never edit the same file. If your job needs a change in a file or folder another job is working in, or in the data model, stop and ask the user.
4. Read `CLAUDE.md`, the matching section of `docs/SPEC.md`, and `docs/THEME.md` if the job has any styling. A helper agent starts with no memory of the conversation, so paste it the job's row and tell it which files to read.
5. When you finish, update `PROGRESS.md` (checklist and a note), run `npm run compile` and `npm run check:theme`, and change "Taken by" to "Done".

Sizes: S is under an hour, M is one to three hours, L is more than three. Models: see "Models and agents" in `CLAUDE.md`. "Larger" means Opus 5.5 or Fable 5.1.

## Stage 2

### Foundation: built, waiting for a check in Chrome and a merge to `main`

These were the files everyone would otherwise have collided on. After they are merged, jobs can start.

| What | Where |
| --- | --- |
| Optional position fields (approved): `Forest.x`, `Forest.y`, `Seed.graphX`, `Seed.graphY` | `lib/storage/types.ts` |
| React Flow (`@xyflow/react`) and `d3-force` installed, so nobody else changes `package.json` | `package.json` |
| The page code split into small files: `useSeedsOnPage`, `usePlanting` (engine); `usePageData`, `Toolbar`, `MarkerLayer`, and a short `App.tsx` (on-page UI) | `lib/engine/`, `lib/onpage-ui/` |
| The viewer split into small files, with routes `#/forest/<id>`, `#/forest/<id>/graph` and `#/settings` (the last two are placeholders) | `entrypoints/viewer/` |

### Jobs

Where two jobs share a file, "Needs first" says which goes first.

| Job | Folder | Needs first | Size | Model | Taken by |
| --- | --- | --- | --- | --- | --- |
| **Line boil** (the lines of the art wobble) | `lib/theme/SpriteIcon.tsx` | nothing; see `docs/THEME.md` | S | Sonnet | David (in progress) |
| **Fonts** (as theme tokens) | `lib/theme/themes.ts`, `lib/onpage-ui/toolbar.css`, `entrypoints/viewer/style.css` | nothing; see `docs/THEME.md` | M | Sonnet | Aryan (in progress) |
| Drop a sprite onto the page by dragging it from the toolbar | `lib/engine/` (a new hook), and the buttons in `lib/onpage-ui/Toolbar.tsx` | Foundation merged. The toolbar calls `onDropSprite(type, clientX, clientY)` and the engine decides what to place | L | Larger | |
| Sprites on links: stay on the page, store the destination | `lib/engine/` | Foundation merged | M | Sonnet | |
| Check the sturdier-anchoring items in Chrome and tick them | none (testing) | nothing | S | Sonnet | |
| Recent sprites on the toolbar (saved in `Settings.recentSprites`) | `lib/onpage-ui/Toolbar.tsx` | nothing | S | Sonnet | |
| Highlight sprite appears for a second, then fades | `lib/onpage-ui/` (a new component) | nothing | S | Sonnet | |
| **Fix F2:** jump highlight stays yellow for a while, then fades smoothly (`BACKLOG.md` F2) | `lib/engine/` (`useSeedsOnPage`, highlights) | nothing | S | Sonnet | |
| **Fix F3:** placed sprites centered on the mouse (`BACKLOG.md` F3) | `lib/onpage-ui/MarkerLayer.tsx`, `lib/engine/markers.ts` | nothing | S | Sonnet | |
| **Fix F4:** the selected sprite follows the mouse, on top of the cursor (`BACKLOG.md` F4). Do it together with the drag-from-toolbar job above, so both use one "sprite under the cursor" piece | `lib/onpage-ui/` (a new component) | nothing | M | Sonnet | |
| "Create new forest" button on the toolbar (`BACKLOG.md` A7) | `lib/onpage-ui/Toolbar.tsx` | nothing | S | Sonnet | |
| Scroll rail with markers, and the animal (placeholder art for now). The bar is slim, and the sprites on it are larger and stick out past it (`BACKLOG.md` A8) | `lib/onpage-ui/` (new components) | nothing | L | Sonnet | |
| Forest grid: drag forests, remember positions (`Forest.x`, `Forest.y`), choose icons, double-click to open | `entrypoints/viewer/ForestGrid.tsx` | Foundation merged | M | Sonnet | |
| **Graph view** (React Flow), opened by a "Graph view" button at the top right of the forest page. Nodes spread out automatically once (`d3-force`), then keep the user's positions in `Seed.graphX` and `graphY`. **Also the large trees:** a web page with 3 or more seeds in the forest gets a larger tree node placed near its seeds, joined to them by very subtle lines; worked out from the seeds, not saved (`BACKLOG.md` A6) | `entrypoints/viewer/GraphView.tsx` and the button in `ForestView.tsx` | Foundation merged | L | Larger | |
| Roots: drag from one node to another | `entrypoints/viewer/` (graph files) | Graph view | M | Sonnet | |
| Folder sidebar and folders | `entrypoints/viewer/` (a new sidebar file, plus the marked spot in `ForestView.tsx`) | Foundation merged | M | Sonnet | |
| Text notes as nodes, and the detail panel for a node | `entrypoints/viewer/` (graph files) | Graph view | M | Sonnet | |
| Settings screen where the user pastes their Gemini key | `entrypoints/viewer/SettingsPage.tsx` | Foundation merged | S | Sonnet | |
| A second theme, then the custom style dropdown (a menu in the toolbar and viewer header that saves `Settings.theme`) | `lib/theme/`, then `lib/onpage-ui/` and `entrypoints/viewer/` | nothing for the theme; the dropdown needs the theme | S + S | Sonnet | |
| Create the Gemini key and write the model name in `BACKLOG.md` D5 | none | nothing | S | not code | |

Done already, waiting for a check in Chrome: sprites as real art tinted with palette colors (toolbar, markers, viewer), the theme system, markers that follow their text, toolbar drag, resize and top layer, forests hide other forests' seeds.

## Stage 3

| Job | Folder | Needs first | Size | Model | Taken by |
| --- | --- | --- | --- | --- | --- |
| Real art for the animal marker, the apple tree and the frog talking | `images/` | the artist, who is still drawing them | n/a | not code | the artist |
| Sprout turns into a tree when the page is reloaded (sprout and fruit sprout only) | `lib/engine/`, `lib/storage/` | nothing | S | Sonnet | |
| Fill-in-the-blank quiz questions, no AI needed | `lib/ai/` | nothing | S | Sonnet | |
| Gemini writes the questions: one request, JSON output, sent from the background worker | `lib/ai/`, `entrypoints/background.ts` | Gemini key and model name | M | Larger (prompt and JSON handling are fiddly) | |
| Quiz screen with lily pads and the frog (art is in `images/`) | `entrypoints/viewer/` | Quiz questions | L | Sonnet | |
| Fruit sprout: alarm after five minutes, grows into an apple tree, one question, stored as a `Fruit` with one question | `entrypoints/background.ts`, `lib/engine/` | The apple tree art | M | Larger (the alarm must survive the worker sleeping) | |
| AI-suggested roots | `lib/ai/`, `entrypoints/viewer/` | Graph view, Gemini | M | Sonnet | |
| Automatic same-site paths, with a switch | `entrypoints/viewer/` | Graph view | S | Sonnet | |
| Frog summary bubble, read aloud | `lib/engine/`, `lib/onpage-ui/`, `lib/ai/` | Gemini, the frog talking art | M | Sonnet | |
| Export a forest as JSON and Markdown, and import JSON | new `lib/export/` | nothing | M | Sonnet | |

## Two sessions at once

When two people each run their own Claude session on Stage 2 together, they split the jobs by lane (page lane and viewer lane), with a model suggestion and a prompt to paste into each session. See `docs/TWO_SESSIONS.md`.

## Using agents

- Each person has their own Claude session. That is the main way work is divided.
- Inside a session, a helper agent is worth it only for a job in a different folder from the one you are working in. Give the helper the job's row, the files to read, and say which folder it may edit.
- Never point two agents at the same file. Never let a helper change the data model, `package.json` or `wxt.config.ts`.

## Merging

Merge into `main` at every checkpoint, about every three hours. After each merge, run `npm run compile`, `npm run check:theme` and `npm run build`, and load the extension in Chrome. The Stage 2 "done when" is a forest with annotations from two pages shown as a graph, with two nodes connected by hand.

## Rules that keep parallel work safe

- Talk to the data only through `lib/storage/`. If two jobs both need a new storage function, agree its name first.
- Colors, fonts and styles only through the theme tokens, so two people's work still looks like one product.
- Do not install packages, change `wxt.config.ts` or edit shared files such as `lib/theme/index.ts` without telling the user; those are the files most likely to clash.
- Merge at every checkpoint and make sure `main` still builds.
