import {
  ACCENT,
  Bubbles,
  ProductCan,
  Reveal,
  Solo,
  Sunburst,
  DisplayText,
} from "../src/primitives";

const WAYS = [
  { name: "Ink", color: "#1a1210", label: "01" },
  { name: "Navy", color: "#1e3a5f", label: "02" },
  { name: "Brick", color: ACCENT, label: "03" },
  { name: "Sage", color: "#2f6b55", label: "04" },
  { name: "Bone", color: "#c4b8a4", label: "05" },
  { name: "Smoke", color: "#5a6570", label: "06" },
  { name: "Clay", color: "#8a5a44", label: "07" },
  { name: "Sand", color: "#c9a66b", label: "08" },
  { name: "Port", color: "#6b2d3c", label: "09" },
];

const STAGGER = 110;
const BASE = 520;

export const duration = 4.5;
export const aspect = "portrait" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} theme="social">
      <div style={{ animation: "spin-ccw 40s linear infinite" }}>
        <div style={{ animation: "burst-breathe 5.6s ease-in-out infinite" }}>
          <Sunburst />
        </div>
      </div>
      <Bubbles />

      <div className="relative flex h-full w-full flex-col items-center px-14 pt-28">
        <Reveal enter={[80, 560]} y={22} className="text-center">
          <DisplayText size={72}>The Range</DisplayText>
        </Reveal>

        <div className="mt-16 grid w-full grid-cols-3 gap-6">
          {WAYS.map((way, i) => (
            <Reveal
              key={way.label}
              enter={[BASE + i * STAGGER, BASE + 560 + i * STAGGER]}
              exit={[3800, 4300]}
              exitY={-28 - (i % 3) * 10}
              y={36}
              scaleFrom={0.94}
              className="flex flex-col items-center rounded-3xl px-3 pb-5 pt-6"
              style={{ background: i % 2 === 0 ? "rgba(26,18,16,0.45)" : "rgba(26,18,16,0.28)" }}
            >
              <div
                style={{
                  animation: "can-bob 4.7s ease-in-out infinite",
                  animationDelay: `-${i * 0.25}s`,
                }}
              >
                <ProductCan color={way.color} label={way.label} size="lineup" height={320} />
              </div>
              <div className="mt-4">
                <DisplayText size={22}>{way.name}</DisplayText>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Solo>
  );
}
