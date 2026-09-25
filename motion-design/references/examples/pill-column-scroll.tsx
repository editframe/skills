import type { CSSProperties } from "react";
import { ACCENT, Chip, PAPER, Solo } from "../src/primitives";

export const duration = 5;
export const aspect = "landscape" as const;

const PILLS = ["Brief", "Deploy", "Checks", "Clone", "Route", "Audit", "Ship"];
const PILL_H = 72;
const PILL_GAP = 16;
const PILL_STRIDE = PILL_H + PILL_GAP;
const CENTER_Y = 540;
const START_Y = CENTER_Y + 160 - PILL_H / 2;
const END_Y = CENTER_Y - PILL_H / 2 - (PILLS.length - 1) * PILL_STRIDE;
const SCROLL_START = 280;
const SCROLL_DUR = 3400;

const CROSSING = [980, 1280, 1540, 1780, 2040, 2380, 3480];

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="absolute left-1/2 top-16 z-20 -translate-x-1/2">
        <Chip>Templates</Chip>
      </div>

      <div
        className="absolute left-1/2 top-0 z-[5] flex w-[640px] flex-col items-center"
        style={
          {
            gap: PILL_GAP,
            "--pills-start-y": `${START_Y}px`,
            "--pills-end-y": `${END_Y}px`,
            animation: `pills-column-scroll ${SCROLL_DUR}ms ${SCROLL_START}ms cubic-bezier(0.76,0,0.24,1) both`,
          } as CSSProperties
        }
      >
        {PILLS.map((label, i) => {
          const isLast = i === PILLS.length - 1;
          const cross = CROSSING[i];
          const anim = isLast
            ? `pill-settle 220ms ${cross - 110}ms cubic-bezier(0.33,1,0.68,1) both`
            : `pill-bump 200ms ${cross - 100}ms cubic-bezier(0.45,0,0.55,1) both`;
          return (
            <div
              key={label}
              className="inline-flex items-center justify-center rounded-2xl px-12 text-4xl"
              style={{
                height: PILL_H,
                background: "#efe6da",
                color: "rgba(26,26,26,0.55)",
                border: "1px solid #e0d6c8",
                animation: anim,
              }}
            >
              {label}
            </div>
          );
        })}
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[280px]"
        style={{ background: `linear-gradient(to bottom, ${PAPER}, transparent)` }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[280px]"
        style={{ background: `linear-gradient(to top, ${PAPER}, transparent)` }}
      />

      <style>{`
        @keyframes pills-column-scroll {
          from { transform: translateX(-50%) translateY(var(--pills-start-y)); }
          to { transform: translateX(-50%) translateY(var(--pills-end-y)); }
        }
        @keyframes pill-bump {
          0%, 100% {
            background: #efe6da;
            color: rgba(26,26,26,0.55);
            border-color: #e0d6c8;
          }
          50% {
            background: ${ACCENT};
            color: #fff;
            border-color: ${ACCENT};
          }
        }
        @keyframes pill-settle {
          from {
            background: #efe6da;
            color: rgba(26,26,26,0.55);
            border-color: #e0d6c8;
          }
          to {
            background: ${ACCENT};
            color: #fff;
            border-color: ${ACCENT};
          }
        }
      `}</style>
    </Solo>
  );
}
