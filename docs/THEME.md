# Theme system

Every color in the product comes from one palette. Themes are chosen by the user (today there is one, "Forest"). This file holds the rules. The code is in `lib/theme/`. `CLAUDE.md` links here, and every role follows it.

## The palette

| id | Name | Exact color |
| --- | --- | --- |
| `red` | Red | `#FF5555` |
| `orange` | Orange | `#FFAA00` |
| `yellow` | Yellow | `#FFEE88` |
| `green` | Green | `#00CC99` |
| `blue` | Blue | `#0099FF` |
| `cyan` | Cyan | `#00FFEE` |
| `purple` | Purple | `#AA00FF` |
| `magenta` | Magenta | `#FF00CC` |

Seeds store a color `id` (for example `green`), never the code, so a theme can change a code without touching saved data.

## The rules

1. **Only palette colors.** Every color anywhere in the product (on-page toolbar, markers, viewer, popups, anything added later) is a palette color exactly as it is, **or** a palette color made brighter or darker, **or** a gradient made of those.
2. **Brighter and darker** is done with the `shade(id, factor)` helper in `lib/theme/themes.ts`. It scales the color's lightness and keeps its hue and strength (`oklch(from var(--c-green) calc(l * 0.66) c h)`). A factor under 1 darkens, over 1 brightens. This is the CSS equivalent of a brighten or darken filter, and unlike `filter: brightness()` it can be used on backgrounds, borders and text without also changing everything inside the element.
3. **Gradients** are written as `linear-gradient(...)` of palette colors and shades, as theme tokens (`grad-primary`, `grad-surface`).
4. **No color codes outside `lib/theme/themes.ts`.** No hex codes, `rgb()`, `hsl()`, color keywords such as `white`, or stock Tailwind color classes such as `bg-red-100` or `text-white`, in any CSS, TypeScript or HTML file. Use a token instead.
5. **Run `npm run check:theme` before you finish a session.** It scans the project and lists every breach. It must pass.
6. **Check the result with a real theme change.** If a new component only looks right because of one specific theme, it is reading a color it should not.

## Exceptions (the only ones)

- **See-through colors.** Shadows, and highlights drawn over page text, are a palette color with transparency (`fade()` in the theme, or the exact color plus `99` in `lib/engine/highlights.ts`). The page's text has to stay readable under a highlight.
- **Emoji and sprite images** carry their own colors until the real art is tinted (see "Tinting art" below).
- `transparent`, `inherit` and `currentColor` are allowed because they are not colors of their own.

## How it works

1. `lib/theme/themes.ts` defines each theme: a `palette` (the exact colors) and `tokens` (named roles written with `shade`, `fade` and gradients). It is the only file with color codes.
2. `themeToCss()` turns a theme into CSS custom properties: `--c-<id>` for each palette color and `--fo-<token>` for each token.
3. `watchTheme(target)` (in `lib/theme/apply.ts`) puts those properties on the page: on `:host` inside the on-page Shadow DOM, and on `:root` in the viewer. It reads the saved choice (`Settings.theme`) and updates when it changes, in every tab.
4. Styles then use only the variables:
   - On-page CSS (`lib/onpage-ui/toolbar.css`): `background: var(--fo-surface)`.
   - Viewer (Tailwind): the tokens have Tailwind names in `entrypoints/viewer/style.css`, so `bg-surface`, `text-ink`, `border-edge`. Tailwind's own color names are switched off there.
   - Code that needs a real color value (drawing page highlights): `colorHex(id)` from `lib/theme`.
   - A seed's color in a component: `style={{ background: 'var(--c-' + seed.color + ')' }}`.

## The tokens

| Token | Used for |
| --- | --- |
| `page` | Viewer page background |
| `surface`, `surface-alt` | Cards, panels, fields, rows |
| `ink`, `ink-muted` | Text, and quieter text |
| `edge` | Borders and dividers |
| `primary` | The main color: headers, links, selected items |
| `primary-strong` | Pressed or hovered primary |
| `primary-ink` | Text that sits on `primary` |
| `primary-soft` | Hover and selected backgrounds |
| `accent` | Small highlights, such as the flash when jumping to a seed |
| `danger-soft` | Hover on delete buttons |
| `shadow` | Shadows (see-through) |
| `grad-primary`, `grad-surface` | Gradients for headers and panels |

To restyle one thing, change the token in `themes.ts`. Do not add a one-off color to a component.

## Adding a theme

1. In `lib/theme/themes.ts`, copy `FOREST_THEME`, give it a new `id` and `name`, and change the `tokens` (and the `palette` codes if the theme has its own palette).
2. Add it to the `THEMES` object.
3. A theme is chosen by saving its `id` in `Settings.theme` with `updateSettings`. Nothing else needs to change.
4. The picker (the "custom style" dropdown) is not built yet. See `BACKLOG.md` A5.

## Tinting art

The line-art sprites in `images/` are uncolored (black lines). When they are wired in, tint them with the palette: draw the image as a CSS `mask-image` on an element whose `background` is the seed's color (`var(--c-<id>)`, optionally shaded). That keeps the art inside this system with no extra files per color.
