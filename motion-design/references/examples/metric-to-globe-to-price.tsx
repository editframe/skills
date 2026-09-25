import type { CSSProperties } from "react";
import { Timegroup } from "@editframe/react";
import {
  Card,
  ExampleRoot,
  FONT,
  GOLD,
  Kicker,
  Rings,
  Reveal,
  Scene,
  SUCCESS,
} from "../src/primitives";

const OVERLAP = 0.4;
const HAIR = "rgba(232,240,234,0.12)";
const ROWS = [
  { name: "Brief", vol: "12.4k" },
  { name: "Checks", vol: "8.1k" },
  { name: "Deploy", vol: "6.6k" },
  { name: "SKU", vol: "3.2k" },
];
const MINI = [
  { title: "API", value: "92" },
  { title: "CLI", value: "74" },
  { title: "Studio", value: "61" },
];
const ICONS = [
  { label: "API", x: 210, y: 28, dx: "-280px", dy: "-180px" },
  { label: "CLI", x: 400, y: 120, dx: "260px", dy: "-160px" },
  { label: "CAN", x: 410, y: 310, dx: "270px", dy: "190px" },
  { label: "SKU", x: 210, y: 430, dx: "20px", dy: "230px" },
  { label: "Brief", x: 24, y: 310, dx: "-300px", dy: "170px" },
  { label: "Deploy", x: 16, y: 120, dx: "-240px", dy: "-80px" },
];

export const duration = 12.5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <ExampleRoot id={id} aspect={frame} theme="data">
      <Timegroup mode="sequence" overlap={OVERLAP} className="absolute inset-0">
        <Table />
        <Charts />
        <World />
        <PriceSnap />
      </Timegroup>
    </ExampleRoot>
  );
}

function Glow() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background: "radial-gradient(ellipse at 50% 42%, rgba(61,220,132,0.16), transparent 58%)",
      }}
    />
  );
}

function Table() {
  return (
    <Scene duration={3.5} className="flex flex-col justify-center px-40">
      <Glow />
      <Reveal enter={[40, 320]} y={14} className="mb-8" exit="transition">
        <Kicker>this week</Kicker>
      </Reveal>
      {ROWS.map((row, i) => (
        <Reveal
          key={row.name}
          enter={[200 + i * 130, 200 + i * 130 + 260]}
          y={26}
          exit="transition"
        >
          <div
            className="flex items-baseline justify-between border-b py-5"
            style={{ borderColor: HAIR }}
          >
            <span className="text-4xl font-medium">{row.name}</span>
            <span
              className="text-4xl tabular-nums"
              style={{ fontFamily: FONT.mono, color: SUCCESS }}
            >
              {row.vol}
            </span>
          </div>
        </Reveal>
      ))}
    </Scene>
  );
}

function Charts() {
  return (
    <Scene duration={3.9} className="relative">
      <Glow />
      <div
        className="absolute overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
          animation: "hero-to-slot 900ms 1100ms cubic-bezier(0.45,0,0.55,1) both",
        }}
      >
        <div className="px-8 pt-6 text-lg uppercase tracking-[0.14em]" style={{ opacity: 0.55 }}>
          Volume
        </div>
        <div className="flex h-[70%] items-end gap-4 px-8 pb-6">
          {[72, 54, 88, 40].map((h, i) => (
            <div
              key={h}
              className="flex-1 origin-bottom rounded-t-md"
              style={{
                height: `${h}%`,
                background: i === 2 ? SUCCESS : "rgba(126,200,181,0.35)",
                boxShadow: i === 2 ? `0 0 24px ${SUCCESS}88` : "none",
                animation: `bar-up 480ms ${200 + i * 80}ms cubic-bezier(0.33,1,0.68,1) both`,
              }}
            />
          ))}
        </div>
      </div>
      {MINI.map((cell, i) => (
        <Card
          key={cell.title}
          className="absolute px-8 py-7"
          style={{
            width: 400,
            height: 280,
            left: 240 + ((i + 1) % 2) * 460,
            top: i < 1 ? 200 : 520,
            animation: `tile-reveal 280ms ${1700 + i * 120}ms cubic-bezier(0.33,1,0.68,1) both`,
          }}
        >
          <div className="text-lg uppercase tracking-[0.14em]" style={{ opacity: 0.55 }}>
            {cell.title}
          </div>
          <div
            className="mt-6 text-6xl font-semibold tracking-tight"
            style={{ fontFamily: FONT.mono, color: SUCCESS }}
          >
            {cell.value}
          </div>
        </Card>
      ))}
      <style>{`
        @keyframes hero-to-slot {
          from { top: 180px; left: 420px; width: 1080px; height: 640px; }
          to { top: 200px; left: 240px; width: 400px; height: 280px; }
        }
      `}</style>
    </Scene>
  );
}

function World() {
  return (
    <Scene duration={3.4} className="flex items-center justify-center">
      <Glow />
      <div className="absolute inset-0 flex items-center justify-center opacity-40">
        <Rings stroke={SUCCESS} sw={2} count={5} gap={70} start={90} />
      </div>
      <div className="relative flex h-[520px] w-[520px] items-center justify-center">
        <div
          className="absolute rounded-full"
          style={{
            width: 280,
            height: 280,
            border: `1px solid ${SUCCESS}55`,
            background: "radial-gradient(circle at 38% 32%, #1c2a22, #0e1210 70%)",
            boxShadow: `0 0 80px ${SUCCESS}33, inset 0 1px 0 rgba(255,255,255,0.08)`,
            animation: "slam 500ms cubic-bezier(0.34,1.56,0.64,1) both",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 180,
            height: 180,
            border: `1.5px dashed ${SUCCESS}`,
            animation: "ring-pulse 2s ease-in-out 200ms infinite",
          }}
        />
        <div
          className="relative z-10 text-3xl font-semibold tracking-tight"
          style={{ fontFamily: FONT.mono }}
        >
          CAN
        </div>
        {ICONS.map((icon, i) => (
          <div
            key={icon.label}
            className="absolute"
            style={
              {
                left: icon.x,
                top: icon.y,
                "--dx": icon.dx,
                "--dy": icon.dy,
                animation: `converge-in 560ms ${180 + i * 70}ms cubic-bezier(0.33,1,0.68,1) both`,
              } as CSSProperties
            }
          >
            <div
              className="rounded-full px-5 py-2 text-sm font-medium"
              style={{
                background: i % 2 ? "rgba(61,220,132,0.16)" : "rgba(228,192,122,0.16)",
                color: i % 2 ? SUCCESS : GOLD,
                border: `1px solid ${i % 2 ? SUCCESS : GOLD}66`,
                fontFamily: FONT.mono,
              }}
            >
              {icon.label}
            </div>
          </div>
        ))}
      </div>
    </Scene>
  );
}

function PriceSnap() {
  return (
    <Scene duration={2.9} className="flex flex-col items-center justify-center">
      <Glow />
      <Reveal enter={[40, 240]} y={8}>
        <Kicker>from</Kicker>
      </Reveal>
      <div
        className="font-semibold tracking-tight"
        style={{
          fontSize: 140,
          fontFamily: FONT.mono,
          color: SUCCESS,
          textShadow: `0 0 40px ${SUCCESS}55`,
          animation: "elastic-snap 520ms 180ms cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        $12
      </div>
      <Reveal enter={[480, 760]} y={10} className="mt-2">
        <span className="text-2xl" style={{ opacity: 0.55 }}>
          per SKU
        </span>
      </Reveal>
    </Scene>
  );
}
