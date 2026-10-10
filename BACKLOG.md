# Backlog: things to fix, things to add, open decisions

How to use this file:

- Add a new entry at the bottom of the right section. One entry per problem or idea.
- Give every entry a role tag (`[Engine]`, `[UI]`, `[Viewer]`, `[Data]`, `[All]`) and your name or initials.
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

### D6. Who has which role

- Page engine: (name). Hardest part, best for the most experienced coder.
- On-page UI and art: (name). Suits someone newer to coding.
- Viewer: (name)
- Data, AI and integration: (name)

Blocks: Setup.

## Needs fixing

Format:

```
### F1. Short title  [Role] (who found it)
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

## To add

Format:

```
### A1. Short title  [Role] (who suggested it)
- What:
- Why:
- Stage it would belong to:
```

### A1. Forest grid positions need a field in the data model  [Data] (agent)
- What: the `Forest` shape (id, name, icon, createdAt) has nowhere to save where a forest sits on the grid. Proposal: add optional `x` and `y` numbers.
- Why: Stage 2 lets the user drag forests around the grid and remembers where they were put.
- Stage it would belong to: Stage 2. Changing the data model needs the team's OK first.

### A2. Graph node positions need a field in the data model  [Viewer] (agent)
- What: the `Seed` shape has no place for where a node sits in the graph. Proposal: optional `graphX` and `graphY` numbers.
- Why: Stage 2 graph view. Without it nodes would jump to new places each time the forest opens.
- Stage it would belong to: Stage 2. Needs the team's OK.

### A3. Art still missing  [UI] (agent)
- Delivered in `images/` and now in use: sprout, tree (the grown sprout), lily pad, mushroom, flower, apple (stands in for the fruit sprout), shovel, frog sitting and jumping, and the extension icon (also resized to 16, 32 and 96 px for `public/icon/`).
- Still missing: the apple tree (grown fruit sprout, Stage 3), the animal marker for the scroll rail (Stage 2), the frog talking (Stage 3), and any dedicated forest icons (forests use the sprite art for now).
- How to add art: put the PNG in `images/` as `uncolored-<name>.png` (black outline, white fill, transparent background). Then name it in `lib/theme/index.ts`. The build crops the empty margin automatically.
- Stage it would belong to: animal marker Stage 2, the rest Stage 3.

### A5. Theme picker ("custom style" dropdown)  [UI] (user)
- What: a dropdown in the toolbar or a settings screen to choose a theme. The theme system is built (`docs/THEME.md`) and `Settings.theme` holds the choice, but there is only one theme, "Forest", so there is nothing to pick yet.
- Why: lets users restyle the whole product, and shows the theme system working.
- Stage it would belong to: Stage 2 or later, after a second theme exists.
- Also listed, with its dependencies, in `docs/DIVIDING_WORK.md`.

### A4. Growth from sprout to tree on page reload  [Data] (agent)
- What: the decision is made (see `PROGRESS.md` Stage 3 priority 2) but nothing builds it yet. A `growth` field already exists on every seed and starts at `sprout`.
- Why: it is the demo moment for growth.
- Stage it would belong to: Stage 3 priority 2.

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

- D1. Active recall, how the five-minute review works: decided (2026-10-10). `fruitsprout` is the fifth toolbar sprite. It grows into an apple tree after five minutes, not because of a correct answer, and stays an apple tree after its question. Its review is one question, separate from the lily pad quiz (lily pads of one color in one forest). Only the sprout and the fruit sprout grow; the lily pad, mushroom and flower never change. The one-question review is stored as a `Fruit` with a single question, so no new data type is needed.
- D2. Name of the general toolbar sprite: decided it is called "sprout" (2026-10-10). Growth has two stages, sprout then tree, and a sprout becomes a tree when the page is reloaded.
- D4. React and WXT, or the plain fallback: decided WXT with React (2026-10-10). The plain fallback is not used.
