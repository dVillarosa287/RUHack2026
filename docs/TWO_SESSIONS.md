# Two sessions at once (Stage 2)

Two people, each with their own Claude Code session, build Stage 2 at the same time. This file says who does what, which model to use, and gives the prompt to paste into each session. `docs/DIVIDING_WORK.md` has the full job table; this file only decides which jobs go to which session.

## The idea: split by folder

The two sessions never edit the same folder. One session owns the **page lane**, the other owns the **viewer lane**. Inside its lane a session can start as many helper agents as it likes, because everything they touch is already that session's.

| Lane | Folders (only this session edits them) | Reads only |
| --- | --- | --- |
| **Page lane** (Person 1) | `lib/engine/`, `lib/onpage-ui/` | `images/`, `lib/theme/`, `lib/storage/` |
| **Viewer lane** (Person 2) | `entrypoints/viewer/` | `images/`, `lib/theme/`, `lib/storage/` |

Not in either lane (ask the user first, or leave to the person who already has it):

- `lib/storage/`, `lib/theme/index.ts`, `package.json`, `wxt.config.ts`, `tsconfig.json`, and the data model. Changing these affects everyone.
- David's line boil (`lib/theme/SpriteIcon.tsx`) and Aryan's fonts (`lib/theme/themes.ts`, `lib/onpage-ui/toolbar.css`, `entrypoints/viewer/style.css`). The fonts job touches one CSS file in each lane, so expect small changes there. Pull from `main` often, and do not reformat those CSS files.
- The theme picker (BACKLOG A5) waits until a second theme exists.

## Jobs, in the order to do them

### Page lane

1. **Fix F2 and F3** (jump highlight stays yellow then fades; sprites centered on the mouse). Small, quick wins.
2. **Fix F4 together with drag-from-toolbar.** The selected sprite follows the cursor, and dragging a sprite from the toolbar and dropping it uses the same piece. One new hook in `lib/engine/` (`onDropSprite(type, clientX, clientY)`) and one new component in `lib/onpage-ui/`. This is the hard one.
3. **Recent sprites** on the toolbar (saved in `Settings.recentSprites`) and the **"Create new forest"** button (A7).
4. **Scroll rail** with a marker per seed, the animal (placeholder art), and the look from A8: a slim bar with sprites larger than the bar that stick out past it.
5. **Sprites on links**: stay on the page, store the destination.
6. Test the sturdier-anchoring items in Chrome and tick them.

### Viewer lane

1. **Graph view with large trees** (React Flow plus `d3-force`). The hardest job. The "Graph view" button goes in `ForestHeader`'s `actions`. Large trees: a page with 3 or more seeds in the forest gets a bigger tree node near its seeds with very subtle lines to them, worked out from the seeds each time (A6).
2. **Roots**: drag from one node to another.
3. **Folder sidebar** and folders, in the marked spot in `ForestView.tsx`.
4. **Forest grid**: drag forests and remember positions (`Forest.x`, `Forest.y`), choose icons, double-click to open.
5. **Text notes as nodes**, and the detail panel for a node.
6. **Settings screen** where the user pastes the Gemini key.

Done when both lanes are merged: a forest with annotations from two pages shows as a graph, and two nodes can be connected by hand.

## Models and effort

| Job | Model | Effort |
| --- | --- | --- |
| Most jobs: fixes, toolbar, rail, folder sidebar, grid, settings, notes | Sonnet 5.5 | medium |
| Graph view with large trees, and drag-from-toolbar with the cursor sprite | Opus 5.5 | high |
| Copying text between docs, renaming | Haiku 4.5 | low |

Start each session on Sonnet 5.5 (medium) with `/model`, and switch to Opus 5.5 (high) only for the two hard jobs. A session cannot switch its own model, but it can start helpers on any model, so it can also hand a hard job to an Opus helper. A helper starts with no memory, so only use one for a job in a different folder inside the lane.

## Keeping the two sessions from colliding

- **Claim first.** Before a job, write your name in "Taken by" in `docs/DIVIDING_WORK.md`, then push that change to `main` right away.
- **Own rows only.** Each session edits only its own jobs' rows in `DIVIDING_WORK.md` and writes its notes in the matching area's section of `PROGRESS.md` (page lane: "Page engine" and "On-page UI and art"; viewer lane: "Viewer"). That keeps merges clean. Add new bugs to the bottom of "Needs fixing" or "To add" in `BACKLOG.md`.
- **Need a storage function?** Do not add it. Tell the user; they agree the name with the other session first.
- **Merge** into `main` about every three hours. After each merge run `npm run compile`, `npm run check:theme` and `npm run build`, and load the extension in Chrome.

## The prompt

Paste this into each Claude Code session, with the lane block that fits. The one lane line is the only difference between the two.

**Lane block for Person 1:**

```
Your lane: PAGE LANE. You may edit lib/engine/ and lib/onpage-ui/. Your jobs, in order, are the "Page lane" list in docs/TWO_SESSIONS.md.
```

**Lane block for Person 2:**

```
Your lane: VIEWER LANE. You may edit entrypoints/viewer/. Your jobs, in order, are the "Viewer lane" list in docs/TWO_SESSIONS.md.
```

**Shared prompt:**

```
You are one of two Claude Code sessions building Stage 2 of the Forest Chrome extension at the same time. The other session is run by my teammate. I am new to coding: keep code simple, explain choices briefly, give exact commands.

[PASTE THE LANE BLOCK HERE]

Only edit files in your lane. Do not edit the other lane, lib/storage/, lib/theme/index.ts, package.json, wxt.config.ts or the data model. If a job needs one of those, stop and tell me.

First read CLAUDE.md, PROGRESS.md (every "Notes for other agents" section), BACKLOG.md ("Open decisions" and the items F2 to F4 and A6 to A8), docs/DIVIDING_WORK.md, docs/TWO_SESSIONS.md and docs/THEME.md. Read the docs/SPEC.md section for each job just before you build it.

Claim each job by writing my name in "Taken by" in docs/DIVIDING_WORK.md before starting it, then tell me to push that change to main. Work through your lane's jobs in the order given in docs/TWO_SESSIONS.md.

You may create as many helper agents as you want, of any model, whenever that is faster or better: Opus 5.5 for the hard jobs (the graph view with large trees, drag and drop), Sonnet 5.5 for ordinary jobs, Haiku 4.5 for mechanical ones. Start helpers in parallel only for jobs in different folders inside your lane, never point two at the same file, and give each helper its job row, the files to read, and the one folder it may edit. You stay responsible for the result, so check what each helper did.

Before you finish: run npm run compile and npm run check:theme, test on a real page such as Wikipedia, tick only what you tested, add your note to PROGRESS.md, and mark finished jobs Done in docs/DIVIDING_WORK.md. Never commit or push; tell me when something is ready to merge.
```
