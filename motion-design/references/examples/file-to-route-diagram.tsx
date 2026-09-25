import type { CSSProperties } from "react";
import { Chip, FONT, Mono, Reveal, Solo, SUCCESS } from "../src/primitives";

const ROWS = [
  { label: "src/", depth: 0, start: 0, target: false },
  { label: "Video.tsx", depth: 1, start: 500, target: false },
  { label: "brief.ts", depth: 1, start: 1000, target: false },
  { label: "sku/", depth: 1, start: 1500, target: false },
  { label: "page.tsx", depth: 2, start: 2000, target: true },
] as const;

const URL = "/sku";
const ARROW_AT = 2700;
const URL_AT = 3200;
const DIM = "rgba(232,240,234,0.42)";

export const duration = 5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} theme="data">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 42% 50%, rgba(61,220,132,0.12), transparent 58%)",
        }}
      />
      <div className="relative flex h-full w-full items-center justify-center gap-0">
        <div className="w-[420px]" style={{ fontSize: 28, lineHeight: 1.85 }}>
          {ROWS.map((row) => (
            <div
              key={row.label + row.depth}
              className="relative"
              style={
                {
                  paddingLeft: row.depth * 36 + 12,
                  color: row.target ? SUCCESS : DIM,
                  "--slide-x": "-16px",
                  animation: `slide-x-in 280ms ${row.start}ms cubic-bezier(0.33,1,0.68,1) backwards`,
                } as CSSProperties
              }
            >
              {row.target ? (
                <div
                  className="absolute top-1 bottom-1 w-[3px] rounded-sm"
                  style={{
                    left: row.depth * 36,
                    background: SUCCESS,
                    boxShadow: `0 0 12px ${SUCCESS}`,
                    animation: "row-glow 420ms 2400ms cubic-bezier(0.33,1,0.68,1) backwards",
                  }}
                />
              ) : null}
              <Mono>{row.label}</Mono>
            </div>
          ))}
        </div>
        <svg width="280" height="40" viewBox="0 0 280 40" className="mx-6">
          <path
            d="M 0 20 L 240 20"
            stroke={SUCCESS}
            strokeWidth={2}
            fill="none"
            strokeDasharray={240}
            strokeDashoffset={240}
            style={{
              filter: `drop-shadow(0 0 6px ${SUCCESS})`,
              animation: `draw 500ms ${ARROW_AT}ms cubic-bezier(0.33,1,0.68,1) both`,
            }}
          />
          <path
            d="M 232 12 L 244 20 L 232 28"
            stroke={SUCCESS}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            style={
              {
                "--slide-x": "-8px",
                filter: `drop-shadow(0 0 6px ${SUCCESS})`,
                animation: `slide-x-in 120ms ${ARROW_AT + 400}ms cubic-bezier(0.33,1,0.68,1) backwards`,
              } as CSSProperties
            }
          />
        </svg>
        <div className="w-[360px]">
          <div
            className="flex items-baseline"
            style={{
              fontSize: 72,
              fontWeight: 500,
              letterSpacing: "-0.03em",
              fontFamily: FONT.mono,
              color: SUCCESS,
            }}
          >
            <span className="inline-block" style={{ width: `${URL.length}ch` }}>
              <span
                className="inline-block overflow-hidden whitespace-nowrap"
                style={{
                  animation: `typewriter-reveal 480ms steps(${URL.length}, end) ${URL_AT}ms both`,
                }}
              >
                {URL}
              </span>
            </span>
            <span
              className="ml-1 inline-block"
              style={{
                width: 5,
                height: 56,
                background: SUCCESS,
                boxShadow: `0 0 10px ${SUCCESS}`,
                animation: `caret-blink 1s steps(2, jump-none) ${URL_AT}ms infinite backwards`,
              }}
            />
          </div>
          <Reveal enter={[URL_AT + 480, URL_AT + 720]} y={8} className="mt-3">
            <Chip>file → route</Chip>
          </Reveal>
        </div>
      </div>
      <style>{`
        @keyframes row-glow {
          from { opacity: 0; transform: scaleY(0.2); }
          to { opacity: 1; transform: scaleY(1); }
        }
      `}</style>
    </Solo>
  );
}
