# Work that can be divided

A list of jobs that can be handed to different people, or different helper agents, at the same time without getting in each other's way. `CLAUDE.md` links here. Keep it up to date as jobs are finished or added.

## How to divide a job

1. Pick a job from a table below. Check "Needs first": if it names something that is not done, do that first.
2. Give it to one person or one agent. One job stays inside one role's folders (the "Folder" column), so two jobs never edit the same file.
3. Jobs can run at the same time if they are in different lanes (see the Stage 2 plan). Two jobs in the same file are better done one after the other.
4. Whoever takes a job reads `CLAUDE.md`, the matching section of `docs/SPEC.md`, and `docs/THEME.md` if it has any styling. A helper agent starts with no memory of the conversation, so paste it the job's row and tell it which files to read.
5. Whoever finishes a job updates `PROGRESS.md` (checklist and note) as `CLAUDE.md` describes, and runs `npm run compile` and `npm run check:theme`.
6. If a job needs a change in another role's folder or in the data model, stop and ask the user. Do not do it quietly.

Sizes: S is under an hour, M is one to three hours, L is more than three. Models: see "Models and agents" in `CLAUDE.md`. "Larger" means Opus 5.5 or Fable 5.1.

## Stage 2 plan: who does what

### Step 0: foundation (one person, before anyone starts their lane)

These are the files and decisions everyone would otherwise collide on. Do them first, merge to `main`, then everyone branches from it.

| Step | Why it comes first |
| --- | --- |
| Team OK on `BACKLOG.md` A1 and A2 (optional `x`, `y` on `Forest`, optional `graphX`, `graphY` on `Seed`), then add them to `lib/storage/types.ts` | The grid and the graph both save positions. If two people each add their own field, the data model drifts. |
| `npm install @xyflow/react` (React Flow) and commit `package.json` and the lockfile | Two people installing packages on two branches means a lockfile conflict that is painful to merge. |
| Split `lib/onpage-ui/App.tsx` into small hooks (page seeds, painting, tools, jumping), so the Engine and UI lanes edit different files | Today it is one file both lanes would edit all day. |
| Split `entrypoints/viewer/ForestView.tsx` into a layout, the annotation list, and room for the sidebar, with routes `#/forest/<id>` (list), `#/forest/<id>/graph` and `#/settings` | The graph, the sidebar and the settings screen all start from this page. |

### The lanes

After step 0, each person works in their own folders. The agreed hand-offs are the "contract" column.

| Lane (role) | Folders | Jobs, in order | Contract with other lanes |
| --- | --- | --- | --- |
| **Page engine** | `lib/engine/` and the engine hooks in `lib/onpage-ui/` | 1. Drop a sprite onto the page (drag from the toolbar). 2. Sprites on links. 3. Check the sturdier anchoring items and tick them. | The toolbar calls `onDropSprite(type, clientX, clientY)`. The engine decides what to place. |
| **On-page UI and art** | `lib/onpage-ui/` components, `images/` | 1. Recent sprites (writes `Settings.recentSprites`). 2. Highlight sprite appears for a second, then fades. 3. Scroll rail with clickable markers. 4. The animal. 5. Drag source on toolbar buttons. | Calls `onDropSprite` (above). Needs the animal marker art (`BACKLOG.md` A3). |
| **Viewer: graph** | `entrypoints/viewer/` graph files | 1. Graph view with sprite nodes, opened from a "Graph view" button at the top right of the forest page. 2. Roots by dragging between nodes. 3. Text notes as nodes. 4. Detail panel. 5. Clicking a link sprite opens its destination. | Saves node positions in `graphX`, `graphY` (A2). Uses `<SpriteIcon type color grown />`. |
| **Data, AI and integration** (plus viewer pieces) | `lib/storage/`, `lib/theme/`, `lib/ai/`, and these viewer files: the forest grid, the folder sidebar, the settings screen | 1. Forest grid: drag, remember positions, choose icon, double-click to open (A1). 2. Folder sidebar and folders. 3. Settings screen for the Gemini key. 4. A second theme, then the custom style dropdown. 5. Create the Gemini key and write the model name in `BACKLOG.md` D5. | Grid and sidebar are separate files from the graph, so they do not clash. The sidebar goes in the layout from step 0. |

### Using agents

- Each person has their own Claude session. That is the main way work is divided.
- Inside a session, a helper agent is worth it only for a job in a different folder from what you are doing, such as the viewer person asking one helper to build the forest grid while they build the graph. Give the helper the job's row, the files to read, and say which folder it may edit.
- Never point two agents at the same file. Never let a helper change the data model, `package.json` or `wxt.config.ts`.
- Models: Sonnet 5.5 for most jobs. A larger model for the drop-to-page work, the graph layout, and anything that took a first attempt to get right. Haiku 4.5 for mechanical edits.

