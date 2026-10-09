import { memo, useCallback } from "react";
import { Timegroup } from "@editframe/react";
import type { EFTimegroupElement } from "@editframe/elements";
import { ASPECT, type Aspect } from "../../src/primitives";
import { compositeTransition, type TransitionEffect } from "./transition-compositor";
import type { AestheticFont } from "./aesthetic-fonts";
import { shiftPalette, type PaletteShift } from "./aesthetic-palette";
import { ease, rect, withPaint, type C } from "./canvas-paint";

/** Paints one scene at scene time `t` on a frame 1200 units wide and `h` units tall. */
export type ScenePainter = (c: C, h: number, t: number, palette: string[]) => void;
/**
 * Paints a full-frame cover at handoff progress `q`. `coverage` rises to 1 at the
 * midpoint, where the scenes swap underneath, and falls back to 0.
 */
export type CoverPainter = (
  c: C,
  h: number,
  q: number,
  coverage: number,
  palette: string[],
) => void;
/** The incoming scene overlaps the outgoing one for `duration` seconds before each boundary. */
export type SceneHandoff = { effect: TransitionEffect; duration: number };
type AestheticHandoff = {
  label: string;
  reason: string;
  /** Catalog study that demonstrates the same handoff. */
  study: string;
} & ({ cover: CoverPainter } | SceneHandoff);
export type AestheticLook = {
  palette: string[];
  scenes: readonly [ScenePainter, ScenePainter, ScenePainter];
  handoff: AestheticHandoff;
  /** Decorative framing, drawn over each scene when labels are on. */
  labels?: (c: C, h: number, scene: number, palette: string[]) => void;
  /** Assets every frame waits for before painting. */
  prepare?: () => Promise<unknown>;
  /** Paint scenes on a persistent offscreen raster, for scenes that sample their own pixels. */
  stableRaster?: boolean;
};
/** Viewer adjustments applied on top of a look. */
export type AestheticOverride = {
  palette: string[];
  colorShift: PaletteShift;
  font: AestheticFont;
  speed: number;
  /** Replaces the look's authored handoff. */
  transition?: SceneHandoff | "cut";
  labels: boolean;
  /** Assets every frame waits for before painting, such as the chosen font. */
  prepare?: () => Promise<unknown>;
};

const LOOP = 18,
  SCENE = 6,
  COVER = 0.95;
/** The chapter indicator follows the dominant scene halfway through the selected handoff. */
export function handoffTiming(look: AestheticLook, override?: AestheticOverride) {
  const handoff = override?.transition ?? look.handoff;
  if (handoff === "cut") return { duration: 0, lead: 0 };
  if ("cover" in handoff) return { duration: COVER, lead: COVER / 2 };
  return { duration: handoff.duration, lead: handoff.duration };
}
export function sceneAt(look: AestheticLook, time: number, override?: AestheticOverride) {
  const local = ((time % LOOP) + LOOP) % LOOP,
    { duration } = handoffTiming(look, override);
  return (
    (Math.floor(local / SCENE) + (duration > 0 && local % SCENE >= SCENE - duration / 2 ? 1 : 0)) %
    3
  );
}

