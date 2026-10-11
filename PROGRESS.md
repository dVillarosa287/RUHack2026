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

- [Oct 11] (Teobobeo99)
  - Did: scanned PDFs (e.g. Principia Mathematica) showed only the first pages, then white. Two causes, both fixed in `entrypoints/pdf/main.ts`: (1) PDF.js had no `wasmUrl`/`cMapUrl`/`standardFontDataUrl`/`iccUrl`, so JBIG2 and JPEG 2000 page pictures (common in scans) stayed blank; `wxt.config.ts` now copies `node_modules/pdfjs-dist/{wasm,cmaps,standard_fonts,iccs}` to `pdfjs/` and the manifest CSP allows `'wasm-unsafe-eval'` for extension pages. (2) Every drawn page canvas was kept forever (1,035 MB after scrolling a 200-page scan); now pages are drawn one at a time when near the screen and cleared when far (21 MB), capped at 4 million pixels each.
  - Others can use / need to know: a page PDF.js can't draw now says so instead of staying blank. Scanned pages have no text, so they can't be highlighted (sprites by click and screenshots work); OCR is in `BACKLOG.md`. Tested in Chromium with pdf.js's JBIG2/JPX test files and a 200-page picture-only book; text PDFs 16/16.
  - Need from someone else: a person to open the real Principia PDF in Chrome.

- [Oct 11] (Teobobeo99)
  - Did: fixed PDFs opening by themselves from Google search. Search preloads top results ("prerendering") in a hidden tab, and `entrypoints/pdf/redirect.ts` redirected on that background load. Now it only redirects when `tabs.get` shows a real tab whose `url`/`pendingUrl` is that PDF; otherwise it remembers the PDF and redirects on `tabs.onUpdated` once the user clicks through.
  - Others can use / need to know: Chrome reports the preload as `documentLifecycle: "active"` with its own tab id, so lifecycle alone is not enough. Tested in Chromium with a speculation-rules page (stays put; click opens our PDF page) and the PDF suite (16/16).
  - Need from someone else: a person to try a Google search for a PDF in real Chrome.

- [Oct 11] (Teobobeo99)
  - Did: (1) PDFs: `entrypoints/pdf/` (PDF.js page with a text layer that mounts the same `App`), `entrypoints/pdf/redirect.ts` (background sends `application/pdf` tabs there via `webRequest`), `lib/engine/pageUrl.ts` (`pageUrl()`, `openableUrl()`). (2) Screenshots: dragging a box over no text captures it (`lib/engine/screenshot.ts`, `capture.ts` `onArea`, background `forest:capture-tab`, storage `saveScreenshot`/`getScreenshot`, viewer `Screenshot.tsx`). (3) Scroll lag: markers and note cards are `position: absolute` in page coordinates (`MarkerLayer.tsx`, `SeedNote.tsx`, `toolbar.css`), so they scroll with the text in the same frame; the rAF loop only handles layout changes.
  - Others can use / need to know: use `pageUrl()` instead of `window.location.href`. New permissions `webRequest`, `unlimitedStorage`; new record `shot:<id>` (`BACKLOG.md` D8). Moving a screenshot's sprite keeps its text. Tested in Chromium: PDF 16/16, screenshots 19/19, scroll 28/28 (lag measured 0 px spread, was 18 px every other frame).
  - Need from someone else: a person to try PDFs and screenshots in real Chrome.

