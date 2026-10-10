# Progress

**Current stage: Setup (not started)**

How to use this file:

- Tick a box only after the item has been tested in Chrome on a real page.
- Tick only the items you did. There are no fixed roles; anyone takes any job (claim it in `docs/DIVIDING_WORK.md`). The tags say which area of the product an item is in: `[Engine]` page engine, `[UI]` on-page UI and art, `[Viewer]` viewer, `[Data]` data, AI and integration, `[All]` everyone.
- An item that is started but not finished stays unticked, with `(in progress: what is left)` added at the end of its line.
- When every box in a stage is ticked and its "Done when" check passes, a person (not an agent) updates "Current stage" above.
- Bugs and new ideas go in `BACKLOG.md`, not here.
- Agents: update this file at the end of every session. Tick your boxes and add a note under "Notes for other agents". The steps are in `CLAUDE.md` under "Before you finish, every session".

Hour ranges assume a 24-hour event. Scale them to the real schedule.

## Notes for other agents

Every agent adds one entry here at the end of every session, and reads all four sections at the start of every session.

- Write in the section for the area you worked in. Newest entry at the top.
- Four lines at most per entry. Leave out anything a teammate would not act on.
- Once a section has more than ten entries, delete the oldest ones that no longer matter. Git history keeps them.

Entry format:

```
- [day and time] (person's name)
  - Did: what was built or changed, and the files.
  - Others can use / need to know: new functions, files, fake data still in place, how to test it.
  - Need from someone else: what, and from whom. Write "nothing" if nothing.
```

### Page engine notes

- [Oct 10, 9:00 PM] (Teobobeo99)
  - Did: docs only. New placement fixes F2 (jump highlight stays yellow then fades), F3 (sprite centered on the mouse) and F4 (selected sprite follows the cursor) are in `BACKLOG.md` and ticked as items above; nothing is built.
  - Others can use / need to know: F4 and the drag-from-toolbar job should share one "sprite under the cursor" piece. Two people working Stage 2 together split by lane in `docs/TWO_SESSIONS.md`; the page lane is `lib/engine/` and `lib/onpage-ui/`.
  - Need from someone else: nothing

- [Oct 10, 8:00 PM] (Teobobeo99)
  - Did: moved the engine behavior out of `lib/onpage-ui/App.tsx` into two hooks in `lib/engine/`: `useSeedsOnPage` (draws highlights, jumps to a seed) and `usePlanting` (plant and shovel). Nothing changed in behavior; all browser tests pass.
  - Others can use / need to know: new engine features (drop a sprite, sprites on links) belong in new hooks here, not in `App.tsx`. The `Tool` type is now in `lib/engine/types.ts`.
  - Need from someone else: nothing

- [Oct 10, 7:00 PM] (Teobobeo99)
  - Did: markers are now drawn as the real sprite art, tinted with the seed's color. A marker's sprite stands on its anchor point (bottom middle), instead of being centered on it.
  - Others can use / need to know: `MarkerLayer` takes the seed's `growth`, so a seed with growth `tree` already shows the grown art.
  - Need from someone else: nothing

- [Oct 10, 6:00 PM] (Teobobeo99)
  - Did: pages now show only the current forest's seeds (filter in `lib/onpage-ui/App.tsx`).
  - Others can use / need to know: `getSeedsForUrl` still returns every forest's seeds on a page; filter by `forestId` as the app does.
  - Need from someone else: nothing

- [Oct 10, 5:00 PM] (Teobobeo99)
  - Did: markers now attach to the text under the click and are drawn from it every frame (`lib/engine/markers.ts`, `MarkerTracker`), so they follow scrolling, resizing and layout changes. Fixed markers drifting on Wikipedia.
  - Others can use / need to know: marker anchors hold a short quote, the nearest element and the scroll percentage, tried in that order. `buildPointAnchor` and `resolvePoint` are gone; use `buildMarkerAnchor` and `MarkerTracker`.
  - Need from someone else: nothing

