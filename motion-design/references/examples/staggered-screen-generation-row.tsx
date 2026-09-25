import {
  ACCENT,
  Card,
  Chip,
  INK,
  MUTED,
  NAVY,
  PANEL,
  Reveal,
  Solo,
  Spinner,
} from "../src/primitives";

export const duration = 5.5;
export const aspect = "landscape" as const;

const STEPS = [
  { title: "Welcome", body: "Start the flow", appearAt: 600, accent: ACCENT },
  { title: "Topics", body: "Pick three", appearAt: 1400, accent: NAVY },
  { title: "Checks", body: "Confirm setup", appearAt: 2200, accent: "#3d7a4a" },
  { title: "Deploy", body: "You're in", appearAt: 3000, accent: "#8a6a2f" },
];

const MOCKUP_W = 280;
const MOCKUP_H = 520;
const GAP = 48;
const ROW_LEFT = 328;
const ROW_TOP = 240;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} background={PANEL}>
      <div
        className="absolute inset-0"
        style={{
          transformOrigin: "50% 50%",
          animation: "screen-row-camera 5500ms cubic-bezier(0.65,0,0.35,1) both",
        }}
      >
        <Reveal
          enter={[80, 520]}
          y={-10}
          className="absolute left-20 top-16 z-10 flex items-center gap-3"
        >
          <Spinner size={28} />
          <Chip>Generating screens</Chip>
        </Reveal>

        {[0, 1, 2].map((i) => {
          const x = ROW_LEFT + (i + 1) * MOCKUP_W + i * GAP + GAP / 2 - 14;
          const y = ROW_TOP + MOCKUP_H / 2;
          return (
            <Reveal
              key={i}
              enter={[3800 + i * 120, 4100 + i * 120]}
              y={0}
              className="absolute z-[3]"
              style={{ left: x, top: y - 2 }}
            >
              <div className="text-lg font-medium" style={{ color: INK }}>
                →
              </div>
            </Reveal>
          );
        })}

        {STEPS.map((step, i) => (
          <Reveal
            key={step.title}
            enter={[step.appearAt, step.appearAt + 500]}
            y={18}
            scaleFrom={0.92}
            easeIn="out-back"
            className="absolute overflow-hidden"
            style={{
              left: ROW_LEFT + i * (MOCKUP_W + GAP),
              top: ROW_TOP,
              width: MOCKUP_W,
              height: MOCKUP_H,
            }}
          >
            <Card className="flex h-full flex-col p-6" style={{ background: "#fff" }}>
              <div className="flex justify-between text-xs font-semibold" style={{ color: MUTED }}>
                <span>9:41</span>
                <span>●●●</span>
              </div>
              <div className="mt-5 h-40 rounded-xl" style={{ background: `${step.accent}22` }} />
              <div className="mt-5 text-2xl font-semibold tracking-tight">{step.title}</div>
              <div className="mt-2 text-sm" style={{ color: MUTED }}>
                {step.body}
              </div>
              <div
                className="mt-auto rounded-full py-3 text-center text-sm font-semibold text-white"
                style={{ background: step.accent }}
              >
                Continue
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
      <style>{`
        @keyframes screen-row-camera {
          0% { transform: translate(360px, 0) scale(1.08); }
          14.5% { transform: translate(360px, 0) scale(1.08); }
          29% { transform: translate(120px, 0) scale(1.08); }
          43.6% { transform: translate(-120px, 0) scale(1.08); }
          58% { transform: translate(-360px, 0) scale(1.08); }
          80%, 100% { transform: translate(0, 0) scale(1); }
        }
      `}</style>
    </Solo>
  );
}
