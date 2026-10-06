import type { CSSProperties } from "react";
import { ACCENT, Mono, Reveal, Solo, Window } from "../src/primitives";

const COMMAND = "npm install";
const MS_PER_CHAR = 70;
const TYPE_START = 200;
const TYPE_MS = COMMAND.length * MS_PER_CHAR;
const LH = 48;
const OUTPUT = [
  { text: "Resolved 9 packages in 0.3s", color: "#8a847c", spawn: 1400 },
  { text: "Prepared 7 packages in 1.8s", color: "#8a847c", spawn: 2100 },
  { text: "Installed 8 packages in 0.1s", color: "#c8c2b8", spawn: 2800 },
  { text: "Dependencies ready", color: ACCENT, spawn: 3500 },
] as const;

export const duration = 5;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <Reveal enter={[0, 320]} y={16}>
          <Window title="workspace · sample session" width={1080} height={560}>
            <div className="relative h-full overflow-hidden px-10">
              <div
                className="absolute left-10 right-10"
                style={{ bottom: 88, "--lh": `${LH}px` } as CSSProperties}
              >
                <div
                  className="absolute left-0 top-0 flex items-baseline"
                  style={{
                    fontSize: 32,
                    lineHeight: `${LH}px`,
                    animation: "stack-cmd 5s linear both",
                  }}
                >
                  <Mono>
                    <span style={{ color: "#8a847c", marginRight: 14 }}>$</span>
                    <span className="inline-block" style={{ width: `${COMMAND.length}ch` }}>
                      <span
                        className="inline-block overflow-hidden whitespace-nowrap"
                        style={{
                          animation: `typewriter-reveal ${TYPE_MS}ms steps(${COMMAND.length}, end) ${TYPE_START}ms both`,
                        }}
                      >
                        {COMMAND}
                      </span>
                    </span>
                    <span
                      className="ml-1 inline-block"
                      style={{
                        width: 16,
                        height: 34,
                        background: "#f3efe6",
                        animation: [
                          `caret-blink 1s step-end infinite ${TYPE_START + TYPE_MS + 160}ms backwards`,
                          `hide 1ms ${OUTPUT[OUTPUT.length - 1].spawn}ms forwards`,
                        ].join(", "),
                      }}
                    />
                  </Mono>
                </div>
                {OUTPUT.map((line, i) => (
                  <div
                    key={line.text}
                    className="absolute left-0 top-0"
                    style={{
                      fontSize: 32,
                      lineHeight: `${LH}px`,
                      color: line.color,
                      animation: [
                        `fade-in 220ms ${line.spawn}ms both`,
                        i < OUTPUT.length - 1 ? `stack-l${i} 5s linear both` : "",
                      ]
                        .filter(Boolean)
                        .join(", "),
                    }}
                  >
                    <Mono>{line.text}</Mono>
                  </div>
                ))}
              </div>
            </div>
          </Window>
        </Reveal>
      </div>
      <style>{`
        @keyframes stack-cmd {
          0%, 27.9% { transform: translateY(0); }
          28%, 41.9% { transform: translateY(calc(-1 * var(--lh))); }
          42%, 55.9% { transform: translateY(calc(-2 * var(--lh))); }
          56%, 69.9% { transform: translateY(calc(-3 * var(--lh))); }
          70%, 100% { transform: translateY(calc(-4 * var(--lh))); }
        }
        @keyframes stack-l0 {
          0%, 27.9% { transform: translateY(0); }
          28%, 41.9% { transform: translateY(0); }
          42%, 55.9% { transform: translateY(calc(-1 * var(--lh))); }
          56%, 69.9% { transform: translateY(calc(-2 * var(--lh))); }
          70%, 100% { transform: translateY(calc(-3 * var(--lh))); }
        }
        @keyframes stack-l1 {
          0%, 41.9% { transform: translateY(0); }
          42%, 55.9% { transform: translateY(0); }
          56%, 69.9% { transform: translateY(calc(-1 * var(--lh))); }
          70%, 100% { transform: translateY(calc(-2 * var(--lh))); }
        }
        @keyframes stack-l2 {
          0%, 55.9% { transform: translateY(0); }
          56%, 69.9% { transform: translateY(0); }
          70%, 100% { transform: translateY(calc(-1 * var(--lh))); }
        }
      `}</style>
    </Solo>
  );
}
