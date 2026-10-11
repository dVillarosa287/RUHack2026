// Theme definitions. This is the ONLY file in the project allowed to contain color codes.
// Rules and how to add a theme: docs/THEME.md.

export interface ThemeColor {
  id: string;
  name: string;
  /** The normal color. */
  hex: string;
  /** The lighter color, given by the palette (not computed). */
  light: string;
  /** The darker color, given by the palette (not computed). */
  dark: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  /** The eight colors a seed can have. Seeds store a color `id`, so a theme can change a hex code without touching saved data. */
  palette: ThemeColor[];
  /** The two base colors every surface and text color is made from. They are not seed colors. */
  base: ThemeColor[];
  /**
   * Named roles for styling (page background, text, borders, ...), written as CSS values.
   * They may only use a palette color in one of its three tones (`color`). No gradients.
   * Components use them as var(--fo-<name>).
   */
  tokens: Record<string, string>;
}

type Tone = "normal" | "light" | "dark";

/** Reference to a palette color as a CSS value. The normal tone is `--c-<id>`, the others are `--c-<id>-light` and `--c-<id>-dark`. */
const color = (id: string, tone: Tone = "normal") =>
  `var(--c-${id}${tone === "normal" ? "" : `-${tone}`})`;

export const FOREST_THEME: ThemeDefinition = {
  id: "forest",
  name: "Night Forest",
  palette: [
    {
      id: "red",
      name: "Red",
      hex: "#FF5555",
      light: "#FF7777",
      dark: "#DD3333",
    },
    {
      id: "orange",
      name: "Orange",
      hex: "#FFAA00",
      light: "#FFCC33",
      dark: "#DD8800",
    },
    {
      id: "yellow",
      name: "Yellow",
      hex: "#FFEE88",
      light: "#FFF5B8",
      dark: "#E0D178",
    },
    {
      id: "green",
      name: "Green",
      hex: "#00CC99",
      light: "#66E0C2",
      dark: "#00B487",
    },
    {
      id: "blue",
      name: "Blue",
      hex: "#0099FF",
      light: "#66C2FF",
      dark: "#0087E0",
    },
    {
      id: "cyan",
      name: "Cyan",
      hex: "#00FFEE",
      light: "#66FFF5",
      dark: "#00E0D1",
    },
    {
      id: "purple",
      name: "Purple",
      hex: "#AA00FF",
      light: "#CC66FF",
      dark: "#9600E0",
    },
    {
      id: "magenta",
      name: "Magenta",
      hex: "#FF00CC",
      light: "#FF66E0",
      dark: "#E000B4",
    },
  ],
  base: [
    {
      id: "background",
      name: "Background",
      hex: "#22223F",
      light: "#25254A",
      dark: "#18182A",
    },
    {
      id: "foreground",
      name: "Foreground",
      hex: "#EAEAFF",
      light: "#FFFFFF",
      dark: "#D3D3F3",
    },
  ],
  tokens: {
    // Surfaces use the Background colors only, text uses the Foreground colors only (nothing is mixed)
    page: color("background", "dark"),
    surface: color("background", "light"),
    "surface-alt": color("background", "dark"),
    ink: color("foreground"),
    "ink-muted": color("foreground", "dark"),
    edge: color("background", "light"),
    // Main color: green, with the darkest background as text on it
    primary: color("green"),
    "primary-strong": color("green", "dark"),
    "primary-ink": color("background", "dark"),
    // Hover and selected fills are the lighter background, brightened with a filter (see viewer/style.css and toolbar.css)
    "primary-soft": color("background", "light"),
    // Smaller accents
    accent: color("green"),
    // The glow around a sprite you just jumped to
    flash: color("orange"),
    "danger-soft": color("red", "dark"),
    // Shadows are the darkest background; the blur already fades them out, so they need no transparency
    shadow: color("background", "dark"),
    // The faint glow around sprites
    glow: color("foreground", "light"),
  },
};

