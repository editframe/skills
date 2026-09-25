import {
  Bubbles,
  CREAM,
  FONT,
  GroundShadow,
  Kicker,
  ProductCan,
  Reveal,
  Rings,
  Solo,
  Sunburst,
} from "../src/primitives";

export const duration = 5;
export const aspect = "portrait" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} theme="social">
      <Push />
    </Solo>
  );
}

function Push() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div style={{ animation: "spin-ccw 40s linear infinite" }}>
          <div style={{ animation: "burst-breathe 5.6s ease-in-out infinite" }}>
            <Sunburst />
          </div>
        </div>
        <div
          style={{
            animation:
              "hero-rings-in 500ms 400ms both, rings-pulse 4.4s ease-in-out 900ms infinite",
          }}
        >
          <Rings />
        </div>
        <Bubbles />
        <GroundShadow />
      </div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
        <Reveal enter={[80, 800]} y={36} scaleFrom={0.86}>
          <div style={{ animation: "can-bob 4.7s ease-in-out 1.1s infinite backwards" }}>
            <ProductCan label="01" name="SPARK" color="#1a1210" size="hero" />
          </div>
        </Reveal>
        <Reveal enter={[560, 980]} y={18} className="mt-[3%] text-center">
          <div
            style={{
              fontFamily: FONT.serif,
              fontWeight: 800,
              fontStyle: "italic",
              fontSize: "12cqh",
              lineHeight: 0.88,
              color: CREAM,
              textShadow: "0 6px 0 rgba(199,58,40,0.45)",
            }}
          >
            spark
          </div>
        </Reveal>
      </div>
    </>
  );
}
