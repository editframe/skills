import {
  ACCENT,
  Bubbles,
  Chip,
  GroundShadow,
  Kicker,
  Price,
  ProductCan,
  Reveal,
  Rings,
  Solo,
  Sunburst,
  DisplayText,
} from "../src/primitives";

export const duration = 5;
export const aspect = "portrait" as const;

const CANS = [
  { color: ACCENT, label: "01", x: -150, rot: -14, z: 1 },
  { color: "#1e3a5f", label: "02", x: 0, rot: 0, z: 3 },
  { color: "#2a211c", label: "03", x: 150, rot: 12, z: 2 },
];

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} theme="social">
      <div style={{ animation: "spin 45s linear infinite" }}>
        <div style={{ animation: "burst-breathe 5.6s ease-in-out infinite" }}>
          <Sunburst />
        </div>
      </div>
      <div style={{ animation: "rings-pulse 4.4s ease-in-out infinite" }}>
        <Rings />
      </div>
      <Bubbles />
      <GroundShadow width={700} />

      <div className="relative flex h-full w-full flex-col items-center justify-center">
        <Reveal enter={[80, 520]} y={16} className="text-center"></Reveal>
        <Reveal enter={[220, 720]} y={20} className="mt-3 text-center">
          <DisplayText size={88}>the bundle</DisplayText>
        </Reveal>

        <Reveal
          enter={[480, 1100]}
          y={48}
          scaleFrom={0.72}
          className="relative mt-16 h-[520px] w-[640px]"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {CANS.map((can) => (
              <div
                key={can.label}
                className="absolute"
                style={{
                  zIndex: can.z,
                  transform: `translateX(${can.x}px) rotate(${can.rot}deg)`,
                }}
              >
                <div
                  style={{
                    animation: "can-bob 4.7s ease-in-out infinite",
                    animationDelay: `-${can.z * 0.4}s`,
                  }}
                >
                  <ProductCan color={can.color} label={can.label} size="lineup" />
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal enter={[980, 1380]} y={14} className="mt-10 text-center">
          <Price value="$36" delay={0} />
          <div
            className="mt-3"
            style={{ animation: "offer-sub-wipe 500ms 1280ms cubic-bezier(0.33,1,0.68,1) both" }}
          ></div>
        </Reveal>
      </div>

      <style>{`
        @keyframes offer-sub-wipe {
          from { clip-path: inset(0 100% 0 0); }
          to { clip-path: inset(0 0 0 0); }
        }
      `}</style>
    </Solo>
  );
}