export const JUNGLE_THEME: ThemeDefinition = {
  id: "jungle",
  name: "Vibrant Jungle",
  palette: [
    {
      id: "red",
      name: "Red",
      hex: "#FB4934", // Saturated Gruvbox Red
      light: "#FF5D47",
      dark: "#CC241D",
    },
    {
      id: "orange",
      name: "Orange",
      hex: "#FE8019", // Warm Amber-Orange
      light: "#FF9838",
      dark: "#D65D0E",
    },
    {
      id: "yellow",
      name: "Yellow",
      hex: "#FABD2F", // Rich Gruvbox Yellow
      light: "#FFCE52",
      dark: "#D79921",
    },
    {
      id: "green",
      name: "Green",
      hex: "#B8BB26", // Deep Olive/Jungle Green
      light: "#D5D83D",
      dark: "#98971A",
    },
    {
      id: "blue",
      name: "Blue",
      hex: "#076678", // Muted Warm Petrol Teal (Desaturated & Toned Down)
      light: "#427B58",
      dark: "#04434F",
    },
    {
      id: "cyan",
      name: "Cyan",
      hex: "#8EC07C", // Aqua/Sage Green accent (Shifted away from vibrant cyan)
      light: "#A9D697",
      dark: "#689D6A",
    },
    {
      id: "purple",
      name: "Purple",
      hex: "#D3869B", // Earthy Warm Purple/Magenta
      light: "#E39AA1",
      dark: "#B16286",
    },
    {
      id: "magenta",
      name: "Magenta",
      hex: "#EA698B", // Saturated Warm Crimson-Pink
      light: "#FF82A2",
      dark: "#C03E61",
    },
  ],
  base: [
    {
      id: "background",
      name: "Background",
      hex: "#282828", // Gruvbox Dark Neutral
      light: "#3C3836", // Soft Warm Surface
      dark: "#1D2021", // Hard Dark Background
    },
    {
      id: "foreground",
      name: "Foreground",
      hex: "#FBF1C7", // Warm Ivory/Cream
      light: "#FFFFE3",
      dark: "#EBDBB2",
    },
  ],
  tokens: {
    // Surfaces use the Background colors only, text uses the Foreground colors only (nothing is mixed)
    page: color("background", "dark"),
    surface: color("background", "light"),
    "surface-alt": color("background", "dark"),
    ink: color("foreground"),
    "ink-muted": color("foreground", "dark"),
    edge: color("background", "light"),
    // Main color: green, with the darkest background as text on it
    primary: color("green"),
    "primary-strong": color("green", "dark"),
    "primary-ink": color("background", "dark"),
    // Hover and selected fills are the lighter background, brightened with a filter
    "primary-soft": color("background", "light"),
    // Smaller accents
    accent: color("green"),
    // The glow around a sprite you just jumped to
    flash: color("orange"),
    "danger-soft": color("red", "dark"),
    // Shadows are the darkest background; the blur already fades them out, so they need no transparency
    shadow: color("background", "dark"),
    // The faint glow around sprites
    glow: color("foreground", "light"),
  },
};

export const THEMES: Record<string, ThemeDefinition> = {
  [FOREST_THEME.id]: FOREST_THEME,
  [JUNGLE_THEME.id]: JUNGLE_THEME,
};

export const DEFAULT_THEME_ID = JUNGLE_THEME.id;

/** Unknown ids fall back to the default theme, so a bad saved value can never break the UI. */
export function getTheme(id: string): ThemeDefinition {
  return THEMES[id] ?? THEMES[DEFAULT_THEME_ID]!;
}

/** The CSS that defines a theme's palette and tokens as custom properties on `selector`. */
export function themeToCss(theme: ThemeDefinition, selector: string): string {
  console.log(theme.id);
  const lines = [
    ...[...theme.palette, ...theme.base].flatMap((c) => [
      `  --c-${c.id}: ${c.hex};`,
      `  --c-${c.id}-light: ${c.light};`,
      `  --c-${c.id}-dark: ${c.dark};`,
    ]),
    ...Object.entries(theme.tokens).map(
      ([name, value]) => `  --fo-${name}: ${value};`,
    ),
  ];
  console.table(lines);
  return `${selector} {\n${lines.join("\n")}\n}`;
}
