import type { CSSProperties } from "react";
import { Card, Kicker, SELECT, Solo, Window } from "../src/primitives";

export const duration = 4.5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration} theme="saas">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 38% 28%, rgba(91,140,255,0.14), transparent 50%)",
        }}
      />
      <div className="flex h-full w-full items-center justify-center">
        <div className="relative" style={{ width: 1040, height: 620 }}>
          <div
            className="absolute inset-0"
            style={
              {
                transformOrigin: "360px 108px",
                animation: "camera-zoom 1100ms 360ms cubic-bezier(0.65,0,0.35,1) both",
                "--cam-s0": 1,
                "--cam-s1": 2.2,
              } as CSSProperties
            }
          >
            <Window title="workspace" width={1040} height={620}>
              <div className="flex h-full">
                <div
                  className="flex w-[240px] flex-col gap-5 px-7 py-8"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    borderRight: "1px solid rgba(255,255,255,0.08)",
                    animation: "fade-out 420ms 900ms forwards",
                  }}
                >
                  {["Brief", "Deploy", "Checks"].map((label) => (
                    <div
                      key={label}
                      className="text-2xl"
                      style={{ color: "rgba(244,241,234,0.55)" }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
                <div className="relative flex-1 px-12 py-10">
                  <Kicker>model</Kicker>
                  <div
                    className="mt-5 inline-flex items-center gap-4 rounded-xl px-6 py-4 text-2xl"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                    }}
                  >
                    SKU 01
                    <span style={{ color: "rgba(244,241,234,0.4)" }}>▾</span>
                  </div>
                  <Card
                    className="absolute left-12 top-[148px] w-[320px] overflow-hidden py-2"
                    style={{ animation: "slam 280ms 1280ms cubic-bezier(0.33,1,0.68,1) both" }}
                  >
                    {["SKU 01", "SKU 02", "SKU 03"].map((item, i) => (
                      <div
                        key={item}
                        className="px-6 py-4 text-2xl"
                        style={{
                          background: i === 0 ? SELECT : "transparent",
                          color: i === 0 ? "#fff" : "rgba(244,241,234,0.72)",
                        }}
                      >
                        {item}
                      </div>
                    ))}
                  </Card>
                </div>
              </div>
            </Window>
          </div>
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "#f4f1ea", animation: "control-flash 360ms 1700ms both" }}
          />
        </div>
      </div>
      <style>{`
        @keyframes control-flash {
          0% { opacity: 0; }
          35% { opacity: 0.28; }
          100% { opacity: 0; }
        }
      `}</style>
    </Solo>
  );
}
