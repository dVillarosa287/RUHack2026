# Backlog: things to fix, things to add, open decisions

How to use this file:

- Add a new entry at the bottom of the right section. One entry per problem or idea.
- Give every entry an area tag (`[Engine]`, `[UI]`, `[Viewer]`, `[Data]`, `[All]`) and your name or initials. The tags are areas of the product, not people.
- When something is fixed or decided, move it to "Closed" at the bottom with one line on what was done. Do not delete it.
- Planned features live in `PROGRESS.md`. Future ideas live in `docs/SPEC.md` section 12. An idea moves here only when someone wants to build it during the hackathon.

## Open decisions (agents: ask the user, do not guess)

### D3. App name

A well-known focus-timer app is already called Forest. Pick a distinct name before submitting.

Blocks: write-up and extension name in Wrap-up.

### D5. Gemini model name

Use whichever Flash model Google AI Studio lists on the free tier on the day. The 2.0 models were shut down in June 2026 and the 2.5 models are reported to shut down in mid-October 2026.

Model chosen: (fill in)

Blocks: Stage 3 priority 1.

## Needs fixing

Format:

```
### F1. Short title  [Area] (who found it)
- What happens:
- What should happen:
- Page where it happens:
- Demo-blocking: yes / no
```

### F1. Viewer shows "This forest no longer exists" for a forest id typed in by hand  [Viewer] (agent)
- What happens: on a brand new install, opening `viewer.html#/forest/forest-default` before anything has asked for the forest list shows that message, because the default forest is only created the first time the forest list is read.
- What should happen: it opens the default forest.
- Page where it happens: the viewer, only when the address is typed by hand. The toolbar buttons and the forest grid always create it first.
- Demo-blocking: no

### F5. A marker can land on another copy of repeated text  [Engine] (agent)
- What happens: a marker's text anchor is the 8 characters under the click plus 32 characters either side. On a page where the same text appears several times (such as identical paragraphs), those can match more than one place, and the marker may be drawn at the wrong copy.
- What should happen: the marker stays on the copy that was clicked.
- Page where it happens: a test page with identical paragraphs; rare on real articles. Seen when testing sprites near the start of the repeated paragraphs.
- Demo-blocking: no

### F5. `npm run check:theme` always fails on Windows  [Data] (Roshan's agent)
- What happens: it reports the 8 palette codes in `lib/theme/themes.ts`, the one file allowed to have them. On Windows the path it builds is `lib\theme\themes.ts`, which does not match the allowed `lib/theme/themes.ts`. The same happens on an unchanged `main`.
- What should happen: it passes when only `themes.ts` has color codes. Fix in `scripts/check-theme.mjs`: compare `rel.replaceAll('\\', '/')` with the allowed list.
- Page where it happens: the command line, on Windows.
- Demo-blocking: no

## To add

Format:

```
### A1. Short title  [Area] (who suggested it)
- What:
- Why:
- Stage it would belong to:
```

### A3. Art still missing  [UI] (agent)
- Delivered in `images/` and now in use: sprout, tree (the grown sprout), lily pad, mushroom, flower, apple (stands in for the fruit sprout), shovel, frog sitting and jumping, and the extension icon (also resized to 16, 32 and 96 px for `public/icon/`).
- Still missing, and the artist is still drawing them: the animal marker for the scroll rail, the apple tree (grown fruit sprout) and the frog talking. The code uses a placeholder until they arrive (listed in `PROGRESS.md` under Stage 3). Also no dedicated forest icons (forests use the sprite art for now).
- How to add art: put the PNG in `images/` as `uncolored-<name>.png` (black outline, white fill, transparent background). Then name it in `lib/theme/index.ts`. The build crops the empty margin automatically.
- Stage it would belong to: waiting on the artist; tracked in Stage 3.

