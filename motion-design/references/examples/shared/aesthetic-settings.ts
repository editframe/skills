import {
  AESTHETIC_TRANSITION_PROFILES,
  TRANSITION_CHOICES,
  type AestheticTransition,
} from "./aesthetic-transitions";
import { isAestheticFont, type AestheticFont } from "./aesthetic-fonts";
import { DEFAULT_SHIFT, type PaletteShift } from "./aesthetic-palette";
export type Aesthetic =
  | "swiss"
  | "memphis"
  | "instrument"
  | "organic"
  | "terminal"
  | "optical"
  | "vaporwave"
  | "goth"
  | "edwardian"
  | "beach"
  | "stone"
  | "glass";
export type AestheticSettings = {
  palette: string[];
  font: AestheticFont;
  colorShift: PaletteShift;
  speed: number;
  transition: AestheticTransition;
  labels: boolean;
};
export const AESTHETIC_PALETTES: Record<Aesthetic, string[]> = {
  vaporwave: ["#40216d", "#fff2f5", "#fa83cb", "#74edf0"],
  goth: ["#100b10", "#f2e8d7", "#822c42", "#b5b0bb"],
  edwardian: ["#f5ecd9", "#3e503a", "#ae8d52", "#bd8390"],
  beach: ["#f1d4b0", "#174f54", "#ef8768", "#fff9e9"],
  stone: ["#d5c8b4", "#39342e", "#eee6d6", "#92826e"],
  glass: ["#dceafb", "#173662", "#ffffff", "#7896d8"],
  swiss: ["#ed321f", "#161616", "#fff9ec", "#f8ad9f"],
  memphis: ["#2542eb", "#181317", "#ff80bf", "#ff6339", "#ffe433", "#60e7bb"],
  instrument: ["#f3e8ce", "#42392c", "#a36f49", "#58767a"],
  organic: ["#281414", "#fff3d1", "#9f4b30", "#edc284"],
  terminal: ["#160f08", "#ffba51", "#d8943b", "#765329"],
  optical: ["#ffffff", "#101010"],
};
export const defaultAestheticSettings = (kind: Aesthetic): AestheticSettings => ({
  palette: [...AESTHETIC_PALETTES[kind]],
  font: "preset",
  colorShift: { ...DEFAULT_SHIFT },
  speed: 1,
  transition: "authored",
  labels: false,
});
/** Persisted browser state is optional and must never prevent the editor opening. */
export function restoreAestheticSettings(kind: Aesthetic, value: unknown): AestheticSettings {
  const defaults = defaultAestheticSettings(kind);
  if (!value || typeof value !== "object") return defaults;
  const saved = value as Partial<AestheticSettings>;
  return {
    palette: defaults.palette.map((color, i) =>
      typeof saved.palette?.[i] === "string" && /^#[0-9a-f]{6}$/i.test(saved.palette[i])
        ? saved.palette[i]
        : color,
    ),
    font: isAestheticFont(saved.font) ? saved.font : defaults.font,
    colorShift: {
      hue: bounded(saved.colorShift?.hue, -180, 180, 0),
      saturation: bounded(saved.colorShift?.saturation, 0, 180, 100),
      lightness: bounded(saved.colorShift?.lightness, -20, 20, 0),
    },
    speed:
      typeof saved.speed === "number" && Number.isFinite(saved.speed)
        ? Math.max(0.5, Math.min(2, saved.speed))
        : 1,
    transition: TRANSITION_CHOICES.some((t) => t.value === saved.transition)
      ? saved.transition!
      : defaults.transition,
    labels: typeof saved.labels === "boolean" ? saved.labels : false,
  };
}

function bounded(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

/** The chapter indicator follows the dominant scene halfway through the selected handoff. */
export function aestheticTiming(kind: Aesthetic, transition: AestheticTransition = "authored") {
  const profile = AESTHETIC_TRANSITION_PROFILES[kind],
    mode = transition === "authored" ? profile.kind : transition;
  const duration =
    mode === "cut"
      ? 0
      : mode === "cover"
        ? 0.95
        : transition === "authored"
          ? profile.duration
          : 1.2;
  return { duration, lead: mode === "cover" ? 0.475 : duration };
}
export function aestheticSceneAt(
  time: number,
  transition: AestheticTransition = "authored",
  kind: Aesthetic = "vaporwave",
) {
  const local = ((time % 18) + 18) % 18,
    { duration } = aestheticTiming(kind, transition);
  return (Math.floor(local / 6) + (duration > 0 && local % 6 >= 6 - duration / 2 ? 1 : 0)) % 3;
}
