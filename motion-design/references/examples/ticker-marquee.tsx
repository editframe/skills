import { Solo, type Aspect } from "../src/primitives";
import { TypeField, displayType } from "./shared/type-studies";

// Intent: a continuous conveyor. Constant speed and equal duplicate widths make a seamless loop.
// Anticipation and overshoot would interrupt this pattern's cadence.
export const duration = 8;
export const aspect = "landscape" as const;

export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <TypeField background="#e7efad" color="#1f3026">
        <div
          style={{
            position: "absolute",
            top: "50%",
            width: "100%",
            transform: "translateY(-50%) rotate(-5deg) scale(1.08)",
          }}
        >
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              style={{
                overflow: "hidden",
                borderTop: "2px solid currentColor",
                padding: "1.5cqh 0",
                background: row === 1 ? "#1f3026" : undefined,
                color: row === 1 ? "#e7efad" : undefined,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "max-content",
                  animation: `ty-marquee-flow 8s linear infinite ${row === 1 ? "reverse" : "normal"}`,
                }}
              >
                {[0, 1].map((copy) => (
                  <div
                    key={copy}
                    style={{
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      ...displayType,
                      fontSize: "11.5cqw",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span style={{ padding: "0 .25em" }}>
                      {row === 1 ? "MOVE WITH IT" : "GO WITH THE FLOW"}
                    </span>
                    <span style={{ padding: "0 .25em", fontSize: ".7em" }}>✳</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </TypeField>
      <style>{`@keyframes ty-marquee-flow { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </Solo>
  );
}
