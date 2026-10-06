import type { CSSProperties } from "react";
import { ACCENT, Check, Mono, Reveal, Solo, Window } from "../src/primitives";

const LINES = [
  { ms: 180, kind: "cmd", text: "npm run check" },
  { ms: 720, kind: "out", symbol: "┌", text: " Workspace checks" },
  { ms: 920, kind: "out", symbol: "◇", text: " Checking configuration" },
  { ms: 1120, kind: "out", symbol: "│", text: " Configuration valid" },
  { ms: 1320, kind: "out", symbol: "└", text: " Done" },
  { ms: 1620, kind: "cmd", text: "npm run setup" },
  { ms: 2280, kind: "out", symbol: "┌", text: " npm run setup" },
  { ms: 2400, kind: "out", symbol: "◇", text: " Detecting workspace" },
  { ms: 2520, kind: "out", symbol: "│", text: " CREATE  src/brief.ts" },
  { ms: 2640, kind: "out", symbol: "│", text: " MODIFY  sku.json" },
  { ms: 2760, kind: "out", symbol: "✔", text: " Workspace is ready", glow: true },
  { ms: 2880, kind: "out", symbol: "◇", text: " Pulling env from studio" },
  { ms: 3000, kind: "out", symbol: "└", text: " Done" },
] as const;

export const duration = 6;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 80%, ${ACCENT}22, transparent 55%)`,
          animation: "bloom 700ms cubic-bezier(0.33,1,0.68,1) both",
        }}
      />
      <div
        className="absolute left-0 top-0"
        style={
          {
            transformOrigin: "0 0",
            "--cam-a-x": "500px",
            "--cam-a-y": "280px",
            "--cam-a-s": 0.82,
            "--cam-b-x": "-40px",
            "--cam-b-y": "-210px",
            "--cam-b-s": 1.85,
            "--cam-d-x": "460px",
            "--cam-d-y": "120px",
            "--cam-d-s": 0.72,
            "--cam-e-x": "80px",
            "--cam-e-y": "-520px",
            "--cam-e-s": 1.7,
            animation: "cam-doc 6s both",
          } as CSSProperties
        }
      >
        <div
          style={
            {
              width: 1080,
              overflow: "hidden",
              borderRadius: 12,
              boxShadow: "0 28px 80px rgba(0,0,0,0.28)",
              "--win-h-min": "420px",
              "--win-h-max": "680px",
              animation: "fade-in 260ms 40ms both, win-grow 6s both",
            } as CSSProperties
          }
        >
          <Window title="~/project · sample session" width={1080} height={680}>
            <div className="px-8 py-5" style={{ fontSize: 22, lineHeight: "36px" }}>
              {LINES.map((line, i) => {
                if (line.kind === "cmd") {
                  const typeMs = 420;
                  return (
                    <Reveal
                      key={i}
                      enter={[line.ms - 80, line.ms + 80]}
                      y={0}
                      className="flex items-center"
                    >
                      <Mono>
                        <span style={{ color: "#8a847c" }}>studio project % </span>
                        <span className="inline-block" style={{ width: `${line.text.length}ch` }}>
                          <span
                            className="inline-block overflow-hidden whitespace-nowrap font-semibold"
                            style={{
                              animation: `typewriter-reveal ${typeMs}ms steps(${line.text.length}, end) ${line.ms}ms both`,
                            }}
                          >
                            {line.text}
                          </span>
                        </span>
                      </Mono>
                    </Reveal>
                  );
                }
                const glow = "glow" in line && line.glow;
                return (
                  <Reveal
                    key={i}
                    enter={[line.ms, line.ms + 180]}
                    y={6}
                    className="flex items-baseline gap-2"
                  >
                    <Mono>
                      <span className="inline-block w-5 text-center" style={{ color: "#6f6860" }}>
                        {line.symbol}
                      </span>
                      <span
                        style={{
                          color: glow ? "#f3efe6" : "#c8c2b8",
                          animation: glow
                            ? `line-glow 480ms ${line.ms + 180}ms forwards`
                            : undefined,
                        }}
                      >
                        {line.text}
                      </span>
                    </Mono>
                    {glow ? (
                      <span
                        className="ml-2 inline-flex"
                        style={{ animation: `fade-in 200ms ${line.ms + 200}ms both` }}
                      >
                        <Check delay={line.ms + 200} size={22} />
                      </span>
                    ) : null}
                  </Reveal>
                );
              })}
            </div>
          </Window>
        </div>
      </div>
      <style>{`
        @keyframes win-grow {
          0%, 30.4% { height: var(--win-h-min); }
          45.2%, 100% { height: var(--win-h-max); }
        }
        @keyframes cam-doc {
          0%, 26.9% { transform: translate(var(--cam-a-x), var(--cam-a-y)) scale(var(--cam-a-s)); }
          33%, 43.4% { transform: translate(var(--cam-b-x), var(--cam-b-y)) scale(var(--cam-b-s)); }
          53.9%, 67.8% { transform: translate(var(--cam-d-x), var(--cam-d-y)) scale(var(--cam-d-s)); }
          79.1%, 100% { transform: translate(var(--cam-e-x), var(--cam-e-y)) scale(var(--cam-e-s)); }
        }
        @keyframes line-glow {
          from { text-shadow: none; }
          to { text-shadow: 0 0 14px ${ACCENT}aa; }
        }
      `}</style>
    </Solo>
  );
}
