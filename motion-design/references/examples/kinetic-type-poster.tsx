import type { CSSProperties } from "react";
import { Solo, type Aspect } from "../src/primitives";
import { TypeField, displayType } from "./shared/type-studies";

// Intent: spacing stores and releases tension. Elastic, but glyphs stay readable.
// 6s: read .6 → compress .3 → expand .7 → settle .6 → read 1.6 → return 1 → rest 1.2.
export const duration = 6;
export const posterTime = 2.8;
export const aspect = "landscape" as const;
export function Video({ id, aspect: frame = aspect }: { id: string; aspect?: Aspect }) {
  return (
    <Solo id={id} aspect={frame} duration={duration}>
      <TypeField background="#d9432e" color="#f7edd9">
        <div
          aria-label="STRETCH"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...displayType,
            fontSize: "12cqw",
          }}
        >
          {Array.from("STRETCH").map((letter, i) => (
            <span
              aria-hidden="true"
              key={i}
              style={
                {
                  display: "block",
                  width: ".7em",
                  textAlign: "center",
                  "--spread": `${(i - 3) * 2}cqw`,
                  "--pull": `${(i - 3) * -0.18}cqw`,
                  animation: "ty-tracking 6s linear both",
                } as CSSProperties
              }
            >
              {letter}
            </span>
          ))}
        </div>
      </TypeField>
      <style>{`@keyframes ty-tracking {
      0%,10% { transform: translateX(0); animation-timing-function: cubic-bezier(.4,0,.7,1); }
      15% { transform: translateX(var(--pull)) scaleX(.96); animation-timing-function: cubic-bezier(.15,.7,.2,1); }
      27% { transform: translateX(calc(var(--spread) * 1.1)) scaleX(1.015); animation-timing-function: ease-in-out; }
      33% { transform: translateX(calc(var(--spread) * .98)); animation-timing-function: ease-out; }
      37%,63% { transform: translateX(var(--spread)); animation-timing-function: ease-in; }
      67% { transform: translateX(calc(var(--spread) * 1.05)); animation-timing-function: cubic-bezier(.55,0,.25,1); }
      78% { transform: translateX(calc(var(--pull) * .5)); animation-timing-function: ease-out; }
      84%,100% { transform: translateX(0); }
    }`}</style>
    </Solo>
  );
}
