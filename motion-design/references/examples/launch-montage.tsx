import { Timegroup } from "@editframe/react";
import {
  Card,
  Chip,
  ExampleRoot,
  Kicker,
  StudyMarker,
  Reveal,
  Scene,
  SELECT,
  SUCCESS,
  DisplayText,
} from "../src/primitives";

const OVERLAP = 0.4;

export const duration = 22;
export const aspect = "landscape" as const;

const ROWS = [
  { name: "Brief", vol: "12.4k", delta: "+18%" },
  { name: "Checks", vol: "8.1k", delta: "+9%" },
  { name: "Deploy", vol: "6.6k", delta: "+24%" },
  { name: "SKU", vol: "3.2k", delta: "+11%" },
];

const REQUESTS = ["Brief", "Checks", "SKU"];
const OUTPUTS = ["CAN", "API", "CLI"];

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <ExampleRoot id={id} aspect={frame} theme="saas">
      <Timegroup mode="sequence" overlap={OVERLAP} className="absolute inset-0">
        <Claim />
        <Metrics />
        <Diagram />
        <Name />
        <Available />
        <Logo />
      </Timegroup>
    </ExampleRoot>
  );
}

function Claim() {
  const words = ["Route", "every", "request."];
  return (
    <Scene duration={2.5} className="flex items-center justify-center">
      <div className="flex gap-6 text-8xl font-semibold tracking-tight">
        {words.map((word, i) => (
          <Reveal key={word} enter={[i * 90, i * 90 + 320]} y={22} exit="transition">
            {word}
          </Reveal>
        ))}
      </div>
    </Scene>
  );
}

function Metrics() {
  return (
    <Scene duration={4.9} className="flex flex-col items-center justify-center px-32">
      <Reveal enter={[40, 360]} y={16} className="mb-10 w-full" exit="transition">
        <Kicker>volume this week</Kicker>
      </Reveal>
      <div className="w-full">
        <div
          className="mb-4 flex text-lg uppercase tracking-[0.14em]"
          style={{ color: "rgba(244,241,234,0.45)" }}
        >
          {["Surface", "Volume", "Δ"].map((h, i) => (
            <Reveal key={h} enter={[180 + i * 60, 180 + i * 60 + 220]} y={8} className="flex-1">
              {h}
            </Reveal>
          ))}
        </div>
        <div
          className="mb-4 h-px origin-left"
          style={{
            background: "rgba(255,255,255,0.12)",
            animation: "rule-draw-in 400ms 360ms both",
          }}
        />
        {ROWS.map((row, i) => (
          <Reveal
            key={row.name}
            enter={[420 + i * 140, 420 + i * 140 + 280]}
            y={28}
            exit="transition"
          >
            <div
              className="flex items-baseline border-b py-5 text-4xl"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}
            >
              <span className="flex-1 font-medium">{row.name}</span>
              <span className="flex-1 tabular-nums">{row.vol}</span>
              <span className="flex-1" style={{ color: SUCCESS }}>
                {row.delta}
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </Scene>
  );
}

function Diagram() {
  return (
    <Scene duration={5.4} className="flex items-center justify-center gap-10 px-[var(--gutter)]">
      <div className="flex flex-col gap-5">
        {REQUESTS.map((label, i) => (
          <Reveal
            key={label}
            enter={[80 + i * 140, 80 + i * 140 + 280]}
            x={-40}
            y={0}
            exit="transition"
          >
            <Card className="px-8 py-5 text-3xl font-medium" style={{ width: 280 }}>
              {label}
            </Card>
          </Reveal>
        ))}
      </div>
      <div className="flex flex-col items-center gap-8">
        {REQUESTS.map((label) => (
          <div
            key={label}
            className="h-1 origin-left"
            style={{
              width: 120,
              background: "rgba(255,255,255,0.28)",
              animation: "rule-draw-in 360ms 720ms cubic-bezier(0.33,1,0.68,1) both",
            }}
          />
        ))}
      </div>
      <Reveal enter={[900, 1280]} y={0} scaleFrom={0.7} easeIn="out-back" exit="transition">
        <div
          className="flex h-36 w-36 items-center justify-center rounded-full text-2xl font-semibold text-white"
          style={{
            background: SELECT,
            boxShadow: "0 0 40px rgba(91,140,255,0.35)",
          }}
        >
          CAN
        </div>
      </Reveal>
      <div className="flex flex-col items-center gap-8">
        {OUTPUTS.map((label) => (
          <div
            key={label}
            className="h-1 origin-left"
            style={{
              width: 120,
              background: "rgba(255,255,255,0.28)",
              animation: "rule-draw-in 360ms 1280ms cubic-bezier(0.33,1,0.68,1) both",
            }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-5">
        {OUTPUTS.map((label, i) => (
          <Reveal
            key={label}
            enter={[1400 + i * 120, 1400 + i * 120 + 260]}
            x={40}
            y={0}
            exit="transition"
          >
            <Card
              className="overflow-hidden px-8 py-5 text-3xl font-medium"
              style={{
                width: 280,
                animation: `out-state 2.4s ${1800 + i * 180}ms both`,
              }}
            >
              {label}
            </Card>
          </Reveal>
        ))}
      </div>
      <style>{`
        @keyframes out-state {
          0% { background: rgba(255,255,255,0.04); color: rgba(244,241,234,0.55); }
          45% { background: rgba(91,140,255,0.22); color: #f4f1ea; }
          100% { background: ${SELECT}; color: #fff; }
        }
      `}</style>
    </Scene>
  );
}

function Name() {
  return (
    <Scene duration={3.9} className="flex items-center justify-center">
      <Reveal enter={[40, 200]} y={0} exit="transition">
        <div
          className="text-9xl font-semibold tracking-tight"
          style={{ animation: "logo-wipe 900ms 80ms cubic-bezier(0.33,1,0.68,1) both" }}
        >
          READY
        </div>
      </Reveal>
    </Scene>
  );
}

function Available() {
  const words = ["Available", "now"];
  return (
    <Scene duration={3.9} className="flex flex-col items-center justify-center">
      <div className="flex gap-5 text-7xl font-semibold tracking-tight">
        {words.map((word, i) => (
          <Reveal key={word} enter={[i * 80, i * 80 + 300]} y={18} exit="transition">
            {word}
          </Reveal>
        ))}
      </div>
      <div className="mt-12 flex gap-4">
        {["API", "CLI", "Studio"].map((label, i) => (
          <Chip key={label} delay={600 + i * 100} active={i === 1}>
            {label}
          </Chip>
        ))}
      </div>
    </Scene>
  );
}

function Logo() {
  return (
    <Scene duration={3.4} className="flex flex-col items-center justify-center">
      <Reveal enter={[40, 480]} y={0} scaleFrom={0.72} easeIn="out-back">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: SELECT, opacity: 0.22, animation: "halo-glow 900ms both" }}
          />
          <StudyMarker letter="01" size={120} />
        </div>
      </Reveal>
      <Reveal enter={[360, 680]} y={12} className="mt-8">
        <DisplayText size={64} serif={false}>
          READY
        </DisplayText>
      </Reveal>
      <Reveal enter={[560, 820]} y={8} className="mt-4">
        <Kicker>Start your next project</Kicker>
      </Reveal>
    </Scene>
  );
}