- [Oct 10, 4:00 PM] (Teobobeo99)
  - Did: `lib/engine/` (anchors, highlights with the CSS Custom Highlight API, mouse capture, scrolling).
  - Others can use / need to know: highlights restore by quote plus nearby words, with a retry for pages that load late. Markers use nearest element plus offset. Double or triple clicks never place a marker. Not built yet: growth on reload, sturdier anchoring.
  - Need from someone else: nothing

### On-page UI and art notes

- [Oct 10, 9:00 PM] (Teobobeo99)
  - Did: docs only. Added the "Create new forest" button (A7) and the scroll rail look (A8: slim bar, sprites bigger than the bar and sticking out) to the Stage 2 checklist and `docs/SPEC.md`; nothing is built.
  - Others can use / need to know: the rail overhang is intentional, keep the bar slim. The existing small "+ New" in `lib/onpage-ui/Toolbar.tsx` is what the new button replaces.
  - Need from someone else: nothing

- [Oct 10, 8:00 PM] (Teobobeo99)
  - Did: `App.tsx` is now 90 lines that put the pieces together. Reading from storage is in `usePageData.ts`.
  - Others can use / need to know: new UI (recent sprites, scroll rail, theme picker) goes in new components or in `Toolbar.tsx`, not in `App.tsx`.
  - Need from someone else: the artist's animal marker, apple tree and frog talking (Stage 3 section above).

- [Oct 10, 7:00 PM] (Teobobeo99)
  - Did: the toolbar, markers, viewer and forest icons now use the art in `images/` instead of emoji. Sprites are tinted with a palette color (`SpriteIcon color`). The toolbar's sprites show the currently chosen color.
  - Others can use / need to know: art goes in `images/` as `uncolored-<name>.png`, then is named in `lib/theme/index.ts`; the build crops its margin. Emoji only appear if an image is missing. Still to draw: the apple tree and the animal marker (`BACKLOG.md` A3).
  - Need from someone else: nothing

- [Oct 10, 6:00 PM] (Teobobeo99)
  - Did: toolbar is drawn in the browser's top layer (`lib/onpage-ui/topLayer.ts`, `keepOnTop`), and can be resized from its bottom-left corner (saved as `scale`).
  - Others can use / need to know: it draws over page pop-ups and modal dialogs. While a site's modal is open the browser makes everything outside it unclickable, so the toolbar is visible but not clickable then.
  - Need from someone else: nothing

- [Oct 10, 5:00 PM] (Teobobeo99)
  - Did: toolbar moved to top right, draggable from any blank spot, with a close button. It stays open in every tab until closed (saved with the storage module). Markers can be dragged to a new spot. All styling now uses theme tokens.
  - Others can use / need to know: `images/` holds uncolored line art (sprout, tree, mushroom, icons) that is not wired in yet; see `docs/THEME.md` "Tinting art". Colors: only `var(--fo-...)` tokens, run `npm run check:theme`.
  - Need from someone else: nothing

- [Oct 10, 4:00 PM] (Teobobeo99)
  - Did: `lib/onpage-ui/` (toolbar, marker layer, app) and `entrypoints/content/`. Toolbar shows when the Chrome icon is clicked; Esc puts the tool down. Shovel tool removes highlights and markers.
  - Others can use / need to know: all five sprites are in the toolbar with emoji stand-ins. To use real art, put the file in `public/sprites/` and set `image` in `lib/theme/index.ts`. Test by reloading the page after loading the extension.
  - Need from someone else: sprite art (see the art list in `BACKLOG.md` A3).

### Viewer notes

- [Oct 10, 9:00 PM] (Teobobeo99)
  - Did: docs only. Added the "large tree" idea (A6) to `docs/SPEC.md`, `BACKLOG.md`, the Stage 2 checklist and the graph view row in `docs/DIVIDING_WORK.md`; nothing is built.
  - Others can use / need to know: group the forest's seeds by `url`; for each url with 3 or more seeds draw a larger `tree` node near them with subtle lines. It is worked out each time, not stored, so no data model change. Assumed to live in the graph view only; ask the user if unsure.
  - Need from someone else: nothing
