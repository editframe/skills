import { CREAM, NAVY, Reveal, Solo, Window, Mono } from "../src/primitives";

export const duration = 5;
export const aspect = "landscape" as const;

const LINES = ["Ship four SKUs", "Friday drop", "Checks green"];
const MS_PER_CHAR = 48;
const TYPE_START = 420;

function charDelay(lineIndex: number, charIndex: number) {
  let offset = TYPE_START;
  for (let i = 0; i < lineIndex; i++) offset += LINES[i].length * MS_PER_CHAR + 90;
  return offset + charIndex * MS_PER_CHAR;
}

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: typeof aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <div className="flex h-full w-full items-center justify-center">
        <Reveal enter={[0, 420]} y={24} scaleFrom={0.96}>
          <Window title="brief" width={920} height={560}>
            <div
              className="flex h-full items-center justify-center"
              style={{ background: "#1a1917" }}
            >
              <div
                className="relative"
                style={{
                  width: 620,
                  background: "rgba(30,58,138,0.28)",
                  border: `2px solid ${NAVY}`,
                  animation: "brief-box 5000ms linear both",
                }}
              >
                {(["tl", "tr", "bl", "br"] as const).map((corner) => (
                  <div
                    key={corner}
                    className="absolute h-3 w-3 bg-white"
                    style={{
                      border: `2px solid ${NAVY}`,
                      left: corner.includes("l") ? -7 : undefined,
                      right: corner.includes("r") ? -7 : undefined,
                      top: corner.includes("t") ? -7 : undefined,
                      bottom: corner.includes("b") ? -7 : undefined,
                    }}
                  />
                ))}
                <div
                  className="absolute inset-0 overflow-hidden px-8 py-5"
                  style={{ color: CREAM }}
                >
                  {LINES.map((line, li) => (
                    <div key={line} className="flex h-[68px] items-center">
                      <Mono className="text-[42px] leading-none">
                        {line.split("").map((ch, ci) => (
                          <span
                            key={`${li}-${ci}`}
                            style={{
                              display: "inline-block",
                              whiteSpace: "pre",
                              animation: `fade-in 40ms ${charDelay(li, ci)}ms both`,
                            }}
                          >
                            {ch}
                          </span>
                        ))}
                      </Mono>
                    </div>
                  ))}
                </div>
                <div
                  className="absolute"
                  style={{
                    left: 36,
                    bottom: 22,
                    width: 2,
                    height: 44,
                    background: CREAM,
                    animation: `caret-blink 900ms ${charDelay(2, LINES[2].length)}ms step-end infinite`,
                  }}
                />
              </div>
            </div>
          </Window>
        </Reveal>
      </div>
      <style>{`
        @keyframes brief-box {
          0%, 22% { height: 92px; }
          26%, 36% { height: 160px; }
          40%, 100% { height: 228px; }
        }
      `}</style>
    </Solo>
  );
}
