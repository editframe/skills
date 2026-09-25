/** Timing is applied to gesture progress, never to a wall clock or source geometry. */
export const TIMING_PROFILES = [
  {
    id: "linear",
    name: "Linear",
    group: "Continuity",
    gesture: 1.6,
    description: "Travel at a constant rate from start to finish.",
    use: "Make distance and elapsed time easy to compare.",
  },
  {
    id: "slow",
    name: "Slow",
    group: "Tempo",
    gesture: 2.8,
    description: "Give the same linear gesture more time, shortening the resting hold.",
    use: "Let a transformation feel deliberate and easy to follow.",
  },
  {
    id: "fast",
    name: "Fast",
    group: "Tempo",
    gesture: 0.48,
    description: "Compress the same linear gesture into a quick move, then hold the result.",
    use: "Create urgency without reducing the time available to read the result.",
  },
  {
    id: "cubic-in",
    name: "Cubic In",
    group: "Acceleration",
    gesture: 1.6,
    description: "Start gently and accelerate into the destination with cubic progress.",
    use: "Build momentum or send an element decisively out of frame.",
  },
  {
    id: "cubic-out",
    name: "Cubic Out",
    group: "Acceleration",
    gesture: 1.6,
    description: "Move immediately, then decelerate into a precise resting position.",
    use: "Bring attention into a composition with a readable landing.",
  },
  {
    id: "cubic-in-out",
    name: "Cubic In / Out",
    group: "Acceleration",
    gesture: 1.6,
    description: "Accelerate out of rest and decelerate back into rest symmetrically.",
    use: "Connect two stable states with a smooth, self-contained move.",
  },
  {
    id: "speed-ramp",
    name: "Speed Ramp",
    group: "Acceleration",
    gesture: 1.6,
    description: "Ramp velocity from 0.2× to 1.8× and back to 0.2× within one gesture.",
    use: "Pass quickly through the middle while keeping both ends legible.",
  },
  {
    id: "overshoot",
    name: "Overshoot",
    group: "Arrival",
    gesture: 1.6,
    description: "Pass the destination once, then correct back to the target.",
    use: "Suggest momentum continuing beyond an intended stopping point.",
  },
  {
    id: "undershoot",
    name: "Undershoot",
    group: "Arrival",
    gesture: 1.6,
    description: "Stop at 82% of the journey, hesitate, then make a small final correction.",
    use: "Suggest a cautious arrival or a mechanism finding its final position.",
  },
  {
    id: "spring",
    name: "Spring",
    group: "Arrival",
    gesture: 1.6,
    description: "Cross the target repeatedly with a diminishing, deterministic recoil.",
    use: "Suggest stored energy resolving through several corrections.",
  },
  {
    id: "stepped",
    name: "Stepped",
    group: "Continuity",
    gesture: 1.6,
    description: "Divide progress into eight evenly timed held positions.",
    use: "Give motion a deliberate stop-motion or discrete-update character.",
  },
  {
    id: "glitchy",
    name: "Glitchy",
    group: "Continuity",
    gesture: 1.6,
    description: "Use an authored sequence of uneven holds, jumps, and brief reversals.",
    use: "Make continuity feel interrupted while keeping the outcome repeatable.",
  },
] as const;
export const EDITOR_CURVES = [
  {
    id: "gentle",
    name: "Gentle ease",
    group: "Everyday",
    gesture: 0.6,
    description: "A broad, restrained acceleration and deceleration.",
    use: "Connect two resting states without drawing attention to the ease.",
  },
  {
    id: "strong",
    name: "Strong ease",
    group: "Everyday",
    gesture: 0.6,
    description: "Concentrate travel into a fast middle burst.",
    use: "Give a graphic transition a deliberate start and firm settle.",
  },
  {
    id: "quick-arrival",
    name: "Quick arrival",
    group: "Everyday",
    gesture: 0.6,
    description: "Peak early, then spend more time decelerating.",
    use: "Bring words or panels in promptly and give them time to settle.",
  },
  {
    id: "long-settle",
    name: "Long settle",
    group: "Everyday",
    gesture: 0.6,
    description: "Move immediately, then resolve through an extended tail.",
    use: "Make a decisive reveal with a gradual finish.",
  },
  {
    id: "accelerating-exit",
    name: "Accelerating exit",
    group: "Everyday",
    gesture: 0.6,
    description: "Gather speed into the end of the gesture.",
    use: "Build momentum as an element leaves the composition.",
  },
] as const;
export const EASE_FAMILIES = [
  "sine",
  "quadratic",
  "cubic",
  "quartic",
  "quintic",
  "exponential",
  "circular",
] as const;
export const FAMILY_PROFILES = [
  {
    id: "cubic-bezier",
    name: "Cubic Bézier",
    group: "Easing family",
    gesture: 0.45,
    description: "Draw a custom curve with two control handles.",
    use: "Shape acceleration and settling independently with editable handles.",
  },
  {
    id: "sine",
    name: "Sine",
    group: "Easing family",
    gesture: 0.45,
    description: "A sinusoidal ease with a gradual change in speed.",
    use: "Use a gentle change in velocity for a restrained transition.",
  },
  {
    id: "quadratic",
    name: "Quadratic",
    group: "Easing family",
    gesture: 0.45,
    description: "Second-power easing: t².",
    use: "Apply a modest acceleration or deceleration.",
  },
  {
    id: "cubic",
    name: "Cubic",
    group: "Easing family",
    gesture: 0.45,
    description: "Third-power easing: t³.",
    use: "Build clear acceleration, a clean settle, or both.",
  },
  {
    id: "quartic",
    name: "Quartic",
    group: "Easing family",
    gesture: 0.45,
    description: "Fourth-power easing: t⁴.",
    use: "Concentrate more of the travel toward one end or the middle.",
  },
  {
    id: "quintic",
    name: "Quintic",
    group: "Easing family",
    gesture: 0.45,
    description: "Fifth-power easing: t⁵.",
    use: "Make a pronounced burst of travel with a long approach to rest.",
  },
  {
    id: "exponential",
    name: "Exponential",
    group: "Easing family",
    gesture: 0.45,
    description: "Exponential easing: speed changes by a constant ratio.",
    use: "Create an abrupt burst and an extended settling tail.",
  },
  {
    id: "circular",
    name: "Circular",
    group: "Easing family",
    gesture: 0.45,
    description: "Progress follows a quarter-circle arc.",
    use: "Make a sharp change in velocity at the fast end of the curve.",
  },
] as const;
export const isEaseFamily = (id: string): id is (typeof EASE_FAMILIES)[number] =>
  (EASE_FAMILIES as readonly string[]).includes(id);
