import {
  Bubbles,
  GroundShadow,
  ProductCan,
  Reveal,
  Rings,
  Solo,
  Sunburst,
} from "../src/primitives";

export const duration = 4;
export const aspect = "portrait" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} theme="social">
      <div style={{ animation: "spin-ccw 40s linear infinite" }}>
        <div style={{ animation: "burst-breathe 5.6s ease-in-out infinite" }}>
          <Sunburst />
        </div>
      </div>
      <div style={{ animation: "rings-pulse 4.4s ease-in-out infinite" }}>
        <Rings />
      </div>
      <Bubbles />
      <GroundShadow />
      <div className="flex h-full w-full items-center justify-center">
        <Reveal enter={[80, 640]} y={36} scaleFrom={0.88}>
          <div style={{ animation: "can-bob 4.7s ease-in-out -1s infinite" }}>
            <ProductCan label="01" name="SPARK" color="#1a1210" size="hero" />
          </div>
        </Reveal>
      </div>
    </Solo>
  );
}
