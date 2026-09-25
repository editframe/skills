import { Timegroup } from "@editframe/react";
import {
  ACCENT,
  Bubbles,
  Chip,
  CORAL,
  CREAM,
  ExampleRoot,
  FONT,
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
  useAspect,
  DisplayText,
} from "../src/primitives";

const OVERLAP = 0.4;
export const duration = 20;
export const aspect = "portrait" as const;

const SKUS = [
  { label: "01", name: "CLASSIC", color: "#1a1210" },
  { label: "02", name: "NIGHT", color: "#1e3a5f" },
  { label: "03", name: "TOAST", color: "#5a3a24" },
  { label: "04", name: "GROVE", color: "#2f6b55" },
] as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <ExampleRoot id={id} aspect={frame} theme="social">
      <Timegroup mode="sequence" overlap={OVERLAP} className="absolute inset-0">
        <Hook />
        <Hero />
        <Proof />
        <Range />
        <Offer />
        <Lockup />
      </Timegroup>
    </ExampleRoot>
  );
}

function Field() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
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
    </div>
  );
}

function Flavor({ children }: { children: string }) {
  return (
    <div
      className="text-center"
      style={{
        fontFamily: FONT.serif,
        fontWeight: 800,
        fontStyle: "italic",
        fontSize: "12cqh",
        lineHeight: 0.88,
        color: CREAM,
        textShadow: "0 6px 0 rgba(199,58,40,0.45)",
      }}
    >
      {children}
    </div>
  );
}