export const ALL_TIMING_PROFILES = [...TIMING_PROFILES, ...EDITOR_CURVES, ...FAMILY_PROFILES];
export type TimingId = (typeof ALL_TIMING_PROFILES)[number]["id"];
export type TimingProfile = Omit<(typeof ALL_TIMING_PROFILES)[number], "gesture"> & {
  gesture: number;
};
export const TIMING_DURATION = 8;
export const FORWARD_START = 0.6;
export const RETURN_START = 4.6;
export const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
const glitch = [
  [0, 0],
  [0.12, 0.13],
  [0.2, 0.07],
  [0.29, 0.4],
  [0.43, 0.4],
  [0.48, 0.32],
  [0.54, 0.7],
  [0.63, 0.61],
  [0.7, 0.89],
  [0.82, 0.83],
  [0.9, 1],
];

export type TimingSettings = {
  gesture: number;
  hold: number;
  stagger: number;
  lead: number;
  authored: number;
  direction: number;
  bezier: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  overshoot: number;
  damping: number;
  oscillations: number;
  steps: number;
  glitch: number;
  landing: number;
};
export const defaultTimingSettings = (id: TimingId): TimingSettings => ({
  gesture: ALL_TIMING_PROFILES.find((p) => p.id === id)!.gesture,
  hold: 3.05 - ALL_TIMING_PROFILES.find((p) => p.id === id)!.gesture,
  stagger: 1,
  lead: FORWARD_START,
  authored: 0,
  direction: 2,
  bezier: 0,
  x1: 1 / 3,
  y1: 0,
  x2: 2 / 3,
  y2: 1,
  overshoot: 1.70158,
  damping: 6,
  oscillations: 3,
  steps: 8,
  glitch: 1,
  landing: 0.82,
});
export const timingHalf = (s: TimingSettings) => s.lead + s.gesture + 0.35 * s.stagger + s.hold;
export function restoreTimingSettings(id: TimingId, value: unknown): TimingSettings {
  const defaults = defaultTimingSettings(id);
  if (!value || typeof value !== "object") return defaults;
  const limits: Record<keyof TimingSettings, [number, number]> = {
    direction: [0, 2],
    lead: [0, 1],
    authored: [0, 1],
    bezier: [0, 1],
    x1: [0, 1],
    y1: [-1, 2],
    x2: [0, 1],
    y2: [-1, 2],
    gesture: [0.1, 5],
    hold: [0, 3],
    stagger: [0, 2],
    overshoot: [0, 3],
    damping: [3, 12],
    oscillations: [1, 5],
    steps: [2, 16],
    glitch: [0, 1],
    landing: [0.5, 0.95],
  };
  for (const key of Object.keys(defaults) as (keyof TimingSettings)[]) {
    const n = (value as Record<string, unknown>)[key];
    if (typeof n === "number" && Number.isFinite(n))
      defaults[key] = Math.max(limits[key][0], Math.min(limits[key][1], n));
  }
  defaults.direction = Math.round(defaults.direction);
  defaults.steps = Math.round(defaults.steps);
  defaults.oscillations = Math.round(defaults.oscillations);
  return defaults;
}
export function timingCurve(id: TimingId, progress: number, settings?: TimingSettings): number {
  const x = clamp(progress);
  if (x === 0 || x === 1) return x;
  // Named families use their exact functions, independent of stored Bézier handles.
  if (isEaseFamily(id)) {
    const easeIn = (t: number): number => {
      switch (id) {
        case "sine":
          return 1 - Math.cos((t * Math.PI) / 2);
        case "quadratic":
          return t * t;
        case "cubic":
          return t ** 3;
        case "quartic":
          return t ** 4;
        case "quintic":
          return t ** 5;
        case "exponential":
          return t === 0 ? 0 : t === 1 ? 1 : 2 ** (10 * t - 10);
        case "circular":
          return 1 - Math.sqrt(1 - t * t);
      }
    };
    const direction = settings?.direction ?? 2;
    return direction === 0
      ? easeIn(x)
      : direction === 1
        ? 1 - easeIn(1 - x)
        : x < 0.5
          ? easeIn(2 * x) / 2
          : 1 - easeIn(2 - 2 * x) / 2;
  }
  if (settings?.bezier) return cubicBezier(x, settings);
  if (settings?.authored) {
    const travel = (t: number) => cubicBezier(t, { x1: 0.25, y1: 0, x2: 0.15, y2: 1 });
    if (id === "overshoot") {
      const peak = 1 + settings.overshoot * 0.04;
      return x < 0.62 ? peak * travel(x / 0.62) : peak - (peak - 1) * smooth((x - 0.62) / 0.38);
    }
    if (id === "spring") {
      const w = settings.oscillations * Math.PI,
        d = settings.damping;
      const response = 1 - Math.exp(-d * x) * (Math.cos(w * x) + (d / w) * Math.sin(w * x));
      return 1 + (response - 1) * (1 - smooth((x - 0.8) / 0.2));
    }
    if (id === "undershoot")
      return x < 0.5
        ? settings.landing * travel(x / 0.5)
        : x < 0.6
          ? settings.landing
          : settings.landing + (1 - settings.landing) * smooth((x - 0.6) / 0.4);
    if (id === "stepped") return travel(Math.floor(x * settings.steps) / settings.steps);
    if (id === "glitchy") {
      const interrupted = glitch.filter(([at]) => at <= x).at(-1)![1];
      return travel(x) + (travel(interrupted) - travel(x)) * settings.glitch;
    }
  }
  switch (id) {
    case "cubic-in":
      return x ** 3;
    case "cubic-out":
      return 1 - (1 - x) ** 3;
    case "cubic-in-out":
      return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
    case "speed-ramp":
      return x < 0.5 ? 0.2 * x + 1.6 * x * x : 1 - (0.2 * (1 - x) + 1.6 * (1 - x) ** 2);
    case "overshoot": {
      const strength = settings?.overshoot ?? 1.70158;
      return 1 + (strength + 1) * (x - 1) ** 3 + strength * (x - 1) ** 2;
    }
    case "undershoot": {
      const landing = settings?.landing ?? 0.82;
      return x < 0.55
        ? landing * (1 - (1 - x / 0.55) ** 3)
        : x < 0.73
          ? landing
          : landing + (1 - landing) * smooth((x - 0.73) / 0.27);
    }
    case "spring":
      return (
        1 -
        Math.exp(-(settings?.damping ?? 6) * x) *
          Math.cos((settings?.oscillations ?? 3) * Math.PI * x) *
          (1 - smooth((x - 0.8) / 0.2))
      );
    case "stepped": {
      const steps = settings?.steps ?? 8;
      return Math.floor(x * steps) / steps;
    }
    case "glitchy": {
      const value = glitch.filter(([at]) => at <= x).at(-1)![1];
      return x + (value - x) * (settings?.glitch ?? 1);
    }
    default:
      return x;
  }
}