const rasterSurfaces = new WeakMap<C, HTMLCanvasElement>();
const transitionCanvases = new WeakMap<C, [HTMLCanvasElement, HTMLCanvasElement]>();
function paintScene(
  c: C,
  width: number,
  height: number,
  look: AestheticLook,
  palette: string[],
  index: number,
  at: number,
  override?: AestheticOverride,
) {
  if (!look.stableRaster) {
    paintSceneDirect(c, width, height, look, palette, index, at, override);
    return;
  }
  // Texture sampling stays on one stable raster backend even when the editor
  // canvas is read back, resized, or reused for an original graphic study.
  let surface = rasterSurfaces.get(c);
  if (!surface) {
    surface = document.createElement("canvas");
    rasterSurfaces.set(c, surface);
  }
  if (surface.width !== width) surface.width = width;
  if (surface.height !== height) surface.height = height;
  paintSceneDirect(
    surface.getContext("2d", { willReadFrequently: true })!,
    width,
    height,
    look,
    palette,
    index,
    at,
    override,
  );
  c.drawImage(surface, 0, 0);
}
function paintSceneDirect(
  c: C,
  width: number,
  height: number,
  look: AestheticLook,
  palette: string[],
  index: number,
  at: number,
  override?: AestheticOverride,
) {
  withPaint(c, override, () => {
    c.save();
    try {
      c.scale(width / 1200, width / 1200);
      const h = (height / width) * 1200;
      rect(c, 0, 0, 1200, h, palette[0]!);
      look.scenes[index]!(c, h, at, palette);
      if (override?.labels === true) look.labels?.(c, h, index, palette);
    } finally {
      c.restore();
    }
  });
}
function paintAesthetic(
  c: C,
  width: number,
  height: number,
  look: AestheticLook,
  time: number,
  override?: AestheticOverride,
  isolatedScene?: number,
) {
  const palette = override ? shiftPalette(override.palette, override.colorShift) : look.palette;
  const t = ((time % LOOP) + LOOP) % LOOP,
    base = isolatedScene ?? Math.floor(t / SCENE),
    local = t % SCENE;
  if (isolatedScene !== undefined) {
    paintScene(c, width, height, look, palette, base, local, override);
    return;
  }
  const handoff = override?.transition ?? look.handoff;
  // Covers keep their established midpoint handoff.
  if (handoff !== "cut" && "cover" in handoff) {
    const q = (local - 5.05) / COVER,
      index = q >= 0.5 ? (base + 1) % 3 : base,
      at = q >= 0.5 ? local - 5.525 : local + 0.475;
    paintScene(c, width, height, look, palette, index, at, override);
    if (q > 0) {
      c.save();
      try {
        c.scale(width / 1200, width / 1200);
        handoff.cover(
          c,
          (height / width) * 1200,
          q,
          q < 0.5 ? ease(q * 2) : ease((1 - q) * 2),
          palette,
        );
      } finally {
        c.restore();
      }
    }
    return;
  }
  if (handoff === "cut") {
    paintScene(c, width, height, look, palette, base, local, override);
    return;
  }
  const { effect, duration } = handoff,
    start = SCENE - duration,
    q = (local - start) / duration;
  // The incoming clock advances throughout the overlap, then continues from the
  // same age after the six-second boundary, including the third-to-first handoff.
  if (q <= 0) {
    paintScene(c, width, height, look, palette, base, local + duration, override);
    return;
  }
  let pair = transitionCanvases.get(c);
  if (!pair) {
    pair = [document.createElement("canvas"), document.createElement("canvas")];
    transitionCanvases.set(c, pair);
  }
  for (const canvas of pair) {
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }
  paintScene(
    pair[0].getContext("2d")!,
    width,
    height,
    look,
    palette,
    base,
    local + duration,
    override,
  );
  paintScene(
    pair[1].getContext("2d")!,
    width,
    height,
    look,
    palette,
    (base + 1) % 3,
    local - start,
    override,
  );
  compositeTransition(c, pair[0], pair[1], width, height, q, effect, palette[2]);
}
// Canvas frame tasks share the timeline clock across preview and export.
const renderers = new WeakMap<EFTimegroupElement, () => void>();
export const AestheticFilm = memo(function AestheticFilm({
  id,
  aspect,
  look,
  label,
  override,
  scene,
}: {
  id: string;
  aspect: Aspect;
  look: AestheticLook;
  label: string;
  override?: AestheticOverride;
  scene?: number;
}) {
  const [width, height] = ASPECT[aspect];
  const speed = override?.speed ?? 1;
  const initialize = useCallback(
    (root: EFTimegroupElement) => {
      renderers.get(root)?.();
      const canvas = root.querySelector("canvas");
      const c = canvas?.getContext("2d");
      if (!canvas || !c) return;
      const draw = (time: number) => {
        paintAesthetic(c, width, height, look, time * speed, override, scene);
        canvas.dataset.motionTime = String(time * speed);
        canvas.dataset.scene = String((scene ?? sceneAt(look, time * speed, override)) + 1);
      };
      let active = true;
      const present = async (time: number) => {
        if (look.prepare) await look.prepare();
        await override?.prepare?.();
        if (active) draw(time);
      };
      // Async frame work participates in Editframe's presentation contract; late asset
      // loads from a previous preset cannot repaint a canvas after its cleanup.
      void present(root.currentTime).catch(() => {});
      const unregister = root.addFrameTask(({ ownCurrentTime }) => present(ownCurrentTime));
      renderers.set(root, () => {
        active = false;
        unregister();
      });
    },
    [width, height, look, override, scene, speed],
  );
  return (
    <Timegroup
      id={id}
      mode="fixed"
      duration={`${(scene === undefined ? LOOP : SCENE) / speed}s`}
      loop
      initializer={initialize}
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        background: override?.palette[0] ?? look.palette[0],
      }}
    >
      <canvas
        width={width}
        height={height}
        role="img"
        aria-label={label}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </Timegroup>
  );
});
