import {
  ACCENT,
  Chip,
  CREAM,
  Kicker,
  Price,
  ProductCan,
  Reveal,
  Solo,
  DisplayText,
} from "../src/primitives";

export const duration = 5;
export const aspect = "portrait" as const;

const BANDS = [
  { no: "01", name: "CLASSIC", color: ACCENT, specs: ["12 OZ CAN", "ALUMINUM", "NAVY BAND"] },
  { no: "02", name: "RESERVE", color: "#1e3a5f", specs: ["12 OZ CAN", "MATTE COAT", "CREAM BAND"] },
  { no: "03", name: "STUDIO", color: "#2f6b55", specs: ["8 OZ CAN", "SOFT TOUCH", "INK BAND"] },
  { no: "04", name: "LIMITED", color: "#8a6a2f", specs: ["16 OZ CAN", "FOIL SEAL", "LINE BAND"] },
];

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} theme="social" background="#1a1210">
      <div className="absolute inset-0 flex flex-col">
        <Reveal
          enter={[200, 640]}
          y={20}
          className="flex flex-col justify-center px-14"
          style={{ flex: "0 0 220px", borderBottom: `2px solid ${CREAM}` }}
        >
          <div className="flex items-baseline justify-between">
            <DisplayText size={72}>THE EDIT</DisplayText>
            <Kicker>vol.01</Kicker>
          </div>
          <div className="mt-5 flex items-center gap-4">
            <Chip active>final hours</Chip>
            <Kicker>four SKUs</Kicker>
          </div>
        </Reveal>

        {BANDS.map((band, i) => {
          const t0 = 560 + i * 360;
          return (
            <div
              key={band.no}
              className="flex items-center gap-8 px-12"
              style={{
                flex: "1 1 0",
                minHeight: 0,
                borderBottom: i < 3 ? "1px solid rgba(255,246,232,0.12)" : "none",
                background: i % 2 === 0 ? "rgba(255,246,232,0.04)" : "transparent",
                animation: [
                  `fade-in 300ms ${t0}ms cubic-bezier(0.33,1,0.68,1) both`,
                  `spec-band-rise 520ms ${t0}ms cubic-bezier(0.34,1.56,0.64,1) both`,
                ].join(", "),
              }}
            >
              <div
                className="relative flex-shrink-0 overflow-hidden"
                style={{
                  width: 168,
                  height: 220,
                  background: "#2a1c1a",
                  border: `2px solid ${CREAM}`,
                }}
              >
                <div
                  className="absolute left-0 top-0 px-2 py-1 text-sm font-semibold"
                  style={{ background: ACCENT }}
                >
                  {band.no}
                </div>
                <div className="flex h-full items-end justify-center pb-3">
                  <ProductCan color={band.color} label={band.no} size="pack" height={200} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <Kicker>SKU {band.no}</Kicker>
                <div className="mt-1">
                  <DisplayText size={48}>{band.name}</DisplayText>
                </div>
                <div className="mt-4 h-[2px] w-24" style={{ background: CREAM, opacity: 0.4 }} />
                {band.specs.map((spec) => (
                  <div key={spec} className="mt-2">
                    <Kicker>{spec}</Kicker>
                  </div>
                ))}
              </div>
              <div className="flex-shrink-0 text-right">
                <div
                  className="text-2xl font-semibold"
                  style={{ opacity: 0.4, textDecoration: "line-through" }}
                >
                  $18
                </div>
                <Price value="$12" delay={t0 + 180} />
              </div>
            </div>
          );
        })}

        <Reveal
          enter={[2100, 2560]}
          y={12}
          className="flex items-center justify-between px-14"
          style={{ flex: "0 0 90px", borderTop: `2px solid ${CREAM}` }}
        >
          <DisplayText size={28}>THE RANGE</DisplayText>
          <Kicker>$12 each</Kicker>
        </Reveal>
      </div>
      <style>{`
        @keyframes spec-band-rise {
          from { transform: translateY(64px); }
          to { transform: translateY(0); }
        }
      `}</style>
    </Solo>
  );
}