/** Discontinuities need duplicate keyframe offsets, not interpolated travel. */
export function timingJumps(id: TimingId, settings?: TimingSettings): number[] {
  if (settings?.bezier) return [];
  if (id === "stepped") {
    const count = settings?.steps ?? 8;
    return Array.from({ length: count }, (_, i) => (i + 1) / count);
  }
  if (id === "glitchy" && (settings?.glitch ?? 1) > 0) return glitch.slice(1).map(([at]) => at);
  return [];
}

export function gestureProgress(
  profile: TimingProfile,
  time: number,
  lag = 0,
  settings?: TimingSettings,
) {
  const returnStart = settings ? timingHalf(settings) + settings.lead : RETURN_START;
  const returning = time >= returnStart;
  const start =
    (returning ? returnStart : (settings?.lead ?? FORWARD_START)) + lag * (settings?.stagger ?? 1);
  const raw = clamp((time - start) / (settings?.gesture ?? profile.gesture));
  const value = timingCurve(profile.id, raw, settings);
  return { raw, value, returning, position: returning ? 1 - value : value };
}

export const TIMING_SOURCES = [
  {
    id: "word-stagger-reveal",
    name: "Word Stagger Reveal",
    background: "#e9e7dc",
    aspect: "landscape",
    application: "Word travel",
    detail:
      "Apply the curve to each word's vertical travel; retain the four-word phrase, mask, and stagger order.",
    lag: [0, 0.12, 0.25, 0.35],
  },
  {
    id: "shape-morph-loop",
    name: "Shape Morph Loop",
    background: "#bdd3dc",
    aspect: "square",
    application: "Contour + rotation",
    detail:
      "Apply the curve to the circle-to-square contour, scale, and rotation of the three nested forms.",
    lag: [0, 0.09, 0.18],
  },
  {
    id: "orbital-phase-lock",
    name: "Orbital Phase Lock",
    background: "#112d2f",
    aspect: "square",
    application: "Angular convergence",
    detail:
      "Apply the curve to angular travel from three starting phases into one shared alignment, then release.",
    lag: [0, 0, 0],
  },
  {
    id: "color-block-wipe",
    name: "Color Block Wipe",
    background: "#fae8d0",
    aspect: "portrait",
    application: "Panel travel",
    detail:
      "Apply the curve to the three panels crossing the fixed circle; retain their slight entry offsets.",
    lag: [0, 0.12, 0.28],
  },
  {
    id: "stroke-draw-chart",
    name: "Stroke Draw Chart",
    background: "#ebe7dc",
    aspect: "landscape",
    application: "Line tracing",
    detail:
      "Apply the curve to line tracing. Cap visible length at the path ends; the endpoint marker carries overshoot and recoil beyond the final point.",
    lag: [0],
  },
] as const;

