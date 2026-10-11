# Full spec: Forest annotation extension

Working title: "Forest". Team of four. This is the complete project plan. `CLAUDE.md` holds the short version every session needs; this file holds everything else. Read the section for the feature you are building.

Sections:

1. What is the app?
2. Stack
3. Shared data model
4. Features
5. What needs to be built
6. Problems / Contentions
7. Summary, how it works
8. Sprites
9. Open questions, answered
10. Team plan for four people
11. Stages of Development
12. Potential / Future Features
13. Other Notes
14. Original notes, in the team's own words

---

## 1. What is the app?

A Chrome extension for annotating web pages. A student highlights text and plants themed sprites (sprouts, lily pads, mushrooms, flowers, apple trees) anywhere on a page, and each annotation is saved to that page so it is still there on the next visit. Annotations are collected into "forests" (projects). Inside a forest they appear as a graph of sprite nodes, like Obsidian, where they can be linked to each other and turned into quizzes for active recall. The whole app is plant and forest themed, with a dark blue-and-green palette, and is meant for later reference and for studying.

### Two core components

- **Chrome extension for annotation.** Runs on top of any web page. The user places a sprite at a location on the page or highlights text, annotations save per web page, and a toolbar lets the user pick or drag and drop sprites and choose which forest they go into.
- **Forest viewer for saved annotations.** The user can return to previous sessions and web pages, connect notes to each other, connect ideas across pages and forests, add their own notes and media, and take quizzes.

### Is a separate web app necessary?

No, for the hackathon. Build the viewer as a full-tab page that lives inside the extension. An extension page can read the same storage the annotation toolbar writes to, so the viewer works with no server, no login and nothing to deploy. A hosted website cannot read an extension's storage, so a real web app would need accounts, a cloud database and syncing, which is a second project on its own. A hosted web app becomes worth building later, when notes need to sync across devices or reach mobile.

---

## 2. Stack

