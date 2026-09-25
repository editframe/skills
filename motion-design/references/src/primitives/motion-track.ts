import type { EFTimegroupElement } from "@editframe/elements";

export type MotionTrackOptions = {
  duration: number;
  /** Numerical pose, in authored units. Keep rotations unwrapped (e.g. 0 → 360). */
  sample: (time: number) => readonly number[];
  keyframe: (pose: readonly number[]) => Keyframe;
  /** Exact phase boundaries, including the start/end of short gestures. */
  boundaries?: readonly number[];
  /** Right-continuous cuts. Duplicate offsets preserve jumps without tweening. */
  jumps?: readonly number[];
  /** Target interpolation tolerance per pose coordinate, in authored units. */
  tolerance?: number;
};

/** Bake procedural poses once; the browser and Editframe own playback and sampling. */
export function motionKeyframes({
  duration,
  sample,
  keyframe,
  boundaries = [],
  jumps = [],
  tolerance = 0.001,
}: MotionTrackOptions): Keyframe[] {
  if (!(duration > 0) || !Number.isFinite(duration))
    throw new Error("Motion track duration must be positive and finite");
  const cuts = new Set(jumps.filter((t) => t > 0 && t <= duration));
  const times = [...new Set([0, duration, ...boundaries, ...cuts])]
    .filter((t) => t >= 0 && t <= duration)
    .sort((a, b) => a - b);
  const frames: Keyframe[] = [];
  const right = (time: number) => sample(cuts.has(time) ? time + 1e-9 : time);
  const emit = (time: number, pose: readonly number[]) =>
    frames.push({ ...keyframe(pose), offset: time / duration, easing: "linear" });
  const subdivide = (
    a: number,
    pa: readonly number[],
    b: number,
    pb: readonly number[],
    depth = 0,
  ) => {
    const span = b - a;
    const probes = [0.25, 0.5, 0.75].map((f) => ({ f, pose: sample(a + span * f) }));
    const error = Math.max(
      ...probes.flatMap(({ f, pose }) =>
        pose.map((value, i) => Math.abs(value - (pa[i] + (pb[i] - pa[i]) * f))),
      ),
    );
    // The time bound avoids overlooking oscillations with coincident endpoints.
    if (depth < 24 && (span > 1 / 30 || error > tolerance)) {
      const middle = (a + b) / 2,
        pose = probes[1].pose;
      subdivide(a, pa, middle, pose, depth + 1);
      subdivide(middle, pose, b, pb, depth + 1);
    } else emit(b, pb);
  };
  emit(0, sample(0));
  for (let i = 1; i < times.length; i++) {
    const a = times[i - 1],
      b = times[i];
    const before = cuts.has(b) ? sample(b - Math.min(1e-9, (b - a) / 2)) : sample(b);
    subdivide(a, right(a), b, before);
    if (cuts.has(b)) emit(b, right(b));
  }
  return frames;
}

/** Precompute keyframes outside timegroup initializers, which have a 10ms budget. */
export function attachMotionTrack(
  root: EFTimegroupElement,
  target: Element,
  keyframes: Keyframe[],
  duration: number,
): () => void {
  const animation = new Animation(
    new KeyframeEffect(target, keyframes, {
      duration: duration * 1000,
      fill: "both",
      easing: "linear",
    }),
    document.timeline,
  );
  animation.pause();
  animation.currentTime = root.currentTime * 1000;
  root.invalidateOwnedAnimations();
  return () => {
    animation.cancel();
    root.invalidateOwnedAnimations();
  };
}