function Hook() {
  const frame = useAspect();
  return (
    <Scene
      duration={2}
      className="flex flex-col items-center justify-center"
      style={{ background: "#1a1210" }}
    >
      <Reveal enter={[80, 520]} y={28} exit="transition" exitY={-20}>
        <DisplayText size={frame === "landscape" ? 160 : 200}>FRESH</DisplayText>
        <div
          className="mx-auto mt-8 h-1 origin-center"
          style={{
            width: 220,
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
    <Scene duration={4.4} className="flex flex-col items-center justify-center overflow-hidden">
      <Field />
      <GroundShadow />
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
        <Reveal enter={[80, 800]} y={36} scaleFrom={0.86} exit="transition" className="relative">
          <div style={{ animation: "can-bob 4.7s ease-in-out -1.2s infinite" }}>
            <ProductCan label="01" name="SPARK" color="#1a1210" size="hero" />
          </div>
        </Reveal>
        <Reveal
          enter={[560, 980]}
          y={18}
          className="relative mt-[3%] text-center"
          exit="transition"
        >
          <Flavor>spark</Flavor>
          <div className="mt-[2%]">
            <Kicker>prebiotics · botanicals · plant fiber</Kicker>
          </div>
        </Reveal>
      </div>
    </Scene>
  );
}

function Proof() {
  const frame = useAspect();
  const well =
    frame === "landscape"
      ? { width: "min(720px, 58%)", height: 780 }
      : frame === "square"
        ? { width: "min(640px, 78%)", height: 720 }
        : { width: "min(760px, 78%)", height: 980 };
  return (
    <Scene
      duration={5.4}
      className="flex flex-col items-center justify-center px-[var(--gutter)]"
      style={{ background: "#1a1210" }}
    >
      <Reveal enter={[40, 420]} y={18} className="mb-8 text-center" exit="transition"></Reveal>
      <Reveal
        enter={[120, 640]}
        y={24}
        scaleFrom={0.96}
        exit="transition"
        className="w-full max-w-[760px]"
      >
        <div className="relative mx-auto" style={well}>
          {[
            "-left-3 -top-3 border-l-2 border-t-2",
            "-right-3 -top-3 border-r-2 border-t-2",
            "-bottom-3 -left-3 border-l-2 border-b-2",
            "-bottom-3 -right-3 border-r-2 border-b-2",
          ].map((cls) => (
            <div key={cls} className={`absolute h-16 w-16 ${cls}`} style={{ borderColor: CREAM }} />
          ))}
          <div
            className="flex h-full items-center justify-center overflow-hidden rounded-[36px]"
            style={{ background: "#2a1c1a", boxShadow: "inset 0 0 0 1px rgba(255,246,232,0.12)" }}
          >
            <div className="absolute inset-0" style={{ background: CORAL }} />
            <div
              className="relative"
              style={{ animation: "can-bob 4.7s ease-in-out -0.4s infinite" }}
            >
              <ProductCan label="01" name="SPARK" color="#1a1210" size="hero" />
            </div>
          </div>
        </div>
      </Reveal>
      <div className="relative mt-10 flex gap-4">
        {["0g", "CAN", "12"].map((label, i) => (
          <Chip key={label} delay={900 + i * 90} active={i === 1}>
            {label}
          </Chip>
        ))}
      </div>
    </Scene>
  );
}

function Range() {
  const frame = useAspect();
  const stacked = frame !== "landscape";
  return (
    <Scene
      duration={3.9}
      className="flex flex-col items-center justify-center px-[var(--gutter)]"
      style={{ background: CREAM, color: "#1a1210" }}
    >
      <Reveal enter={[40, 360]} y={12} className="mb-10" exit="transition">
        <DisplayText size={frame === "landscape" ? 72 : 88}>the range</DisplayText>
      </Reveal>
      <div
        className={stacked ? "grid grid-cols-2 gap-x-12 gap-y-10" : "flex justify-center gap-12"}
      >
        {SKUS.map((sku, i) => (
          <Reveal
            key={sku.label}
            enter={[160 + i * 110, 160 + i * 110 + 320]}
            y={28}
            scaleFrom={0.86}
            exit="transition"
          >
            <div
              style={{
                animation: `sku-lift 700ms ${1100 + i * 220}ms cubic-bezier(0.34,1.56,0.64,1) both`,
              }}
            >
              <ProductCan label={sku.label} name={sku.name} color={sku.color} size="lineup" />
            </div>
            <div className="mt-4 text-center">
              <div
                style={{
                  fontFamily: FONT.serif,
                  fontStyle: "italic",
                  fontSize: 36,
                  fontWeight: 700,
                }}
              >
                {sku.name}
              </div>
              <Kicker>sku {sku.label}</Kicker>
            </div>
          </Reveal>
        ))}
      </div>
      <style>{`
        @keyframes sku-lift {
          0%, 100% { transform: translateY(0); }
          40% { transform: translateY(-18px); }
        }
      `}</style>
    </Scene>
  );
}

function Offer() {
  return (
    <Scene duration={2.9} className="flex flex-col items-center justify-center overflow-hidden">
      <Field />
      <Reveal enter={[40, 520]} y={20} scaleFrom={0.84} exit="transition" className="relative">
        <div
          className="relative flex items-end justify-center"
          style={{ width: "min(720px, 86%)", height: 520 }}
        >
          <div
            className="absolute left-[4%] top-16"
            style={{ animation: "can-bob 4.7s ease-in-out -0.8s infinite" }}
          >
            <ProductCan label="01" name="SPARK" color="#1a1210" size="pack" />
          </div>
          <div
            className="absolute left-1/2 top-0 -translate-x-1/2"
            style={{ animation: "can-bob 4.7s ease-in-out -1.4s infinite", zIndex: 2 }}
          >
            <ProductCan label="02" name="NIGHT" color="#1e3a5f" size="pack" />
          </div>
          <div
            className="absolute right-[4%] top-16"
            style={{ animation: "can-bob 4.7s ease-in-out -0.2s infinite" }}
          >
            <ProductCan label="03" name="TOAST" color="#5a3a24" size="pack" />
          </div>
        </div>
      </Reveal>
      <Reveal enter={[380, 720]} y={16} className="relative mt-6 text-center" exit="transition">
        <Flavor>3-pack</Flavor>
        <Price value="$28" delay={0} />
      </Reveal>
    </Scene>
  );
}

function Lockup() {
  const frame = useAspect();
  return (
    <Scene
      duration={3.4}
      className="flex flex-col items-center justify-center"
      style={{ background: "#1a1210" }}
    >
      <Reveal enter={[80, 520]} y={0} scaleFrom={0.7} easeIn="out-back">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              outline: `2px solid ${SEAFOAM}`,
              outlineOffset: 28,
              animation: "ring-pulse 2.2s ease-in-out 400ms infinite",
            }}
          />
          <StudyMarker letter="01" size={frame === "landscape" ? 160 : 196} />
        </div>
      </Reveal>
      <Reveal enter={[420, 780]} y={16} className="mt-16">
        <DisplayText size={frame === "landscape" ? 120 : 160}>FRESH</DisplayText>
      </Reveal>
      <Reveal enter={[720, 1000]} y={8} className="mt-8">
        <div
          className="rounded-full px-10 py-4"
          style={{
            border: "1px solid rgba(255,246,232,0.28)",
            background: "rgba(255,246,232,0.06)",
          }}
        >
          <span className="font-mono text-2xl" style={{ opacity: 0.8 }}>
            Explore the collection
          </span>
        </div>
      </Reveal>
    </Scene>
  );
}