| Piece | Use | Why |
| --- | --- | --- |
| Extension framework | WXT (Manifest V3) | Generates the manifest, opens Chrome with the extension already loaded, and reloads changes as you save. It is the actively maintained choice in 2026; Plasmo, the older alternative, is in maintenance mode. |
| Language and UI | TypeScript, React, Tailwind CSS | The toolbar and the viewer are both made of small UI pieces, which is what React is for. TypeScript catches mismatched data between four people's code before it runs. AI coding assistants are strongest in this combination. |
| On-page UI isolation | Shadow DOM (WXT's `createShadowRootUi`) | The toolbar is injected into other people's websites. Without isolation, a site's CSS restyles the toolbar and the toolbar's CSS can break the site. |
| Highlights | CSS Custom Highlight API | Colors a range of text without inserting any elements into the page, so it cannot break the page's layout. Wrapping text in tags fails when a selection crosses paragraphs or links. |
| Storage | `chrome.storage.local`, behind one shared storage module | Readable from the page script, the background worker and the viewer. About 10 MB by default, and the `unlimitedStorage` permission removes the cap. Do not use IndexedDB from the page script: there it belongs to whichever website you are on, so notes from one site would be invisible on another. |
| Graph view | React Flow (`@xyflow/react`) | Each node is a React component, so a node can be a sprite image. Dragging nodes and drawing a line from one node to another come built in, which covers manual "roots". |
| AI | Gemini API, current Flash model on the free tier, called from the background service worker with JSON output | Free to prototype with. Check Google AI Studio for the exact model name on the day: the 2.0 models were shut down in June 2026 and the 2.5 models are reported to shut down in mid-October 2026, so older tutorials name models that no longer respond. |
| Timers | `chrome.alarms` | Manifest V3 background workers go to sleep after about 30 seconds idle, so a normal five-minute timer would be lost. An alarm wakes the worker back up. |
| Frog voice | Browser `speechSynthesis` first, ElevenLabs as the upgrade | `speechSynthesis` is free, needs no key and works offline, so the feature cannot fail in the demo. ElevenLabs sounds far better and has its own prize category at many MLH events. |
| Art and animation | PNG or SVG sprites at one fixed size (64 by 64), CSS animations | CSS handles grow, fade and frog-hop animations with no extra library. Draw in Figma, Piskel or Aseprite. |
| Export | JSON and Markdown as file downloads | JSON is the stored data written to a file, so it is nearly free. Markdown opens directly in Obsidian. |
| Team tools | GitHub, one branch per person, VS Code or Cursor, Node LTS | Small, frequent merges keep four people's work from drifting apart. |
| Later, not at the hackathon | Supabase or Firebase for accounts and cloud sync | Only needed once notes must follow the user across devices. |

If most of the team has never used React, the fallback is a plain extension: a hand-written manifest.json with HTML, CSS and JavaScript files and no build step. It is slower to grow but has fewer things to learn in the first hour. (Decided: WXT and React, decision D4 is closed in `BACKLOG.md`.)

---

## 3. Shared data model

Agree on this in the first 30 minutes. Everyone's code reads and writes these shapes through the one storage module, which is what lets four people build in parallel.

- **Forest:** id, name, icon, createdAt.
- **Folder:** id, forestId, name.
- **Seed (one node):** id, forestId, folderId, kind (highlight, sprite, link, note, media), spriteType (sprout, lilypad, mushroom, flower, fruitsprout, cat, grass, owl, rock, house), color, growth (sprout, tree), url, pageTitle, text, linkTarget, anchor, nextReviewAt, createdAt, an optional note (the user's own words, added 2026-10-11), and an optional scale (the size its sprite was planted at, added 2026-10-11).
- **Anchor (where a seed sits on its page):** the exact quoted text plus a few words before and after it, a selector for the nearest page element with an x and y offset inside it, and the scroll position as a percentage of page height.
- **Root (one connection):** id, forestId, fromSeedId, toSeedId, source (manual or ai), reason.
- **Fruit (one quiz):** id, forestId, color, questions (seedId, type, prompt, choices, answer), createdAt.
- **Settings:** currentForestId, the three most recent sprites, theme, Gemini API key, auto-connections on or off, reviewMinutes.

---

## 4. Features

Each feature is tagged with the stage it belongs to. Stages are defined in section 11.

### Annotating a page

- Highlight text in the color of the selected sprite. The sprite then stays on the page, centered above the highlighted text, resting on its top edge; it cannot be dragged away, and the shovel removes the highlight and its sprite together. (Stage 1 for the highlight; changed 2026-10-11 from "appears for a second, then fades")
- Click anywhere on the page to place the selected sprite at that exact spot. The sprite is attached to the text it was placed on, so it follows that text when the page scrolls, resizes or reflows, and it can be dragged to a new spot. (Stage 1 with a plain marker, Stage 2 with real sprites)
- A placed sprite is centered on the mouse, so it lands around the cursor and not off to one side. (Stage 2, see `BACKLOG.md` F3)
- Once a sprite is selected in the toolbar, a copy of it follows the mouse, a little to the top right of the cursor and slightly see-through, so it feels like the user is carrying it onto the page and the spot they are about to click stays visible. Esc or the shovel puts it down. (Stage 2, see `BACKLOG.md` F4)
- Keyboard shortcuts while the toolbar is open: 1 to 9 and 0 pick the toolbar's sprites in reading order (1 sprout, 2 mushroom, 3 house, 4 flower, 5 lily pad, 6 cat, 7 grass, 8 owl, 9 rock, 0 apple; each button shows its number), Ctrl+Z undoes and Ctrl+Shift+Z redoes (Cmd on Mac), Esc puts the sprite down, - and + make the sprite on the mouse (the one about to be planted) smaller and larger, and it is planted at that size; sprites already on the page keep their own size. No shortcut runs while the toolbar is closed or while the user is typing on the website (a text field, a rich text editor such as Google Docs, an iframe editor), so the site keeps its keys. (Added 2026-10-11, user's request)
- A sprite planted at a bigger or smaller size (- and +) sits with its bottom-middle on the click point at every size, and a highlight's sprite stays centered above its text at every size; the copy on the mouse keeps its spot a little to the top right of the cursor. (Fixed 2026-10-11)
- The house sprite: an ordinary sprite (any note), light brown highlight in each theme. (Added 2026-10-11, user's request)
- Sprites follow the theme. Night Forest and Vibrant Jungle use the same art with their own highlight colors. Minimal uses shapes: star, red, yellow and blue post-its, check, exclamation, diamond, hexagon for the ordinary sprites, a triangle for the lily pad, a circle for the apple, a cloud for every tree, an X for the shovel. Switching theme recolors open pages without a reload. The colors are in `docs/THEME.md`. Minimal is the non-nature version of the app and uses plain words everywhere: the app is "Notes", forests are folders, the folders inside them are sections, seeds are items, roots are links, "plant" is "add" or "place", the lily pad quiz is just "Quiz", and the frog's lines are neutral. The other themes keep the nature words. Saved names (such as "My First Forest") are never renamed. (Added 2026-10-11, user's request)
- Screenshots: with a sprite picked (not the lily pad or the apple), dragging a box over an area with no text (an image, a chart) captures that part of the screen and saves it as a `media` seed with that sprite, shown at the box's corner on the page and as an image in the viewer. Dragging over text still highlights. (Added 2026-10-11, user's request)
- PDFs: a PDF opened in a tab (only once the user actually goes to it, never when a search page preloads it in the background) is sent to the extension's own PDF page (PDF.js, real selectable text), where highlights, sprites, notes and screenshots all work; seeds are saved under the PDF's own address and "Open on page" reopens it there. An "Open in Chrome's viewer" button goes back to Chrome's viewer. (Added 2026-10-11, user's request)
- Sprites scroll with the page in the same frame as the text (they are positioned in page coordinates, so the browser moves them itself), so they never trail behind while scrolling. (Fixed 2026-10-11)
- Right after planting a seed, a small box next to its sprite lets the user type their own note about it. Enter saves, Esc skips, clicking away saves what was typed. Hovering the sprite shows the note, and clicking the sprite edits it. The note also shows in the viewer's list and detail panel. Not for the lily pad or the apple, whose text is the quiz material. (Added 2026-10-11, user's request)
- When the user jumps to a seed (from the viewer or the scroll rail), the seed's highlight turns yellow, stays yellow for a short while, then fades smoothly back to its normal look. It is not a one-second flash. (Stage 2, see `BACKLOG.md` F2)
- Drag a sprite from the toolbar and drop it on the page. (Stage 2)
- Place a sprite on a link: the user stays on the current tab, and the sprite stores the link's destination. Clicking that sprite in the viewer opens the destination. (Stage 2)
- Annotations save per web page and reappear when the page is opened again. (Stage 1)
- On a page, only the seeds of the current forest are shown. Switching forest from the toolbar shows that forest's seeds instead. "Open on page" in the viewer switches to the seed's forest first. (Stage 1)
- Circle or draw around a region of a page. (Future)

