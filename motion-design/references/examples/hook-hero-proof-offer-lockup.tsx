import { Timegroup } from "@editframe/react";
import {
  ACCENT,
  Bubbles,
  Chip,
  CORAL,
  CREAM,
  ExampleRoot,
  GroundShadow,
  Kicker,
  StudyMarker,
  Price,
  ProductCan,
  Reveal,
  Rings,
  Scene,
  SEAFOAM,
  Sunburst,
  DisplayText,
} from "../src/primitives";

const OVERLAP = 0.4;

export const duration = 12;
export const aspect = "portrait" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <ExampleRoot id={id} aspect={frame} theme="social">
      <Timegroup mode="sequence" overlap={OVERLAP} className="absolute inset-0">
        <Hook />
        <Hero />
        <Proof />
        <Offer />
        <Lockup />
      </Timegroup>
    </ExampleRoot>
  );
}

function Field() {
  return (
    <>
      <div className="absolute inset-0" style={{ background: CORAL }} />
      <div style={{ animation: "spin-ccw 40s linear infinite" }}>
        <div style={{ animation: "burst-breathe 5.6s ease-in-out infinite" }}>
          <Sunburst />
        </div>
      </div>
      <div style={{ animation: "rings-pulse 4.4s ease-in-out infinite" }}>
        <Rings />
      </div>
      <Bubbles />
    </>
  );
}

function Hook() {
  return (
    <Scene
      duration={1.6}
      className="flex flex-col items-center justify-center"
      style={{ background: "#1a1210" }}
    >
      <Reveal enter={[40, 380]} y={16} exit="transition" exitY={-12}>
        <DisplayText size={180}>THE EDIT</DisplayText>
        <div
          className="mx-auto mt-7 h-px origin-center"
          style={{
            width: 180,
            background: CREAM,
            animation: "rule-draw-in 360ms 280ms cubic-bezier(0.33,1,0.68,1) both",
          }}
        />
      </Reveal>
    </Scene>
  );
}

function Hero() {
  return (
    <Scene duration={3.4} className="flex flex-col items-center justify-center overflow-hidden">
      <Field />
      <GroundShadow />
      <Reveal enter={[40, 560]} y={32} scaleFrom={0.86} exit="transition" className="relative">
        <div style={{ animation: "can-bob 4.7s ease-in-out -0.6s infinite" }}>
          <ProductCan label="01" name="SPARK" color="#1a1210" size="hero" />
        </div>
      </Reveal>
      <Reveal enter={[420, 760]} y={14} className="relative mt-10 text-center" exit="transition">
        <div
          className="font-serif text-[120px] font-extrabold italic leading-none"
          style={{ color: CREAM, textShadow: "0 6px 0 rgba(199,58,40,0.45)" }}
        >
          spark
        </div>
      </Reveal>
    </Scene>
  );
}

function Proof() {
  return (
    <Scene
      duration={3.4}
      className="flex flex-col items-center justify-center px-20"
      style={{ background: "#1a1210" }}
    >
      <Reveal enter={[40, 360]} y={12} className="mb-12" exit="transition"></Reveal>
      <div className="flex w-full flex-col gap-6">
        {[
          ["Sugar", "0g"],
          ["Fiber", "9g"],
          ["SKU", "01"],
        ].map(([k, v], i) => (
          <Reveal key={k} enter={[180 + i * 160, 180 + i * 160 + 280]} y={18} exit="transition">
            <div
              className="flex items-baseline justify-between border-b pb-4"
              style={{ borderColor: "rgba(255,246,232,0.18)" }}
            >
              <span className="text-3xl" style={{ opacity: 0.55 }}>
                {k}
              </span>
              <DisplayText size={56}>{v}</DisplayText>
            </div>
          </Reveal>
        ))}
      </div>
    </Scene>
  );
}

function Offer() {
  return (
    <Scene duration={2.6} className="flex flex-col items-center justify-center overflow-hidden">
      <Field />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 38%, ${ACCENT}40, transparent 60%)`,
          animation: "bloom 500ms both",
        }}
      />
      <Reveal enter={[40, 480]} y={16} scaleFrom={0.88} exit="transition" className="relative">
        <DisplayText size={72}>Take home</DisplayText>
      </Reveal>
      <Reveal enter={[280, 620]} y={10} className="relative mt-4" exit="transition">
        <Price value="$12" delay={0} />
      </Reveal>
    </Scene>
  );
}

function Lockup() {
  return (
    <Scene
      duration={2.6}
      className="flex flex-col items-center justify-center"
      style={{ background: "#1a1210" }}
    >
      <Reveal enter={[40, 420]} y={0} scaleFrom={0.78} easeIn="out-back">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              outline: `2px solid ${SEAFOAM}`,
              outlineOffset: 22,
              animation: "ring-pulse 2.2s ease-in-out 400ms infinite",
            }}
          />
          <StudyMarker letter="01" size={108} />
        </div>
      </Reveal>
      <Reveal enter={[280, 560]} y={12} className="mt-14">
        <DisplayText size={56}>THE EDIT</DisplayText>
      </Reveal>
      <Reveal enter={[480, 720]} y={8} className="mt-6">
        <Chip delay={0}>Explore the collection</Chip>
      </Reveal>
    </Scene>
  );
}