/** Preserve the lead-in, moving phase, or resting phase while editing the cycle. */
export function remapTimingTime(
  time: number,
  previous: TimingSettings,
  next: TimingSettings,
): number {
  const half = timingHalf(previous),
    nextHalf = timingHalf(next);
  const phase = time >= half ? 1 : 0;
  const local = Math.max(0, Math.min(half, time - phase * half));
  const travel = previous.gesture + 0.35 * previous.stagger;
  const nextTravel = next.gesture + 0.35 * next.stagger;
  const mapped =
    local <= previous.lead
      ? previous.lead
        ? (local / previous.lead) * next.lead
        : 0
      : local <= previous.lead + travel
        ? next.lead + ((local - previous.lead) / travel) * nextTravel
        : next.lead +
          nextTravel +
          (previous.hold ? ((local - previous.lead - travel) / previous.hold) * next.hold : 0);
  return phase * nextHalf + mapped;
}

export type PreviewMode = "round-trip" | "entrance" | "exit";
export const timingDuration = (settings: TimingSettings, mode: PreviewMode = "round-trip") =>
  timingHalf(settings) * (mode === "round-trip" ? 2 : 1);

/** Invert time on a monotone cubic; y is free to exceed the endpoints. */
export function cubicBezier(
  progress: number,
  s: Pick<TimingSettings, "x1" | "y1" | "x2" | "y2">,
): number {
  const x = clamp(progress);
  if (x === 0 || x === 1) return x;
  const at = (t: number, a: number, b: number) =>
    3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3;
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 32; i++) {
    const t = (lo + hi) / 2;
    if (at(t, s.x1, s.x2) < x) lo = t;
    else hi = t;
  }
  return at((lo + hi) / 2, s.y1, s.y2);
}
export function timingVelocity(
  id: TimingId,
  progress: number,
  settings: TimingSettings,
): number | null {
  if (!settings.bezier && (id === "stepped" || (id === "glitchy" && settings.glitch > 0)))
    return null;
  const a = Math.max(0, progress - 0.0001),
    b = Math.min(1, progress + 0.0001);
  return (timingCurve(id, b, settings) - timingCurve(id, a, settings)) / (b - a);
}
export const EDITOR_TIMING_IDS: TimingId[] = [
  "cubic-bezier",
  ...EASE_FAMILIES,
  "overshoot",
  "spring",
  "undershoot",
  "stepped",
  "glitchy",
];
// Old descriptive curves open as editable Béziers, retaining their particular shape.
export const LEGACY_TIMING_ALIASES: Partial<Record<TimingId, TimingId>> = {
  "cubic-in": "cubic",
  "cubic-out": "cubic",
  "cubic-in-out": "cubic",
  "speed-ramp": "cubic",
  slow: "sine",
  fast: "quartic",
  linear: "cubic",
  gentle: "cubic-bezier",
  strong: "cubic-bezier",
  "quick-arrival": "cubic-bezier",
  "long-settle": "cubic-bezier",
  "accelerating-exit": "cubic-bezier",
};
export const legacyDirection = (id?: string) =>
  id === "timing-cubic-in" ? 0 : id === "timing-cubic-out" ? 1 : 2;