### Merging

Merge into `main` at every checkpoint, about every three hours. After each merge, run `npm run compile`, `npm run check:theme` and `npm run build`, and load the extension in Chrome. The Stage 2 "done when" is a forest with annotations from two pages shown as a graph, with two nodes connected by hand.

## Stage 2 jobs

| Job | Folder | Needs first | Size | Model |
| --- | --- | --- | --- | --- |
| **Custom style dropdown**: a menu in the toolbar (and viewer header) to choose a theme, saved in `Settings.theme` | `lib/onpage-ui/`, `entrypoints/viewer/` | A second theme (next row) | S | Sonnet |
| Second theme (same palette, different tokens, see `docs/THEME.md` "Adding a theme") | `lib/theme/` | nothing | S | Sonnet or Haiku |
| The animal marker art for the scroll rail (`BACKLOG.md` A3) | `images/` | nothing | S | not code |
| Drag a sprite from the toolbar and drop it on the page | `lib/engine/`, `lib/onpage-ui/` | Step 0 | L | Larger |
| Sprites on links: stay on the page, store the destination | `lib/engine/` | nothing | M | Sonnet |
| Recent sprites on the toolbar | `lib/onpage-ui/` | nothing | S | Sonnet |
| Highlight sprite appears, then fades | `lib/onpage-ui/` | nothing | S | Sonnet |
| Scroll rail with markers, and the animal | `lib/onpage-ui/` | the animal art | L | Sonnet |
| Forest grid: drag forests around, remember positions, choose icons, double-click to open | `entrypoints/viewer/`, `lib/storage/` | Step 0 (A1) | M | Sonnet |
| **Graph view** with sprite nodes (React Flow), opened by a "Graph view" button at the top right of the forest page | `entrypoints/viewer/` | Step 0 (A2, React Flow) | L | Larger |
| Roots: drag from one node to another | `entrypoints/viewer/` | Graph view | M | Sonnet |
| Folder sidebar and folders | `entrypoints/viewer/`, `lib/storage/` | Step 0 (layout) | M | Sonnet |
| Text notes as nodes, and the detail panel for a node | `entrypoints/viewer/` | Graph view | M | Sonnet |
| Settings screen where the user pastes their Gemini key | `entrypoints/viewer/` | Step 0 (route) | S | Sonnet |

Done already: sprites drawn as real art and tinted with palette colors (toolbar, markers, viewer), the theme system, markers that follow their text, toolbar drag, resize and top layer. They await a check in Chrome by a person.

## Stage 3 jobs

| Job | Folder | Needs first | Size | Model |
| --- | --- | --- | --- | --- |
| Sprout turns into a tree when the page is reloaded (sprout and fruit sprout only) | `lib/engine/`, `lib/storage/` | nothing | S | Sonnet |
| Fill-in-the-blank quiz questions, no AI needed | `lib/ai/` | nothing | S | Sonnet or Haiku |
| Gemini writes the questions: one request, JSON output, sent from the background worker | `lib/ai/`, `entrypoints/background.ts` | Gemini key and model name (`BACKLOG.md` D5) | M | Larger (prompt and JSON handling are fiddly) |
| Quiz screen with lily pads and the frog (art is in `images/`) | `entrypoints/viewer/` | Quiz questions | L | Sonnet |
| Fruit sprout: alarm after five minutes, grows into an apple tree, one question, stored as a `Fruit` with one question | `entrypoints/background.ts`, `lib/engine/` | The apple tree art | M | Larger (the alarm must survive the worker sleeping) |
| AI-suggested roots | `lib/ai/`, `entrypoints/viewer/` | Graph view, Gemini | M | Sonnet |
| Automatic same-site paths, with a switch | `entrypoints/viewer/` | Graph view | S | Sonnet |
| Frog summary bubble, read aloud | `lib/engine/`, `lib/onpage-ui/`, `lib/ai/` | Gemini, the frog talking art | M | Sonnet |
| Export a forest as JSON and Markdown, and import JSON | new `lib/export/` | nothing | M | Sonnet |

## Rules that keep parallel work safe

- Talk to the data only through `lib/storage/`. If two jobs both need a new storage function, agree its name first.
- Colors and styles only through the theme tokens, so two people's work still looks like one product.
- Do not install packages, change `wxt.config.ts` or edit shared files such as `lib/theme/index.ts` in a parallel job without telling the user; those are the files most likely to clash.
- Merge at every checkpoint and make sure `main` still builds.
