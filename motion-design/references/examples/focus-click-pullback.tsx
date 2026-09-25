import { ACCENT, Card, Cursor, LINE, MUTED, Reveal, Solo, Window } from "../src/primitives";

export const duration = 5;
export const aspect = "landscape" as const;

const BTN_X = 798;
const BTN_Y = 458;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <div className="relative" style={{ width: 920, height: 520 }}>
          <div
            className="absolute inset-0"
            style={{
              transformOrigin: `${BTN_X}px ${BTN_Y}px`,
              animation: "focus-cam 5s cubic-bezier(0.45,0,0.55,1) both",
            }}
          >
            <Window title="workspace" width={920} height={520}>
              <div className="flex h-full flex-col justify-between p-10">
                <div>
                  <div
                    className="text-sm font-semibold uppercase"
                    style={{ letterSpacing: "0.16em", color: MUTED }}
                  >
                    brief
                  </div>
                  <div className="mt-4 text-4xl font-semibold tracking-tight">Send the run</div>
                </div>
                <div className="flex items-end justify-between">
                  <Reveal enter={[3200, 3720]} y={14}>
                    <Card className="px-6 py-4" style={{ border: `1px solid ${LINE}` }}>
                      <div className="text-lg" style={{ color: "#1a1a1a" }}>
                        Checks · queued
                      </div>
                    </Card>
                  </Reveal>
                  <div
                    className="relative overflow-hidden rounded-xl px-10 py-4 text-lg font-semibold text-white"
                    style={{
                      background: ACCENT,
                      animation: "press-pop 160ms 1880ms both",
                    }}
                  >
                    Deploy
                    <div
                      className="pointer-events-none absolute left-1/2 top-1/2 h-[84px] w-[84px] rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.38)",
                        animation: "ripple 400ms 1880ms linear both",
                      }}
                    />
                    <div
                      className="pointer-events-none absolute left-1/2 top-1/2 h-[92px] w-[92px] rounded-full"
                      style={{
                        border: "2px solid rgba(255,255,255,0.85)",
                        animation: "click-ring 480ms 1880ms linear both",
                      }}
                    />
                  </div>
                </div>
              </div>
            </Window>
          </div>
          <div
            className="pointer-events-none absolute z-10"
            style={{
              left: BTN_X,
              top: BTN_Y,
              transformOrigin: "4px 2px",
              animation: "cursor-squeeze 180ms 1880ms both",
            }}
          >
            <Cursor x={0} y={0} delay={720} duration={720} />
          </div>
        </div>
      </div>
      <style>{`
        @keyframes focus-cam {
          0% { transform: scale(1); }
          34% { transform: scale(2.05); }
          56% { transform: scale(2.05); }
          100% { transform: scale(1.02); }
        }
        @keyframes click-ring {
          from { transform: translate(-50%, -50%) scale(0.35); opacity: 0.75; }
          to { transform: translate(-50%, -50%) scale(1.85); opacity: 0; }
        }
      `}</style>
    </Solo>
  );
}
