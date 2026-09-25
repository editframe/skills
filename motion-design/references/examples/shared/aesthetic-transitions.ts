import type { Aesthetic } from "./aesthetic-settings";
import type { TransitionKind } from "./transition-compositor";
export type AestheticTransition = "authored" | TransitionKind;
export const TRANSITION_CHOICES: { value: AestheticTransition; label: string }[] = [
  { value: "authored", label: "Preset transition" },
  { value: "cut", label: "Cut" },
  { value: "dissolve", label: "Dissolve" },
  { value: "push", label: "Push" },
  { value: "rise", label: "Rise" },
  { value: "iris", label: "Iris" },
  { value: "blinds", label: "Blinds" },
  { value: "zoom", label: "Zoom" },
  { value: "blur", label: "Defocus" },
  { value: "foreground", label: "Foreground sweep" },
  { value: "luma", label: "Luma reveal" },
  { value: "rings", label: "Ring scan" },
  { value: "liquid", label: "Liquid flow" },
  { value: "paper", label: "Paper tear" },
  { value: "blocks", label: "Pixel replacement" },
  { value: "cards", label: "Tile flip" },
  { value: "smear", label: "Band smear" },
  { value: "warp", label: "Displacement" },
];
export const AESTHETIC_TRANSITION_PROFILES: Record<
  Aesthetic,
  { kind: TransitionKind | "cover"; duration: number; label: string; reason: string; study: string }
> = {
  swiss: {
    kind: "cover",
    duration: 0.95,
    label: "Signal-red sweep",
    reason: "A firm red plane carries the poster grid across the edit.",
    study: "color-block-wipe",
  },
  goth: {
    kind: "cover",
    duration: 0.95,
    label: "Closing curtains",
    reason: "Dark curtains and a wine-red seam preserve the theatrical pause.",
    study: "horizontal-panel-wipe",
  },
  stone: {
    kind: "cover",
    duration: 0.95,
    label: "Rising slabs",
    reason: "Heavy segmented planes continue the stacked stone forms.",
    study: "horizontal-panel-wipe",
  },
  memphis: {
    kind: "cards",
    duration: 1.15,
    label: "Playful tile turnover",
    reason:
      "A staggered flip carries the patchwork colors and toy-like surfaces into the next scene.",
    study: "card-flip-transition",
  },
  instrument: {
    kind: "rings",
    duration: 1.2,
    label: "Calibrated ring scan",
    reason: "A concentric reveal compares two plates through the same instrument center.",
    study: "circular-bloom-wipe",
  },
  organic: {
    kind: "liquid",
    duration: 1.5,
    label: "Continuous liquid flow",
    reason:
      "An uneven flowing boundary carries the soft, breathing forms directly into the next scene.",
    study: "liquid-scene-flow",
  },
  terminal: {
    kind: "blocks",
    duration: 0.8,
    label: "Pixel replacement",
    reason:
      "Discrete screen cells are replaced in a fixed order, extending the memory and assembly motifs.",
    study: "pixel-scene-replacement",
  },
  optical: {
    kind: "luma",
    duration: 1.25,
    label: "Contour threshold",
    reason:
      "Interlocking regions exchange figure and ground while both geometric fields remain visible.",
    study: "luma-contour-reveal",
  },
  vaporwave: {
    kind: "smear",
    duration: 1.15,
    label: "Horizontal band smear",
    reason: "Stretched horizontal bands turn the scene change into a brief display disturbance.",
    study: "band-smear-handoff",
  },
  edwardian: {
    kind: "paper",
    duration: 1.3,
    label: "Paper edge reveal",
    reason:
      "A lightly torn paper edge and measured stepped motion carry the printed keepsake into its next arrangement.",
    study: "paper-tear-reveal",
  },
  beach: {
    kind: "liquid",
    duration: 1.5,
    label: "Tidal scene reveal",
    reason: "The incoming shore washes down behind a broad, uneven wave front.",
    study: "liquid-scene-flow",
  },
  glass: {
    kind: "warp",
    duration: 1.4,
    label: "Refractive displacement",
    reason:
      "A traveling distortion bends the outgoing and incoming arrangements before settling clear.",
    study: "displacement-handoff",
  },
};
