import type { CSSProperties } from "react";
import { Card, MUTED, PANEL, Reveal, Solo, Window } from "../src/primitives";

export const duration = 4.5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <div
          style={
            {
              animation: "camera-zoom 1400ms 200ms cubic-bezier(0.45,0,0.55,1) both",
              "--cam-s0": 1.35,
              "--cam-s1": 1,
            } as CSSProperties
          }
        >
          <div
            className="overflow-hidden"
            style={{
              animation: "strip-grow 1100ms 180ms cubic-bezier(0.45,0,0.55,1) both",
            }}
          >
            <Window title="workspace" width={920} height={520}>
              <div
                className="flex h-12 items-center gap-8 px-7 text-lg"
                style={{ borderBottom: "1px solid #2c2a26" }}
              >
                {["Brief", "Deploy", "Checks"].map((label, i) => (
                  <span key={label} style={{ color: i === 0 ? "#fff" : MUTED }}>
                    {label}
                  </span>
                ))}
              </div>
              <Reveal enter={[780, 1280]} y={16}>
                <div className="grid grid-cols-3 gap-5 px-7 pb-8 pt-6">
                  {["Brief", "Deploy", "Checks"].map((label) => (
                    <Card
                      key={label}
                      className="px-5 py-8"
                      style={{ background: "#1e1d1b", border: "1px solid #2c2a26" }}
                    >
                      <div
                        className="text-sm uppercase"
                        style={{ letterSpacing: "0.14em", color: MUTED }}
                      >
                        PROJECT
                      </div>
                      <div className="mt-3 text-2xl font-semibold" style={{ color: "#f3efe6" }}>
                        {label}
                      </div>
                      <div
                        className="mt-2 h-2 rounded-full"
                        style={{ background: PANEL, width: "48%" }}
                      />
                    </Card>
                  ))}
                </div>
              </Reveal>
            </Window>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes strip-grow {
          from {
            width: 920px;
            height: 48px;
            border-radius: 10px;
          }
          to {
            width: 920px;
            height: 520px;
            border-radius: 14px;
          }
        }
      `}</style>
    </Solo>
  );
}
