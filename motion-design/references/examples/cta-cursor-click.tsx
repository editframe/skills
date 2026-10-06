import type { CSSProperties } from "react";
import { Cursor, Kicker, Mono, Reveal, SELECT, Solo, Window } from "../src/primitives";

export const duration = 4;
export const aspect = "landscape" as const;

const BTN_X = 776;
const BTN_Y = 372;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} theme="saas">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 68% 62%, rgba(91,140,255,0.16), transparent 52%)",
        }}
      />
      <div className="flex h-full w-full items-center justify-center">
        <div className="relative" style={{ width: 920, height: 520 }}>
          <div
            className="absolute inset-0"
            style={
              {
                transformOrigin: `${BTN_X}px ${BTN_Y}px`,
                animation: "camera-zoom 800ms 480ms cubic-bezier(0.65,0,0.35,1) both",
                "--cam-s0": 1,
                "--cam-s1": 2.05,
              } as CSSProperties
            }
          >
            <Reveal enter={[0, 420]} y={24}>
              <Window title="workspace" width={920} height={520}>
                <div className="flex h-full flex-col justify-between px-12 py-10">
                  <div>
                    <Kicker>workspace</Kicker>
                    <div className="mt-5 text-[56px] font-semibold tracking-tight">
                      Ready to deploy
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Mono className="text-lg text-[rgba(244,241,234,0.4)]">SKU 01</Mono>
                    <div
                      className="relative overflow-hidden rounded-xl px-12 py-5 text-2xl font-semibold"
                      style={{
                        background: "#f4f1ea",
                        color: "#0b0b0d",
                        boxShadow:
                          "0 12px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.55)",
                        animation: "press-pop 160ms 1680ms both, cta-flash 160ms 1680ms both",
                      }}
                    >
                      Deploy
                      <div
                        className="pointer-events-none absolute left-1/2 top-1/2 h-[88px] w-[88px] rounded-full"
                        style={{
                          background: "rgba(255,255,255,0.5)",
                          animation: "ripple 420ms 1680ms linear both",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Window>
            </Reveal>
          </div>
          <div
            className="pointer-events-none absolute z-10"
            style={{
              left: BTN_X,
              top: BTN_Y,
              transformOrigin: "4px 2px",
              animation: "cursor-squeeze 180ms 1680ms both",
            }}
          >
            <Cursor x={0} y={0} delay={900} duration={700} />
          </div>
        </div>
      </div>
      <style>{`
        @keyframes cta-flash {
          0% { background: #f4f1ea; color: #0b0b0d; }
          40% { background: ${SELECT}; color: #fff; }
          100% { background: #f4f1ea; color: #0b0b0d; }
        }
      `}</style>
    </Solo>
  );
}
