// Theme definitions. This is the ONLY file in the project allowed to contain color codes.
// Rules and how to add a theme: docs/THEME.md.

export interface ThemeColor {
  id: string;
  name: string;
  hex: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  /** The exact colors. Seeds store a color `id`, so a theme can change a hex code without touching saved data. */
  palette: ThemeColor[];
  /**
   * Named roles for styling (page background, text, borders, ...), written as CSS values.
   * They may only use a palette color as it is, a palette color made brighter or darker with
   * the `shade` helper, a see-through version of one (`fade`), or a gradient of those.
   * Components use them as var(--fo-<name>).
   */
  tokens: Record<string, string>;
}

/** Reference to a palette color as a CSS value. */
const color = (id: string) => `var(--c-${id})`;

/** A palette color made brighter (factor above 1) or darker (factor below 1). Same hue, same strength of color. */
const shade = (id: string, factor: number) => `oklch(from ${color(id)} calc(l * ${factor}) c h)`;

/** A see-through version of a palette color. Only for shadows, and for highlights that sit over text. */
const fade = (id: string, factor: number, alpha: number) => `oklch(from ${color(id)} calc(l * ${factor}) c h / ${alpha})`;

export const FOREST_THEME: ThemeDefinition = {
  id: 'forest',
  name: 'Forest',
  palette: [
    { id: 'red', name: 'Red', hex: '#FF5555' },
    { id: 'orange', name: 'Orange', hex: '#FFAA00' },
    { id: 'yellow', name: 'Yellow', hex: '#FFEE88' },
    { id: 'green', name: 'Green', hex: '#00CC99' },
    { id: 'blue', name: 'Blue', hex: '#0099FF' },
    { id: 'cyan', name: 'Cyan', hex: '#00FFEE' },
    { id: 'purple', name: 'Purple', hex: '#AA00FF' },
    { id: 'magenta', name: 'Magenta', hex: '#FF00CC' },
  ],
  tokens: {
    // Surfaces: deep forest greens, from the green darkened
    page: shade('green', 0.2),
    surface: shade('green', 0.32),
    'surface-alt': shade('green', 0.26),
    // Text and lines: cream from the yellow, brown from the orange darkened
    ink: color('yellow'),
    'ink-muted': shade('yellow', 0.78),
    edge: shade('orange', 0.55),
    // Main color: the palette green itself, with dark text on it
    primary: color('green'),
    'primary-strong': shade('green', 0.85),
    'primary-ink': shade('green', 0.18),
    'primary-soft': shade('green', 0.5),
    // Smaller accents
    accent: color('orange'),
    'danger-soft': shade('red', 0.55),
    shadow: fade('green', 0.05, 0.55),
    // Gradients
    'grad-primary': `linear-gradient(${color('green')}, ${shade('green', 0.82)})`,
    'grad-surface': `linear-gradient(${shade('green', 0.36)}, ${shade('green', 0.28)})`,
  },
};

export const THEMES: Record<string, ThemeDefinition> = { [FOREST_THEME.id]: FOREST_THEME };

export const DEFAULT_THEME_ID = FOREST_THEME.id;

/** Unknown ids fall back to the default theme, so a bad saved value can never break the UI. */
export function getTheme(id: string): ThemeDefinition {
  return THEMES[id] ?? FOREST_THEME;
}

/** The CSS that defines a theme's palette and tokens as custom properties on `selector`. */
export function themeToCss(theme: ThemeDefinition, selector: string): string {
  const lines = [
    ...theme.palette.map((c) => `  --c-${c.id}: ${c.hex};`),
    ...Object.entries(theme.tokens).map(([name, value]) => `  --fo-${name}: ${value};`),
  ];
  return `${selector} {\n${lines.join('\n')}\n}`;
}
