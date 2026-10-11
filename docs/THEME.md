# Theme system

Every color in the product comes from one palette. Themes are chosen by the user (today there is one, "Forest"). This file holds the rules. The code is in `lib/theme/`. `CLAUDE.md` links here, and every role follows it.

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

`background` and `foreground` are the base colors: surfaces and text are made from them. The normal `background` tone (`#3535FF`) and the lighter and darker green, and all the other tones, are not used by any token yet. The eight colors from `red` to `magenta` are the ones a seed can have. Seeds store a color `id` (for example `green`), never the code, so a theme can change a code without touching saved data. A seed always uses the normal tone; the lighter and darker tones are for the interface.

In CSS the three tones of a color are `var(--c-green)`, `var(--c-green-light)` and `var(--c-green-dark)`.

## The rules

1. **Only palette colors.** Every color anywhere in the product (on-page toolbar, markers, viewer, popups, anything added later) is one of the 30 palette colors exactly as given.
2. **No gradients.** Every surface is a flat palette color. Do not write `linear-gradient`, `radial-gradient` or any other gradient.
3. **Backgrounds are Background colors, text is Foreground colors.** Page, panels, cards, buttons and fields use only the three Background tones (`background`, lighter, darker). Text uses only the three Foreground tones. They are never mixed with another color (no green-tinted surfaces, no see-through colors). Green and the other palette colors are for the main color, accents and seed colors.
4. **Anything else is made with CSS filters, and nothing else.** A color that is not in the palette comes from a **CSS filter** on the element (`filter: brightness(1.3)`, `contrast()`, `saturate()`, `hue-rotate()`, `opacity()`). Today this is used for hover and selected states: the element is made brighter with `filter: brightness(...)`. A filter changes everything inside the element, text included, so use it on buttons, chips, icons and sprites, not on a large panel that holds other things.
   Do not compute colors with `color-mix()`, `oklch()`, `hsl()` or relative color syntax.
5. **Pick the tone first.** Before a filter, check whether the lighter or darker tone already does the job (a hover color is usually the darker or lighter tone of the same color).
6. **No color codes outside `lib/theme/themes.ts`.** No hex codes, `rgb()`, `hsl()`, color keywords such as `white`, or stock Tailwind color classes such as `bg-red-100` or `text-white`, in any CSS, TypeScript or HTML file. Use a token instead.
7. **Run `npm run check:theme` before you finish a session.** It scans the project and lists every breach. It must pass.
8. **Check the result with a real theme change.** If a new component only looks right because of one specific theme, it is reading a color it should not.

## Exceptions (the only ones)

- **Highlights drawn over page text.** The CSS Custom Highlight API (`::highlight()`) accepts only a plain color, not a filter, and the page's text has to stay readable under it. So a highlight is the palette color's normal tone plus transparency (the exact color followed by `99` in `lib/engine/highlights.ts`). Nothing else uses transparency.
- **Shadows need no exception.** The `shadow` token is the darkest background, and a blur already fades a shadow out.
- **Sprite and frog images** are black outlines with a white fill. Their outline stays black, and the fill is tinted with a palette color (see "Tinting art" below). Forest icons and the shovel are drawn untinted.
- `transparent`, `inherit` and `currentColor` are allowed because they are not colors of their own.

## How it works

1. `lib/theme/themes.ts` defines each theme: a `palette` (the eight seed colors), a `base` (background and foreground), each with its normal, lighter and darker tone, and `tokens` (named roles made from those tones). It is the only file with color codes.
2. `themeToCss()` turns a theme into CSS custom properties: `--c-<id>`, `--c-<id>-light` and `--c-<id>-dark` for each palette color and `--fo-<token>` for each token.
3. `watchTheme(target)` (in `lib/theme/apply.ts`) puts those properties on the page: on `:host` inside the on-page Shadow DOM, and on `:root` in the viewer. It reads the saved choice (`Settings.theme`) and updates when it changes, in every tab.
4. Styles then use only the variables:
   - On-page CSS (`lib/onpage-ui/toolbar.css`): `background: var(--fo-surface)`.
   - Viewer (Tailwind): the tokens have Tailwind names in `entrypoints/viewer/style.css`, so `bg-surface`, `text-ink`, `border-edge`. Tailwind's own color names are switched off there.
   - Code that needs a real color value (drawing page highlights): `colorHex(id)` from `lib/theme`.
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

1. In `lib/theme/themes.ts`, copy `FOREST_THEME`, give it a new `id` and `name`, and change the `tokens` (and the `palette` and `base` codes if the theme has its own palette).
2. Add it to the `THEMES` object.
3. A theme is chosen by saving its `id` in `Settings.theme` with `updateSettings`. Nothing else needs to change.
4. The picker (the "custom style" dropdown) is not built yet. See `BACKLOG.md` A5.

## Tinting art

The sprites in `images/` are black outlines with a white fill. `SpriteIcon` (in `lib/theme/SpriteIcon.tsx`) colors the fill with a palette color: it draws a layer of that color cut to the sprite's shape (a CSS mask), then multiplies the image on top, so white becomes the color and black stays black. The color is a palette id such as `green`, which becomes `var(--c-green)`. No extra image files are needed for each color, and a new theme recolors every sprite.

Pass `color` to tint: `<SpriteIcon type="mushroom" color={seed.color} />`. Without `color` the sprite is drawn white.

The build crops the empty margin off each image (`scripts/trim-art.ts`) so sprites fill their icon box. The originals in `images/` are not changed.

## Fonts and line boil (teammates are working on these)

Guidance, not final decisions. The same rule applies: no one-off styles in a component.

- **Fonts** are theme tokens like colors. Define them in `lib/theme/themes.ts` (for example `font-body` and `font-title`, used as `var(--fo-font-body)`), so a new theme can change them.
- Ship the font files inside the extension (do not load fonts from a website). Files served into web pages must be listed in `web_accessible_resources` in `wxt.config.ts`.
- `@font-face` rules in `lib/onpage-ui/toolbar.css` are moved out of the Shadow DOM into the page automatically by WXT, which is required because a Shadow DOM ignores `@font-face`. Test on a site with a strict content security policy (such as GitHub) in case it blocks the font files.
- **Line boil** (the lines of the art wobbling) should be applied to the outer wrapper in `SpriteIcon` (`lib/theme/SpriteIcon.tsx`), so the outline and the tint layer move together. Respect `prefers-reduced-motion`.

