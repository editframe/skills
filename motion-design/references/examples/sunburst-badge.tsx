import {
  ACCENT,
  CREAM,
  LINE,
  StudyMarker,
  PANEL,
  Reveal,
  Solo,
  DisplayText,
} from "../src/primitives";

const RAYS = 24;
const SIZE = 1600;
const R = SIZE / 2;
const STEP = (Math.PI * 2) / RAYS;
const WEDGES = Array.from({ length: RAYS }, (_, i) => {
  const a0 = i * STEP - Math.PI / 2;
  const a1 = a0 + STEP;
  return `M ${R} ${R} L ${R + R * Math.cos(a0)} ${R + R * Math.sin(a0)} L ${R + R * Math.cos(a1)} ${R + R * Math.sin(a1)} Z`;
});

export const duration = 4;
export const aspect = "portrait" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <div style={{ animation: "slam 520ms 60ms cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <div style={{ animation: "spin 28s linear infinite" }}>
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
              {WEDGES.map((d, i) => (
                <path key={d} d={d} fill={i % 2 === 0 ? ACCENT : PANEL} />
              ))}
            </svg>
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex flex-col items-center rounded-[48px] px-16 py-14"
            style={{
              background: CREAM,
              border: `8px solid ${LINE}`,
              boxShadow: "0 28px 70px rgba(26,26,26,0.18)",
            }}
          >
            <div style={{ overflow: "hidden" }}>
              <div style={{ animation: "logo-wipe 460ms 360ms cubic-bezier(0.33,1,0.68,1) both" }}>
                <DisplayText size={96}>IN FOCUS</DisplayText>
              </div>
            </div>
            <Reveal enter={[640, 1020]} y={12} className="mt-8">
              <StudyMarker letter="01" size={72} />
            </Reveal>
          </div>
        </div>
        <div
          className="absolute inset-0"
          style={{
            background: ACCENT,
            transform: "translateY(100%)",
            animation: "color-wipe 480ms 3300ms cubic-bezier(0.32,0,0.67,0) forwards",
          }}
        />
      </div>
      <style>{`
        @keyframes color-wipe {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </Solo>
  );
}