- [Oct 11, 6:00 AM] (Teobobeo99)
  - Did: removed the lily pad screenshot feature (user's request): `lib/engine/screenshot.ts`, `Screenshot.tsx`, `saveScreenshot`/`getScreenshot`, the `forest:capture-tab` message and `unlimitedStorage` are gone, and Gemini is text-only again. The lily pad now only highlights text: `usePlanting` ignores clicks with it and says "Lily pads go on text". The toolbar order and the "Quiz generation" tip stay.
  - Others can use / need to know: the note below (5:30 AM) is out of date. Any `media` lily pads made while testing screenshots are no longer drawn on pages. Tested in Chromium on Wikipedia.
  - Need from someone else: a person to check it in Chrome.

- [Oct 11, 5:30 AM] (Teobobeo99)
  - Did: the lily pad is now a screenshot tool (user's request). `lib/engine/screenshot.ts`: `startAreaSelect` (drag a box), `textInArea` (visible page text inside it), `captureArea` (asks the background worker for `captureVisibleTab`, crops to the box, JPEG at most 1000px wide). `usePlanting` uses it when the sprite is `lilypad`: hides our UI, captures, saves a `media` seed with the marker at the box's top-left corner, then `saveScreenshot`. Lily pad markers cannot be dragged (`MarkerLayer`). Toolbar order is sprout, apple, mushroom, flower, lily pad, shovel, with a "Quiz generation" tip on the lily pad.
  - Others can use / need to know: `getScreenshot(seedId)` from `@/lib/storage`; the viewer's `Screenshot` component shows one. Gemini now gets each lily pad's image plus its text. New permission `unlimitedStorage`; new record `shot:<id>` (`BACKLOG.md` D7, tell the team). Old lily pad highlights still work in quizzes. Tested in Chromium on Wikipedia with a stand-in for Gemini.
  - Need from someone else: a person to try it in Chrome with the real key, and the team to OK D7.

- [Oct 10, 10:15 PM] (GitHub Copilot)
  - Did: added guarded page keybinds in `lib/onpage-ui/App.tsx`: `1`-`5` select the visible sprite hotbar slots, Escape puts the tool down, minus/plus resize markers, and Ctrl/Cmd+Z plus Ctrl/Cmd+Shift+Z undo/redo seed create, delete and move actions. Marker rendering accepts the live size in `MarkerLayer.tsx`; seed restoration lives in `lib/storage/index.ts`.
  - Others can use / need to know: keybinds return immediately for input, textarea, select and contenteditable targets, so websites in editing mode keep their shortcuts. `npm run compile`, `npm run build`, and `npm run check:theme` pass.
  - Need from someone else: test shortcuts in Chrome on a normal page and in an editable site such as Google Docs.

- [Oct 10, 11:00 PM] (Teobobeo99)
  - Did: F2 (jump highlight holds 2.5s, fades over 1.5s: `flashHighlight`, `JUMP_HIGHLIGHT_MS`), F3 (sprites centered on the mouse: `MarkerTracker` returns the middle of the text line), drop from toolbar (`useDropSprite`, `placeMarker`), sprites on links (`placeMarker` saves `kind: 'link'` with `linkTarget`), `jumpToSeed` from `useSeedsOnPage`.
  - Others can use / need to know: both a click and a drop go through `placeMarker` (`lib/engine/placeMarker.ts`). Link seeds are drawn as markers like `sprite` ones. Tested only in Chromium with Playwright, not in Chrome.
  - Need from someone else: viewer lane: a `link` seed has `linkTarget`; the viewer item "Clicking a link sprite opens the link's destination" can use it. A person to check all of this in Chrome.

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

- [Oct 11] (Teobobeo99)
  - Did: frogs on the page (`lib/onpage-ui/PondFrog.tsx`, `.fo-pond-frog` in `toolbar.css`, one line in `App.tsx`). With a lily pad on screen, a frog sometimes jumps in from off screen and sits on it, and may hop to another lily pad within 450px. It reads each pad's spot from its `.fo-marker[data-seed-id]` every frame, so it works with markers `fixed` or `absolute`. The frog has the same line boil as the markers (`createLineBoil`).
  - Others can use / need to know: the chances and timings are constants at the top of `PondFrog.tsx` (raise `ARRIVE_CHANCE` for a demo). Off in Minimal and with reduced motion. Tested in Chromium with the chances at 100% (arrive, sit, hop both ways, never to a far pad, follows scroll, boil frames change). `npm run compile`, `build` and `check:theme` pass.
  - Need from someone else: a person to check it in Chrome.

- [Oct 11] (Teobobeo99)
  - Did: the toolbar's forest drop-down is now our own themed list (`lib/onpage-ui/ForestPicker.tsx`, styles `.fo-picker-*` in `toolbar.css`) instead of a native `<select>`, whose open list the browser drew in its own colors. Each row shows the forest's icon, the current one has a check, "+ Create new forest" is last. Click outside or Esc closes it; arrow keys, Home, End and Enter work; it opens upward near the bottom of the window.
  - Others can use / need to know: `ForestPicker` takes `forests`, `currentForestId`, `onSwitchForest`, `onCreateNew`; it could be reused for the theme picker (A5). Tested in Chromium on Wikipedia in all four themes. `npm run compile` fails only in the new, untracked `entrypoints/pdf/redirect.ts` (not this change).
  - Need from someone else: a person to check it in Chrome.

- [Oct 11] (Teobobeo99)
  - Did: (1) sprites planted at a non-1 size were off by (19·(s−1), 38·(s−1)) px because `.fo-marker` and `.fo-cursor-sprite` in `toolbar.css` had a fixed 38px box and fixed margins; they now size to the sprite and use `translate: -50% -100%` / `0 -100%`, so planted, dragged and highlight sprites sit exactly right at every size. (2) The sapling was off-center in its toolbar button: `images/sprout.png` has a stray pixel in a corner that stretched the build's crop; `scripts/trim-art.ts` now ignores tiny specks, and `SpriteIcon` uses `object-fit: contain`.
  - Others can use / need to know: measured in Chromium at 0.5, 1, 1.3 and 2 (all (0, 0) from the click). The note card and line-boil filter now follow the real sprite size too.
  - Need from someone else: nothing.

- [Oct 11] (Teobobeo99)
  - Did: - and + now size only the sprite on the mouse (the one about to be planted), not every sprite on the page (user's request). `App.tsx` `plantScale` goes to `CursorSprite`, `usePlanting`, `useDropSprite` and `placeMarker`, which save it as the new optional `Seed.scale`; `MarkerLayer` draws each sprite at `seed.scale ?? 1`. The status line says "Sprite size 130%".
  - Others can use / need to know: with no sprite picked, - and + go to the website. The size stays for the next plantings until changed. Tested in Chromium (10 checks, incl. reload).
  - Need from someone else: the team to confirm `Seed.scale` (`BACKLOG.md` D8).

- [Oct 11] (Teobobeo99)
  - Did: house sprite (toolbar's empty cell); the toolbar layout and hotbar now live in `lib/onpage-ui/hotbar.ts` (shared with `useKeybinds.ts`); each button shows its key number. Shortcuts moved to `lib/onpage-ui/useKeybinds.ts`: they only run while the toolbar is open, Ctrl+Z only takes the key when there is something to undo, and `isTypingInPage` skips everything in inputs, contenteditable, role=textbox, iframes (Google Docs) and designMode. `lib/engine/highlights.ts` recolors highlights live when the theme changes.
  - Others can use / need to know: keys are 1 sprout, 2 mushroom, 3 house, 4 flower, 5 lily pad, 6 cat, 7 grass, 8 owl, 9 rock, 0 apple. Toolbar `aria-label`s stay English; the themed name is in `title`. Tested in Chromium (25 checks).
  - Need from someone else: a person to try the shortcuts on Google Docs in Chrome.

- [Oct 11] (Teobobeo99)
  - Did: your own note on a seed. New `lib/onpage-ui/SeedNote.tsx` (`NoteEditor`, `NoteTooltip`); `App.tsx` opens the box after planting and saves through undo history; `MarkerLayer.tsx` adds `data-seed-id`, hover and click-to-edit; styles `.fo-note*` in `toolbar.css`. Not for the lily pad or the apple (`NO_NOTE_SPRITES`, `spriteTakesNote` in `lib/theme`).
  - Others can use / need to know: the App's keydown check now uses `e.composedPath()[0]`, so typing in any input inside our Shadow DOM no longer triggers shortcuts. Tested in Chromium on a local page (box, focus, digits, Enter, Esc, click-away, hover, reload).
  - Need from someone else: a person to check it in Chrome.

- [Oct 11, 8:10 AM] (Teobobeo99)
  - Did: removed the colored glow around sprites on the page (`--fo-sprite-glow` is gone from `toolbar.css` and `MarkerLayer`). Fixed the flicker when placing a sprite: `createLineBoil` (`lib/engine/lineBoil.ts`) now puts its first frame on right away, so restarting it never leaves the markers without a filter for a moment.
  - Others can use / need to know: the scroll rail's white glow and the orange glow after jumping to a seed are unchanged. Tested in Chromium: 208 samples while placing sprites, none without the line boil filter.
  - Need from someone else: David (line boil) to know about the one-line change in `lineBoil.ts`.

- [Oct 11, 7:45 AM] (Teobobeo99)
  - Did: colored sprout and mushroom art (`images/sprout.png`, `mushroom.png`; colors green darker and red). Apple question is no longer Gemini: when an apple is planted, `recallQuestion` (`lib/engine/recall.ts`) saves the paragraph with the highlight blanked out as a one-question Fruit (`appleFruitKey`); the pop-up has a typed answer and "Show answer". Every highlight now shows its sprite centered above it (`MarkerLayer`, `aboveHighlight`), not draggable. Hover tips fixed (they were hidden under the tile below) and added for the shovel and the tree (the tree's says "Forests").
  - Others can use / need to know: `isCorrectAnswer` now ignores case, spacing and punctuation everywhere. Dragging over link text in Chrome drags the link instead of selecting it, so start a highlight on plain text. Tested in Chromium on Wikipedia with a 30-second timing.
  - Need from someone else: a person to check it in Chrome.

- [Oct 11, 7:00 AM] (Teobobeo99)
  - Did: new colored art from `forest-images/` copied into `images/` (old white versions removed, except the sprout, mushroom and tree placeholders); new sprites `cat`, `grass`, `owl`, `rock`; no color picker: each sprite's color is in `SPRITES` (`lib/theme/index.ts`) and gives its highlight color and a faint marker glow. Toolbar: `TOOLBAR_LAYOUT` in `Toolbar.tsx` (two rows, gap before lily pad/apple). Apple = active recall: text only, alarm (`entrypoints/background.ts`), apple tree, `ReviewPopup.tsx` top left; "Active recall timing" in Settings.
  - Others can use / need to know: `spriteColorKey`, `spriteColorVar`, `spriteColorHex`, `TEXT_ONLY_SPRITES` from `@/lib/theme`; `getDueReviews()` in storage; `SpriteIcon` has no `color` prop any more. The lily pad quiz is now one per forest (`QuizBar`). Data model additions in `BACKLOG.md` D8. `forest-images/` is still there as the artist's copy.
  - Need from someone else: the team to OK D8; a person to check it in Chrome.

- [Oct 11, 3:00 AM] (Teobobeo99)
  - Did: the sprite that follows the mouse after you pick one on the toolbar now sits a little to the top right of the cursor at 60% opacity (`.fo-cursor-sprite` in `lib/onpage-ui/toolbar.css`). It is the same copy that shows while you drag a sprite off the toolbar.
  - Others can use / need to know: where a sprite lands is unchanged (centered on the mouse); only the preview moved. Change `margin` and `opacity` in that rule to adjust. `docs/SPEC.md` and `BACKLOG.md` F4 updated.
  - Need from someone else: a person to check it in Chrome.

- [Oct 11, 2:30 AM] (Teobobeo99)
  - Did: the glow around a sprite you jump to (click it on the scroll rail) is orange now, not green: new token `flash` (palette orange) in `lib/theme/themes.ts`, used by `fo-glow` and `fo-pulse` in `lib/onpage-ui/toolbar.css`; listed in `docs/THEME.md`.
  - Others can use / need to know: `accent` is still green and is not used for this glow any more. Tested in Chromium (clicked a rail sprite, the marker on the page glowed orange).
  - Need from someone else: a person to check it in Chrome.

- [Oct 11, 2:15 AM] (Teobobeo99)
  - Did: the faint white glow is on the scroll rail sprites only (removed from the toolbar tiles), and lowered to a 1px blur (`.fo-rail-stop` in `lib/onpage-ui/toolbar.css`, token `glow` in `themes.ts`).
  - Others can use / need to know: to change the strength, edit the blur in `drop-shadow(0 0 1px var(--fo-glow))`. Chromium screenshots only.
  - Need from someone else: a person to check it in Chrome.

- [Oct 11, 1:40 AM] (Teobobeo99)
  - Did: backgrounds are the Background colors only (page `#18182A`, cards and chips `#50505F`) and text the Foreground colors only, no dark-green dimming or layers any more. Toolbar shortened: no instruction text, no Recent row, no Current Forest / View Forests / Create new forest buttons. A white tree button sits under the shovel and opens the current forest; "+ Create new forest" is the last option of the forest drop-down. Hover is `filter: brightness(1.3)`. Files: `Toolbar.tsx`, `toolbar.css`, `App.tsx`, `themes.ts`, `entrypoints/viewer/style.css`, and `border-edge/30`, `bg-surface/40` and `/80` (see-through mixes) replaced by solid classes in the viewer.
  - Others can use / need to know: `Settings.recentSprites` still exists but nothing writes or shows it. The `*-filter` tokens are gone. Checked in Chromium with screenshots; the font did not load there.
  - Need from someone else: a person to check it in Chrome.

- [Oct 11, 1:10 AM] (Teobobeo99)
  - Did: toolbar restyled as one rounded card: header with the forest and close button, even sprite tiles with a green ring on the chosen one, round color dots, quiet buttons and one solid green "Create new forest" button (`lib/onpage-ui/toolbar.css`, small markup changes in `Toolbar.tsx`: `fo-colors`, `fo-actions`, placeholder "Forest name"). Still only palette colors, no gradients, dark greens from filters on layers.
  - Others can use / need to know: the card is `.fo-scale` (fixed 300px wide before the zoom). New filled boxes go in the `::before` list at the end of `toolbar.css`. Checked in Chromium with close-up screenshots; the Crafty Girls font did not load in that browser, so check the look in Chrome.
  - Need from someone else: a person to check it in Chrome.

- [Oct 11, 12:40 AM] (Teobobeo99)
  - Did: every background is dark green now (user's request): the palette's darker green dimmed with a CSS filter, on a layer behind each box so text and sprites are not dimmed (`::before` rules at the end of `toolbar.css` and in `entrypoints/viewer/style.css`). New tokens `page-filter`, `surface-filter`, `surface-alt-filter`, `primary-soft-filter` in `lib/theme/themes.ts`. Text is light again, borders are the palette's darker green. `docs/THEME.md` explains the technique.
  - Others can use / need to know: use `bg-surface`, `bg-surface-alt`, `bg-primary-soft` as before, they do the layer themselves. Inputs and selects have a transparent background (they cannot have a layer). A new filled box in `toolbar.css` needs `position: relative; isolation: isolate` and a line in the `::before` list at the end. Compile, check:theme and build pass; screenshots in Chromium only.
  - Need from someone else: a person to check it in Chrome.

- [Oct 10, 11:50 PM] (Teobobeo99)
  - Did: no gradients anywhere (the `grad-*` tokens are gone; `npm run check:theme` now fails on a gradient), accent is green, toolbar default size is smaller (`DEFAULT_ZOOM` 0.85 in `Toolbar.tsx`, a saved scale of 1 now means this size), scroll rail moved to the left edge with 26px sprites that stack on top of each other (no more lanes in `ScrollRail.tsx`). `docs/THEME.md`, `CLAUDE.md`, `docs/SPEC.md`, `BACKLOG.md` A8 updated.
  - Others can use / need to know: the sprite under the mouse comes to the front on hover (`.fo-rail-stop:hover`). Checked in Chromium on Wikipedia with screenshots; compile, check:theme and build pass. Nobody has checked it in Chrome yet.
  - Need from someone else: a person to check it in Chrome.

- [Oct 10, 11:00 PM] (Teobobeo99)
  - Did: F4 (`CursorSprite`: chosen sprite follows the mouse; `useSpriteDrag`: carry a sprite from the toolbar onto the page), recent sprites (a "Recent" row, `Settings.recentSprites`), "Create new forest" button (replaced "+ New"), scroll rail (`ScrollRail.tsx`: slim bar, sprites stick out, shaded block for the visible part, animal).
  - Others can use / need to know: the animal is an orange circle until the artist adds `images/uncolored-animal.png` and it is named in `lib/theme/index.ts` (`ScrollRail` already checks `artUrl('uncolored-animal.png')`). Sprites at the same height fan out sideways into up to 4 lanes. The rail only shows while the toolbar is open and the page has seeds.
  - Need from someone else: the artist's animal art; a person to check all of this in Chrome.

- [Oct 10, 9:00 PM] (Teobobeo99)
  - Did: halved the SVG lineboil displacement scale from 6 to 3 in `lib/engine/lineBoil.ts`.
  - Others can use / need to know: animation timing and seeded frames are unchanged; `npm run compile` passes.
  - Need from another role: nothing

- [Oct 10, 8:55 PM] (Teobobeo99)
  - Did: fixed continuous lineboil cycling by materializing the marker iterable before the animation loop; `Map.values()` was being consumed on the first tick.
  - Others can use / need to know: every marker now receives each seeded SVG filter frame continuously; `npm run compile` and `npm run build` pass.
  - Need from another role: nothing

- [Oct 10, 8:50 PM] (Teobobeo99)
  - Did: replaced the custom bitmap lineboil pipeline with a Shadow-DOM-safe SVG turbulence/displacement controller adapted from `https://github.com/tomcreighton/boil` (`lib/engine/lineBoil.ts`).
  - Others can use / need to know: markers now animate directly at scale 6 with 8 seeded filters and a 100ms cycle; no image fetch or canvas re-encoding occurs per frame. `npm run compile` and `npm run build` pass.
  - Need from another role: nothing

- [Oct 10, 8:40 PM] (Teobobeo99)
  - Did: scaled lineboil movement for the original 480px artwork, using an 18px wobble and 9px jitter, and clear dark source contours before drawing the shifted stroke.
  - Others can use / need to know: the change is intended to remain visible when sprites render at 38px; `npm run compile` and `npm run build` pass.
  - Need from another role: nothing

- [Oct 10, 8:35 PM] (Teobobeo99)
  - Did: increased the lineboil edge-strength response by 4x in `lib/engine/lineBoil.ts`.
  - Others can use / need to know: choppy segmentation, wobble, and continuous animation are unchanged; `npm run compile` passes.
  - Need from another role: nothing

- [Oct 10, 8:30 PM] (Teobobeo99)
  - Did: tuned lineboil to use broken contour segments and one jittered offset per pixel instead of overlapping multi-pass bands.
  - Others can use / need to know: the effect remains continuously phased; `npm run compile` and `npm run build` pass.
  - Need from another role: nothing

- [Oct 10, 8:25 PM] (Teobobeo99)
  - Did: lineboil now continuously regenerates marker images every 120ms with a changing wobble phase; source sprite blobs are fetched once per image URL.
  - Others can use / need to know: the animation loop is owned by `lib/onpage-ui/App.tsx`, processing is phased in `lib/engine/lineBoil.ts`, and `npm run compile` plus `npm run build` pass.
  - Need from another role: nothing

- [Oct 10, 8:20 PM] (Teobobeo99)
  - Did: increased lineboil visibility in `lib/engine/lineBoil.ts` with wider +/-3px passes, stronger edge detection, and higher opacity.
  - Others can use / need to know: markers still use the same processed image and color mask; `npm run compile` and `npm run build` pass.
  - Need from another role: nothing

- [Oct 10, 8:10 PM] (Teobobeo99)
  - Did: fixed `App.tsx` lineboil import to use the project `@/lib/engine/lineBoil` alias instead of an absolute `/lib/...` path.
  - Others can use / need to know: `npm run compile` passes again.
  - Need from another role: nothing

- [Oct 10, 8:05 PM] (Teobobeo99)
  - Did: added lineboil debug logging in `lib/engine/lineBoil.ts` and `lib/onpage-ui/App.tsx`.
  - Others can use / need to know: the browser console shows queued marker ids, sprite types, source image URLs, dimensions, completions, and failures; toggle `DEBUG_LINE_BOIL` off when finished debugging.
  - Need from another role: nothing

- [Oct 10, 8:00 PM] (Teobobeo99)
  - Did: visible anchored sprite markers now receive line-boiled bitmap art generated from each seed in `lib/onpage-ui/App.tsx`, passed through `MarkerLayer`, and rendered by `SpriteIcon`; restored `lib/engine/lineBoil.ts` as the single helper implementation.
  - Others can use / need to know: marker rendering falls back to the normal sprite if processing fails or art is unavailable. `npm run compile` and `npm run check:theme` pass.
  - Need from another role: nothing

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

- [Oct 11] (GitHub Copilot)
  - Did: added a centered, wider "Summarize & export" panel in `entrypoints/viewer/ForestExport.tsx`, placed below the React Flow graph; its trigger now matches the graph's primary "Text note" button styling and smoothly scrolls into view when opened or when export options appear. Gemini creates a study-guide summary, and the user can download it as PDF or DOCX. Raw HTML-looking seed text is excluded from Gemini and both exports. Added `forest:ai-summary` through the background worker and `docx`/`jspdf` dependencies.
  - Others can use / need to know: open a forest's Graph view, scroll below the graph, press "Summarize & export", then "Summarize with Gemini" after saving a key in Settings. The page only shows "Summary ready" plus PDF/DOCX options after generation; the full text stays inside the export handlers. The background listener must include `forest:ai-summary` so the message channel stays open, and the extension must be reloaded after rebuilding. `npm run compile`, `npm run check:theme`, and `npm run build` pass; build reports only a bundle-size warning. Not tested with a real Gemini key in Chrome yet.
  - Need from someone else: check the panel and downloaded files in Chrome with a real key.

- [Oct 11] (Teobobeo99)
  - Did: links in the graph are made with Shift+click (first node, then second; again removes; Esc or a background click cancels); the connection dots are gone, a dashed preview line follows the mouse (`GraphView.tsx` `toggleRoot`, `GraphNodes.tsx`, `graph.css`). Fixed right-drag saving one step short when the last move and the release arrive together.
  - Others can use / need to know: React Flow's Shift box-select is off (`selectionKeyCode={null}`). Tested in Chromium 16/16.
  - Need from someone else: nothing.

- [Oct 11] (Teobobeo99)
  - Did: line boil on the graph's sprites (seed nodes and large trees), the same wobble as on web pages. `lib/engine/lineBoil.ts` is split into shared pieces with a new `createLineBoilVariable(host)` that animates `--fo-boil` on the graph box; `.fo-boil` in `graph.css` wraps each sprite in `GraphNodes.tsx` and reads it. `createLineBoil` (on-page markers) behaves exactly as before.
  - Others can use / need to know: the boil is on an inner wrapper, so the selected glow and hover dimming still work. Reduced motion in the system keeps the lines still. Tested in Chromium (filter steps through its 8 frames, glow intact).
  - Need from someone else: David (line boil) to know `lineBoil.ts` was split up; a person to check it in Chrome.

- [Oct 11] (Teobobeo99)
  - Did: the Minimal theme (renamed from "Minimal Biome") now uses plain words everywhere: new `lib/theme/words.ts` (`getWords(themeId)`, `useWords()`, `cap`, `countOf`), used across the viewer, the toolbar, the review pop-up and the planting messages. App name "Notes", forest→folder, folder→section, seed→item, root→link, "Lily pad quiz"→"Quiz". The other themes' text is unchanged.
  - Others can use / need to know: new user-visible text must come from `useWords()` if it names a nature thing. `removeSeed` (ForestList) and `removeSeedAndRoots` (NodeDetail) now take `words`. Toolbar aria-labels stay English. Tested in Chromium.
  - Need from someone else: nothing.

- [Oct 11] (Teobobeo99)
  - Did: a web page now gets a large tree in the graph once it has 2 or more seeds in the forest, not 3 (`graphLayout.ts` `LARGE_TREE_MIN_SEEDS = 2`). All docs updated from "3 or more" to "2 or more".
  - Others can use / need to know: compile and check:theme pass; not yet checked in Chrome.
  - Need from someone else: nothing.

- [Oct 11] (Teobobeo99)
  - Did: right-button dragging a large tree now moves the tree and all of its seeds together (`GraphView.tsx` `connectedNodeIds` follows trunk lines when the drag starts on a tree). Right-dragging a seed is unchanged (the seed and its directly rooted seeds). No physics; seeds' new spots are saved on release.
  - Others can use / need to know: compile and check:theme pass; not yet checked in Chrome.
  - Need from someone else: nothing.

- [Oct 11] (Teobobeo99)
  - Did: (1) the lily pad quiz can be remade with or without AI at any time (`QuizView.tsx`, a `Remake` panel; the kind is read from the question types). (2) Roomier graph layout (`graphLayout.ts`: bigger collision radius, push and link distance) and a "Spread out" button (`GraphView.tsx`, `layoutAllSeeds`) that re-places every node and overwrites dragged spots. (3) Notes show in `ForestList.tsx` ("Note: …") and are editable in `NodeDetail.tsx` ("Your note").
  - Others can use / need to know: existing forests keep their saved node spots until "Spread out" is pressed. Tested in Chromium with a mocked Gemini reply (switch both ways, failure notice, no overlapping nodes after Spread out).
  - Need from someone else: a person to check it in Chrome, and a real Gemini key test.

- [Oct 11] (Teobobeo99)
  - Did: a clicked (selected) sprite in the graph now gets a soft white glow and is slightly brighter, in place of the old green ring (`graph.css`, `.fo-seed-node.is-selected .fo-seed-sprite`, using `--fo-glow`).
  - Others can use / need to know: still no ring on hover or selection. check:theme passes; not yet checked in Chrome.
  - Need from someone else: nothing.

- [Oct 11] (Teobobeo99)
  - Did: removed the green ring around a selected (clicked) sprite in the graph too, so sprites never get a ring (`graph.css`). A selected sprite still opens the detail panel and shows its root dot at full strength.
  - Others can use / need to know: do not add a ring back for hover or selection; the user asked for none. check:theme passes.
  - Need from someone else: nothing.

- [Oct 11] (Teobobeo99)
  - Did: drawing a root between two seeds that already have one now removes that root, so the drag toggles a connection on and off (`GraphView.tsx` `onConnect`). The hint at the bottom of the graph says so.
  - Others can use / need to know: either direction counts as the same root. Click and Delete still works too. Compiles; not yet checked in Chrome.
  - Need from someone else: nothing.

- [Oct 11] (Teobobeo99)
  - Did: removed the green ring around a hovered sprite in the graph; hover now only brightens it and fades the unconnected nodes (`graph.css`). The ring on a clicked (selected) sprite is unchanged.
  - Others can use / need to know: nothing new. check:theme passes.
  - Need from someone else: nothing.

- [Oct 11, after 4:45 AM] (Teobobeo99)
  - Did: Obsidian-style hover focus in the graph. Hovering a node keeps it and its directly joined nodes (roots and large-tree lines) bright, lights those lines in the accent color, and fades the rest (`GraphView.tsx` `hoverNeighborhood`, `shownNodes`/`shownEdges`; styles at the end of `graph.css`).
  - Others can use / need to know: only display classes `fo-hovered`/`fo-lit`/`fo-dim` are added, so node and edge state is unchanged. `npm run compile` currently fails only in `NodeDetail.tsx` (`Screenshot` not imported), from the screenshot work in progress, not from this.
  - Need from someone else: nothing.

- [Oct 11, 4:45 AM] (Teobobeo99)
  - Did: the lily pad quiz. Forest page has a "Quizzes" bar (`QuizBar.tsx`) with one button per color that has lily pads. It opens `#/forest/<id>/quiz/<color>` (`QuizView.tsx`, `useQuiz.ts`, `Pond.tsx`, `quiz.css`): a start screen (make with Gemini, or without AI), questions one by one, the frog hops to the next pad, then the score, missed questions, Try again and New questions. Storage: `getFruits(forestId)` and `saveFruit(...)` (keeps only the latest quiz per color).
  - Others can use / need to know: Gemini is only called when the user presses a button; if it fails the quiz is made with fill in the blank and the error is shown. Test: plant 2+ lily pads of one color over sentences, open the forest, press the color under "Quizzes". Tested in Chromium with a fake key; not with a real key.
  - Need from someone else: the talking frog art (not used yet), and a person to try it in Chrome with a real key.

- [Oct 10, 9:55 PM] (GitHub Copilot)
  - Did: right-button dragging now affects only the dragged node and its directly rooted neighbors; transitive root chains and central-tree trunk links are excluded (`entrypoints/viewer/GraphView.tsx`).
  - Others can use / need to know: `npm run compile` passes.
  - Need from someone else: test direct-root dragging versus a second-degree root chain in Chrome.

- [Oct 10, 9:50 PM] (GitHub Copilot)
  - Did: right-button dragging now moves the full connected graph component, including trunk-connected seeds; large tree nodes are draggable (`entrypoints/viewer/GraphView.tsx`, `graph.css`).
  - Others can use / need to know: seed positions save when the right drag ends. The central tree position is movable for the open graph but is still derived again when the graph is rebuilt because large trees are not seeds.
  - Need from someone else: test right-dragging a connected graph and moving the central tree in Chrome.

- [Oct 10, 9:40 PM] (GitHub Copilot)
  - Did: graph seed labels are editable and persisted as optional `Seed.displayText`; large tree nodes keep their existing position after initial placement (`entrypoints/viewer/GraphNodes.tsx`, `GraphView.tsx`, `graph.css`, `lib/storage/types.ts`).
  - Others can use / need to know: click a node label, type a shorter display name, and press Enter or click away to save it. `npm run compile`, `npm run build`, and `npm run check:theme` pass.
  - Need from someone else: test the edit and tree positioning in Chrome on a real graph.

- [Oct 10, 9:40 PM] (GitHub Copilot)
  - Did: graph nodes now show compact display text when collapsed; the selected node detail shows the full seed text and provides an editable Display text field (`entrypoints/viewer/GraphNodes.tsx`, `NodeDetail.tsx`).
  - Others can use / need to know: edit the Display text field and press Enter or click away to persist it; clearing it restores the generated label from the seed text. `npm run compile` and `npm run build` pass.
  - Need from someone else: test the expanded text and display-text editing in Chrome on a real graph.

- [Oct 10, 7:10 PM] (Roshan)
  - Did: all six viewer-lane jobs in `entrypoints/viewer/`: graph view with large trees (`GraphView`, `GraphNodes`, `graphLayout.ts`, `graph.css`), roots, text notes (`NewNoteForm`) and the detail panel (`NodeDetail`), folder sidebar (`FolderSidebar`), draggable forest grid with icon choice, settings page with the Gemini key. A "Settings" link is in the viewer header.
  - Others can use / need to know: text notes are seeds with `kind: 'note'` and `url: ''` (the list shows them under "Your notes"). Roots are drawn from the small dot on a sprite; select a root and press Delete to remove it. Removing a seed from the graph also removes its roots. Tested with a Playwright script in Chromium on Wikipedia; nothing was checked in Chrome by a person yet.
  - Need from someone else: link sprites from the page lane, to test the "Open link" button in the detail panel. `npm run check:theme` fails on Windows for everyone (`BACKLOG.md` F5).

- [Oct 10, 9:00 PM] (Teobobeo99)
  - Did: docs only. Added the "large tree" idea (A6) to `docs/SPEC.md`, `BACKLOG.md`, the Stage 2 checklist and the graph view row in `docs/DIVIDING_WORK.md`; nothing is built.
  - Others can use / need to know: group the forest's seeds by `url`; for each url with 2 or more seeds draw a larger `tree` node near them with subtle lines. It is worked out each time, not stored, so no data model change. Assumed to live in the graph view only; ask the user if unsure.
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

- [Oct 11] (Teobobeo99)
  - Did: the Minimal theme now uses the colored art in `minimal-images/` (drawn as is, no tint; X is `symbolx.png`, tree is `cloud.png`); `minimal-icons/` is gone. Every tree (grown sprout, large tree in the graph, 'tree' forest icon) is now `images/tree.png`; the apple tree keeps `appletree.png`. Files: `lib/theme/index.ts`, `wxt.config.ts`. The teammate-added "Light Forest" theme had no `sprites` and broke compile; it now borrows Night Forest's sprite colors.
  - Others can use / need to know: `images/uncolored-tree.png` is no longer used. Tested in Chromium (all three test suites pass).
  - Need from someone else: sprite colors for Light Forest, and what `question.png` is for.

- [Oct 11] (Teobobeo99)
  - Did: per-theme sprites. `themes.ts`: each theme has `sprites` (exact highlight colors from the user) and emits `--sprite-<type>` vars. `lib/theme/themeId.ts`: `useThemeId`, `watchThemeId`. `index.ts`: `spriteLabel`, `spriteImageUrl`/`spriteColorHex` take a themeId, `MINIMAL_ART` table. `SpriteIcon`, `ForestIcon`, `ShovelIcon` follow the theme by themselves. `wxt.config.ts` publishes `minimal-icons/*.png` as `sprites/minimal/`. Added `'house'` to `SpriteType` (`BACKLOG.md` D8).
  - Others can use / need to know: show sprite names with `spriteLabel(type, useThemeId())`, not `SPRITES[type].label`. `spriteColorKey` now returns the sprite name (`'owl'`), not a palette key. `minimal-icons/uncolored-{diamond,hexagon,check}.png` are stand-ins drawn by the agent; replace them with real art under the same names.
  - Need from someone else: real diamond, hexagon and check art from the artist.

- [Oct 11] (Teobobeo99)
  - Did: added optional `Seed.note` (the user's own words about a seed) in `lib/storage/types.ts`. Additive only; old seeds have none. Saved with `updateSeed(id, { note })`; an empty note saves `undefined`.
  - Others can use / need to know: recorded in `BACKLOG.md` D8 for the team to confirm.
  - Need from someone else: the team to confirm the field.

- [Oct 11, 6:20 AM] (Teobobeo99)
  - Did: "Vibrant Jungle" (`jungle`) is the default theme for new installs: `DEFAULT_SETTINGS.theme` in `lib/storage/index.ts` now uses `DEFAULT_THEME_ID` from `lib/theme/themes.ts` (which already pointed at jungle), so the two cannot disagree again.
  - Others can use / need to know: browsers that already ran the extension have `theme: 'forest'` saved; pick Vibrant Jungle once on the Settings page there. Tested in Chromium with a fresh profile (saved theme is `jungle`).
  - Need from someone else: nothing

- [Oct 11, 4:00 AM] (Teobobeo99)
  - Did: Gemini quiz questions. `lib/ai/gemini.ts` (runs in the background only): `quizQuestions(key, sources)` makes one request with a JSON schema for up to 10 multiple-choice questions and drops bad ones; `GEMINI_MODEL = 'gemini-3.8-flash'`. `entrypoints/background.ts` answers the messages `forest:ai-test` and `forest:ai-quiz`. `lib/ai/index.ts` is what the viewer imports: `geminiQuizQuestions(seeds)`, `testGeminiKey()`, plus the fill-in-the-blank functions. Settings page has a "Test key" button.
  - Others can use / need to know: the call throws an `Error` with a message fit to show the user (no key, bad key, rate limit, unknown model); fall back to `fillBlankQuestions`. Only `id`, `text` and `pageTitle` of each seed are sent. Tested: real request to Google with a fake key (clear error back), and parsing with a made-up reply.
  - Need from someone else: the user to press "Test key" in Chrome with their real key.

- [Oct 11, 3:30 AM] (Teobobeo99)
  - Did: Stage 3 started (the user's call, before the Stage 2 boxes are checked in Chrome). `lib/ai/fillBlank.ts`: `fillBlankQuestions(seeds)` makes one fill-in-the-blank `Question` per seed (sentence around a blanked key term, 4 choices from the other seeds' words, or none so the user types it), `isCorrectAnswer(question, given)`. Stage 3 details the user left to the agent are written in `docs/SPEC.md` under "Active recall".
  - Others can use / need to know: pure functions, no storage or network. Tested with `node --experimental-strip-types` on Wikipedia sentences. Next: Gemini questions, then the quiz screen.
  - Need from someone else: the Gemini model name for `BACKLOG.md` D5, and a key pasted in the viewer's Settings page.

- [Oct 10, 11:30 PM] (Teobobeo99)
  - Did: new palette in `lib/theme/themes.ts`: 10 colors (background, foreground, and the 8 seed colors) in 3 given tones each (normal, lighter, darker). The `shade` and `fade` helpers are gone; colors outside the palette are made only with CSS filters or gradients. Toolbar and viewer restyled through tokens. `docs/THEME.md`, `CLAUDE.md` and `docs/SPEC.md` reworded to match.
  - Others can use / need to know: tones are `var(--c-green)`, `var(--c-green-light)`, `var(--c-green-dark)`; `background` and `foreground` work the same way. `COLORS` is still the 8 seed colors. The only transparency left is the page highlight (`lib/engine/highlights.ts`), because `::highlight()` takes no gradient or filter. `npm run compile`, `npm run check:theme` and `npm run build` pass; screenshots taken in Chromium (viewer list, graph, toolbar on Wikipedia).
  - Need from someone else: a person to check the new look in Chrome.

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
- [x] [Data] Gemini API key created in Google AI Studio and the current Flash model name written into `BACKLOG.md` D5 (`gemini-3.8-flash`, closed D5)

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
- [ ] [UI] The white tree button under the shovel opens the forest you are in, in a new tab (replaces the "Current Forest" button) (in progress: built and tested by the agent in Chromium on a real Wikipedia page, still needs a check in Chrome by a person)
- [x] [UI] ~~"View Forests" button~~ removed by the user to shorten the toolbar; all forests open from the viewer's "All forests" link
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
- [ ] [Engine] Drag a sprite from the toolbar and drop it on the page (in progress: built and tested by the agent in Chromium on local and Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [Engine] Sprite on a link: user stays on the same tab, the sprite stores the link's destination (in progress: built and tested by the agent in Chromium on local and Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [Engine] Sturdier anchoring: nearest element with an offset, scroll percentage as the last resort (in progress: markers already use text, then element, then scroll percentage, tested on Wikipedia; a person needs to check it in Chrome)
- [ ] [Engine] Fix F2: when you jump to a seed, its highlight turns yellow, stays yellow for a while, then fades smoothly (`BACKLOG.md` F2) (in progress: built and tested by the agent in Chromium on local and Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [Engine] Fix F3: a placed sprite is centered on the mouse (`BACKLOG.md` F3) (in progress: built and tested by the agent in Chromium on local and Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [UI] Fix F4: the selected sprite follows the mouse, on top of the cursor, like it is being dragged (`BACKLOG.md` F4) (in progress: built and tested by the agent in Chromium on local and Wikipedia pages, still needs a check in Chrome by a person)

### On-page UI and art

- [ ] [UI] Rectangular toolbar with the sprite icons (sprout, lily pad, mushroom, flower, apple tree) (in progress: toolbar shows all five sprites as real art, tinted in the chosen color; the final look is still to do, and a person needs to check it in Chrome)
- [x] [UI] ~~Recent sprites row~~ removed by the user to shorten the toolbar (`Settings.recentSprites` is no longer written)
- [x] [UI] ~~Color palette under the toolbar~~ removed by the user (2026-10-11): each sprite has its own color
- [ ] [UI] Your own note on a seed: a text box opens right after planting any sprite except the lily pad and the apple; Enter saves, Esc skips, clicking away saves; hovering the sprite shows the note and clicking it edits it (`SeedNote.tsx`) (in progress: built and tested by the agent in Chromium, still needs a check in Chrome by a person)
- [ ] [UI] Every highlight shows its sprite centered above it (changed from "appears for a second, then fades") (in progress: built and tested by the agent in Chromium on Wikipedia, still needs a check in Chrome by a person)
- [ ] [UI] Create a new forest from the forest drop-down's last option, "+ Create new forest" (replaces the button, `BACKLOG.md` A7) (in progress: built and tested by the agent in Chromium, still needs a check in Chrome by a person)
- [ ] [UI] Scroll rail on the right edge with a marker for every annotation on the page; a slim bar whose sprites are larger than the bar and stick out past it (`BACKLOG.md` A8) (in progress: built and tested by the agent in Chromium on local and Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [UI] Clicking a rail marker scrolls to that annotation (in progress: built and tested by the agent in Chromium on local and Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [UI] The animal: the rail saves where you were before the jump, and clicking it takes you back (use a placeholder until the artist's animal art arrives, see Stage 3) (in progress: built and tested by the agent in Chromium on local and Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [UI] Sprite art for each sprite type (in progress: sprout, tree, lily pad, mushroom, flower, apple and shovel are in; the apple tree and the animal marker are not drawn yet)
- [ ] [UI] Forest icons (in progress: forests use the sprite art as their icon; no dedicated forest art, and the user cannot choose one yet)
- [ ] [UI] Forest color palette (in progress: the palette is now the team's blue background and light text with three tones per color, `docs/THEME.md`; a person needs to check it in Chrome)
- [ ] [UI] Theme picker (the "custom style" dropdown), see `BACKLOG.md` A5
- [ ] [All] Sprites follow the theme: Night Forest and Jungle keep the art with their own highlight colors; Minimal swaps in shapes (star, post-its, check, exclamation, diamond, hexagon, triangle, circle, cloud, X) from `minimal-images/`; live switch with no reload (in progress: built and tested by the agent in Chromium, still needs a check in Chrome by a person)
- [ ] [UI] House sprite in the toolbar's empty slot, light brown highlight (in progress: built and tested by the agent in Chromium, still needs a check in Chrome by a person)
- [ ] [UI] Keyboard shortcuts: 1-9 and 0 pick the hotbar, Ctrl+Z / Ctrl+Shift+Z, Esc, - and + (they size only the sprite about to be planted; planted sprites keep their own size, `Seed.scale`); only while the toolbar is open and never while the user types on the site (in progress: built and tested by the agent in Chromium, still needs a check in Chrome by a person)
- [ ] [UI] Sprites drawn with the new colored art, each with its own highlight color and a faint glow on the page (in progress: built and tested by the agent in Chromium on Wikipedia, still needs a check in Chrome by a person)

### Viewer

- [ ] [Viewer] Forests can be dragged around the grid, and positions are remembered (in progress: built and tested by the agent in Chromium on real Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [Viewer] User can choose each forest's icon (in progress: built and tested by the agent in Chromium on real Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [Viewer] Double-click a forest to open it (in progress: built and tested by the agent in Chromium on real Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [Viewer] Graph view: every annotation is a sprite node (React Flow), opened by a "Graph view" button at the top right of the forest page; nodes spread out automatically once (d3-force), then keep the positions the user gives them (in progress: built and tested by the agent in Chromium on real Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [Viewer] Roomier graph layout and a "Spread out" button that lays out every node again and saves the spots (`graphLayout.ts`, `GraphView.tsx`) (in progress: built and tested by the agent in Chromium, still needs a check in Chrome by a person)
- [ ] [Viewer] Large trees in the graph: a web page with 2 or more seeds in the forest gets a bigger tree node near its seeds, joined to them by very subtle lines; worked out from the seeds, not saved (`BACKLOG.md` A6) (in progress: built and tested by the agent in Chromium on real Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [Viewer] Roots: drag from one node to another to connect them (in progress: built and tested by the agent in Chromium on real Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [Viewer] Left sidebar with the folders inside the forest (in progress: built and tested by the agent in Chromium on real Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [Viewer] Text notes as nodes not tied to a web page, using the same sprites (in progress: built and tested by the agent in Chromium on real Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [Viewer] Detail panel for a selected node (in progress: built and tested by the agent in Chromium on real Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [Viewer] Clicking a link sprite opens the link's destination (in progress: the graph's detail panel shows an "Open link" button when a seed has a `linkTarget`; untested until the page lane saves link sprites)

### Data, AI and integration

- [ ] [Data] One theme file that all sprites and colors load from (in progress: `lib/theme/` holds the palette, the art lookup and the tinting components; there is no theme picker yet)
- [ ] [Data] Storage for roots, folders, forest icons and grid positions (in progress: roots, folders and forest icons have functions, untested; grid positions need a data model change, see `BACKLOG.md` A1)
- [x] [Data] ~~Recent sprites saved in settings~~ no longer used (the toolbar's Recent row was removed)
- [ ] [Data] Settings screen where the user pastes their Gemini key (in progress: built and tested by the agent in Chromium on real Wikipedia pages, still needs a check in Chrome by a person)
- [ ] [Data] All four branches merged into main, and main still runs

**Done when:** a forest with annotations from two different pages shows as a graph, and two nodes can be connected by hand.

## Stage 3: Quizzes, animation and quality of life (hours 16 to 21)

Goal: the features that win the demo. Build in priority order and stop wherever time runs out. Each priority works without the ones after it.

### Priority 1: Lily pad quiz

- [ ] [Data] Gemini writes the questions: one request per quiz, JSON output, sent from the background worker (in progress: built in `lib/ai/gemini.ts`; tested with a fake key and a made-up reply; needs the "Test key" button pressed with a real key in Chrome)
- [ ] [Data] Fill-in-the-blank fallback that needs no AI (in progress: built in `lib/ai/fillBlank.ts`, used by the quiz screen, tested in Chromium; needs a check in Chrome)
- [ ] [Data] Lily pad seeds of the same color in the same forest form one quiz (a fruit) (in progress: built and tested by the agent in Chromium, still needs a check in Chrome by a person)
- [ ] [Viewer] A lily pad quiz can always be remade either way: "Remake with Gemini" and "Remake without AI" under every quiz, which says which kind it is (`QuizView.tsx`) (in progress: built and tested by the agent in Chromium, still needs a check in Chrome by a person)
- [ ] [Viewer] Quiz screen: lily pads in a row (in progress: built and tested by the agent in Chromium, still needs a check in Chrome by a person)
- [ ] [UI] Frog art (sitting, jumping, talking) and the hop animation from pad to pad (in progress: sitting and jumping frog and the hop are in, tested in Chromium; the talking frog art is still missing)
- [ ] [Engine] The lily pad only goes on text (drag over a sentence); a click with it places nothing (in progress: built and tested by the agent in Chromium on Wikipedia, still needs a check in Chrome by a person)
- [ ] [UI] Notice in the UI that AI features send saved text to Google (in progress: on the quiz start and results screens and the Settings page, tested in Chromium; needs a check in Chrome)

### Priority 2: Growth

- [ ] [Data] A sprout becomes a tree when the user reloads the page (correct answers do not change anything)
- [ ] [UI] Sprout and fruit sprout each drawn in two growth stages (sprout and tree)
- [ ] [Viewer] Graph nodes show their growth stage
- [ ] [Viewer] Hover focus in the graph, like Obsidian (in progress: built, compiles and passes check:theme; needs a check in Chrome)

### Priority 3: Fruit sprout five-minute review (see `BACKLOG.md` D1)

- [ ] [Data] Alarm set with `chrome.alarms` after the active recall time (5 minutes by default); the apple grows into an apple tree (in progress: built and tested by the agent in Chromium on Wikipedia with a 30-second timing, still needs a check in Chrome by a person)
- [ ] [Engine] Review prompt appears on the page (top-left pop-up, one fill-in-the-blank question from the paragraph, no Gemini) (in progress: built and tested by the agent in Chromium on Wikipedia with a 30-second timing, still needs a check in Chrome by a person)
- [ ] [Data] 30-second demo setting so judges can see it ("Active recall timing" on the Settings page) (in progress: built and tested by the agent in Chromium on Wikipedia with a 30-second timing, still needs a check in Chrome by a person)

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
- [ ] [UI] Frogs on the page: now and then a frog jumps in from off screen onto a lily pad, sits there, and may hop to a lily pad close by (`PondFrog.tsx`) (in progress: built and tested by the agent in Chromium, still needs a check in Chrome by a person)
- [ ] [Viewer] Line boil on the graph's sprites, the same as on pages (in progress: built and tested by the agent in Chromium, still needs a check in Chrome by a person)
- [ ] [UI] Themed forest drop-down on the toolbar (`ForestPicker.tsx`), replacing the browser's `<select>` list (in progress: built and tested by the agent in Chromium, still needs a check in Chrome by a person)

**Done when:** the full demo script runs twice in a row without a failure.

## Wrap-up (hours 21 to 24)

- [ ] [All] Feature freeze three hours before the deadline
- [ ] [All] Bugs in `BACKLOG.md` marked demo-blocking are fixed
- [ ] [All] Demo script rehearsed on the chosen demo pages
- [ ] [Data] Backup screen recording of the demo
- [ ] [Data] Project write-up submitted
- [ ] [All] Distinct app name chosen (`BACKLOG.md` D3)
- [ ] [All] HackRU prize list checked for Gemini and ElevenLabs categories