### Toolbar

- A rectangular toolbar with the sprite icons, and a color palette under it. (Stage 2)
- The toolbar opens in the top right corner and can be dragged anywhere in the window. It can be resized by dragging its bottom-left corner. It is opened and closed with the extension's icon in Chrome (or its close button), and it stays open, in the same place and size, in every tab until the user closes it. It is drawn above everything on the page, including a site's own pop-ups. (Stage 1)
- At the top of the toolbar, a drop-down with the forest the annotations are going into. It lists every forest, and its last option, "+ Create new forest", asks for a name and makes one. (Stage 1, the create option Stage 2) The drop-down is the extension's own list, drawn in the current theme's colors (not the browser's native list): each forest with its icon, a check on the current one, arrow keys and Esc work, and it opens upward near the bottom of the window. (2026-10-11)
- The toolbar is two rows of six buttons, with a slight gap before the last two columns:
  `sprout, mushroom, (empty), flower | lily pad, shovel` over `cat, grass, owl, rock | apple, tree button`. The tree button opens the current forest. Sprout and mushroom have their own art now; what they are for is still to be decided. There is no color picker: each sprite has its own color, which is its text highlight color (sprites on the page do not glow; removed 2026-10-11) (apple, mushroom: palette red; apple tree, owl: orange darker; cat: purple lighter; flower: yellow; sprout, grass, lily pad: green darker; rock: foreground darker). Hovering shows a short message under the button: lily pad "Quiz generation", apple "Active Recall", shovel "Remove a sprite", tree "Forests". (2026-10-11)

### Scroll rail

- A thin rail on the left edge of the page with a small marker for every annotation on that page. Clicking a marker scrolls to it. (Stage 2)
- Look: the rail is a smallish, slim bar, but the sprites on it are larger than the bar and stick out past its edge. This is on purpose; keep the bar slim and let the sprites overhang. Sprites at nearly the same height stack on top of each other, and the one under the mouse comes to the front. A shaded block shows which part of the page is on screen. The animal is a plain circle until the artist's art arrives. (Stage 2)
- When you jump, the rail saves where you were. That saved spot is the "animal", because the animal follows you around. Clicking it takes you back. (Stage 2)
- Option to show the animal as a visible sprite on the page. (Future)

### Forest viewer

- View Forests: a Finder-style window with one icon per forest. New forests land in a tidy grid by default, the user can drag them around, choose each forest's icon, and double-click to open one. (Grid and open in Stage 1, dragging and icon choice in Stage 2)
- A list of every annotation in a forest, grouped by web page, each one linking back to its page which opens in another window. (Stage 1)
- Graph view: every annotation is a sprite node, as in Obsidian. The forest page keeps its list of annotations, and a "Graph view" button at the top right of it opens the graph. Nodes spread out automatically once, the first time a node has no saved position; after that the positions are the user's and are saved. The automatic layout leaves room between nodes so sprites and labels never overlap, and a "Spread out" button lays out every node again (it moves nodes the user placed). (Stage 2; roomier layout and the button added 2026-10-11) The sprites in the graph (seeds and large trees) have the same line boil as the sprites on web pages: their lines wobble slightly. (2026-10-11)
- Large trees: in each forest, every web page that has 2 or more seeds gets a "large tree" node in the graph. It sits fairly close to its seeds and is joined to each of them by a very subtle line. It is worked out from the seeds (grouped by `url`) each time the graph is drawn, not saved, so it needs no data model change. A large tree is not a seed and cannot be quizzed. Placeholder art: the existing `tree` sprite drawn larger. (Stage 2)
- Manual connections ("roots"): drag from one node to another to draw a root between them. (Stage 2)
- A left sidebar with the folders inside the forest. (Stage 2)
- The user's own notes and media as nodes that are not tied to a web page. (Stage 2 for text notes, Stage 3 for images)
- Automatic connections between nodes from the same page or the same website, drawn in a lighter style, with a switch to turn them off. (Stage 3)
- AI-suggested connections. (Stage 3)
- "Grow from link" (in Minimal, "Add from link"): a button left of "Graph view" on the forest page (and left of "List view" in the graph). The user pastes a link; the extension reads that page, and Gemini (one request, JSON) picks its 3 to 6 key ideas, each as one sentence copied word for word from the page plus a short label, and says which of the forest's seeds each idea relates to (and which ideas relate to each other), with a short reason. Each idea is saved at once as a `highlight` seed from that page (grass sprite, the label as its display text) and each connection as a root with source `ai`; no accept or reject step. A page's ideas get a large tree in the graph like any page. The quotes have a text anchor, so they are highlighted when the user opens the page; a quote not found word for word is saved without one. At most 6 seeds and 20 roots per link. PDF links and pages that need JavaScript or a login to show their text cannot be read yet. (Added 2026-10-11, user's request)

### Active recall

- The user plants a fruit sprout over a segment of text they want to review. Five minutes later (the time passing, not a correct answer, is what makes it grow) the fruit sprout grows into an apple tree and the user gets a single question on the text. The tree stays as a fully grown apple tree after the question is answered. This is separate from the lily pad quiz below. (Stage 3)
- The lily pad only goes on text: the user drags over a sentence to highlight it as quiz material. A click with the lily pad places nothing, and dragging it off the toolbar just picks it up. Lily pad seeds of the same color in the same forest form one quiz. Hovering the lily pad in the toolbar shows "Quiz generation". (Stage 3; a screenshot version was tried on 2026-10-11 and removed at the user's request)
- The quiz is the "fruit" the forest produces. In the quiz screen the lily pads sit in a row and a frog jumps from pad to pad as the user moves to the next question. The quiz says whether Gemini wrote it or it was made without AI, and it can always be remade either way ("Remake with Gemini", "Remake without AI"). (Stage 3)
- Gemini generates the questions. Fill-in-the-blank questions are the fallback: blank out a key term from the saved text, which needs no AI and works offline. (Stage 3)
- Details decided for Stage 3 (2026-10-11, the user left these to the agent):
  - **Quiz size:** one question per lily pad of that color, at most 10. A color with a single lily pad still makes a quiz.
  - **Question types:** Gemini writes multiple choice (4 choices). The fallback is fill-in-the-blank: the sentence around the blanked key term, with 4 choices taken from the other lily pads' words; if there are too few other words, the user types the answer. Text under 4 words gets no question. Answers ignore case and surrounding punctuation.
  - **Starting a quiz:** the forest page has a "Lily pad quiz" button; all the forest's lily pads form one quiz (every lily pad has the same color now). The quiz has its own page (`#/forest/<id>/quiz/lilypad`).
  - **Saving:** a quiz is saved as a `Fruit`, so taking it again does not call Gemini again. A "New questions" button makes a fresh one.
  - **End screen:** the score (for example 4 of 5), which questions were missed, and buttons to try again or go back to the forest.
  - **Growth:** a sprout or fruit sprout becomes a tree the next time its page loads after the visit it was planted in.
  - **Fruit sprout (apple) review:** the apple only goes on text. After the active recall time (a setting, 5 minutes by default, 30 seconds for a demo) it grows into an apple tree and a pop-up in the top left of whatever page the user is looking at asks one fill-in-the-blank question: the paragraph the apple was planted in, with the highlighted part blanked out, and the user types what they highlighted ("Show answer" reveals it). The question is made and saved when the apple is planted; no Gemini. If no page is open then, it appears on the next page opened. Answering or skipping ends it; the apple tree stays.

### The frog

- The frog acts as the teacher. When the user asks for it on a highlight, the frog gives an AI summary in a speech bubble. (Stage 3)
- The frog reads the summary aloud, with the browser's built-in voice first and ElevenLabs as the upgrade. (Stage 3)
- Frogs on the page: when a lily pad is on screen, now and then (a 20% chance every 4 seconds) a frog jumps in from off screen, from the nearer side of the window, and sits on it. While it sits, it may hop (a 30% chance every 4 seconds) to another lily pad that is on screen and within about 450px. At most one frog per page; it moves with its lily pad when the page scrolls, goes away if the lily pad is dug up, ignores the mouse, and nothing about it is saved. Uses `frogsit.png` and `frogjump.png` (mirrored when jumping left). Not shown in the Minimal theme (its lily pad is a triangle) or when the browser asks for reduced motion. (Stage 3, added 2026-10-11, user's request; `lib/onpage-ui/PondFrog.tsx`)

### Custom themes

- The default theme is the forest: a dark background and light text with the palette's colors (`docs/THEME.md`), every part of the app plant themed. (All stages)
- There is a theme system. The user will be able to choose a theme from a dropdown ("custom style", Stage 2 or later). Every color in the product is one of the palette's colors (each in a normal, lighter and darker tone), there are no gradients, and a color outside the palette is made only with a CSS filter. The full rules are in `docs/THEME.md`.
- Load sprites and colors from one theme file from the start, so other themes and texture packs can be added without changing code. (Stage 2 for the structure, Future for more themes)

### Export

- Save a forest as a JSON file, and load one back in. (Stage 3)
- Markdown export. (Stage 3)
- JSON saved in the cloud for note syncing. (Future)
- PDF, DOCX and PPTX export, and LaTeX. (Future)

### Platforms, in priority order

1. Chrome extension. (Hackathon)
2. Desktop. (Future)
3. Mobile. (Future)

---

## 5. What needs to be built

- **Extension shell:** the WXT project, manifest permissions (storage, alarms, access to web pages), and the extension icon.
- **Page script:** capture the selected text, draw highlights, place sprites, build an anchor for each annotation, and restore every saved annotation when a page loads.
- **On-page UI:** the toolbar, color dots, forest drop-down, the tree button, the scroll rail and the animal marker, all inside a Shadow DOM.
- **Storage module:** one file with functions such as getForests, saveSeed, getSeedsForUrl and addRoot. Nobody else touches chrome.storage directly.
- **Background service worker:** Gemini requests, the five-minute alarms, and opening the viewer tab.
- **Viewer page:** the forests grid, the forest list view, the graph view, the folder sidebar, a detail panel for a selected node, and a form for adding notes.
- **Quiz engine:** question generation, the fill-in-the-blank fallback, the lily pad and frog screen, and nothing else: a correct answer does not change a seed.
- **Art:** each sprite type, with the sprout drawn in two growth stages (sprout and tree) and the fruit sprout as a sprout and an apple tree, forest icons, the frog (sitting, jumping, talking), the animal marker, and the color palette.
- **Export and import:** JSON and Markdown.
- **Demo materials:** two or three test pages that are known to work, a demo script, a backup screen recording, and the project write-up.

---

## 6. Problems / Contentions

- **Finding the same spot again.** Pixel coordinates break as soon as the window is resized or the page changes. Save the quoted text with a few words around it and search for it on load. For click-placed sprites, save the nearest page element and an offset inside it, with the scroll percentage as the last resort.
- **Pages that do not cooperate.** Extensions cannot run on Chrome's own pages or the Chrome Web Store. Chrome's built-in PDF viewer does not expose its text, so PDFs are opened in the extension's own PDF page instead (see "PDFs" below). Pages that load content as you scroll may not have the text yet when annotations are restored. Demo on stable article pages such as Wikipedia or OpenStax.
- **The same page under different addresses.** Tracking parameters and the part after # make one page look like several. Clean the URL before using it as the key.
- **The API key.** Anything shipped inside an extension can be read by its users. For the hackathon, each user pastes their own Gemini key into settings and it stays in local storage. Keep keys out of GitHub. A public release needs a small server that holds the key.
- **Free-tier limits.** The free Gemini tier allows only a handful of requests per minute. Call AI when the user asks for it, send one request per quiz instead of one per question, and keep the fill-in-the-blank fallback.
- **Privacy.** AI features send the user's saved text to Google. Say so in the UI, and never send anything automatically.
- **"Seed" and "sprout".** "Seed" means a saved annotation, whatever its sprite. The general-purpose toolbar sprite is called the sprout, and growth has two stages: sprout, then tree. There is no separate "seed" growth stage. (Decided in D2.)
- **Two kinds of active recall.** These are two separate systems, as decided in D1. The fruit sprout grows into an apple tree after five minutes and asks one question. The lily pads of one color in a forest form one quiz that the frog hops across. Correct answers do not change any seed.
- **Scope.** The full feature list is more than one hackathon. The stages are ordered so that the project is demo-ready at the end of each one.
- **The name.** A well-known focus-timer app is already called Forest. Pick a distinct name before submitting. (Open decision D3.)

---

## 7. Summary, how it works

### On a web page

1. Open the extension on any web page. A rectangular toolbar appears with the sprite icons (sprout, lily pad, mushroom, flower, apple tree) and the shovel. The color dots sit under them, next to a tree icon that opens the current forest.
2. At the top of the toolbar is a drop-down with the forest you are in, which is the folder your annotations go into. You can switch forests from it, or choose "+ Create new forest" at the bottom of its list.
3. Click a sprite to select it. A copy of the sprite follows your mouse, a little to its top right and see-through. Then do one of the following.
   - **Click a spot on the page.** The sprite is placed there, centered on the mouse, and saved at that location.
   - **Highlight text.** The text is highlighted in the sprite's color, and the sprite stays centered above it.
   - **Click a link.** You stay on the same tab. The sprite is saved pointing at the link's destination, and clicking it later in the viewer opens that destination.

Sprites can also be dragged from the toolbar and dropped on the page.

### The scroll rail

A rail on the left side of the page shows where every sprite on the page is. It is a slim bar, and its sprites are bigger than the bar so they stick out past it. Click a marker to jump to that part of the page; the seed's highlight turns yellow, stays yellow for a while and then fades back. The spot you jumped from is saved as the "animal", since the animal follows you around, and clicking the animal returns you to it.

### The tree button

The white tree icon on the toolbar, under the shovel, takes you straight to the forest you are in. All forests are one click away from the viewer's "All forests" link.

### View Forests

This works like opening a folder in Finder. Each forest is an icon inside a rectangular window. New forests are arranged in a grid by default, and you can drag them wherever you like. You choose each forest's icon. Double-click a forest to open it.

### Inside a forest

A forest opens as a list of its annotations, with a "Graph view" button at the top right. That button opens the forest as an Obsidian-style graph, with a sprite icon for each node. The folders inside the forest are listed in a sidebar on the left. You connect two nodes by holding Shift and clicking one, then the other, which draws a root between them (doing it again removes it; Esc cancels; there are no connection dots, changed 2026-10-11, user's request), or you ask the AI to suggest connections and accept the ones you agree with. You can add your own notes and media as nodes that did not come from a web page, using the same sprites. Nodes from the same page or website are linked automatically in a lighter style, and this can be switched off. A web page with 2 or more seeds in the forest also gets a "large tree" in the graph, placed near its seeds and joined to them by very subtle lines. Hovering a node works like Obsidian: the node and the nodes directly joined to it stay bright, the lines touching it light up in the accent color, and everything else fades almost away, easing in and out.

### Quizzes

There are two kinds of quiz. A fruit sprout planted over text grows into an apple tree five minutes later and the app asks one question about that text; the tree stays as an apple tree afterwards. Separately, text marked with a lily pad becomes quiz material: in the viewer, all lily pads of one color in a forest form a quiz, the pads line up across a pond, and the frog hops to the next pad with each question. Correct answers do not change any seed.

---

## 8. Sprites

| Term | Meaning |
| --- | --- |
| Seed | One saved annotation: highlighted, marked or circled information from a page, stored with its URL and the specific text or location. Every annotation starts as a seed. |
| Sprite | The icon a seed is shown as, on the page and in the graph. |
| Growth | Two stages: sprout, then tree. A sprout becomes a tree when the user reloads the page. The fruit sprout becomes an apple tree five minutes after planting and stays one. Only the sprout and the fruit sprout grow: the lily pad, mushroom and flower never change. Quiz answers never change growth. |
| Forest | A collection of seeds that forms a specific project. A forest is a folder. |
| Root | A connection between two nodes in a forest. |
| Fruit | What the forest produces: a series of questions for active recall, made from the lily pads of one color. The apple tree's single-question review is a separate thing, stored as a Fruit with one question. |
| Frog | The teacher. It hops between lily pads during a quiz and speaks the AI summaries. |
| Animal | The marker for where you were before you jumped along the scroll rail. |

### Sprite types

Different sprites stand for different kinds of notes. A proposed starting set:

- **Sprout:** a general note or key idea. It grows into a tree when the page is reloaded.
- **Lily pad:** "quiz me on this". It only goes on text. Lily pad seeds of the same color in the same forest form a quiz.
- **Mushroom:** something confusing to come back to.
- **Flower:** a definition or key term.
- **Fruit sprout (`fruitsprout`):** text to review soon. Five minutes after planting it grows into an apple tree and asks one question about that text. The apple tree stays after the question. (The sprite is in the toolbar from Stage 1 as a placeholder; the timer and question are Stage 3.)

Color is chosen separately from the palette and groups seeds by topic within a forest.

Lily pads, fruit sprouts and the other sprites are in the toolbar from the start. Only the lily pad and the fruit sprout will produce quizzes, in Stage 3.

---

## 9. Open questions, answered

- **Is the web app for saved annotations necessary?** No. The viewer is a page inside the extension. See "Is a separate web app necessary?" in section 1.
- **Will folders create connections to the nodes they contain?** No. If every node had a line to its folder, each folder would become a hub with dozens of lines and the links between ideas would be hard to see. Obsidian makes the same choice. Show folder membership by clustering nodes together or by filtering from the sidebar.
- **What are the "other sprites"?** Nodes that do not come from a web page: a text note, an image or other media, or a saved link. In the data they are seeds with no page anchor.
- **Can users use the same sprites that are used in annotations?** Yes, and they should. One sprite set and one node type means one piece of code draws everything.
- **Should connecting be simpler than Obsidian, and are connections roots or paths?** Simpler. Obsidian makes you type a link inside a note. Here the user drags from one node to another, which React Flow supports out of the box. Call hand-drawn connections "roots" and automatic same-site connections "paths", and draw paths as dashed lines so the two are easy to tell apart.
- **How will AI connect them?** Claude can connect an Obsidian vault because the vault is a folder of text files it can read. The equivalent here is to send Gemini the list of nodes in one forest (id, page title, saved text) and ask for a JSON list of pairs with a one-line reason each. Show the results as suggested roots that the user accepts or rejects. One forest fits in a single request. Gemini works for this; the request comes from the background worker.
- **Should related websites and domains be connected automatically?** Yes, as an option. Work these out from the URLs each time the graph is drawn instead of saving them, so switching them off is instant.
- **Gemini questions or fill in the blank?** Both. Gemini for multiple choice, fill in the blank as the offline fallback.
- **ElevenLabs for the frog?** Yes in Stage 3, on top of the free browser voice so the feature works without a key.
- **Which export formats, and LaTeX?** JSON first, then Markdown. A PDF can come from Chrome's own print-to-PDF on a summary page. DOCX and PPTX each need a library and are a future item. LaTeX matters only if notes contain math; rendering math in notes (with KaTeX) is more useful than exporting LaTeX files.
- **Cloud JSON for syncing?** Future. Chrome's built-in synced storage holds only about 100 KB, which is too small for annotations, so real syncing needs a cloud database. At the hackathon, exporting and importing a JSON file moves a forest between computers.
- **Should the animal sprite be visible on the page?** Future, as an option. On the rail it is a marker.
- **How to add images?** As image nodes. The simple version stores the image's web address. Right-clicking an image on a page and choosing "plant in forest" is the natural way in.

---

## 10. Team plan for four people

There are no fixed roles: anyone takes any job, and jobs are claimed in `docs/DIVIDING_WORK.md`. The table below lists the four areas of the product, which say what each part owns and which folders it touches. They are not people.

| Area | Owns | Stage 1 | Stage 2 | Stage 3 |
| --- | --- | --- | --- | --- |
| Page engine | Page script: selection, highlights, placing, anchoring, restoring | Highlight, place a marker, save, restore on reload | Drag and drop, link sprites, sturdier anchoring | Five-minute review prompt on the page, frog summary bubble |
| On-page UI and art | Toolbar, palette, scroll rail, sprites and animations | Basic toolbar, forest picker, the tree button | Sprite set, palette, fade animation, scroll rail and animal | Growth art, frog animation, polish |
| Viewer | The forests grid, list view, graph view | Forests grid, list of annotations by page | Graph with sprite nodes, roots, folder sidebar, notes | Quiz screen, automatic paths, suggested roots in the graph |
| Data, AI and integration | Storage module, background worker, Gemini, repo and demo | Project setup, storage module, merging | Theme file, storage for roots and folders, Gemini key setup | Quiz generation, alarms, AI roots, export, demo script and write-up |

The page engine is the hardest area, so give its jobs to someone comfortable with code. The on-page UI and art jobs suit someone newer to coding, since the art and animation can be done alongside small pieces of code.

### Working rules

- Spend the first 30 minutes together agreeing on the data model and the storage function names. The Data person writes the storage module first, with fake data if needed, so the other three can build against it right away.
- Each job stays inside its own area's folders. Two people editing the same file is where merge conflicts come from.
- One branch per person. Merge into main at every checkpoint, roughly every three hours, and make sure main still runs after each merge.
- Use placeholder art (colored circles) until the sprites are ready. Art should never block code.
- Stop adding features three hours before the deadline. Use that time to fix bugs, rehearse the demo and record a backup video.

---

## 11. Stages of Development

Hour ranges assume a 24-hour event and should be scaled to the real schedule. The item-by-item checklist is in `PROGRESS.md`.

### Stage 1: Annotation, saving and a separate viewer

**Goal:** the core loop works from start to finish with plain visuals. Hours 0 to 8.

- Extension loads on a web page and shows a basic toolbar.
- Highlight text in a color and click to place a plain marker.
- Annotations save per page and reappear after a reload.
- Create a forest, switch forests, and see the current forest's name.
- The tree button opens the current forest in the viewer in a new tab.
- The viewer shows forests in a grid and lists each forest's annotations by page, with links back.

**Done when:** a teammate can highlight three things on a Wikipedia article, close the tab, reopen it and see them, then find all three in the viewer.

### Stage 2: Sprites

**Goal:** it looks and feels like a forest. Hours 8 to 16.

- The sprite set on the toolbar, with the color palette.
- Drag and drop sprites, and the appear-then-fade animation on highlights.
- Sprites on links.
- The scroll rail with markers and the animal.
- Forests can be dragged around the grid and given an icon.
- The graph view with sprite nodes, large trees for pages with 2 or more seeds, drag-to-connect roots and the folder sidebar.
- Text notes as nodes.
- Polish on placing: sprites centered on the mouse, the selected sprite follows the cursor, the jump highlight stays yellow then fades, the "Create new forest" button, and rail sprites that stick out past the bar.
- Sprites and colors loaded from one theme file.

**Done when:** a forest with annotations from two different pages shows as a graph, and two nodes can be connected by hand.

### Stage 3: Quizzes, animation and quality of life

**Goal:** the features that win the demo. Hours 16 to 21. Build in this order and stop wherever time runs out, since each item works without the ones after it.

1. Lily pad quiz: Gemini writes the questions, and the frog hops from pad to pad.
2. Growth: a sprout becomes a tree when the user reloads the page. Quiz answers do not affect growth.
3. The fruit sprout: five minutes after planting it grows into an apple tree and asks one question. Add a 30-second demo setting so judges can see it. (Open decision D1.)
4. AI-suggested roots and automatic same-site paths.
5. Frog summaries, spoken aloud.
6. JSON and Markdown export.
7. Image nodes and visual polish.

**Done when:** the full demo script runs twice in a row without a failure. Hours 21 to 24 are for the freeze, the rehearsal and the submission.

---

## 12. Potential / Future Features

### From the original notes

- Images and other media, including screenshots of a region of a page.
- Texture packs: a theme file plus a folder of sprite images and a color palette, which the Stage 2 theme structure already allows for.
- Plugins, scripts and extensions that add new behavior. This needs a permission system, because a plugin could read everything the user has saved.
- The animal shown as a visible sprite on the page.
- Circling and freehand drawing on pages.
- Cloud sync with accounts.
- PDF, DOCX, PPTX and LaTeX export.
- Desktop, then mobile. Mobile Chrome has not supported extensions, so mobile would start as a viewer and quiz app fed by cloud sync.
- More custom themes beyond the forest.

### New ideas

- **Spaced repetition.** After the five-minute review, schedule the next ones at one day, three days and a week. Plants that are overdue start to wilt, which shows at a glance what needs reviewing.
- **Ask the forest.** Chat with the frog, and it answers only from the user's own saved annotations, pointing to the seeds it used.
- **Obsidian export.** Export a forest as Markdown files with Obsidian-style links for each root, so it opens as a ready-made vault.
- **Flashcard export.** Export fruits as a file Anki can import.
- **Side panel.** Show the current forest beside the page in Chrome's side panel, so the user can see related seeds while reading.
- **Video and PDF seeds.** Plant a seed at a timestamp in a YouTube video, or on a page of a PDF.
- **Shared forests.** A read-only link to a forest, and later study-group forests that several people plant in.
- **Citations.** Every seed already knows its URL and date, so a forest can produce a formatted bibliography.
- **Search and tags.** Search across every forest.
- **Cram mode.** One quiz built from everything planted in the last few days, across forests.
- **Accessible palettes.** Color-blind-safe colors, with sprite shape carrying the meaning so color is never the only signal.
- **On-device AI.** Chrome's built-in model for summaries and questions without an API key or sending text anywhere, where the user's Chrome supports it.
- **Firefox and Edge builds.** WXT can build for both from the same code.

---

## 13. Other Notes

- **One-line pitch:** plant notes on any web page, watch them grow into a forest, and let the forest quiz you.
- **Demo script:** open a Wikipedia article, highlight two passages with lily pads and drop a mushroom on a confusing paragraph, jump around with the scroll rail, open the forest and draw a root between two nodes, then run the frog quiz, and reload the page to show a sprout grow into a tree.
- **Prizes:** Best Use of Gemini API and Best Use of ElevenLabs are sponsor categories at many MLH events this season. Check HackRU's prize list, since Stage 3 already uses both.
- **Test early on real pages.** Pick the demo pages on day one and test on them after every merge.

---

## 14. Original notes, in the team's own words

The first planning notes, kept here where their wording or intent differs from the refined sections above. If a refined section and a line here disagree, raise it with the team instead of picking one.

- **The annotation idea:** "User can paste an image/sprite of a post it to a location on a web page." Sprites behave like post-it notes stuck to a page.
- **Toolbar:** "The chrome extension has a toolbar where users can drag and drop themed sprites to emphasize." "Open toolbar and each little thing is like a different icon: sprout, lily pad, mushroom, flower", with more to be added.
- **Highlight color:** "the highlight is in color of the tree."
- **Seeds:** "Collections of annotated, highlighted, or circled information of pages. Contains url and specific information."
- **Forests:** "Collections of seeds to form specific projects."
- **Fruits:** "produced by the forest. A series of questions that reflect Active Recall."
- **Lily pads:** "Lilypad seeds in the same forest of the same color form a quiz in the viewer for practice."
- **Active recall, first version:** "Users place a seed over a segment of text that they would like to review, 5 minutes later they are quizzed on that segment, if they get it right it grows from seed to sprout."
- **Quizzes, first version:** "Generates quizzes, you can highlight certain things and it gets saved as a part of a quiz and then they grow into lily pads and then a frog jumps from pad to pad as you go to next question." "USE GEMINI TO GENERATE QUESTIONS, or fill in the blank."
- **Frog:** "Frog acts like the teachers and when you highlight stuff you get an AI summary and the frog says it, maybe elevenlabs? Aligns with the frog jumping." The first idea was a summary on every highlight, with the voice timed to the frog's jumps. The plan changed this to "when the user asks" because of the free tier's per-minute limit.
- **Scroll rail:** "Scroll bar type thing on the right that shows where the sprites are." "Scrollbar on all the locations bookmarked and you can click it." "When you click to go back on the scroll bar it saves where you were before." "You can optionally make the sprite visible when you are on a webpage but think about that later."
- **View Forests:** "like opening a folder in the finder app. There will be different forests within the rectangular box and the user can drag them around. When new forests are created, just like the finder app, they are by default arranged well, like a grid. In this viewer each forest has a forest icon. (User can choose forest icon.) When the user double clicks one it opens."
- **Inside a forest:** "like obsidian with the random nodes. (I'm calling them nodes, but they will each be a sprite icon.) The user can connect them manually (maybe with a process simpler than obsidian or the same, like the user can draw lines between them and it will be like roots or maybe paths?) or ask AI to do so (same way claude connects obsidian folders?). On the left side it will have the folders within the forests like normal. Users can also add their own notes and media in as other sprites that aren't annotations. Connections between nodes are (maybe) already created for related websites and domain connections. These connections or links are maybe visualized differently to show. This can be disabled."
- **Graph idea:** "Can write other notes and have saved annotations and then make an obsidian like graph? Each note and annotation is like a tree so it's like a forest. Roots?"
- **Note types:** "Different types of seeds and trees for different types of notes."
- **Viewer:** "Can access previous sessions and webpages. Can connect ideas across." "User can connect different notes to each other."
- **Theme:** "APPEAL TO THE THEME: Green/brown, natural/forest colors. WE MAKE THE ENTIRE APP SPROUT/PLANT THEMED: FOREST."
- **Export:** "Save as json in cloud for note syncing. (LaTeX?) PDF, DOCX, and PPTX."
- **Platforms (priority ordering):** Extension, Desktop, Mobile.
- **Original stage names:** Level 1: Annotation and Saving, Separate viewer. Level 2: Sprites. Level 3: Other QOL, quizzes, anim.
- **Future:** "Think about how to add images etc." "Add texture pack and plugin capabilities to download other stuff or script stuff / extensions."
