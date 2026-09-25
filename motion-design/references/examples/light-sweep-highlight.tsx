import { Card, Check, Reveal, Solo } from "../src/primitives";

export const duration = 3.5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} theme="saas">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 48%, rgba(61,220,132,0.12), transparent 56%)",
        }}
      />
      <div className="flex h-full w-full items-center justify-center">
        <Reveal enter={[0, 480]} y={20} scaleFrom={0.97}>
          <Card className="relative overflow-hidden px-16 py-14" style={{ width: 920 }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="mt-5 text-[64px] font-semibold tracking-tight">Checks passed</div>
              </div>
              <Reveal enter={[900, 1180]} y={0} scaleFrom={0.7} easeIn="out-back">
                <Check delay={0} size={72} />
              </Reveal>
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 w-1/3"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)",
                animation:
                  "sheen 900ms 720ms ease-in-out both, sweep-opacity 900ms 720ms ease-in-out both",
              }}
            />
          </Card>
        </Reveal>
      </div>
      <style>{`
        @keyframes sweep-opacity {
          0% { opacity: 0; }
          18% { opacity: 1; }
          82% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </Solo>
  );
}
