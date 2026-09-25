import type { CSSProperties } from "react";
import { Card, LINE, MUTED, Reveal, Solo, Window } from "../src/primitives";

export const duration = 4.6;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <div
          style={
            {
              transformOrigin: "38% 48%",
              animation: "camera-zoom 1500ms 160ms cubic-bezier(0.45,0,0.55,1) both",
              "--cam-s0": 3.2,
              "--cam-s1": 1.15,
            } as CSSProperties
          }
        >
          <Window title="workspace" width={960} height={560}>
            <div className="relative h-full">
              <div className="flex h-full items-center justify-center p-8">
                <Card
                  className="w-full max-w-[420px] px-8 py-10"
                  style={{ border: `1px solid ${LINE}` }}
                >
                  <div
                    className="text-sm font-semibold uppercase"
                    style={{ letterSpacing: "0.16em", color: MUTED }}
                  >
                    brief
                  </div>
                  <div className="mt-5 text-3xl font-semibold tracking-tight">Write the brief</div>
                  <div
                    className="mt-6 h-28 rounded-xl"
                    style={{ background: "#efeae0", border: `1px solid ${LINE}` }}
                  />
                </Card>
              </div>
              <div
                className="absolute inset-y-0 right-0 w-[280px] px-6 py-8"
                style={{
                  background: "#1e1d1b",
                  borderLeft: "1px solid #2c2a26",
                  animation: "panel-in 640ms 1280ms cubic-bezier(0.33,1,0.68,1) both",
                }}
              >
                <Reveal enter={[1400, 1800]} y={12}>
                  <div
                    className="text-sm uppercase"
                    style={{ letterSpacing: "0.14em", color: MUTED }}
                  >
                    checks
                  </div>
                  {["Lint", "Types", "Deploy"].map((item) => (
                    <div key={item} className="mt-5 text-xl">
                      {item}
                    </div>
                  ))}
                </Reveal>
              </div>
            </div>
          </Window>
        </div>
      </div>
    </Solo>
  );
}
