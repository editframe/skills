import {
  ACCENT,
  Bubbles,
  CREAM,
  ProductCan,
  Reveal,
  Solo,
  Sunburst,
  DisplayText,
} from "../src/primitives";

const WAYS = [
  { name: "INK", color: "#1a1210", label: "01" },
  { name: "NAVY", color: "#1e3a5f", label: "02" },
  { name: "BRICK", color: ACCENT, label: "03" },
  { name: "SAGE", color: "#2f6b55", label: "04" },
  { name: "BONE", color: "#c4b8a4", label: "05" },
  { name: "SMOKE", color: "#5a6570", label: "06" },
];

const STARTS = [420, 1180, 1680, 2180, 2680, 3180];
const ENDS = [1180, 1680, 2180, 2680, 3180, 5000];
const CROSS = 90;

export const duration = 5;
export const aspect = "portrait" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} theme="social" background="#1a1210">
      <div className="absolute inset-0" style={{ opacity: 0.35 }}>
        <div style={{ animation: "spin-ccw 40s linear infinite" }}>
          <Sunburst />
        </div>
      </div>
      <Bubbles />

      <div className="relative flex h-full w-full flex-col items-center px-16 pt-24">
        <Reveal enter={[80, 420]} y={24} className="w-full">
          <DisplayText size={88}>6 COLORWAYS</DisplayText>
        </Reveal>

        <div className="relative mt-16 h-[920px] w-[520px] overflow-hidden rounded-[40px]">
          {WAYS.map((way, i) => (
            <Reveal
              key={way.label}
              enter={[STARTS[i], STARTS[i] + CROSS]}
              exit={i < WAYS.length - 1 ? [ENDS[i] - CROSS, ENDS[i]] : undefined}
              y={0}
              scaleFrom={0.94}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div
                style={{
                  animation: "can-bob 4.7s ease-in-out infinite",
                  animationDelay: `-${i * 0.3}s`,
                }}
              >
                <ProductCan color={way.color} label={way.label} size="hero" />
              </div>
            </Reveal>
          ))}
          <div className="absolute bottom-10 left-0 right-0 h-16 text-center">
            {WAYS.map((way, i) => (
              <Reveal
                key={way.name}
                enter={[STARTS[i], STARTS[i] + CROSS]}
                exit={i < WAYS.length - 1 ? [ENDS[i] - CROSS, ENDS[i]] : undefined}
                y={8}
                className="absolute inset-x-0"
              >
                <DisplayText size={40}>{way.name}</DisplayText>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="mt-16 flex w-full justify-between gap-3">
          {WAYS.map((way, i) => (
            <div
              key={way.label}
              className="relative flex flex-1 flex-col items-center"
              style={{
                animation: `tile-reveal 240ms ${520 + i * 60}ms cubic-bezier(0.33,1,0.68,1) both`,
              }}
            >
              <ProductCan color={way.color} label={way.label} size="pack" height={260} />
              <Reveal
                enter={[STARTS[i], STARTS[i] + CROSS]}
                exit={i < WAYS.length - 1 ? [ENDS[i] - CROSS, ENDS[i]] : undefined}
                y={0}
                className="pointer-events-none absolute -inset-1 rounded-3xl"
                style={{ border: `4px solid ${CREAM}`, boxShadow: `0 0 0 3px ${ACCENT}` }}
              />
            </div>
          ))}
        </div>
      </div>
    </Solo>
  );
}