- [Oct 10, 8:00 PM] (Teobobeo99)
  - Did: split the viewer. `route.ts` lists the pages (`#/forest/<id>/graph` and `#/settings` are placeholders). `ForestView` is only the layout, with `ForestHeader` (room for buttons on the right) and `ForestList`.
  - Others can use / need to know: the "Graph view" button goes in `ForestHeader`'s `actions` in `ForestView`; the folder sidebar goes in the marked spot in `ForestView`. `@xyflow/react` and `d3-force` are installed. `Forest.x/y` and `Seed.graphX/graphY` exist.
  - Need from someone else: nothing

- [Oct 10, 7:00 PM] (Teobobeo99)
  - Did: viewer header, forest titles, forest grid and seed rows use `ForestIcon` and the tinted `SpriteIcon`.
  - Others can use / need to know: for graph nodes use `<SpriteIcon type color grown />` from `lib/theme/SpriteIcon`. Forest icons are art ids such as `tree`; older forests may hold an emoji, which `ForestIcon` still shows.
  - Need from someone else: nothing

- [Oct 10, 6:00 PM] (Teobobeo99)
  - Did: "Open on page" now makes the seed's forest the current one, so the seed shows on the page.
  - Others can use / need to know: planned for Stage 2, a "Graph view" button at the top right of the forest page opens the graph (`docs/SPEC.md` section 4).
  - Need from someone else: nothing

- [Oct 10, 5:00 PM] (Teobobeo99)
  - Did: restyled the viewer with theme tokens (Tailwind color names now come from the theme; stock Tailwind colors are switched off).
  - Others can use / need to know: use `bg-surface`, `text-ink`, `border-edge`, `bg-primary-soft` and so on. A class like `bg-red-100` does nothing now. The list is in `entrypoints/viewer/style.css`.
  - Need from someone else: nothing

- [Oct 10, 4:00 PM] (Teobobeo99)
  - Did: `entrypoints/viewer/` (forest grid, forest page with annotations grouped by web page, open on page, shovel to delete). Addresses are `viewer.html` and `viewer.html#/forest/<id>`.
  - Others can use / need to know: "Open on page" opens a new window and scrolls to the annotation using `setPendingJump`. Tailwind colors are in `entrypoints/viewer/style.css`.
  - Need from someone else: nothing

### Data, AI and integration notes

- [Oct 10, 8:00 PM] (Teobobeo99)
  - Did: added optional `x`, `y` to `Forest` and `graphX`, `graphY` to `Seed` (approved), installed `@xyflow/react`, `d3-force` and `@types/d3-force`. No fixed roles now; jobs are claimed in `docs/DIVIDING_WORK.md`.
  - Others can use / need to know: David is adding line boil and Aryan is doing fonts (listed in `docs/DIVIDING_WORK.md`). Notes for both are in `docs/THEME.md`. The graph spreads nodes out once, then keeps the user's positions.
  - Need from someone else: nothing

- [Oct 10, 7:00 PM] (Teobobeo99)
  - Did: art pipeline: `wxt.config.ts` copies `images/` into the extension and `scripts/trim-art.ts` crops the empty margin (the originals are untouched). Extension icons replaced with the delivered icon. Closed D1 in `BACKLOG.md`.
  - Others can use / need to know: the default forest icon is now `tree` (an art id). The one-question fruit review will be stored as a `Fruit` with a single question. Stage 2 plan for splitting work is in `docs/DIVIDING_WORK.md`.
  - Need from someone else: team OK on `BACKLOG.md` A1 and A2 (new optional position fields) before Stage 2 viewer work.

- [Oct 10, 6:00 PM] (Teobobeo99)
  - Did: added `scale` to the saved toolbar state, and the new `docs/DIVIDING_WORK.md` (jobs that can be handed out in parallel).
  - Others can use / need to know: the custom style dropdown is listed there and in `BACKLOG.md` A5.
  - Need from someone else: nothing

- [Oct 10, 5:00 PM] (Teobobeo99)
  - Did: theme system (`lib/theme/themes.ts`, `apply.ts`, `docs/THEME.md`, `scripts/check-theme.mjs`) and a dark forest look from the palette. Added `getToolbarState` and `updateToolbarState` to the storage module (open or closed, and position, shared by every tab). The Chrome icon now toggles that saved state.
  - Others can use / need to know: the user's choice of theme is `Settings.theme` and `watchTheme` applies it. The dropdown to choose a theme is not built (`BACKLOG.md` A5). Highlights and shadows use see-through palette colors, the one exception in `docs/THEME.md`.
  - Need from someone else: nothing

