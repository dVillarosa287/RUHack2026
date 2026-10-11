# Theme system

Every color in the product comes from one palette. Themes are chosen by the user on the Settings page. There are three: "Vibrant Jungle" (`jungle`, the default), "Night Forest" (`forest`) and "Minimal Biome" (`minimal`). A theme sets the interface colors, each sprite's highlight color and, for Minimal Biome, the sprite art itself. This file holds the rules. The code is in `lib/theme/`. `CLAUDE.md` links here, and every role follows it.

## The palette

Ten colors, each in three tones: normal, lighter and darker. The lighter and darker tones are given, exact colors. They are not computed.

| id | Name | Normal | Lighter | Darker |
| --- | --- | --- | --- | --- |
| `background` | Background | `#3535FF` | `#50505F` | `#18182A` |
| `red` | Red | `#FF5555` | `#FF7777` | `#DD3333` |
| `orange` | Orange | `#FFAA00` | `#FFCC33` | `#DD8800` |
| `yellow` | Yellow | `#FFEE88` | `#FFF5B8` | `#E0D178` |
| `green` | Green | `#00CC99` | `#66E0C2` | `#00B487` |
| `blue` | Blue | `#0099FF` | `#66C2FF` | `#0087E0` |
| `cyan` | Cyan | `#00FFEE` | `#66FFF5` | `#00E0D1` |
| `purple` | Purple | `#AA00FF` | `#CC66FF` | `#9600E0` |
| `magenta` | Magenta | `#FF00CC` | `#FF66E0` | `#E000B4` |
| `foreground` | Foreground | `#EAEAFF` | `#FFFFFF` | `#D3D3F3` |

`background` and `foreground` are the base colors: surfaces and text are made from them. The normal `background` tone (`#3535FF`) and the lighter and darker green, and all the other tones, are not used by any token yet. The eight colors from `red` to `magenta` are for the interface (main color, accents). A seed's color does not come from the palette: it is its sprite's color in the current theme (see "Sprite colors and tinting art"). Seeds still save a color key (`spriteColorKey`, for example `owl` or `fruitsprout-grown`), never a code, but nothing reads it.

In CSS the three tones of a color are `var(--c-green)`, `var(--c-green-light)` and `var(--c-green-dark)`.

## The rules

1. **Only palette colors.** Every color anywhere in the product (on-page toolbar, markers, viewer, popups, anything added later) is one of the 30 palette colors exactly as given. The one other set of colors is each theme's sprite colors (see "Sprite colors and tinting art").
2. **No gradients.** Every surface is a flat palette color. Do not write `linear-gradient`, `radial-gradient` or any other gradient.
3. **Backgrounds are Background colors, text is Foreground colors.** Page, panels, cards, buttons and fields use only the three Background tones (`background`, lighter, darker). Text uses only the three Foreground tones. They are never mixed with another color (no green-tinted surfaces, no see-through colors). Green and the other palette colors are for the main color, accents and seed colors.
4. **Anything else is made with CSS filters, and nothing else.** A color that is not in the palette comes from a **CSS filter** on the element (`filter: brightness(1.3)`, `contrast()`, `saturate()`, `hue-rotate()`, `opacity()`). Today this is used for hover and selected states: the element is made brighter with `filter: brightness(...)`. A filter changes everything inside the element, text included, so use it on buttons, chips, icons and sprites, not on a large panel that holds other things.
   Do not compute colors with `color-mix()`, `oklch()`, `hsl()` or relative color syntax.
5. **Pick the tone first.** Before a filter, check whether the lighter or darker tone already does the job (a hover color is usually the darker or lighter tone of the same color).
6. **No color codes outside `lib/theme/themes.ts`.** No hex codes, `rgb()`, `hsl()`, color keywords such as `white`, or stock Tailwind color classes such as `bg-red-100` or `text-white`, in any CSS, TypeScript or HTML file. Use a token instead.
7. **Run `npm run check:theme` before you finish a session.** It scans the project and lists every breach. It must pass.
8. **Check the result with a real theme change.** If a new component only looks right because of one specific theme, it is reading a color it should not.

## Exceptions (the only ones)

