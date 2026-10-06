import { motionKeyframes } from "../../../src/primitives/motion-track";
import {
  clamp,
  FORWARD_START,
  RETURN_START,
  gestureProgress,
  timingHalf,
  type PreviewMode,
  type TimingCurve,
  type TimingRhythm,
} from "./gesture";
import { TIMING_SOURCES } from "./SourceClones";

/** Expose every moving source as a native animation with a complete pose history. */
export function timingMotionTracks({
  curve,
  gesture: fixedGesture,
  jumps = [],
  duration,
  rhythm,
  mode = "round-trip",
}: {
  curve: TimingCurve;
  gesture: number;
  jumps?: readonly number[];
  duration: number;
  rhythm?: TimingRhythm;
  mode?: PreviewMode;
}) {
  const tracks: { selector: string; index: number; keyframes: Keyframe[] }[] = [];
  const shift = mode === "exit" && rhythm ? timingHalf(rhythm) : 0;
  const gesture = rhythm?.gesture ?? fixedGesture;
  const forward = rhythm?.lead ?? FORWARD_START;
  const returning = rhythm ? timingHalf(rhythm) + rhythm.lead : RETURN_START;
  const track = (
    selector: string,
    index: number,
    lag: number,
    pose: (q: ReturnType<typeof gestureProgress>) => readonly number[],
    keyframe: (values: readonly number[]) => Keyframe,
  ) => {
    const starts = [forward, returning].map((t) => t + lag * (rhythm?.stagger ?? 1) - shift);
    tracks.push({
      selector,
      index,
      keyframes: motionKeyframes({
        duration,
        sample: (t) => pose(gestureProgress(curve, fixedGesture, t + shift, lag, rhythm)),
        keyframe,
        boundaries: [returning - shift, ...starts.flatMap((t) => [t, t + gesture])],
        jumps: starts.flatMap((t) => jumps.map((p) => t + p * gesture)),
      }),
    });
  };
  TIMING_SOURCES[0].lag.forEach((_, i) =>
    track(
      "[data-timing-word]",
      i,
      TIMING_SOURCES[0].lag[i],
      (q) => [q.returning ? -120 * q.value : 115 * (1 - q.value)],
      ([y]) => ({ transform: `translateY(${y}%)` }),
    ),
  );
  track(
    "[data-timing-rule]",
    0,
    0,
    (q) => [clamp(q.position)],
    ([x]) => ({ transform: `scaleX(${x})` }),
  );
  TIMING_SOURCES[1].lag.forEach((_, i) =>
    track(
      "[data-timing-morph]",
      i,
      TIMING_SOURCES[1].lag[i],
      (q) => [
        q.returning ? 90 + 270 * q.value : 90 * q.value,
        1 - 0.09 * q.position,
        Math.max(0, 50 - 41 * q.position),
      ],
      ([angle, scale, radius]) => ({
        transform: `rotate(${angle}deg) scale(${scale})`,
        borderRadius: `${radius}%`,
      }),
    ),
  );
  TIMING_SOURCES[2].lag.forEach((_, i) =>
    track(
      "[data-timing-orbit]",
      i,
      0,
      (q) => [q.returning ? 360 + (360 + i * 120) * q.value : i * 120 + (360 - i * 120) * q.value],
      ([angle]) => ({ transform: `rotate(${angle}deg)` }),
    ),
  );
  TIMING_SOURCES[3].lag.forEach((_, i) =>
    track(
      "[data-timing-wipe]",
      i,
      TIMING_SOURCES[3].lag[i],
      (q) => [q.returning ? -101 * q.value : 101 * (1 - q.value)],
      ([y]) => ({ transform: `translateY(${y}%)` }),
    ),
  );
  track(
    "[data-timing-endpoint]",
    0,
    0,
    (q) => [
      Math.max(0, q.position - 1) * 160,
      -Math.max(0, q.position - 1) * 90,
      clamp((q.position - 0.8) / 0.2),
    ],
    ([x, y, opacity]) => ({ transform: `translate(${x}px, ${y}px)`, opacity }),
  );
  return tracks;
}
