export const PAPER = "#f7f4ee";
export const PANEL = "#efeae0";
export const INK = "#1a1a1a";
export const MUTED = "#6f6860";
export const LINE = "#d4cdc0";
export const ACCENT = "#c41e3a";
export const NAVY = "#1e3a8a";
export const CREAM = "#fff6e8";

export const CORAL = "#e24b3b";
export const CORAL_DEEP = "#b8362c";
export const SEAFOAM = "#7ec8b5";
const NIGHT = "#0b0b0d";
export const NIGHT_RAISE = "#16161b";
export const SELECT = "#5b8cff";
export const SUCCESS = "#3ddc84";
export const GOLD = "#e4c07a";

export const ASPECT = {
  landscape: [1920, 1080],
  portrait: [1080, 1920],
  square: [1080, 1080],
} as const;

export type Aspect = keyof typeof ASPECT;

export const FONT = {
  sans: "Archivo, Inter, Helvetica Neue, Arial, sans-serif",
  serif: '"Playfair Display", Georgia, Times New Roman, serif',
  ui: "Inter, Helvetica Neue, Arial, sans-serif",
  mono: '"IBM Plex Mono", ui-monospace, monospace',
} as const;

export type ThemeName = "social" | "saas" | "data";

export const THEME = {
  social: {
    background: CORAL,
    color: CREAM,
    fontFamily: FONT.sans,
    vignette: 0.28,
  },
  saas: {
    background: NIGHT,
    color: "#f4f1ea",
    fontFamily: FONT.ui,
    vignette: 0.5,
  },
  data: {
    background: "#0e1210",
    color: "#e8f0ea",
    fontFamily: FONT.ui,
    vignette: 0.5,
  },
} as const;

export function themeFor(aspect: Aspect): ThemeName {
  return aspect === "portrait" ? "social" : "saas";
}
