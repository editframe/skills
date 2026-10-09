import { Solo, type Aspect } from "../src/primitives";
import { TypeField, displayType } from "./shared/type-studies";

// Intent: read the phrase in two beats. The rule cues a baseline before the words arrive.
export const duration = 4.8;
export const posterTime = 2.4;
export const aspect = "landscape" as const;
const starts = [400, 520, 850, 1040];
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <TypeField background="#e9e7dc" color="#242824">
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "8%",
            right: "8%",
            transform: "translateY(-50%)",
            ...displayType,
            fontSize: frame === "landscape" ? "10.6cqw" : "14.2cqw",
          }}
        >
          {[
            ["Give", "it"],
            ["some", "space."],
          ].map((line, row) => (
            <div key={row} style={{ display: "flex", gap: ".23em", paddingBottom: ".12em" }}>
              {line.map((word, i) => (
                <span
                  key={word}
                  style={{ display: "block", overflow: "hidden", paddingBottom: ".08em" }}
                >
                  <span
                    style={{
                      display: "block",
                      color: row === 1 && i === 1 ? "#d54c32" : undefined,
                      animation: `ty-stagger-rise 700ms ${starts[row * 2 + i]}ms linear both, ty-stagger-exit 400ms ${3500 + (row * 2 + i) * 60}ms cubic-bezier(.6,0,.8,.3) forwards`,
                    }}
                  >
                    {word}
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            left: "8%",
            bottom: "18%",
            width: "20%",
            height: 2,
            background: "currentColor",
            transformOrigin: "left",
            animation: "ty-stagger-rule 4.8s linear both",
          }}
        />
      </TypeField>
      <style>{`@keyframes ty-stagger-rise {
      0% { transform: translateY(115%); animation-timing-function: cubic-bezier(.2,.6,.25,1); }
      72% { transform: translateY(-3%); animation-timing-function: ease-out; }
      100% { transform: translateY(0); }
    }
    @keyframes ty-stagger-exit { to { transform: translateY(-120%); } }
    @keyframes ty-stagger-rule { 0% { transform: scaleX(0); animation-timing-function: cubic-bezier(.2,.6,.25,1); } 8%,74% { transform: scaleX(1); animation-timing-function: ease-in; } 84%,100% { transform: scaleX(0); } }`}</style>
    </Solo>
  );
}
