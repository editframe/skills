import {
  ACCENT,
  CREAM,
  Kicker,
  Price,
  ProductCan,
  Reveal,
  Solo,
  Sunburst,
  DisplayText,
} from "../src/primitives";

export const duration = 5;
export const aspect = "portrait" as const;

const TAGS = [
  { label: "01", color: ACCENT, x: 48, str: 110, delay: 360 },
  { label: "02", color: "#1e3a5f", x: 378, str: 240, delay: 660 },
  { label: "03", color: "#2f6b55", x: 708, str: 150, delay: 960 },
];

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} theme="social" background="#1a1210">
      <div className="absolute inset-0" style={{ opacity: 0.28 }}>
        <div style={{ animation: "spin 50s linear infinite" }}>
          <Sunburst />
        </div>
      </div>

      <Reveal enter={[80, 480]} y={-18} className="absolute left-0 right-0 top-[88px] text-center">
        <div className="mt-3">
          <DisplayText size={56}>new arrivals</DisplayText>
        </div>
      </Reveal>

      <div
        className="absolute"
        style={{
          top: 410,
          left: 64,
          right: 64,
          height: 6,
          background: CREAM,
          borderRadius: 4,
          transformOrigin: "0% 50%",
          animation: "rule-draw-in 400ms 180ms cubic-bezier(0.33,1,0.68,1) both",
        }}
      />
      <div
        className="absolute h-4 w-4 rounded-full"
        style={{ top: 404, left: 54, background: CREAM }}
      />
      <div
        className="absolute h-4 w-4 rounded-full"
        style={{ top: 404, right: 54, background: CREAM }}
      />

      {TAGS.map((tag, i) => (
        <div
          key={tag.label}
          className="absolute"
          style={{
            top: 410,
            left: tag.x,
            animation: `ticket-drop 560ms ${tag.delay}ms cubic-bezier(0.34,1.56,0.64,1) both`,
          }}
        >
          <div
            style={{
              transformOrigin: "50% 0",
              animation: `ticket-sway ${2200 + i * 180}ms ease-in-out ${-i * 400}ms infinite`,
            }}
          >
            <div className="mx-auto" style={{ width: 3, height: tag.str, background: CREAM }} />
            <div
              className="relative mx-auto w-[300px] overflow-hidden rounded-[28px] p-4"
              style={{
                background: CREAM,
                color: "#1a1210",
                boxShadow: "0 24px 50px rgba(0,0,0,0.45)",
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <DisplayText size={36}>{tag.label}</DisplayText>
                <Kicker>SKU</Kicker>
              </div>
              <div className="flex justify-center py-2">
                <ProductCan color={tag.color} label={tag.label} size="pack" />
              </div>
              <div className="mt-2">
                <Price value="$12" delay={tag.delay + 400} />
              </div>
            </div>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes ticket-drop {
          from { opacity: 0; transform: translateY(-720px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ticket-sway {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(4deg); }
        }
      `}</style>
    </Solo>
  );
}
