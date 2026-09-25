import {
  ACCENT,
  Bubbles,
  CORAL,
  CREAM,
  Kicker,
  ProductCan,
  Reveal,
  SEAFOAM,
  Solo,
  Sunburst,
  DisplayText,
} from "../src/primitives";

export const duration = 5;
export const aspect = "portrait" as const;

const WELL = { x: 140, y: 620, w: 800, h: 800, r: 36 };

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} theme="social" background={SEAFOAM}>
      <div className="absolute inset-0" style={{ opacity: 0.5 }}>
        <div style={{ animation: "spin 60s linear infinite" }}>
          <Sunburst colorA="#5fb39f" colorB={SEAFOAM} />
        </div>
      </div>
      <Bubbles />

      <div className="absolute left-0 right-0 text-center" style={{ top: 220 }}>
        <Reveal enter={[200, 640]} y={-20}></Reveal>
        <Reveal enter={[360, 860]} y={18} className="mt-4">
          <DisplayText size={88}>
            a new kind
            <br />
            of can
          </DisplayText>
        </Reveal>
      </div>

      <div
        className="absolute"
        style={{
          left: WELL.x - 28,
          top: WELL.y - 28,
          width: WELL.w + 56,
          height: WELL.h + 56,
          borderRadius: WELL.r + 24,
          background: CREAM,
          boxShadow: "0 40px 80px rgba(15,40,36,0.45)",
          animation: "well-frame-in 480ms 80ms cubic-bezier(0.33,1,0.68,1) both",
        }}
      />
      <div
        className="absolute overflow-hidden"
        style={{
          left: WELL.x,
          top: WELL.y,
          width: WELL.w,
          height: WELL.h,
          borderRadius: WELL.r,
          background: "#2a1c1a",
          border: `4px solid #1a1210`,
          animation: "well-frame-in 480ms 80ms cubic-bezier(0.33,1,0.68,1) both",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: CORAL,
            animation: "well-push 5000ms cubic-bezier(0.45,0,0.55,1) both",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{ animation: "can-bob 4.7s ease-in-out -0.4s infinite" }}>
            <ProductCan label="01" name="SPARK" color="#1a1210" size="hero" height={680} />
          </div>
        </div>
        <div
          className="absolute left-1/2 top-1/2 flex h-28 w-28 items-center justify-center rounded-full"
          style={{
            marginLeft: -56,
            marginTop: -56,
            background: "rgba(255,246,232,0.94)",
            boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
            animation: "slam 420ms 520ms cubic-bezier(0.34,1.56,0.64,1) both",
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              marginLeft: 8,
              borderTop: "22px solid transparent",
              borderBottom: "22px solid transparent",
              borderLeft: `34px solid ${ACCENT}`,
            }}
          />
        </div>
        <div
          className="pointer-events-none absolute"
          style={{
            inset: 14,
            border: "1px solid rgba(255,246,232,0.35)",
            borderRadius: WELL.r - 10,
          }}
        />
      </div>

      {[
        { top: WELL.y - 18, left: WELL.x - 18 },
        { top: WELL.y - 18, left: WELL.x + WELL.w - 10 },
        { top: WELL.y + WELL.h - 10, left: WELL.x - 18 },
        { top: WELL.y + WELL.h - 10, left: WELL.x + WELL.w - 10 },
      ].map((mark, i) => (
        <div
          key={i}
          className="absolute h-7 w-7"
          style={{
            top: mark.top,
            left: mark.left,
            borderColor: CREAM,
            borderStyle: "solid",
            borderWidth: `${i < 2 ? 3 : 0}px ${i % 2 ? 3 : 0}px ${i < 2 ? 0 : 3}px ${i % 2 ? 0 : 3}px`,
            animation: `fade-in 280ms ${720 + i * 80}ms both`,
          }}
        />
      ))}

      <div className="absolute left-0 right-0 text-center" style={{ top: 1500 }}>
        <Reveal enter={[900, 1320]} y={22}>
          <DisplayText size={56}>SKU 01</DisplayText>
        </Reveal>
        <Reveal enter={[1040, 1460]} y={16} className="mt-3">
          <Kicker>prebiotics · botanicals · fiber</Kicker>
        </Reveal>
      </div>
      <style>{`
        @keyframes well-frame-in {
          from { opacity: 0; transform: translateY(40px) scale(0.92); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes well-push {
          from { transform: scale(1); }
          to { transform: scale(1.08); }
        }
      `}</style>
    </Solo>
  );
}