### A5. Theme picker ("custom style" dropdown)  [UI] (user)
- What: a dropdown in the toolbar or a settings screen to choose a theme. The theme system is built (`docs/THEME.md`) and `Settings.theme` holds the choice, but there is only one theme, "Forest", so there is nothing to pick yet.
- Why: lets users restyle the whole product, and shows the theme system working.
- Stage it would belong to: Stage 2 or later, after a second theme exists.
- Also listed, with its dependencies, in `docs/DIVIDING_WORK.md`.

### A4. Growth from sprout to tree on page reload  [Data] (agent)
- What: the decision is made (see `PROGRESS.md` Stage 3 priority 2) but nothing builds it yet. A `growth` field already exists on every seed and starts at `sprout`.
- Why: it is the demo moment for growth.
- Stage it would belong to: Stage 3 priority 2.

### A6. Large tree for a page with 3 or more seeds  [Viewer] (user)
- What: in the graph view, every web page that has 3 or more seeds in the forest gets a "large tree" node, placed fairly close to its seeds and joined to each by a very subtle line. Worked out from the seeds grouped by `url` each time the graph is drawn, not saved, so there is no data model change. Placeholder art: the `tree` sprite drawn larger.
- Why: shows at a glance which pages a forest is built from, and makes the graph look like a forest.
- Stage it would belong to: Stage 2, part of the graph view job.
- Open question: this assumes the large tree lives in the graph view. If the user meant something on the web page itself, ask before building.

## Known risks to test for

These are expected problems from SPEC section 6. Turn one into a "Needs fixing" entry when it shows up.

- Annotations landing in the wrong place after a window resize or a page change.
- Annotations not restoring on pages that load content as you scroll.
- One page saved under several URLs because of tracking parameters or the `#` part.
- A website's CSS changing the toolbar, or the toolbar's CSS breaking the site.
- The five-minute timer being lost because the background worker went to sleep.
- Gemini returning an error because the free tier's per-minute limit was reached.
- The toolbar not being clickable while a site's own modal dialog is open (the browser makes everything outside the dialog unclickable, though the toolbar stays visible above it).
- The extension not running on Chrome's own pages, the Chrome Web Store or the built-in PDF viewer.

## Closed

- F2. Jump highlight flashed for one second: fixed (2026-10-10). It now stays lit 2.5s and fades over 1.5s (`lib/engine/highlights.ts`); marker glow does the same in `toolbar.css`. Tested in Chromium; needs a check in Chrome.
- F3. Sprites landed off-center from the mouse: fixed (2026-10-10). Sprites are centered on the spot and text anchors use the middle of the line. Tested in Chromium; needs a check in Chrome.
- F4. Selected sprite did not follow the mouse: fixed (2026-10-10) with `CursorSprite`. Tested in Chromium; needs a check in Chrome.
- A7. "Create new forest" button: done (2026-10-10), replaced "+ New" in the toolbar. Tested in Chromium.
- A8. Rail sprites stick out past the bar: done (2026-10-10) in `ScrollRail`. Tested in Chromium.
- D6. Who has which role: there are no fixed roles; people just take jobs (2026-10-10). Jobs are claimed in `docs/DIVIDING_WORK.md`.
- A1. Forest grid positions: approved. `Forest` has optional `x` and `y`, added to `lib/storage/types.ts` (2026-10-10).
- A2. Graph node positions: approved. `Seed` has optional `graphX` and `graphY`. The graph spreads nodes out automatically once (d3-force), then keeps the positions the user gives them (2026-10-10).
- D1. Active recall, how the five-minute review works: decided (2026-10-10). `fruitsprout` is the fifth toolbar sprite. It grows into an apple tree after five minutes, not because of a correct answer, and stays an apple tree after its question. Its review is one question, separate from the lily pad quiz (lily pads of one color in one forest). Only the sprout and the fruit sprout grow; the lily pad, mushroom and flower never change. The one-question review is stored as a `Fruit` with a single question, so no new data type is needed.
- D2. Name of the general toolbar sprite: decided it is called "sprout" (2026-10-10). Growth has two stages, sprout then tree, and a sprout becomes a tree when the page is reloaded.
- D4. React and WXT, or the plain fallback: decided WXT with React (2026-10-10). The plain fallback is not used.