const bezierPresets: Partial<Record<TimingId, [number, number, number, number]>> = {
  "cubic-bezier": [0.65, 0, 0.35, 1],
  gentle: [0.35, 0, 0.25, 1],
  strong: [0.65, 0, 0.15, 1],
  "quick-arrival": [0.18, 0, 0.12, 1],
  "long-settle": [0.12, 0, 0.08, 1],
  "accelerating-exit": [0.55, 0, 0.9, 0.15],
  linear: [1 / 3, 1 / 3, 2 / 3, 2 / 3],
};
export function defaultEditorSettings(id: TimingId): TimingSettings {
  const controls = bezierPresets[id];
  const duration: Partial<Record<TimingId, number>> = {
    gentle: 0.42,
    strong: 0.3,
    "quick-arrival": 0.4,
    "long-settle": 0.65,
    "accelerating-exit": 0.28,
    overshoot: 0.48,
    spring: 0.55,
    undershoot: 0.5,
    stepped: 0.4,
    glitchy: 0.45,
  };
  return {
    ...defaultTimingSettings(id),
    gesture: duration[id] ?? 0.45,
    hold: 0.5,
    lead: 0.12,
    authored: 1,
    stagger: 0,
    overshoot: 1,
    damping: 10,
    oscillations: 4,
    landing: 0.94,
    steps: 5,
    ...(controls
      ? { bezier: 1, x1: controls[0], y1: controls[1], x2: controls[2], y2: controls[3] }
      : {}),
  };
}
