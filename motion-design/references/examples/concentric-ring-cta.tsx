import { ACCENT, Chip, LINE, Reveal, Solo, EditframeWordmark } from "../src/primitives";

const RINGS = [160, 250, 340, 430, 520];

export const duration = 4;
export const aspect = "portrait" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div
          className="relative flex items-center justify-center"
          style={{ width: 1040, height: 1040 }}
        >
          {RINGS.map((r, i) => (
            <div
              key={r}
              className="absolute inset-0 flex items-center justify-center"
              style={{ animation: `slam 640ms ${180 + i * 90}ms cubic-bezier(0.33,1,0.68,1) both` }}
            >
              <div
                className="rounded-full"
                style={{
                  width: r * 2,
                  height: r * 2,
                  border: `5px solid ${i % 2 === 0 ? ACCENT : LINE}`,
                  opacity: 0.55,
                  animation: `ring-pulse 2400ms ${-i * 380}ms ease-in-out infinite`,
                }}
              />
            </div>
          ))}
          <Reveal enter={[420, 980]} y={20} scaleFrom={0.86} easeIn="out-back">
            <div style={{ animation: "bob 3s ease-in-out infinite", animationDelay: "-0.8s" }}>
              <div className="flex flex-col items-center">
                <div className="mt-6">
                  <EditframeWordmark size={72} />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
        <Reveal enter={[1180, 1680]} y={22} className="mt-4">
          <Chip delay={0} active>
            editframe.com
          </Chip>
        </Reveal>
      </div>
    </Solo>
  );
}
