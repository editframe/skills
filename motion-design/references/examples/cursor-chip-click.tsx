import { Chip, Cursor, Kicker, SELECT, Solo, Window } from "../src/primitives";

const CHIPS = ["Brief", "Deploy", "Checks"];

export const duration = 4;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} theme="saas">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 42% 48%, rgba(91,140,255,0.14), transparent 55%)",
        }}
      />
      <div className="flex h-full w-full items-center justify-center">
        <Window title="workspace" width={880} height={380}>
          <div className="relative flex h-full flex-col justify-center px-14">
            <Kicker>model</Kicker>
            <div className="relative mt-8" style={{ width: 640, height: 64 }}>
              <div style={{ animation: "hide 280ms 2680ms both" }}>
                <div className="flex items-center gap-4">
                  {CHIPS.map((label, i) => (
                    <div
                      key={label}
                      className="relative"
                      style={i === 0 ? { animation: "press-pop 160ms 1480ms both" } : undefined}
                    >
                      <Chip delay={i * 90} active={i === 0}>
                        {label}
                      </Chip>
                      {i === 0 ? (
                        <div
                          className="pointer-events-none absolute inset-0 rounded-full"
                          style={{ animation: "chip-flash 220ms 1480ms both" }}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
              <div
                className="pointer-events-none absolute z-10"
                style={{
                  left: 40,
                  top: 8,
                  transformOrigin: "4px 2px",
                  animation: "cursor-squeeze 180ms 1480ms both",
                }}
              >
                <Cursor x={0} y={0} delay={520} duration={640} />
              </div>
              <div
                className="pointer-events-none absolute left-[48px] top-[18px] h-[72px] w-[72px] rounded-full"
                style={{
                  background: "rgba(91,140,255,0.32)",
                  animation: "ripple 400ms 1480ms linear both",
                }}
              />
            </div>
            <div className="mt-10 text-[44px] font-semibold tracking-tight">Pick a run</div>
          </div>
        </Window>
      </div>
      <style>{`
        @keyframes chip-flash {
          0% { background: transparent; }
          35% { background: ${SELECT}66; }
          100% { background: transparent; }
        }
      `}</style>
    </Solo>
  );
}