- **Sprite colors.** Each theme gives every sprite its own highlight color, as exact codes the user chose (`sprites` in each theme in `lib/theme/themes.ts`). They do not have to be palette colors. They are used only for that sprite: its highlight on the page and the tint of its white art.
- **Highlights drawn over page text.** The CSS Custom Highlight API (`::highlight()`) accepts only a plain color, not a filter, and the page's text has to stay readable under it. So a highlight is the sprite's color plus transparency (the exact color followed by `99` in `lib/engine/highlights.ts`). Nothing else uses transparency.
- **Shadows need no exception.** The `shadow` token is the darkest background, and a blur already fades a shadow out.
- **Sprite and frog images** are drawn as they are: the art is colored already. Only white art (the `uncolored-*` files and all of the Minimal theme's shapes) is tinted with the sprite's own color (see "Sprite colors and tinting art" below).
- `transparent`, `inherit` and `currentColor` are allowed because they are not colors of their own.

## How it works

1. `lib/theme/themes.ts` defines each theme: a `palette` (the eight seed colors), a `base` (background and foreground), each with its normal, lighter and darker tone, `tokens` (named roles made from those tones) and `sprites` (each sprite's color, and its grown color if different). It is the only file with color codes.
2. `themeToCss()` turns a theme into CSS custom properties: `--c-<id>`, `--c-<id>-light` and `--c-<id>-dark` for each palette color, `--fo-<token>` for each token, and `--sprite-<type>` and `--sprite-<type>-grown` for each sprite.
3. `watchTheme(target)` (in `lib/theme/apply.ts`) puts those properties on the page: on `:host` inside the on-page Shadow DOM, and on `:root` in the viewer. It reads the saved choice (`Settings.theme`) and updates when it changes, in every tab.
4. Styles then use only the variables:
   - On-page CSS (`lib/onpage-ui/toolbar.css`): `background: var(--fo-surface)`.
   - Viewer (Tailwind): the tokens have Tailwind names in `entrypoints/viewer/style.css`, so `bg-surface`, `text-ink`, `border-edge`. Tailwind's own color names are switched off there.
   - Code that needs a real color value (drawing page highlights): `spriteColorHex(type, grown, themeId)` or `colorHex(id, themeId)` from `lib/theme`.
   - A sprite's color in a component: `spriteColorVar(type, grown)`, which is `var(--sprite-<type>)` and follows the theme by itself.
   - Code that needs the theme id itself: `useThemeId()` (a React hook) or `watchThemeId(callback)` from `lib/theme`.
   - A seed's color in a component: `style={{ background: 'var(--c-' + seed.color + ')' }}`.

## The tokens

| Token | Used for |
| --- | --- |
| `page` | Viewer page background (darkest background) |
| `surface` | Cards, buttons and chips (lighter background) |
| `surface-alt` | Toolbar card, rows, the graph canvas, the scroll rail (darkest background) |
| `ink`, `ink-muted` | Text: the foreground and the darker foreground |
| `edge` | Borders and dividers (lighter background) |
| `primary` | The main color: headers, links, selected items |
| `primary-strong` | Pressed or hovered primary |
| `primary-ink` | Text that sits on `primary` |
| `primary-soft` | Hover and selected backgrounds (lighter background, made brighter with a filter) |
| `accent` | Small highlights (green, the same as `primary`) |
| `flash` | The orange glow around a sprite on the page after you jump to it, which stays and then fades |
| `danger-soft` | Hover on delete buttons |
| `shadow` | Shadows (the darkest background; the blur fades it) |
| `glow` | The faint white glow around the sprites on the scroll rail only (the lightest foreground) |

To restyle one thing, change the token in `themes.ts`. Do not add a one-off color to a component. For a hover state on a button, use `filter: brightness(...)` (rule 4).

## Adding a theme

1. In `lib/theme/themes.ts`, copy `FOREST_THEME`, give it a new `id` and `name`, and change the `tokens` (and the `palette`, `base` and `sprites` codes if the theme has its own colors).
2. Add it to the `THEMES` object.
3. A theme is chosen by saving its `id` in `Settings.theme` with `updateSettings`. Nothing else needs to change.
4. The picker (the "custom style" dropdown) is not built yet. See `BACKLOG.md` A5.

## Sprite colors and tinting art

Each sprite has its own color in each theme, in `sprites` in `lib/theme/themes.ts`. These are exact codes chosen by the user and are allowed even when they are not palette colors (see "Exceptions"). There is no color picker. The color is used for:

- its highlight on the page (`spriteColorHex(type, grown, themeId)`, in `lib/engine/highlights.ts`, the one see-through exception);
- tinting white art (`spriteColorVar(type, grown)`, which reads `--sprite-<type>` or `--sprite-<type>-grown`).

| Sprite | Night Forest | Vibrant Jungle | Minimal Biome (shape) |
| --- | --- | --- | --- |
| `sprout` | `#00B487` (tree too) | `#66CC22` | star `#9582A0`, grown: cloud `#8AA08A` |
| `mushroom` | `#FF0000` | `#FF4433` | red post-it `#B08080` |
| `house` | `#C49A6C` | `#D2A679` | check `#C5A890` |
| `flower` | `#FFEE88` | `#FF9933` | yellow post-it `#A8A078` |
| `cat` | `#CC66FF` | `#BB33AA` | blue post-it `#8290A0` |
| `grass` | `#00B487` | `#66CC22` | exclamation `#B08080` |
| `owl` | `#DD8800` | `#FF7700` | diamond `#82A0A0` |
| `rock` | `#D3D3F3` | `#FFFFA3` | hexagon `#A08298` |
| `lilypad` | `#00B487` | `#66CC22` | triangle `#B09078` |
| `fruitsprout` (apple) | `#FF0000`, tree `#DD8800` | `#FF4433`, tree `#DD5500` | circle `#9582A0` (grown too) |

Night Forest and Vibrant Jungle use the art in `images/`, which is colored already, and `SpriteIcon` (in `lib/theme/SpriteIcon.tsx`) draws it as it is. Art named `uncolored-*` (there, only the tree the sprout grows into) is a black outline with a white fill: `SpriteIcon` draws a layer of the sprite's color cut to its shape (a CSS mask) and multiplies the image on top, so white becomes the color and black stays black.

Minimal Biome draws every sprite as a plain shape from `minimal-icons/` (`MINIMAL_ART` in `lib/theme/index.ts`), all white-filled and so all tinted. The shovel becomes an X (tinted in the theme's red), the grown sprout and the large tree in the graph become a cloud, and forest icons show the shape of the matching sprite. The labels follow the shape ('Star', 'Red note'), from `spriteLabel(type, themeId)`. The diamond, hexagon and check are simple stand-ins drawn in code until real art arrives; replace the files in `minimal-icons/` with the same names.

`SpriteIcon`, `ForestIcon` and `ShovelIcon` read the theme themselves (`useThemeId()`), so callers do not pass it.

The build crops the empty margin off each image (`scripts/trim-art.ts`) so sprites fill their icon box. Art from `images/` is published as `sprites/<file>` and art from `minimal-icons/` as `sprites/minimal/<file>` (`wxt.config.ts`); `artUrl('minimal/<file>')` finds the latter. The originals are not changed.

## Fonts and line boil (teammates are working on these)

Guidance, not final decisions. The same rule applies: no one-off styles in a component.

- **Fonts** are theme tokens like colors. Define them in `lib/theme/themes.ts` (for example `font-body` and `font-title`, used as `var(--fo-font-body)`), so a new theme can change them.
- Ship the font files inside the extension (do not load fonts from a website). Files served into web pages must be listed in `web_accessible_resources` in `wxt.config.ts`.
- `@font-face` rules in `lib/onpage-ui/toolbar.css` are moved out of the Shadow DOM into the page automatically by WXT, which is required because a Shadow DOM ignores `@font-face`. Test on a site with a strict content security policy (such as GitHub) in case it blocks the font files.
- **Line boil** (the lines of the art wobbling) should be applied to the outer wrapper in `SpriteIcon` (`lib/theme/SpriteIcon.tsx`), so the outline and the tint layer move together. Respect `prefers-reduced-motion`.

