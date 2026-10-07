import { useCallback } from "react";
import { Timegroup } from "@editframe/react";
import type { EFTimegroupElement } from "@editframe/elements";
import { ASPECT, type Aspect } from "../../src/primitives";
import { clamp01, compositeTransition, type TransitionEffect } from "./transition-compositor";

export type C = CanvasRenderingContext2D;
/** Paints one complete poster on a frame 1200 units wide and `h` units tall. */
export type Poster = (c: C, h: number) => void;
/**
 * The loop position. Each four-second half holds its first image for 1.8 s, hands
 * off over 1.4 s, then holds; the second half hands back to the first image.
 */
type TransitionClock = {
  /** Seconds into the eight-second loop. */
  t: number;
  /** Linear progress of the current half's handoff. */
  q: number;
  returning: boolean;
};
/** Paints one continuous scene on a frame 1200 units wide and `h` units tall. */
export type ScenePainter = (c: C, h: number, clock: TransitionClock) => void;
/** A poster pair's colors; the incoming poster swaps ground and ink. */
type Palette = { ground: string; ink: string; accent: string; support: string };
type FilmProps = { id: string; aspect?: Aspect; background: string; label: string };
type FramePainter = (
  c: C,
  w: number,
  h: number,
  clock: TransitionClock,
  a: HTMLCanvasElement,
  b: HTMLCanvasElement,
) => void;

const LOOP = 8,
  HALF = 4,
  HOLD = 1.8,
  HANDOFF = 1.4;
export const TAU = Math.PI * 2;
export function circle(c: C, x: number, y: number, r: number, color: string) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fillStyle = color;
  c.fill();
}
export function line(c: C, points: number[][], color: string, width = 2) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x!, y!) : c.moveTo(x!, y!)));
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
export function text(
  c: C,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  font = "Arial",
  weight = "700",
) {
  c.fillStyle = color;
  c.font = `${weight} ${size}px ${font}`;
  c.textAlign = "left";
  c.fillText(value, x, y);
}
export function bg(c: C, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(0, 0, 1200, h);
}
/** Fills a poster's ground; returns the size `s` and center of its central artwork. */
export function posterGround(c: C, h: number, color: string) {
  bg(c, h, color);
  return { s: Math.min(700, h * 0.6), cx: 600, cy: h * 0.52 };
}
/**
 * A sun over rippled water. The night view swaps ground and ink, adds stars and
 * darkens the water. Returns the horizon and the ink for the scene drawn over it.
 */
export function shoreline(
  c: C,
  h: number,
  night: boolean,
  { ground, ink, accent, support }: Palette,
) {
  const sky = night ? ink : ground,
    fore = night ? ground : ink,
    horizon = h * 0.59,
    r = Math.min(90, h * 0.1);
  bg(c, h, sky);
  circle(c, 880, h * 0.28, r, night ? ground : accent);
  if (night)
    for (let i = 0; i < 22; i++)
      circle(
        c,
        85 + ((i * 173) % 1020),
        130 + ((i * 71) % Math.max(100, horizon - 190)),
        1.5,
        ground,
      );
  c.fillStyle = night ? "#112e42" : support;
  c.fillRect(0, horizon, 1200, h - horizon);
  for (let i = 0; i < 9; i++)
    line(
      c,
      [
        [0, horizon + 20 + i * 37],
        [1200, horizon + 20 + i * 37],
      ],
      fore,
      0.7,
    );
  return { horizon, ink: fore };
}

// Initializers can be reapplied to the same root; each root keeps exactly one frame task.
const tasks = new WeakMap<EFTimegroupElement, () => void>();
function TransitionLoop({
  id,
  aspect = "landscape",
  background,
  label,
  paint,
}: FilmProps & { paint: FramePainter }) {
  const [width, height] = ASPECT[aspect];
  const initialize = useCallback(
    (root: EFTimegroupElement) => {
      tasks.get(root)?.();
      const canvas = root.querySelector("canvas")!,
        c = canvas.getContext("2d")!;
      const a = document.createElement("canvas"),
        b = document.createElement("canvas");
      a.width = b.width = width;
      a.height = b.height = height;
      const draw = (time: number) => {
        const t = ((time % LOOP) + LOOP) % LOOP,
          returning = t >= HALF,
          q = clamp01(((t % HALF) - HOLD) / HANDOFF);
        c.save();
        try {
          paint(c, width, height, { t, q, returning }, a, b);
        } finally {
          c.restore();
        }
        canvas.dataset.motionTime = String(time);
      };
      draw(root.currentTime);
      tasks.set(
        root,
        root.addFrameTask(({ ownCurrentTime }) => draw(ownCurrentTime)),
      );
    },
    [width, height, paint],
  );
  return (
    <Timegroup
      id={id}
      mode="fixed"
      duration={`${LOOP}s`}
      loop
      initializer={initialize}
      style={{ width, height, overflow: "hidden", background }}
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
}

/** Hands poster `from` to poster `to` through `effect`, then back; `edge` is the effect's accent. */
export function PosterHandoff({
  from,
  to,
  effect,
  edge,
  ...film
}: FilmProps & { from: Poster; to: Poster; effect: TransitionEffect; edge: string }) {
  const paint = useCallback<FramePainter>(
    (c, w, h, { q, returning }, a, b) => {
      for (const [canvas, poster] of [
        [a, from],
        [b, to],
      ] as const) {
        const ctx = canvas.getContext("2d")!;
        ctx.save();
        ctx.scale(w / 1200, w / 1200);
        poster(ctx, (h / w) * 1200);
        ctx.restore();
      }
      compositeTransition(c, returning ? b : a, returning ? a : b, w, h, q, effect, edge);
    },
    [from, to, effect, edge],
  );
  return <TransitionLoop {...film} paint={paint} />;
}

/** Paints a transition that happens inside one continuous scene. */
export function ContinuousScene({ scene, ...film }: FilmProps & { scene: ScenePainter }) {
  const paint = useCallback<FramePainter>(
    (c, w, h, clock) => {
      c.scale(w / 1200, w / 1200);
      scene(c, (h / w) * 1200, clock);
    },
    [scene],
  );
  return <TransitionLoop {...film} paint={paint} />;
}
