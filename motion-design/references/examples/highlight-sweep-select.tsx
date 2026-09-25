import { Card, Kicker, Mono, Reveal, SELECT, Solo, Window } from "../src/primitives";

export const duration = 3.6;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} theme="saas">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 48% 44%, rgba(91,140,255,0.14), transparent 55%)",
        }}
      />
      <div className="flex h-full w-full items-center justify-center">
        <Reveal enter={[0, 420]} y={18}>
          <Window title="workspace" width={1040} height={520}>
            <div className="flex h-full flex-col justify-center px-16">
              <Kicker>brief</Kicker>
              <div className="mt-7 text-[52px] leading-tight tracking-tight">
                Review{" "}
                <span
                  className="px-1"
                  style={{
                    backgroundImage: `linear-gradient(${SELECT}88, ${SELECT}88)`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "0% 100%",
                    animation: "highlight-sweep 520ms 720ms cubic-bezier(0.33,1,0.68,1) both",
                  }}
                >
                  the brief
                </span>{" "}
                before you deploy.
              </div>
              <Reveal enter={[1400, 1780]} y={10} className="mt-12">
                <Card className="inline-block w-[280px] overflow-hidden py-2">
                  {["Copy", "Deploy"].map((item, i) => (
                    <div
                      key={item}
                      className="px-6 py-3 text-2xl"
                      style={{ color: i === 1 ? SELECT : "rgba(244,241,234,0.7)" }}
                    >
                      <Mono>{item}</Mono>
                    </div>
                  ))}
                </Card>
              </Reveal>
            </div>
          </Window>
        </Reveal>
      </div>
      <style>{`
        @keyframes highlight-sweep {
          from { background-size: 0% 100%; }
          to { background-size: 100% 100%; }
        }
      `}</style>
    </Solo>
  );
}
