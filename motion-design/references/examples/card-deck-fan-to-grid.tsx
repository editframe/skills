import { Timegroup } from "@editframe/react";
import { ACCENT, Card, Chip, INK, ProductCan, Reveal, Solo, DisplayText } from "../src/primitives";
import type { EFTimegroupElement } from "@editframe/elements";
import { motionKeyframes, attachMotionTrack } from "../src/primitives/motion-track";

const LOOKS = [
  { no: "01", name: "INK", color: INK, off: "50" },
  { no: "02", name: "NAVY", color: "#1e3a8a", off: "60" },
  { no: "03", name: "BRICK", color: ACCENT, off: "40" },
  { no: "04", name: "SAGE", color: "#3d5c4a", off: "70" },
  { no: "05", name: "BONE", color: "#c4b8a4", off: "55" },
  { no: "06", name: "SMOKE", color: "#5a6570", off: "65" },
];

const FLYIN = [
  { x: -640, y: -900, r: -26 },
  { x: 640, y: -940, r: 24 },
  { x: -700, y: 980, r: 20 },
  { x: 700, y: 920, r: -22 },
  { x: -820, y: -80, r: -12 },
  { x: 820, y: 80, r: 14 },
];
const DECK = [
  { x: -14, y: -18, r: -7 },
  { x: 12, y: -8, r: 5 },
  { x: -8, y: 6, r: -3 },
  { x: 10, y: 16, r: 4 },
  { x: -4, y: 26, r: -2 },
  { x: 6, y: 36, r: 6 },
];
const FAN = [
  { x: -300, y: 80, r: -32 },
  { x: -180, y: 8, r: -18 },
  { x: -60, y: -24, r: -6 },
  { x: 60, y: -24, r: 6 },
  { x: 180, y: 8, r: 18 },
  { x: 300, y: 80, r: 32 },
];
const GRID = [
  { x: -210, y: -390, r: 0 },
  { x: 210, y: -390, r: 0 },
  { x: -210, y: 20, r: 0 },
  { x: 210, y: 20, r: 0 },
  { x: -210, y: 430, r: 0 },
  { x: 210, y: 430, r: 0 },
];

const FLY0 = 40;
const FAN0 = 1600;
const DEAL0 = 3000;
const STAMP0 = 3800;
const CARD_W = 280;
const CARD_H = 420;

function clamp(t: number) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function track(ms: number, start: number, end: number) {
  return clamp((ms - start) / (end - start));
}
function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}
function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}
function outBack(t: number) {
  const c = 1.70158;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
}

export const duration = 5.5;
export const aspect = "portrait" as const;

