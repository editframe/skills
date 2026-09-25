import { Timegroup } from "@editframe/react";
import {
  ACCENT,
  Card,
  CREAM,
  Cursor,
  ExampleRoot,
  INK,
  LINE,
  MUTED,
  NAVY,
  Reveal,
  Scene,
} from "../src/primitives";

const OVERLAP = 0.4;
const STRIPS = 14;
const GRID = [
  { label: "01", color: ACCENT },
  { label: "02", color: NAVY },
  { label: "03", color: INK },
  { label: "04", color: "#3d7a4a" },
];

export const duration = 12;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <ExampleRoot id={id} aspect={frame} background="#141413">
      <Timegroup mode="sequence" overlap={OVERLAP} className="absolute inset-0">
        <Generate />
        <Place />
        <Ship />
      </Timegroup>
    </ExampleRoot>
  );
}

function Generate() {
  return (
    <Scene
      duration={4}
      className="flex items-center justify-center"
      style={{ background: "#141413" }}
    >
      <div
        className="relative overflow-hidden rounded-3xl"
        style={{ width: 520, height: 520, border: `1px solid ${LINE}` }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ animation: "deblur-in 700ms 2100ms cubic-bezier(0.33,1,0.68,1) both" }}
        >
          <div
            className="flex h-full w-full items-center justify-center text-7xl font-semibold text-white"
            style={{ background: ACCENT }}
          >
            CAN
          </div>
        </div>
        <div className="absolute inset-0 flex">
          {Array.from({ length: STRIPS }, (_, i) => (
            <div
              key={i}
              className="h-full flex-1"
              style={{
                background: `repeating-linear-gradient(to bottom, ${ACCENT} 0 8px, #1e1d1b 8px 18px)`,
                animation: `led-strip 1.8s ${i * 55}ms both`,
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes led-strip {
          0% { opacity: 0; }
          18% { opacity: 0.95; }
          70% { opacity: 0.7; }
          100% { opacity: 0; }
        }
        @keyframes deblur-in {
          from { clip-path: inset(0 100% 0 0); filter: blur(10px); }
          to { clip-path: inset(0 0 0 0); filter: blur(0); }
        }
      `}</style>
    </Scene>
  );
}

function Place() {
  return (
    <Scene
      duration={4.4}
      className="flex items-center justify-center"
      style={{ background: "#efeae0" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "#efeae0", animation: "fade-in 280ms both" }}
      />
      <div className="relative" style={{ width: 1280, height: 720 }}>
        <Reveal enter={[40, 400]} y={12} className="absolute left-16 top-16" exit="transition">
          <div className="text-sm uppercase tracking-[0.16em]" style={{ color: MUTED }}>
            Layout
          </div>
        </Reveal>
        <div
          className="absolute rounded-[28px]"
          style={{
            left: 720,
            top: 140,
            width: 420,
            height: 420,
            border: `2px dashed ${LINE}`,
            background: CREAM,
            animation: "tile-reveal 360ms 200ms both",
          }}
        />
        <div
          className="absolute overflow-hidden rounded-3xl"
          style={{
            width: 280,
            height: 280,
            animation: "place-drop 900ms 700ms cubic-bezier(0.33,1,0.68,1) both",
          }}
        >
          <div
            className="flex h-full w-full items-center justify-center text-5xl font-semibold text-white"
            style={{ background: ACCENT }}
          >
            CAN
          </div>
        </div>
        <Cursor x={860} y={280} delay={500} duration={700} />
      </div>
      <style>{`
        @keyframes place-drop {
          from { transform: translate(80px, 200px) scale(0.7); }
          to { transform: translate(790px, 210px) scale(1.35); }
        }
      `}</style>
    </Scene>
  );
}

function Ship() {
  return (
    <Scene
      duration={4.4}
      className="flex items-center justify-center"
      style={{ background: "#f7f4ee", color: INK }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "#f7f4ee",
          animation: "whip-in 420ms cubic-bezier(0.32,0,0.67,0) both",
        }}
      />
      <div className="grid grid-cols-2 gap-8">
        {GRID.map((cell, i) => (
          <Reveal
            key={cell.label}
            enter={[180 + i * 110, 180 + i * 110 + 280]}
            y={18}
            scaleFrom={0.9}
          >
            <Card className="overflow-hidden" style={{ width: 280, height: 280 }}>
              <div
                className="flex h-full w-full items-center justify-center text-5xl font-semibold text-white"
                style={{ background: cell.color }}
              >
                {cell.label}
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
      <style>{`
        @keyframes whip-in {
          from { transform: translateX(48%); filter: blur(10px); }
          to { transform: translateX(0); filter: blur(0); }
        }
      `}</style>
    </Scene>
  );
}