- [Oct 10, 4:00 PM] (Teobobeo99)
  - Did: WXT, React, TypeScript and Tailwind scaffold; manifest; placeholder icon (green circle); `lib/storage/`; `lib/theme/`; `entrypoints/background.ts`; fixed `.gitignore`. Storage is real `chrome.storage.local` with one key per record, and every function in the agreed list exists.
  - Others can use / need to know: import everything from `@/lib/storage`. Extras beyond the agreed list: `onDataChanged`, `setPendingJump`, `takePendingJump`. The default forest "My First Forest" appears automatically. Sprite types are `sprout`, `lilypad`, `mushroom`, `flower`, `fruitsprout`; growth is `sprout` or `tree`. Still undone: Gemini key and model name (D5), `lib/ai/` is empty.
  - Need from someone else: nothing

## Setup (first 30 to 45 minutes)

- [x] [All] Roles assigned to people (decided: there are no fixed roles, anyone takes any job; see `docs/DIVIDING_WORK.md`)
- [ ] [All] Data model and storage function names agreed (`CLAUDE.md`, Data model)
- [ ] [All] Open decisions in `BACKLOG.md` reviewed
- [ ] [Data] GitHub repo created, everyone has access, one branch per person
- [ ] [Data] WXT project scaffolded with React, TypeScript and Tailwind (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [Data] Manifest permissions set: storage, alarms, access to web pages (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [Data] Extension icon added (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [Data] Theme system: one palette, themes chosen in settings, every style from theme tokens, `npm run check:theme` passes (`docs/THEME.md`) (in progress: built and tested by the agent in Chromium on local and Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [Data] Storage module written with fake data so the other three can build against it (in progress: written against real `chrome.storage.local` from the start, with no fake data, because one person built every role in this session; waiting for a check in Chrome)
- [ ] [All] Everyone can run the project and sees the extension load in Chrome
- [ ] [All] Two or three demo pages picked (Wikipedia, OpenStax)
- [ ] [Data] Gemini API key created in Google AI Studio and the current Flash model name written into `BACKLOG.md` D5

## Stage 1: Annotation, saving and a separate viewer (hours 0 to 8)

Goal: the core loop works from start to finish with plain visuals.

### Page engine

- [ ] [Engine] Capture the selected text on a page (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [Engine] Highlight the selection in the chosen color (CSS Custom Highlight API) (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [Engine] Click anywhere on the page to place a plain marker (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [Engine] Build an anchor for each annotation (quoted text with surrounding words) (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [Engine] Save each annotation as a seed through the storage module (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [Engine] Restore every saved annotation when the page loads again (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [Engine] Markers stay attached to their text through scrolling, resizing and layout changes, and can be dragged to a new spot (in progress: built and tested by the agent in Chromium on local and Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [Engine] Only the current forest's seeds are shown on a page (in progress: built and tested by the agent in Chromium on local and Wikipedia pages, still needs a check in Chrome by a person)

### On-page UI and art

- [ ] [UI] Basic toolbar appears on a web page, inside a Shadow DOM (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [UI] Current forest's name shown above the toolbar (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [UI] Switch forests from the toolbar (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [UI] Create a new forest from the toolbar (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [UI] "Current Forest" button opens the forest you are in, in a new tab (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [UI] "View Forests" button opens all forests, in a new tab (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [UI] Toolbar opens top right, can be dragged, and stays open in the same place in every tab until the user closes it (in progress: built and tested by the agent in Chromium on local and Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [UI] Toolbar can be resized, and is drawn above everything on a page, including site pop-ups (in progress: built and tested by the agent in Chromium on local and Wikipedia pages, still needs a check in Chrome by a person)

### Viewer

- [ ] [Viewer] Viewer page exists as a full-tab page inside the extension (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [Viewer] Forests shown in a tidy grid (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [Viewer] Opening a forest shows its contents (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [Viewer] List of every annotation in a forest, grouped by web page (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [Viewer] Each annotation links back to its page, which opens in another window (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)

### Data, AI and integration

- [ ] [Data] Storage functions working against real `chrome.storage.local`: forests, seeds by URL, seeds by forest, settings (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [Data] URL cleaning helper (strip tracking parameters and the `#` part) (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [Data] Annotations save per web page (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [ ] [Data] All four branches merged into main, and main still runs

**Done when:** a teammate can highlight three things on a Wikipedia article, close the tab, reopen it and see them, then find all three in the viewer.

## Stage 2: Sprites (hours 8 to 16)

Goal: it looks and feels like a forest.

### Foundation (done before the jobs below start)

- [ ] [All] Stage 2 foundation: optional position fields on `Forest` and `Seed`, React Flow and d3-force installed, `App.tsx` and the viewer's `ForestView.tsx` split into small files, viewer routes for the graph and settings (in progress: built and tested by the agent in Chromium, still needs a check in Chrome and a merge to `main` before anyone starts a job)

### Page engine

- [ ] [Engine] Placed sprites render as real sprites at their saved locations (in progress: built and tested by the agent in Chromium on local and Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [Engine] Drag a sprite from the toolbar and drop it on the page
- [ ] [Engine] Sprite on a link: user stays on the same tab, the sprite stores the link's destination
- [ ] [Engine] Sturdier anchoring: nearest element with an offset, scroll percentage as the last resort (in progress: markers already use text, then element, then scroll percentage, tested on Wikipedia; a person needs to check it in Chrome)
- [ ] [Engine] Fix F2: when you jump to a seed, its highlight turns yellow, stays yellow for a while, then fades smoothly (`BACKLOG.md` F2)
- [ ] [Engine] Fix F3: a placed sprite is centered on the mouse (`BACKLOG.md` F3)
- [ ] [UI] Fix F4: the selected sprite follows the mouse, on top of the cursor, like it is being dragged (`BACKLOG.md` F4)

### On-page UI and art

- [ ] [UI] Rectangular toolbar with the sprite icons (sprout, lily pad, mushroom, flower, apple tree) (in progress: toolbar shows all five sprites as real art, tinted in the chosen color; the final look is still to do, and a person needs to check it in Chrome)
- [ ] [UI] The three most recently used sprites shown on the toolbar
- [ ] [UI] Color palette under the toolbar (in progress: the eight colors are on the toolbar and work; styling is basic)
- [ ] [UI] On highlight, the sprite appears at the highlight for about a second, then fades
- [ ] [UI] "Create new forest" button on the toolbar, clearly labelled (today a small "+ New"; `BACKLOG.md` A7)
- [ ] [UI] Scroll rail on the right edge with a marker for every annotation on the page; a slim bar whose sprites are larger than the bar and stick out past it (`BACKLOG.md` A8)
- [ ] [UI] Clicking a rail marker scrolls to that annotation
- [ ] [UI] The animal: the rail saves where you were before the jump, and clicking it takes you back (use a placeholder until the artist's animal art arrives, see Stage 3)
- [ ] [UI] Sprite art for each sprite type (in progress: sprout, tree, lily pad, mushroom, flower, apple and shovel are in; the apple tree and the animal marker are not drawn yet)
- [ ] [UI] Forest icons (in progress: forests use the sprite art as their icon; no dedicated forest art, and the user cannot choose one yet)
- [ ] [UI] Forest color palette (greens and browns) (in progress: covered by the theme system, `docs/THEME.md`; a person needs to check it in Chrome)
- [ ] [UI] Theme picker (the "custom style" dropdown), see `BACKLOG.md` A5
- [ ] [UI] Sprites tinted with the palette colors (line art from `images/`, see `docs/THEME.md`) (in progress: built and tested by the agent in Chromium on local and Wikipedia pages, still needs a check in Chrome by a person)

### Viewer

- [ ] [Viewer] Forests can be dragged around the grid, and positions are remembered
- [ ] [Viewer] User can choose each forest's icon
- [ ] [Viewer] Double-click a forest to open it
- [ ] [Viewer] Graph view: every annotation is a sprite node (React Flow), opened by a "Graph view" button at the top right of the forest page; nodes spread out automatically once (d3-force), then keep the positions the user gives them
- [ ] [Viewer] Large trees in the graph: a web page with 3 or more seeds in the forest gets a bigger tree node near its seeds, joined to them by very subtle lines; worked out from the seeds, not saved (`BACKLOG.md` A6)
- [ ] [Viewer] Roots: drag from one node to another to connect them
- [ ] [Viewer] Left sidebar with the folders inside the forest
- [ ] [Viewer] Text notes as nodes not tied to a web page, using the same sprites
- [ ] [Viewer] Detail panel for a selected node
- [ ] [Viewer] Clicking a link sprite opens the link's destination

### Data, AI and integration

- [ ] [Data] One theme file that all sprites and colors load from (in progress: `lib/theme/` holds the palette, the art lookup and the tinting components; there is no theme picker yet)
- [ ] [Data] Storage for roots, folders, forest icons and grid positions (in progress: roots, folders and forest icons have functions, untested; grid positions need a data model change, see `BACKLOG.md` A1)
- [ ] [Data] Recent sprites saved in settings
- [ ] [Data] Settings screen where the user pastes their Gemini key
- [ ] [Data] All four branches merged into main, and main still runs

**Done when:** a forest with annotations from two different pages shows as a graph, and two nodes can be connected by hand.

## Stage 3: Quizzes, animation and quality of life (hours 16 to 21)

Goal: the features that win the demo. Build in priority order and stop wherever time runs out. Each priority works without the ones after it.

### Priority 1: Lily pad quiz

- [ ] [Data] Gemini writes the questions: one request per quiz, JSON output, sent from the background worker
- [ ] [Data] Fill-in-the-blank fallback that needs no AI
- [ ] [Data] Lily pad seeds of the same color in the same forest form one quiz (a fruit)
- [ ] [Viewer] Quiz screen: lily pads in a row
- [ ] [UI] Frog art (sitting, jumping, talking) and the hop animation from pad to pad
- [ ] [UI] Notice in the UI that AI features send saved text to Google

### Priority 2: Growth

- [ ] [Data] A sprout becomes a tree when the user reloads the page (correct answers do not change anything)
- [ ] [UI] Sprout and fruit sprout each drawn in two growth stages (sprout and tree)
- [ ] [Viewer] Graph nodes show their growth stage

### Priority 3: Fruit sprout five-minute review (see `BACKLOG.md` D1)

- [ ] [Data] Alarm set with `chrome.alarms` five minutes after planting
- [ ] [Engine] Review prompt appears on the page
- [ ] [Data] 30-second demo setting so judges can see it

### Priority 4: Connections

- [ ] [Data] AI-suggested roots: send one forest's nodes to Gemini, get pairs with a reason each
- [ ] [Viewer] Suggested roots shown in the graph for the user to accept or reject
- [ ] [Viewer] Automatic paths between nodes from the same page or site, drawn dashed
- [ ] [Viewer] Switch to turn automatic paths off

### Priority 5: Frog summaries

- [ ] [Engine] Frog summary bubble on a highlight, when the user asks for it
- [ ] [Data] Summary request to Gemini
- [ ] [UI] Frog reads the summary aloud with the browser's built-in voice
- [ ] [Data] ElevenLabs voice as the upgrade

### Priority 6: Export

- [ ] [Data] Save a forest as a JSON file
- [ ] [Data] Load a forest back in from a JSON file
- [ ] [Data] Markdown export

### Art from the artist (waiting)

- [ ] [UI] Real art for the animal marker, the apple tree and the frog talking (waiting: the artist is still drawing them; code uses placeholders until then)

### Priority 7: Images and polish

- [ ] [Viewer] Image nodes
- [ ] [UI] Visual polish

**Done when:** the full demo script runs twice in a row without a failure.

## Wrap-up (hours 21 to 24)

- [ ] [All] Feature freeze three hours before the deadline
- [ ] [All] Bugs in `BACKLOG.md` marked demo-blocking are fixed
- [ ] [All] Demo script rehearsed on the chosen demo pages
- [ ] [Data] Backup screen recording of the demo
- [ ] [Data] Project write-up submitted
- [ ] [All] Distinct app name chosen (`BACKLOG.md` D3)
- [ ] [All] HackRU prize list checked for Gemini and ElevenLabs categories
