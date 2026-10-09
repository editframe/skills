import type { CSSProperties } from "react";
import { Chip, Mono, MUTED, Solo, Window } from "../src/primitives";

const CMD = "ef run --brief";
const STEPS = CMD.length;

export const duration = 5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <div
          style={
            {
              transformOrigin: "50% 58%",
              animation: "camera-zoom 5s cubic-bezier(0.45,0,0.55,1) both",
              "--cam-s0": 1,
              "--cam-s1": 1.55,
            } as CSSProperties
          }
        >
          <Window title="workspace" width={880} height={420}>
            <div className="flex h-full flex-col justify-center px-12">
              <div
                className="text-sm font-semibold uppercase"
                style={{ letterSpacing: "0.16em", color: MUTED }}
              >
                prompt
              </div>
              <div className="relative mt-8 flex items-center" style={{ minHeight: 56 }}>
                <div style={{ animation: "hide 180ms 3000ms both" }}>
                  <Mono className="text-3xl">
                    <span style={{ color: MUTED }}>$ </span>
                    <span
                      className="inline-block overflow-hidden whitespace-nowrap align-bottom"
                      style={{
                        animation: `typewriter-reveal 1600ms 640ms steps(${STEPS}) both`,
                      }}
                    >
                      {CMD}
                    </span>
                  </Mono>
                  <span
                    className="ml-1 inline-block h-8 w-[2px] align-bottom"
                    style={{
                      background: "#f3efe6",
                      animation: "caret-blink 900ms 640ms step-end 3 both",
                    }}
                  />
                </div>
                <div className="absolute left-0 top-0">
                  <Chip active delay={3000}>
                    Deploy
                  </Chip>
                </div>
              </div>
            </div>
          </Window>
        </div>
      </div>
    </Solo>
  );
}
