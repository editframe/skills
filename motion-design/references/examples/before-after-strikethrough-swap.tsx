import {
  ACCENT,
  Bubbles,
  Chip,
  CORAL,
  CREAM,
  Kicker,
  Reveal,
  Solo,
  Sunburst,
  DisplayText,
} from "../src/primitives";

export const duration = 5;
export const aspect = "portrait" as const;

const CHIPS = [
  { label: "0g", sub: "sugar", delay: 1880 },
  { label: "9g", sub: "fiber", delay: 2080 },
  { label: "SKU", sub: "01", delay: 2280 },
];

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} theme="social">
      <div style={{ animation: "spin 51s linear infinite" }}>
        <Sunburst />
      </div>
      <Bubbles />

      <div className="relative flex h-full w-full flex-col items-center px-[90px] pt-[240px]">
        <Reveal enter={[0, 380]} y={-16} className="mb-10 w-full text-center">
          <Kicker>the swap</Kicker>
          <div className="mt-3">
            <DisplayText size={72}>ditch the sugar</DisplayText>
          </div>
        </Reveal>

        <div
          className="w-full"
          style={{
            animation: [
              "swap-old-in 460ms 280ms cubic-bezier(0.34,1.56,0.64,1) both",
              "swap-old-dim 420ms 980ms linear both",
            ].join(", "),
          }}
        >
          <div
            className="relative rounded-[28px] px-11 py-10"
            style={{
              background: "#2a1c1a",
              boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
              border: "4px solid #1a1210",
            }}
          >
            <Kicker>old formula</Kicker>
            <div className="relative mt-2 flex items-baseline gap-3">
              <DisplayText size={120}>39g</DisplayText>
              <div className="text-4xl font-semibold" style={{ color: ACCENT }}>
                sugar
              </div>
              <div
                className="absolute left-0 top-[58%]"
                style={{
                  width: 420,
                  height: 10,
                  background: ACCENT,
                  borderRadius: 8,
                  transformOrigin: "0 50%",
                  animation: "strike-draw 280ms 820ms cubic-bezier(0.33,1,0.68,1) both",
                }}
              />
            </div>
            <div className="mt-3 text-xl font-medium" style={{ opacity: 0.55 }}>
              spikes · crashes · no fiber
            </div>
          </div>
        </div>

        <div
          className="z-10 my-6 flex h-[120px] w-[120px] items-center justify-center rounded-full"
          style={{
            background: CREAM,
            color: CORAL,
            border: `6px solid ${CREAM}`,
            boxShadow: "0 12px 30px rgba(26,18,16,0.35)",
            animation: "slam 360ms 1180ms cubic-bezier(0.34,1.56,0.64,1) both",
          }}
        >
          <DisplayText size={56}>vs</DisplayText>
        </div>

        <div
          className="w-full"
          style={{ animation: "slam 420ms 1480ms cubic-bezier(0.34,1.56,0.64,1) both" }}
        >
          <div
            className="rounded-[28px] px-11 py-10"
            style={{
              background: "#1a1210",
              boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
              border: `4px solid ${CREAM}`,
            }}
          >
            <DisplayText size={48}>LESS SUGAR</DisplayText>
            <div className="mt-6 flex gap-4">
              {CHIPS.map((chip) => (
                <div
                  key={chip.label}
                  className="flex flex-1 flex-col items-center rounded-2xl py-5"
                  style={{
                    background: CREAM,
                    color: "#1a1210",
                    animation: `tile-reveal 320ms ${chip.delay}ms cubic-bezier(0.34,1.56,0.64,1) both`,
                  }}
                >
                  <DisplayText size={44}>{chip.label}</DisplayText>
                  <div className="mt-2">
                    <Kicker>{chip.sub}</Kicker>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Reveal enter={[2480, 2800]} y={12} className="mt-8">
          <Chip active>checks green</Chip>
        </Reveal>
      </div>
      <style>{`
        @keyframes swap-old-in {
          from { opacity: 0; transform: translateX(-80px) rotate(-5deg); }
          to { opacity: 1; transform: translateX(0) rotate(-2deg); }
        }
        @keyframes swap-old-dim {
          from { filter: grayscale(0); }
          to { filter: grayscale(0.7); }
        }
      `}</style>
    </Solo>
  );
}
