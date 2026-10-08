import { Solo, type Aspect } from "../src/primitives";
import { TypeField, displayType } from "./shared/type-studies";

// Intent: track letter identity as FORM becomes FROM. Rigid letters, curved paths.
// Separate horizontal travel from vertical lift: letters keep moving through each arc's apex.
export const duration = 6;
export const posterTime = 2.7;
export const aspect = "landscape" as const;
const paths = [1, -1]
  .map(
    (direction, index) => `
  @keyframes ty-swap-x-${index + 1} {
    0%,15% { transform: translateX(0); animation-timing-function: ease-in-out; }
    20% { transform: translateX(${-direction * 0.8}cqw); animation-timing-function: cubic-bezier(.45,0,.55,1); }
    38% { transform: translateX(${direction * 15.35}cqw); animation-timing-function: ease-out; }
    43%,65% { transform: translateX(${direction * 15}cqw); animation-timing-function: ease-in-out; }
    69% { transform: translateX(${direction * 15.6}cqw); animation-timing-function: cubic-bezier(.45,0,.55,1); }
    83% { transform: translateX(${-direction * 0.3}cqw); animation-timing-function: ease-out; }
    88%,100% { transform: translateX(0); }
  }
  @keyframes ty-swap-y-${index + 1} {
    0%,15% { transform: translateY(0); animation-timing-function: ease-in-out; }
    20% { transform: translateY(${direction * 0.8}cqw); animation-timing-function: cubic-bezier(.33,1,.68,1); }
    29% { transform: translateY(${-direction * 10}cqw); animation-timing-function: cubic-bezier(.32,0,.67,0); }
    38% { transform: translateY(${direction * 0.4}cqw); animation-timing-function: ease-out; }
    43%,65% { transform: translateY(0); animation-timing-function: ease-in-out; }
    69% { transform: translateY(${direction * 0.6}cqw); animation-timing-function: cubic-bezier(.33,1,.68,1); }
    76% { transform: translateY(${-direction * 10}cqw); animation-timing-function: cubic-bezier(.32,0,.67,0); }
    83% { transform: translateY(${direction * 0.3}cqw); animation-timing-function: ease-out; }
    88%,100% { transform: translateY(0); }
  }
`,
  )
  .join("\n");
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <TypeField background="#223fcc" color="#f2eddc">
        <div
          style={{
            position: "absolute",
            left: "20%",
            top: "50%",
            width: "60%",
            height: "18cqw",
            marginTop: "-9cqw",
            ...displayType,
            fontSize: "18cqw",
            lineHeight: 1,
          }}
        >
          {Array.from("FORM").map((letter, i) => (
            <span
              key={letter}
              style={{
                position: "absolute",
                width: "15cqw",
                textAlign: "center",
                left: `${i * 15}cqw`,
                color: i === 1 || i === 2 ? "#d7fa7f" : undefined,
                animation: i === 1 || i === 2 ? `ty-swap-x-${i} 6s linear both` : undefined,
              }}
            >
              <span
                style={{
                  display: "block",
                  animation: i === 1 || i === 2 ? `ty-swap-y-${i} 6s linear both` : undefined,
                }}
              >
                {letter}
              </span>
            </span>
          ))}
        </div>
      </TypeField>
      <style>{paths}</style>
    </Solo>
  );
}
