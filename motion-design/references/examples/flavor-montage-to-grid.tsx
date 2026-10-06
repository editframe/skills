import type { CSSProperties } from "react";
import { ACCENT, ProductCan, Reveal, Solo, Sunburst, DisplayText } from "../src/primitives";

export const duration = 5;
export const aspect = "portrait" as const;

const PER_CAN = 480;
const CAN0 = 200;
const GRID_AT = 3380;

const CANS = [
  { label: "01", name: "classic", color: ACCENT },
  { label: "02", name: "reserve", color: "#1e3a5f" },
  { label: "03", name: "studio", color: "#2f6b55" },
  { label: "04", name: "limited", color: "#8a6a2f" },
  { label: "05", name: "night", color: "#5c3d6e" },
  { label: "06", name: "field", color: "#2a211c" },
].map((can, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  return {
    ...can,
    t0: CAN0 + i * PER_CAN,
    gridX: (col - 1) * 250,
    gridY: 80 + row * 340,
    gridRot: (col - 1) * 5,
  };
});

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} theme="social" background={ACCENT}>
      <div
        className="absolute inset-0"
        style={{ animation: "flavor-bg-cycle 5000ms linear both" }}
      />
      <div className="absolute inset-0" style={{ opacity: 0.4 }}>
        <div style={{ animation: "spin-ccw 36s linear infinite" }}>
          <Sunburst colorA="rgba(255,255,255,0.22)" colorB="rgba(255,255,255,0.05)" />
        </div>
      </div>

      {CANS.map((can) => (
        <div key={can.label}>
          <div
            className="absolute"
            style={
              {
                left: "50%",
                top: 900,
                width: 280,
                height: 520,
                "--grid-x": `${can.gridX}px`,
                "--grid-y": `${can.gridY}px`,
                "--grid-rot": `${can.gridRot}deg`,
                animation: [
                  `flavor-cycle 720ms ${can.t0}ms both`,
                  `flavor-grid-in 460ms ${GRID_AT}ms cubic-bezier(0.33,1,0.68,1) forwards`,
                ].join(", "),
              } as CSSProperties
            }
          >
            <div
              style={{
                animation: "can-bob 4.7s ease-in-out infinite",
                animationDelay: `-${can.label}s`,
              }}
            >
              <ProductCan
                color={can.color}
                label={can.label}
                size="hero"
                width={280}
                height={520}
              />
            </div>
          </div>
          <div
            className="absolute text-center"
            style={{
              left: "50%",
              top: 1480,
              animation: [
                `flavor-label-cycle 520ms ${can.t0 + 80}ms both`,
                `fade-out 40ms ${GRID_AT}ms forwards`,
              ].join(", "),
            }}
          >
            <DisplayText size={56}>{can.name}</DisplayText>
          </div>
        </div>
      ))}

      <div className="absolute left-1/2 top-[280px] -translate-x-1/2 text-center">
        <Reveal enter={[3600, 4040]} y={16} easeIn="out-back"></Reveal>
        <Reveal enter={[3680, 4140]} y={20} easeIn="out-back" className="mt-3">
          <DisplayText size={72}>
            find your
            <br />
            can
          </DisplayText>
        </Reveal>
      </div>
      <style>{`
        @keyframes flavor-bg-cycle {
          0%, 3.9% { background: ${ACCENT}; }
          4%, 13.5% { background: ${ACCENT}; }
          13.6%, 23.1% { background: #1e3a5f; }
          23.2%, 32.7% { background: #2f6b55; }
          32.8%, 42.3% { background: #8a6a2f; }
          42.4%, 51.9% { background: #5c3d6e; }
          52%, 67.5% { background: #2a211c; }
          67.6%, 100% { background: #1a1210; }
        }
        @keyframes flavor-cycle {
          0% { opacity: 0; transform: translate(-50%, -50%) translateY(50px) scale(0.8) rotate(-6deg); animation-timing-function: cubic-bezier(0.34,1.56,0.64,1); }
          38% { opacity: 1; transform: translate(-50%, -50%) translateY(0) scale(1) rotate(0deg); }
          68% { opacity: 1; transform: translate(-50%, -50%) translateY(0) scale(1) rotate(0deg); animation-timing-function: cubic-bezier(0.32,0,0.67,0); }
          100% { opacity: 0; transform: translate(-50%, -50%) translateY(-70px) scale(0.9) rotate(5deg); }
        }
        @keyframes flavor-grid-in {
          from { opacity: 1; transform: translate(-50%, -50%); }
          to { opacity: 1; transform: translate(calc(-50% + var(--grid-x)), calc(-50% + var(--grid-y))) scale(0.46) rotate(var(--grid-rot)); }
        }
        @keyframes flavor-label-cycle {
          0% { opacity: 0; transform: translateX(-50%) translateY(24px); }
          40% { opacity: 1; transform: translateX(-50%) translateY(0); }
          72% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </Solo>
  );
}
