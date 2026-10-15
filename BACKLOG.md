# Backlog: things to fix, things to add, open decisions

How to use this file:

- Add a new entry at the bottom of the right section. One entry per problem or idea.
- Give every entry an area tag (`[Engine]`, `[UI]`, `[Viewer]`, `[Data]`, `[All]`) and your name or initials. The tags are areas of the product, not people.
- When something is fixed or decided, move it to "Closed" at the bottom with one line on what was done. Do not delete it.
- Planned features live in `PROGRESS.md`. Future ideas live in `docs/SPEC.md` section 12. An idea moves here only when someone wants to build it during the hackathon.

## Open decisions (agents: ask the user, do not guess)

### D8. Data model additions for the new sprites and active recall (team to confirm)

Also (2026-10-11, user's request): screenshots are saved as separate `shot:<seedId>` records (a JPEG data URL) with the `unlimitedStorage` permission, and the extension has the `webRequest` permission (to spot PDFs by their Content-Type). Asked for by the user (2026-10-11): `SpriteType` has four new values (`cat`, `grass`, `owl`, `rock`), and `Settings` has `reviewMinutes` (the active recall time, default 5). `Seed.color` is no longer chosen by the user; it is set to the sprite's color key and nothing reads it. Also (2026-10-11, user's request): `SpriteType` has `house`, and `Seed` has an optional `scale` (the size its sprite was planted at, 0.5 to 2). And `Seed` has an optional `note` (the user's own words typed after planting; not for the lily pad or the apple). Tell the team; nothing existing was removed. Also (2026-10-15, user's request): two new interface records, `advanced` (`AdvancedSettings`: owl and frog rate and size, default sprite size) and `stashes` (`StashState`: the user's own toolbar stashes and the chosen one), kept apart from `Settings` like `toolbar`; `updateFruit` can now change a quiz's `questions`. Lily pad groups are not saved (worked out from roots).

## Needs fixing

Format:

```
### F1. Short title  [Area] (who found it)
- What happens:
- What should happen:
- Page where it happens:
- Demo-blocking: yes / no
```

### F13. Memory: what is left after the Oct 15 fixes  [UI] [Data] (agent)
- What happens: measured with Playwright Chromium, 5 tabs of a long article (memory footprint, as in Chrome's Task Manager). No extension: 31 MB per tab, GPU process 125 MB. Fixed on Oct 15: `will-change: transform` on markers, frog and owl, together with the line boil filter, cost about 65 MB of GPU memory per open tab (GPU 375 MB went to 127 MB); `listRecords` copied the whole database (screenshots too) into every tab several times per page load (3,000 seeds + 60 screenshots: 112-136 MB per tab, now 61-94). Still open: (1) with the in-progress owl/frog/creature changes the GPU process is ~180 MB with the toolbar closed and ~220 MB with it open, versus 127 MB without them; (2) `getSeedsForUrl` still reads every seed in every tab on every storage change; (3) `deleteForest` and `saveScreenshot` still read the whole database (rare actions).
- What should happen: GPU process close to 125 MB, tabs about 20 MB above a page's own size. For (1), find which new creature code draws or animates while idle (an always-mounted boil or animation). For (2), only re-read seeds when a `seed:` key changed (onChanged gives the keys), or keep an index of seed ids per page (a data-model change, needs the team's OK).
- Page where it happens: every page, more with many tabs and a big forest.
- Demo-blocking: no

### F9. A marker's "Near:" text can include the page's CSS  [Engine] (agent)
- What happens: `nearbyText` (lib/engine/anchor.ts) read `<style>` contents on a test page, so a marker's text was "Near: Shot testbody{font:18px…".
- What should happen: skip `<style>`, `<script>` and hidden elements when collecting nearby text.
- Page where it happens: any page with inline styles near the marker.
- Demo-blocking: no

### F10. Many screenshots slow down every seed read  [Data] (agent)
- What happens: `listRecords` reads all of storage, so every `shot:` image (50–150 KB each) is read whenever seeds are listed.
- What should happen: keep a key index (or read only `seed:` keys) in the storage module.
- Page where it happens: any, once there are dozens of screenshots.
- Demo-blocking: no

### F11. Our UI can't be clicked while a site's modal dialog is open  [UI] (agent)
- What happens: a modal `<dialog>` makes the rest of the page inert, including our toolbar (it is drawn above but not clickable). Also, WXT's `:host{all:initial !important}` overrides our `:host` rule (z-index, pointer-events, font never applied).
- What should happen: probably fine for the hackathon; note only.
- Page where it happens: sites with modal dialogs.
- Demo-blocking: no

### F12. Taking a lily pad out of its group can split the group  [UI] (agent)
- What happens: choosing "On its own" (or another group) removes all of that pad's roots to other lily pads. If it was the only link between two halves of a group, those halves become two groups.
- What should happen: probably fine (groups are just roots); could reconnect the halves automatically if users find it surprising.
- Page where it happens: any page with a group of 3 or more lily pads joined in a chain.
- Demo-blocking: no

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

### A10. "Grow from link" for PDFs and pages that need JavaScript  [Data] (agent)
- What: "Grow from link" reads the page's HTML itself, so a PDF link, or a page that only shows its text after JavaScript runs or after a login, gives "Could not find much text". Options: read PDF links with PDF.js (already in `entrypoints/pdf/`), or fall back to Gemini's own URL reading tool. Also maybe an "undo" for one link's seeds and roots, or an accept/reject step like the suggested roots.
- Why: many study sources are PDFs.
- Stage it would belong to: Future.

### A9. Read the text of scanned PDFs (OCR)  [Engine] (agent)
- What: scanned PDFs (pictures of pages, like Principia Mathematica) have no text, so they can be read, marked with sprites and screenshotted, but not highlighted. OCR (e.g. Tesseract.js, run in the PDF page) could add an invisible text layer.
- Why: lets users highlight and quiz on old scanned books.
- Stage it would belong to: Future.

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
- Update (2026-10-11): a second theme, "Vibrant Jungle", exists and is the default, and the Settings page has a theme dropdown. A picker on the toolbar is not built.
- Update (2026-10-11, later): three themes (Night Forest, Vibrant Jungle, Minimal; Light Forest was added later by a teammate). Sprite art and highlight colors now follow the theme; Minimal has its own shape icons (`docs/THEME.md`). Decided by the user (2026-10-11), leave as is, do not ask again: `minimal-images/question.png` and the Minimal "Question" color stay unused; Light Forest keeps borrowing Night Forest's sprite colors; Minimal keeps the frog picture in the quiz; the default forest keeps the name "My First Forest" in every theme.

### A4. Growth from sprout to tree on page reload  [Data] (agent)
- What: the decision is made (see `PROGRESS.md` Stage 3 priority 2) but nothing builds it yet. A `growth` field already exists on every seed and starts at `sprout`.
- Why: it is the demo moment for growth.
- Stage it would belong to: Stage 3 priority 2.

### A6. Large tree for a page with 2 or more seeds  [Viewer] (user)
- What: in the graph view, every web page that has 2 or more seeds in the forest gets a "large tree" node, placed fairly close to its seeds and joined to each by a very subtle line. Worked out from the seeds grouped by `url` each time the graph is drawn, not saved, so there is no data model change. Placeholder art: the `tree` sprite drawn larger.
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
- The extension not running on Chrome's own pages or the Chrome Web Store. PDFs now open in our own PDF page; test that a PDF link is redirected in real Chrome (in tests a PDF opened within a second of the extension starting was sometimes not redirected), and that sign-in-protected PDFs fall back to Chrome's viewer.

## Closed

- D9 apple spaced repetition: approved by the user with the team's OK (2026-10-15). `AdvancedSettings` has `reviewRepeats` (default true) and `reviewSpacing` (0.5, 1 or 2; default 1); `Seed` has an optional `reviewStep`. An apple's answer now sets its next review time (never its growth). Built in `lib/onpage-ui/ReviewPopup.tsx`.
- Quiz icons: approved by the user, team informed (2026-10-15). `Fruit` has an optional `icon` (an art id like `Forest.icon`; missing means `FOREST_ICONS[0]`), changed with the new `updateFruit(id, { name, icon })` (`renameFruit` now calls it).
- Saved, named quizzes: approved by the user, team informed (2026-10-15). `Fruit` has an optional `name` ("Quiz 1"…; missing on older quizzes). `saveFruit` no longer removes older quizzes of the same color, and `renameFruit(id, name)` was added. Numbers are counted per forest and color, so the apples' one-question fruits do not push up the lily pad quiz numbers.
- Quiz styles type-in and matching: approved by the user, team informed (2026-10-14). `Question.type` is now `'multiple-choice' | 'fill-blank' | 'type-in' | 'matching'`, and `Question` has an optional `pairs` ({ left, right }[], matching only). Older quizzes load unchanged. `SeedInput` also accepts `note`, so "Grow from link" saves its explanation.
- F12. Font downloaded from Google on every web page: fixed (2026-10-15). Bundled in `public/fonts/`, registered by `loadAppFont()` (`lib/theme/font.ts`). Needs a check in Chrome.
- D3. App name: decided, Wildernotes (2026-10-15). Still run the trademark search in `docs/PUBLISHING.md` M8.

- F2. Jump highlight flashed for one second: fixed (2026-10-10). It now stays lit 2.5s and fades over 1.5s (`lib/engine/highlights.ts`); marker glow does the same in `toolbar.css`. Tested in Chromium; needs a check in Chrome. Changed later (2026-10-11): the copy sits a little to the top right of the mouse at 60% opacity, instead of on top of it.
- F3. Sprites landed off-center from the mouse: fixed (2026-10-10). Sprites are centered on the spot and text anchors use the middle of the line. Tested in Chromium; needs a check in Chrome.
- F4. Selected sprite did not follow the mouse: fixed (2026-10-10) with `CursorSprite`. Tested in Chromium; needs a check in Chrome.
- A7. "Create new forest" button: done (2026-10-10), replaced "+ New" in the toolbar. Changed later (2026-10-11): the button is gone, and "+ Create new forest" is the last option of the forest drop-down.
- A8. Rail sprites stick out past the bar: done (2026-10-10) in `ScrollRail`. Tested in Chromium. Changed later (2026-10-10): the rail is on the left, sprites are 26px and stack on top of each other instead of fanning out.
- D6. Who has which role: there are no fixed roles; people just take jobs (2026-10-10). Jobs are claimed in `docs/DIVIDING_WORK.md`.
- A1. Forest grid positions: approved. `Forest` has optional `x` and `y`, added to `lib/storage/types.ts` (2026-10-10).
- A2. Graph node positions: approved. `Seed` has optional `graphX` and `graphY`. The graph spreads nodes out automatically once (d3-force), then keeps the positions the user gives them (2026-10-10).
- D1. Active recall, how the five-minute review works: decided (2026-10-10). `fruitsprout` is the fifth toolbar sprite. It grows into an apple tree after five minutes, not because of a correct answer, and stays an apple tree after its question. Its review is one question, separate from the lily pad quiz (lily pads of one color in one forest). Only the sprout and the fruit sprout grow; the lily pad, mushroom and flower never change. The one-question review is stored as a `Fruit` with a single question, so no new data type is needed.
- D2. Name of the general toolbar sprite: decided it is called "sprout" (2026-10-10). Growth has two stages, sprout then tree, and a sprout becomes a tree when the page is reloaded.
- D7. Lily pad screenshots: tried and removed (2026-10-11), then brought back through the toolbar's camera (2026-10-15, user's request): a lily pad taken with the camera is a `media` seed whose screenshot (`shot:<id>`) goes to Gemini as an image for its quiz question; quizzes without AI and Cerebras skip it. Sending screenshots to Gemini is new data leaving the browser: `docs/PRIVACY_POLICY.md` and `docs/PUBLISHING.md` are updated, and the team should OK it before release.
- D5. Gemini model name: `gemini-3.8-flash`, chosen by the user (2026-10-11). It is set once as `GEMINI_MODEL` in `lib/ai/gemini.ts`. The Settings page's "Test key" button checks that the key and this name work.
- D4. React and WXT, or the plain fallback: decided WXT with React (2026-10-10). The plain fallback is not used.