const tracks = new WeakMap<EFTimegroupElement, () => void>();
function prepareTracks() {
  const prepared: { selector: string; index: number; keyframes: Keyframe[] }[] = [];
  LOOKS.forEach((_, i) => {
    const flyStart = (FLY0 + i * 90) / 1000;
    const fanStart = (FAN0 + i * 40) / 1000;
    const dealStart = (DEAL0 + i * 90) / 1000;
    const visibleAt = flyStart + 0.6 * (1 - Math.cbrt(0.999));
    prepared.push({
      selector: "[data-deck-card]",
      index: i,
      keyframes: motionKeyframes({
        duration,
        boundaries: [
          flyStart,
          flyStart + 0.6,
          fanStart,
          fanStart + 0.7,
          dealStart,
          dealStart + 0.7,
        ],
        jumps: [visibleAt],
        sample: (time) => {
          const ms = time * 1000;
          const flyP = easeOutCubic(track(ms, FLY0 + i * 90, FLY0 + 600 + i * 90));
          const fanP = easeInOutQuad(track(ms, FAN0 + i * 40, FAN0 + 700 + i * 40));
          const dealP = outBack(track(ms, DEAL0 + i * 90, DEAL0 + 700 + i * 90));
          const blend = (key: "x" | "y" | "r") =>
            lerp(
              lerp(lerp(FLYIN[i][key], DECK[i][key], flyP), FAN[i][key], fanP),
              GRID[i][key],
              dealP,
            );
          return [
            blend("x"),
            blend("y"),
            blend("r"),
            lerp(1, 0.82, dealP),
            time >= visibleAt ? 1 : 0,
          ];
        },
        keyframe: ([x, y, rotation, scale, opacity]) => ({
          transform: `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`,
          opacity,
        }),
      }),
    });
  });
  LOOKS.forEach((_, i) => {
    const start = (STAMP0 + i * 90) / 1000;
    prepared.push({
      selector: "[data-deck-stamp]",
      index: i,
      keyframes: motionKeyframes({
        duration,
        boundaries: [start, start + 0.28],
        sample: (time) => [
          clamp(outBack(track(time * 1000, STAMP0 + i * 90, STAMP0 + 280 + i * 90))),
        ],
        keyframe: ([progress]) => ({
          transform: `rotate(-8deg) scale(${lerp(1.4, 1, progress)})`,
          opacity: progress,
        }),
        tolerance: 0.00001,
      }),
    });
  });
  return prepared;
}
const preparedTracks = prepareTracks();
function initialize(root: EFTimegroupElement) {
  tracks.get(root)?.();
  const disposers = preparedTracks.map((track) =>
    attachMotionTrack(
      root,
      root.querySelectorAll(track.selector)[track.index],
      track.keyframes,
      duration,
    ),
  );
  tracks.set(root, () => disposers.forEach((dispose) => dispose()));
}

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <Timegroup mode="fit" initializer={initialize} className="absolute inset-0">
        <Reveal
          enter={[FAN0 + 80, FAN0 + 560]}
          exit={[DEAL0 - 180, DEAL0 + 120]}
          y={0}
          className="absolute left-0 right-0 top-48 text-center"
        >
          <DisplayText size={96}>THE SET</DisplayText>
        </Reveal>
        <Reveal
          enter={[FAN0 + 360, FAN0 + 760]}
          exit={[DEAL0 - 180, DEAL0 + 120]}
          y={8}
          className="absolute left-0 right-0 top-[340px] text-center"
        ></Reveal>

        <Reveal
          enter={[DEAL0 + 80, DEAL0 + 560]}
          y={12}
          className="absolute left-16 right-16 top-20 flex items-center justify-between"
        >
          <DisplayText size={56}>THE SET</DisplayText>
          <Chip delay={0}>vol.01</Chip>
        </Reveal>
        <div
          className="absolute left-16 right-16 top-44 h-1"
          style={{
            background: INK,
            transformOrigin: "left center",
            animation: `rule-draw-in 480ms ${DEAL0 + 120}ms cubic-bezier(0.33,1,0.68,1) both`,
          }}
        />

        {LOOKS.map((look, i) => (
          <div
            key={look.no}
            data-deck-card={i}
            className="absolute"
            style={{
              left: 540 - CARD_W / 2,
              top: 960 - CARD_H / 2,
              width: CARD_W,
              opacity: 0,
              zIndex: 20 + (6 - i),
            }}
          >
            <Card className="overflow-hidden p-3 pb-12">
              <div
                className="relative flex justify-center overflow-hidden rounded-xl"
                style={{ height: 320 }}
              >
                <ProductCan color={look.color} label={look.no} size="lineup" height={300} />
                <div
                  className="absolute left-2 top-2 px-2 py-1 text-lg font-bold text-white"
                  style={{ background: INK }}
                >
                  {look.no}
                </div>
                <div
                  data-deck-stamp={i}
                  className="absolute right-2 top-3 px-2 py-1 text-center text-sm font-bold"
                  style={{
                    background: "#fffaf2",
                    border: `2px solid ${INK}`,
                    opacity: 0,
                  }}
                >
                  {look.off}%
                  <br />
                  OFF
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between px-1 text-sm font-semibold tracking-wide">
                <span>{look.name}</span>
                <span>$48</span>
              </div>
            </Card>
          </div>
        ))}
      </Timegroup>
    </Solo>
  );
}
