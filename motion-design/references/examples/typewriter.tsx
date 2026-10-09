import { FONT, Solo, type Aspect } from "../src/primitives";
import { TypeField } from "./shared/type-studies";

// Intent: a thought written in bursts. Anticipation is a waiting caret, not a bounce.
const LINE = "Make it move.";
const STARTS = [0.6, 0.68, 0.76, 0.84, 0.92, 1.2, 1.28, 1.36, 1.7, 1.78, 1.86, 1.94, 2.3];
export const duration = 5;
export const posterTime = 2.8;
export const aspect = "landscape" as const;
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  const caretFrames = STARTS.map(
    (time, i) => `${(time / duration) * 100}% { transform: translateX(${i + 1}ch); }`,
  ).join("\n");
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <TypeField background="#e9e7dc" color="#242824">
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontFamily: FONT.mono,
            fontSize: "8cqw",
            lineHeight: 1.2,
          }}
        >
          <div style={{ position: "relative", width: `${LINE.length}ch` }}>
            <div
              style={{
                whiteSpace: "pre",
                overflow: "hidden",
                animation: "ty-erase 5s linear both",
              }}
            >
              {Array.from(LINE).map((letter, i) => (
                <span key={i} style={{ animation: `ty-letter-on 1ms ${STARTS[i]}s step-end both` }}>
                  {letter}
                </span>
              ))}
            </div>
            <span
              style={{
                position: "absolute",
                left: 0,
                top: ".05em",
                width: "2px",
                height: "1em",
                background: "currentColor",
                animation: "ty-caret-travel 5s step-end both, ty-caret-blink 1s step-end infinite",
              }}
            />
          </div>
        </div>
      </TypeField>
      <style>{`@keyframes ty-letter-on { from { opacity: 0; } to { opacity: 1; } }
      @keyframes ty-erase { 0%,84% { width: 100%; animation-timing-function: steps(${LINE.length},end); } 94%,100% { width: 0%; } }
      @keyframes ty-caret-travel { 0% { transform: translateX(0ch); } ${caretFrames} 84% { transform: translateX(${LINE.length}ch); animation-timing-function: steps(${LINE.length},end); } 94%,100% { transform: translateX(0ch); } }
      @keyframes ty-caret-blink { 0%,49%,100% { opacity: 1; } 50%,99% { opacity: 0; } }
    `}</style>
    </Solo>
  );
}
