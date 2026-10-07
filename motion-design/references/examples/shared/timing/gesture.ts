/** Timing is applied to gesture progress, never to a wall clock or source geometry. */
export type TimingProfile = {
  id: string;
  name: string;
  group: string;
  /** Seconds per gesture within the fixed comparison cycle. */
  gesture: number;
  description: string;
  use: string;
};
/** Eased progress for gesture progress strictly between 0 and 1; values may leave 0–1. */
export type TimingCurve = (progress: number) => number;
/** An editable cycle, in seconds, that replaces the fixed comparison. */
export type TimingRhythm = { lead: number; gesture: number; stagger: number; hold: number };
export type PreviewMode = "round-trip" | "entrance" | "exit";

export const TIMING_DURATION = 8;
export const FORWARD_START = 0.6;
export const RETURN_START = 4.6;
export const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
/** Every gesture starts and ends exactly at rest, whatever the curve does in between. */
export function easeProgress(curve: TimingCurve, progress: number): number {
  const x = clamp(progress);
  return x === 0 || x === 1 ? x : curve(x);
}

export const timingHalf = (r: TimingRhythm) => r.lead + r.gesture + 0.35 * r.stagger + r.hold;
export const timingDuration = (r: TimingRhythm, mode: PreviewMode = "round-trip") =>
  timingHalf(r) * (mode === "round-trip" ? 2 : 1);

export function gestureProgress(
  curve: TimingCurve,
  gesture: number,
  time: number,
  lag = 0,
  rhythm?: TimingRhythm,
) {
  const returnStart = rhythm ? timingHalf(rhythm) + rhythm.lead : RETURN_START;
  const returning = time >= returnStart;
  const start =
    (returning ? returnStart : (rhythm?.lead ?? FORWARD_START)) + lag * (rhythm?.stagger ?? 1);
  const raw = clamp((time - start) / (rhythm?.gesture ?? gesture));
  const value = easeProgress(curve, raw);
  return { raw, value, returning, position: returning ? 1 - value : value };
}
