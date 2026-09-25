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
export const NIGHT = "#0b0b0d";
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

export const EASE = {
  outCubic: "cubic-bezier(0.33,1,0.68,1)",
  inCubic: "cubic-bezier(0.32,0,0.67,0)",
  inOutQuad: "cubic-bezier(0.45,0,0.55,1)",
  outBack: "cubic-bezier(0.34,1.56,0.64,1)",
} as const;

export const FONT = {
  sans: "Archivo, Inter, Helvetica Neue, Arial, sans-serif",
  serif: '"Playfair Display", Georgia, Times New Roman, serif',
  ui: "Inter, Helvetica Neue, Arial, sans-serif",
  mono: '"IBM Plex Mono", ui-monospace, monospace',
} as const;

export type ThemeName = "social" | "saas" | "data" | "editorial";

export const THEME = {
  social: {
    background: CORAL,
    color: CREAM,
    muted: "rgba(255,246,232,0.7)",
    fontFamily: FONT.sans,
    displayFamily: FONT.serif,
  },
  saas: {
    background: NIGHT,
    color: "#f4f1ea",
    muted: "rgba(244,241,234,0.55)",
    fontFamily: FONT.ui,
    displayFamily: FONT.ui,
  },
  data: {
    background: "#0e1210",
    color: "#e8f0ea",
    muted: "rgba(232,240,234,0.55)",
    fontFamily: FONT.ui,
    displayFamily: FONT.ui,
  },
  editorial: {
    background: "#14110e",
    color: "#f7f1e6",
    muted: "rgba(247,241,230,0.6)",
    fontFamily: FONT.serif,
    displayFamily: FONT.serif,
  },
} as const;

export function themeFor(aspect: Aspect, family?: string): ThemeName {
  if (family === "social") return "social";
  if (family === "type" || family === "lockup") return "editorial";
  if (family === "data-viz") return "data";
  if (aspect === "portrait") return "social";
  return "saas";
}
