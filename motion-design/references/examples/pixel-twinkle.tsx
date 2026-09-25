import type { CSSProperties } from "react";
import { ACCENT, Solo, DisplayText } from "../src/primitives";

export const duration = 3.5;
export const aspect = "landscape" as const;

const PIXELS = [
  { x: 52, y: 48, w: 8, h: 8, delay: 0, period: 1800 },
  { x: 118, y: 96, w: 12, h: 8, delay: 420, period: 1600 },
  { x: 186, y: 40, w: 6, h: 6, delay: 880, period: 2100 },
  { x: 44, y: 168, w: 10, h: 10, delay: 240, period: 1400 },
  { x: 240, y: 78, w: 8, h: 14, delay: 1100, period: 1900 },
  { x: 88, y: 260, w: 6, h: 6, delay: 640, period: 1700 },
  { x: 1760, y: 56, w: 10, h: 8, delay: 180, period: 1500 },
  { x: 1832, y: 112, w: 8, h: 8, delay: 760, period: 2000 },
  { x: 1688, y: 36, w: 12, h: 6, delay: 320, period: 1800 },
  { x: 1864, y: 198, w: 6, h: 12, delay: 980, period: 1650 },
  { x: 1744, y: 250, w: 8, h: 8, delay: 540, period: 1950 },
  { x: 60, y: 860, w: 10, h: 8, delay: 200, period: 1750 },
  { x: 128, y: 940, w: 8, h: 8, delay: 700, period: 1550 },
  { x: 36, y: 990, w: 6, h: 10, delay: 1040, period: 2200 },
  { x: 214, y: 900, w: 12, h: 8, delay: 360, period: 1850 },
  { x: 1788, y: 848, w: 8, h: 10, delay: 480, period: 1600 },
  { x: 1860, y: 920, w: 10, h: 8, delay: 860, period: 1900 },
  { x: 1704, y: 980, w: 6, h: 6, delay: 120, period: 1450 },
  { x: 1824, y: 1004, w: 12, h: 8, delay: 600, period: 2050 },
  { x: 920, y: 44, w: 8, h: 8, delay: 280, period: 1700 },
  { x: 1008, y: 72, w: 6, h: 12, delay: 920, period: 1850 },
  { x: 48, y: 520, w: 8, h: 8, delay: 500, period: 1500 },
  { x: 1848, y: 508, w: 10, h: 6, delay: 140, period: 2100 },
];

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      {PIXELS.map((p) => (
        <div
          key={`${p.x}-${p.y}`}
          className="absolute"
          style={
            {
              left: p.x,
              top: p.y,
              width: p.w,
              height: p.h,
              background: ACCENT,
              borderRadius: 1,
              animation: `pixel-twinkle ${p.period}ms linear ${-p.delay}ms infinite`,
            } as CSSProperties
          }
        />
      ))}
      <div className="flex h-full w-full items-center justify-center">
        <DisplayText size={96}>TWINKLE</DisplayText>
      </div>
    </Solo>
  );
}
